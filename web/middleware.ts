import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { maybeLocalDevOpsHeaders } from "@/lib/ops/local-dev-headers";

const recoveryPaths = new Set(["/ops/recover", "/sign-in", "/request-access", "/sign-up"]);
const authenticatedChatDeepLink = /^\/chat\/cnv_[A-Za-z0-9-]{8,88}-[a-z0-9][a-z0-9_-]*$/u;

async function routeMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (recoveryPaths.has(pathname)) {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-wtf-route-kind", "ops-recovery");
    return NextResponse.next({ request: { headers: forwarded } });
  }
  if (!pathname.startsWith("/ops") && !authenticatedChatDeepLink.test(pathname)) return NextResponse.next();

  let context = request.headers.get("x-wtf-ops-context");
  let proof = request.headers.get("x-wtf-ops-proof");
  if (!context || !proof) {
    const local = await maybeLocalDevOpsHeaders({
      nodeEnv: process.env.NODE_ENV,
      hostname: request.nextUrl.hostname,
      secret: process.env.WTFMEDIA_OPS_ORIGIN_PROOF,
      role: process.env.WTFMEDIA_OPS_LOCAL_ROLE,
    });
    if (local) {
      context = local.payload;
      proof = local.proof;
    }
  }

  const forwarded = new Headers(request.headers);
  if (context && proof) {
    forwarded.set("x-wtf-ops-context", context);
    forwarded.set("x-wtf-ops-proof", proof);
  }
  forwarded.set("x-wtf-route-kind", authenticatedChatDeepLink.test(pathname) ? "ops-chat" : "ops");
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*", "/chat/:path*", "/sign-in/:path*", "/sign-up/:path*", "/request-access"],
};

const clerkHandler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  ? clerkMiddleware((_auth, request) => routeMiddleware(request))
  : null;

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  return clerkHandler ? clerkHandler(request, event) : routeMiddleware(request);
}

export default middleware;

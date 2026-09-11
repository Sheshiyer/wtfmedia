import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { maybeLocalDevOpsHeaders } from "@/lib/ops/local-dev-headers";

const recoveryPaths = new Set(["/ops/recover", "/sign-in", "/request-access", "/sign-up"]);
const authenticatedChatDeepLink = /^\/chat\/cnv_[A-Za-z0-9-]{8,88}-[a-z0-9][a-z0-9_-]*$/u;

async function routeMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // `/ops/*` is the preserved anonymous/legacy Alpha operator tree. Only the
  // old beta operator aliases redirect into the canonical single shell.
  if (pathname === "/beta/ops" || pathname.startsWith("/beta/ops/")) {
    const target = request.nextUrl.clone();
    const suffix = pathname.slice("/beta/ops".length);
    if (!suffix) target.pathname = "/beta/workspace";
    else if (suffix === "/production" || suffix === "/episodes" || suffix === "/ingest") target.pathname = `/beta/workspace${suffix}`;
    else if (suffix === "/operators") target.pathname = "/beta/admin/users";
    else if (suffix === "/audit") target.pathname = "/beta/admin/audit";
    else if (suffix === "/profile") target.pathname = "/beta/settings";
    else if (suffix === "/chat") target.pathname = "/beta/workspace";
    else if (suffix === "/settings") target.pathname = "/beta/settings";
    else if (suffix.startsWith("/settings/access") || suffix.startsWith("/settings/users")) target.pathname = "/beta/admin/users";
    else if (suffix.startsWith("/settings/")) target.pathname = `/beta/settings/workspace${suffix.slice("/settings".length)}`;
    else target.pathname = "/beta/workspace";
    return NextResponse.redirect(target);
  }
  if (recoveryPaths.has(pathname)) {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-wtf-route-kind", "ops-recovery");
    return NextResponse.next({ request: { headers: forwarded } });
  }
  if (!pathname.startsWith("/ops") && !pathname.startsWith("/beta") && !authenticatedChatDeepLink.test(pathname)) return NextResponse.next();

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
  forwarded.set("x-wtf-route-kind", pathname.startsWith("/beta") ? "beta" : authenticatedChatDeepLink.test(pathname) ? "ops-chat" : "ops");
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*", "/beta/:path*", "/chat/:path*", "/sign-in/:path*", "/sign-up/:path*", "/request-access"],
};

const clerkHandler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  ? clerkMiddleware((_auth, request) => routeMiddleware(request))
  : null;

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  return clerkHandler ? clerkHandler(request, event) : routeMiddleware(request);
}

export default middleware;

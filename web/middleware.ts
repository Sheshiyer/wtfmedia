import { NextResponse, type NextRequest } from "next/server";
import { maybeLocalDevOpsHeaders } from "@/lib/ops/local-dev-headers";

const recoveryPaths = new Set(["/ops/recover", "/sign-in", "/request-access"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (recoveryPaths.has(pathname)) {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-wtf-route-kind", "ops-recovery");
    return NextResponse.next({ request: { headers: forwarded } });
  }
  if (!pathname.startsWith("/ops")) return NextResponse.next();

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
  forwarded.set("x-wtf-route-kind", "ops");
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*", "/sign-in", "/request-access"],
};

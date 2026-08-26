import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/ops")) return NextResponse.next();
  if (pathname === "/ops/recover") {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-wtf-route-kind", "ops-recovery");
    return NextResponse.next({ request: { headers: forwarded } });
  }
  // Middleware may reject obvious direct access, but proof verification happens in server-only code.
  if (!request.headers.get("x-wtf-ops-context") || !request.headers.get("x-wtf-ops-proof")) {
    const recover = new URL("/ops/recover", request.url);
    recover.searchParams.set("mode", "reauthenticate");
    return NextResponse.rewrite(recover);
  }
  const forwarded = new Headers(request.headers);
  forwarded.set("x-wtf-route-kind", "ops");
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = { matcher: ["/ops/:path*", "/api/ops/:path*"] };

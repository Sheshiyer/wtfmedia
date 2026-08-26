import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/ops") || pathname === "/ops/recover") return NextResponse.next();
  // Middleware may reject obvious direct access, but proof verification happens in server-only code.
  if (!request.headers.get("x-wtf-ops-context") || !request.headers.get("x-wtf-ops-proof")) {
    const recover = new URL("/ops/recover", request.url);
    recover.searchParams.set("mode", "reauthenticate");
    return NextResponse.rewrite(recover);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/ops/:path*", "/api/ops/:path*"] };

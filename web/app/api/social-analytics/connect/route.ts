import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, isSocialPlatform, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { socialAnalyticsLocalEnabled } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!socialAnalyticsLocalEnabled() || !localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 415 });
  }
  const body = await request.json().catch(() => ({})) as { platform?: unknown };
  if (!isSocialPlatform(body.platform)) {
    return NextResponse.json({ error: "invalid_platform", message: "Choose a supported social platform." }, { status: 400 });
  }
  // The developer lab must not bypass the authenticated admin connection policy.
  return NextResponse.json({ error: "admin_sign_in_required", message: "Sign in as an admin at /beta/social-analytics to connect an account." }, { status: 403 });
}

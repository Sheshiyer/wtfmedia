import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { socialAnalyticsLocalEnabled } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!socialAnalyticsLocalEnabled() || !localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Connection management must pass through authenticated Beta admin admission.
  return NextResponse.json({ error: "admin_sign_in_required", message: "Sign in as an admin at /beta/social-analytics to manage connections." }, { status: 403 });
}

export const PUT = GET;

import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { listSocialAccounts, socialAnalyticsConfigured, socialAnalyticsLocalEnabled, ZernioError } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!socialAnalyticsLocalEnabled() || !localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!socialAnalyticsConfigured()) {
    return NextResponse.json({ configured: false, profileId: null, accounts: [], checkedAt: new Date().toISOString() });
  }
  try {
    const accounts = await listSocialAccounts();
    return NextResponse.json({
      configured: true,
      profileId: process.env.ZERNIO_PROFILE_ID ?? null,
      accounts,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const providerError = error instanceof ZernioError ? error : new ZernioError("Could not load social accounts.", 502, "unknown");
    return NextResponse.json({ error: providerError.code, message: providerError.message }, { status: providerError.status });
  }
}

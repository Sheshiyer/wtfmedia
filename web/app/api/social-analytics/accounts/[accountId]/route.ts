import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { disconnectSocialAccount, socialAnalyticsLocalEnabled, ZernioError } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";
export async function DELETE(request: NextRequest, context: { params: Promise<{ accountId: string }> }) {
  if (!socialAnalyticsLocalEnabled() || !localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { accountId } = await context.params;
  if (!accountId) return NextResponse.json({ error: "invalid_account" }, { status: 400 });
  try { await disconnectSocialAccount(accountId); return NextResponse.json({ removed: true }); }
  catch (error) {
    const providerError = error instanceof ZernioError ? error : new ZernioError("Could not remove this connection.", 502, "unknown");
    return NextResponse.json({ error: providerError.code, message: providerError.message }, { status: providerError.status });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, isSocialPlatform, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { createConnectionUrl, socialAnalyticsLocalEnabled, ZernioError } from "@/lib/social-analytics/zernio";

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
  try {
    const redirectUrl = new URL("/social-analytics", request.nextUrl.origin).toString();
    const authUrl = await createConnectionUrl(body.platform, redirectUrl);
    return NextResponse.json({ authUrl });
  } catch (error) {
    const providerError = error instanceof ZernioError ? error : new ZernioError("Could not start this connection.", 502, "unknown");
    return NextResponse.json({ error: providerError.code, message: providerError.message }, { status: providerError.status });
  }
}

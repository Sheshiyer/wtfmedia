import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, isSocialPlatform, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { getSocialDashboard, socialAnalyticsLocalEnabled, ZernioError } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string): boolean {
  const date = new Date(value);
  return datePattern.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  if (!socialAnalyticsLocalEnabled() || !localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const platformValue = request.nextUrl.searchParams.get("platform") ?? "all";
  const fromDate = request.nextUrl.searchParams.get("fromDate") ?? "";
  const toDate = request.nextUrl.searchParams.get("toDate") ?? "";
  if ((platformValue !== "all" && !isSocialPlatform(platformValue)) || !validDate(fromDate) || !validDate(toDate) || fromDate > toDate || Date.parse(toDate) - Date.parse(fromDate) > 365 * 86_400_000) {
    return NextResponse.json({ error: "invalid_scope", message: "Choose a valid platform and date range." }, { status: 400 });
  }
  try {
    const dashboard = await getSocialDashboard({ platform: platformValue, fromDate, toDate });
    return NextResponse.json({ dashboard });
  } catch (error) {
    const providerError = error instanceof ZernioError ? error : new ZernioError("Could not load social analytics.", 502, "unknown");
    return NextResponse.json({ error: providerError.code, message: providerError.message }, { status: providerError.status });
  }
}

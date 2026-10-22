import { NextResponse, type NextRequest } from "next/server";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";
import { listLinkedInOrganizations, selectLinkedInOrganization, socialAnalyticsLocalEnabled, ZernioError } from "@/lib/social-analytics/zernio";

export const dynamic = "force-dynamic";

function allowed(request: NextRequest) {
  return socialAnalyticsLocalEnabled() && localHostnameAllowed(hostnameFromHostHeader(request.headers.get("host")));
}
function failure(error: unknown) {
  const providerError = error instanceof ZernioError ? error : new ZernioError("Could not manage LinkedIn pages.", 502, "unknown");
  return NextResponse.json({ error: providerError.code, message: providerError.message }, { status: providerError.status });
}
export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const accountId = request.nextUrl.searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ error: "invalid_account" }, { status: 400 });
  try { return NextResponse.json({ organizations: await listLinkedInOrganizations(accountId) }); }
  catch (error) { return failure(error); }
}
export async function PUT(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { accountId?: unknown; organizationId?: unknown };
  if (typeof body.accountId !== "string" || !body.accountId.trim() || typeof body.organizationId !== "string" || !body.organizationId.trim()) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  try { return NextResponse.json(await selectLinkedInOrganization(body.accountId, body.organizationId)); }
  catch (error) { return failure(error); }
}

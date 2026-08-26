import { NextResponse } from "next/server";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";
import { parseAuditFilters } from "@/lib/ops/audit-filters";

const headers = { "cache-control": "private, no-store" };
async function allowed() { const context = await requireVerifiedOpsContext().catch(() => null); return context && canAccessOpsPath(context.role, "/ops/audit"); }
function unavailable(status: 404 | 503) { return NextResponse.json({ error: "audit_unavailable" }, { status, headers }); }
export async function GET(request: Request) { return parseAuditFilters(new URL(request.url).searchParams) && await allowed() ? unavailable(503) : unavailable(404); }
export async function POST() { return await allowed() ? unavailable(503) : unavailable(404); }

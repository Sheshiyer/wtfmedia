import { NextResponse } from "next/server";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

const noStore = { "cache-control": "private, no-store" };
async function authorized() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  return context && canAccessOpsPath(context.role, "/ops/operators");
}
function unavailable() { return NextResponse.json({ error: "operator_unavailable" }, { status: 503, headers: noStore }); }
function denied() { return NextResponse.json({ error: "operator_unavailable" }, { status: 404, headers: noStore }); }

export async function GET() { return await authorized() ? unavailable() : denied(); }
export async function POST() { return await authorized() ? unavailable() : denied(); }
export async function PATCH() { return await authorized() ? unavailable() : denied(); }

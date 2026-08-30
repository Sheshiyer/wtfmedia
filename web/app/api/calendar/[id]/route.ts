import type { NextRequest } from "next/server";
import { proxyCalendarRequest } from "@/lib/ops/calendar-server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^cal_[a-f0-9]{32}$/.test(id)) {
    return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return proxyCalendarRequest(request, `/v1/calendar/${id}`, { mutation: true });
}

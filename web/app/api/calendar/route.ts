import type { NextRequest } from "next/server";
import { proxyCalendarRequest } from "@/lib/ops/calendar-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const target = new URL("/v1/calendar", "https://wtfmedia-edge.internal");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (from) target.searchParams.set("from", from);
  if (to) target.searchParams.set("to", to);
  for (const key of request.nextUrl.searchParams.keys()) {
    if (key !== "from" && key !== "to") target.searchParams.append(key, request.nextUrl.searchParams.get(key) || "");
  }
  return proxyCalendarRequest(request, `${target.pathname}${target.search}`, { mutation: false });
}

export async function POST(request: NextRequest) {
  return proxyCalendarRequest(request, "/v1/calendar", { mutation: true });
}

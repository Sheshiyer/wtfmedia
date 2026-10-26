import { describe, expect, it } from "vitest";
import { routeIsActive } from "@/lib/public/route-is-active";
import { isCalendarActionEvent, isProductionBoardItem, productionActionMark, productionBoardLane } from "@/lib/ops/production-data";
import {
  dayBoundsToIso,
  emptyProductionWorkspace,
  isProductionColumnId,
  monthGrid,
  monthLabel,
  shiftMonth,
} from "@/lib/ops/production";

describe("production calendar model", () => {
  it("builds a monday-first six-week grid without fabricating records", () => {
    const cells = monthGrid(2026, 7);
    expect(cells).toHaveLength(42);
    expect(cells[0]?.weekday).toBe(0);
    expect(cells.filter((cell) => cell.inMonth).map((cell) => cell.day)).toContain(1);
    expect(emptyProductionWorkspace.records).toEqual([]);
    expect(emptyProductionWorkspace.state).toBe("active");
  });

  it("shifts months in utc and formats bounds for closed date filters", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthLabel(2026, 7)).toMatch(/august/i);
    expect(dayBoundsToIso("2026-08-28", "start")).toBe("2026-08-28T00:00:00.000Z");
    expect(dayBoundsToIso("2026-08-28", "end")).toBe("2026-08-28T23:59:59.000Z");
    expect(isProductionColumnId("blocked")).toBe(true);
    expect(isProductionColumnId("done")).toBe(false);
  });

  it("does not mark control room current on nested production routes", () => {
    expect(routeIsActive("/beta/workspace/production", "/beta/workspace")).toBe(false);
    expect(routeIsActive("/beta/workspace/production", "/beta/workspace/production")).toBe(true);
    expect(routeIsActive("/beta/workspace", "/beta/workspace")).toBe(true);
  });

  it("reuses the workbook action icons across equivalent event kinds", () => {
    expect(productionActionMark("dub_schedule")?.icon).toBe("🎙️");
    expect(productionActionMark("hindi-post")?.icon).toBe("🎙️");
    expect(productionActionMark("main_post")?.icon).toBe("📤");
    expect(productionActionMark("ip_post")?.icon).toBe("📤");
    expect(productionActionMark("shoot")?.icon).toBe("🎥");
    expect(productionActionMark("milestone")).toBeNull();
    expect(isCalendarActionEvent({ kind: "original_video_date" })).toBe(false);
    expect(isCalendarActionEvent({ kind: "dub_schedule" })).toBe(true);
  });

  it("keeps dubbing source rows off the main board without losing their calendar marks", () => {
    expect(isProductionBoardItem({ sourceRef: "Dubbing Tracker!A38:H38" })).toBe(false);
    expect(isProductionBoardItem({ sourceRef: "Production Tracker Podcast!D14" })).toBe(true);
    expect(isProductionBoardItem({ sourceRef: "WTF & Nikhil Kamath IPs!A2:F2" })).toBe(true);
    expect(isProductionBoardItem({ sourceRef: null })).toBe(true);
    expect(isCalendarActionEvent({ kind: "dub_schedule" })).toBe(true);
  });

  it("uses explicit stages and actual release dates for simple board lanes", () => {
    const today = "2026-10-25";
    expect(productionBoardLane({ id: "payment", stage: "post-production", sourceMarker: null }, [], today)).toBe("post-production");
    expect(productionBoardLane({ id: "pod", stage: "published", sourceMarker: null }, [], today)).toBe("published");
    expect(productionBoardLane({ id: "bts", stage: "unverified", sourceMarker: null }, [{ itemId: "bts", kind: "ip_post", day: "2026-09-09", dateState: "actual" }], today)).toBe("published");
    expect(productionBoardLane({ id: "bts", stage: "unverified", sourceMarker: "not-live" }, [], today)).toBe("no-release-date");
    expect(productionBoardLane({ id: "upcoming", stage: "unverified", sourceMarker: null }, [{ itemId: "upcoming", kind: "shoot", day: "2026-11-03", dateState: "planned" }], today)).toBe("scheduled");
  });
});

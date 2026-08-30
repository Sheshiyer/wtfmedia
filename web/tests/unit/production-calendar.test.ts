import { describe, expect, it } from "vitest";
import { routeIsActive } from "@/lib/public/route-is-active";
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
    expect(routeIsActive("/ops/production", "/ops")).toBe(false);
    expect(routeIsActive("/ops/production", "/ops/production")).toBe(true);
    expect(routeIsActive("/ops", "/ops")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { routeIsActive } from "@/lib/public/route-is-active";
import {
  dayBoundsToIso,
  emptyProductionWorkspace,
  isProductionColumnId,
  moveProductionPin,
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

  it("declares the confirmed internal-beta gaps for review without calling either resolved", () => {
    const workspace = emptyProductionWorkspace as unknown as {
      betaDiscrepancies?: Array<{
        id: string;
        affectedField: string;
        status: string;
      }>;
    };

    expect(workspace.betaDiscrepancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cloudflare-test-dependency",
          affectedField: "local jose dependency",
          status: "needs-review",
        }),
        expect.objectContaining({
          id: "ops-episodes-policy-drift",
          affectedField: "/ops/episodes policy boundary",
          status: "needs-review",
        }),
      ]),
    );
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

  it("moves only the selected local sketch and retains its semantic tone", () => {
    const pins = [
      {
        id: "research-brief",
        note: "verify the source brief",
        day: "2026-08-28",
        column: "unscheduled" as const,
        owner: null,
        sketch: true as const,
        tone: "knowledge" as const,
      },
      {
        id: "edit-pass",
        note: "cut review",
        day: "2026-08-29",
        column: "on-calendar" as const,
        owner: null,
        sketch: true as const,
        tone: "editorial" as const,
      },
    ];

    const moved = moveProductionPin(pins, "research-brief", {
      day: "2026-08-30",
      column: "blocked",
    });

    expect(moved).toEqual([
      expect.objectContaining({
        id: "research-brief",
        day: "2026-08-30",
        column: "blocked",
        tone: "knowledge",
      }),
      pins[1],
    ]);
    expect(moved[1]).toBe(pins[1]);
    expect(pins[0]?.day).toBe("2026-08-28");
  });
});

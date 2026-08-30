export const productionColumns = [
  { id: "unscheduled", label: "unscheduled" },
  { id: "on-calendar", label: "on calendar" },
  { id: "blocked", label: "blocked" },
] as const;

export type ProductionColumnId = (typeof productionColumns)[number]["id"];

export const productionPinTones = ["attention", "editorial", "knowledge", "live"] as const;

export type ProductionPinTone = (typeof productionPinTones)[number];

export const betaReviewDispositions = [
  "needs-review",
  "acknowledged",
  "owner-decision",
  "hold",
] as const;

export type BetaReviewDisposition = (typeof betaReviewDispositions)[number];

export type BetaDiscrepancy = {
  id: "cloudflare-test-dependency" | "ops-episodes-policy-drift";
  title: string;
  source: string;
  scope: string;
  affectedField: string;
  observation: string;
  recommendation: string;
  status: "needs-review";
};

export type BetaReviewRecord = {
  discrepancyId: BetaDiscrepancy["id"];
  disposition: BetaReviewDisposition;
  note: string;
};

export const betaReviewStorageKey = "wtfmedia:production-beta-review";

export const internalBetaDiscrepancies: readonly BetaDiscrepancy[] = [
  {
    id: "cloudflare-test-dependency",
    title: "Cloudflare suite dependency is unavailable locally",
    source: "unfiltered local Cloudflare suite",
    scope: "isolated Cloudflare test workspace",
    affectedField: "local jose dependency",
    observation: "The suite cannot load its auth-focused tests because the local jose module is absent.",
    recommendation: "Restore the isolated workspace dependency, then rerun the unfiltered suite before treating this check as complete.",
    status: "needs-review",
  },
  {
    id: "ops-episodes-policy-drift",
    title: "An unreviewed episode route appears in policy discovery",
    source: "unfiltered local Cloudflare suite",
    scope: "operator route policy",
    affectedField: "/ops/episodes policy boundary",
    observation: "The current policy test sees the unreviewed /ops/episodes draft outside the approved operations route baseline.",
    recommendation: "Keep the draft outside release evidence or review its policy change as a separate, bounded work item.",
    status: "needs-review",
  },
];

function isBetaDiscrepancyId(value: string): value is BetaDiscrepancy["id"] {
  return internalBetaDiscrepancies.some((item) => item.id === value);
}

export function isBetaReviewDisposition(value: string): value is BetaReviewDisposition {
  return betaReviewDispositions.includes(value as BetaReviewDisposition);
}

export function readBetaReviewRecords(value: string | null): BetaReviewRecord[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): BetaReviewRecord[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if (
        typeof record.discrepancyId !== "string" ||
        typeof record.disposition !== "string" ||
        typeof record.note !== "string" ||
        !isBetaDiscrepancyId(record.discrepancyId) ||
        !isBetaReviewDisposition(record.disposition)
      ) {
        return [];
      }

      return [
        {
          discrepancyId: record.discrepancyId,
          disposition: record.disposition,
          note: record.note.trim().slice(0, 500),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function upsertBetaReviewRecord(
  records: readonly BetaReviewRecord[],
  next: BetaReviewRecord,
): BetaReviewRecord[] {
  const remaining = records.filter((record) => record.discrepancyId !== next.discrepancyId);
  return [...remaining, next];
}

export type ProductionPin = {
  id: string;
  note: string;
  day: string;
  column: ProductionColumnId;
  owner: string | null;
  sketch: true;
  tone: ProductionPinTone;
};

export type MonthCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  weekday: number;
};

export const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const emptyProductionWorkspace = {
  state: "not-activated" as const,
  records: [] as const,
  owners: [] as const,
  betaDiscrepancies: internalBetaDiscrepancies,
};

export function isProductionColumnId(value: string): value is ProductionColumnId {
  return productionColumns.some((column) => column.id === value);
}

export function isProductionPinTone(value: string): value is ProductionPinTone {
  return productionPinTones.includes(value as ProductionPinTone);
}

export function moveProductionPin(
  pins: readonly ProductionPin[],
  id: string,
  patch: Pick<ProductionPin, "day" | "column">,
): ProductionPin[] {
  let changed = false;
  const next = pins.map((pin) => {
    if (pin.id !== id) return pin;
    changed = true;
    return { ...pin, ...patch };
  });

  return changed ? next : [...pins];
}

export function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: MonthCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const offset = index - firstWeekday;
    let cellYear = year;
    let cellMonth = month;
    let day = offset + 1;
    let inMonth = true;

    if (offset < 0) {
      const previous = new Date(Date.UTC(year, month - 1, 1));
      cellYear = previous.getUTCFullYear();
      cellMonth = previous.getUTCMonth();
      day = prevMonthDays + offset + 1;
      inMonth = false;
    } else if (offset >= daysInMonth) {
      const next = new Date(Date.UTC(year, month + 1, 1));
      cellYear = next.getUTCFullYear();
      cellMonth = next.getUTCMonth();
      day = offset - daysInMonth + 1;
      inMonth = false;
    }

    cells.push({
      iso: isoDate(cellYear, cellMonth, day),
      day,
      inMonth,
      weekday: index % 7,
    });
  }

  return cells;
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function dayBoundsToIso(date: string, edge: "start" | "end") {
  if (!parseIsoDate(date)) return "";
  return edge === "start" ? `${date}T00:00:00.000Z` : `${date}T23:59:59.000Z`;
}

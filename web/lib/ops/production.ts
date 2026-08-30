export const productionColumns = [
  { id: "unscheduled", label: "unscheduled" },
  { id: "on-calendar", label: "on calendar" },
  { id: "blocked", label: "blocked" },
] as const;

export type ProductionColumnId = (typeof productionColumns)[number]["id"];

export type ProductionPin = {
  id: string;
  note: string;
  day: string;
  column: ProductionColumnId;
  owner: string | null;
  sketch: true;
};

export type MonthCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  weekday: number;
};

export const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const emptyProductionWorkspace = {
  state: "active" as const,
  records: [] as const,
  owners: [] as const,
};

export function isProductionColumnId(value: string): value is ProductionColumnId {
  return productionColumns.some((column) => column.id === value);
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

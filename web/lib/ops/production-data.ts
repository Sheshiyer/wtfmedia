export type ProductionIp = {
  id: string;
  name: string;
  parent: string | null;
  color: string;
  active: boolean;
  targetCount: number | null;
  targetPlus: boolean;
};

export type ProductionItem = {
  id: string;
  ipId: string | null;
  title: string;
  format: string;
  stage: string;
  owner: string | null;
  notes: string;
  shootLocation: string | null;
  sourceStatus: string;
  sourceRef: string | null;
  sourceMarker?: string | null;
};

export type ProductionEvent = {
  id: string;
  itemId: string;
  kind: string;
  day: string;
  dateState: string;
  owner: string | null;
  notes: string;
  sourceRef: string | null;
};

export type ProductionGuest = { id: string; name: string; sourceNameNeedsReview?: boolean };
export type ProductionItemGuest = { itemId: string; guestId: string };
export type ProductionDubbing = {
  itemId: string;
  targetLanguage: string;
  status: string;
  owner: string | null;
  notes: string;
  publicationStatus: "published" | "not-published" | "unknown";
  publishedOn: string | null;
  sourceRow: number | null;
  sourceSection: "solo" | "panel" | null;
  sourceEpisodeNamed: boolean | null;
  sourcePermissionStatus: string | null;
  sourcePostedCheck: "checked" | "unchecked" | "not_box";
  sourceNotes: { row: number; text: string }[];
};
export type ProductionPermission = {
  itemId: string;
  guestId: string;
  status: string;
  notes: string;
  sourceRow: number | null;
  sourceNote: string | null;
  sourceContact?: string | null;
};
export type ProductionBlocker = {
  id: string;
  itemId: string;
  reason: string;
  owner: string | null;
  status: string;
  nextAction: string;
};
export type ProductionSourceCheck = {
  itemId: string;
  sourceRow: number;
  guestName: string | null;
  guestRole: string | null;
  guestAgreement: "checked" | "unchecked" | "not_box";
  dubbing: "checked" | "unchecked" | "not_box";
  hindiLive: "checked" | "unchecked" | "not_box";
  agreementNote: string | null;
};
export type ProductionSourceSheet = { name: string; rows: number; cells: number };
export type ProductionSourceRow = {
  sheet: string;
  rowNumber: number;
  cells: { ref: string; value: string | number | boolean | null; cachedValue: string | null; formula: string | null; fill: string | null }[];
};

export type ProductionSnapshot = {
  ips: ProductionIp[];
  items: ProductionItem[];
  events: ProductionEvent[];
  guests: ProductionGuest[];
  itemGuests: ProductionItemGuest[];
  dubbing: ProductionDubbing[];
  permissions: ProductionPermission[];
  blockers: ProductionBlocker[];
  sourceChecks: ProductionSourceCheck[];
  sourceSummary: { sheets: number; cells: number; review: number } | null;
  sourceSheets: ProductionSourceSheet[];
  canEdit: boolean;
  canManage: boolean;
};

export type ProductionAction =
  | "create_ip"
  | "update_ip"
  | "update_ip_target"
  | "create_item"
  | "update_item"
  | "create_event"
  | "update_event"
  | "update_dubbing"
  | "update_source_check"
  | "update_source_role"
  | "update_permission"
  | "add_guest_to_item"
  | "create_blocker"
  | "update_blocker";

export const productionEventKinds = [
  { id: "shoot", label: "Main episode shot" },
  { id: "planned-post", label: "Planned post" },
  { id: "actual-post", label: "Posted" },
  { id: "dub-sample", label: "Dub sample" },
  { id: "dub-delivery", label: "Dub delivered" },
  { id: "hindi-trailer", label: "Hindi trailer" },
  { id: "hindi-post", label: "Hindi post" },
  { id: "handoff", label: "Handoff" },
  { id: "milestone", label: "Milestone" },
  { id: "other", label: "Other" },
  { id: "main_post", label: "Main episode went live" },
  { id: "ip_post", label: "IP went live" },
  { id: "original_video_date", label: "Original video date (source)" },
  { id: "dub_schedule", label: "Dubbed episode went live" },
] as const;

// These action marks mirror the source workbook. IP colors are independent.
export const productionActionMarks = [
  { kinds: ["dub_schedule", "hindi-post"], icon: "🎙️", label: "Dubbed episode went live", color: "#C9DAF8" },
  { kinds: ["main_post", "actual-post", "ip_post"], icon: "📤", label: "Episode went live", color: "#B6D7A8" },
  { kinds: ["shoot"], icon: "🎥", label: "Main episode was shot", color: "#FFE599" },
] as const;

export function productionActionMark(kind: string) {
  return productionActionMarks.find((mark) => (mark.kinds as readonly string[]).includes(kind)) ?? null;
}

// The source workbook keeps its original-video date in column B for reference.
// Only column C contributes a dubbed go-live mark to the action calendar.
export function isCalendarActionEvent(event: Pick<ProductionEvent, "kind">): boolean {
  return event.kind !== "original_video_date";
}

// Dubbing Tracker rows have their own workflow. Keep them on the calendar when
// they have a dated publication mark, but do not duplicate them as production
// cards alongside the main episode and IP records.
export function isProductionBoardItem(item: Pick<ProductionItem, "sourceRef">): boolean {
  return !item.sourceRef?.startsWith("Dubbing Tracker!");
}

export type ProductionBoardLane = "post-production" | "scheduled" | "published" | "no-release-date";

export function productionBoardLane(
  item: Pick<ProductionItem, "id" | "stage" | "sourceMarker">,
  events: readonly Pick<ProductionEvent, "itemId" | "kind" | "day" | "dateState">[],
  today: string,
): ProductionBoardLane {
  if (item.stage === "post-production") return "post-production";
  if (item.stage === "published") return "published";
  const ownEvents = events.filter((event) => event.itemId === item.id);
  if (item.sourceMarker !== "not-live" && ownEvents.some((event) =>
    ["main_post", "ip_post", "actual-post"].includes(event.kind) && event.dateState === "actual" && event.day <= today)) return "published";
  if (ownEvents.some((event) => event.day > today && isCalendarActionEvent(event))) return "scheduled";
  return "no-release-date";
}

export const productionStages = [
  { id: "unverified", label: "Stage not recorded" },
  { id: "prospect", label: "Prospect" },
  { id: "planned", label: "Planned" },
  { id: "shooting", label: "Shooting" },
  { id: "post-production", label: "Post-production" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published" },
  { id: "blocked", label: "Blocked" },
  { id: "archived", label: "Archived" },
] as const;

export const dubbingStatuses = [
  { id: "unknown", label: "Unknown" },
  { id: "pending", label: "Pending" },
  { id: "blocked", label: "Blocked" },
  { id: "ready", label: "Ready to dub" },
  { id: "in-progress", label: "In progress" },
  { id: "dubbed", label: "Dubbed" },
  { id: "pushed-out", label: "Pushed out" },
] as const;

export const permissionStatuses = [
  { id: "unknown", label: "Unknown" },
  { id: "not-contacted", label: "Not contacted" },
  { id: "requested", label: "Requested" },
  { id: "sample-requested", label: "Sample requested" },
  { id: "no-response", label: "No response" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
] as const;

export const dateStates = [
  { id: "planned", label: "Planned" },
  { id: "actual", label: "Actual" },
  { id: "unverified", label: "Needs review" },
] as const;

export function optionLabel(options: readonly { id: string; label: string }[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id.replaceAll(/[_-]/gu, " ");
}

export function eventKindLabel(kind: string) {
  return optionLabel(productionEventKinds, kind);
}

export function safeIpColor(color: string | null | undefined): string {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/u.test(color)
    ? color
    : "var(--wtf-information)";
}

export function dayLabel(day: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = new Date(`${day}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", ...options }).format(date);
}

export function isProductionSnapshot(value: unknown): value is ProductionSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return ["ips", "items", "events", "guests", "itemGuests", "dubbing", "permissions", "blockers", "sourceChecks", "sourceSheets"].every((key) => Array.isArray(body[key]))
    && typeof body.canEdit === "boolean" && typeof body.canManage === "boolean";
}

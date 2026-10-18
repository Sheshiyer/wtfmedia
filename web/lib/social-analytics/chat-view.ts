import {
  isSocialPlatform, PLATFORM_DEFINITIONS, SOCIAL_METRICS,
  type SocialChatAnswer, type SocialChatMessage, type SocialEntity, type SocialScope,
} from "./contracts";

export function safeSocialUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function socialScopeLabel(scope: SocialScope): string {
  const platform = PLATFORM_DEFINITIONS.find((item) => item.id === scope.platform)?.label ?? "All connected platforms";
  return `${platform} · ${scope.fromDate} – ${scope.toDate} (UTC, inclusive)`;
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const isRate = (unit: string) => ["%", "percent", "percentage"].includes(unit.toLowerCase());

export function formatSocialValue(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return `${numberFormat.format(value)}${isRate(unit) ? "%" : unit && unit !== "count" ? ` ${unit}` : ""}`;
}

export function socialDifferenceCells(row: SocialChatAnswer["rows"][number]): [string, string] {
  const difference = row.difference == null ? "Unavailable"
    : `${row.difference > 0 ? "+" : ""}${formatSocialValue(row.difference, isRate(row.unit) ? "percentage points" : row.unit)}`;
  const percent = row.percentChange == null
    ? `Unavailable${!isRate(row.unit) && row.values.length === 2 && row.values[1] === 0 ? " (zero baseline)" : ""}`
    : `${row.percentChange > 0 ? "+" : ""}${formatSocialValue(row.percentChange, "%")}`;
  return [difference, percent];
}

export function socialAnswerText(answer: SocialChatAnswer): string {
  const comparisons = answer.rows.some((row) => row.difference !== undefined || row.percentChange !== undefined);
  return [
    socialScopeLabel(answer.scope), `Status: ${answer.status.replaceAll("_", " ")}`, answer.summary,
    ...answer.entities.map((entity) => `${entity.label} (${entity.platform}, ${entity.id})`),
    ...(answer.rows.length ? [
      ["Metric", ...answer.columns, ...(comparisons ? ["Difference", "% change"] : [])].join(" | "),
      ...answer.rows.map((row) => [row.label, ...row.values.map((value) => formatSocialValue(value, row.unit)),
        ...(comparisons ? socialDifferenceCells(row) : [])].join(" | ")),
    ] : []),
    ...answer.evidence.map((item) => [
      `${item.entity.label} (${item.entity.platform}, ${item.entity.id}) · ${item.metric}: ${formatSocialValue(item.value, item.unit)}`,
      `Basis: ${item.basis} · ${item.fromDate} – ${item.toDate} UTC`,
      `Fetched: ${item.fetchedAt} · Data as of: ${item.dataAsOf ?? "unavailable"}`,
      item.reason, safeSocialUrl(item.sourceUrl),
    ].filter(Boolean).join("\n")),
    ...answer.limitations,
  ].join("\n\n");
}

export function candidateQuestion(entity: SocialEntity): string {
  return entity.kind === "post"
    ? `Show metrics for post ID ${JSON.stringify(entity.id)} on ${entity.platform}${entity.accountId ? ` for account ID ${JSON.stringify(entity.accountId)}` : ""}.`
    : `Show available metrics for ${entity.platform}.`;
}

export type SocialViewContext = Pick<SocialChatAnswer, "scope" | "entities"> & { visibleScope?: SocialScope };

export function socialRequestBody(question: string, scope: SocialScope, messages: SocialChatMessage[], context: SocialViewContext | null) {
  return {
    question: question.trim(), scope,
    context: { visibleScope: context?.visibleScope ?? scope, scope: context?.scope ?? scope, entities: context?.entities ?? [] },
    history: messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })),
  };
}

type RequestTicket = { controller: AbortController; revision: number };

// Abort alone is insufficient: authentication retries and transports can finish after cancellation.
export function createSocialRequestGate() {
  let active: RequestTicket | null = null;
  let revision = 0;
  return {
    start(): RequestTicket | null {
      if (active) return null;
      active = { controller: new AbortController(), revision: ++revision };
      return active;
    },
    current(ticket: RequestTicket) { return active === ticket && !ticket.controller.signal.aborted; },
    finish(ticket: RequestTicket) { if (active === ticket) active = null; },
    cancel() { active?.controller.abort(); active = null; revision++; },
    revision() { return revision; },
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid social analytics response.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== "string" || value.length > max) throw new Error("Invalid social analytics text.");
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error("Invalid social analytics list.");
  return value;
}
function metric(value: unknown): number | null {
  if (value === null || (typeof value === "number" && Number.isFinite(value))) return value;
  throw new Error("Invalid social analytics metric.");
}
function parseScope(value: unknown): SocialScope {
  const item = record(value);
  if (item.platform !== "all" && !isSocialPlatform(item.platform)) throw new Error("Invalid social analytics scope.");
  const fromDate = text(item.fromDate, 10), toDate = text(item.toDate, 10);
  if (![fromDate, toDate].every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date) || fromDate > toDate) {
    throw new Error("Invalid social analytics dates.");
  }
  return { platform: item.platform, fromDate, toDate };
}
function parseEntity(value: unknown): SocialEntity {
  const item = record(value);
  if ((item.kind !== "platform" && item.kind !== "post") || !isSocialPlatform(item.platform)) throw new Error("Invalid social analytics entity.");
  const url = item.url === undefined ? null : safeSocialUrl(text(item.url, 2000));
  return { kind: item.kind, platform: item.platform, id: text(item.id, 500), label: text(item.label),
    ...(item.accountId === undefined ? {} : { accountId:text(item.accountId,160) }),
    ...(url ? { url } : {}) };
}

export function parseSocialAnswer(value: unknown): SocialChatAnswer {
  const item = record(value);
  const status = item.status;
  if (status !== "answered" && status !== "partial" && status !== "clarification_required" && status !== "unavailable") throw new Error("Invalid social analytics status.");
  if (typeof item.retryable !== "boolean") throw new Error("Invalid social analytics retry state.");
  const columns = list(item.columns, 12).map((column) => text(column));
  return {
    status, scope: parseScope(item.scope), summary: text(item.summary), columns,
    rows: list(item.rows, 100).map((value) => {
      const row = record(value), values = list(row.values, 12).map(metric);
      if (values.length !== columns.length) throw new Error("Social analytics columns do not match values.");
      return { label: text(row.label), values, unit: text(row.unit, 100),
        ...(row.difference === undefined ? {} : { difference: metric(row.difference) }),
        ...(row.percentChange === undefined ? {} : { percentChange: metric(row.percentChange) }) };
    }),
    entities: list(item.entities, 100).map(parseEntity),
    evidence: list(item.evidence, 500).map((value) => {
      const evidence = record(value);
      if (!SOCIAL_METRICS.includes(evidence.metric as typeof SOCIAL_METRICS[number])) throw new Error("Invalid social analytics metric name.");
      const sourceUrl = evidence.sourceUrl === undefined ? null : safeSocialUrl(text(evidence.sourceUrl, 2000));
      return { entity: parseEntity(evidence.entity), metric: evidence.metric as typeof SOCIAL_METRICS[number],
        value: metric(evidence.value), unit: text(evidence.unit, 100), basis: text(evidence.basis, 200),
        fromDate: text(evidence.fromDate, 10), toDate: text(evidence.toDate, 10), fetchedAt: text(evidence.fetchedAt, 100),
        dataAsOf: evidence.dataAsOf === null ? null : text(evidence.dataAsOf, 100),
        ...(evidence.reason === undefined ? {} : { reason: text(evidence.reason) }),
        ...(sourceUrl ? { sourceUrl } : {}) };
    }),
    limitations: list(item.limitations, 100).map((value) => text(value)), retryable: item.retryable,
    ...(item.candidates === undefined ? {} : { candidates: list(item.candidates, 100).map(parseEntity) }),
  };
}

export function socialResponseError(response: Response): Error {
  return new Error(response.status === 401 || response.status === 403
    ? "Your account cannot access this request. Check your sign-in and access."
    : response.status === 404 || response.status === 410
      ? "This saved chat is no longer available. Refresh the saved-chat list."
      : response.status === 413 ? "This chat is too large. Download answers or start a new chat."
        : response.status === 429 ? "Too many requests. Wait a moment and retry."
          : "The request could not be completed. Please retry.");
}

export async function readSocialAnswerResponse(response: Response): Promise<SocialChatAnswer> {
  const payload: unknown = await response.json().catch(() => null);
  // A typed unavailable answer on HTTP 503 retains its explanation and retry action.
  try { return parseSocialAnswer(payload); }
  catch { throw response.ok ? new Error("The response was not a valid analytics answer. Retry your question.") : socialResponseError(response); }
}

export function parseSocialMessages(value: unknown): SocialChatMessage[] {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 100_000) throw new Error("This chat exceeds the 100 KB save limit.");
  return list(value, 100).map((value) => {
    const item = record(value);
    if (item.role !== "user" && item.role !== "assistant") throw new Error("Invalid saved chat role.");
    return { role: item.role, content: text(item.content),
      ...(item.answer === undefined ? {} : { answer: parseSocialAnswer(item.answer) }) };
  });
}

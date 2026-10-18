import type { DB } from "./db.ts";
import { isSocialPlatform, SOCIAL_METRICS } from "./social-analytics-contracts.ts";
import type { SocialChatAnswer, SocialChatMessage } from "./social-analytics-contracts.ts";

const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const validId = (id: unknown): id is string => typeof id === "string" && /^sinv_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const text = (value: unknown): value is string => typeof value === "string";
const numberOrNull = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value));
const list = (value: unknown, valid: (item: unknown) => boolean) => Array.isArray(value) && value.every(valid);
const optional = (value: Record<string, unknown>, key: string, valid: (item: unknown) => boolean) => !(key in value) || valid(value[key]);
const date = (value: unknown): value is string => text(value) && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const timestamp = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(Date.parse(value));
const range = (value: Record<string, unknown>) => date(value.fromDate) && date(value.toDate) && value.fromDate <= value.toDate;
const url = (value: unknown) => {
  if (!text(value)) return false;
  try { const parsed = new URL(value); return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password; }
  catch { return false; }
};
const entity = (value: unknown) => record(value) && keys(value, ["kind", "platform", "id", "label", "url", "accountId"])
  && (value.kind === "platform" || value.kind === "post") && isSocialPlatform(value.platform)
  && optional(value, "accountId", text) && text(value.id) && !!value.id.trim() && text(value.label) && optional(value, "url", url);

function validAnswer(value: unknown): value is SocialChatAnswer {
  return record(value) && keys(value, ["status", "scope", "summary", "columns", "rows", "evidence", "entities", "limitations", "retryable", "candidates"])
    && ["answered", "partial", "clarification_required", "unavailable"].includes(value.status as string)
    && record(value.scope) && keys(value.scope, ["platform", "fromDate", "toDate"])
    && (value.scope.platform === "all" || isSocialPlatform(value.scope.platform)) && range(value.scope)
    && text(value.summary) && list(value.columns, text)
    && list(value.rows, row => record(row) && keys(row, ["label", "values", "unit", "difference", "percentChange"])
      && text(row.label) && list(row.values, numberOrNull) && text(row.unit)
      && optional(row, "difference", numberOrNull) && optional(row, "percentChange", numberOrNull))
    && list(value.evidence, item => record(item) && keys(item, ["entity", "metric", "value", "unit", "basis", "fromDate", "toDate", "fetchedAt", "dataAsOf", "reason", "sourceUrl"])
      && entity(item.entity) && SOCIAL_METRICS.some(metric => metric === item.metric) && numberOrNull(item.value)
      && text(item.unit) && text(item.basis) && range(item) && timestamp(item.fetchedAt)
      && (item.dataAsOf === null || date(item.dataAsOf) || timestamp(item.dataAsOf))
      && optional(item, "reason", text) && optional(item, "sourceUrl", url))
    && list(value.entities, entity) && list(value.limitations, text) && typeof value.retryable === "boolean"
    && optional(value, "candidates", items => list(items, entity));
}

function validMessages(value: unknown): value is SocialChatMessage[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100
    && value.every(message => record(message) && keys(message, ["role", "content", "answer"])
      && (message.role === "user" || message.role === "assistant")
      && text(message.content) && !!message.content.trim() && message.content.length <= 30000
      && (!("answer" in message) || (message.role === "assistant" && validAnswer(message.answer))))
    && value[0].role === "user";
}

export async function handleSocialAnalyticsInvestigations(request: Request, db: DB, memberId: number): Promise<Response> {
  const match = /^\/beta\/api\/social-analytics\/investigations(?:\/([^/]+))?$/u.exec(new URL(request.url).pathname);
  if (!match) return reply({ error: "not_found" }, 404);
  const id = match[1];
  if (id && !validId(id)) return reply({ error: "not_found" }, 404);
  try {
    if (request.method === "GET") {
      if (!id) {
        const rows = await db.prepare("SELECT id, title, updated_at AS updatedAt FROM social_analytics_investigations WHERE member_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC, id LIMIT 100").bind(memberId).all();
        return reply({ investigations: rows.results });
      }
      const row = await db.prepare("SELECT id, title, messages_json, updated_at AS updatedAt FROM social_analytics_investigations WHERE member_id = ? AND id = ? AND deleted_at IS NULL").bind(memberId, id).first<{ id: string; title: string; messages_json: string; updatedAt: string }>();
      if (!row) return reply({ error: "not_found" }, 404);
      const messages: unknown = JSON.parse(row.messages_json);
      if (!validMessages(messages)) return reply({ error: "saved_chats_unavailable" }, 503);
      return reply({ id: row.id, title: row.title, updatedAt: row.updatedAt, schemaVersion: 1, messages });
    }
    if (request.method === "DELETE" && id) {
      const now = new Date().toISOString();
      // The same atomic upsert tombstones absent IDs, so a delayed first save cannot resurrect them.
      await db.prepare("INSERT INTO social_analytics_investigations (member_id, id, title, messages_json, updated_at, deleted_at) SELECT id, ?, '', '[]', ?, ? FROM member_users WHERE id = ? AND deletion_state IS NULL AND lifecycle_state = 'active' ON CONFLICT(member_id, id) DO UPDATE SET title = '', messages_json = '[]', updated_at = excluded.updated_at, deleted_at = COALESCE(social_analytics_investigations.deleted_at, excluded.deleted_at)").bind(id, now, now, memberId).run();
      return reply({ deleted: true });
    }
    if (request.method !== "POST" || id) return reply({ error: "not_found" }, 404);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 100000) return reply({ error: "chat_too_large" }, 413);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return reply({ error: "invalid_request" }, 400); }
    if (!record(input) || !keys(input, ["id", "schemaVersion", "messages"]) || !validId(input.id) || input.schemaVersion !== 1 || !validMessages(input.messages)) return reply({ error: "invalid_request" }, 400);
    // Browser snapshots are private display history, never trusted evidence or inference input.
    const title = input.messages[0].content.slice(0, 160);
    const updatedAt = new Date().toISOString();
    const saved = await db.prepare("INSERT INTO social_analytics_investigations (member_id, id, title, messages_json, updated_at) SELECT id, ?, ?, ?, ? FROM member_users WHERE id = ? AND deletion_state IS NULL AND lifecycle_state = 'active' ON CONFLICT(member_id, id) DO UPDATE SET title = excluded.title, messages_json = excluded.messages_json, updated_at = excluded.updated_at WHERE social_analytics_investigations.deleted_at IS NULL RETURNING id").bind(input.id, title, JSON.stringify(input.messages), updatedAt, memberId).first();
    return saved ? reply({ id: input.id, title, updatedAt }) : reply({ error: "investigation_unavailable" }, 409);
  } catch { return reply({ error: "saved_chats_unavailable" }, 503); }
}

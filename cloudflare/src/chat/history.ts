import { parseSourceMode, type SourceMode } from "./source-mode.ts";
import type { DB, OperatorRole } from "../db.ts";

export type ChatConversation = {
  id: string;
  operator_id: number;
  workspace: string;
  title: string;
  source_mode: SourceMode;
  episode_id: string | null;
  lifecycle_state: "active" | "archived";
  create_idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sequence: number;
  role: "user" | "assistant";
  content: string;
  source_metadata_json: string;
  grounding_state: "grounded" | "ungrounded" | "unavailable";
  model: string | null;
  model_fallback: number;
  request_id: string | null;
  idempotency_key: string | null;
  created_at: string;
};

export type ChatActor = { operatorId: number; role: OperatorRole };
export type ChatConversationView = { conversation: ChatConversation; messages: ChatMessage[] };
export type ChatPage = { conversations: ChatConversation[]; nextCursor: string | null };

export type CreateConversationInput = {
  title?: unknown;
  sourceMode?: unknown;
  episodeId?: unknown;
  userMessage: MessageInput;
  idempotencyKey?: unknown;
  now?: string;
};

export type MessageInput = {
  role?: unknown;
  content?: unknown;
  sourceMetadata?: unknown;
  grounded?: unknown;
  groundingState?: unknown;
  model?: unknown;
  modelFallback?: unknown;
  requestId?: unknown;
  idempotencyKey?: unknown;
};

const conversationIdPattern = /^cnv_[A-Za-z0-9-]{8,88}$/u;
const messageIdPattern = /^msg_[A-Za-z0-9-]{8,88}$/u;
const requestIdPattern = /^[A-Za-z0-9._:-]{1,160}$/u;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,256}$/u;
const episodePattern = /^[A-Za-z0-9_-]{1,128}$/u;
const cursorPattern = /^[A-Za-z0-9_-]{1,512}$/u;
const MAX_PAGE_SIZE = 100;

function text(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
}

function validId(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value);
}

function validOperatorId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function idempotencyKey(value: unknown): string | null {
  return value == null ? null : typeof value === "string" && idempotencyPattern.test(value) ? value : null;
}

function requestId(value: unknown): string | null {
  return value == null ? null : typeof value === "string" && requestIdPattern.test(value) ? value : null;
}

function episodeId(value: unknown): string | null {
  return value == null ? null : typeof value === "string" && episodePattern.test(value.trim()) ? value.trim() : null;
}

function metadataJson(value: unknown): string | null {
  const candidate = value === undefined ? {} : value;
  let serialized: string;
  try {
    serialized = JSON.stringify(candidate);
  } catch {
    return null;
  }
  if (serialized === undefined || serialized.length > 30_000) return null;
  try {
    JSON.parse(serialized);
    return serialized;
  } catch {
    return null;
  }
}

function groundingState(input: MessageInput): ChatMessage["grounding_state"] | null {
  if (input.groundingState === "grounded" || input.groundingState === "ungrounded" || input.groundingState === "unavailable") return input.groundingState;
  if (input.grounded === true) return "grounded";
  if (input.grounded === false) return "ungrounded";
  return "ungrounded";
}

function normalizedMessage(input: MessageInput, forcedRole?: ChatMessage["role"]) {
  const role = forcedRole ?? (input.role === "assistant" ? "assistant" : input.role === "user" ? "user" : null);
  const content = text(input.content, 20_000);
  const sourceMetadata = metadataJson(input.sourceMetadata);
  const state = groundingState(input);
  const model = input.model == null ? null : text(input.model, 160);
  const fallback = input.modelFallback == null ? 0 : input.modelFallback === true ? 1 : input.modelFallback === false ? 0 : null;
  if (!role || !content || !sourceMetadata || !state || !model && input.model != null || fallback === null) return null;
  return {
    role,
    content,
    sourceMetadata,
    groundingState: state,
    model,
    modelFallback: fallback,
    requestId: requestId(input.requestId),
    idempotencyKey: idempotencyKey(input.idempotencyKey),
  };
}

function encodeCursor(updatedAt: string, id: string): string {
  return btoa(JSON.stringify({ updatedAt, id })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeCursor(value: unknown): { updatedAt: string; id: string } | null {
  if (typeof value !== "string" || !cursorPattern.test(value)) return null;
  try {
    const decoded = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = JSON.parse(decoded) as { updatedAt?: unknown; id?: unknown };
    return validTimestamp(parsed.updatedAt) && validId(parsed.id, conversationIdPattern) ? { updatedAt: parsed.updatedAt, id: parsed.id } : null;
  } catch {
    return null;
  }
}

function conversationId(): string {
  return `cnv_${crypto.randomUUID()}`;
}

function messageId(): string {
  return `msg_${crypto.randomUUID()}`;
}

function selectedConversationColumns(): string {
  return "id, operator_id, workspace, title, source_mode, episode_id, lifecycle_state, create_idempotency_key, created_at, updated_at, archived_at";
}

function selectedMessageColumns(): string {
  return "id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at";
}

async function conversationForOperator(db: DB, operatorId: number, id: string): Promise<ChatConversation | null> {
  return await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE id = ? AND operator_id = ?`).bind(id, operatorId).first<ChatConversation>() ?? null;
}

export async function createConversation(db: DB, operatorId: number, input: CreateConversationInput): Promise<ChatConversationView | null> {
  if (!validOperatorId(operatorId)) return null;
  const message = normalizedMessage(input.userMessage, "user");
  const createKey = idempotencyKey(input.idempotencyKey);
  if (!message || (input.idempotencyKey !== undefined && !createKey)) return null;
  const sourceMode = parseSourceMode(input.sourceMode);
  const title = text(input.title, 240) ?? message.content.slice(0, 120);
  const scopedEpisodeId = episodeId(input.episodeId);
  if (input.episodeId !== undefined && !scopedEpisodeId) return null;
  const now = input.now ?? new Date().toISOString();
  if (!validTimestamp(now)) return null;

  if (createKey) {
    const existing = await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE create_idempotency_key = ? AND operator_id = ?`).bind(createKey, operatorId).first<ChatConversation>();
    if (existing) return getConversation(db, operatorId, existing.id);
    const collision = await db.prepare("SELECT id FROM chat_conversations WHERE create_idempotency_key = ?").bind(createKey).first<{ id: string }>();
    if (collision) return null;
  }

  const id = conversationId();
  const firstMessageId = messageId();
  try {
    await db.batch([
      db.prepare("INSERT INTO chat_conversations (id, operator_id, workspace, title, source_mode, episode_id, lifecycle_state, create_idempotency_key, created_at, updated_at) VALUES (?, ?, 'wtfmedia', ?, ?, ?, 'active', ?, ?, ?)").bind(id, operatorId, title, sourceMode, scopedEpisodeId, createKey, now, now),
      db.prepare("INSERT INTO chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(firstMessageId, id, message.role, message.content, message.sourceMetadata, message.groundingState, message.model, message.modelFallback, message.requestId, message.idempotencyKey, now),
    ]);
  } catch {
    return null;
  }
  return getConversation(db, operatorId, id);
}

export async function appendMessage(db: DB, operatorId: number, id: unknown, input: MessageInput, forcedRole?: ChatMessage["role"], now = new Date().toISOString()): Promise<ChatMessage | null> {
  if (!validOperatorId(operatorId) || !validId(id, conversationIdPattern) || !validTimestamp(now)) return null;
  const message = normalizedMessage(input, forcedRole);
  if (!message || (input.idempotencyKey !== undefined && !message.idempotencyKey)) return null;
  const conversation = await conversationForOperator(db, operatorId, id);
  if (!conversation || conversation.lifecycle_state !== "active") return null;

  if (message.idempotencyKey) {
    const existing = await db.prepare(`SELECT ${selectedMessageColumns()} FROM chat_messages WHERE conversation_id = ? AND idempotency_key = ?`).bind(id, message.idempotencyKey).first<ChatMessage>();
    if (existing) {
      return existing.role === message.role && existing.content === message.content && existing.source_metadata_json === message.sourceMetadata ? existing : null;
    }
  }

  const newId = messageId();
  try {
    await db.batch([
      db.prepare("INSERT INTO chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) VALUES (?, ?, (SELECT COALESCE(MAX(sequence) + 1, 1) FROM chat_messages WHERE conversation_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(newId, id, id, message.role, message.content, message.sourceMetadata, message.groundingState, message.model, message.modelFallback, message.requestId, message.idempotencyKey, now),
      db.prepare("UPDATE chat_conversations SET updated_at = ? WHERE id = ? AND operator_id = ? AND lifecycle_state = 'active'").bind(now, id, operatorId),
    ]);
  } catch {
    return null;
  }
  return await db.prepare(`SELECT ${selectedMessageColumns()} FROM chat_messages WHERE id = ? AND conversation_id = ?`).bind(newId, id).first<ChatMessage>() ?? null;
}

export async function getConversation(db: DB, operatorId: number, id: unknown): Promise<ChatConversationView | null> {
  if (!validOperatorId(operatorId) || !validId(id, conversationIdPattern)) return null;
  const conversation = await conversationForOperator(db, operatorId, id);
  if (!conversation) return null;
  const result = await db.prepare(`SELECT ${selectedMessageColumns()} FROM chat_messages WHERE conversation_id = ? ORDER BY sequence ASC`).bind(id).all<ChatMessage>();
  return { conversation, messages: result.results };
}

export async function getConversationForActor(db: DB, actor: ChatActor, id: unknown): Promise<ChatConversationView | null> {
  if (!validOperatorId(actor.operatorId) || !validId(id, conversationIdPattern)) return null;
  const conversation = actor.role === "admin" || actor.role === "super_admin"
    ? await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE id = ?`).bind(id).first<ChatConversation>()
    : await conversationForOperator(db, actor.operatorId, id);
  if (!conversation) return null;
  const result = await db.prepare(`SELECT ${selectedMessageColumns()} FROM chat_messages WHERE conversation_id = ? ORDER BY sequence ASC`).bind(id).all<ChatMessage>();
  return { conversation, messages: result.results };
}

export async function listConversations(db: DB, operatorId: number, cursor?: unknown, limit = 25): Promise<ChatPage | null> {
  if (!validOperatorId(operatorId) || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return null;
  const decoded = cursor == null ? null : decodeCursor(cursor);
  if (cursor !== undefined && !decoded) return null;
  const rows = decoded
    ? await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE operator_id = ? AND (updated_at < ? OR (updated_at = ? AND id < ?)) ORDER BY updated_at DESC, id DESC LIMIT ?`).bind(operatorId, decoded.updatedAt, decoded.updatedAt, decoded.id, limit + 1).all<ChatConversation>()
    : await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE operator_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`).bind(operatorId, limit + 1).all<ChatConversation>();
  const conversations = rows.results.slice(0, limit);
  const last = rows.results.length > limit ? conversations.at(-1) : undefined;
  return { conversations, nextCursor: last ? encodeCursor(last.updated_at, last.id) : null };
}

export async function listConversationsForActor(db: DB, actor: ChatActor, cursor?: unknown, limit = 25): Promise<ChatPage | null> {
  if (!validOperatorId(actor.operatorId) || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return null;
  const decoded = cursor == null ? null : decodeCursor(cursor);
  if (cursor !== undefined && !decoded) return null;
  const scope = actor.role === "admin" || actor.role === "super_admin" ? "" : "operator_id = ? AND ";
  const values = actor.role === "admin" || actor.role === "super_admin"
    ? (decoded ? [decoded.updatedAt, decoded.updatedAt, decoded.id, limit + 1] : [limit + 1])
    : (decoded ? [actor.operatorId, decoded.updatedAt, decoded.updatedAt, decoded.id, limit + 1] : [actor.operatorId, limit + 1]);
  const query = decoded
    ? `SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE ${scope}(updated_at < ? OR (updated_at = ? AND id < ?)) ORDER BY updated_at DESC, id DESC LIMIT ?`
    : `SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE ${scope}1 = 1 ORDER BY updated_at DESC, id DESC LIMIT ?`;
  const rows = await db.prepare(query).bind(...values).all<ChatConversation>();
  const conversations = rows.results.slice(0, limit);
  const last = rows.results.length > limit ? conversations.at(-1) : undefined;
  return { conversations, nextCursor: last ? encodeCursor(last.updated_at, last.id) : null };
}

export async function archiveConversation(db: DB, actor: ChatActor, id: unknown, now = new Date().toISOString()): Promise<ChatConversation | null> {
  if (!validOperatorId(actor.operatorId) || !validId(id, conversationIdPattern) || !validTimestamp(now)) return null;
  const target = await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE id = ?`).bind(id).first<ChatConversation>();
  if (!target) return null;
  const crossOperator = target.operator_id !== actor.operatorId;
  if (crossOperator && actor.role !== "admin" && actor.role !== "super_admin") return null;
  try {
    await db.prepare("UPDATE chat_conversations SET lifecycle_state = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND lifecycle_state = 'active'").bind(now, now, id).run();
  } catch {
    return null;
  }
  return await db.prepare(`SELECT ${selectedConversationColumns()} FROM chat_conversations WHERE id = ?`).bind(id).first<ChatConversation>() ?? null;
}

function csvCell(value: unknown): string {
  const valueText = String(value ?? "");
  const neutralized = /^[=+\-@]/u.test(valueText) ? `'${valueText}` : valueText;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export async function exportConversationsCsv(db: DB, actor: ChatActor, operatorScope?: unknown): Promise<string | null> {
  if (!validOperatorId(actor.operatorId) || (actor.role !== "admin" && actor.role !== "super_admin")) return null;
  const scope = operatorScope == null ? null : Number.isSafeInteger(operatorScope) && Number(operatorScope) > 0 ? Number(operatorScope) : null;
  if (operatorScope !== undefined && scope === null) return null;
  const rows = scope === null
    ? await db.prepare(`SELECT c.id AS conversation_id, c.operator_id, c.title, c.source_mode, c.episode_id, c.lifecycle_state, m.id AS message_id, m.sequence, m.role, m.content, m.source_metadata_json, m.grounding_state, m.model, m.model_fallback, m.request_id, m.created_at FROM chat_conversations c JOIN chat_messages m ON m.conversation_id = c.id ORDER BY c.updated_at DESC, c.id, m.sequence`).all<Record<string, unknown>>()
    : await db.prepare(`SELECT c.id AS conversation_id, c.operator_id, c.title, c.source_mode, c.episode_id, c.lifecycle_state, m.id AS message_id, m.sequence, m.role, m.content, m.source_metadata_json, m.grounding_state, m.model, m.model_fallback, m.request_id, m.created_at FROM chat_conversations c JOIN chat_messages m ON m.conversation_id = c.id WHERE c.operator_id = ? ORDER BY c.updated_at DESC, c.id, m.sequence`).bind(scope).all<Record<string, unknown>>();
  const columns = ["conversation_id", "operator_id", "title", "source_mode", "episode_id", "lifecycle_state", "message_id", "sequence", "role", "content", "source_metadata_json", "grounding_state", "model", "model_fallback", "request_id", "created_at"];
  return [columns.join(","), ...rows.results.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

export function chatHistoryEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "on", "enabled", "active", "stable", "beta", "experimental"].includes(value.trim().toLowerCase());
}

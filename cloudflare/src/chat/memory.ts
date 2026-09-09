import type { DB, OperatorRole } from "../db.ts";

export type SavedMemory = {
  id: string;
  operator_id: number;
  content: string;
  source_conversation_id: string | null;
  lifecycle_state: "active" | "archived";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type MemoryActor = { operatorId: number; role: OperatorRole };

const memoryIdPattern = /^mem_[A-Za-z0-9-]{8,88}$/u;
const conversationIdPattern = /^cnv_[A-Za-z0-9-]{8,88}$/u;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const MAX_PAGE_SIZE = 100;
const MAX_CONTEXT_ITEMS = 12;
const MAX_CONTEXT_CHARS = 8_000;

export type CreateMemoryInput = {
  content?: unknown;
  sourceConversationId?: unknown;
  now?: string;
};

function validOperatorId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function validId(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && timestampPattern.test(value);
}

function normalizedContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const content = value.trim();
  return content.length > 0 && content.length <= 2_000 ? content : null;
}

function selectedColumns(): string {
  return "id, operator_id, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at";
}

async function conversationBelongsToOperator(db: DB, operatorId: number, id: string): Promise<boolean> {
  const row = await db.prepare("SELECT id FROM chat_conversations WHERE id = ? AND operator_id = ?").bind(id, operatorId).first<{ id: string }>();
  return Boolean(row);
}

export async function listMemoriesForActor(db: DB, actor: MemoryActor, includeArchived = false, limit = 50): Promise<SavedMemory[] | null> {
  if (!validOperatorId(actor.operatorId) || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return null;
  const lifecycle = includeArchived ? "" : " AND lifecycle_state = 'active'";
  const result = await db.prepare(`SELECT ${selectedColumns()} FROM saved_memories WHERE operator_id = ?${lifecycle} ORDER BY updated_at DESC, id DESC LIMIT ?`).bind(actor.operatorId, limit).all<SavedMemory>();
  return result.results;
}

export async function getMemoryForActor(db: DB, actor: MemoryActor, id: unknown): Promise<SavedMemory | null> {
  if (!validOperatorId(actor.operatorId) || !validId(id, memoryIdPattern)) return null;
  return await db.prepare(`SELECT ${selectedColumns()} FROM saved_memories WHERE id = ? AND operator_id = ?`).bind(id, actor.operatorId).first<SavedMemory>() ?? null;
}

export async function createMemory(db: DB, actor: MemoryActor, input: CreateMemoryInput): Promise<SavedMemory | null> {
  if (!validOperatorId(actor.operatorId)) return null;
  const content = normalizedContent(input.content);
  if (!content) return null;
  const sourceConversationId = input.sourceConversationId == null || input.sourceConversationId === ""
    ? null
    : validId(input.sourceConversationId, conversationIdPattern) ? input.sourceConversationId : null;
  if (input.sourceConversationId !== undefined && input.sourceConversationId !== null && input.sourceConversationId !== "" && !sourceConversationId) return null;
  if (sourceConversationId && !await conversationBelongsToOperator(db, actor.operatorId, sourceConversationId)) return null;
  const now = input.now ?? new Date().toISOString();
  if (!validTimestamp(now)) return null;
  const id = `mem_${crypto.randomUUID()}`;
  try {
    await db.prepare("INSERT INTO saved_memories (id, operator_id, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)").bind(id, actor.operatorId, content, sourceConversationId, now, now).run();
  } catch {
    return null;
  }
  return getMemoryForActor(db, actor, id);
}

export async function archiveMemory(db: DB, actor: MemoryActor, id: unknown, now = new Date().toISOString()): Promise<SavedMemory | null> {
  if (!validOperatorId(actor.operatorId) || !validId(id, memoryIdPattern) || !validTimestamp(now)) return null;
  const current = await getMemoryForActor(db, actor, id);
  if (!current) return null;
  if (current.lifecycle_state === "archived") return current;
  try {
    await db.prepare("UPDATE saved_memories SET lifecycle_state = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND operator_id = ? AND lifecycle_state = 'active'").bind(now, now, id, actor.operatorId).run();
  } catch {
    return null;
  }
  return getMemoryForActor(db, actor, id);
}

/** Context is owner-scoped and deliberately bounded before reaching the model. */
export async function activeMemoryContext(db: DB, operatorId: number): Promise<string[]> {
  if (!validOperatorId(operatorId)) return [];
  const rows = await db.prepare("SELECT content FROM saved_memories WHERE operator_id = ? AND lifecycle_state = 'active' ORDER BY updated_at DESC, id DESC LIMIT ?").bind(operatorId, MAX_CONTEXT_ITEMS).all<{ content: string }>();
  const selected: string[] = [];
  let total = 0;
  for (const row of rows.results) {
    const content = normalizedContent(row.content);
    if (!content || total + content.length > MAX_CONTEXT_CHARS) continue;
    selected.push(content);
    total += content.length;
  }
  return selected;
}

export { memoryIdPattern };

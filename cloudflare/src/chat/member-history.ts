import { parseSourceMode, type SourceMode } from "./source-mode.ts";
import type { DB } from "../db.ts";

export type MemberConversation = { id: string; member_id: number; title: string; source_mode: SourceMode; lifecycle_state: "active" | "archived"; created_at: string; updated_at: string; archived_at: string | null };
export type MemberMessage = { id: string; conversation_id: string; sequence: number; role: "user" | "assistant"; content: string; source_metadata_json: string; grounding_state: "grounded" | "ungrounded" | "unavailable"; model: string | null; model_fallback: number; request_id: string | null; created_at: string };
export type MemberConversationView = { conversation: MemberConversation; messages: MemberMessage[] };

const id = (value: unknown) => typeof value === "string" && /^mcnv_[A-Za-z0-9-]{8,88}$/u.test(value);
const member = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const text = (value: unknown, maximum = 20_000) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum ? value.trim() : null;
const columns = "id, member_id, title, source_mode, lifecycle_state, created_at, updated_at, archived_at";

export async function listMemberConversations(db: DB, memberId: number) {
  if (!member(memberId)) return null;
  const rows = await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE member_id = ? AND lifecycle_state = 'active' ORDER BY updated_at DESC, id DESC LIMIT 25`).bind(memberId).all<MemberConversation>();
  return { conversations: rows.results, nextCursor: null };
}

export async function getMemberConversation(db: DB, memberId: number, conversationId: unknown): Promise<MemberConversationView | null> {
  if (!member(memberId) || !id(conversationId)) return null;
  const conversation = await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE id = ? AND member_id = ?`).bind(conversationId, memberId).first<MemberConversation>();
  if (!conversation) return null;
  const messages = await db.prepare("SELECT id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, created_at FROM member_chat_messages WHERE conversation_id = ? ORDER BY sequence ASC").bind(conversationId).all<MemberMessage>();
  return { conversation, messages: messages.results };
}

export async function createMemberConversation(db: DB, memberId: number, question: unknown, sourceMode: unknown, requestId: string, now = new Date().toISOString()): Promise<MemberConversationView | null> {
  const content = text(question, 2_000);
  if (!member(memberId) || !content) return null;
  const conversationId = `mcnv_${crypto.randomUUID()}`;
  try {
    await db.batch([
      db.prepare("INSERT INTO member_chat_conversations (id, member_id, workspace, title, source_mode, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, 'wtfmedia', ?, ?, 'active', ?, ?, NULL)").bind(conversationId, memberId, content.slice(0, 120), parseSourceMode(sourceMode), now, now),
      db.prepare("INSERT INTO member_chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) VALUES (?, ?, 1, 'user', ?, '{}', 'ungrounded', NULL, 0, ?, NULL, ?)").bind(`mmsg_${crypto.randomUUID()}`, conversationId, content, requestId, now),
    ]);
    return getMemberConversation(db, memberId, conversationId);
  } catch { return null; }
}

export async function appendMemberAssistant(db: DB, memberId: number, conversationId: string, answer: { content: string; metadata: unknown; grounded: boolean; model: string | null; fallback: boolean; requestId: string }, now = new Date().toISOString()) {
  if (!member(memberId) || !id(conversationId) || !text(answer.content)) return null;
  const owned = await db.prepare("SELECT id FROM member_chat_conversations WHERE id = ? AND member_id = ? AND lifecycle_state = 'active'").bind(conversationId, memberId).first<{ id: string }>();
  if (!owned) return null;
  try {
    await db.batch([
      db.prepare("INSERT INTO member_chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) VALUES (?, ?, (SELECT COALESCE(MAX(sequence) + 1, 1) FROM member_chat_messages WHERE conversation_id = ?), 'assistant', ?, ?, ?, ?, ?, ?, NULL, ?)").bind(`mmsg_${crypto.randomUUID()}`, conversationId, conversationId, answer.content, JSON.stringify(answer.metadata), answer.grounded ? "grounded" : "ungrounded", answer.model, answer.fallback ? 1 : 0, answer.requestId, now),
      db.prepare("UPDATE member_chat_conversations SET updated_at = ? WHERE id = ? AND member_id = ?").bind(now, conversationId, memberId),
    ]);
    return getMemberConversation(db, memberId, conversationId);
  } catch { return null; }
}

/** Archive only: member content is retained and can never be deleted by this route. */
export async function archiveMemberConversation(db: DB, memberId: number, conversationId: unknown, now = new Date().toISOString()): Promise<MemberConversation | null> {
  if (!member(memberId) || !id(conversationId)) return null;
  const target = await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE id = ? AND member_id = ?`).bind(conversationId, memberId).first<MemberConversation>();
  if (!target) return null;
  if (target.lifecycle_state === "archived") return target;
  try {
    await db.prepare("UPDATE member_chat_conversations SET lifecycle_state = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND member_id = ? AND lifecycle_state = 'active'").bind(now, now, conversationId, memberId).run();
    return await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE id = ? AND member_id = ?`).bind(conversationId, memberId).first<MemberConversation>() ?? null;
  } catch { return null; }
}

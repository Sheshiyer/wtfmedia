import { parseEpisodeId, parseSourceMode, type SourceMode } from "./source-mode.ts";
import type { DB } from "../db.ts";

export type MemberConversation = { id: string; member_id: number; title: string; source_mode: SourceMode; episode_id: string | null; lifecycle_state: "active" | "archived"; created_at: string; updated_at: string; archived_at: string | null };
export type MemberMessage = { id: string; conversation_id: string; sequence: number; role: "user" | "assistant"; content: string; source_metadata_json: string; grounding_state: "grounded" | "ungrounded" | "unavailable"; model: string | null; model_fallback: number; request_id: string | null; idempotency_key: string | null; created_at: string };
export type MemberConversationView = { conversation: MemberConversation; messages: MemberMessage[]; previousMessageCursor: string | null; retryable?: true; retrySourceMode?: SourceMode; resumeMessageId?: string };
export type MemberConversationDeletionReceipt = { deleted: true; linkedSavedPreferenceCount: number };

const id = (value: unknown) => typeof value === "string" && /^mcnv_[A-Za-z0-9-]{8,88}$/u.test(value);
const member = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const text = (value: unknown, maximum = 20_000) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum ? value.trim() : null;
const columns = "id, member_id, title, source_mode, episode_id, lifecycle_state, created_at, updated_at, archived_at";
const messageColumns = "id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at";
const MESSAGE_PAGE_SIZE = 50;

function decodeCursor(value: unknown): { updatedAt: string; id: string } | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,512}$/u.test(value)) return null;
  try {
    const parsed = JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/")));
    return parsed && typeof parsed.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(parsed.updatedAt)
      && Number.isFinite(Date.parse(parsed.updatedAt)) && new Date(parsed.updatedAt).toISOString() === parsed.updatedAt && id(parsed.id) ? parsed : null;
  } catch { return null; }
}

function encodeMessageCursor(conversationId: string, beforeSequence: number): string {
  return btoa(JSON.stringify({ conversationId, beforeSequence })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeMessageCursor(value: unknown, conversationId: string): number | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,512}$/u.test(value)) return null;
  try {
    const parsed = JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/")));
    return parsed && parsed.conversationId === conversationId
      && Number.isSafeInteger(parsed.beforeSequence) && parsed.beforeSequence > 0 ? parsed.beforeSequence : null;
  } catch { return null; }
}

function memberConversationView(conversation: MemberConversation, messages: MemberMessage[], previousMessageCursor: string | null): MemberConversationView {
  const lastMessage = messages.at(-1);
  if (conversation.lifecycle_state === "active" && lastMessage?.role === "user") {
    const scope = JSON.parse(lastMessage.source_metadata_json) as { sourceMode?: unknown } | null;
    return { conversation, messages, previousMessageCursor, retryable: true, retrySourceMode: parseSourceMode(scope?.sourceMode ?? conversation.source_mode), resumeMessageId: lastMessage.id };
  }
  return { conversation, messages, previousMessageCursor };
}

async function ownedMemberConversation(db: DB, memberId: number, conversationId: unknown): Promise<MemberConversation | null> {
  if (!member(memberId) || !id(conversationId)) return null;
  return await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE id = ? AND member_id = ?`).bind(conversationId, memberId).first<MemberConversation>();
}

async function allMemberMessages(db: DB, conversationId: string): Promise<MemberMessage[]> {
  const messages = await db.prepare(`SELECT ${messageColumns} FROM member_chat_messages WHERE conversation_id = ? ORDER BY sequence ASC`).bind(conversationId).all<MemberMessage>();
  return messages.results;
}

export async function listMemberConversations(db: DB, memberId: number, cursor?: unknown) {
  if (!member(memberId)) return null;
  const decoded = cursor === undefined ? null : decodeCursor(cursor);
  if (cursor !== undefined && !decoded) return null;
  const rows = decoded
    ? await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE member_id = ? AND lifecycle_state = 'active' AND (updated_at < ? OR (updated_at = ? AND id < ?)) ORDER BY updated_at DESC, id DESC LIMIT 26`).bind(memberId, decoded.updatedAt, decoded.updatedAt, decoded.id).all<MemberConversation>()
    : await db.prepare(`SELECT ${columns} FROM member_chat_conversations WHERE member_id = ? AND lifecycle_state = 'active' ORDER BY updated_at DESC, id DESC LIMIT 26`).bind(memberId).all<MemberConversation>();
  const conversations = rows.results.slice(0, 25);
  const last = rows.results.length > 25 ? conversations.at(-1) : undefined;
  const nextCursor = last ? btoa(JSON.stringify({ updatedAt: last.updated_at, id: last.id })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "") : null;
  return { conversations, nextCursor };
}

export async function getMemberConversation(db: DB, memberId: number, conversationId: unknown, before?: unknown): Promise<MemberConversationView | null> {
  const conversation = await ownedMemberConversation(db, memberId, conversationId);
  if (!conversation) return null;
  const beforeSequence = before === undefined ? null : decodeMessageCursor(before, conversation.id);
  if (before !== undefined && beforeSequence === null) return null;
  // Reverse keyset paging bounds browser payloads; each page is restored to
  // chronological order before it crosses the member API boundary.
  const rows = beforeSequence === null
    ? await db.prepare(`SELECT ${messageColumns} FROM member_chat_messages WHERE conversation_id = ? ORDER BY sequence DESC LIMIT ?`).bind(conversation.id, MESSAGE_PAGE_SIZE + 1).all<MemberMessage>()
    : await db.prepare(`SELECT ${messageColumns} FROM member_chat_messages WHERE conversation_id = ? AND sequence < ? ORDER BY sequence DESC LIMIT ?`).bind(conversation.id, beforeSequence, MESSAGE_PAGE_SIZE + 1).all<MemberMessage>();
  const page = rows.results.slice(0, MESSAGE_PAGE_SIZE).reverse();
  const oldest = page[0];
  return memberConversationView(conversation, page, rows.results.length > MESSAGE_PAGE_SIZE && oldest ? encodeMessageCursor(conversation.id, oldest.sequence) : null);
}

/** Turn admission needs durable history for idempotency; it never crosses the browser API boundary. */
async function getMemberConversationForTurn(db: DB, memberId: number, conversationId: unknown): Promise<MemberConversationView | null> {
  const conversation = await ownedMemberConversation(db, memberId, conversationId);
  return conversation ? memberConversationView(conversation, await allMemberMessages(db, conversation.id), null) : null;
}

type MemberTurnInput = { question: unknown; sourceMode?: unknown; episodeId?: unknown; resumeMessageId?: unknown; idempotencyKey: unknown; requestId: string };
export type MemberTurn = { view: MemberConversationView; userMessage: MemberMessage; assistantKey: string; sourceMode: SourceMode; episodeId: string | null; created: boolean; completed: boolean };

/** The digest scopes globally unique create keys to an owner and keeps role keys bounded. */
async function scopedKey(memberId: number, key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([memberId, key])));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Admit one pending user turn. All race-sensitive predicates run in the write statement. */
export async function prepareMemberTurn(db: DB, memberId: number, conversationId: string | undefined, input: MemberTurnInput, now = new Date().toISOString()): Promise<MemberTurn | null> {
  const content = text(input.question, 2_000);
  if (!member(memberId) || !content || typeof input.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,256}$/u.test(input.idempotencyKey)) return null;
  if (conversationId !== undefined && !id(conversationId)) return null;
  if (input.resumeMessageId !== undefined && (conversationId === undefined || typeof input.resumeMessageId !== "string" || !/^mmsg_[A-Za-z0-9-]{8,88}$/u.test(input.resumeMessageId))) return null;
  if (input.sourceMode !== undefined && (typeof input.sourceMode !== "string" || !["published", "uncut", "both"].includes(input.sourceMode))) return null;
  if (input.episodeId !== undefined && (typeof input.episodeId !== "string" || parseEpisodeId(input.episodeId) !== input.episodeId)) return null;
  if (!/^[A-Za-z0-9._:-]{1,160}$/u.test(input.requestId)) return null;
  const key = await scopedKey(memberId, input.idempotencyKey);
  const userKey = `user:${key}`;
  let created = false;
  let view: MemberConversationView | null = null;
  if (conversationId === undefined) {
    const existing = await db.prepare("SELECT id FROM member_chat_conversations WHERE create_idempotency_key = ? AND member_id = ?").bind(key, memberId).first<{ id: string }>();
    if (existing) conversationId = existing.id;
    else {
      // A deletion tombstone intentionally outlives the erased conversation so
      // an original create-key replay cannot resurrect private history.
      const deleted = await db.prepare("SELECT conversation_id FROM member_chat_deletion_tombstones WHERE create_idempotency_key = ? AND member_id = ?").bind(key, memberId).first<{ conversation_id: string }>();
      if (deleted) return null;
      const newId = `mcnv_${crypto.randomUUID()}`;
      const sourceMode = parseSourceMode(input.sourceMode);
      const episodeId = typeof input.episodeId === "string" ? input.episodeId : null;
      const metadata = JSON.stringify({ sourceMode, episodeId });
      try {
        await db.batch([
          db.prepare("INSERT INTO member_chat_conversations (id, member_id, workspace, title, source_mode, episode_id, lifecycle_state, create_idempotency_key, created_at, updated_at) VALUES (?, ?, 'wtfmedia', ?, ?, ?, 'active', ?, ?, ?)").bind(newId, memberId, content.slice(0, 120), sourceMode, episodeId, key, now, now),
          db.prepare("INSERT INTO member_chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) VALUES (?, ?, 1, 'user', ?, ?, 'ungrounded', NULL, 0, ?, ?, ?)").bind(`mmsg_${crypto.randomUUID()}`, newId, content, metadata, input.requestId, userKey, now),
        ]);
        conversationId = newId;
        created = true;
      } catch {
        // A competing request may have committed the same owner-scoped key.
        const winner = await db.prepare("SELECT id FROM member_chat_conversations WHERE create_idempotency_key = ? AND member_id = ?").bind(key, memberId).first<{ id: string }>();
        if (!winner) return null;
        conversationId = winner.id;
      }
    }
  }
  view = await getMemberConversationForTurn(db, memberId, conversationId);
  if (!view || view.conversation.lifecycle_state !== "active") return null;
  const keyedMessage = view.messages.find((message) => message.idempotency_key === userKey);
  const lastUser = view.messages.findLast((message) => message.role === "user");
  let userMessage = keyedMessage;
  if (input.resumeMessageId !== undefined) {
    // A stable message target disambiguates a fresh-key replay after completion.
    if (!lastUser || lastUser.id !== input.resumeMessageId || (keyedMessage && keyedMessage.id !== lastUser.id)) return null;
    userMessage = lastUser;
  } else if (!userMessage && view.messages.at(-1)?.role === "user") {
    // The immutable schema cannot retain arbitrary recovery-key aliases. Require
    // a stable target so replay after completion cannot become a new user turn.
    return null;
  }
  // Defaults are anchored to the existing turn on replay, not a later conversation setting.
  const scopeMessage = userMessage ?? lastUser;
  const previousScope = scopeMessage ? JSON.parse(scopeMessage.source_metadata_json) as { sourceMode?: SourceMode; episodeId?: string | null } : null;
  const sourceMode = parseSourceMode(input.sourceMode ?? previousScope?.sourceMode ?? view.conversation.source_mode);
  const episodeId = typeof input.episodeId === "string" ? input.episodeId : previousScope?.episodeId ?? view.conversation.episode_id ?? null;
  const metadata = JSON.stringify({ sourceMode, episodeId });
  if (!userMessage) {
    const messageId = `mmsg_${crypto.randomUUID()}`;
    try {
      await db.batch([
        db.prepare("INSERT INTO member_chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) SELECT ?, c.id, (SELECT COALESCE(MAX(sequence) + 1, 1) FROM member_chat_messages WHERE conversation_id = c.id), 'user', ?, ?, 'ungrounded', NULL, 0, ?, ?, ? FROM member_chat_conversations c WHERE c.id = ? AND c.member_id = ? AND c.lifecycle_state = 'active' AND NOT EXISTS (SELECT 1 FROM member_chat_messages WHERE conversation_id = c.id AND idempotency_key = ?) AND COALESCE((SELECT role FROM member_chat_messages WHERE conversation_id = c.id ORDER BY sequence DESC LIMIT 1), 'assistant') = 'assistant'").bind(messageId, content, metadata, input.requestId, userKey, now, conversationId, memberId, userKey),
        db.prepare("UPDATE member_chat_conversations SET updated_at = MAX(updated_at, ?) WHERE id = ? AND member_id = ? AND lifecycle_state = 'active' AND EXISTS (SELECT 1 FROM member_chat_messages WHERE id = ? AND conversation_id = ?)").bind(now, conversationId, memberId, messageId, conversationId),
      ]);
    } catch { return null; }
    view = await getMemberConversationForTurn(db, memberId, conversationId);
    if (!view || view.conversation.lifecycle_state !== "active") return null;
    userMessage = view.messages.find((message) => message.idempotency_key === userKey);
  }
  if (!userMessage || userMessage.role !== "user" || userMessage.content !== content) return null;
  const storedScope = JSON.parse(userMessage.source_metadata_json) as { sourceMode?: SourceMode; episodeId?: string | null };
  if (parseSourceMode(storedScope?.sourceMode ?? view.conversation.source_mode) !== sourceMode || (storedScope?.episodeId ?? view.conversation.episode_id ?? null) !== episodeId) return null;
  // Completion identity belongs to the durable user turn, never the retry key.
  const assistantKey = `assistant:${userMessage.id}`;
  const completed = view.messages.some((message) => message.role === "assistant" && message.sequence === userMessage.sequence + 1);
  return { view, userMessage, assistantKey, sourceMode, episodeId, created, completed };
}

/** Immutable completion: retry may regenerate, but only one answer can be persisted. */
export async function completeMemberTurn(db: DB, memberId: number, turn: MemberTurn, answer: { content: string; metadata: unknown; grounded: boolean; model: string | null; fallback: boolean; requestId: string }, now = new Date().toISOString()): Promise<MemberConversationView | null> {
  if (!member(memberId) || !text(answer.content)) return null;
  const conversationId = turn.view.conversation.id;
  const messageId = `mmsg_${crypto.randomUUID()}`;
  try {
    await db.batch([
      db.prepare("INSERT INTO member_chat_messages (id, conversation_id, sequence, role, content, source_metadata_json, grounding_state, model, model_fallback, request_id, idempotency_key, created_at) SELECT ?, c.id, (SELECT MAX(sequence) + 1 FROM member_chat_messages WHERE conversation_id = c.id), 'assistant', ?, ?, ?, ?, ?, ?, ?, ? FROM member_chat_conversations c WHERE c.id = ? AND c.member_id = ? AND c.lifecycle_state = 'active' AND (SELECT id FROM member_chat_messages WHERE conversation_id = c.id ORDER BY sequence DESC LIMIT 1) = ? AND NOT EXISTS (SELECT 1 FROM member_chat_messages WHERE conversation_id = c.id AND idempotency_key = ?)").bind(messageId, answer.content, JSON.stringify(answer.metadata), answer.grounded ? "grounded" : "ungrounded", answer.model, answer.fallback ? 1 : 0, answer.requestId, turn.assistantKey, now, conversationId, memberId, turn.userMessage.id, turn.assistantKey),
      db.prepare("UPDATE member_chat_conversations SET updated_at = MAX(updated_at, ?) WHERE id = ? AND member_id = ? AND lifecycle_state = 'active' AND EXISTS (SELECT 1 FROM member_chat_messages WHERE id = ? AND conversation_id = ?)").bind(now, conversationId, memberId, messageId, conversationId),
    ]);
    const view = await getMemberConversation(db, memberId, conversationId);
    return view?.conversation.lifecycle_state === "active" && view.messages.some((message) => message.role === "assistant" && message.idempotency_key === turn.assistantKey) ? view : null;
  } catch { throw new Error("member_chat_persistence_unavailable"); }
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

/**
 * Permanently removes one member-owned conversation and its messages.
 * Explicit saved memories are never cascaded: their source link is detached
 * after a minimal provenance tombstone is recorded. The create-key tombstone
 * prevents an old retry from recreating the deleted conversation.
 */
export async function deleteMemberConversation(db: DB, memberId: number, conversationId: unknown, now = new Date().toISOString()): Promise<MemberConversationDeletionReceipt | null> {
  if (!member(memberId) || !id(conversationId) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(now) || !Number.isFinite(Date.parse(now)) || new Date(now).toISOString() !== now) return null;
  try {
    const alreadyDeleted = await db.prepare("SELECT linked_saved_preference_count FROM member_chat_deletion_tombstones WHERE conversation_id = ? AND member_id = ?").bind(conversationId, memberId).first<{ linked_saved_preference_count: number }>();
    if (alreadyDeleted && Number.isSafeInteger(alreadyDeleted.linked_saved_preference_count) && alreadyDeleted.linked_saved_preference_count >= 0) return { deleted: true, linkedSavedPreferenceCount: alreadyDeleted.linked_saved_preference_count };
    const target = await db.prepare("SELECT id FROM member_chat_conversations WHERE id = ? AND member_id = ?").bind(conversationId, memberId).first<{ id: string }>();
    if (!target) return null;
    const linked = await db.prepare("SELECT COUNT(*) AS count FROM member_saved_memories WHERE member_id = ? AND source_conversation_id = ?").bind(memberId, conversationId).first<{ count: number }>();
    if (!linked || !Number.isSafeInteger(linked.count) || linked.count < 0) return null;
    await db.batch([
      db.prepare("INSERT INTO member_chat_deletion_tombstones (conversation_id, member_id, create_idempotency_key, linked_saved_preference_count, deleted_at) SELECT id, member_id, create_idempotency_key, ?, ? FROM member_chat_conversations WHERE id = ? AND member_id = ?").bind(linked.count, now, conversationId, memberId),
      db.prepare("INSERT INTO member_conversation_deletion_audit_events (id, member_id, conversation_id, event, occurred_at) VALUES (?, ?, ?, 'member_conversation_deleted', ?)").bind(`mda_${crypto.randomUUID()}`, memberId, conversationId, now),
      db.prepare("INSERT INTO member_saved_memory_conversation_tombstones (memory_id, member_id, source_conversation_id, deleted_at) SELECT id, member_id, source_conversation_id, ? FROM member_saved_memories WHERE member_id = ? AND source_conversation_id = ?").bind(now, memberId, conversationId),
      db.prepare("UPDATE member_saved_memories SET source_conversation_id = NULL WHERE member_id = ? AND source_conversation_id = ?").bind(memberId, conversationId),
      db.prepare("DELETE FROM member_chat_messages WHERE conversation_id = ?").bind(conversationId),
      db.prepare("DELETE FROM member_chat_conversations WHERE id = ? AND member_id = ?").bind(conversationId, memberId),
    ]);
    return { deleted: true, linkedSavedPreferenceCount: linked.count };
  } catch {
    // Competing confirmed deletes converge on the immutable owner-scoped receipt.
    const settled = await db.prepare("SELECT linked_saved_preference_count FROM member_chat_deletion_tombstones WHERE conversation_id = ? AND member_id = ?").bind(conversationId, memberId).first<{ linked_saved_preference_count: number }>();
    return settled && Number.isSafeInteger(settled.linked_saved_preference_count) && settled.linked_saved_preference_count >= 0 ? { deleted: true, linkedSavedPreferenceCount: settled.linked_saved_preference_count } : null;
  }
}

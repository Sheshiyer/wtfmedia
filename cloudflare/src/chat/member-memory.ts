import type { DB } from "../db.ts";

const member = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 2_000 ? value.trim() : null;
const id = (value: unknown) => typeof value === "string" && /^mmem_[A-Za-z0-9-]{8,88}$/u.test(value);
const columns = "id, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at";

export async function listMemberMemories(db: DB, memberId: number) {
  if (!member(memberId)) return null;
  const result = await db.prepare(`SELECT ${columns} FROM member_saved_memories WHERE member_id = ? AND lifecycle_state = 'active' ORDER BY updated_at DESC, id DESC LIMIT 50`).bind(memberId).all();
  return result.results;
}

export async function createMemberMemory(db: DB, memberId: number, content: unknown, now = new Date().toISOString()) {
  const value = text(content);
  if (!member(memberId) || !value) return null;
  const id = `mmem_${crypto.randomUUID()}`;
  try {
    await db.prepare("INSERT INTO member_saved_memories (id, member_id, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, ?, NULL, 'active', ?, ?, NULL)").bind(id, memberId, value, now, now).run();
    return await db.prepare(`SELECT ${columns} FROM member_saved_memories WHERE id = ? AND member_id = ?`).bind(id, memberId).first();
  } catch { return null; }
}

/** Archive only: an explicit saved-memory entry cannot be edited or deleted. */
export async function archiveMemberMemory(db: DB, memberId: number, memoryId: unknown, now = new Date().toISOString()) {
  if (!member(memberId) || !id(memoryId)) return null;
  const target = await db.prepare(`SELECT ${columns} FROM member_saved_memories WHERE id = ? AND member_id = ?`).bind(memoryId, memberId).first<{ lifecycle_state: "active" | "archived" }>();
  if (!target) return null;
  if (target.lifecycle_state === "archived") return target;
  try {
    await db.prepare("UPDATE member_saved_memories SET lifecycle_state = 'archived', archived_at = ?, updated_at = ? WHERE id = ? AND member_id = ? AND lifecycle_state = 'active'").bind(now, now, memoryId, memberId).run();
    return await db.prepare(`SELECT ${columns} FROM member_saved_memories WHERE id = ? AND member_id = ?`).bind(memoryId, memberId).first();
  } catch { return null; }
}

import type { DB } from "./db.ts";

/** One D1 transaction removes both history stores before provider deletion.
 * A pending receipt denies access and supports retry if Clerk is unavailable.
 */
export async function eraseUserHistory(db: DB, email: string) {
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO member_users (email, role, lifecycle_state, pilot_cohort, office, created_at, updated_at, deletion_state) VALUES (?, 'member', 'revoked', 'company', 'remote', ?, ?, 'pending') ON CONFLICT(email) DO UPDATE SET lifecycle_state = 'revoked', deletion_state = 'pending', updated_at = excluded.updated_at").bind(email, now, now),
    db.prepare("UPDATE operators SET active = 0, display_name = '', updated_at = ? WHERE email = ? AND role <> 'super_admin'").bind(now, email),
    db.prepare("INSERT OR IGNORE INTO member_chat_deletion_tombstones (conversation_id, member_id, create_idempotency_key, deleted_at) SELECT c.id, c.member_id, c.create_idempotency_key, ? FROM member_chat_conversations c JOIN member_users m ON m.id = c.member_id WHERE m.email = ?").bind(now, email),
    db.prepare("DELETE FROM member_saved_memory_conversation_tombstones WHERE member_id IN (SELECT id FROM member_users WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM analytics_investigations WHERE member_id IN (SELECT id FROM member_users WHERE email = ?) ").bind(email),
    db.prepare("INSERT OR IGNORE INTO research_erasure_jobs (run_id, member_id, created_at) SELECT r.run_id, b.member_id, ? FROM research_runs r JOIN research_briefs b ON b.id = r.brief_id JOIN member_users m ON m.id = b.member_id WHERE m.email = ?").bind(now, email),
    db.prepare("DELETE FROM research_versions WHERE brief_id IN (SELECT b.id FROM research_briefs b JOIN member_users m ON m.id = b.member_id WHERE m.email = ?)").bind(email),
    db.prepare("DELETE FROM research_runs WHERE brief_id IN (SELECT b.id FROM research_briefs b JOIN member_users m ON m.id = b.member_id WHERE m.email = ?)").bind(email),
    db.prepare("DELETE FROM research_briefs WHERE member_id IN (SELECT id FROM member_users WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM member_saved_memories WHERE member_id IN (SELECT id FROM member_users WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM member_chat_messages WHERE conversation_id IN (SELECT c.id FROM member_chat_conversations c JOIN member_users m ON m.id = c.member_id WHERE m.email = ?)").bind(email),
    db.prepare("DELETE FROM member_chat_conversations WHERE member_id IN (SELECT id FROM member_users WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM saved_memories WHERE operator_id IN (SELECT id FROM operators WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM chat_messages WHERE conversation_id IN (SELECT c.id FROM chat_conversations c JOIN operators o ON o.id = c.operator_id WHERE o.email = ?)").bind(email),
    db.prepare("DELETE FROM chat_conversations WHERE operator_id IN (SELECT id FROM operators WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM analytics_oauth_transactions WHERE operator_id IN (SELECT id FROM operators WHERE email = ?)").bind(email),
    db.prepare("DELETE FROM principal_profiles WHERE email = ?").bind(email),
  ]);
}

import type { DB } from "./db.ts";

const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const validId = (id: unknown): id is string => typeof id === "string" && /^ainv_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id);

export async function handleAnalyticsInvestigations(request: Request, db: DB, memberId: number): Promise<Response> {
  const path = new URL(request.url).pathname;
  const id = path.split("/")[5];
  try {
    if (id && !validId(id)) return reply({ error: "not_found" }, 404);
    if (request.method === "GET") {
      if (!id) {
        const rows = await db.prepare("SELECT id, title, updated_at AS updatedAt FROM analytics_investigations WHERE member_id = ? ORDER BY updated_at DESC LIMIT 100").bind(memberId).all();
        return reply({ investigations: rows.results });
      }
      const row = await db.prepare("SELECT id, title, messages_json, updated_at AS updatedAt FROM analytics_investigations WHERE member_id = ? AND id = ?").bind(memberId, id).first<{ id: string; title: string; messages_json: string; updatedAt: string }>();
      return row ? reply({ id: row.id, title: row.title, updatedAt: row.updatedAt, messages: JSON.parse(row.messages_json) }) : reply({ error: "not_found" }, 404);
    }
    if (request.method === "DELETE" && id) {
      await db.prepare("DELETE FROM analytics_investigations WHERE member_id = ? AND id = ?").bind(memberId, id).run();
      return reply({ deleted: true });
    }
    if (request.method !== "POST" || id) return reply({ error: "not_found" }, 404);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 100000) return reply({ error: "chat_too_large" }, 413);
    let input: { id?: unknown; messages?: unknown };
    try { input = JSON.parse(raw); } catch { return reply({ error: "invalid_request" }, 400); }
    if (!input || !validId(input.id) || !Array.isArray(input.messages) || !input.messages.length || input.messages.length > 100 || !input.messages.every(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim() && m.content.length <= 30000) || input.messages[0].role !== "user") return reply({ error: "invalid_request" }, 400);
    // These are private user-saved snapshots, never an input to evidence or inference.
    const messages = input.messages.map(({ role, content }) => ({ role, content }));
    const title = messages[0].content.slice(0, 160);
    const updatedAt = new Date().toISOString();
    await db.prepare("INSERT INTO analytics_investigations (member_id, id, title, messages_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(member_id, id) DO UPDATE SET title = excluded.title, messages_json = excluded.messages_json, updated_at = excluded.updated_at").bind(memberId, input.id, title, JSON.stringify(messages), updatedAt).run();
    return reply({ id: input.id, title, updatedAt });
  } catch { return reply({ error: "saved_chats_unavailable" }, 503); }
}

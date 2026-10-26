/**
 * Local-only preview of the edge production API against the same SQLite schema
 * that Cloudflare D1 uses. This server binds only to 127.0.0.1 and never uses
 * remote Cloudflare resources. It is not an authentication substitute for a
 * deployment; the real edge route still requires Clerk and D1 operator policy.
 */
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleProductionCalendarRequest } from "../cloudflare/src/production-calendar.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const dbPath = resolve(process.env.WTF_PRODUCTION_LOCAL_DB ?? `${root}/.local/production-calendar.sqlite`);
const port = Number(process.env.WTF_PRODUCTION_LOCAL_PORT ?? 8788);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("invalid local port");
mkdirSync(dirname(dbPath), { recursive: true });
const database = new DatabaseSync(dbPath);
database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

const installed = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'production_ips'").get();
if (!installed) {
  // Only the two parent tables required by this additive feature are created
  // here; normal Wrangler migrations remain the Cloudflare schema authority.
  database.exec("CREATE TABLE IF NOT EXISTS operators (id INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS episodes (id TEXT PRIMARY KEY)");
  database.exec("INSERT OR IGNORE INTO operators(id) VALUES (1)");
  database.exec(readFileSync(`${root}/cloudflare/migrations/0025_production_calendar.sql`, "utf8"));
}
if (!database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'production_source_checks'").get()) {
  database.exec(readFileSync(`${root}/cloudflare/migrations/0026_production_source_checks.sql`, "utf8"));
}
if (!database.prepare("PRAGMA table_info(production_ips)").all().some((entry) => entry.name === "target_count")) {
  database.exec(readFileSync(`${root}/cloudflare/migrations/0027_production_ip_targets.sql`, "utf8"));
}
if (!database.prepare("PRAGMA table_info(production_items)").all().some((entry) => entry.name === "shoot_location")) {
  database.exec(readFileSync(`${root}/cloudflare/migrations/0028_production_tracker_details.sql`, "utf8"));
}
for (const column of ["raw_ooxml", "cached_value", "style_id"]) {
  const existing = database.prepare("PRAGMA table_info(production_source_cells)").all().some((entry) => entry.name === column);
  if (!existing) database.exec(`ALTER TABLE production_source_cells ADD COLUMN ${column} TEXT`);
}

class Statement {
  constructor(sql, values = []) { this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.sql, values); }
  async first() { return database.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: database.prepare(this.sql).all(...this.values), success: true }; }
  async run() {
    const result = database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

const env = { DB: {
  prepare: (sql) => new Statement(sql),
  async batch(statements) {
    database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      database.exec("COMMIT");
      return results;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  },
} };
const localContext = { operatorId: 1, role: "super_admin", environment: "local", correlationId: "local-production-preview" };

const server = createServer(async (incoming, outgoing) => {
  if (!incoming.url?.startsWith("/ops/api/production")) {
    outgoing.writeHead(404).end();
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (body.length > 16_000) {
      outgoing.writeHead(413).end();
      return;
    }
    const url = `http://127.0.0.1:${port}${incoming.url}`;
    const request = new Request(url, {
      method: incoming.method,
      headers: { "content-type": incoming.headers["content-type"] ?? "" },
      ...(body.length ? { body } : {}),
    });
    const response = await handleProductionCalendarRequest(request, env, localContext);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("local production API failed", error instanceof Error ? error.message : "unknown");
    outgoing.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" }).end('{"error":"local_production_unavailable"}');
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local production API listening on http://127.0.0.1:${port}/ops/api/production`);
  console.log("Local SQLite/D1 schema only. Remote Cloudflare and GitHub are untouched.");
});

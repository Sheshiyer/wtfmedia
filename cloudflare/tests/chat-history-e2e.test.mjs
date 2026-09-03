import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

import { handleOpsRequest } from "../src/ops-router.ts";
import {
  appendMessage,
  archiveConversation,
  createConversation,
  exportConversationsCsv,
  getConversationForActor,
  listConversationsForActor,
} from "../src/chat/history.ts";
import { resolveOperatorContext } from "../src/auth/operator-context.ts";

const root = new URL("..", import.meta.url).pathname;
const persistTo = mkdtempSync(join(tmpdir(), "wtfmedia-auth-chat-"));
const database = join(persistTo, "ops.sqlite");
const migrations = [
  "0001_ops_foundation.sql",
  "0002_bootstrap_roster.sql",
  "0003_super_admin_transfer_guard.sql",
  "0004_operator_invitation_approvals.sql",
  "0005_provenance_spine.sql",
  "0006_chat_history.sql",
  "0007_release_manifest.sql",
  "0008_release_track.sql",
];

function sqlite(input, json = false) {
  return spawnSync("sqlite3", json ? [database, "-json"] : [database], { input, encoding: "utf8" });
}

function applyMigrations() {
  let result = sqlite("CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY);");
  assert.equal(result.status, 0, result.stderr);
  for (const migration of migrations) {
    result = sqlite(`SELECT COUNT(*) FROM d1_migrations WHERE name = '${migration}';`);
    assert.equal(result.status, 0, result.stderr);
    if (result.stdout.trim() === "0") {
      result = sqlite(readFileSync(join(root, "migrations", migration), "utf8"));
      assert.equal(result.status, 0, result.stderr);
      result = sqlite(`INSERT INTO d1_migrations (name) VALUES ('${migration}');`);
      assert.equal(result.status, 0, result.stderr);
    }
  }
result = sqlite("INSERT INTO release_manifests (environment, state, release_track, version, updated_at, updated_by_operator_id) VALUES ('staging', 'stable', 'beta', 1, '2026-09-02T00:00:00.000Z', 1);");
  assert.equal(result.status, 0, result.stderr);
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function d1() {
  function prepare(query) {
    const statement = {
      _query: query,
      _params: [],
      bind(...params) { statement._params = params; return statement; },
      async run() {
        const bound = query.replace(/\?/g, () => sqlValue(statement._params.shift()));
        const result = sqlite(bound);
        if (result.status !== 0) throw new Error(result.stderr || result.stdout);
        return { success: true };
      },
      async first() {
        const params = [...statement._params];
        const bound = query.replace(/\?/g, () => sqlValue(params.shift()));
        const result = sqlite(bound, true);
        if (result.status !== 0) throw new Error(result.stderr || result.stdout);
        const rows = result.stdout.trim() ? JSON.parse(result.stdout) : [];
        return rows[0] ?? null;
      },
      async all() {
        const params = [...statement._params];
        const bound = query.replace(/\?/g, () => sqlValue(params.shift()));
        const result = sqlite(bound, true);
        if (result.status !== 0) throw new Error(result.stderr || result.stdout);
        return { results: result.stdout.trim() ? JSON.parse(result.stdout) : [] };
      },
    };
    return statement;
  }
  return {
    prepare,
    async batch(statements) {
      const bound = statements.map((statement) => {
        const params = [...statement._params];
        return statement._query.replace(/\?/g, () => sqlValue(params.shift()));
      }).join(";\n");
      const result = sqlite(`PRAGMA foreign_keys = ON; BEGIN; ${bound}; COMMIT;`);
      if (result.status !== 0) throw new Error(result.stderr || result.stdout);
      return statements.map(() => ({ success: true }));
    },
  };
}

const env = {
  OPS_HOSTNAME: "ops.staging.test",
  OPS_ORIGIN: "https://origin.staging.test",
  OPS_ORIGIN_PROOF: "staging-proof",
  OPS_ENVIRONMENT: "staging",
  ACCESS_ISSUER: "https://issuer.test",
  ACCESS_AUDIENCE: "staging-audience",
  ACCESS_JWKS_URL: "https://issuer.test/certs",
};

before(applyMigrations);

test("D1 history is durable, idempotent, owner-scoped, and archive-only", async () => {
  const db = d1();
  const first = await createConversation(db, 3, {
    title: "operator three",
    sourceMode: "both",
    userMessage: { content: "private operator question", sourceMetadata: { sources: [] }, groundingState: "grounded" },
    idempotencyKey: "create-operator-three",
    now: "2026-09-02T00:00:00.000Z",
  });
  assert.ok(first);
  const retry = await createConversation(db, 3, {
    title: "different title must not duplicate",
    sourceMode: "published",
    userMessage: { content: "private operator question", idempotencyKey: "create-operator-three" },
    idempotencyKey: "create-operator-three",
    now: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(retry?.conversation.id, first.conversation.id);
  assert.equal(retry?.messages.length, 1);

  const appended = await appendMessage(db, 3, first.conversation.id, {
    role: "assistant",
    content: "private answer",
    sourceMetadata: { sources: [] },
    groundingState: "grounded",
    idempotencyKey: "answer-operator-three",
  }, "assistant", "2026-09-02T00:01:00.000Z");
  assert.ok(appended);
  assert.equal((await appendMessage(db, 3, first.conversation.id, {
    role: "assistant", content: "private answer", sourceMetadata: { sources: [] }, groundingState: "grounded", idempotencyKey: "answer-operator-three",
  }, "assistant", "2026-09-02T00:01:00.000Z"))?.id, appended.id);

  const second = await createConversation(db, 4, { userMessage: { content: "other operator", sourceMetadata: {} }, now: "2026-09-02T00:02:00.000Z" });
  assert.ok(second);
  assert.equal((await listConversationsForActor(db, { operatorId: 4, role: "editor" })).conversations.length, 1);
  assert.equal(await getConversationForActor(db, { operatorId: 4, role: "editor" }, first.conversation.id), null);
  assert.ok(await getConversationForActor(db, { operatorId: 2, role: "admin" }, first.conversation.id));
  assert.equal(await archiveConversation(db, { operatorId: 4, role: "editor" }, first.conversation.id), null);
  assert.equal((await exportConversationsCsv(db, { operatorId: 4, role: "editor" })), null);
  const archived = await archiveConversation(db, { operatorId: 2, role: "admin" }, first.conversation.id, "2026-09-02T00:03:00.000Z");
  assert.equal(archived?.lifecycle_state, "archived");
  assert.match(await exportConversationsCsv(db, { operatorId: 2, role: "admin" }, 3), /private operator question/);
  assert.equal((await archiveConversation(db, { operatorId: 2, role: "admin" }, first.conversation.id))?.lifecycle_state, "archived");
  const deleteAttempt = sqlite(`DELETE FROM chat_conversations WHERE id = '${first.conversation.id}';`);
  assert.notEqual(deleteAttempt.status, 0);
});

test("Access/D1 context is rechecked on every protected request and cannot cross owners", async () => {
  const db = d1();
  const request = (email, path, init = {}, dependencies = {}) => handleOpsRequest(new Request(`https://ops.staging.test${path}`, {
    ...init,
    headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-e2e-1234", ...(init.headers ?? {}) },
  }), { ...env, DB: db }, { verifyAccess: async () => ({ ok: true, email }), ...dependencies });
  const own = await request("sai@allthingswtf.com", "/ops/api/chat", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "owner-only", idempotencyKey: "owner-question-1" }),
  });
  assert.equal(own.status, 201);
  const ownBody = await own.json();
  const id = ownBody.conversation.id;

  let answerInput;
  let runCalls = 0;
  const generated = await request("sai@allthingswtf.com", "/ops/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "server-answer-1" },
    body: JSON.stringify({
      question: "What did the guest say about evidence?",
      sourceMode: "both",
      assistant: { content: "client spoof must never persist", grounded: true },
      idempotencyKey: "server-answer-1",
    }),
  }, {
    runChat: async (input) => {
      runCalls += 1;
      answerInput = input;
      return {
        answer: "The guest described evidence [1].",
        sources: [{ n: 1, title: "Published episode", videoId: "yt-1", start: 42 }],
        grounded: true,
        sourceMode: "both",
        uncutUnavailable: false,
        model: "test-model",
        modelFallback: true,
        requestId: "rag-request-1",
      };
    },
  });
  assert.equal(generated.status, 201);
  const generatedBody = await generated.json();
  const generatedId = generatedBody.conversation.id;
  assert.equal(answerInput.question, "What did the guest say about evidence?");
  assert.equal(generatedBody.messages.at(-1).content, "The guest described evidence [1].");
  assert.equal(JSON.parse(generatedBody.messages.at(-1).source_metadata_json).sources[0].title, "Published episode");
  assert.equal(generatedBody.messages.at(-1).grounding_state, "grounded");
  assert.equal(generatedBody.messages.at(-1).model, "test-model");
  assert.equal(generatedBody.messages.at(-1).model_fallback, 1);

  const generatedRetry = await request("sai@allthingswtf.com", "/ops/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "server-answer-1" },
    body: JSON.stringify({ question: "a different question must not replace an idempotent turn" }),
  }, { runChat: async () => { runCalls += 1; throw new Error("retry_should_not_run"); } });
  assert.equal(generatedRetry.status, 201);
  assert.equal((await generatedRetry.json()).messages.length, 2);
  assert.equal(runCalls, 1);

  let continuationMode;
  const continued = await request("sai@allthingswtf.com", `/ops/api/chat/conversations/${generatedId}`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "server-answer-2" },
    body: JSON.stringify({ question: "What was in the approved uncut recording?", sourceMode: "uncut" }),
  }, {
    runChat: async (input) => {
      continuationMode = input.sourceMode;
      return {
        answer: "The approved uncut recording adds context [1].",
        sources: [{ n: 1, title: "Uncut episode", videoId: "uncut-1", start: null, sourceMode: "uncut" }],
        grounded: true,
        sourceMode: "uncut",
        uncutUnavailable: false,
        model: "test-model",
        modelFallback: false,
        requestId: "rag-request-2",
      };
    },
  });
  assert.equal(continued.status, 201);
  const continuedBody = await continued.json();
  assert.equal(continuationMode, "uncut");
  assert.equal(JSON.parse(continuedBody.messages.at(-2).source_metadata_json).sourceMode, "uncut");
  assert.equal(JSON.parse(continuedBody.messages.at(-1).source_metadata_json).sourceMode, "uncut");

  const listed = await request("aditi@allthingswtf.com", "/ops/api/chat/conversations");
  const listedBody = await listed.json();
  const generatedSummary = listedBody.conversations.find((item) => item.id === generatedBody.conversation.id);
  assert.equal(generatedSummary.message_count, 4);
  assert.equal(generatedSummary.operator_display_name, "Sai Date");
  assert.equal(generatedSummary.operator_email, "sai@allthingswtf.com");

  const crossOwner = await request("naisthika@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(crossOwner.status, 404);
  const adminRead = await request("aditi@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(adminRead.status, 200);

  const expired = await handleOpsRequest(new Request(`https://ops.staging.test/ops/api/chat/conversations/${id}`, { headers: { "cf-access-jwt-assertion": "expired" } }), { ...env, DB: db }, { verifyAccess: async () => ({ ok: false }) });
  assert.equal(expired.status, 404);
  const editor = await db.prepare("SELECT id FROM operators WHERE email = ?").bind("sai@allthingswtf.com").first();
  const deactivated = sqlite(`UPDATE operators SET active = 0 WHERE id = ${editor.id};`);
  assert.equal(deactivated.status, 0, deactivated.stderr);
  const inactive = await request("sai@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(inactive.status, 404);
  const context = await resolveOperatorContext(db, { ok: true, email: "sai@allthingswtf.com" }, "staging", "corr-e2e-1234");
  assert.equal(context, null);
});

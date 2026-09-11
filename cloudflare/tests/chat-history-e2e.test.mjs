import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

import { handleOpsRequest } from "../src/ops-router.ts";
import { handleMemberRequest } from "../src/member-router.ts";
import {
  activeMemoryContext,
  archiveMemory,
  createMemory,
  listMemoriesForActor,
} from "../src/chat/memory.ts";
import {
  appendMessage,
  archiveConversation,
  createConversation,
  exportConversationsCsv,
  getConversationForActor,
  listConversationsForActor,
} from "../src/chat/history.ts";
import { archiveMemberConversation, createMemberConversation, deleteMemberConversation, getMemberConversation, listMemberConversations } from "../src/chat/member-history.ts";
import { archiveMemberMemory, createMemberMemory, listMemberMemories } from "../src/chat/member-memory.ts";
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
  "0009_saved_memory.sql",
  "0010_member_beta.sql",
  "0011_clerk_invitation_id_prefix.sql",
  "0012_member_chat_deletion.sql",
  "0013_member_chat_context.sql",
  "0014_principal_profiles.sql",
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
  result = sqlite("INSERT INTO member_beta_releases (environment, state, updated_at) VALUES ('staging', 'preview', '2026-09-11T00:00:00.000Z');");
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
  CLERK_ISSUER: "https://clerk.example.test",
  CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json",
  CLERK_AUTHORIZED_PARTIES: "https://ops.staging.test",
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

test("Clerk/D1 context is rechecked on every protected request and cannot cross owners", async () => {
  const db = d1();
  const request = (email, path, init = {}, dependencies = {}) => handleOpsRequest(new Request(`https://ops.staging.test${path}`, {
    ...init,
    headers: { authorization: "Bearer verified", "x-request-id": "corr-e2e-1234", ...(init.headers ?? {}) },
  }), { ...env, DB: db }, { verifyClerk: async () => ({ ok: true, email, userId: "user_test_123" }), ...dependencies });
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

  const queryAudit = await request("aditi@allthingswtf.com", "/api/ops/audit?action=protected_search");
  assert.equal(queryAudit.status, 200);
  const queryAuditBody = await queryAudit.json();
  assert.ok(queryAuditBody.records.some((record) => record.action === "protected_search" && record.entityId === generatedId));

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

  const memoryCreate = await request("aditi@allthingswtf.com", "/ops/api/memory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "prefers evidence-first answers" }),
  });
  assert.equal(memoryCreate.status, 201);
  const memoryBody = await memoryCreate.json();
  assert.equal(memoryBody.memory.content, "prefers evidence-first answers");
  const memoryList = await request("aditi@allthingswtf.com", "/ops/api/memory");
  assert.equal(memoryList.status, 200);
  assert.equal((await memoryList.json()).memories.length, 1);

  const crossOwner = await request("naisthika@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(crossOwner.status, 404);
  const adminRead = await request("aditi@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(adminRead.status, 200);

  const expired = await handleOpsRequest(new Request(`https://ops.staging.test/ops/api/chat/conversations/${id}`, { headers: { authorization: "Bearer expired" } }), { ...env, DB: db }, { verifyClerk: async () => ({ ok: false }) });
  assert.equal(expired.status, 404);
  const editor = await db.prepare("SELECT id FROM operators WHERE email = ?").bind("sai@allthingswtf.com").first();
  const deactivated = sqlite(`UPDATE operators SET active = 0 WHERE id = ${editor.id};`);
  assert.equal(deactivated.status, 0, deactivated.stderr);
  const inactive = await request("sai@allthingswtf.com", `/ops/api/chat/conversations/${id}`);
  assert.equal(inactive.status, 404);
  const context = await resolveOperatorContext(db, { ok: true, email: "sai@allthingswtf.com" }, "staging", "corr-e2e-1234");
  assert.equal(context, null);
});

test("saved memory persists across sessions without crossing operator ownership", async () => {
  const db = d1();
  const source = await createConversation(db, 4, {
    userMessage: { content: "memory provenance source", sourceMetadata: {} },
    now: "2026-09-02T00:05:00.000Z",
  });
  assert.ok(source);
  const actor = { operatorId: 4, role: "editor" };
  const memory = await createMemory(db, actor, {
    content: "keep source trails visible",
    sourceConversationId: source.conversation.id,
    now: "2026-09-02T00:06:00.000Z",
  });
  assert.ok(memory);
  assert.equal((await activeMemoryContext(db, 4))[0], "keep source trails visible");
  assert.equal((await listMemoriesForActor(db, { operatorId: 3, role: "editor" })).length, 0);
  assert.equal(await archiveMemory(db, { operatorId: 3, role: "editor" }, memory.id), null);
  assert.equal((await archiveMemory(db, actor, memory.id, "2026-09-02T00:07:00.000Z"))?.lifecycle_state, "archived");
  assert.equal((await activeMemoryContext(db, 4)).length, 0);
  const deleteAttempt = sqlite(`DELETE FROM saved_memories WHERE id = '${memory.id}';`);
  assert.notEqual(deleteAttempt.status, 0);
});

test("member beta history and explicit memory are durable, private, and archive-only", async () => {
  const db = d1();
  const seed = sqlite("INSERT INTO member_users (id, email, clerk_user_id, role, lifecycle_state, pilot_cohort, office, created_at, updated_at, activated_at) VALUES (91, 'member-one@example.test', 'user_member_one', 'member', 'active', 'bangalore', 'bangalore', '2026-09-09T00:00:00.000Z', '2026-09-09T00:00:00.000Z', '2026-09-09T00:00:00.000Z'), (92, 'member-two@example.test', 'user_member_two', 'member', 'active', 'bangalore', 'bangalore', '2026-09-09T00:00:00.000Z', '2026-09-09T00:00:00.000Z', '2026-09-09T00:00:00.000Z');");
  assert.equal(seed.status, 0, seed.stderr);
  const first = await createMemberConversation(db, 91, "private member one question", "published", "member-request-001", "2026-09-09T00:01:00.000Z");
  assert.ok(first);
  assert.ok(await createMemberConversation(db, 92, "private member two question", "published", "member-request-002", "2026-09-09T00:02:00.000Z"));
  assert.equal((await listMemberConversations(db, 91))?.conversations.length, 1);
  assert.equal(await getMemberConversation(db, 92, first.conversation.id), null);
  assert.equal(await archiveMemberConversation(db, 92, first.conversation.id), null);
  assert.equal((await archiveMemberConversation(db, 91, first.conversation.id, "2026-09-09T00:03:00.000Z"))?.lifecycle_state, "archived");
  assert.equal((await listMemberConversations(db, 91))?.conversations.length, 0);
  const saved = await createMemberMemory(db, 91, "explicit member one preference", "2026-09-09T00:04:00.000Z");
  assert.ok(saved);
  assert.equal((await listMemberMemories(db, 92))?.length, 0);
  assert.equal(await archiveMemberMemory(db, 92, saved.id), null);
  assert.equal((await archiveMemberMemory(db, 91, saved.id, "2026-09-09T00:05:00.000Z"))?.lifecycle_state, "archived");
  assert.notEqual(sqlite(`DELETE FROM member_chat_conversations WHERE id = '${first.conversation.id}';`).status, 0);
  assert.notEqual(sqlite(`DELETE FROM member_saved_memories WHERE id = '${saved.id}';`).status, 0);
});

function seedMember(number) {
  const result = sqlite(`INSERT INTO member_users (id, email, clerk_user_id, role, lifecycle_state, pilot_cohort, office, created_at, updated_at) VALUES (${number}, 'member-${number}@example.test', 'user_member_${number}', 'member', 'active', 'company', 'remote', '2026-09-11T00:00:00.000Z', '2026-09-11T00:00:00.000Z');`);
  assert.equal(result.status, 0, result.stderr);
  return { ok: true, email: `member-${number}@example.test`, userId: `user_member_${number}` };
}

function memberRequest(identity, path, payload, key, runChat, database = d1()) {
  return handleMemberRequest(new Request(`https://ops.staging.test${path}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  }), { ...env, DB: database }, { verifyClerk: async () => identity, runChat });
}

function memberDeleteRequest(identity, conversationId, payload, database = d1()) {
  return handleMemberRequest(new Request(`https://ops.staging.test/beta/api/chat/${conversationId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }), { ...env, DB: database }, { verifyClerk: async () => identity });
}

const memberAnswer = (input) => ({ answer: "A sourced answer [1].", sources: [], grounded: true, sourceMode: input.sourceMode ?? "published", uncutUnavailable: false, model: "test-model", modelFallback: false, requestId: input.requestId });

test("member create and continuation replay retain one ordered turn pair and bounded prior context", async () => {
  const identity = seedMember(101);
  let generations = 0;
  const inputs = [];
  const generate = async (input) => { generations++; inputs.push(input); return memberAnswer(input); };
  const payload = { question: "Tell me about the guest", sourceMode: "published" };
  const created = await memberRequest(identity, "/beta/api/chat", payload, "create-key-101", generate);
  assert.equal(created.status, 201);
  const first = await created.json();
  const replay = await memberRequest(identity, "/beta/api/chat", payload, "create-key-101", generate);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).conversation.id, first.conversation.id);
  assert.equal(generations, 1);
  const path = `/beta/api/chat/${first.conversation.id}`;
  const continuation = { question: "What was the second point?", sourceMode: "uncut" };
  const continued = await memberRequest(identity, path, continuation, "continue-key-101", generate);
  assert.equal(continued.status, 200);
  const view = await continued.json();
  assert.deepEqual(view.messages.map(({ role, sequence }) => [role, sequence]), [["user", 1], ["assistant", 2], ["user", 3], ["assistant", 4]]);
  assert.deepEqual(inputs[1].priorTurns.map(({ role, content }) => [role, content]), [["user", payload.question], ["assistant", "A sourced answer [1]."]]);
  assert.equal((await memberRequest(identity, path, continuation, "continue-key-101", generate)).status, 200);
  assert.equal(generations, 2);
  assert.equal((await memberRequest(identity, path, { ...continuation, question: "different question" }, "continue-key-101", generate)).status, 404);
  assert.equal((await memberRequest(identity, path, { ...continuation, sourceMode: "both" }, "continue-key-101", generate)).status, 404);
  assert.equal(generations, 2);
});

test("member turn authorization and validation fail before generation and owner keys cannot collide", async () => {
  const one = seedMember(102), two = seedMember(103);
  let generations = 0;
  const generate = async (input) => { generations++; return memberAnswer(input); };
  const payload = { question: "valid question", sourceMode: "published" };
  for (const key of [undefined, "short", "invalid key"]) assert.equal((await memberRequest(one, "/beta/api/chat", payload, key, generate)).status, 404);
  for (const invalid of [{ question: " " }, { question: "x".repeat(2001) }, { ...payload, sourceMode: "invalid" }, { ...payload, sourceMode: ["published"] }, { ...payload, episodeId: "invalid/id" }]) {
    assert.equal((await memberRequest(one, "/beta/api/chat", invalid, "validation-key", generate)).status, 404);
  }
  assert.equal(generations, 0);
  const first = await (await memberRequest(one, "/beta/api/chat", payload, "same-owner-key", generate)).json();
  const second = await memberRequest(two, "/beta/api/chat", payload, "same-owner-key", generate);
  assert.equal(second.status, 201);
  assert.notEqual((await second.json()).conversation.id, first.conversation.id);
  const path = `/beta/api/chat/${first.conversation.id}`;
  const denied = await memberRequest(two, path, payload, "cross-owner-key", generate);
  const missing = await memberRequest(one, "/beta/api/chat/mcnv_unknown1234", payload, "unknown-id-key", generate);
  assert.equal(denied.status, 404);
  assert.deepEqual(await denied.json(), await missing.json());
  await archiveMemberConversation(d1(), 102, first.conversation.id);
  const archived = await memberRequest(one, path, payload, "archived-id-key", generate);
  assert.equal(archived.status, 404);
  assert.equal(generations, 2);
});

test("member permanent delete is confirmed, owner-scoped, preserves preferences, and blocks create-key resurrection", async () => {
  const one = seedMember(117), two = seedMember(118);
  const db = d1();
  const payload = { question: "forget this private conversation", sourceMode: "published" };
  let generations = 0;
  const generate = async (input) => { generations++; return memberAnswer(input); };
  const created = await (await memberRequest(one, "/beta/api/chat", payload, "delete-create-key-117", generate, db)).json();
  const conversationId = created.conversation.id;
  await db.prepare("INSERT INTO member_saved_memories (id, member_id, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)").bind("mmem_delete_117", 117, "retain this explicit preference", conversationId, "2026-09-11T00:01:00.000Z", "2026-09-11T00:01:00.000Z").run();
  assert.equal((await getMemberConversation(db, 117, conversationId))?.conversation.linked_saved_preference_count, 1);

  const missingConfirmation = await memberDeleteRequest(one, conversationId, {}, db);
  const crossOwner = await memberDeleteRequest(two, conversationId, { confirmation: "DELETE" }, db);
  const unknown = await memberDeleteRequest(two, "mcnv_unknown1234", { confirmation: "DELETE" }, db);
  assert.equal(missingConfirmation.status, 404);
  assert.equal(crossOwner.status, 404);
  assert.deepEqual(await crossOwner.json(), await unknown.json());

  const deleted = await memberDeleteRequest(one, conversationId, { confirmation: "DELETE" }, db);
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { deleted: true, linkedSavedPreferenceCount: 1 });
  assert.equal(await getMemberConversation(db, 117, conversationId), null);
  assert.equal((await listMemberConversations(db, 117))?.conversations.length, 0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM member_chat_conversations WHERE id = ?").bind(conversationId).first()).count, 0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM member_chat_messages WHERE conversation_id = ?").bind(conversationId).first()).count, 0);
  const memory = await db.prepare("SELECT content, source_conversation_id FROM member_saved_memories WHERE id = ? AND member_id = ?").bind("mmem_delete_117", 117).first();
  assert.deepEqual(memory, { content: "retain this explicit preference", source_conversation_id: null });
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM member_saved_memory_conversation_tombstones WHERE memory_id = ? AND member_id = ? AND source_conversation_id = ?").bind("mmem_delete_117", 117, conversationId).first()).count, 1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM member_chat_deletion_tombstones WHERE conversation_id = ? AND member_id = ?").bind(conversationId, 117).first()).count, 1);
  const auditReceipt = await db.prepare("SELECT member_id, conversation_id, event, occurred_at FROM member_conversation_deletion_audit_events WHERE conversation_id = ? AND member_id = ?").bind(conversationId, 117).first();
  assert.deepEqual(auditReceipt, { member_id: 117, conversation_id: conversationId, event: "member_conversation_deleted", occurred_at: auditReceipt.occurred_at });
  assert.match(auditReceipt.occurred_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const replay = await memberRequest(one, "/beta/api/chat", payload, "delete-create-key-117", async () => { assert.fail("deleted create key must not invoke generation"); }, db);
  assert.equal(replay.status, 404);
  assert.equal(generations, 1);
  const fresh = await memberRequest(one, "/beta/api/chat", payload, "fresh-create-key-117", generate, db);
  assert.equal(fresh.status, 201);
  assert.notEqual((await fresh.json()).conversation.id, conversationId);
  assert.equal((await memberDeleteRequest(one, conversationId, { confirmation: "DELETE" }, db)).status, 200);
  assert.equal(await deleteMemberConversation(db, 118, conversationId), null);
});

test("member route accepts pagination cursors and rejects impossible cursor timestamps", async () => {
  const identity = seedMember(108);
  const db = d1();
  for (let index = 0; index < 26; index++) await createMemberConversation(db, 108, `route history ${index}`, "published", `route-page-${index}`, "2026-09-11T00:00:00.000Z");
  const first = await (await memberRequest(identity, "/beta/api/chat")).json();
  const second = await (await memberRequest(identity, `/beta/api/chat?cursor=${first.nextCursor}`)).json();
  assert.equal(second.conversations.length, 1);
  assert.equal(second.nextCursor, null);
  const invalid = btoa(JSON.stringify({ updatedAt: "2026-02-31T00:00:00.000Z", id: first.conversations[0].id })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  assert.equal((await memberRequest(identity, `/beta/api/chat?cursor=${invalid}`)).status, 404);
});

test("member message history reverse-keyset paginates while generation retains only bounded prior turns", async () => {
  const identity = seedMember(119), other = seedMember(120);
  const db = d1();
  const inputs = [];
  const generate = async (input) => { inputs.push(input); return memberAnswer(input); };
  const created = await (await memberRequest(identity, "/beta/api/chat", { question: "message 1", sourceMode: "published" }, "message-page-create-119", generate, db)).json();
  const path = `/beta/api/chat/${created.conversation.id}`;
  for (let index = 2; index <= 26; index++) {
    const response = await memberRequest(identity, path, { question: `message ${index}`, sourceMode: "published" }, `message-page-${index}-119`, generate, db);
    assert.equal(response.status, 200);
  }

  const latest = await (await memberRequest(identity, path, undefined, undefined, undefined, db)).json();
  assert.equal(latest.messages.length, 50);
  assert.deepEqual(latest.messages.map(({ sequence }) => sequence), Array.from({ length: 50 }, (_, index) => index + 3));
  assert.equal(typeof latest.previousMessageCursor, "string");

  const previous = await (await memberRequest(identity, `${path}?before=${latest.previousMessageCursor}`, undefined, undefined, undefined, db)).json();
  assert.deepEqual(previous.messages.map(({ sequence }) => sequence), [1, 2]);
  assert.equal(previous.previousMessageCursor, null);
  assert.equal((await memberRequest(other, `${path}?before=${latest.previousMessageCursor}`, undefined, undefined, undefined, db)).status, 404);
  assert.equal((await memberRequest(identity, `${path}?before=not-a-message-cursor`, undefined, undefined, undefined, db)).status, 404);
  assert.equal(inputs.at(-1).priorTurns.length, 8);
  assert.deepEqual(inputs.at(-1).priorTurns.map(({ content }) => content), ["message 22", "A sourced answer [1].", "message 23", "A sourced answer [1].", "message 24", "A sourced answer [1].", "message 25", "A sourced answer [1]."]);
});

test("failed member generation retries the pending turn and concurrent requests cannot interleave", async () => {
  const identity = seedMember(104);
  const payload = { question: "retry this question", sourceMode: "published" };
  const failed = await memberRequest(identity, "/beta/api/chat", payload, "retry-create-key", async () => { throw new Error("model offline"); });
  assert.equal(failed.status, 503);
  const pending = await failed.json();
  assert.equal(pending.retryable, true);
  assert.equal(pending.messages.length, 1);
  assert.equal((await memberRequest(identity, "/beta/api/chat", payload, "retry-create-key", async (input) => memberAnswer(input))).status, 200);
  const path = `/beta/api/chat/${pending.conversation.id}`;
  let release;
  let started;
  const entered = new Promise((resolve) => { started = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  const slow = async (input) => { started(); await gate; return memberAnswer(input); };
  const turn = { question: "follow up", sourceMode: "published" };
  const first = memberRequest(identity, path, turn, "concurrent-turn", slow);
  await entered;
  const competing = await memberRequest(identity, path, { question: "different turn" }, "competing-turn", async () => { assert.fail("a second pending turn must not invoke generation"); });
  assert.equal(competing.status, 404);
  const duplicate = memberRequest(identity, path, turn, "concurrent-turn", slow);
  release();
  const results = await Promise.all([first, duplicate]);
  assert.deepEqual(results.map((response) => response.status), [200, 200]);
  const view = await getMemberConversation(d1(), 104, pending.conversation.id);
  assert.deepEqual(view.messages.map((message) => message.sequence), [1, 2, 3, 4]);
});

test("archiving during generation prevents a late member assistant write", async () => {
  const identity = seedMember(105);
  const created = await (await memberRequest(identity, "/beta/api/chat", { question: "first question" }, "archive-create-key", async (input) => memberAnswer(input))).json();
  const result = await memberRequest(identity, `/beta/api/chat/${created.conversation.id}`, { question: "late response" }, "archive-late-key", async (input) => {
    await archiveMemberConversation(d1(), 105, created.conversation.id);
    return memberAnswer(input);
  });
  assert.equal(result.status, 404);
  assert.equal((await getMemberConversation(d1(), 105, created.conversation.id)).messages.length, 3);
});

test("a failed assistant persistence write remains retryable without duplicating the user turn", async () => {
  const identity = seedMember(109);
  const db = d1();
  const batch = db.batch;
  let failCompletion = true;
  db.batch = async (statements) => {
    if (failCompletion && statements.some((statement) => statement._query.includes("SELECT ?, c.id") && statement._query.includes("'assistant'"))) {
      failCompletion = false;
      throw new Error("transient database write failure");
    }
    return batch(statements);
  };
  const payload = { question: "persist this answer" };
  const failed = await memberRequest(identity, "/beta/api/chat", payload, "retry-persistence", async (input) => memberAnswer(input), db);
  assert.equal(failed.status, 503);
  const pending = await failed.json();
  assert.equal(pending.messages.length, 1);
  const replay = await memberRequest(identity, `/beta/api/chat/${pending.conversation.id}`, payload, "retry-persistence", async (input) => memberAnswer(input), db);
  assert.equal(replay.status, 200);
  assert.deepEqual((await replay.json()).messages.map((message) => message.role), ["user", "assistant"]);
});

test("reloaded member history exposes and resumes the exact pending turn using a fresh key", async () => {
  const identity = seedMember(110);
  const payload = { question: "recover my uncut question", sourceMode: "uncut", episodeId: "episode_110" };
  const failed = await memberRequest(identity, "/beta/api/chat", payload, "original-reload-key", async () => { throw new Error("offline"); });
  const pending = await failed.json();
  const path = `/beta/api/chat/${pending.conversation.id}`;
  const loaded = await (await memberRequest(identity, path)).json();
  assert.equal(loaded.retryable, true);
  assert.doesNotMatch(JSON.stringify(loaded), /original-reload-key/);
  const refuseGeneration = async () => { assert.fail("a changed recovery payload must be denied"); };
  for (const changed of [{ question: "changed question" }, { question: payload.question, sourceMode: "both" }, { question: payload.question, episodeId: "different_episode" }]) {
    assert.equal((await memberRequest(identity, path, changed, "new-mismatched-key", refuseGeneration)).status, 404);
  }
  const inputs = [];
  const recovered = await memberRequest(identity, path, { question: payload.question, resumeMessageId: loaded.messages.at(-1).id }, "fresh-reload-key", async (input) => { inputs.push(input); return memberAnswer(input); });
  assert.equal(recovered.status, 200);
  assert.equal(inputs[0].sourceMode, "uncut");
  assert.equal(inputs[0].episodeId, "episode_110");
  assert.deepEqual((await recovered.json()).messages.map(({ role }) => role), ["user", "assistant"]);
  assert.notEqual((await (await memberRequest(identity, path)).json()).retryable, true);
  const originalReplay = await memberRequest(identity, path, payload, "original-reload-key", refuseGeneration);
  assert.equal(originalReplay.status, 200);
});

test("old and fresh recovery keys converge on one stored assistant and replay the resumed message", async () => {
  const identity = seedMember(111);
  const payload = { question: "recover concurrently", sourceMode: "both" };
  const failed = await memberRequest(identity, "/beta/api/chat", payload, "old-concurrent-key", async () => { throw new Error("offline"); });
  const pending = await failed.json();
  const path = `/beta/api/chat/${pending.conversation.id}`;
  const resumeMessageId = pending.messages[0].id;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let resolveStarted;
  const bothStarted = new Promise((resolve) => { resolveStarted = resolve; });
  let starts = 0;
  const slow = async (input) => { if (++starts === 2) resolveStarted(); await gate; return memberAnswer(input); };
  const old = memberRequest(identity, path, payload, "old-concurrent-key", slow);
  const fresh = memberRequest(identity, path, { ...payload, resumeMessageId }, "new-concurrent-key", slow);
  const signal = await Promise.race([bothStarted.then(() => "started"), fresh.then((response) => `early:${response.status}`)]);
  release();
  assert.equal(signal, "started");
  assert.deepEqual((await Promise.all([old, fresh])).map(({ status }) => status), [200, 200]);
  const replay = await memberRequest(identity, path, { question: payload.question, resumeMessageId }, "new-concurrent-key", async () => { assert.fail("completed recovery must not generate again"); });
  assert.equal(replay.status, 200);
  const view = await replay.json();
  assert.deepEqual(view.messages.map(({ sequence, role }) => [sequence, role]), [[1, "user"], [2, "assistant"]]);
});

test("continuation inherits the most recent turn scope when source mode is omitted", async () => {
  const identity = seedMember(112);
  const first = await (await memberRequest(identity, "/beta/api/chat", { question: "first", sourceMode: "published" }, "inherit-create-key", async (input) => memberAnswer(input))).json();
  const path = `/beta/api/chat/${first.conversation.id}`;
  await memberRequest(identity, path, { question: "use uncut", sourceMode: "uncut", episodeId: "episode_112" }, "inherit-switch-key", async (input) => memberAnswer(input));
  let inherited;
  const next = await memberRequest(identity, path, { question: "next question" }, "inherit-next-key", async (input) => { inherited = input; return memberAnswer(input); });
  assert.equal(next.status, 200);
  assert.equal(inherited.sourceMode, "uncut");
  assert.equal(inherited.episodeId, "episode_112");
});

test("recovery message IDs preserve owner, active, latest-user and payload boundaries", async () => {
  const identity = seedMember(113), other = seedMember(114);
  const legacy = await createMemberConversation(d1(), 113, "legacy pending question", "uncut", "legacy-pending-request");
  const path = `/beta/api/chat/${legacy.conversation.id}`;
  const resumeMessageId = legacy.messages[0].id;
  const fail = async () => { assert.fail("invalid recovery target must not invoke generation"); };
  const payload = { question: "legacy pending question", resumeMessageId };
  const denied = await memberRequest(other, path, payload, "other-recovery-key", fail);
  const unknown = await memberRequest(identity, "/beta/api/chat/mcnv_unknown1234", payload, "unknown-recovery-key", fail);
  assert.equal(denied.status, 404);
  assert.deepEqual(await denied.json(), await unknown.json());
  for (const invalid of ["", "mmsg_unknown1234", "mmsg_" + "x".repeat(89), null]) {
    assert.equal((await memberRequest(identity, path, { ...payload, resumeMessageId: invalid }, "invalid-recovery-key", fail)).status, 404);
  }
  const recovered = await memberRequest(identity, path, payload, "legacy-recovery-key", async (input) => memberAnswer(input));
  assert.equal(recovered.status, 200);
  const completed = await recovered.json();
  assert.equal((await memberRequest(identity, path, { ...payload, resumeMessageId: completed.messages[1].id }, "assistant-recovery-key", fail)).status, 404);
  assert.equal((await memberRequest(identity, path, { ...payload, question: "changed" }, "changed-recovery-key", fail)).status, 404);
  await memberRequest(identity, path, { question: "another question" }, "later-question-key", async (input) => memberAnswer(input));
  assert.equal((await memberRequest(identity, path, payload, "stale-recovery-key", fail)).status, 404);
  await archiveMemberConversation(d1(), 113, legacy.conversation.id);
  assert.notEqual((await (await memberRequest(identity, path)).json()).retryable, true);
  assert.equal((await memberRequest(identity, path, payload, "archived-recovery-key", fail)).status, 404);
});

test("fresh recovery keys require a stable message target and replay it without another turn", async () => {
  const identity = seedMember(115);
  const payload = { question: "recover without duplicating", sourceMode: "uncut" };
  const pending = await (await memberRequest(identity, "/beta/api/chat", payload, "initial-recovery-115", async () => { throw new Error("offline"); })).json();
  const path = `/beta/api/chat/${pending.conversation.id}`;
  let generations = 0;
  const generate = async (input) => { generations++; return memberAnswer(input); };
  const implicit = await memberRequest(identity, path, payload, "fresh-recovery-115", generate);
  assert.equal(implicit.status, 404, "an unrecordable fresh alias must not be admitted without its stable target");
  assert.equal(generations, 0);
  assert.equal((await getMemberConversation(d1(), 115, pending.conversation.id)).messages.length, 1);
  const explicit = { ...payload, resumeMessageId: pending.messages[0].id };
  assert.equal((await memberRequest(identity, path, explicit, "fresh-recovery-115", generate)).status, 200);
  const replay = await memberRequest(identity, path, explicit, "fresh-recovery-115", generate);
  assert.equal(replay.status, 200);
  assert.equal(generations, 1);
  assert.deepEqual((await replay.json()).messages.map(({ role }) => role), ["user", "assistant"]);
  assert.equal((await memberRequest(identity, path, payload, "initial-recovery-115", generate)).status, 200);
  assert.equal(generations, 1);
});

test("pending retry scope is projected independently of the conversation's original mode", async () => {
  const identity = seedMember(116);
  const created = await (await memberRequest(identity, "/beta/api/chat", { question: "published first", sourceMode: "published" }, "scope-create-116", async (input) => memberAnswer(input))).json();
  const path = `/beta/api/chat/${created.conversation.id}`;
  const payload = { question: "uncut follow-up", sourceMode: "uncut", episodeId: "episode_116" };
  const failed = await memberRequest(identity, path, payload, "scope-pending-116", async () => { throw new Error("offline"); });
  assert.equal(failed.status, 503);
  const pending = await (await memberRequest(identity, path)).json();
  assert.equal(pending.conversation.source_mode, "published");
  assert.equal(pending.retrySourceMode, "uncut");
  assert.equal(pending.resumeMessageId, pending.messages.at(-1).id);
  assert.equal((await failed.json()).retrySourceMode, "uncut");
  const recovered = await memberRequest(identity, path, { question: payload.question, sourceMode: pending.retrySourceMode, resumeMessageId: pending.resumeMessageId }, "scope-reloaded-116", async (input) => {
    assert.equal(input.sourceMode, "uncut");
    assert.equal(input.episodeId, "episode_116");
    return memberAnswer(input);
  });
  assert.equal(recovered.status, 200);
  const completed = await recovered.json();
  assert.equal(completed.retrySourceMode, undefined);
  assert.equal(completed.resumeMessageId, undefined);
  assert.equal(completed.conversation.source_mode, "published");
});

test("member history keyset pagination preserves ties, owner scope and archived exclusions", async () => {
  seedMember(106);
  seedMember(107);
  const db = d1();
  assert.deepEqual(await listMemberConversations(db, 106), { conversations: [], nextCursor: null });
  for (let index = 0; index < 51; index++) await createMemberConversation(db, 106, `history ${index}`, "published", `page-request-${index}`, "2026-09-11T00:00:00.000Z");
  await createMemberConversation(db, 107, "other member", "published", "other-page-request", "2026-09-11T00:00:00.000Z");
  const first = await listMemberConversations(db, 106);
  assert.equal(first.conversations.length, 25);
  assert.ok(first.nextCursor);
  const second = await listMemberConversations(db, 106, first.nextCursor);
  assert.equal(second.conversations.length, 25);
  const third = await listMemberConversations(db, 106, second.nextCursor);
  assert.equal(third.conversations.length, 1);
  assert.equal(third.nextCursor, null);
  const all = [...first.conversations, ...second.conversations, ...third.conversations];
  assert.equal(new Set(all.map(({ id }) => id)).size, 51);
  assert.ok(all.every(({ member_id }) => member_id === 106));
  assert.equal(await listMemberConversations(db, 106, "invalid cursor"), null);
  assert.ok((await listMemberConversations(db, 107, first.nextCursor)).conversations.every(({ member_id }) => member_id === 107));
  await archiveMemberConversation(db, 106, first.conversations[0].id);
  const refreshed = await listMemberConversations(db, 106);
  assert.ok(!refreshed.conversations.some(({ id }) => id === first.conversations[0].id));
  const terminal = await listMemberConversations(db, 106, refreshed.nextCursor);
  assert.equal(terminal.conversations.length, 25);
  assert.equal(terminal.nextCursor, null);
});

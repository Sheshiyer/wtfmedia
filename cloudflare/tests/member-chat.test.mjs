import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveMemberConversation, getMemberConversation, listMemberConversations } from "../src/chat/member-history.ts";
import { archiveMemberMemory } from "../src/chat/member-memory.ts";

test("member history queries bind ownership at the SQL boundary", async () => {
  const calls = [];
  const db = { prepare(sql) { return { bind(...args) { calls.push({ sql, args }); return this; }, async first() { return null; }, async all() { return { results: [] }; } }; } };
  assert.deepEqual(await listMemberConversations(db, 19), { conversations: [], nextCursor: null });
  assert.equal(await getMemberConversation(db, 19, "mcnv_12345678"), null);
  assert.ok(calls.every((call) => call.sql.includes("member_id = ?") || call.sql.includes("member_chat_messages")));
  assert.ok(calls.some((call) => call.args.includes(19)));
});

test("member archives always bind the current member at the SQL boundary", async () => {
  const calls = [];
  const db = { prepare(sql) { return { bind(...args) { calls.push({ sql, args }); return this; }, async first() { return null; }, async run() { return {}; } }; } };
  assert.equal(await archiveMemberConversation(db, 19, "mcnv_12345678"), null);
  assert.equal(await archiveMemberMemory(db, 19, "mmem_12345678"), null);
  assert.ok(calls.every((call) => call.sql.includes("member_id = ?")));
  assert.ok(calls.every((call) => call.args.includes(19)));
});

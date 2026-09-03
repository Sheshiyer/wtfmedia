import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { chatHistoryEnabled } from "../src/chat/history.ts";
import { decide, policyForPath } from "../src/auth/policy.ts";

const root = new URL("..", import.meta.url).pathname;

test("chat history migration is additive, operator-owned, and archive-only", () => {
  const sql = readFileSync(join(root, "migrations", "0006_chat_history.sql"), "utf8");
  assert.match(sql, /REFERENCES operators\(id\) ON DELETE RESTRICT/);
  assert.match(sql, /lifecycle_state TEXT NOT NULL DEFAULT 'active'/);
  assert.match(sql, /chat_conversations_no_delete/);
  assert.match(sql, /chat_messages_no_delete/);
  assert.match(sql, /chat_messages_require_next_sequence/);
});

test("chat release and deep-link policy fail closed unless explicitly enabled", () => {
  assert.equal(chatHistoryEnabled(undefined), false);
  assert.equal(chatHistoryEnabled("stable"), true);
  assert.deepEqual(policyForPath("/chat/cnv_12345678-alice"), ["chat", "read"]);
  assert.equal(decide("editor", "chat", "read"), true);
  assert.equal(decide("editor", "chat", "export"), false);
  assert.equal(decide("admin", "chat", "export"), true);
});

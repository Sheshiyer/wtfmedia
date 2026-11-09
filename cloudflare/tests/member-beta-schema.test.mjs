import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const migrationPath = new URL("../migrations/0010_member_beta.sql", import.meta.url);

test("member beta schema keeps company membership distinct from operator authority", () => {
  assert.equal(existsSync(migrationPath), true, "member beta migration is required");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /CREATE TABLE member_users/);
  assert.match(migration, /role TEXT NOT NULL CHECK \(role = 'member'\)/);
  assert.match(migration, /lifecycle_state TEXT NOT NULL CHECK \(lifecycle_state IN \('invited', 'active', 'suspended', 'revoked'\)\)/);
  assert.match(migration, /pilot_cohort TEXT NOT NULL CHECK \(pilot_cohort IN \('bangalore', 'company'\)\)/);
  assert.match(migration, /CREATE TABLE member_invitations/);
  assert.match(migration, /CREATE TABLE member_audit_events/);
  assert.match(migration, /CREATE TABLE member_chat_conversations/);
  assert.match(migration, /CREATE TABLE member_chat_messages/);
  assert.match(migration, /CREATE TABLE member_saved_memories/);
  assert.match(migration, /CREATE TABLE member_beta_releases/);
});

test("member beta schema makes chats and memory owner-scoped and archive-only", () => {
  assert.equal(existsSync(migrationPath), true, "member beta migration is required");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /CREATE TRIGGER member_chat_conversations_no_reassign/);
  assert.match(migration, /CREATE TRIGGER member_chat_messages_no_delete/);
  assert.match(migration, /CREATE TRIGGER member_saved_memories_no_reassign/);
  assert.match(migration, /CREATE TRIGGER member_saved_memories_no_delete/);
});

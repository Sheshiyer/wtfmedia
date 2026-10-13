import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { listUsers, manageUser } from '../src/user-admin.ts';
import { resolvePrincipalContext } from '../src/auth/principal-context.ts';
import { getOperatorByEmail } from '../src/db.ts';
import { erasePendingResearchJobs } from '../src/research-erasure.ts';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const root = new URL('../migrations/', import.meta.url);
  for (const file of JSON.parse(readFileSync(new URL('manifest.json', root))).wrangler_order) sqlite.exec(readFileSync(new URL(file, root), 'utf8'));
  const wrap = (sql, args = []) => ({ bind: (...values) => wrap(sql, values), first: async () => sqlite.prepare(sql).get(...args) ?? null, all: async () => ({ results: sqlite.prepare(sql).all(...args) }), run: async () => sqlite.prepare(sql).run(...args) });
  return { sqlite, prepare: wrap, batch: async statements => { sqlite.exec('BEGIN'); try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec('COMMIT'); return results; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
}
const actor = { kind: 'operator', operatorId: 1, email: 'owner@example.test', role: 'super_admin', environment: 'staging', correlationId: 'corr-user-admin-test' };
const invitations = { create: async () => ({ id: 'inv_fixture_user_admin', status: 'pending' }), revoke: async () => ({ id: 'inv_fixture_user_admin', status: 'revoked' }) };
const identity = { ok: true, email: 'new@example.test', userId: 'user_new_fixture' };

test('members are listed once and safely promote, demote, suspend and reactivate', async () => {
 const db = database();
 assert.equal((await resolvePrincipalContext(db, identity, 'staging', 'corr-test-enroll')).role, 'member');
 const change = input => manageUser(db, actor, { email: identity.email, ...input }, invitations, 'https://example.test');
 assert.equal((await listUsers(db)).find(u => u.email === identity.email).role, 'member');
 assert.equal((await change({ action: 'role', role: 'admin' })).ok, true);
 assert.equal((await listUsers(db)).filter(u => u.email === identity.email).length, 1);
 assert.equal((await resolvePrincipalContext(db, identity, 'staging', 'corr-test-admin')).role, 'admin');
 assert.equal((await change({ action: 'role', role: 'member' })).ok, true);
 assert.equal(await getOperatorByEmail(db, identity.email), null);
 assert.equal((await resolvePrincipalContext(db, identity, 'staging', 'corr-test-member')).role, 'member');
 assert.equal((await change({ action: 'suspend' })).ok, true);
 assert.equal(await resolvePrincipalContext(db, identity, 'staging', 'corr-test-deny'), null);
 assert.equal((await change({ action: 'role', role: 'admin' })).ok, false);
 assert.equal((await change({ action: 'reactivate' })).ok, true);
 assert.equal((await change({ action: 'role', role: 'admin' })).ok, true);
 assert.equal((await change({ action: 'suspend' })).ok, true);
 assert.equal(await resolvePrincipalContext(db, identity, 'staging', 'corr-test-deny-admin'), null);
 db.sqlite.close();
});

test('invitations use Clerk and protect self, super admin, and denied actors', async () => {
 const db = database(); let called = 0;
 const provider = { ...invitations, create: async input => { called++; assert.equal(input.redirectUrl, 'https://example.test/sign-up'); return invitations.create(); } };
 assert.equal((await manageUser(db, actor, { action: 'invite', email: 'invite@example.test' }, provider, 'https://example.test')).ok, true);
 assert.equal(called, 1);
 assert.equal((await listUsers(db)).find(u => u.email === 'invite@example.test').status, 'invited');
 assert.equal((await manageUser(db, actor, { action: 'suspend', email: actor.email }, provider, 'https://example.test')).error, 'cannot_change_your_own_access');
 assert.equal((await manageUser(db, actor, { action: 'role', email: 'sheshnarayan.iyer@gmail.com', role: 'member' }, provider, 'https://example.test')).error, 'super_admin_is_protected');
 assert.equal((await manageUser(db, { ...actor, role: 'editor' }, { action: 'invite', email: 'denied@example.test' }, provider, 'https://example.test')).error, 'forbidden');
 assert.equal(called, 1); db.sqlite.close();
});

test('revoking an operator retains a blocking record and cannot reactivate implicitly', async () => {
 const db = database();
 const email = 'aditi@allthingswtf.com';
 assert.equal((await manageUser(db, actor, { action: 'revoke', email }, invitations, 'https://example.test')).ok, true);
 assert.equal((await listUsers(db)).find(u => u.email === email).status, 'revoked');
 assert.equal(await resolvePrincipalContext(db, { ...identity, email }, 'staging', 'corr-revoked-admin'), null);
 assert.equal((await manageUser(db, actor, { action: 'reactivate', email }, invitations, 'https://example.test')).ok, false);
 db.sqlite.close();
});

test('confirmed deletion erases both complete history stores, survives provider failure and isolates other users', async () => {
 const db = database();
 await resolvePrincipalContext(db, identity, 'staging', 'corr-enroll-delete');
 await manageUser(db, actor, { action: 'role', email: identity.email, role: 'admin' }, invitations, 'https://example.test');
 const mid = db.sqlite.prepare('SELECT id FROM member_users WHERE email = ?').get(identity.email).id;
 const oid = db.sqlite.prepare('SELECT id FROM operators WHERE email = ?').get(identity.email).id;
 for (const [prefix, owner, cprefix, mprefix, memoryprefix] of [['member_', mid, 'mcnv_', 'mmsg_', 'mmem_'], ['', oid, 'cnv_', 'msg_', 'mem_']]) {
  const ownerColumn = prefix ? 'member_id' : 'operator_id';
  for (const state of ['active', 'archived']) {
   const cid = cprefix + 'delete_fixture_' + state;
   db.sqlite.prepare(`INSERT INTO ${prefix}chat_conversations (id, ${ownerColumn}, title, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, 'Private title', ?, 'now', 'now', ?)`).run(cid, owner, state, state === 'archived' ? 'now' : null);
   db.sqlite.prepare(`INSERT INTO ${prefix}chat_messages (id, conversation_id, sequence, role, content, created_at) VALUES (?, ?, 1, 'user', 'Private history', 'now')`).run(mprefix + 'delete_fixture_' + state, cid);
   db.sqlite.prepare(`INSERT INTO ${prefix}saved_memories (id, ${ownerColumn}, content, source_conversation_id, lifecycle_state, created_at, updated_at, archived_at) VALUES (?, ?, 'Private preference', ?, ?, 'now', 'now', ?)`).run(memoryprefix + 'delete_fixture_' + state, owner, cid, state, state === 'archived' ? 'now' : null);
  }
 }
 db.sqlite.exec("INSERT INTO chat_conversations (id, operator_id, title, created_at, updated_at) VALUES ('cnv_other_history', 1, 'Keep other user', 'now', 'now')");
 const researchId = 'rbrief_' + crypto.randomUUID();
 const runId = 'rrun_' + crypto.randomUUID();
 db.sqlite.prepare('INSERT INTO research_briefs (id, member_id, revision, document_json, updated_at) VALUES (?, ?, 1, ?, ?)').run(researchId, mid, '{"notes":"Private notes"}', 'now');
 db.sqlite.prepare('INSERT INTO research_versions (brief_id, revision, document_json, created_at) VALUES (?, 1, ?, ?)').run(researchId, '{"notes":"Old private notes"}', 'now');
 db.sqlite.prepare('INSERT INTO research_runs (run_id, brief_id, payload_json) VALUES (?, ?, ?)').run(runId, researchId, '{"notes":"Runner notes"}');
 const input = { action: 'delete', email: identity.email, confirmEmail: identity.email };
 let calls = 0;
 const provider = async () => { calls++; return false; };
 assert.equal((await manageUser(db, actor, { ...input, confirmEmail: 'wrong' }, invitations, 'https://example.test', provider)).error, 'confirm_email_required');
 assert.equal(calls, 0);
 assert.equal((await manageUser(db, actor, input, invitations, 'https://example.test', provider)).error, 'deletion_pending');
 for (const table of ['member_chat_messages', 'member_chat_conversations', 'member_saved_memories', 'chat_messages', 'saved_memories']) assert.equal(db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM chat_conversations').get().n, 1);
 assert.equal((await listUsers(db)).find(u => u.email === identity.email).status, 'deletion_pending');
 for (const table of ['research_briefs', 'research_versions', 'research_runs']) assert.equal(db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_erasure_jobs').get().n, 1);
 const runnerEnv = { DB: db, OPS_ENVIRONMENT: 'local', RESEARCH_RUNNER_URL: 'http://localhost:8091', RESEARCH_RUNNER_TOKEN: 'fixture-token' };
 assert.equal(await erasePendingResearchJobs(runnerEnv, identity.email, async()=>new Response('',{status:503})), false);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_erasure_jobs').get().n, 1);
 assert.equal(await erasePendingResearchJobs(runnerEnv, identity.email, async(url,init)=>{assert.equal(init.method,'DELETE');assert.equal(new URL(url).pathname, '/jobs/'+runId);return Response.json({deleted:true});}), true);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_erasure_jobs').get().n, 0);
 assert.equal(await resolvePrincipalContext(db, identity, 'staging', 'corr-deleted-block'), null);
 assert.throws(() => db.sqlite.prepare('UPDATE operators SET active = 1 WHERE id = ?').run(oid), /deleted user/);
 assert.throws(() => db.sqlite.prepare("INSERT INTO member_chat_conversations (id, member_id, created_at, updated_at) VALUES ('mcnv_replay_attempt', ?, 'now', 'now')").run(mid), /deleted user/);
 assert.equal((await manageUser(db, actor, input, invitations, 'https://example.test', async () => true)).ok, true);
 assert.equal((await listUsers(db)).some(u => u.email === identity.email), false);
 assert.equal((await manageUser(db, actor, input, invitations, 'https://example.test', async () => { throw new Error('must not retry completed deletion'); })).ok, true);
 assert.equal(db.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
 db.sqlite.close();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleSocialAnalyticsInvestigations } from '../src/social-analytics-investigations.ts';
import { eraseUserHistory } from '../src/user-deletion.ts';

const id = 'sinv_12345678-1234-4123-8123-123456789abc';
const otherId = 'sinv_12345678-1234-4123-8123-123456789abd';
const messages = [{ role: 'user', content: 'Compare social performance' }, { role: 'assistant', content: 'No current evidence available.' }];
const snapshot = (overrides = {}) => ({ id, schemaVersion: 1, messages, ...overrides });
const entity = { kind: 'platform', platform: 'instagram', id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/example/' };
const answer = {
  status: 'partial', scope: { platform: 'instagram', fromDate: '2026-10-01', toDate: '2026-10-17' },
  summary: 'Saved observation; not fresh evidence.', columns: ['Instagram'],
  rows: [{ label: 'Views', values: [0], unit: 'count', difference: null, percentChange: null }],
  evidence: [{ entity, metric: 'views', value: 0, unit: 'count', basis: 'received_period', fromDate: '2026-10-01', toDate: '2026-10-17', fetchedAt: '2026-10-18T00:00:00.000Z', dataAsOf: null, reason: 'Incomplete coverage', sourceUrl: 'https://www.instagram.com/example/' }],
  entities: [entity], limitations: ['Incomplete coverage'], retryable: true, candidates: [entity],
};
const request = (method = 'GET', suffix = '', body) => new Request(`https://example.test/beta/api/social-analytics/investigations${suffix}`, {
  method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function database(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec('PRAGMA foreign_keys = ON');
  const root = new URL('../migrations/', import.meta.url);
  for (const file of JSON.parse(readFileSync(new URL('manifest.json', root))).wrangler_order) sqlite.exec(readFileSync(new URL(file, root), 'utf8'));
  for (const member of [901, 902]) sqlite.prepare("INSERT INTO member_users (id,email,role,lifecycle_state,pilot_cohort,office,created_at,updated_at) VALUES (?,?,'member','active','company','remote','2026-10-18','2026-10-18')").run(member, `social-${member}@example.test`);
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => sqlite.prepare(sql).run(...args),
  });
  const db = { sqlite, prepare: wrap, batch: async statements => {
    sqlite.exec('BEGIN');
    try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  return { db, call: (method, suffix = '', body, owner = 901) => handleSocialAnalyticsInvestigations(request(method, suffix, body), db, owner) };
}

test('private snapshots round-trip schema version, update and list only public metadata', async t => {
  const { call } = database(t);
  const saved = await call('POST', '', snapshot());
  assert.equal(saved.status, 200);
  const metadata = await saved.json();
  assert.deepEqual(Object.keys(metadata).sort(), ['id', 'title', 'updatedAt']);
  assert.equal(metadata.title, 'Compare social performance');
  assert.ok(Number.isFinite(Date.parse(metadata.updatedAt)));
  const read = await call('GET', `/${id}`);
  assert.equal(read.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await read.json(), { ...metadata, schemaVersion: 1, messages });
  const updatedMessages = [{ role: 'user', content: 'Updated question' }];
  assert.equal((await call('POST', '', snapshot({ messages: updatedMessages }))).status, 200);
  assert.deepEqual((await (await call('GET', `/${id}`)).json()).messages, updatedMessages);
  const listed = await (await call('GET')).json();
  assert.equal(listed.investigations.length, 1);
  assert.deepEqual(Object.keys(listed.investigations[0]).sort(), ['id', 'title', 'updatedAt']);
  assert.equal(listed.investigations[0].title, 'Updated question');
});

test('listing is newest first and bounded to 100 live snapshots', async t => {
  const { db, call } = database(t);
  const insert = db.sqlite.prepare('INSERT INTO social_analytics_investigations (member_id,id,title,messages_json,updated_at) VALUES (901,?,?,?,?)');
  for (let index = 0; index < 101; index++) insert.run(`sinv_12345678-1234-4123-8123-${String(index).padStart(12, '0')}`, 'Saved', JSON.stringify(messages), new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString());
  const listed = (await (await call('GET')).json()).investigations;
  assert.equal(listed.length, 100);
  assert.equal(listed[0].id, 'sinv_12345678-1234-4123-8123-000000000100');
  assert.equal(listed[99].id, 'sinv_12345678-1234-4123-8123-000000000001');
});

test('same IDs belong independently to each owner, including a foreign delete before save', async t => {
  const { call } = database(t);
  await call('POST', '', snapshot());
  assert.deepEqual(await (await call('GET', '', undefined, 902)).json(), { investigations: [] });
  assert.equal((await call('GET', `/${id}`, undefined, 902)).status, 404);
  assert.equal((await call('DELETE', `/${id}`, undefined, 902)).status, 200);
  assert.equal((await call('GET', `/${id}`)).status, 200);
  for (const owner of [901, 902]) assert.equal((await call('POST', '', snapshot({ id: otherId }), owner)).status, 200);
  await call('DELETE', `/${otherId}`);
  assert.equal((await call('GET', `/${otherId}`)).status, 404);
  assert.equal((await call('GET', `/${otherId}`, undefined, 902)).status, 200);
});

test('delete erases payload and atomically blocks stale saves in either operation order', async t => {
  const { db, call } = database(t);
  for (const saveFirst of [true, false]) {
    const currentId = saveFirst ? id : otherId;
    if (saveFirst) await call('POST', '', snapshot({ id: currentId }));
    assert.equal((await call('DELETE', `/${currentId}`)).status, 200);
    assert.equal((await call('DELETE', `/${currentId}`)).status, 200);
    assert.equal((await call('POST', '', snapshot({ id: currentId }))).status, 409);
    assert.equal((await call('GET', `/${currentId}`)).status, 404);
    const row = db.sqlite.prepare('SELECT title, messages_json, deleted_at FROM social_analytics_investigations WHERE member_id = 901 AND id = ?').get(currentId);
    assert.equal(row.title, '');
    assert.equal(row.messages_json, '[]');
    assert.ok(row.deleted_at);
  }
  assert.deepEqual(await (await call('GET')).json(), { investigations: [] });
});

test('account erasure removes active snapshots and tombstones, preserves other owners and blocks late saves', async t => {
  const { db, call } = database(t);
  db.sqlite.prepare('INSERT INTO social_analytics_workspace (id, profile_id, updated_at) VALUES (1, ?, ?)').run('workspace-fixture', '2026-10-18');
  for (const owner of [901, 902]) await call('POST', '', snapshot(), owner);
  await call('DELETE', `/${otherId}`);
  await eraseUserHistory(db, 'social-901@example.test');
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM social_analytics_investigations WHERE member_id = 901').get().n, 0);
  assert.equal(db.sqlite.prepare('SELECT profile_id FROM social_analytics_workspace WHERE id = 1').get().profile_id, 'workspace-fixture');
  assert.equal((await call('GET', `/${id}`, undefined, 902)).status, 200);
  assert.notEqual((await call('POST', '', snapshot())).status, 200);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM social_analytics_investigations WHERE member_id = 901').get().n, 0);
  assert.deepEqual(db.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('malformed shapes, schema versions, messages and route suffixes fail closed', async t => {
  const { call, db } = database(t);
  for (const body of [null, [], {}, snapshot({ schemaVersion: 2 }), snapshot({ schemaVersion: undefined }), snapshot({ id: 'wrong' }),
    snapshot({ messages: [] }), snapshot({ messages: Array(101).fill(messages[0]) }),
    ...[null, [], 'text', { role: 'system', content: 'bad' }, { role: 'user', content: '' }, { role: 'user', content: '  ' }, { role: 'user', content: 3 }, { role: 'user', content: 'x'.repeat(30001) }, { role: 'assistant', content: 'first' }, { role: 'user', content: 'ok', answer: {} }].map(message => snapshot({ messages: [message] })),
  ]) assert.equal((await call('POST', '', body)).status, 400, JSON.stringify(body).slice(0, 150));
  const malformed = new Request('https://example.test/beta/api/social-analytics/investigations', { method: 'POST', body: '{' });
  assert.equal((await handleSocialAnalyticsInvestigations(malformed, db, 901)).status, 400);
  for (const [method, suffix] of [['GET', '/wrong'], ['GET', `/${id}/extra`], ['POST', `/${id}`], ['DELETE', ''], ['PUT', '']]) assert.equal((await call(method, suffix)).status, 404);
});

test('request byte limit covers UTF-8 and accepts the 100-message boundary', async t => {
  const { call } = database(t);
  assert.equal((await call('POST', '', snapshot({ messages: Array(100).fill(messages[0]) }))).status, 200);
  const oversized = snapshot({ messages: Array(4).fill({ role: 'user', content: 'é'.repeat(15000) }) });
  assert.ok(JSON.stringify(oversized).length < 100000);
  assert.equal((await call('POST', '', oversized)).status, 413);
});

test('structured answers preserve their resolved scope, zeros, nulls and original evidence timestamps', async t => {
  const { call } = database(t);
  const savedMessages = [messages[0], { role: 'assistant', content: answer.summary, answer }];
  assert.equal((await call('POST', '', snapshot({ messages: savedMessages }))).status, 200);
  assert.deepEqual((await (await call('GET', `/${id}`)).json()).messages, savedMessages);
});

test('nested answer shapes and unsafe JSON values are rejected before persistence', async t => {
  const { call, db } = database(t);
  const badAnswers = [null, [], {}, { ...answer, status: 'complete' }, { ...answer, retryable: 'yes' },
    { ...answer, scope: { ...answer.scope, platform: 'youtube' } }, { ...answer, scope: { ...answer.scope, fromDate: '2026-02-30' } },
    { ...answer, columns: [42] }, { ...answer, rows: [{ label: 'Views', values: ['0'], unit: 'count' }] },
    { ...answer, evidence: [{ ...answer.evidence[0], value: '0' }] },
    { ...answer, evidence: [{ ...answer.evidence[0], fetchedAt: 'bad' }] },
    { ...answer, evidence: [{ ...answer.evidence[0], metric: 'secret' }] },
    { ...answer, entities: [{ ...entity, url: 'javascript:alert(1)' }] },
    { ...answer, candidates: [{}] }, { ...answer, limitations: [null] },
    { ...answer, ownerId: 902 }, { ...answer, evidence: [{ ...answer.evidence[0], credentials: 'not allowed' }] },
  ];
  for (const invalid of badAnswers) assert.equal((await call('POST', '', snapshot({ messages: [messages[0], { role: 'assistant', content: 'Saved answer', answer: invalid }] }))).status, 400);
  const unsafe = JSON.stringify(snapshot({ messages: [messages[0], { role: 'assistant', content: 'Saved answer', answer }] })).replace('"value":0', '"value":1e309');
  assert.equal((await handleSocialAnalyticsInvestigations(new Request('https://example.test/beta/api/social-analytics/investigations', { method: 'POST', body: unsafe }), db, 901)).status, 400);
  assert.deepEqual(await (await call('GET')).json(), { investigations: [] });
});

test('corrupt stored snapshots fail closed instead of returning malformed display data', async t => {
  const { db, call } = database(t);
  await call('POST', '', snapshot());
  for (const corrupt of ['{', '{}', '[{"role":"system","content":"bad"}]']) {
    db.sqlite.prepare('UPDATE social_analytics_investigations SET messages_json = ? WHERE member_id = 901 AND id = ?').run(corrupt, id);
    const response = await call('GET', `/${id}`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'saved_chats_unavailable' });
  }
});

test('storage errors return a private failure without exposing the error or reporting saved', async () => {
  const db = { prepare() { throw new Error('sensitive storage detail'); } };
  for (const [method, suffix, body] of [['GET', ''], ['GET', `/${id}`], ['POST', '', snapshot()], ['DELETE', `/${id}`]]) {
    const response = await handleSocialAnalyticsInvestigations(request(method, suffix, body), db, 901);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error: 'saved_chats_unavailable' });
  }
});

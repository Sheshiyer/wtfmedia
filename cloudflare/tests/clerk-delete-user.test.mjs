import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClerkUserDeleter } from '../src/clerk/delete-user.ts';
test('provider deletion checks the exact email, handles absence and does not hide errors', async () => {
 const calls = [];
 const remove = createClerkUserDeleter('fixture-only-key', async (input, options) => {
  const url = new URL(input); calls.push(options.method || 'GET');
  if (options.method === 'DELETE') { assert.equal(url.pathname, '/v1/users/user_fixture'); return Response.json({ deleted: true }); }
  assert.equal(url.searchParams.get('email_address'), 'person@example.test');
  return Response.json([{ id: 'user_fixture', email_addresses: [{ email_address: 'person@example.test' }] }]);
 });
 assert.equal(await remove('person@example.test'), true); assert.deepEqual(calls, ['GET', 'DELETE']);
 assert.equal(await createClerkUserDeleter('fixture-only-key', async () => Response.json([]))('person@example.test'), true);
 assert.equal(await createClerkUserDeleter('fixture-only-key', async () => Response.json([{ id: 'user_wrong', email_addresses: [] }]))('person@example.test'), false);
 assert.equal(await createClerkUserDeleter('fixture-only-key', async () => new Response('', { status: 500 }))('person@example.test'), false);
 assert.equal(createClerkUserDeleter(''), undefined);
});

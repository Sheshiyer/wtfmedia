import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claudeChat, CLAUDE_MODEL } from '../src/chat/claude.ts';

const env = { ANTHROPIC_API_KEY: 'test-only-key' };
const messages = [{ role: 'system', content: 'policy' }, { role: 'user', content: 'question' }];
const ok = (content = [{ type: 'text', text: 'answer' }], stop_reason = 'end_turn') => Response.json({ model: CLAUDE_MODEL, content, stop_reason });
async function stub(fn, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  try { await run(); } finally { globalThis.fetch = original; }
}
test('Claude translates system/history and reads only typed text blocks', async () => {
  await stub(async (url, init) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(init.headers['x-api-key'], env.ANTHROPIC_API_KEY);
    assert.equal(init.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'claude-sonnet-5-5');
    assert.equal(body.system, 'policy');
    assert.deepEqual(body.messages, messages.slice(1));
    assert.deepEqual(body.thinking, { type: 'between_tools' });
    assert.equal(body.output_config.effort, 'low');
    for (const key of ['temperature', 'top_p', 'top_k', 'tools', 'tool_choice']) assert.equal(body[key], undefined);
    return ok([{ type: 'thinking', thinking: 'private', text: 'not text' }, { type: 'text', text: 'first' }, { type: 'text', text: ' second' }]);
  }, async () => assert.deepEqual(await claudeChat(env, messages), { answer: 'first second', model: CLAUDE_MODEL }));
});
test('schema output uses output_config.format and rejects invalid JSON', async () => {
  const outputSchema = { type: 'object', properties: { kind: { type: 'string' } }, required: ['kind'], additionalProperties: false };
  await stub(async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body).output_config.format, { type: 'json_schema', schema: outputSchema });
    return ok([{ type: 'text', text: '{"kind":"metrics"}' }]);
  }, async () => assert.equal((await claudeChat(env, messages, { outputSchema })).answer, '{"kind":"metrics"}'));
  await stub(async () => ok(), async () => assert.rejects(claudeChat(env, messages, { outputSchema }), /claude_invalid_json/));
});
for (const reason of ['refusal', 'max_tokens', 'model_context_window_exceeded', 'tool_use', 'pause_turn']) {
  test(`Claude rejects ${reason} without retry or leaking response`, async () => {
    let calls = 0;
    await stub(async () => { calls++; return ok([{ type: 'text', text: 'sensitive-content' }], reason); }, async () => {
      await assert.rejects(claudeChat(env, messages), error => error.message === `claude_${reason}`);
      assert.equal(calls, 1);
    });
  });
}
test('empty or malformed content fails closed', async () => {
  for (const content of [[], [{ type: 'text', text: ' ' }], [{ type: 'thinking', text: 'secret' }]]) {
    await stub(async () => ok(content), async () => assert.rejects(claudeChat(env, messages), /claude_empty_response/));
  }
});
for (const status of [400, 401, 403, 429, 500, 503, 529]) {
  test(`Claude bounds retries for HTTP ${status} and redacts upstream bodies`, async () => {
    let calls = 0;
    await stub(async () => { calls++; return new Response('private provider body test-only-key', { status, headers: { 'retry-after': '0' } }); }, async () => {
      await assert.rejects(claudeChat(env, messages), error => error.message === `claude_http_${status}` && error.status === status);
      assert.equal(calls, status === 429 || status >= 500 ? 2 : 1);
    });
  });
}
test('retry recovers on the same model', async () => {
  let calls = 0;
  await stub(async () => ++calls === 1 ? new Response('', { status: 429, headers: { 'retry-after': '0' } }) : ok(), async () => {
    assert.equal((await claudeChat(env, messages)).model, CLAUDE_MODEL);
    assert.equal(calls, 2);
  });
});
test('timeout and caller cancellation abort transport and do not retry', async () => {
  for (const cancel of [false, true]) {
    const controller = new AbortController();
    let calls = 0;
    await stub(async (_url, init) => {
      calls++;
      return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }));
    }, async () => {
      const pending = claudeChat(env, messages, { signal: controller.signal, timeoutMs: 15 });
      if (cancel) controller.abort(new Error('private abort detail'));
      await assert.rejects(pending, new RegExp(cancel ? 'claude_aborted' : 'claude_timeout'));
      assert.equal(calls, 1);
    });
  }
});
test('retry delay cannot outlive the shared deadline', async () => {
  let calls = 0;
  await stub(async () => { calls++; return new Response('', { status: 429, headers: { 'retry-after': '60' } }); }, async () => {
    await assert.rejects(claudeChat(env, messages, { timeoutMs: 15 }), /claude_timeout/);
    assert.equal(calls, 1);
  });
});
test('configuration and invalid input fail before transport', async () => {
  await stub(async () => { throw Error('must not fetch'); }, async () => {
    await assert.rejects(claudeChat({}, messages), /claude_not_configured/);
    await assert.rejects(claudeChat(env, [{ role: 'tool', content: 'x' }]), /claude_invalid_messages/);
    await assert.rejects(claudeChat(env, messages, { maxTokens: 0 }), /claude_invalid_budget/);
    await assert.rejects(claudeChat(env, messages, { signal: AbortSignal.abort('private') }), /claude_aborted/);
  });
});

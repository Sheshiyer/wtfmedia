import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('the container receives the direct Anthropic key, with no legacy model credentials', () => {
  const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}});
  const exports = {};
  class Container { constructor(_ctx, env) { this.env = env; } }
  vm.runInNewContext(outputText, {exports, require(name) {
    if (name === '@cloudflare/containers') return {Container};
    if (name === 'cloudflare:workers') return {DurableObject: class {}};
    if (name === './store.js') return {};
    throw new Error('Unexpected module');
  }});
  const env = {ANTHROPIC_API_KEY: 'fixture-anthropic', OPENROUTER_API_KEY: 'fixture-legacy',
    TREG_TOKEN: 'fixture-treg', RESEARCH_RUNNER_TOKEN: 'fixture-runner', RESEARCH_STATE_TOKEN: 'fixture-state',
    RESEARCH_STATE_URL: 'https://example.com/state'};
  const container = new exports.ResearchContainer({}, env);
  assert.equal(container.envVars.ANTHROPIC_API_KEY, 'fixture-anthropic');
  assert.equal(container.envVars.TREG_TOKEN, 'fixture-treg');
  assert.equal(container.envVars.RESEARCH_STATE_URL, 'https://example.com/state');
  assert.equal('OPENROUTER_API_KEY' in container.envVars, false);
  assert.equal('OMNIROUTE_API_KEY' in container.envVars, false);
});

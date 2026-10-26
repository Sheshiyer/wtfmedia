// Reproduce the bounded Oct 24 Alpha rollout without promoting the staging tree.
// Inputs are Wrangler dry-run bundles from the pre-fix and reviewed source,
// plus the downloaded live baseline. No credentials or corpus data are inputs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [baselinePath, beforePath, afterPath, outputPath] = process.argv.slice(2);
assert(outputPath, 'usage: node scripts/build-alpha-topic-patch.mjs BASELINE BEFORE AFTER OUTPUT');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const baseline = readFileSync(baselinePath, 'utf8');
assert.equal(hash(baseline), 'd2f90e02129b0698f3530d998f159966cdf6230419b0b34bee0d1bb5176265c9', 'unexpected live Alpha baseline');
const before = readFileSync(beforePath, 'utf8');
const after = readFileSync(afterPath, 'utf8');
function section(bundle, name) {
  const marker = `// src/chat/${name}.ts\n`;
  assert.equal(bundle.split(marker).length, 2, `expected one ${name} module`);
  const start = bundle.indexOf(marker);
  const end = bundle.indexOf('\n// ', start + marker.length);
  assert(end > start, `missing end of ${name}`);
  return bundle.slice(start, end);
}
// The staging bundle has one extra text identifier before the chat modules.
// This is the only permitted difference from the deployed pre-fix modules.
const normalize = (text) => text.replace(/\btext6\b/g, 'text5');
let output = baseline;
for (const name of ['answer', 'public-chat']) {
  const live = section(baseline, name);
  assert.equal(normalize(section(before, name)), live, `${name} differs from live baseline`);
  output = output.replace(live, normalize(section(after, name)));
}
for (const symbol of ['standaloneTopic', 'prioritizeTopicPassages', 'CONTEXT_REFERENCE', 'GENERIC_TOPIC', 'alphaTopicWords']) {
  assert(!new RegExp(`\\b${symbol}\\b`).test(baseline), `new identifier collision: ${symbol}`);
}
const topic = normalize(section(after, 'query-topic')).replace(/\bwords2\b/g, 'alphaTopicWords');
output = output.replace('// src/chat/public-chat.ts\n', `${topic}\n\n// src/chat/public-chat.ts\n`);
// The downloaded source map is unavailable; never retain a stale map pointer.
output = output.replace(/^\/\/# sourceMappingURL=.*\n?/gm, '');
writeFileSync(outputPath, output);
console.log(JSON.stringify({ baselineSha256: hash(baseline), artifactSha256: hash(output), changedModules: ['answer', 'query-topic', 'public-chat'] }));

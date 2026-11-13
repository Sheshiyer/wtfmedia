// Promote PR #91 reach imports without replacing unrelated released Edge code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [livePath, outputPath] = process.argv.slice(2);
assert(livePath && outputPath, 'Expected current production Edge and output directory');
const hash = value => createHash('sha256').update(value).digest('hex');
const baseline = readFileSync(livePath, 'utf8');
assert.equal(hash(baseline), 'cf03ebe929953de2faab5dcf8f29f7fa47757f91c0f87dd9418c2ebc9f99d48a', 'Production baseline changed');
assert(!baseline.includes('WTFYouTubeReach'));
const require = createRequire(resolve('cloudflare/package.json'));
const bundle = await require('esbuild').build({
  stdin: { contents: `export { syncSelectedAnalytics, syncConfiguredYouTubeReach } from './cloudflare/src/analytics-sync.ts';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'WTFYouTubeReach', platform: 'browser', target: 'es2022', write: false, legalComments: 'none', metafile: true,
});
const replacements = [
  ['WTFYouTubeMulti.syncSelectedAnalytics(env, provider, startDate, endDate, dependencies, channelId)', 'WTFYouTubeReach.syncSelectedAnalytics(env, provider, startDate, endDate, dependencies, channelId)'],
  ['context.waitUntil(WTFYouTubeMulti.syncConfiguredAnalytics(env, new Date(event.scheduledTime)));', 'context.waitUntil(WTFYouTubeReach.syncConfiguredYouTubeReach(env, new Date(event.scheduledTime)));'],
];
let patched = baseline;
for (const [from, to] of replacements) {
  assert.equal(patched.split(from).length, 2, 'Non-unique reach dispatch');
  patched = patched.replace(from, () => to);
}
let reversed = patched;
for (const [from, to] of replacements.toReversed()) reversed = reversed.replace(to, () => from);
assert.equal(reversed, baseline, 'Unrelated production runtime changed');
const artifact = bundle.outputFiles[0].text + '\n' + patched;
mkdirSync(outputPath, { recursive: true });
writeFileSync(resolve(outputPath, 'edge.js'), artifact);
writeFileSync(resolve(outputPath, 'receipt.json'), JSON.stringify({
  source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  baselineSha256: hash(baseline), artifactSha256: hash(artifact),
  previousEdgeVersion: '0319a9e7-84af-4a6e-8122-1afaa2a86e42',
  replacements, overlayInputs: Object.keys(bundle.metafile.inputs),
}, null, 2) + '\n');
console.log('Prepared reach-only overlay; unrelated released runtime is byte-identical.');

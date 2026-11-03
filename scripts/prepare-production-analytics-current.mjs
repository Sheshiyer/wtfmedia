// Update only the two analytics handlers on the recorded production artifact.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const [baselinePath, outputPath] = process.argv.slice(2);
assert(baselinePath && outputPath, 'Expected live Edge artifact and new output directory');
const baseline = readFileSync(baselinePath, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(baseline), '4dffbe6eda077bc69f29cd74a1689b468e83995079436e23606dad486ba1a963');
execFileSync(process.execPath, ['scripts/prepare-production-youtube-multi.mjs', baselinePath, outputPath, '--frontend-only'], { stdio: 'inherit' });
const require = createRequire(resolve('cloudflare/package.json'));
const bundle = await require('esbuild').build({
  stdin: { contents: `export { handleAnalyticsAssistant } from './cloudflare/src/analytics-assistant.ts';
export { handleSocialAnalytics } from './cloudflare/src/social-analytics.ts';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'WTFAnalyticsCurrent', platform: 'browser', target: 'es2022', write: false, legalComments: 'none', metafile: true,
});
assert(!baseline.includes('WTFAnalyticsCurrent'));
const replacements = [
 ['return WTFYouTubeMulti.handleAnalyticsAssistant(request, env, dependencies);', 'return WTFAnalyticsCurrent.handleAnalyticsAssistant(request, env, dependencies);'],
 ['WTFProductionAnalytics.handleSocialAnalytics(request, env, context, socialMemberId, dependencies)', 'WTFAnalyticsCurrent.handleSocialAnalytics(request, env, context, socialMemberId, dependencies)'],
];
let patched = baseline;
for (const [from,to] of replacements) { assert.equal(patched.split(from).length, 2, from); patched = patched.replace(from,to); }
let reversed = patched;
for (const [from,to] of [...replacements].reverse()) reversed = reversed.replace(to,from);
assert.equal(reversed, baseline);
const artifact = bundle.outputFiles[0].text + '\n' + patched;
mkdirSync(resolve(outputPath,'analytics-release'), {recursive:true});
writeFileSync(resolve(outputPath,'analytics-release/edge.js'),artifact);
writeFileSync(resolve(outputPath,'analytics-release/receipt.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineSha256:hash(baseline),artifactSha256:hash(artifact),replacements,overlayInputs:Object.keys(bundle.metafile.inputs)},null,2));
console.log('Prepared analytics-only production update; unrelated Edge bytes preserved.');

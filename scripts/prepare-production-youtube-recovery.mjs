// Preserve the current production app; replace only the YouTube reach overlay,
// status dispatch, queue acceptance response, and scheduled recovery entrypoint.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [livePath,output]=process.argv.slice(2);
assert(livePath&&output,'Expected current production Edge and output directory');
const hash=value=>createHash('sha256').update(value).digest('hex');
const baseline=readFileSync(livePath,'utf8');
assert.equal(hash(baseline),'122f475748d0195c67782ec2fba0bc2096b6882039cede2b7ca2f63b3a89672a','Production baseline changed');
const marker='var __defProp2 = Object.defineProperty;';
assert.equal(baseline.split(marker).length,2);
const prefix=baseline.slice(0,baseline.indexOf('var WTFYouTubeReach = (() => {'));
const released=baseline.slice(baseline.indexOf(marker));
const require=createRequire(resolve('cloudflare/package.json'));
const bundle=await require('esbuild').build({stdin:{contents:`export {handleAnalyticsRequest} from './cloudflare/src/analytics.ts';\nexport {syncSelectedAnalytics,runYouTubeMaintenance} from './cloudflare/src/analytics-sync.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',globalName:'WTFYouTubeReach',platform:'browser',target:'es2022',write:false,legalComments:'none',metafile:true});
const replacements=[
 ['return WTFYouTubeMulti.handleAnalyticsRequest(request, env, context, dependencies);','return WTFYouTubeReach.handleAnalyticsRequest(request, env, context, dependencies);'],
 ['context.waitUntil(WTFYouTubeReach.syncConfiguredYouTubeReach(env, new Date(event.scheduledTime)));','context.waitUntil(WTFYouTubeReach.runYouTubeMaintenance(env, new Date(event.scheduledTime), event.cron));'],
 ['const result = await WTFYouTubeReach.syncSelectedAnalytics(env, provider, startDate, endDate, dependencies, channelId);\n    return Response.json({ sync: result }, { status: result.status === "completed" ? 200 : 409, headers: headers3 });','const result = await WTFYouTubeReach.syncSelectedAnalytics(env, provider, startDate, endDate, dependencies, channelId);\n    return Response.json({ sync: result }, { status: result.status === "completed" ? 200 : result.status === "queued" || result.status === "running" ? 202 : 409, headers: headers3 });'],
];
let patched=released;
for(const [from,to]of replacements){assert.equal(patched.split(from).length,2,'Non-unique recovery dispatch');patched=patched.replace(from,()=>to);}
let reversed=patched;for(const[from,to]of replacements.toReversed())reversed=reversed.replace(to,()=>from);
assert.equal(reversed,released,'Unrelated production runtime changed');
const artifact=prefix+bundle.outputFiles[0].text+'\n'+patched;
mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'edge.js'),artifact);
writeFileSync(resolve(output,'receipt.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineSha256:hash(baseline),artifactSha256:hash(artifact),replacements,overlayInputs:Object.keys(bundle.metafile.inputs)},null,2));
console.log('Recovery overlay prepared; unrelated production runtime preserved.');

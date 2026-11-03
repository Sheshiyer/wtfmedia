// Bounded YouTube multi-account promotion. Preserve the recorded live Edge
// byte-for-byte outside explicit analytics dispatch replacements.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
const [baselinePath, outputPath, mode] = process.argv.slice(2);
assert(!mode || mode === '--frontend-only');
assert(baselinePath && outputPath, 'usage: node scripts/prepare-production-youtube-multi.mjs LIVE_EDGE_JS OUTPUT_DIRECTORY');
const root = process.cwd(), output = resolve(outputPath);
assert(!existsSync(output), 'Output must be new');
const hash = value => createHash('sha256').update(value).digest('hex');
const baseline = readFileSync(baselinePath, 'utf8');
assert.equal(hash(baseline), mode === '--frontend-only' ? '4dffbe6eda077bc69f29cd74a1689b468e83995079436e23606dad486ba1a963' : '60b21716310d7a3ed8a6d3737f96ffa2229c2c63bf1f88cc8cbb9334bb4ece3e', 'Production Edge baseline changed');
const productionAncestor = 'ded0b4c8285996092bf4d3b410e8a52a5b268a89';
mkdirSync(output, { recursive: true });
execFileSync('tar', ['-x', '-C', output], { input: execFileSync('git', ['archive', productionAncestor], { maxBuffer: 150 * 1024 * 1024 }) });
const copied = [
  'web/app/beta/social-analytics', 'web/components/domain/social',
  'web/lib/social-analytics/contracts.ts', 'web/lib/social-analytics/chat-view.ts',
  'web/public/analytics-demo', 'cloudflare/src/social-analytics-contracts.ts',
];
for (const path of copied) {
  mkdirSync(dirname(resolve(output, path)), { recursive: true });
  cpSync(resolve(root, path), resolve(output, path), { recursive: true });
}
const adapted = [];
function edit(path, from, to) {
  const file = resolve(output, path);
  const text = readFileSync(file, 'utf8');
  assert.equal(text.split(from).length, 2, `Ambiguous frontend adaptation: ${path}`);
  writeFileSync(file, text.replace(from, to));
  if (!adapted.includes(path)) adapted.push(path);
}
edit('web/lib/beta/navigation.ts',
  'return environment !== "production" || capabilityForBetaPath(pathname) !== "analytics:read";',
  'return pathname.startsWith("/beta") && ["local", "staging", "production"].includes(environment);');
const destination = '  { href: "/beta/analytics", edgePath: "/beta/analytics", capability: "analytics:read", audiences: ["member", "operator", "admin", "super_admin"] },';
edit('web/lib/beta/navigation.ts', destination, destination + '\n' + destination.replaceAll('/beta/analytics', '/beta/social-analytics'));
edit('web/lib/member/navigation.ts', '{ href: "/beta/analytics", label: "youtube analytics" },',
  '{ href: "/beta/analytics", label: "youtube analytics" },\n      { href: "/beta/social-analytics", label: "social media analytics" },');
edit('web/components/domain/beta/BetaPrincipalGate.tsx', '{ href: "/beta/analytics", label: "youtube analytics", section: "workspace" },',
  '{ href: "/beta/analytics", label: "youtube analytics", section: "workspace" },\n  { href: "/beta/social-analytics", label: "social media analytics", section: "workspace" },');
edit('web/lib/beta/principal.ts', '      "/beta/analytics",', '      "/beta/analytics",\n      "/beta/social-analytics",');
edit('web/lib/beta/principal.ts', 'pathname === "/beta/connections" || pathname === "/beta/analytics"',
  'pathname === "/beta/connections" || pathname === "/beta/social-analytics" || pathname === "/beta/analytics"');
edit('web/lib/beta/principal.ts', 'if (pathname === "/beta/analytics" || pathname === "/beta/settings/workspace/analytics")',
  'if (pathname === "/beta/social-analytics" || pathname === "/beta/analytics" || pathname === "/beta/settings/workspace/analytics")');
edit('web/components/shells/AppRail.tsx', 'pathname === "/beta/analytics"', 'pathname === "/beta/analytics" || pathname === "/beta/social-analytics"');
edit('web/next.config.mjs', '{ protocol: "https", hostname: "i.ytimg.com" },',
  '{ protocol: "https", hostname: "i.ytimg.com" },\n      { protocol: "https", hostname: "**.cdninstagram.com" },\n      { protocol: "https", hostname: "**.fbcdn.net" },');

// Register channel deep links in the existing production access policy.
for (const path of ['web/lib/beta/navigation.ts', 'web/lib/beta/principal.ts']) {
  const file = resolve(output, path);
  writeFileSync(file, 'import { isYouTubeAnalyticsChannelPath } from "./youtube-channel-path";\n\n' + readFileSync(file, 'utf8'));
}
edit('web/lib/beta/navigation.ts', '  if (exact) return exact;',
  '  if (exact) return exact;\n  if (isYouTubeAnalyticsChannelPath(pathname)) return BETA_PROTECTED_DESTINATIONS.find((item) => item.href === "/beta/analytics") ?? null;');
edit('web/lib/beta/principal.ts', 'export function principalCanAccess(context: PrincipalContext, pathname: string): boolean {',
  'export function principalCanAccess(context: PrincipalContext, pathname: string): boolean {\n  if (isYouTubeAnalyticsChannelPath(pathname)) return context.capabilities.includes("analytics:read");');
edit('web/lib/beta/principal.ts', 'export function capabilityForPath(pathname: string): string | null {',
  'export function capabilityForPath(pathname: string): string | null {\n  if (isYouTubeAnalyticsChannelPath(pathname)) return "analytics:read";');
// Retain the last released quiet admission lifecycle with the production menu.
const gatePath = 'web/components/domain/beta/BetaPrincipalGate.tsx';
const originalGate = readFileSync(resolve(output, gatePath), 'utf8');
let gate = execFileSync('git', ['show', '9b54418:' + gatePath], { encoding: 'utf8' });
gate = gate.slice(0, gate.indexOf('const operatorNavigation:')) +
  originalGate.slice(originalGate.indexOf('const operatorNavigation:'), originalGate.indexOf('function GateState(')) +
  gate.slice(gate.indexOf('function GateState('));
gate = gate.replaceAll('isBetaDestinationVisible', 'betaDestinationVisible');
writeFileSync(resolve(output, gatePath), gate);
adapted.push(gatePath);
const youtubePaths = [
  'web/lib/beta/youtube-channel-path.ts',
  'web/components/domain/beta/BetaWorkspaceLoading.tsx',
  'web/components/domain/ops/YouTubeAnalyticsWorkspace.tsx',
  'web/components/domain/ops/YouTubeAnalyticsSettingsPanel.tsx',
  'web/app/beta/analytics/channels',
];
for (const path of youtubePaths) {
  assert(existsSync(resolve(root, path)), path);
  mkdirSync(dirname(resolve(output, path)), { recursive: true });
  cpSync(resolve(root, path), resolve(output, path), { recursive: true });
}
const channelPage = resolve(output, 'web/app/beta/analytics/channels/[channelId]/page.tsx');
writeFileSync(channelPage, readFileSync(channelPage, 'utf8').replaceAll('isBetaDestinationVisible', 'betaDestinationVisible'));
// No research or new Production Calendar routes enter this frontend assembly.
assert(!existsSync(resolve(output, 'web/app/beta/research')));

if (mode === '--frontend-only') process.exit(0);

const require = createRequire(resolve(root, 'cloudflare/package.json'));
const bundled = await require('esbuild').build({
  stdin: { contents: `export { handleAnalyticsRequest } from './cloudflare/src/analytics.ts';
export { handleAnalyticsAssistant } from './cloudflare/src/analytics-assistant.ts';
export { syncSelectedAnalytics, syncConfiguredAnalytics, syncYouTubeRetention } from './cloudflare/src/analytics-sync.ts';`, resolveDir: root, loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'WTFYouTubeMulti', platform: 'browser', target: 'es2022', write: false, legalComments: 'none', metafile: true,
});
assert(!baseline.includes('WTFYouTubeMulti'));
let patched = baseline;
const replacements = [];
function patch(from, to) {
  assert.equal(patched.split(from).length, 2, 'Non-unique analytics replacement: ' + from);
  replacements.push([from, to]); patched = patched.replace(from, to);
}
patch('return WTFProductionAnalytics.handleAnalyticsAssistant(request, env, dependencies);', 'return WTFYouTubeMulti.handleAnalyticsAssistant(request, env, dependencies);');
patch('return handleAnalyticsRequest(request, env, context, dependencies);', 'return WTFYouTubeMulti.handleAnalyticsRequest(request, env, context, dependencies);');
patch('const result = await syncSelectedAnalytics(env, provider, startDate, endDate, dependencies);', 'const result = await WTFYouTubeMulti.syncSelectedAnalytics(env, provider, startDate, endDate, dependencies, channelId);');
patch('if (!provider || !validAnalyticsRange(startDate, endDate)) return Response.json({ error: "invalid_sync_request" }, { status: 400, headers: headers3 });',
  'const channelId = typeof input?.channelId === "string" ? input.channelId : "";\n    if (!provider || !validAnalyticsRange(startDate, endDate) || provider === "youtube" && !/^UC[A-Za-z0-9_-]{22}$/u.test(channelId)) return Response.json({ error: "invalid_sync_request" }, { status: 400, headers: headers3 });');
patch('const result = await syncYouTubeRetention(env, videoId, startDate, endDate, dependencies);', 'const result = await WTFYouTubeMulti.syncYouTubeRetention(env, videoId, startDate, endDate, dependencies);');
patch('context.waitUntil(syncConfiguredAnalytics(env, new Date(event.scheduledTime)));', 'context.waitUntil(WTFYouTubeMulti.syncConfiguredAnalytics(env, new Date(event.scheduledTime)));');
let reversed = patched;
for (const [from, to] of [...replacements].reverse()) reversed = reversed.replace(to, from);
assert.equal(reversed, baseline, 'Unrelated production Edge bytes changed');
const artifact = bundled.outputFiles[0].text + '\n' + patched;
mkdirSync(resolve(output, 'analytics-release'), { recursive: true });
writeFileSync(resolve(output, 'analytics-release/edge.js'), artifact);
writeFileSync(resolve(output, 'analytics-release/receipt.json'), JSON.stringify({
  source: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  baselineSha256: hash(baseline), artifactSha256: hash(artifact),
  previousEdgeVersion: 'a8d94ffe-4298-496f-bc98-3c2408625f21',
  previousWebVersion: '0bbce8d8-c572-426d-ad96-f6d8ac770cf5',
  frontendAncestor: productionAncestor, copied: [...copied,...youtubePaths], adapted,
  replacements, overlayInputs: Object.keys(bundled.metafile.inputs),
}, null, 2)+'\n');
console.log('Prepared bounded production YouTube overlay and frontend.');

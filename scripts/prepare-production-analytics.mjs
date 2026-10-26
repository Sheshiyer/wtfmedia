// Reproduce an analytics-only release without promoting the staging application.
// The Edge input must be the recorded live artifact, never an arbitrary branch.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';

const [baselinePath, outputPath] = process.argv.slice(2);
assert(baselinePath && outputPath, 'usage: node scripts/prepare-production-analytics.mjs LIVE_EDGE_JS OUTPUT_DIRECTORY');
const root = process.cwd();
const output = resolve(outputPath);
assert(!existsSync(output), 'Output must be a new directory');
const hash = text => createHash('sha256').update(text).digest('hex');
const baseline = readFileSync(baselinePath, 'utf8');
assert.equal(hash(baseline), '22ec8afd3d8f10d8addea95c2fff06432375344d6c526214b45d5c73012a2327', 'Unexpected production Edge baseline');
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

const require = createRequire(resolve(root, 'cloudflare/package.json'));
const bundled = await require('esbuild').build({
  entryPoints: [resolve(root, 'scripts/production-analytics-entry.ts')], bundle: true,
  format: 'iife', globalName: 'WTFProductionAnalytics', platform: 'browser', target: 'es2022',
  write: false, legalComments: 'none', metafile: true,
});
assert(!baseline.includes('WTFProductionAnalytics'), 'Overlay namespace collision');
let patched = baseline;
const replacements = [];
function patch(from, to) {
  assert.equal(patched.split(from).length, 2, 'Ambiguous production Edge adaptation');
  replacements.push([from, to]);
  patched = patched.replace(from, to);
}
patch('function policyForPath(pathname, method = "GET") {',
  'function policyForPath(pathname, method = "GET") {\n  if (pathname === "/beta/social-analytics" || pathname.startsWith("/beta/api/social-analytics/")) return WTFProductionAnalytics.socialPolicy(pathname, method);');
const admission = '  if (!decide(context.role, requirement[0], requirement[1], { environment: context.environment })) return forbidden();';
// Limit insertion to the admitted member router, retaining release, identity and CSRF gates.
const start = patched.indexOf('async function handleMemberRequest(');
assert(start > 0);
const position = patched.indexOf(admission, start);
assert(position > start);
const inserted = admission + '\n  if (url.pathname.startsWith("/beta/api/social-analytics/")) {\n    if (env.SOCIAL_ANALYTICS_ENABLED !== "1") return denied4();\n    const socialMemberId = await memberIdForPrincipal(env.DB, context);\n    return socialMemberId ? WTFProductionAnalytics.handleSocialAnalytics(request, env, context, socialMemberId, dependencies) : forbidden();\n  }';
patched = patched.slice(0, position) + inserted + patched.slice(position + admission.length);
replacements.push([admission, inserted]);
patch('return handleAnalyticsAssistant(request, env, dependencies);',
  'return WTFProductionAnalytics.handleAnalyticsAssistant(request, env, dependencies);');
let reversed = patched;
for (const [from, to] of [...replacements].reverse()) reversed = reversed.replace(to, from);
assert.equal(reversed, baseline, 'Unrelated production bytes changed');
mkdirSync(resolve(output, 'analytics-release'), { recursive: true });
const artifact = bundled.outputFiles[0].text + '\n' + patched.replace(/^\/\/# sourceMappingURL=.*\n?/gm, '');
writeFileSync(resolve(output, 'analytics-release/edge.js'), artifact);
const edgeConfig = readFileSync(resolve(root, 'cloudflare/wrangler.jsonc'), 'utf8')
  .replace('"main": "src/index.ts"', '"main": "../analytics-release/edge.js"')
  .replace('"vars": {\n    "ALLOWED_ORIGIN"', '"vars": {\n    "SOCIAL_ANALYTICS_ENABLED": "1",\n    "ALLOWED_ORIGIN"');
writeFileSync(resolve(output, 'cloudflare/wrangler.analytics.jsonc'), edgeConfig);
mkdirSync(resolve(output, 'cloudflare/analytics-migrations'), { recursive: true });
cpSync(resolve(root, 'cloudflare/migrations/0024_social_analytics.sql'),
  resolve(output, 'cloudflare/analytics-migrations/0024_social_analytics.sql'));
// This separate config exposes only the reviewed Social Analytics migration.
writeFileSync(resolve(output, 'cloudflare/wrangler.analytics-migrations.jsonc'),
  edgeConfig.replace('"database_name": "wtfmedia-ops",', '"database_name": "wtfmedia-ops", "migrations_dir": "analytics-migrations",'));
writeFileSync(resolve(output, 'analytics-release/receipt.json'), JSON.stringify({
  productionFrontendAncestor: productionAncestor,
  productionEdgeVersion: 'b0b59cfc-7152-4dcd-b606-5bcbb58fb3de',
  productionEdgeBaselineSha256: hash(baseline), artifactSha256: hash(artifact),
  frontendCopiedPaths: copied, frontendAdaptedPaths: adapted,
  edgeOverlayInputs: Object.keys(bundled.metafile.inputs),
  edgeChangedSurfaces: ['social analytics policy', 'admitted social analytics dispatch', 'YouTube analytics assistant'],
}, null, 2) + '\n');
console.log('Prepared analytics-only web source and reversible production Edge overlay.');

// Start with the recorded live apex runtime and its analytics frontend assembly.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const [livePath, directory] = process.argv.slice(2);
assert(livePath && directory, 'Expected the live production Edge module and a new output directory');
const output = resolve(directory);
execFileSync(process.execPath, ['scripts/prepare-production-youtube-multi.mjs', livePath, output, '--research-frontend'], {stdio:'inherit'});
function replace(text, before, after) {
  assert.equal(text.split(before).length, 2, 'Missing or ambiguous anchor: '+before.slice(0,95));
  return text.replace(before, () => after);
}
function edit(path, before, after) {
  const file = resolve(output, path);
  writeFileSync(file, replace(readFileSync(file,'utf8'), before, after));
}
const researchFiles = (dir, pattern) => readdirSync(dir).filter(name => pattern.test(name)).map(name => dir+'/'+name);
const paths = [
  'web/app/beta/research','web/components/shells/AppShell.tsx','web/package.json','web/package-lock.json',
  ...researchFiles('web/components/domain/beta',/^Research.*\.tsx$/),
  ...researchFiles('web/lib',/^research(?:-.*)?\.ts$/),
  ...researchFiles('shared',/^research-.*\.ts$/),
];
for(const path of paths) {
  mkdirSync(dirname(resolve(output,path)),{recursive:true});
  cpSync(path,resolve(output,path),{recursive:true});
}
for(const path of ['web/lib/beta/navigation.ts','web/lib/member/navigation.ts','web/components/domain/beta/BetaPrincipalGate.tsx']) {
  const line = readFileSync(resolve(output,path),'utf8').split('\n').find(s=>s.includes('{ href: "/beta/analytics",'));
  assert(line);
  edit(path,line,line+'\n'+line.replaceAll('/beta/analytics','/beta/research').replace('analytics:read','research:read').replace('youtube analytics','research'));
}
const principal = 'web/lib/beta/principal.ts';
for(const [method,check] of [['principalCanAccess(context: PrincipalContext, pathname: string): boolean','context.capabilities.includes("research:read")'],['capabilityForPath(pathname: string): string | null','"research:read"']]) {
  edit(principal,method+' {',method+' {\n  if (pathname === "/beta/research") return '+check+';');
}
edit('web/components/domain/beta/BetaPrincipalGate.tsx','betaDestinationVisible(item.href, context.environment)),','betaDestinationVisible(item.href, context.environment) && (item.href !== "/beta/research" || context.capabilities.includes("research:read"))),');
edit('web/components/shells/AppRail.tsx','pathname === "/beta/social-analytics"','pathname === "/beta/social-analytics" || pathname === "/beta/research"');
const require = createRequire(resolve('cloudflare/package.json'));
const overlay = await require('esbuild').build({
  stdin:{contents:`export { handleResearch } from './cloudflare/src/research.ts';
export { policyForPath } from './cloudflare/src/auth/policy.ts';
export { erasePendingResearchJobs } from './cloudflare/src/research-erasure.ts';`, resolveDir:process.cwd(),loader:'ts'},
  bundle:true, format:'iife',globalName:'WTFApexResearch',platform:'browser',target:'es2022',write:false,legalComments:'none',
});
const baseline = readFileSync(livePath,'utf8');
assert(!baseline.includes('WTFApexResearch'));
let edge = baseline;
const changes = [];
function patch(before,after){ edge = replace(edge,before,after); changes.push([before,after]); }
const policy = '\nfunction policyForPath(pathname, method = "GET") {';
patch(policy,policy+'\n  if (pathname === "/beta/research" || pathname === "/beta/api/research" || pathname.startsWith("/beta/api/research/")) return WTFApexResearch.policyForPath(pathname, method);');
const grants = '\nfunction decide(role, resource, action, options = {}) {';
patch(grants,'\nresources.push("research");\nfor (const role of roles) { grants[role].add("research:read"); grants[role].add("research:write"); }'+grants);
const dispatch = '  if (url.pathname.startsWith("/beta/api/social-analytics/")) {';
patch(dispatch,'  if (url.pathname === "/beta/api/research" || url.pathname.startsWith("/beta/api/research/")) {\n    const id = await memberIdForPrincipal(env.DB, context);\n    return id ? WTFApexResearch.handleResearch(request, env, id, dependencies) : forbidden();\n  }\n'+dispatch);
const erasureAnchor = '    db.prepare("DELETE FROM member_saved_memories WHERE';
const researchCleanup = readFileSync('cloudflare/src/user-deletion.ts','utf8').split('\n').filter(line => line.includes('db.prepare(') && line.includes('research_'));
assert.equal(researchCleanup.length,4);
patch(erasureAnchor,researchCleanup.join('\n')+'\n'+erasureAnchor);
const identity = '      const result = await manageUser(env.DB, context, input, createClerkInvitationClient(env.CLERK_SECRET_KEY), env.OPS_ORIGIN, createClerkUserDeleter(env.CLERK_SECRET_KEY));';
patch(identity,'      const deleteIdentity = createClerkUserDeleter(env.CLERK_SECRET_KEY);\n'+identity.replace('createClerkUserDeleter(env.CLERK_SECRET_KEY)', 'deleteIdentity ? async email => await WTFApexResearch.erasePendingResearchJobs(env, email, dependencies.fetchRunner) && await deleteIdentity(email) : undefined'));
let reversed = edge;
for(const [before,after] of changes.reverse())reversed = reversed.replace(after,()=>before);
assert.equal(reversed,baseline);
mkdirSync(resolve(output,'release'));
writeFileSync(resolve(output,'release/edge.js'),overlay.outputFiles[0].text+'\n'+edge);

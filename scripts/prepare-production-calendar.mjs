// Promote only the accepted Production calendar on top of the released apex app.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const [livePath, researchBaselinePath, directory] = process.argv.slice(2);
assert(livePath && researchBaselinePath && directory, 'Expected current Edge, pre-research Edge, and new output directory');
const baseline=readFileSync(livePath,'utf8');
assert.equal(createHash('sha256').update(baseline).digest('hex'),'368dd9a786998863de7d58499e6c916f2e0a57eb5573c9abad1682bc519450c6','Live production baseline changed');
execFileSync(process.execPath,['scripts/prepare-production-research.mjs',researchBaselinePath,directory],{stdio:'inherit'});
const output=resolve(directory);
for(const path of ['web/app/beta/workspace/production','web/components/domain/ops/ProductionWorkspace.tsx','web/components/domain/ops/ProductionWorkspaceView.tsx','web/components/domain/ops/production','web/components/patterns/ProductionCalendar.tsx','web/components/patterns/ProductionBoard.tsx','web/lib/ops/production.ts','web/lib/ops/production-data.ts']){
 mkdirSync(dirname(resolve(output,path)),{recursive:true});cpSync(path,resolve(output,path),{recursive:true});
}
function replace(s,from,to){assert.equal(s.split(from).length,2,'Non-unique anchor: '+from);return s.replace(from,()=>to)}
function edit(path,from,to){const file=resolve(output,path);writeFileSync(file,replace(readFileSync(file,'utf8'),from,to))}
edit('web/lib/beta/navigation.ts','{ href: "/beta/workspace/production", edgePath: "/beta/workspace/production", capability: "control_room:read",','{ href: "/beta/workspace/production", edgePath: "/beta/workspace/production", capability: "production:read",');
edit('web/components/domain/beta/BetaPrincipalGate.tsx','  { href: "/beta/research", label: "research", section: "workspace" },',
 '  { href: "/beta/research", label: "research", section: "workspace" },\n  { href: "/beta/workspace/production", label: "production", section: "workspace" },');
edit('web/components/domain/beta/BetaPrincipalGate.tsx','(item.href !== "/beta/research" || context.capabilities.includes("research:read"))',
 '(item.href !== "/beta/research" || context.capabilities.includes("research:read")) && (item.href !== "/beta/workspace/production" || context.capabilities.includes("production:read"))');
for(const [sig,check] of [['principalCanAccess(context: PrincipalContext, pathname: string): boolean','context.kind === "operator" && context.capabilities.includes("production:read")'],['capabilityForPath(pathname: string): string | null','"production:read"']])
 edit('web/lib/beta/principal.ts',sig+' {',sig+' {\n  if (pathname === "/beta/workspace/production") return '+check+';');
const require=createRequire(resolve('cloudflare/package.json'));
const bundle=await require('esbuild').build({stdin:{contents:`export {handleProductionCalendarRequest} from './cloudflare/src/production-calendar.ts';\nexport {policyForPath,decide} from './cloudflare/src/auth/policy.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',globalName:'WTFProductionCalendar',platform:'browser',target:'es2022',write:false,legalComments:'none'});
let edge=baseline;const replacements=[];
function patch(from,to){edge=replace(edge,from,to);replacements.push([from,to])}
const policy='\nfunction policyForPath(pathname, method = "GET") {';
patch(policy,policy+'\n  if (pathname === "/beta/workspace/production" || pathname === "/beta/api/production") return WTFProductionCalendar.policyForPath(pathname, method);');
const decide='\nfunction decide(role, resource, action, options = {}) {';
patch(decide,'\nresources.push("production");\nfor (const role of roles) for (const action of ["read", "write", "manage"]) if (WTFProductionCalendar.decide(role, "production", action)) grants[role].add("production:" + action);'+decide+'\n  if (resource === "production") return WTFProductionCalendar.decide(role, resource, action, options);');
const dispatch='  if (url.pathname.startsWith("/beta/api/social-analytics/")) {';
patch(dispatch,'  if (url.pathname === "/beta/api/production") return context.kind === "operator" ? WTFProductionCalendar.handleProductionCalendarRequest(request, { ...env, PRODUCTION_SHEET_SYNC_ENABLED: "1" }, context) : forbidden();\n'+dispatch);
let reversed=edge;for(const [from,to] of replacements.toReversed())reversed=reversed.replace(to,()=>from);
assert.equal(reversed,baseline,'Unrelated production runtime changed');
writeFileSync(resolve(output,'release/edge.js'),bundle.outputFiles[0].text+'\n'+edge);
console.log('Production calendar assembled; existing production runtime preserved outside three explicit dispatch/policy changes.');

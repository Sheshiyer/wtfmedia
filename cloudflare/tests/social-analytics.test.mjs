import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSocialProvider } from '../src/social-analytics-provider.ts';
import { validSocialRange, socialDifference } from '../src/social-analytics-contracts.ts';
import { policyForPath, decide } from '../src/auth/policy.ts';
test('social management denied to members; readers can chat',()=>{
 assert.deepEqual(policyForPath('/beta/api/social-analytics/selection','POST'),['analytics','manage']);
 assert.equal(decide('member','analytics','manage',{environment:'local'}),false);
 assert.deepEqual(policyForPath('/beta/api/social-analytics/assistant','POST'),['analytics','read']);
});
test('profile discovery does not require a hardcoded ID and values preserve missing versus zero',async()=>{
 const paths=[];
 const p=createSocialProvider({ZERNIO_API_KEY:'test'},async url=>{paths.push(String(url));return Response.json(String(url).includes('/profiles')?{profiles:[{_id:'profile1',name:'Team'}]}:{totals:{views:0,likes:''},daily:[]});});
 assert.deepEqual(await p.profiles(),[{id:'profile1',name:'Team'}]);
 const d=await p.dashboard('profile1',{platform:'instagram',fromDate:'2026-01-01',toDate:'2026-01-02'});
 assert.equal(d.totals.views,0);assert.equal(d.totals.likes,null);assert.match(paths[1],/profileId=profile1/);
});
test('honest dates and percentage differences',()=>{
 assert.equal(validSocialRange('2026-02-30','2026-03-01'),false);
 assert.equal(validSocialRange('2026-01-02','2026-01-01'),false);
 assert.equal(validSocialRange('2099-01-01','2099-01-02'),false);
 assert.deepEqual(socialDifference(8,0),{difference:8,percentChange:null});
 assert.deepEqual(socialDifference(12,10,true),{difference:2,percentChange:null});
 assert.deepEqual(socialDifference(null,0),{difference:null,percentChange:null});
});

import {handleMemberRequest} from '../src/member-router.ts';
import {handleSocialAnalytics,resolveSocialWorkspace} from '../src/social-analytics.ts';
const identity={ok:true,email:'social@example.test',userId:'user_social'};
const env={OPS_HOSTNAME:'app.test',OPS_ORIGIN:'https://app.test',OPS_ENVIRONMENT:'staging',CLERK_ISSUER:'https://clerk.test',CLERK_JWKS_URL:'https://clerk.test/jwks',CLERK_AUTHORIZED_PARTIES:'https://app.test',SOCIAL_ANALYTICS_ENABLED:'1',ZERNIO_API_KEY:'test'};
function db(role='member',active=true){return {prepare(sql){return {bind(){return this},async first(){if(sql.includes('member_beta_releases'))return {state:'stable'};if(sql.includes('sqlite_master'))return {ready:1};if(sql.includes('FROM operators'))return role==='member'?null:{id:1,email:identity.email,display_name:'Admin',role,active:active?1:0};if(sql.includes('FROM member_users'))return {id:1,email:identity.email,clerk_user_id:identity.userId,lifecycle_state:active?'active':'suspended',pilot_cohort:'company'};return null},async all(){return {results:[]}},async run(){return {}}}},async batch(){return []}}}
const req=(path='status',method='GET',body)=>new Request(`https://app.test/beta/api/social-analytics/${path}`,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
test('router enforces signed-out, suspended, roles and default-off before provider access',async()=>{
 const fetchSocial=async()=>{throw Error('provider should not be reached')};
 assert.equal((await handleMemberRequest(req(),{...env,DB:db()},{verifyClerk:async()=>({ok:false}),fetchSocial})).status,401);
 assert.equal((await handleMemberRequest(req(),{...env,DB:db('member',false)},{verifyClerk:async()=>identity,fetchSocial})).status,403);
 assert.equal((await handleMemberRequest(req('selection','POST',{profileId:'foreign'}),{...env,DB:db()},{verifyClerk:async()=>identity,fetchSocial})).status,403);
 assert.equal((await handleMemberRequest(req(),{...env,SOCIAL_ANALYTICS_ENABLED:'0',DB:db()},{verifyClerk:async()=>identity,fetchSocial})).status,404);
});
test('admin discovers profiles without selecting; stale selection never silently changes',async()=>{
 const profiles=[{id:'one',name:'First'},{id:'two',name:'Second'}];
 const p={profiles:async()=>profiles};const selected=await resolveSocialWorkspace(db(),env,p);
 assert.equal(selected.profileId,null);assert.equal(selected.profiles.length,2);
 await assert.rejects(()=>resolveSocialWorkspace(db(),{...env,ZERNIO_PROFILE_ID:'gone'},p),{code:'profile_unavailable'});
 for(const list of [[],[{_id:'one',name:'First'}],[{_id:'one',name:'First'},{_id:'two',name:'Second'}]]) {
 const res=await handleMemberRequest(req(),{...env,DB:db('admin')},{verifyClerk:async()=>identity,fetchSocial:async()=>Response.json({profiles:list})});
 assert.equal(res.status,200);const body=await res.json();assert.equal(body.canManage,true);assert.equal(body.profiles.length,list.length);assert.equal(body.selectionRequired,true);
 }
 const member=await handleMemberRequest(req(),{...env,DB:db()},{verifyClerk:async()=>identity,fetchSocial:async()=>Response.json({profiles:[{_id:'one',name:'Private Profile'}]})});
 assert.ok(!JSON.stringify(await member.json()).includes('Private Profile'));
});
test('foreign profile cannot be selected even by admin',async()=>{
 const res=await handleMemberRequest(req('selection','POST',{profileId:'foreign'}),{...env,DB:db('admin')},{verifyClerk:async()=>identity,fetchSocial:async()=>Response.json({profiles:[{_id:'one',name:'Team'}]})});assert.equal(res.status,400);
});
test('documented paginated post platforms and safe URLs are normalized per account',async()=>{
 const p=createSocialProvider({ZERNIO_API_KEY:'test'},async()=>Response.json({posts:[{_id:'p1',content:'Launch',publishedAt:'2026-01-01',analytics:{views:999},platforms:[{platform:'instagram',accountId:'a',analytics:{views:12},platformPostUrl:'https://instagram.com/p/abc'},{platform:'facebook',accountId:'b',syncStatus:'pending',analytics:{views:0},platformPostUrl:'javascript:bad'}]}],pagination:{page:1,pages:2,total:101}}));
 const result=await p.posts('workspace',{fromDate:'2026-01-01',toDate:'2026-01-02'});
 assert.equal(result.complete,false);assert.deepEqual(result.posts.map(p=>p.metrics.views),[12,null]);assert.equal(result.posts[0].accountId,'a');assert.equal(result.posts[1].url,undefined);
});
test('provider budget is capped and only safe reads retry',async()=>{
 let calls=0;const p=createSocialProvider({ZERNIO_API_KEY:'test'},async()=>{calls++;return Response.json({profiles:[]})});
 for(let i=0;i<12;i++)await p.profiles();await assert.rejects(()=>p.profiles(),{code:'query_budget'});assert.equal(calls,12);
 let retry=0;const t=createSocialProvider({ZERNIO_API_KEY:'test'},async()=>{retry++;return Response.json({}, {status:503})});await assert.rejects(()=>t.profiles());assert.equal(retry,2);
 let mutation=0;const m=createSocialProvider({ZERNIO_API_KEY:'test'},async()=>{mutation++;return Response.json({}, {status:503})});await assert.rejects(()=>m.connect('p','instagram','https://app.test'));assert.equal(mutation,1);
 const pending=createSocialProvider({ZERNIO_API_KEY:'test'},async()=>Response.json({}, {status:202}));await assert.rejects(()=>pending.profiles(),{code:'sync_pending'});
});
test('authenticated assistant returns scoped provider values, workspace label and enforced quota',async()=>{
 const database=db();const prepare=database.prepare;let count=0,providerCalls=0;
 database.prepare=sql=>sql.includes('social_analytics_rate_limits')?{bind(){return this},first:async()=>({requests:++count})}:prepare(sql);
 const fetchSocial=async url=>{providerCalls++;const path=new URL(url).pathname;return Response.json(path.endsWith('/profiles')?{profiles:[{_id:'one',name:'Social Team'}]}:path.endsWith('/accounts')?{accounts:[{_id:'a',platform:'instagram',isActive:true,hasAnalyticsAccess:true}]}:{totals:{views:42},followers:{},daily:[]});};
 const planSocial=async()=>({answer:JSON.stringify({intent:'summary',platforms:['instagram'],metrics:['views'],posts:[],target:'platform'})});
 const call=()=>handleMemberRequest(req('assistant','POST',{question:'Instagram views',scope:{platform:'instagram',fromDate:'2026-01-01',toDate:'2026-01-02'}}),{...env,DB:database,ZERNIO_PROFILE_ID:'one'},{verifyClerk:async()=>identity,fetchSocial,planSocial});
 const response=await call();assert.equal(response.status,200);const answer=await response.json();assert.equal(answer.rows[0].values[0],42);assert.match(answer.summary,/Social Team/);assert.equal(answer.evidence[0].basis,'received_period');
 count=10;const before=providerCalls;assert.equal((await call()).status,429);assert.equal(providerCalls,before);
});

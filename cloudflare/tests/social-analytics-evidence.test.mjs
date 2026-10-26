import {test} from 'node:test';import assert from 'node:assert/strict';
import {executeSocialPlan} from '../src/social-analytics-evidence.ts';
const plan={intent:'platform_comparison',platforms:['instagram','facebook'],metrics:['views','engagementRate'],fromDate:'2026-01-01',toDate:'2026-01-07',posts:[],target:'platform',limit:5,order:'desc',basis:'received_period'};
const workspace={profileId:'p',accounts:[{id:'a',platform:'instagram',isActive:true},{id:'b',platform:'facebook',isActive:true}]};
const dashboard={totals:{views:0,engagementRate:12},followers:{current:null,gained:null},daily:[],dataAsOf:null};
test('partial provider failures preserve measured zero and missing values',async()=>{
 const a=await executeSocialPlan({dashboard:async(_,s)=>{if(s.platform==='facebook')throw Error('offline');return dashboard}},workspace,plan);
 assert.equal(a.status,'partial');assert.deepEqual(a.rows[0].values,[0,null]);assert.equal(a.rows[0].difference,null);
});
test('period comparison uses equal metrics and rate percentage points',async()=>{
 const a=await executeSocialPlan({dashboard:async(_,s)=>({...dashboard,totals:{views:s.fromDate===plan.fromDate?10:0,engagementRate:s.fromDate===plan.fromDate?12:10}})},workspace,{...plan,intent:'period_comparison',platforms:['instagram']});
 assert.equal(a.rows[0].difference,10);assert.equal(a.rows[0].percentChange,null);assert.equal(a.rows[1].difference,2);assert.equal(a.rows[1].percentChange,null);
 assert.ok(a.limitations.some(s=>s.includes('zero baseline')));
});
test('post ranking excludes missing metrics, checks account membership and discloses incomplete pages',async()=>{
 const a=await executeSocialPlan({posts:async()=>({posts:[{id:'one',platform:'instagram',accountId:'a',label:'First',metrics:{shares:12}},{id:'two',platform:'instagram',accountId:'a',label:'Missing',metrics:{shares:null}},{id:'foreign',platform:'instagram',accountId:'other',label:'Private',metrics:{shares:500}}],complete:false})},workspace,{...plan,intent:'ranking',target:'post',platforms:['instagram'],metrics:['shares']});
 assert.equal(a.rows[0].values[0],12);assert.ok(a.limitations.some(s=>s.includes('coverage')));assert.ok(!JSON.stringify(a).includes('Private'));
});
test('matched age cannot substitute lifetime figures',async()=>{
 let calls=0; const a=await executeSocialPlan({posts:async()=>{calls++;return {posts:[]}}},workspace,{...plan,basis:'matched_age',target:'post'});
 assert.equal(a.status,'unavailable');assert.equal(calls,0);
});
test('ambiguous and misspelled titles do not choose an arbitrary post',async()=>{
 const posts=[{id:'a',platform:'instagram',accountId:'a',label:'Launch trailer',metrics:{views:4}},{id:'b',platform:'instagram',accountId:'a',label:'Launch teaser',metrics:{views:3}}];
 const p={posts:async()=>({posts,complete:true})};
 const q={...plan,target:'post',intent:'summary',posts:[{query:'Launch'}],platforms:['instagram']};
 const ambiguous=await executeSocialPlan(p,workspace,q);assert.equal(ambiguous.status,'clarification_required');assert.equal(ambiguous.candidates.length,2);
 const typo=await executeSocialPlan(p,workspace,{...q,posts:[{query:'Launhc trailer'}]});assert.equal(typo.status,'clarification_required');
 const unique=await executeSocialPlan(p,workspace,{...q,posts:[{query:'Launch trailr'}]});assert.equal(unique.entities[0].id,'a');assert.equal(unique.columns.length,1);
});
test('same creative on two accounts is not silently collapsed',async()=>{
 const accounts=[{id:'a',platform:'instagram',isActive:true},{id:'b',platform:'instagram',isActive:true}];
 const posts=accounts.map((a,i)=>({id:'same',platform:'instagram',accountId:a.id,label:'Launch',metrics:{views:10+i}}));
 const p={posts:async()=>({posts,complete:true})};
 const q={...plan,platforms:['instagram'],intent:'summary',target:'post',posts:[{id:'same',platform:'instagram'}]};
 const a=await executeSocialPlan(p,{...workspace,accounts},q);assert.equal(a.status,'clarification_required');assert.equal(a.candidates.length,2);
 const b=await executeSocialPlan(p,{...workspace,accounts},{...q,posts:[{id:'same',platform:'instagram',accountId:'b'}]});assert.equal(b.rows[0].values[0],11);
});
test('ranking cannot silently exclude an unavailable contender',async()=>{
 const a=await executeSocialPlan({dashboard:async(_,s)=>({...dashboard,followers:{current:100,gained:s.platform==='instagram'?null:0}})},workspace,{...plan,intent:'ranking',metrics:['followersGained']});
 assert.equal(a.status,'partial');assert.equal(a.rows[0].values[0],0);assert.ok(a.limitations.some(s=>/unavailable.*excluded|excluded.*unavailable/i.test(s)));
});

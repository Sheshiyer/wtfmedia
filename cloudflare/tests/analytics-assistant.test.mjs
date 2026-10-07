import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAnalyticsAssistant } from '../src/analytics-assistant.ts';
import { encryptAnalyticsCredentials } from '../src/analytics.ts';
import { policyForPath, capabilitiesForRole } from '../src/auth/policy.ts';

const now = () => new Date('2026-10-04T12:00:00Z');
const plan = {kind:'metrics',videoQuery:'Example',startDate:'2026-09-01',endDate:'2026-09-30',metrics:['subscribersGained','subscribersLost']};
const request = (overrides={}) => new Request('http://localhost/beta/api/analytics/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'How much subscriber growth for Example?',...overrides})});
async function fixture(options={}) {
 const secret='test-only-encryption-secret';
 const encrypted=await encryptAnalyticsCredentials({accessToken:'test-access-token',refreshToken:'test-refresh-token',expiresAt:'2026-10-05T00:00:00Z'},secret);
 const connection={id:'connection-test',selected_resource_id:'UC_selected_channel',selected_resource_name:'Channel',status:'connected',encrypted_credentials:encrypted};
 const bindings=[];const urls=[];let providerCalls=0;
 const env={OPS_ENVIRONMENT:'staging',GOOGLE_OAUTH_CLIENT_ID:'test-client',GOOGLE_OAUTH_CLIENT_SECRET:'test-secret',ANALYTICS_TOKEN_ENCRYPTION_KEY:secret,DB:{prepare(sql){return{bind(...values){bindings.push({sql,values});return this;},async first(){return options.disconnected?null:connection;},async all(){return{results:options.videos??[{videoId:'video_test1',title:'Example video'}]};}};}}};
 const deps={now,planAnalytics:async()=>options.plan??plan,fetchGoogle:async(url,init)=>{providerCalls++;urls.push(new URL(url).toString());assert.equal(new URL(url).hostname,'youtubeanalytics.googleapis.com');assert.equal(new URL(url).searchParams.get('ids'),'channel==UC_selected_channel');assert.equal(init.headers.authorization,'Bearer test-access-token');return new Response(JSON.stringify(options.report??{columnHeaders:[{name:'subscribersLost'},{name:'subscribersGained'}],rows:[[12,87]]}),{status:options.httpStatus??200});}};
 return{env,deps,bindings,urls,calls:()=>providerCalls};
}
test('live subscriber answer maps named columns and computes exact net with provenance',async()=>{
 const f=await fixture();const response=await handleAnalyticsAssistant(request(),f.env,f.deps);const value=await response.json();
 assert.equal(value.status,'answered');assert.equal(value.metrics.find(x=>x.key==='netSubscribers').value,75);
 assert.equal(value.scope.videoId,'video_test1');assert.equal(value.sources.length,2);assert.equal(f.calls(),1);
 assert.ok(f.bindings[1].values.includes('connection-test'));assert.ok(f.bindings[1].values.includes('UC_selected_channel'));
 assert.doesNotMatch(JSON.stringify(value),/test-access-token|test-refresh-token|connection-test/);
});
test('ambiguous video titles ask for clarification without fetching Google',async()=>{
 const f=await fixture({videos:[{videoId:'video_test1',title:'Example one'},{videoId:'video_test2',title:'Example two'}]});
 const value=await (await handleAnalyticsAssistant(request(),f.env,f.deps)).json();assert.equal(value.status,'clarification_required');assert.equal(value.candidates.length,2);assert.equal(f.calls(),0);
});
test('missing video never substitutes channel totals',async()=>{
 const f=await fixture({videos:[]});const v=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();assert.equal(v.status,'video_not_found');assert.equal(f.calls(),0);
});
test('empty report is no data rather than zero subscriber growth',async()=>{
 const f=await fixture({report:{columnHeaders:[],rows:[]}});const v=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();assert.equal(v.status,'no_data');assert.deepEqual(v.metrics,[]);
});
test('missing metric stays null and cannot create a fabricated net',async()=>{
 const f=await fixture({report:{columnHeaders:[{name:'subscribersGained'}],rows:[[87]]}});const v=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();assert.equal(v.metrics[1].value,null);assert.equal(v.metrics.some(x=>x.key==='netSubscribers'),false);
});
test('model cannot select arbitrary metrics or malformed dates',async()=>{
 for(const changed of [{metrics:['secret']},{startDate:'2026-02-31'},{endDate:'2030-01-01'}]){
  const f=await fixture({plan:{...plan,...changed}});const v=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();assert.equal(v.status,'clarification_required');assert.equal(f.calls(),0);
 }
});
test('disconnected and provider failures are truthful',async()=>{
 const f=await fixture({disconnected:true});assert.equal((await handleAnalyticsAssistant(request(),f.env,f.deps)).status,409);assert.equal(f.calls(),0);
 const g=await fixture({httpStatus:403});const v=await(await handleAnalyticsAssistant(request(),g.env,g.deps)).json();assert.equal(v.status,'provider_unavailable');assert.deepEqual(v.sources,[]);
});
test('assistant is analytics read only and is available to members',()=>{
 assert.deepEqual(policyForPath('/beta/api/analytics/assistant','POST'),['analytics','read']);
 assert.equal(policyForPath('/beta/api/analytics/assistant','GET'),null);
 assert.equal(capabilitiesForRole('member').includes('analytics:read'),true);
 assert.equal(capabilitiesForRole('editor').includes('analytics:read'),true);
});


test('explicit channel scope overrides a previously selected video',async()=>{
 const f=await fixture({plan:{...plan,scope:'channel',videoQuery:null}});
 const v=await(await handleAnalyticsAssistant(request({videoId:'video_test1'}),f.env,f.deps)).json();
 assert.equal(v.status,'answered');assert.equal(v.scope.videoId,null);
 assert.equal(f.bindings.length,2);
});

test('analytics uses the shared Ask WTF GLM OpenRouter lane with JSON and backup-key fallback', async () => {
 const f=await fixture();
 delete f.deps.planAnalytics;
 f.env.OPENROUTER_API_KEY='test-primary';
 f.env.OPENROUTER_API_KEY_2='test-backup';
 const originalFetch=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async (url, init)=>{
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  const payload=JSON.parse(init.body);calls.push(init.headers.Authorization);
  assert.equal(payload.model,'z-ai/glm-5.3-flash');
  assert.deepEqual(payload.response_format,{type:'json_object'});
  assert.deepEqual(payload.reasoning,{effort:'low'});
  assert.doesNotMatch(init.body,/test-access-token|test-refresh-token|connection-test|test-primary/);
  if(calls.length===1)return new Response('auth failed',{status:401});
  return Response.json({choices:[{message:{content:JSON.stringify(plan)}}]});
 };
 try {
  const response=await handleAnalyticsAssistant(request(),f.env,f.deps);
  const value=await response.json();
  assert.equal(value.status,'answered');
  assert.equal(value.metrics.find(x=>x.key==='netSubscribers').value,75);
  assert.deepEqual(calls,['Bearer test-primary','Bearer test-backup']);
 } finally {globalThis.fetch=originalFetch;}
});

test('missing OpenRouter configuration fails without a Workers AI fallback or Google report',async()=>{
 const f=await fixture();delete f.deps.planAnalytics;
 f.env.AI={run(){throw new Error('Workers AI must not be used');}};
 const response=await handleAnalyticsAssistant(request(),f.env,f.deps);
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,'assistant_unavailable');
 assert.equal(f.calls(),0);
});


test('ranking asks Google for channel-wide top videos despite a selected video',async()=>{
 const f=await fixture({plan:{...plan,kind:'ranking',scope:'selected',videoQuery:null,rankBy:'subscribersGained',order:'desc',limit:5},report:{columnHeaders:[{name:'video'},{name:'subscribersGained'}],rows:[['video_test1',87],['video_test2',20]]}});
 const v=await(await handleAnalyticsAssistant(request({videoId:'other_video'}),f.env,f.deps)).json();
 assert.equal(v.status,'answered');assert.equal(v.ranking[0].title,'Example video');assert.equal(v.ranking[0].value,87);assert.equal(v.scope.videoId,null);
 const url=new URL(f.urls[0]);assert.equal(url.searchParams.get('dimensions'),'video');assert.equal(url.searchParams.get('sort'),'-subscribersGained');assert.equal(url.searchParams.get('filters'),null);assert.equal(url.searchParams.get('maxResults'),'5');
 assert.ok(f.bindings.at(-1).values.includes('UC_selected_channel'));
});
test('invalid rankings fail closed and missing ranking values are not zero',async()=>{
 for(const change of [{rankBy:'revenue'},{limit:500},{order:'SQL'}]){
  const f=await fixture({plan:{...plan,kind:'ranking',rankBy:'subscribersGained',order:'desc',limit:5,...change}});
  assert.equal((await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json()).status,'clarification_required');assert.equal(f.calls(),0);
 }
 const f=await fixture({plan:{...plan,kind:'ranking',rankBy:'subscribersGained',order:'desc',limit:5},report:{columnHeaders:[{name:'video'},{name:'subscribersGained'}],rows:[['video_test1',null]]}});
 assert.equal((await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json()).status,'provider_unavailable');
});
test('period comparison uses the preceding equal-length range with exact deltas',async()=>{
 const f=await fixture({plan:{...plan,kind:'comparison',scope:'channel',videoQuery:null}});
 const original=f.deps.fetchGoogle;let n=0;
 f.deps.fetchGoogle=async(...args)=>{await original(...args);return Response.json({columnHeaders:[{name:'subscribersGained'},{name:'subscribersLost'}],rows:n++===0?[[87,12]]:[[50,10]]});};
 const v=await(await handleAnalyticsAssistant(request({videoId:'video_test1'}),f.env,f.deps)).json();
 assert.equal(v.status,'answered');assert.deepEqual(v.comparison,{startDate:'2026-08-02',endDate:'2026-08-31'});
 assert.equal(v.metrics.find(m=>m.key==='netSubscribers').change,35);
 assert.equal(new URL(f.urls[1]).searchParams.get('startDate'),'2026-08-02');assert.match(v.answer,/do not establish why/);
});
test('empty comparison history remains unavailable, never a fabricated zero baseline',async()=>{
 const f=await fixture({plan:{...plan,kind:'comparison'}});const original=f.deps.fetchGoogle;let n=0;
 f.deps.fetchGoogle=async(...args)=>{const r=await original(...args);return n++===0?r:Response.json({columnHeaders:[],rows:[]});};
 const v=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();
 assert.equal(v.status,'answered');assert.equal(v.metrics[0].previous,null);assert.equal(v.metrics[0].change,null);
});

test('two-video chat fetches live metrics when stored observations are missing', async () => {
 const f = await fixture({plan:{...plan,kind:'video_comparison',scope:'selected',videoQuery:'Rohit',comparisonVideoQuery:'Artist',window:'first7',metrics:['views']}});
 const videos=[{id:'stored-a',videoId:'video_test1',title:'Rohit',publishedAt:'2026-09-01T00:00:00Z'},{id:'stored-b',videoId:'video_test2',title:'Artist',publishedAt:'2026-09-15T00:00:00Z'}];
 const original=f.env.DB.prepare;
 f.env.DB.prepare=sql=>{
  if(sql.includes('analytics_provider_connections'))return original(sql);
  let args=[];
  return {bind(...values){args=values;return this;},async first(){
   if(sql.includes('SELECT id FROM youtube_analytics_channels'))return{id:'channel-test'};
   assert.match(sql,/youtube_video_daily_metrics/);
   assert.deepEqual(args.slice(1),args[0]==='stored-a'?['2026-09-01','2026-09-07']:['2026-09-15','2026-09-21']);
   return {views:null,impressions:null};
  },async all(){
   if(sql.includes('JOIN youtube_analytics_channels')){
    assert.deepEqual(args.slice(0,2),['connection-test','UC_selected_channel']);
    return{results:videos.filter(v=>v.title===args[2])};
   }
   assert.equal(args[0],'channel-test');return{results:videos};
  }};
 };
 const calls=[];
 f.deps.fetchGoogle=async(url)=>{
  const q=new URL(url).searchParams;calls.push(q);
  const first=q.get('filters')==='video==video_test1';
  assert.equal(q.get('startDate'),first?'2026-09-01':'2026-09-15');
  assert.equal(q.get('endDate'),first?'2026-09-07':'2026-09-21');
  return Response.json({columnHeaders:[{name:'views'}],rows:[[first?13000:7000]]});
 };
 const result=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();
 assert.equal(result.status,'answered');assert.equal(result.metrics[0].change,6000);
 assert.equal(result.metrics.find(m=>m.key==='impressions').value,null);
 assert.equal(result.comparison.title,'Artist');assert.equal(result.scope.title,'Rohit');
 assert.match(result.insights[0],/Video A has 6,000 more/);assert.equal(calls.length,2);
 f.deps.fetchGoogle=async()=>Response.json({rows:[]});
 const empty=await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json();
 assert.equal(empty.metrics[0].value,null);assert.equal(empty.metrics[0].change,null);
 f.deps.fetchGoogle=async()=>new Response('',{status:403});
 assert.equal((await handleAnalyticsAssistant(request(),f.env,f.deps)).status,503);
});
test('video comparison requires both videos and validates the window',async()=>{
 for(const change of [{comparisonVideoQuery:null},{comparisonVideoQuery:'Artist',window:'arbitrary'}]){
  const f=await fixture({plan:{...plan,kind:'video_comparison',...change}});
  assert.equal((await(await handleAnalyticsAssistant(request(),f.env,f.deps)).json()).status,'clarification_required');assert.equal(f.calls(),0);
 }
});


test('planner receives only channel-scoped selected titles to resolve misspelled references',async()=>{
 const f=await fixture();
 f.deps.planAnalytics=async(question,context)=>{
  assert.deepEqual(context.selectedVideos,[{videoId:'video_test1',title:'Example video'}]);
  assert.doesNotMatch(JSON.stringify(context),/encrypted_credentials|test-access-token|connection-test/);
  return {...plan,videoQuery:'video_test1'};
 };
 const result=await(await handleAnalyticsAssistant(request({videoId:'video_test1'}),f.env,f.deps)).json();
 assert.equal(result.status,'answered');
 assert.deepEqual(f.bindings[1].values,['connection-test','UC_selected_channel','video_test1']);
});

test('Google baseline without a rows property means no data, not a service failure',async()=>{
 const f=await fixture({plan:{...plan,kind:'comparison'}});const original=f.deps.fetchGoogle;let n=0;
 f.deps.fetchGoogle=async(...args)=>n++===0?original(...args):Response.json({columnHeaders:[{name:'subscribersGained'}]});
 const response=await handleAnalyticsAssistant(request(),f.env,f.deps);
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.metrics[0].previous,null);
});

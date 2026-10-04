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
 const bindings=[];let providerCalls=0;
 const env={OPS_ENVIRONMENT:'staging',GOOGLE_OAUTH_CLIENT_ID:'test-client',GOOGLE_OAUTH_CLIENT_SECRET:'test-secret',ANALYTICS_TOKEN_ENCRYPTION_KEY:secret,DB:{prepare(sql){return{bind(...values){bindings.push({sql,values});return this;},async first(){return options.disconnected?null:connection;},async all(){return{results:options.videos??[{videoId:'video_test1',title:'Example video'}]};}};}}};
 const deps={now,planAnalytics:async()=>options.plan??plan,fetchGoogle:async(url,init)=>{providerCalls++;assert.equal(new URL(url).hostname,'youtubeanalytics.googleapis.com');assert.equal(new URL(url).searchParams.get('ids'),'channel==UC_selected_channel');assert.equal(init.headers.authorization,'Bearer test-access-token');return new Response(JSON.stringify(options.report??{columnHeaders:[{name:'subscribersLost'},{name:'subscribersGained'}],rows:[[12,87]]}),{status:options.httpStatus??200});}};
 return{env,deps,bindings,calls:()=>providerCalls};
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
test('assistant is analytics read only and does not authorize members',()=>{
 assert.deepEqual(policyForPath('/beta/api/analytics/assistant','POST'),['analytics','read']);
 assert.equal(policyForPath('/beta/api/analytics/assistant','GET'),null);
 assert.equal(capabilitiesForRole('member').includes('analytics:read'),false);
 assert.equal(capabilitiesForRole('editor').includes('analytics:read'),true);
});


test('explicit channel scope overrides a previously selected video',async()=>{
 const f=await fixture({plan:{...plan,scope:'channel',videoQuery:null}});
 const v=await(await handleAnalyticsAssistant(request({videoId:'video_test1'}),f.env,f.deps)).json();
 assert.equal(v.status,'answered');assert.equal(v.scope.videoId,null);
 assert.equal(f.bindings.length,1);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {encryptAnalyticsCredentials, decryptAnalyticsCredentials, analyticsSyncState, handleAnalyticsRequest} from '../src/analytics.ts';
import {syncSelectedAnalytics, recoverYouTubeSyncs, runYouTubeMaintenance} from '../src/analytics-sync.ts';
const now = new Date('2026-11-13T08:00:00.000Z');
const channelId = `UC${'a'.repeat(22)}`;
async function fixture() {
 const sqlite = new DatabaseSync(':memory:'); sqlite.exec('PRAGMA foreign_keys = ON');
 const root = new URL('../migrations/', import.meta.url);
 for(const name of JSON.parse(readFileSync(new URL('manifest.json',root))).wrangler_order) sqlite.exec(readFileSync(new URL(name,root),'utf8'));
 let largestBatch=0;
 const wrap=(sql,args=[])=>({bind:(...values)=>wrap(sql,values),first:async()=>sqlite.prepare(sql).get(...args)??null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>({success:true,meta:{changes:sqlite.prepare(sql).run(...args).changes}})});
 const DB={prepare:wrap,batch:async statements=>{largestBatch=Math.max(largestBatch,statements.length);for(const statement of statements)await statement.run();}};
 const key='test-recovery-encryption';
 const credentials=await encryptAnalyticsCredentials({accessToken:'test-access',refreshToken:'preserved-refresh',expiresAt:'2026-12-01T00:00:00Z'},key);
 sqlite.prepare("INSERT INTO analytics_provider_connections(id,environment,provider,status,created_at,updated_at) VALUES ('acon_test','staging','youtube','revoked',?,?)").run(now.toISOString(),now.toISOString());
 sqlite.prepare("INSERT INTO youtube_analytics_accounts(id,connection_id,youtube_channel_id,title,encrypted_credentials,granted_scopes_json,token_expires_at,status,created_at,updated_at) VALUES ('yaac_test','acon_test',?,'Test',?,'[]','2026-12-01','connected',?,?)").run(channelId,credentials,now.toISOString(),now.toISOString());
 sqlite.prepare("INSERT INTO youtube_analytics_channels(id,connection_id,youtube_channel_id,title,created_at,updated_at) VALUES ('ytch_test','acon_test',?,'Test',?,?)").run(channelId,now.toISOString(),now.toISOString());
 const env={DB,OPS_ENVIRONMENT:'staging',ANALYTICS_TOKEN_ENCRYPTION_KEY:key,GOOGLE_OAUTH_CLIENT_ID:'test',GOOGLE_OAUTH_CLIENT_SECRET:'test'};
 return {sqlite,env,credentials,largestBatch:()=>largestBatch};
}
function google(size=1) {
 let calls=0, videoInFlight=0, maxInFlight=0;
 const ids=Array.from({length:size},(_,i)=>'v'+String(i).padStart(10,'0'));
 return {calls:()=>calls,maxInFlight:()=>maxInFlight,fetchGoogle:async(input)=>{
  calls++; const url=new URL(input);
  if(url.pathname.endsWith('/channels'))return Response.json({items:[{contentDetails:{relatedPlaylists:{uploads:'test-uploads'}}}]});
  if(url.pathname.endsWith('/playlistItems')){const offset=Number(url.searchParams.get('pageToken')??0);return Response.json({items:ids.slice(offset,offset+50).map(videoId=>({contentDetails:{videoId}})),...(offset+50<size?{nextPageToken:String(offset+50)}:{})});}
  if(url.pathname.endsWith('/videos'))return Response.json({items:url.searchParams.get('id').split(',').map(id=>({id,snippet:{title:id,publishedAt:'2026-10-01'}}))});
  assert.equal(url.hostname,'youtubeanalytics.googleapis.com','background core must not call optional reach');
  const dimensions=url.searchParams.get('dimensions');
  const rows=dimensions==='day,video'?url.searchParams.get('filters').slice(7).split(',').map(id=>['2026-11-11',id,5]):dimensions==='day,subscribedStatus'?[['2026-11-11','SUBSCRIBED',5]]:[['2026-11-11',5]];
  if(dimensions==='day,video'){videoInFlight++;maxInFlight=Math.max(maxInFlight,videoInFlight);await new Promise(resolve=>setTimeout(resolve,1));videoInFlight--;}
  return Response.json({columnHeaders:[...dimensions.split(','),'views'].map(name=>({name})),rows});
 }};
}
const queue=(f,deps={})=>syncSelectedAnalytics(f.env,'youtube','2026-10-15','2026-11-12',{now:()=>now,...deps},channelId);
test('queue survives caller departure; large-channel recovery completes without changing the grant',async()=>{
 const f=await fixture(), api=google(2001);
 assert.equal((await queue(f,api)).status,'queued');await queue(f,api);
 assert.equal(api.calls(),0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM analytics_sync_runs').get().n,1);
 const result=await recoverYouTubeSyncs(f.env,now,api);assert.equal(result[0].status,'completed');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM youtube_analytics_videos').get().n,2001);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM youtube_video_daily_metrics').get().n,2001);
 assert.equal(api.maxInFlight(),1);assert(f.largestBatch()<=80);
 const row=f.sqlite.prepare('SELECT * FROM youtube_analytics_accounts').get();assert.equal(row.status,'connected');assert.equal(row.encrypted_credentials,f.credentials);
 assert.equal(f.sqlite.prepare('SELECT status FROM analytics_sync_runs').get().status,'completed');
 assert.deepEqual(await recoverYouTubeSyncs(f.env,now,api),[]);
});
test('an abandoned running job recovers automatically, preserves observations, and excludes active leases',async()=>{
 const f=await fixture();await queue(f);const api=google();
 f.sqlite.prepare("UPDATE analytics_sync_runs SET status='running',started_at=?,attempt_count=1").run('2026-11-11T13:05:19.600Z');
 f.sqlite.prepare("UPDATE youtube_analytics_accounts SET status='syncing',last_attempted_refresh_at=?").run('2026-11-11T13:05:19.600Z');
 const results=await Promise.all([recoverYouTubeSyncs(f.env,now,api),recoverYouTubeSyncs(f.env,now,api)]);
 assert.equal(results.flat().filter(r=>r.status==='completed').length,1);
 assert.equal(f.sqlite.prepare('SELECT attempt_count FROM analytics_sync_runs').get().attempt_count,2);
 assert.equal(f.sqlite.prepare('SELECT encrypted_credentials FROM youtube_analytics_accounts').get().encrypted_credentials,f.credentials);
 await queue(f);f.sqlite.prepare("UPDATE analytics_sync_runs SET status='running',started_at=?").run(now.toISOString());f.sqlite.prepare("UPDATE youtube_analytics_accounts SET status='syncing',last_attempted_refresh_at=?").run(now.toISOString());
 assert.deepEqual(await recoverYouTubeSyncs(f.env,new Date(now.getTime()+60_000),api),[]);
});
test('timeouts retry with backoff without expiring credentials, and stop after the bounded attempt limit',async()=>{
 const f=await fixture();await queue(f);
 const result=await recoverYouTubeSyncs(f.env,now,{fetchGoogle:async()=>{throw new DOMException('Timed out','TimeoutError');}});
 assert.equal(result[0].status,'retryable');assert.equal(result[0].errorCode,'sync_timeout');
 const row=f.sqlite.prepare('SELECT * FROM youtube_analytics_accounts').get();assert.equal(row.status,'provider_error');assert.equal(row.encrypted_credentials,f.credentials);
 assert.deepEqual(await recoverYouTubeSyncs(f.env,now,google()),[]);
 f.sqlite.exec("UPDATE analytics_sync_runs SET status='running',attempt_count=5,started_at='2026-11-01'; UPDATE youtube_analytics_accounts SET status='syncing',last_attempted_refresh_at='2026-11-01';");
 assert.deepEqual(await recoverYouTubeSyncs(f.env,now,google()),[]);
 assert.equal(f.sqlite.prepare('SELECT status FROM analytics_sync_runs').get().status,'failed');
 assert.equal((await queue(f)).status,'queued','manual retry remains available');
});
test('explicitly revoked grants are never retried or reactivated',async()=>{
 const f=await fixture();await queue(f);f.sqlite.exec("UPDATE youtube_analytics_accounts SET status='revoked';");const api=google();
 assert.deepEqual(await recoverYouTubeSyncs(f.env,now,api),[]);assert.equal(api.calls(),0);
 assert.equal(f.sqlite.prepare('SELECT status FROM youtube_analytics_accounts').get().status,'revoked');
});
test('status reports recovery separately from Google authorization',async()=>{
 const f=await fixture();await queue(f);
 const response=await handleAnalyticsRequest(new Request('https://test/beta/api/analytics/status'),f.env,{kind:'operator',operatorId:7,role:'admin',environment:'staging'},{now:()=>now});
 const dto=(await response.json()).connections.find(c=>c.provider==='youtube');assert.equal(dto.status,'connected');assert.equal(dto.sync.status,'queued');assert.equal(dto.sync.automaticRetry,true);assert(!JSON.stringify(dto).includes('encrypted_credentials'));
 const row={status:'syncing',last_attempted_refresh_at:'2026-11-11T13:05:19Z',last_successful_refresh_at:null,last_error_code:null};
 assert.equal(analyticsSyncState(row,null,now).status,'recovering');
 assert.equal(analyticsSyncState({...row,status:'expired'},null,now).status,'authorization_required');
});
test('recovery schedule does not start new research, GA4 or reach jobs',async()=>{
 const f=await fixture(),api=google();assert.deepEqual(await runYouTubeMaintenance(f.env,now,'*/5 * * * *',api),[]);assert.equal(api.calls(),0);
});

test('temporary token refresh failure retries without disconnecting and keeps refresh credentials',async()=>{
 const f=await fixture();
 const encrypted=await encryptAnalyticsCredentials({accessToken:'old-access',refreshToken:'preserved-refresh',expiresAt:'2026-10-01T00:00:00Z'},f.env.ANALYTICS_TOKEN_ENCRYPTION_KEY);
 f.sqlite.prepare('UPDATE youtube_analytics_accounts SET encrypted_credentials=?').run(encrypted);
 await queue(f);
 const first=await recoverYouTubeSyncs(f.env,now,{fetchGoogle:async()=>Response.json({error:'temporarily_unavailable'},{status:503})});
 assert.equal(first[0].status,'retryable');assert.equal(first[0].errorCode,'token_refresh_unavailable');
 let account=f.sqlite.prepare('SELECT * FROM youtube_analytics_accounts').get();assert.equal(account.status,'provider_error');assert.equal(account.encrypted_credentials,encrypted);
 const later=new Date('2026-11-13T09:00:00Z'),api=google();
 const second=await recoverYouTubeSyncs(f.env,later,{fetchGoogle:async(input,init)=>{
  if(new URL(input).hostname==='oauth2.googleapis.com') return Response.json({access_token:'new-access',expires_in:3600});
  assert.equal(f.sqlite.prepare('SELECT status FROM youtube_analytics_accounts').get().status,'syncing','token refresh must preserve lease');
  return api.fetchGoogle(input,init);
 }});
 assert.equal(second[0].status,'completed');account=f.sqlite.prepare('SELECT * FROM youtube_analytics_accounts').get();assert.equal(account.status,'connected');
 assert.equal((await decryptAnalyticsCredentials(account.encrypted_credentials,f.env.ANALYTICS_TOKEN_ENCRYPTION_KEY)).refreshToken,'preserved-refresh');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleAnalyticsInvestigations} from '../src/analytics-investigations.ts';
import {eraseUserHistory} from '../src/user-deletion.ts';
import {policyForPath} from '../src/auth/policy.ts';
const id='ainv_12345678-1234-4123-8123-123456789abc';
const messages=[{role:'user',content:'Compare two videos'},{role:'assistant',content:'Views: 13,000 versus 7,000. Difference: 6,000.'}];
function database(){
 const sqlite=new DatabaseSync(':memory:');const root=new URL('../migrations/',import.meta.url);
 for(const file of JSON.parse(readFileSync(new URL('manifest.json',root))).wrangler_order)sqlite.exec(readFileSync(new URL(file,root),'utf8'));
 for(const member of [901,902])sqlite.prepare("INSERT INTO member_users(id,email,role,lifecycle_state,pilot_cohort,office,created_at,updated_at) VALUES (?,?,'member','active','company','remote','2026-10-07','2026-10-07')").run(member,`saved-${member}@example.test`);
 const wrap=(sql,args=[])=>({bind:(...values)=>wrap(sql,values),first:async()=>sqlite.prepare(sql).get(...args)??null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>sqlite.prepare(sql).run(...args)});
 return{sqlite,prepare:wrap,batch:async statements=>{for(const s of statements)await s.run()}};
}
const request=(method='GET',suffix='',body)=>new Request(`https://example.test/beta/api/analytics/investigations${suffix}`,{method,...(body?{body:JSON.stringify(body)}:{})});
test('saved chats persist, update, isolate owners and erase with account history',async()=>{
 const db=database();const call=(method,suffix='',body,owner=901)=>handleAnalyticsInvestigations(request(method,suffix,body),db,owner);
 assert.equal((await call('POST','',{id,messages,memberId:902})).status,200);
 assert.deepEqual((await(await call('GET',`/${id}`)).json()).messages,messages);
 assert.equal((await call('GET',`/${id}`,undefined,902)).status,404);
 await call('DELETE',`/${id}`,undefined,902);assert.equal((await call('GET',`/${id}`)).status,200);
 await call('POST','',{id,messages:[...messages,{role:'user',content:'Follow up'}]});
 const listed=await(await call('GET')).json();assert.equal(listed.investigations.length,1);assert.doesNotMatch(JSON.stringify(listed),/member_id|901|example.test/);
 await call('POST','',{id,messages},902);await eraseUserHistory(db,'saved-901@example.test');
 assert.equal((await call('GET',`/${id}`)).status,404);assert.equal((await call('GET',`/${id}`,undefined,902)).status,200);
 await call('DELETE',`/${id}`,undefined,902);assert.equal((await call('GET',`/${id}`,undefined,902)).status,404);db.sqlite.close();
});
test('saved chat input and route methods are validated',async()=>{
 const db=database();
 for(const body of [{id,messages:[{role:'system',content:'bad'}]},{id:'wrong',messages},{id,messages:[]},{id,messages:[{role:'user',content:'x'.repeat(30001)}]}])assert.equal((await handleAnalyticsInvestigations(request('POST','',body),db,901)).status,400);
 assert.equal((await handleAnalyticsInvestigations(request('POST','',{id,messages:[{role:'user',content:'x'.repeat(100001)}]}),db,901)).status,413);
 assert.deepEqual(policyForPath('/beta/api/analytics/investigations','POST'),['analytics','read']);assert.equal(policyForPath(`/beta/api/analytics/investigations/${id}`,'POST'),null);db.sqlite.close();
});

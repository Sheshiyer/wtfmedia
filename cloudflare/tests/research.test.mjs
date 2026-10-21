import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleResearch} from '../src/research.ts';
import {policyForPath,decide} from '../src/auth/policy.ts';
function database(){
 const sqlite=new DatabaseSync(':memory:'); const root=new URL('../migrations/',import.meta.url);
 for(const name of JSON.parse(readFileSync(new URL('manifest.json',root))).wrangler_order)sqlite.exec(readFileSync(new URL(name,root),'utf8'));
 for(const id of [901,902])sqlite.prepare("INSERT INTO member_users(id,email,role,lifecycle_state,pilot_cohort,office,created_at,updated_at) VALUES (?,?,'member','active','company','remote','2026-10-13','2026-10-13')").run(id,`research-${id}@example.test`);
 const wrap=(sql,args=[])=>({bind:(...values)=>wrap(sql,values),first:async()=>sqlite.prepare(sql).get(...args)??null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}})});
 let batchTail=Promise.resolve();
 return {sqlite,prepare:wrap,batch:statements=>{const result=batchTail.then(async()=>{sqlite.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}});batchTail=result.catch(()=>{});return result;}};
}
function client(db,fetchRunner){const env={DB:db,OPS_ENVIRONMENT:'local',RESEARCH_RUNNER_URL:'http://localhost:8091',RESEARCH_RUNNER_TOKEN:'test-runner'};return async(method,path='',input,owner=901)=>handleResearch(new Request('https://example.test/beta/api/research'+path,{method,...(input?{body:JSON.stringify(input)}:{})}),env,owner,{fetchRunner:fetchRunner?async(input,init)=>new URL(input).pathname==='/health'?Response.json({configured:true}):fetchRunner(input,init):undefined});}
const emptyJob={status:'completed',sections:[{key:'snacks',title:'Snacks',content:'No supported evidence was found.',status:'partial'}],sources:[],messages:[],progress:['Finished'],warnings:['Evidence unavailable'],clarification:null,cost:{toolMicro:0,modelUsd:null}};
test('research policy admits all roles only through explicit routes',()=>{
 for(const role of ['member','editor','admin','super_admin'])assert.equal(decide(role,'research','write'),true);
 assert.deepEqual(policyForPath('/beta/api/research','POST'),['research','write']);
 assert.equal(policyForPath('/beta/api/research/arbitrary','GET'),null);
});
test('research briefs are private, versioned, optimistic and shared read-only without notes',async()=>{
 const db=database();const call=client(db,async(input,init)=>accepted(input,init));
 const res=await call('POST','',{title:'Example founder',notes:'Private interview notes',notesApproved:true});assert.equal(res.status,201);
 let {brief}=await res.json(); const path='/'+brief.id;
 assert.equal((await call('GET',path,undefined,902)).status,404);
 assert.equal((await call('GET',path+'/versions/1',undefined,902)).status,404);
 // Cancel queued run before editing.
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 let saved=await call('PATCH',path,{revision:brief.revision,shared:true,title:'Updated title'});assert.equal(saved.status,200);
 assert.equal((await call('PATCH',path,{revision:brief.revision,title:'Lost edit'})).status,409);
 const shared=await(await call('GET',path,undefined,902)).json();assert.equal(shared.brief.canEdit,false);assert.equal(shared.brief.notes,'');assert.deepEqual(shared.brief.messages,[]);
 assert.equal((await call('DELETE',path,undefined,902)).status,404);
 assert.equal((await call('POST',path+'/chat',{question:'read notes'},902)).status,404);
 assert.equal((await call('POST',path+'/restore',{revision:shared.brief.revision,version:1},902)).status,404);
 assert.equal((await call('DELETE',path)).status,200);assert.equal((await call('GET',path)).status,404);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_versions').get().n,0);db.sqlite.close();
});
test('research validates configuration, notes consent, payload size and provider data',async()=>{
 const db=database();const call=client(db,async(input,init)=>accepted(input,init));
 assert.equal((await call('POST','',{title:'X',notes:'secret',notesApproved:false})).status,400);
 assert.equal((await call('POST','',{title:'X'.repeat(201)})).status,400);
 assert.equal((await call('POST','',{title:'X',notes:'a'.repeat(150001)})).status,413);
 const unconfigured=await handleResearch(new Request('https://e.test/beta/api/research',{method:'POST',body:JSON.stringify({title:'XX'})}),{DB:db},901);assert.equal(unconfigured.status,503);
 let brief=(await(await call('POST','',{title:'Public founder'})).json()).brief;
 const poll=client(db,async()=>Response.json({...emptyJob,id:'wrong',sources:[{id:'s1',url:'javascript:alert(1)',title:'bad',excerpt:'bad',retrievedAt:new Date().toISOString()}]}));
 assert.equal((await poll('GET','/'+brief.id)).status,502);db.sqlite.close();
});
test('terminal runner results save once and cannot overwrite a cancellation',async()=>{
 const db=database();const call=client(db,async(input,init)=>accepted(input,init));
 const created=(await(await call('POST','',{title:'Public founder'})).json()).brief;
 const poll=client(db,async(input)=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));
 const first=(await(await poll('GET','/'+created.id)).json()).brief;
 assert.equal(first.status,'partial');assert.equal(first.sections[0].content,emptyJob.sections[0].content);
 const again=(await(await poll('GET','/'+created.id)).json()).brief;assert.equal(again.revision,first.revision);
 let calls=0;const slow=client(db,async input=>{calls++;await call('POST','/'+created.id+'/cancel',{});return Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()});});
 await call('POST','/'+created.id+'/run',{revision:first.revision});
 await slow('GET','/'+created.id);
 const cancelled=(await(await call('GET','/'+created.id)).json()).brief;assert.equal(cancelled.status,'cancelled');assert.equal(calls,1);db.sqlite.close();
});
const accepted=(input,init)=>new URL(input).pathname.endsWith('/cancel')?Response.json({id:new URL(input).pathname.split('/').at(-2),status:'cancelled'}):Response.json({id:init?.body?JSON.parse(init.body).id:new URL(input).pathname.split('/').pop(),status:'queued'});
test('polling is version-stable, retry payload is identical, all historical run receipts remain',async()=>{
 const db=database();let submitted=[];let unavailable=true;
 const call=client(db,async(input,init)=>{
  if(init.method==='POST'){submitted.push(JSON.parse(init.body));if(unavailable)return new Response('',{status:503});return accepted(input,init);}
  return Response.json({id:new URL(input).pathname.split('/').pop(),status:'running',progress:['Searching public sources']});
 });
 let brief=(await(await call('POST','',{title:'Founder',notes:'Private',notesApproved:true})).json()).brief;const path='/'+brief.id;
 unavailable=false;let polled=(await(await call('GET',path)).json()).brief;
 assert.deepEqual(submitted[0],submitted[1]);assert.equal(polled.revision,brief.revision);assert.deepEqual(polled.progress,['Searching public sources']);
 await call('GET',path);assert.equal(submitted.length,2);
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),cost:{toolMicro:15,modelUsd:null}}));
 brief=(await(await complete('GET',path)).json()).brief;assert.equal(brief.cost.toolMicro,15);
 brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;
 brief=(await(await complete('GET',path)).json()).brief;assert.equal(brief.cost.toolMicro,30);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_runs WHERE brief_id=?').get(brief.id).n,2);
 assert.equal((await complete('GET',path)).status,200);db.sqlite.close();
});
test('deletion blocks a concurrent new run and retries every historical remote erasure',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 let rejected;let fail=true;const deleted=[];
 const remove=client(db,async(input,init)=>{
  if(init.method==='DELETE'){
   const revision=db.sqlite.prepare('SELECT revision FROM research_briefs WHERE id=?').get(brief.id).revision;
   rejected=await call('POST',path+'/run',{revision});deleted.push(input);
   if(fail)return new Response('',{status:503});
  }
  return Response.json({});
 });
 assert.equal((await remove('DELETE',path)).status,503);assert.equal(rejected.status,409);
 assert.equal((await call('PATCH',path,{revision:brief.revision,title:'No resurrection'})).status,409);
 fail=false;assert.equal((await remove('DELETE',path)).status,200);assert.equal(deleted.length,2);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_runs').get().n,0);db.sqlite.close();
});
test('chat completion cannot overwrite newer edits and saved versions restore without rollback of sharing',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));brief=(await(await complete('GET',path)).json()).brief;
 const slow=client(db,async()=>{
  assert.equal((await call('PATCH',path,{revision:brief.revision,title:'New title',shared:true})).status,200);
  return Response.json({answer:'Old answer',cost:{toolMicro:0,modelUsd:null}});
 });
 assert.equal((await slow('POST',path+'/chat',{question:'What changed?'})).status,409);
 brief=(await(await call('GET',path)).json()).brief;assert.deepEqual(brief.messages,[]);
 const restored=await call('POST',path+'/restore',{revision:brief.revision,version:1});assert.equal(restored.status,200);
 brief=(await restored.json()).brief;assert.equal(brief.title,'Founder');assert.equal(brief.shared,true);assert.equal(brief.status,'draft');
 db.sqlite.prepare("UPDATE member_users SET deletion_state='pending' WHERE id=901").run();
 assert.throws(()=>db.sqlite.prepare('UPDATE research_briefs SET revision=revision+1 WHERE id=?').run(brief.id),/deleted user/);
 assert.equal((await call('POST','',{title:'No resurrection'})).status,503);db.sqlite.close();
});
test('only safe configured origins and bounded provider responses are accepted',async()=>{
 const {researchConfigured,researchRunner}=await import('../src/research-runner.ts');
 assert.equal(researchConfigured({RESEARCH_RUNNER_URL:'http://example.com',RESEARCH_RUNNER_TOKEN:'x'}),false);
 assert.equal(researchConfigured({RESEARCH_RUNNER_URL:'https://user:pass@example.com',RESEARCH_RUNNER_TOKEN:'x'}),false);
 assert.equal(researchConfigured({RESEARCH_RUNNER_URL:'https://example.com',RESEARCH_RUNNER_TOKEN:'x'}),true);
 assert.equal(researchConfigured({OPS_ENVIRONMENT:'staging',DEPLOYMENT_ENVIRONMENT:'local',RESEARCH_RUNNER_URL:'http://127.0.0.1:8080',RESEARCH_RUNNER_TOKEN:'x'}),true);
 assert.equal(researchConfigured({OPS_ENVIRONMENT:'staging',DEPLOYMENT_ENVIRONMENT:'staging',RESEARCH_RUNNER_URL:'http://127.0.0.1:8080',RESEARCH_RUNNER_TOKEN:'x'}),false);
 assert.equal(researchConfigured({OPS_ENVIRONMENT:'staging',DEPLOYMENT_ENVIRONMENT:'local',RESEARCH_RUNNER_URL:'http://example.com',RESEARCH_RUNNER_TOKEN:'x'}),false);
 await assert.rejects(()=>researchRunner({RESEARCH_RUNNER_URL:'https://example.com',RESEARCH_RUNNER_TOKEN:'x'},'/jobs','GET',undefined,async()=>new Response('a'.repeat(1200001))),e=>e.status===502);
});
test('runner JSON boundary accepts nullable Python DTO fields and supported section statuses',async()=>{
 const {validatedResult}=await import('../src/research-contract.ts');
 const source={id:'source_1',title:'Source',url:'https://example.com/report',excerpt:'a'.repeat(12000),retrievedAt:'2026-10-13T00:00:00Z',publisher:null,publishedAt:null,kind:null,timestampSeconds:null};
 const result=validatedResult({...emptyJob,id:'rrun_test',sources:[source],sections:[{key:'main',title:'Main',content:'c'.repeat(24000),status:'cancelled'}]},'rrun_test');
 assert.equal(result.status,'partial');assert.equal(result.sources[0].excerpt.length,12000);assert.equal('timestampSeconds' in result.sources[0],false);
 assert.throws(()=>validatedResult({...emptyJob,id:'rrun_test',sources:[{...source,excerpt:'a'.repeat(12001)}]},'rrun_test'),e=>e.status===502);
 assert.deepEqual(validatedResult({id:'rrun_test',status:'running',progress:['Working']},'rrun_test'),{status:'running',progress:['Working']});
});
test('runner readiness blocks creation and permanent submit rejection does not queue forever',async()=>{
 const db=database();const env={DB:db,OPS_ENVIRONMENT:'local',RESEARCH_RUNNER_URL:'http://localhost:8091',RESEARCH_RUNNER_TOKEN:'x'};
 const response=await handleResearch(new Request('https://example.test/beta/api/research',{method:'POST',body:JSON.stringify({title:'Founder'})}),env,901,{fetchRunner:async()=>Response.json({configured:false})});
 assert.equal(response.status,503);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_briefs').get().n,0);
 const call=client(db,async()=>new Response('',{status:422}));assert.equal((await call('POST','',{title:'Founder'})).status,502);
 assert.equal(JSON.parse(db.sqlite.prepare('SELECT document_json FROM research_briefs').get().document_json).status,'failed');db.sqlite.close();
});
test('chat sends only the bounded recent conversation to the Python runner',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));brief=(await(await complete('GET',path)).json()).brief;
 const doc={...brief,messages:Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'a'.repeat(7000)}))};delete doc.canEdit;
 db.sqlite.prepare('UPDATE research_briefs SET document_json=? WHERE id=?').run(JSON.stringify(doc),brief.id);
 let sent;const chat=client(db,async(input,init)=>{sent=JSON.parse(init.body);return Response.json({answer:'Answer',cost:{toolMicro:1,modelUsd:0.01}});});
 assert.equal((await chat('POST',path+'/chat',{question:'What changed?'})).status,200);assert.equal(sent.messages.length,12);assert.ok(sent.messages.every(m=>m.content.length===6000));
 assert.equal((await chat('POST',path+'/chat',{question:'a'.repeat(2001)})).status,400);db.sqlite.close();
});
test('database admission limits each owner to three active jobs atomically',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const results=await Promise.all(Array.from({length:4},(_,i)=>call('POST','',{title:'Founder '+i})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,201,201,429]);
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM research_briefs WHERE json_extract(document_json,'$.status') IN ('queued','running')").get().n,3);
 assert.equal((await call('POST','',{title:'Other owner'},902)).status,201);
 const id=db.sqlite.prepare("SELECT id FROM research_briefs WHERE member_id=901 AND json_extract(document_json,'$.status')='queued' LIMIT 1").get().id;
 await call('POST','/'+id+'/cancel',{});assert.equal((await call('POST','',{title:'Next research'})).status,201);db.sqlite.close();
});
test('failed cancellation stays pending, blocks new jobs, then records final costs once',async()=>{
 const db=database();let failing=true;let submissions=0;
 const call=client(db,async(input,init)=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/cancel'))return failing?new Response('',{status:503}):accepted(input,init);
  if(init.method==='POST'){submissions++;return accepted(input,init);}
  return Response.json({...emptyJob,id:url.pathname.split('/').pop(),status:'cancelled',cost:{toolMicro:23,modelUsd:0.12}});
 });
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;assert.equal(brief.cost.modelUsd,0);const path='/'+brief.id;
 assert.equal((await call('POST',path+'/cancel',{})).status,503);
 brief=(await(await call('GET',path)).json()).brief;assert.equal(brief.status,'cancel_pending');assert.match(brief.warnings[0],/may still be running/);
 assert.equal((await call('POST',path+'/run',{revision:brief.revision})).status,503);assert.equal(submissions,1);
 failing=false;brief=(await(await call('GET',path)).json()).brief;assert.equal(brief.status,'cancelled');assert.deepEqual(brief.cost,{toolMicro:23,modelUsd:0.12});
 brief=(await(await call('GET',path)).json()).brief;assert.equal(brief.cost.toolMicro,23);
 assert.equal((await call('POST',path+'/run',{revision:brief.revision})).status,200);assert.equal(submissions,2);db.sqlite.close();
});
test('episode IDs are exact YouTube IDs and admission rejection leaves no draft',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 for(const episodeId of ['short','https://youtube.com/watch?v=abcdefghijk','abcdefghij!']){
  const r=await call('POST','',{title:'Founder',episodeId});assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_episode_id');
 }
 let first;
 for(let i=0;i<3;i++){const r=await call('POST','',{title:'Founder '+i,episodeId:'abcdefghijk'});assert.equal(r.status,201);first??=(await r.json()).brief;}
 for(let i=0;i<3;i++)assert.equal((await call('POST','',{title:'Over limit'})).status,429);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_briefs').get().n,3);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_versions').get().n,6);
 await call('POST','/'+first.id+'/cancel',{});
 first=(await(await call('GET','/'+first.id)).json()).brief;
 assert.equal((await call('PATCH','/'+first.id,{revision:first.revision,episodeId:'invalid'})).status,400);db.sqlite.close();
});
test('starting a replacement retries pending cancellation before submitting; chat timeout is explicit',async()=>{
 const db=database();let failing=true;const events=[];
 const call=client(db,async(input,init)=>{
  const path=new URL(input).pathname;events.push(init.method+' '+path);
  if(path.endsWith('/cancel'))return failing?new Response('',{status:503}):accepted(input,init);
  if(init.method==='GET')return Response.json({...emptyJob,id:path.split('/').pop(),status:'cancelled',cost:{toolMicro:5,modelUsd:0.02}});
  return accepted(input,init);
 });
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 await call('POST',path+'/cancel',{});brief=JSON.parse(db.sqlite.prepare('SELECT document_json FROM research_briefs').get().document_json);
 failing=false;events.length=0;const result=await call('POST',path+'/run',{revision:brief.revision});assert.equal(result.status,200);assert.equal((await result.json()).brief.cost.modelUsd,0.02);
 assert.match(events[0],/\/cancel$/);assert.match(events[1],/^GET /);assert.equal(events[2],'POST /jobs');
 const {researchRunner}=await import('../src/research-runner.ts');let attempts=0;
 await assert.rejects(()=>researchRunner({RESEARCH_RUNNER_URL:'https://example.com',RESEARCH_RUNNER_TOKEN:'x'},'/chat','POST',{},async()=>{attempts++;throw new DOMException('timeout','TimeoutError');}),e=>e.status===504&&e.code==='research_chat_timeout');assert.equal(attempts,1);db.sqlite.close();
});
test('pending cancellation and unconfirmed deletion continue to consume admission slots',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));const ids=[];
 for(let i=0;i<3;i++)ids.push((await(await call('POST','',{title:'Founder '+i})).json()).brief.id);
 const unavailable=client(db,async()=>new Response('',{status:503}));
 assert.equal((await unavailable('POST','/'+ids[0]+'/cancel',{})).status,503);
 assert.equal((await unavailable('DELETE','/'+ids[1])).status,503);
 assert.equal((await call('POST','',{title:'Still over limit'})).status,429);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_briefs').get().n,3);
 assert.equal((await call('DELETE','/'+ids[1])).status,200);
 assert.equal((await call('POST','',{title:'Slot released'})).status,201);db.sqlite.close();
});
test('cancel retries after a lost response never replay costs or mutate terminal versions',async()=>{
 const db=database();let cancellations=0;let receipts=0;
 const call=client(db,async(input,init)=>{
  const path=new URL(input).pathname;
  if(path.endsWith('/cancel')){cancellations++;return accepted(input,init);}
  if(init.method==='GET'){receipts++;return Response.json({...emptyJob,id:path.split('/').pop(),status:'cancelled',cost:{toolMicro:31,modelUsd:0.14}});}
  return accepted(input,init);
 });
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+created.id;
 // The first response is lost to the caller; its committed outcome must still be final.
 await call('POST',path+'/cancel',{});
 const before=db.sqlite.prepare('SELECT revision,current_run_id,document_json FROM research_briefs WHERE id=?').get(created.id);
 assert.equal(before.current_run_id,null);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_runs WHERE brief_id=?').get(created.id).n,1);
 for(let i=0;i<3;i++){
  const response=await call('POST',path+'/cancel',{});assert.equal(response.status,200);
  const brief=(await response.json()).brief;assert.deepEqual(brief.cost,{toolMicro:31,modelUsd:0.14});assert.equal(brief.revision,before.revision);
 }
 assert.equal(cancellations,1);assert.equal(receipts,1);
 const terminal={...JSON.parse(before.document_json),status:'completed'};
 db.sqlite.prepare('UPDATE research_briefs SET document_json=? WHERE id=?').run(JSON.stringify(terminal),created.id);
 const repeated=(await(await call('POST',path+'/cancel',{})).json()).brief;
 assert.equal(repeated.status,'completed');assert.deepEqual(repeated.cost,terminal.cost);assert.equal(repeated.revision,before.revision);assert.equal(cancellations,1);db.sqlite.close();
});
test('runner outages return fresh cached briefs without persisting transient warnings',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+created.id;
 const outage=client(db,async()=>new Response('',{status:503}));
 const response=await outage('GET',path);assert.equal(response.status,200);let brief=(await response.json()).brief;
 assert.equal(brief.revision,created.revision);assert.match(brief.warnings.at(-1),/temporarily unavailable/);
 assert.deepEqual(JSON.parse(db.sqlite.prepare('SELECT document_json FROM research_briefs').get().document_json).warnings,[]);
 const cancelDuringPoll=client(db,async()=>{await call('POST',path+'/cancel',{});return new Response('',{status:503});});
 brief=(await(await cancelDuringPoll('GET',path)).json()).brief;assert.equal(brief.status,'cancelled');
 await call('POST',path+'/run',{revision:brief.revision});
 const deleteDuringPoll=client(db,async()=>{await call('DELETE',path);return new Response('',{status:503});});
 assert.equal((await deleteDuringPoll('GET',path)).status,404);db.sqlite.close();
});
test('cancellation keeps validated work even when the job completes before cancel arrives',async()=>{
 const db=database();const source={id:'s1',title:'Report',url:'https://example.com/report',excerpt:'Evidence',retrievedAt:'2026-10-13T00:00:00Z'};
 const sections=['snacks','appetizers','main','desserts'].map(key=>({key,title:key,content:'Completed work',status:'completed'}));
 const call=client(db,async(input,init)=>{
  const path=new URL(input).pathname;
  if(path.endsWith('/cancel'))return Response.json({id:path.split('/').at(-2),status:'completed'});
  if(init.method==='GET')return Response.json({...emptyJob,id:path.split('/').pop(),sections,sources:[source],progress:['Finished sections'],cost:{toolMicro:9,modelUsd:0.03}});
  return accepted(input,init);
 });
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;
 const brief=(await(await call('POST','/'+created.id+'/cancel',{})).json()).brief;
 assert.deepEqual(brief.sections,sections);assert.deepEqual(brief.sources,[source]);assert.deepEqual(brief.progress,['Finished sections']);assert.equal(brief.cost.modelUsd,0.03);db.sqlite.close();
});
test('historical section clarification resumes as a full report without reusing old sources',async()=>{
 const db=database();const submitted=[];const call=client(db,async(input,init)=>{if(init.method==='POST'&&!new URL(input).pathname.endsWith('/cancel'))submitted.push(JSON.parse(init.body));return accepted(input,init);});
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;
 const run=db.sqlite.prepare('SELECT run_id,payload_json FROM research_runs ORDER BY rowid DESC LIMIT 1').get();
 db.sqlite.prepare('UPDATE research_runs SET payload_json=? WHERE run_id=?').run(JSON.stringify({...JSON.parse(run.payload_json),section:'main'}),run.run_id);
 const clarification=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),status:'clarification',clarification:'Which industry?'}));
 brief=(await(await clarification('GET',path)).json()).brief;
 assert.equal((await call('POST',path+'/run',{revision:brief.revision,clarification:'Technology'})).status,200);
 assert.equal(submitted.at(-1).section,null);assert.deepEqual(submitted.at(-1).sections,[]);assert.deepEqual(submitted.at(-1).sources,[]);assert.equal(submitted.at(-1).clarification,'Technology');db.sqlite.close();
});
test('Unicode four-section edits fit the PATCH envelope while POST and oversized PATCH remain bounded',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 const input={revision:brief.revision,notes:'文'.repeat(12000),notesApproved:true,sections:['snacks','appetizers','main','desserts'].map(key=>({key,title:key,content:'文'.repeat(24000),status:'completed'}))};
 assert.ok(new TextEncoder().encode(JSON.stringify(input)).length>150000);
 assert.equal((await call('PATCH',path,input)).status,200);
 assert.equal((await call('POST','',{...input,title:'Another founder'})).status,413);
 assert.equal((await call('PATCH',path,{padding:'a'.repeat(500001)})).status,413);db.sqlite.close();
});

test('runner uses Workers-supported manual redirects and rejects redirect responses',async()=>{
 const {researchRunner}=await import('../src/research-runner.ts');
 const env={RESEARCH_RUNNER_URL:'https://runner.example',RESEARCH_RUNNER_TOKEN:'test'};
 assert.deepEqual(await researchRunner(env,'/health','GET',undefined,async(_url,init)=>{assert.equal(init.redirect,'manual');return Response.json({configured:true});}),{configured:true});
 await assert.rejects(()=>researchRunner(env,'/health','GET',undefined,async()=>new Response(null,{status:302,headers:{location:'https://other.example'}})),e=>e.status===503);
});

test('visible version history excludes draft and running bookkeeping snapshots',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;
 const path='/'+created.id;
 assert.deepEqual((await(await call('GET',path)).json()).versions,[]);
 // Use the submitted run ID, not the brief ID.
 const run=db.sqlite.prepare('SELECT current_run_id FROM research_briefs WHERE id=?').get(created.id).current_run_id;
 const finished=client(db,async()=>Response.json({...emptyJob,id:run}));
 const result=await(await finished('GET',path)).json();
 assert.equal(result.versions.length,1);
 assert.equal(result.versions[0].revision,result.brief.revision);
 assert.equal((await(await finished('GET',path)).json()).versions.length,1);
 db.sqlite.close();
});

const researchInput={guestName:'दीपिंदर गोयल',companyName:'Zomato',industry:'Food delivery',audienceCountry:'IN'};
const metadata={
 coverage:[{channel:'reddit',status:'found',sourceCount:1,method:'web_search'},{channel:'instagram',status:'unavailable',sourceCount:0,method:'web_search'}],
 modelInfo:{service:'omniroute',requestedModel:'research-route',reportedModel:'vendor/model-v2'},
 failure:{stage:'desserts',code:'output_truncated',retryable:true},
};

test('V2 create derives a bounded title and durably retries all trimmed structured inputs',async()=>{
 const db=database();const submitted=[];let unavailable=true;
 const call=client(db,async(input,init)=>{
  if(init.method==='POST'){submitted.push(JSON.parse(init.body));if(unavailable)return new Response('',{status:503});return accepted(input,init);}
  return Response.json({id:new URL(input).pathname.split('/').pop(),status:'running',progress:[]});
 });
 const response=await call('POST','',{schemaVersion:2,researchInput:{...researchInput,guestName:'  '+researchInput.guestName+'  '}});
 assert.equal(response.status,201);const {brief}=await response.json();
 assert.equal(brief.schemaVersion,2);assert.deepEqual(brief.researchInput,researchInput);assert.ok(brief.title.includes('Zomato'));assert.ok(brief.title.length<=200);
 assert.deepEqual(submitted[0].researchInput,researchInput);assert.equal(submitted[0].schemaVersion,2);assert.equal(submitted[0].budgetMicro,5000000);
 unavailable=false;await call('GET','/'+brief.id);assert.deepEqual(submitted[1],submitted[0]);
 const version=await(await call('GET','/'+brief.id+'/versions/1')).json();assert.deepEqual(version.brief.researchInput,researchInput);
 assert.equal((await call('GET','/'+brief.id,undefined,902)).status,404);
 const long={guestName:'名'.repeat(120),companyName:'社'.repeat(120),industry:'業'.repeat(120),audienceCountry:'IN'};
 const second=await call('POST','',{schemaVersion:2,researchInput:long});assert.equal(second.status,201);
 const longBrief=(await second.json()).brief;assert.ok(longBrief.title.length<=200);assert.deepEqual(longBrief.researchInput,long);db.sqlite.close();
});

test('V2 inputs fail closed before writes, including consent, malformed fields and audience tampering',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const invalid=[{schemaVersion:2,title:'Legacy title'}, {schemaVersion:3,title:'Legacy title'},
  ...['guestName','companyName','industry'].flatMap(field=>[null,12,'x','x'.repeat(121)].map(value=>({schemaVersion:2,researchInput:{...researchInput,[field]:value}}))),
  ...['US',null,undefined].map(audienceCountry=>({schemaVersion:2,researchInput:{...researchInput,audienceCountry}})),
  {schemaVersion:2,researchInput,notes:'Private notes',notesApproved:false},
 ];
 for(const input of invalid)assert.equal((await call('POST','',input)).status,400,JSON.stringify(input));
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_briefs').get().n,0);
 assert.equal((await call('POST','',{title:'Legacy research'})).status,201);db.sqlite.close();
});

test('structured edits survive restore and full rerun; chat uses saved input only with owner and revision fencing',async()=>{
 const db=database();const payloads=[];const call=client(db,async(input,init)=>{if(init?.body)payloads.push(JSON.parse(init.body));return accepted(input,init);});
 let response=await call('POST','',{schemaVersion:2,researchInput});assert.equal(response.status,201);
 let brief=(await response.json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),...metadata}));
 brief=(await(await complete('GET',path)).json()).brief;const originalVersion=brief.revision;
 const updated={...researchInput,industry:'Restaurant technology'};
 assert.equal((await call('PATCH',path,{revision:brief.revision,researchInput:updated},902)).status,404);
 response=await call('PATCH',path,{revision:brief.revision,researchInput:updated});assert.equal(response.status,200);brief=(await response.json()).brief;
 assert.deepEqual(brief.researchInput,updated);assert.ok(brief.title.includes(updated.industry));
 assert.equal((await call('PATCH',path,{revision:originalVersion,researchInput})).status,409);
 assert.equal((await call('PATCH',path,{revision:brief.revision,researchInput:null})).status,400);
 let chatPayload;const chat=client(db,async(_input,init)=>{chatPayload=JSON.parse(init.body);return Response.json({answer:'Saved research scope',cost:{toolMicro:0,modelUsd:null}});});
 assert.equal((await chat('POST',path+'/chat',{question:'What could a young founder build?'})).status,409);assert.equal(chatPayload,undefined);
 response=await call('POST',path+'/run',{revision:brief.revision});assert.equal(response.status,200);brief=(await response.json()).brief;
 assert.deepEqual(payloads.at(-1).researchInput,updated);assert.equal(payloads.at(-1).section,null);assert.deepEqual(payloads.at(-1).sections,[]);assert.deepEqual(payloads.at(-1).sources,[]);
 for(const key of ['coverage','modelInfo','failure'])assert.equal(key in brief,false,'old run '+key);
 brief=(await(await complete('GET',path)).json()).brief;
 response=await chat('POST',path+'/chat',{question:'What could a young founder build?',researchInput:{...researchInput,audienceCountry:'US'}});assert.equal(response.status,200);brief=(await response.json()).brief;
 assert.deepEqual(chatPayload.researchInput,updated);
 for(const key of ['schemaVersion','coverage','modelInfo','failure','id','revision','shared','needsResearch'])assert.equal(key in chatPayload,false,key);
 brief=(await(await call('POST',path+'/restore',{revision:brief.revision,version:originalVersion})).json()).brief;
 assert.deepEqual(brief.researchInput,researchInput);assert.deepEqual(brief.modelInfo,metadata.modelInfo);db.sqlite.close();
});

test('new section-specific public runs are rejected without provider calls or changing saved work',async()=>{
 const db=database();let calls=0;const call=client(db,async(...args)=>{calls++;return accepted(...args);});
 let brief=(await(await call('POST','',{title:'Legacy founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 const before=db.sqlite.prepare('SELECT document_json FROM research_briefs WHERE id=?').get(brief.id).document_json;calls=0;
 for(const section of ['main','snacks','unknown',null]){
  const res=await call('POST',path+'/run',{revision:brief.revision,section});assert.equal(res.status,400);
 }
 assert.equal(calls,0);assert.equal(db.sqlite.prepare('SELECT document_json FROM research_briefs WHERE id=?').get(brief.id).document_json,before);
 assert.equal((await call('POST',path+'/run',{revision:brief.revision})).status,200);db.sqlite.close();
});

test('active and terminal receipts persist safe diagnostics without metadata-only report versions',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const created=(await(await call('POST','',{title:'Legacy founder'})).json()).brief;const path='/'+created.id;
 const run=db.sqlite.prepare('SELECT current_run_id FROM research_briefs WHERE id=?').get(created.id).current_run_id;
 const poll=client(db,async()=>Response.json({id:run,status:'running',progress:['Discovery'],...metadata,member_id:902}));
 let result=await(await poll('GET',path)).json();assert.deepEqual(result.brief.coverage,metadata.coverage);assert.deepEqual(result.brief.modelInfo,metadata.modelInfo);assert.deepEqual(result.brief.failure,metadata.failure);
 assert.equal(result.brief.revision,created.revision);assert.deepEqual(result.versions,[]);assert.equal('member_id' in result.brief,false);
 const terminal=client(db,async()=>Response.json({...emptyJob,id:run,status:'partial',...metadata,sections:[...emptyJob.sections,{key:'desserts',title:'Desserts',content:'',status:'failed',failure:metadata.failure}]}));
 result=await(await terminal('GET',path)).json();assert.deepEqual(result.brief.sections[1].failure,metadata.failure);assert.equal(result.brief.cost.modelUsd,null);
 const reopened=await(await call('GET',path)).json();assert.deepEqual(reopened.brief.modelInfo,metadata.modelInfo);assert.equal(reopened.versions.length,1);
 const shared=(await(await call('PATCH',path,{revision:reopened.brief.revision,shared:true})).json()).brief;
 assert.deepEqual((await(await call('GET',path,undefined,902)).json()).brief.coverage,metadata.coverage);
 assert.equal((await call('GET',path+'/versions/'+shared.revision,undefined,902)).status,404);db.sqlite.close();
});

test('cancel terminal receipts retain diagnostics and clear prior failure on successful replacement',async()=>{
 const db=database();const call=client(db,async(input,init)=>init.method==='GET'?Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),status:'cancelled',...metadata}):accepted(input,init));
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 assert.deepEqual(brief.failure,metadata.failure);assert.deepEqual(brief.modelInfo,metadata.modelInfo);assert.deepEqual(brief.coverage,metadata.coverage);
 brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;assert.equal('failure' in brief,false);db.sqlite.close();
});

test('runner transport failures expose safe categories without response bodies or credentials',async()=>{
 const {researchRunner}=await import('../src/research-runner.ts');
 const env={RESEARCH_RUNNER_URL:'https://runner.example',RESEARCH_RUNNER_TOKEN:'fixture-credential'};
 for(const [status,code,retryable] of [[401,'authentication',false],[403,'authentication',false],[429,'rate_limit',true],[503,'provider_unavailable',true],[422,'invalid_output',false]]){
  await assert.rejects(()=>researchRunner(env,'/jobs','GET',undefined,async()=>new Response('Bearer fixture-credential private-title',{status})),e=>{
   assert.deepEqual(e.failure,{stage:'runner',code,retryable});assert.doesNotMatch(JSON.stringify(e),/fixture-credential|private-title/);return true;
  });
 }
 await assert.rejects(()=>researchRunner(env,'/jobs','GET',undefined,async()=>{throw new DOMException('private-title','TimeoutError');}),e=>{
  assert.deepEqual(e.failure,{stage:'runner',code:'timeout',retryable:true});return true;
 });
});

test('safe transport failures reach the API while transient poll diagnostics do not mutate saved versions',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+created.id;
 const outage=client(db,async()=>new Response('private-provider-body',{status:429}));
 const response=await outage('GET',path);assert.equal(response.status,200);const {brief,versions}=await response.json();
 assert.deepEqual(brief.failure,{stage:'runner',code:'rate_limit',retryable:true});assert.deepEqual(versions,[]);assert.equal(brief.revision,created.revision);
 assert.equal('failure' in JSON.parse(db.sqlite.prepare('SELECT document_json FROM research_briefs').get().document_json),false);
 const reject=client(db,async()=>new Response('private-provider-body',{status:422}));
 const failed=await reject('POST','',{title:'Other founder'});assert.equal(failed.status,502);
 assert.deepEqual((await failed.json()).failure,{stage:'runner',code:'invalid_output',retryable:false});
 const saved=JSON.parse(db.sqlite.prepare("SELECT document_json FROM research_briefs WHERE json_extract(document_json,'$.title')='Other founder'").get().document_json);
 assert.deepEqual(saved.failure,{stage:'runner',code:'invalid_output',retryable:false});assert.doesNotMatch(JSON.stringify(saved),/private-provider-body/);db.sqlite.close();
});

test('successful terminal result clears a transient run failure without rewriting retained model identity',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 const created=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+created.id;
 const active=client(db,async input=>Response.json({id:new URL(input).pathname.split('/').pop(),status:'running',...metadata}));
 await active('GET',path);
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),sections:['snacks','appetizers','main','desserts'].map(key=>({key,title:key,status:'completed',content:'Evidence retained.'}))}));
 const brief=(await(await complete('GET',path)).json()).brief;assert.equal(brief.status,'completed');assert.equal('failure' in brief,false);assert.deepEqual(brief.modelInfo,metadata.modelInfo);db.sqlite.close();
});

test('initial active acknowledgement retains validated model and coverage without an extra version',async()=>{
 const db=database();const call=client(db,async(input,init)=>Response.json({id:JSON.parse(init.body).id,status:'queued',...metadata}));
 const response=await call('POST','',{title:'Founder'});assert.equal(response.status,201);const {brief}=await response.json();
 assert.deepEqual(brief.coverage,metadata.coverage);assert.deepEqual(brief.modelInfo,metadata.modelInfo);assert.deepEqual(brief.failure,metadata.failure);
 assert.equal(brief.revision,2);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM research_versions').get().n,2);
 assert.deepEqual(JSON.parse(db.sqlite.prepare('SELECT document_json FROM research_briefs').get().document_json).modelInfo,metadata.modelInfo);db.sqlite.close();
});

test('sharing and chat metadata changes do not become additional visible report snapshots',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));
 let result=await(await complete('GET',path)).json();brief=result.brief;assert.equal(result.versions.length,1);
 brief=(await(await call('PATCH',path,{revision:brief.revision,shared:true})).json()).brief;
 const chat=client(db,async()=>Response.json({answer:'Evidence-based answer',cost:{toolMicro:0,modelUsd:null}}));
 brief=(await(await chat('POST',path+'/chat',{question:'Explain the evidence'})).json()).brief;
 result=await(await call('GET',path)).json();assert.equal(result.versions.length,1);
 brief=(await(await call('PATCH',path,{revision:brief.revision,sections:[{...emptyJob.sections[0],content:'Owner-edited report content'}]})).json()).brief;
 result=await(await call('GET',path)).json();assert.equal(result.versions.length,2);assert.equal(result.versions[0].revision,brief.revision);db.sqlite.close();
});

test('changed scope preserves the report but blocks chat until the current run delivers fresh content',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{schemaVersion:2,researchInput})).json()).brief;const path='/'+brief.id;
 const source={id:'s1',title:'Original evidence',url:'https://example.com/original',excerpt:'Original scope evidence',retrievedAt:'2026-10-20T00:00:00Z'};
 const sections=[{key:'snacks',title:'Profile',content:'Original report [s1]',status:'completed'}];
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),sections,sources:[source]}));
 brief=(await(await complete('GET',path)).json()).brief;const originalVersion=brief.revision;
 brief=(await(await call('PATCH',path,{revision:brief.revision,researchInput:{...researchInput,companyName:'New company'}})).json()).brief;
 assert.equal(brief.needsResearch,true);assert.deepEqual(brief.sections,sections);assert.deepEqual(brief.sources,[source]);
 const staleVersion=brief.revision;
 let chatCalls=0;const chat=client(db,async()=>{chatCalls++;return Response.json({answer:'New scope answer',cost:{toolMicro:0,modelUsd:null}});});
 const blocked=await chat('POST',path+'/chat',{question:'Discuss the new company'});assert.equal(blocked.status,409);assert.equal((await blocked.json()).error,'research_not_ready');assert.equal(chatCalls,0);
 const reopened=(await(await call('GET',path)).json()).brief;assert.equal(reopened.needsResearch,true);
 assert.equal((await(await call('GET',path+'/versions/'+staleVersion)).json()).brief.needsResearch,true);
 assert.deepEqual((await(await call('GET',path+'/versions/'+originalVersion)).json()).brief.sections,sections);
 brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;assert.equal(brief.needsResearch,true);
 const freshSections=[{...sections[0],content:'Fresh report for the new company [s1]'}];
 const fresh=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),sections:freshSections,sources:[source]}));
 brief=(await(await fresh('GET',path)).json()).brief;assert.equal(brief.needsResearch,false);assert.deepEqual(brief.sections,freshSections);
 assert.equal((await chat('POST',path+'/chat',{question:'Discuss the new company'})).status,200);assert.equal(chatCalls,1);db.sqlite.close();
});

test('normalized no-op input and presentation edits do not invalidate research; later edits cannot clear the flag',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{schemaVersion:2,researchInput})).json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));
 brief=(await(await complete('GET',path)).json()).brief;
 brief=(await(await call('PATCH',path,{revision:brief.revision,researchInput:{...researchInput,guestName:' '+researchInput.guestName+' ',industry:' '+researchInput.industry+' '}})).json()).brief;
 assert.notEqual(brief.needsResearch,true);
 brief=(await(await call('PATCH',path,{revision:brief.revision,title:'Presentation title',shared:true})).json()).brief;assert.notEqual(brief.needsResearch,true);
 brief=(await(await call('PATCH',path,{revision:brief.revision,researchInput:{...researchInput,industry:'New industry'}})).json()).brief;assert.equal(brief.needsResearch,true);
 // Reverting input, editing prose, or changing metadata is not a new research receipt.
 brief=(await(await call('PATCH',path,{revision:brief.revision,researchInput,sections:emptyJob.sections,notes:'New private note',notesApproved:true})).json()).brief;
 assert.equal(brief.needsResearch,true);
 assert.equal((await(await call('GET',path,undefined,902)).json()).brief.needsResearch,true);db.sqlite.close();
});

test('legacy title changes invalidate existing sections but whitespace and empty drafts do not',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{title:'Original founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;
 brief=(await(await call('PATCH',path,{revision:brief.revision,title:'Other founder'})).json()).brief;assert.notEqual(brief.needsResearch,true);
 brief=(await(await call('PATCH',path,{revision:brief.revision,sections:emptyJob.sections})).json()).brief;
 brief=(await(await call('PATCH',path,{revision:brief.revision,title:' Other founder '})).json()).brief;assert.notEqual(brief.needsResearch,true);
 brief=(await(await call('PATCH',path,{revision:brief.revision,title:'Different founder'})).json()).brief;assert.equal(brief.needsResearch,true);db.sqlite.close();
});

test('metadata, wrong-run and empty terminal receipts cannot clear stale scope or erase retained work',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{title:'Original founder'})).json()).brief;const path='/'+brief.id;
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop()}));
 brief=(await(await complete('GET',path)).json()).brief;
 brief=(await(await call('PATCH',path,{revision:brief.revision,title:'Different founder'})).json()).brief;
 const retained=brief.sections;
 brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;
 const progress=client(db,async input=>Response.json({id:new URL(input).pathname.split('/').pop(),status:'running',...metadata,needsResearch:false}));
 brief=(await(await progress('GET',path)).json()).brief;assert.equal(brief.needsResearch,true);assert.deepEqual(brief.sections,retained);
 const wrongRun=client(db,async()=>Response.json({...emptyJob,id:'rrun_wrong',needsResearch:false}));
 assert.equal((await wrongRun('GET',path)).status,502);
 for(const [status,sections] of [['failed',[]],['clarification',[]],['failed',[{key:'snacks',title:'Unavailable',status:'failed',content:'This section could not be completed.'}]]]){
  const failure=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),status,sections,sources:[],needsResearch:false}));
  brief=(await(await failure('GET',path)).json()).brief;
  assert.equal(brief.needsResearch,true);assert.deepEqual(brief.sections,retained);
  brief=(await(await call('POST',path+'/run',{revision:brief.revision})).json()).brief;
 }
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;assert.equal(brief.needsResearch,true);db.sqlite.close();
});

test('restore uses the snapshot flag and matching scope: clean snapshots allow chat, dirty snapshots block it',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 let brief=(await(await call('POST','',{schemaVersion:2,researchInput})).json()).brief;const path='/'+brief.id;
 const sources=[{id:'s1',title:'Original evidence',url:'https://example.com/original',excerpt:'Original scope evidence',retrievedAt:'2026-10-20T00:00:00Z'}];
 const complete=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),sources}));
 brief=(await(await complete('GET',path)).json()).brief;const original=brief;
 const changedInput={...researchInput,companyName:'New company'};
 brief=(await(await call('PATCH',path,{revision:brief.revision,researchInput:changedInput})).json()).brief;const staleVersion=brief.revision;
 assert.equal(brief.needsResearch,true);
 brief=(await(await call('POST',path+'/restore',{revision:brief.revision,version:original.revision})).json()).brief;
 assert.equal(brief.needsResearch,original.needsResearch);
 assert.deepEqual(brief.researchInput,original.researchInput);assert.equal(brief.title,original.title);
 assert.deepEqual(brief.sections,original.sections);assert.deepEqual(brief.sources,original.sources);
 let chatCalls=0;
 const chat=client(db,async(input,init)=>{
  chatCalls++;const payload=JSON.parse(init.body);
  assert.deepEqual(payload.researchInput,original.researchInput);assert.deepEqual(payload.sections,original.sections);assert.deepEqual(payload.sources,original.sources);
  return Response.json({answer:'Answer from the original scope',cost:{toolMicro:0,modelUsd:null}});
 });
 const allowed=await chat('POST',path+'/chat',{question:'Explain the original scope'});
 assert.equal(allowed.status,200);brief=(await allowed.json()).brief;assert.equal(chatCalls,1);
 brief=(await(await call('POST',path+'/restore',{revision:brief.revision,version:staleVersion})).json()).brief;
 assert.equal(brief.needsResearch,true);assert.deepEqual(brief.researchInput,changedInput);
 const blocked=await chat('POST',path+'/chat',{question:'Explain the changed scope'});
 assert.equal(blocked.status,409);assert.equal((await blocked.json()).error,'research_not_ready');assert.equal(chatCalls,1);db.sqlite.close();
});

test('clients cannot supply needsResearch on creation, edits or action requests',async()=>{
 const db=database();const call=client(db,async(...args)=>accepted(...args));
 for(const needsResearch of [false,true,null,'false']){
  assert.equal((await call('POST','',{title:'Founder',needsResearch})).status,400);
 }
 let brief=(await(await call('POST','',{title:'Founder'})).json()).brief;const path='/'+brief.id;
 brief=(await(await call('POST',path+'/cancel',{})).json()).brief;const revision=brief.revision;
 for(const [method,suffix,input] of [['PATCH','',{title:'New founder'}],['POST','/run',{}],['POST','/restore',{version:1}],['POST','/chat',{question:'Test'}]]){
  assert.equal((await call(method,path+suffix,{revision,needsResearch:false,...input})).status,400);
 }
 assert.equal((await(await call('GET',path)).json()).brief.revision,revision);db.sqlite.close();
});


test('single-field scope and optional clarification skip survive durable resubmission',async()=>{
 const db=database();const payloads=[];let unavailable=false;
 const call=client(db,async(input,init)=>{
  if(init?.body){payloads.push(JSON.parse(init.body));if(unavailable)return new Response('',{status:503});}
  return accepted(input,init);
 });
 const created=await call('POST','',{schemaVersion:2,researchInput:{industry:'Electric vehicles',audienceCountry:'IN'},notes:'Focus on jobs',notesApproved:true});
 assert.equal(created.status,201);let brief=(await created.json()).brief;const path='/'+brief.id;
 assert.equal(brief.title,'Electric vehicles');assert.deepEqual(brief.researchInput,{guestName:'',companyName:'',industry:'Electric vehicles',audienceCountry:'IN'});
 const clarify=client(db,async input=>Response.json({...emptyJob,id:new URL(input).pathname.split('/').pop(),status:'clarification',sections:[],clarification:'Any company to prioritize?'}));
 brief=(await(await clarify('GET',path)).json()).brief;
 assert.equal((await call('POST',path+'/run',{revision:brief.revision,skipClarification:'yes'})).status,400);
 unavailable=true;
 brief=(await(await call('POST',path+'/run',{revision:brief.revision,skipClarification:true})).json()).brief;
 assert.equal(brief.skipClarification,true);const payload=payloads.at(-1);assert.equal(payload.skipClarification,true);
 unavailable=false;await call('GET',path);assert.deepEqual(payloads.at(-1),payload);
 assert.equal(payload.researchInput.guestName,'');assert.equal(payload.notesApproved,true);
 db.sqlite.close();
});

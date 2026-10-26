import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initialize,dispatch,StoreError} from '../src/store.js';
function harness(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');const sql={exec(q,...args){if(q.includes('CREATE TABLE')){db.exec(q);return [];}return db.prepare(q).all(...args);}};initialize(sql);let now=1000;return {call:(m,args=[])=>{db.exec('BEGIN');try{const r=dispatch(sql,m,args,{id:'id-hash',body:JSON.stringify(args[0])},now);db.exec('COMMIT');return r;}catch(e){db.exec(e instanceof StoreError && e.message==='BudgetExceeded'?'COMMIT':'ROLLBACK');throw e;}},advance:n=>now+=n};}
const body={id:'rrun_00000000-0000-4000-8000-000000000001',title:'Public example',budgetMicro:100,sources:[]};
test('recovery preserves checkpoints and fences the old lease',()=>{const h=harness();h.call('submit',[body]);const a=h.call('claim');h.call('save',[a[0],a[1],{...a[3],progress:['saved']},{resolved:true}]);h.advance(121);const b=h.call('claim');assert.notEqual(a[1],b[1]);assert.equal(b[4].resolved,true);assert.deepEqual(b[3].progress,['saved']);assert.throws(()=>h.call('heartbeat',[a[0],a[1]]),/Stopped/);});
test('budget reservations and attempts survive retries',()=>{const h=harness();h.call('submit',[body]);const [id,lease]=h.call('claim');h.call('reserve',[id,lease,'one','tool',80]);assert.throws(()=>h.call('reserve',[id,lease,'two','model',30]),/BudgetExceeded/);h.call('started',[id,lease,'one']);h.call('started',[id,lease,'one']);assert.throws(()=>h.call('started',[id,lease,'one']),/BudgetExceeded/);h.call('settle',[id,lease,'one',60,'receipt',{saved:true}]);assert.deepEqual(h.call('reserve',[id,lease,'one','tool',80]),{saved:true});assert.equal(h.call('get',[id]).cost.toolMicro,60);});
test('delete removes evidence and blocks replay, including an in-flight lease',()=>{const h=harness();h.call('submit',[body]);const [id,lease]=h.call('claim');h.call('delete',[id]);assert.equal(h.call('get',[id]),null);assert.throws(()=>h.call('submit',[body]),/Gone/);assert.throws(()=>h.call('save',[id,lease,{},{}]),/Stopped/);});
test('cancellation fences a worker and submit rejects changed payload',()=>{const h=harness();h.call('submit',[body]);assert.throws(()=>h.call('submit',[{...body,title:'changed'}]),/Conflict/);const [id,lease]=h.call('claim');assert.equal(h.call('cancel',[id]).status,'cancelled');assert.throws(()=>h.call('started',[id,lease,'new']),/Stopped/);assert.equal(h.call('claim'),null);});

test('versioned admission persists counters, counts retries and preserves cache on stale saves',()=>{
 const h=harness();h.call('submit',[{...body,budgetMicro:5000000,budgetPolicyVersion:1}]);
 const [id,lease,,result]=h.call('claim');
 const spec={kind:'tool',amount:1000,phase:'preparation',hold:0};
 for(let i=0;i<12;i++)h.call('admit',[id,lease,String(i),spec]);
 h.call('settle',[id,lease,'0',500,null,{cached:true}]);
 h.call('save',[id,lease,result,{_budget:{phases:{}}}]);
 assert.deepEqual(h.call('admit',[id,lease,'0',spec]),{cached:true});
 assert.throws(()=>h.call('admit',[id,lease,'next',spec]),e=>e.limit.kind==='stage_calls'&&e.limit.used===12);
 h.advance(121);const recovered=h.call('claim');
 assert.equal(recovered[4]._budget.phases.preparation,12);
 assert.throws(()=>h.call('admit',[id,lease,'stale',spec]),/Stopped/);
 const newSpec={...spec,phase:'extraction'};
 h.call('admit',[id,recovered[1],'retry',newSpec]);h.call('admit',[id,recovered[1],'retry',newSpec]);
 assert.throws(()=>h.call('admit',[id,recovered[1],'retry',newSpec]),e=>e.limit.kind==='call_retries');
});
test('global reservation and provider cost breakers survive worker checkpoints',()=>{
 for(const overrun of [false,true]){
  const h=harness();h.call('submit',[{...body,budgetMicro:5000000,budgetPolicyVersion:1}]);
  const [id,lease,,result]=h.call('claim'),spec={kind:'tool',amount:1000,phase:'dossier',hold:0};
  h.call('admit',[id,lease,'one',spec]);
  if(overrun)h.call('settle',[id,lease,'one',1001,null,[]]);
  else assert.throws(()=>h.call('admit',[id,lease,'two',{...spec,hold:4999000}]),e=>e.limit.kind==='job_reservation');
  h.call('save',[id,lease,result,{}]);
  assert.throws(()=>h.call('admit',[id,lease,'cheap',{...spec,amount:1,phase:'write_main'}]),e=>e.limit.kind===(overrun?'provider_cost_overrun':'job_reservation'));
 }
});

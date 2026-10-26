import {test} from 'node:test';import assert from 'node:assert/strict';
import {interpretSocialQuestion, validateSocialPlan} from '../src/social-analytics-assistant.ts';
const scope={platform:'all',fromDate:'2026-01-01',toDate:'2026-01-07'};
const defaults={intent:'summary',platforms:['instagram'],metrics:['views'],fromDate:scope.fromDate,toDate:scope.toDate,posts:[],target:'platform',limit:5,order:'desc',basis:'received_period'};
const entities=[{kind:'post',platform:'instagram',id:'a',label:'A'},{kind:'post',platform:'facebook',id:'b',label:'B'}];
const input={scope,question:'How did the second one perform?',context:{scope,entities}};
test('second one selects only B; explicit platform resets implicit post scope',async()=>{
 const planner=async()=>({answer:JSON.stringify(defaults)});
 const p=await interpretSocialQuestion(input,{},planner);
 assert.deepEqual(p.posts,[{id:'b',platform:'facebook'}]);assert.deepEqual(p.platforms,['facebook']);
 const q=await interpretSocialQuestion({...input,question:'How did Instagram perform?'},{},planner);
 assert.deepEqual(q.posts,[]);assert.deepEqual(q.platforms,['instagram']);
});
test('forged values are not sent to model; invalid tool and dates rejected',async()=>{
 let sent;
 await interpretSocialQuestion({...input,question:'views',context:{scope,entities,metrics:{views:99999}}},{},async(_,messages)=>{sent=JSON.stringify(messages);return {answer:JSON.stringify(defaults)}});
 assert.ok(!sent.includes('99999'));assert.throws(()=>validateSocialPlan({...defaults,intent:'sql'},scope));assert.throws(()=>validateSocialPlan({...defaults,toDate:'2026-02-30'},scope));
});
test('filter changes discard old entities and model post IDs must be valid bounded hints',async()=>{
 const p=await interpretSocialQuestion({...input,scope:{...scope,platform:'instagram'}},{},async()=>({answer:JSON.stringify(defaults)}));
 assert.deepEqual(p.posts,[]);
 assert.throws(()=>validateSocialPlan({...defaults,posts:[{id:'https://evil.test'}]},scope));
});
test('explicit platform overrides a contradictory planner result',async()=>{
 const p=await interpretSocialQuestion({...input,question:'Show Instagram views'},{},async()=>({answer:JSON.stringify({...defaults,platforms:['facebook'],posts:[{id:'b',platform:'facebook'}]})}));
 assert.deepEqual(p.platforms,['instagram']);assert.deepEqual(p.posts,[]);
});
test('same-platform pronoun preserves its post; matched-age ordinal stays unsupported',async()=>{
 const planner=async()=>({answer:JSON.stringify({...defaults,posts:[{id:'a',platform:'instagram'}],target:'post'})});
 const single={...input,context:{scope,entities:[entities[0]]},question:'How many views did it get on Instagram?'};
 assert.deepEqual((await interpretSocialQuestion(single,{},planner)).posts,[{id:'a',platform:'instagram'}]);
 const age=await interpretSocialQuestion({...input,question:'First post in its first seven days'},{},async()=>({answer:JSON.stringify({...defaults,basis:'matched_age',posts:[{id:'a',platform:'instagram'}],target:'post'})}));
 assert.equal(age.basis,'matched_age');
});
test('prior platform scope is inherited and this month wins mixed comparison wording',async()=>{
 let scopeSent;
 await interpretSocialQuestion({...input,question:'Only clicks',context:{visibleScope:scope,scope:{...scope,platform:'instagram'},entities:[{kind:'platform',platform:'instagram',id:'instagram',label:'Instagram'}]}},{},async(_,messages)=>{scopeSent=JSON.parse(messages[1].content).scope;return {answer:JSON.stringify(defaults)}});
 assert.equal(scopeSent.platform,'instagram');
 const {resolveSocialDates}=await import('../src/social-analytics-assistant.ts');
 assert.deepEqual(resolveSocialDates('Compare this month with last month',new Date('2026-10-18')),{fromDate:'2026-10-01',toDate:'2026-10-18'});
});
test('ambiguous pronouns and unspecified best ranking ask for clarification',async()=>{
 const p=async()=>({answer:JSON.stringify({...defaults,posts:[{id:'a',platform:'instagram'}],target:'post'})});
 assert.equal((await interpretSocialQuestion({...input,question:'How many views did it get?'},{},p)).intent,'clarification');
 assert.equal((await interpretSocialQuestion({...input,question:'How did the first post do in its first seven days?'},{},p)).basis,'matched_age');
 const best=await interpretSocialQuestion({...input,question:'Which posts are best?'},{},async()=>({answer:JSON.stringify({...defaults,intent:'ranking'})}));assert.equal(best.intent,'clarification');
});
test('explicit new post beats pronoun context and contextual platform retains requested operation',async()=>{
 const single={...input,context:{scope,entities:[{kind:'post',platform:'instagram',id:'postA',accountId:'accountA',label:'A'}]},question:'For post ID postB, show its views'};
 const p=await interpretSocialQuestion(single,{},async()=>({answer:JSON.stringify({...defaults,target:'post',posts:[{id:'postB',platform:'instagram'}]})}));assert.equal(p.posts[0].id,'postB');
 const contextual={...input,context:{scope,entities:[{kind:'platform',platform:'instagram',id:'instagram',label:'Instagram'}]},question:'Compare its views this week with last week'};
 const c=await interpretSocialQuestion(contextual,{},async()=>({answer:JSON.stringify({...defaults,intent:'period_comparison'})}));assert.equal(c.intent,'period_comparison');assert.ok(c.previous);
 const t=await interpretSocialQuestion({...contextual,question:'Show its daily views'},{},async()=>({answer:JSON.stringify({...defaults,intent:'trend'})}));assert.equal(t.intent,'trend');
});

test('social planning uses direct Claude schema output and keeps plan validation',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(url,init)=>{
   assert.equal(url,'https://api.anthropic.com/v1/messages');
   const body=JSON.parse(init.body);
   assert.equal(body.model,'claude-sonnet-5-5');
   assert.equal(body.output_config.format.type,'json_schema');
   assert.equal(body.output_config.format.schema.additionalProperties,false);
   assert.equal(body.temperature,undefined);
   return Response.json({model:body.model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(defaults)}]});
  };
  const result=await interpretSocialQuestion({...input,question:'Show Instagram views'},{ANTHROPIC_API_KEY:'test-only-key'});
  assert.deepEqual(result.platforms,['instagram']);
  assert.deepEqual(result.metrics,['views']);
  globalThis.fetch=async()=>Response.json({model:'claude-sonnet-5-5',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...defaults,metrics:['private_metric']})}]});
  await assert.rejects(interpretSocialQuestion({...input,question:'views'},{ANTHROPIC_API_KEY:'test-only-key'}),/invalid_metric/);
 } finally {globalThis.fetch=original;}
});

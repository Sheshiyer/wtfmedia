import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatedResult,sectionsValid,sourcesValid,researchTitle,parseResearchInput} from '../src/research-contract.ts';
const section={key:'snacks',title:'Guest profile',content:'Retained evidence.',status:'completed'};
const source={id:'s1',title:'Public discussion',url:'https://www.reddit.com/r/ev/comments/abc',excerpt:'Anecdotal discussion',retrievedAt:'2026-10-20T00:00:00Z'};
const base={id:'rrun_test',status:'partial',sections:[section],sources:[source],progress:[],warnings:[],clarification:null,cost:{toolMicro:5,modelUsd:null}};
const parse=value=>validatedResult(value,'rrun_test');
const failure={stage:'desserts',code:'output_truncated',retryable:true};

test('visual failure categories survive projection without exposing arbitrary diagnostic text',()=>{
 const slot={id:'fig_main_1',section:'main',goal:'Compare supported opportunities',preferredKind:'comparison',status:'failed',attempts:2,reason:'invalid_output',checks:['comparison','numbers']};
 const result=parse({...base,visualPolicyVersion:2,figures:[slot]});
 assert.deepEqual(result.figures[0].checks,['comparison','numbers']);
 for(const checks of [['PRIVATE_DRAFT'],['numbers','numbers'],['items[0].PRIVATE'],['schema',42]]) {
  assert.throws(()=>parse({...base,visualPolicyVersion:2,figures:[{...slot,checks}]}));
 }
 // Older documents without diagnostics remain readable.
 const {checks,...legacy}=slot;
 assert.equal(parse({...base,visualPolicyVersion:2,figures:[legacy]}).figures[0].reason,'invalid_output');
});

test('one or more populated fields are sufficient and omitted fields remain empty',()=>{
 const keys=['guestName','companyName','industry'];
 for(let mask=1;mask<8;mask++){
  const input={audienceCountry:'IN',...Object.fromEntries(keys.filter((_,i)=>mask&(1<<i)).map(k=>[k,'  Example  ']))};
  const result=parseResearchInput(input);
  for(let i=0;i<3;i++)assert.equal(result[keys[i]],mask&(1<<i)?'Example':'');
  assert.equal(researchTitle(result),Array(keys.filter((_,i)=>mask&(1<<i)).length).fill('Example').join(' — '));
 }
 for(const input of [{audienceCountry:'IN'},{guestName:'  ',audienceCountry:'IN'},{guestName:'Person',companyName:42,audienceCountry:'IN'},{guestName:'a',audienceCountry:'IN'},{industry:'a'.repeat(121),audienceCountry:'IN'}])assert.throws(()=>parseResearchInput(input));
});

test('explicitly skipped empty sections allow scoped completion, but no report cannot complete',()=>{
 const sections=['snacks','appetizers','main','desserts'].map(key=>({...section,key,status:key==='desserts'?'completed':'skipped',content:key==='desserts'?'Industry findings':''}));
 assert.equal(parse({...base,status:'completed',sections}).status,'completed');
 assert.equal(parse({...base,status:'completed',sections:sections.map(s=>({...s,status:'skipped',content:''}))}).status,'partial');
 assert.equal(sectionsValid([{...section,status:'skipped'}]),false);
 assert.equal(parse({...base,status:'completed',sections:sections.slice(1)}).status,'partial');
});

test('Anthropic model receipts and safe errors remain readable beside historical providers',()=>{
 const modelInfo={service:'anthropic',requestedModel:'claude-sonnet-5-5',reportedModel:'claude-sonnet-5-5'};
 assert.deepEqual(parse({...base,modelInfo,failure:{...failure,provider:'anthropic'}}).modelInfo,modelInfo);
});

test('derived titles preserve complete emoji without leaving a surrogate at the length boundary',()=>{
 const input={guestName:'a'.repeat(100),companyName:'b'.repeat(96)+'😀',industry:'Industry',audienceCountry:'IN'};
 assert.equal(researchTitle(input),'a'.repeat(100)+' — '+'b'.repeat(96));
 assert.equal(researchTitle({...input,companyName:'b'.repeat(95)+'😀'}),'a'.repeat(100)+' — '+'b'.repeat(95)+'😀');
 assert.equal(input.companyName,'b'.repeat(96)+'😀');
});

test('optional diagnostics are allowlisted and projected for both active and terminal results',()=>{
 const coverage=[{channel:'reddit',status:'found',sourceCount:1,method:'web_search'}];
 const modelInfo={service:'omniroute',requestedModel:'research-route',reportedModel:'vendor/model:free'};
 for(const status of ['running','queued','partial','failed']){
  const result=parse({...base,status,coverage:coverage.map(c=>({...c,raw:'private'})),modelInfo:{...modelInfo,token:'private'},failure:{...failure,body:'private'}});
  assert.deepEqual(result.coverage,coverage);assert.deepEqual(result.modelInfo,modelInfo);assert.deepEqual(result.failure,failure);assert.doesNotMatch(JSON.stringify(result),/private/);
 }
 const legacy=parse(base);for(const key of ['coverage','modelInfo','failure'])assert.equal(key in legacy,false);
 const nullable=parse({...base,coverage:null,modelInfo:null,failure:null,sections:[{...section,failure:null}]});assert.equal('failure' in nullable.sections[0],false);
});

test('invalid coverage and diagnostics cannot enter a saved receipt even while running',()=>{
 const coverage={channel:'web',status:'found',sourceCount:1,method:'web_search'};
 const invalid=[
  {coverage:Array(7).fill(coverage)}, {coverage:[coverage,coverage]},
  ...[-1,Number.MAX_SAFE_INTEGER+1,1.1,'1',null].map(sourceCount=>({coverage:[{...coverage,sourceCount}]})),
  {coverage:[{...coverage,channel:'facebook'}]}, {coverage:[{...coverage,status:'complete'}]}, {coverage:[{...coverage,method:'guessed'}]},
  {failure:{...failure,stage:'raw-provider-message'}}, {failure:{...failure,code:'unknown'}}, {failure:{...failure,retryable:'yes'}},
  {modelInfo:{service:'other',requestedModel:'route'}}, {modelInfo:{service:'omniroute',requestedModel:'a'.repeat(121)}},
  ...['Bearer abcdef','sk-secret-fixture','https://user:pass@example.com','route\nsecret','api_key=secret',''].map(requestedModel=>({modelInfo:{service:'omniroute',requestedModel}})),
  {modelInfo:{service:'openrouter',requestedModel:'route',reportedModel:'Bearer token'}},
 ];
 for(const status of ['running','partial'])for(const fields of invalid)assert.throws(()=>parse({...base,status,...fields}),e=>e.status===502,JSON.stringify(fields));
 assert.throws(()=>parse({...base,sections:[{...section,failure:{...failure,code:'secret'}}]}),e=>e.status===502);
});

test('completed whitespace sections are rejected while failed partial output remains available',()=>{
 assert.equal(sectionsValid([{...section,content:' \n\t '}]),false);
 assert.throws(()=>parse({...base,sections:[{...section,content:''}]}),e=>e.status===502);
 const result=parse({...base,sections:[section,{...section,key:'desserts',status:'failed',content:'',failure}]});
 assert.equal(result.sections[0].content,section.content);assert.deepEqual(result.sections[1].failure,failure);
});

test('source platform must match a safe hostname, and retrieval/evidence labels are bounded allowlists',()=>{
 for(const [platform,url] of [['reddit','https://old.reddit.com/r/test'],['youtube','https://youtu.be/abcdefghijk'],['linkedin','https://in.linkedin.com/in/example'],['instagram','https://www.instagram.com/p/example'],['x','https://twitter.com/example/status/1'],['web','https://example.com/report']]){
  const enriched={...source,platform,url,retrievedVia:'perplexity.web.search',evidenceType:'search_snippet'};
  assert.equal(sourcesValid([enriched]),true,url);assert.deepEqual(parse({...base,sources:[enriched]}).sources,[enriched]);
 }
 for(const changed of [
  {platform:'reddit',url:'https://reddit.com.evil.example/path'}, {platform:'youtube',url:'https://example.com/youtube.com'},
  {platform:'linkedin',url:'https://notlinkedin.com/profile'}, {platform:'web'}, {platform:'facebook'},
  {retrievedVia:'instagram.publish'}, {evidenceType:'full_verified_post'},
  {url:'https://example.com/report?api_key=private'}, {url:'https://example.com/report#access_token=private'},
  {url:'https://localhost./report'}, {url:'https://host.internal./report'}, {url:'https://user:pass@example.com/report'},
 ])assert.equal(sourcesValid([{...source,...changed}]),false,JSON.stringify(changed));
 // Missing metadata remains readable; do not manufacture a platform or transcript claim.
 assert.deepEqual(parse(base).sources,[source]);
});

test('dedicated catalog retrieval IDs survive projection without pretending they are web search',()=>{
 const catalog=[['linkedin','https://linkedin.com/in/example','anyapi.linkedin.search.posts'],['youtube','https://youtube.com/watch?v=abcdefghijk','youtube.youtube.search.videos'],['instagram','https://instagram.com/p/example','anyapi.instagram.hashtag.posts'],['reddit','https://reddit.com/r/example','scrapecreators.reddit.search.posts'],['x','https://x.com/example/status/1','anyapi.x.search.posts']];
 for(const [platform,url,retrievedVia] of catalog){
  const evidence={...source,platform,url,retrievedVia,evidenceType:platform==='youtube'?'video_metadata':'post'};
  const coverage=[{channel:platform,status:'found',sourceCount:1,method:'dedicated_tool'}];
  const result=parse({...base,sources:[evidence],coverage});assert.deepEqual(result.sources,[evidence]);assert.deepEqual(result.coverage,coverage);
 }
 const extracted={...source,retrievedVia:'exa.web.contents.get',evidenceType:'page_extract'};
 assert.deepEqual(parse({...base,sources:[extracted]}).sources,[extracted]);
});

test('result input metadata is validated but cannot replace the owner-authored research scope',()=>{
 for(const fields of [{schemaVersion:3},{researchInput:{guestName:'Guest',companyName:'Company',industry:'Industry',audienceCountry:'US'}}]){
  assert.throws(()=>parse({...base,...fields}),e=>e.status===502);
 }
 const result=parse({...base,schemaVersion:2,researchInput:{guestName:'Other guest',companyName:'Other company',industry:'Other industry',audienceCountry:'IN'}});
 assert.equal('researchInput' in result,false);assert.equal('schemaVersion' in result,false);
});

test('more than 80 unique sources survive receipt validation with coverage counts',()=>{
 const sources=Array.from({length:125},(_,i)=>({...source,id:'s'+i,url:'https://example.com/'+i}));
 const result=parse({...base,sources,coverage:[{channel:'web',status:'found',sourceCount:125,method:'web_search'}]});
 assert.equal(result.sources.length,125);assert.equal(result.coverage[0].sourceCount,125);
 assert.equal(sourcesValid([...sources,sources[0]]),false);
});

test('failure reasons and operation survive projection but arbitrary diagnostic text does not',()=>{
 const details={...failure,code:'provider_unavailable',reason:'http_error',provider:'omniroute',operation:'model',httpStatus:503};
 assert.deepEqual(parse({...base,failure:{...details,message:'PRIVATE',url:'PRIVATE'}}).failure,details);
 for(const bad of [{reason:'PRIVATE'},{provider:'PRIVATE'},{operation:'PRIVATE'},{httpStatus:99},{httpStatus:'503'}])
  assert.throws(()=>parse({...base,failure:{...details,...bad}}));
});

test('budget limit metadata survives projection and rejects unbounded or private fields',()=>{
 for(const kind of ['stage_calls','job_reservation','call_retries','provider_cost_overrun']){
  const limit={kind,phase:'summaries',used:12,maximum:12};
  const value={...failure,stage:'discovery',code:'budget_exhausted',retryable:false,limit};
  assert.deepEqual(parse({...base,failure:value}).failure,value);
  for(const bad of [{...limit,used:-1},{...limit,used:1.5},{...limit,phase:'PRIVATE'},{...limit,raw:'PRIVATE'}]){
   assert.throws(()=>parse({...base,failure:{...value,limit:bad}}));
  }
 }
 assert.equal(parse({...base,failure:{...failure,code:'budget_exhausted'}}).failure.limit,undefined);
});

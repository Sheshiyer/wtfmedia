import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatedResult,sectionsValid,sourcesValid,researchTitle} from '../src/research-contract.ts';
const section={key:'snacks',title:'Guest profile',content:'Retained evidence.',status:'completed'};
const source={id:'s1',title:'Public discussion',url:'https://www.reddit.com/r/ev/comments/abc',excerpt:'Anecdotal discussion',retrievedAt:'2026-10-20T00:00:00Z'};
const base={id:'rrun_test',status:'partial',sections:[section],sources:[source],progress:[],warnings:[],clarification:null,cost:{toolMicro:5,modelUsd:null}};
const parse=value=>validatedResult(value,'rrun_test');
const failure={stage:'desserts',code:'output_truncated',retryable:true};

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
  ...[-1,81,1.1,'1',null].map(sourceCount=>({coverage:[{...coverage,sourceCount}]})),
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

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readAlphaResearchEvidence, readAlphaInterviewContext} from '../src/research-alpha.ts';

test('research uses only Alpha public citations, never generated prose as transcript evidence', async()=>{
 const episodeId='abcdefghijk';let request;
 const env={WTFMEDIA_ALPHA_WEB:{fetch:async r=>{request=r;return new Response('Generated paraphrase [1]',{headers:{
  'x-sources':JSON.stringify([{n:1,video_id:episodeId,title:'Public episode',source_mode:'published',t:42,timestamp_status:'verified'}]),
  'x-cited-indices':'[1]',
 }});}}};
 const sources=await readAlphaResearchEvidence(env,'Public subject',episodeId);
 assert.equal(sources.length,1);assert.equal(sources[0].excerpt,'');assert.equal(sources[0].kind,'alpha_reference');assert.equal(sources[0].timestampSeconds,42);
 const input=await request.json();assert.deepEqual(Object.keys(input).sort(),['episodeId','messages','sourceMode']);
 assert.equal(request.headers.get('authorization'),null);
});

test('historical context searches published Alpha across episodes with no private payload', async()=>{
 let body;
 const env={WTFMEDIA_ALPHA_WEB:{fetch:async request=>{
  body=await request.json();
  return new Response('The discussion explored operating costs [1, 2].',{headers:{
   'x-sources':encodeURIComponent(JSON.stringify([
    {n:1,video_id:'abcdefghijk',title:'One',source_mode:'published',t:42,timestamp_status:'verified'},
    {n:2,video_id:'bcdefghijkl',title:'Two',source_mode:'published',t:21,timestamp_status:'source_timing_unavailable'}])),
   'x-cited-indices':'[1,2]',
  }});
 }}};
 const result=await readAlphaInterviewContext(env,'Hotel economics');
 assert.equal(result.status,'available');assert.equal(result.sources.length,2);
 assert.deepEqual(Object.keys(body).sort(),['messages','sourceMode']);
 assert.equal(body.sourceMode,'published');assert.match(body.messages[0].content,/Hotel economics/);
 assert.equal(result.sources[0].timestampSeconds,42);
 assert.equal(result.sources[1].timestampSeconds,undefined);
 assert.ok(result.sources.every(s=>s.excerpt===''&&s.kind==='alpha_reference'));
});

test('historical context fails closed on missing citations, uncut citations or oversized synthesis',async()=>{
 for(const [answer,mode] of [['No cited question','published'],['Summary [1]','uncut'],['x'.repeat(6001)+' [1]','published']]) {
  const result=await readAlphaInterviewContext({WTFMEDIA_ALPHA_WEB:{fetch:async()=>new Response(answer,{headers:{
   'x-sources':JSON.stringify([{n:1,video_id:'abcdefghijk',title:'One',source_mode:mode}]),'x-cited-indices':'[1]',
  }})}},'Topic');
  assert.deepEqual(result,{status:'unavailable',summary:'',sources:[]});
 }
 assert.deepEqual(await readAlphaInterviewContext({},'Topic'),{status:'unavailable',summary:'',sources:[]});
});
test('missing, ungrounded and failed Alpha responses stay unavailable',async()=>{
 assert.deepEqual(await readAlphaResearchEvidence({},'Subject','abcdefghijk'),[]);
 assert.deepEqual(await readAlphaResearchEvidence({WTFMEDIA_ALPHA_WEB:{fetch:async()=>new Response('Uncited assertion')}},'Subject','abcdefghijk'),[]);
 assert.deepEqual(await readAlphaResearchEvidence({WTFMEDIA_ALPHA_WEB:{fetch:async()=>{throw Error('private upstream failure');}}},'Subject','abcdefghijk'),[]);
});

test('historical context includes every bounded public subject instead of a truncated display title', async()=>{
 const subjects=Array.from({length:10},(_,i)=>`Company ${i} ${'x'.repeat(108)}`);
 let body;
 await readAlphaInterviewContext({WTFMEDIA_ALPHA_WEB:{fetch:async request=>{body=await request.json();return new Response('No evidence');}}},subjects.join(', '));
 for(const subject of subjects) assert.ok(body.messages[0].content.includes(subject));
 assert.ok(body.messages[0].content.length<=2000);
 assert.deepEqual(Object.keys(body).sort(),['messages','sourceMode']);
});

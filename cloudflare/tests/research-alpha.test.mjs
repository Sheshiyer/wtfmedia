import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readAlphaResearchEvidence} from '../src/research-alpha.ts';

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
test('missing, ungrounded and failed Alpha responses stay unavailable',async()=>{
 assert.deepEqual(await readAlphaResearchEvidence({},'Subject','abcdefghijk'),[]);
 assert.deepEqual(await readAlphaResearchEvidence({WTFMEDIA_ALPHA_WEB:{fetch:async()=>new Response('Uncited assertion')}},'Subject','abcdefghijk'),[]);
 assert.deepEqual(await readAlphaResearchEvidence({WTFMEDIA_ALPHA_WEB:{fetch:async()=>{throw Error('private upstream failure');}}},'Subject','abcdefghijk'),[]);
});

import assert from "node:assert/strict";

import { inspectEpisodeScopeManifests } from "./verify-episode-scope-manifests.mjs";

const mapping = {
  rows: [
    { cf_youtube_video_id: "RSB58m7Xwhg", local_uncut_txt_sha256: "a".repeat(64) },
    { cf_youtube_video_id: "QdWHGjReLUo", local_uncut_txt_sha256: "b".repeat(64) },
    { cf_youtube_video_id: null },
  ],
};

const jobs = {
  jobs: [
    {
      videoId: "RSB58m7Xwhg",
      transcriptKey: `uncut/${"a".repeat(64)}.txt`,
      contentHash: "a".repeat(64),
      sourceMode: "uncut",
    },
    {
      videoId: "QdWHGjReLUo",
      transcriptKey: `uncut/${"b".repeat(64)}.txt`,
      contentHash: "b".repeat(64),
      sourceMode: "uncut",
    },
  ],
};

assert.deepEqual(inspectEpisodeScopeManifests(mapping, jobs), {
  schema: "wtfmedia.episode-scope-preflight.v1",
  mappingRows: 3,
  mappedRows: 2,
  heldRows: 1,
  jobs: 2,
  manifestReady: true,
  vectorMetadataProperty: "video_id",
  releaseGate: "video_id_metadata_index_then_post_index_reupsert",
  issues: [],
});

const bad = structuredClone(jobs);
bad.jobs[0].videoId = "a".repeat(64);
bad.jobs[1].sourceMode = "published";
const receipt = inspectEpisodeScopeManifests(mapping, bad);
assert.equal(receipt.manifestReady, false);
assert.deepEqual(receipt.issues, [
  "invalid_job_source_mode:1",
  "invalid_job_video_id:1",
  "missing_mapped_job:2",
  "unexpected_job_video_id:1",
]);
assert.equal(JSON.stringify(receipt).includes("RSB58m7Xwhg"), false);
assert.equal(JSON.stringify(receipt).includes("QdWHGjReLUo"), false);

const mismatched = structuredClone(jobs);
mismatched.jobs[0].transcriptKey = `uncut/${"c".repeat(64)}.txt`;
const mismatchReceipt = inspectEpisodeScopeManifests(mapping, mismatched);
assert.equal(mismatchReceipt.manifestReady, false);
assert.deepEqual(mismatchReceipt.issues, [
  "mismatched_job_content_hash:1",
  "mismatched_job_transcript_key:1",
  "missing_mapped_job:1",
]);

const staleContentHash = structuredClone(jobs);
staleContentHash.jobs[0].contentHash = "c".repeat(64);
const staleHashReceipt = inspectEpisodeScopeManifests(mapping, staleContentHash);
assert.equal(staleHashReceipt.manifestReady, false);
assert.deepEqual(staleHashReceipt.issues, [
  "mismatched_job_content_hash:1",
  "missing_mapped_job:1",
]);

console.log("verify-episode-scope-manifests.test.mjs ok");

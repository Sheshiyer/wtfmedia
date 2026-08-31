import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { planEpisodeScopeActivation } from "./prepare-episode-scope-activation.mjs";

const dir = mkdtempSync(join(tmpdir(), "wtf-episode-scope-"));
try {
  const file = join(dir, "approved.txt");
  const body = "approved uncut transcript evidence\n";
  writeFileSync(file, body);
  const digest = createHash("sha256").update(body).digest("hex");
  const videoId = "RSB58m7Xwhg";
  const mapping = {
    rows: [{ cf_youtube_video_id: videoId, local_uncut_txt_sha256: digest }],
  };
  const jobs = {
    jobs: [{
      videoId,
      title: "Example episode",
      transcriptKey: `uncut/${digest}.txt`,
      contentHash: "f".repeat(64),
      sourceMode: "uncut",
      metadata: { localTxtPath: file, txtSha256: digest },
    }],
  };

  const plan = planEpisodeScopeActivation(mapping, jobs);
  assert.deepEqual(plan.issues, []);
  assert.equal(plan.planned.length, 1);
  assert.equal(plan.planned[0].contentHash, digest);
  assert.equal(plan.planned[0].sourceAssetId, digest);
  assert.equal(plan.planned[0].byteSize, Buffer.byteLength(body));

  const tampered = structuredClone(jobs);
  tampered.jobs[0].metadata.txtSha256 = "e".repeat(64);
  const rejected = planEpisodeScopeActivation(mapping, tampered);
  assert.deepEqual(rejected.issues, ["metadata_content_hash_mismatch:1"]);
  assert.equal(rejected.planned.length, 0);
  assert.equal(JSON.stringify(rejected).includes(videoId), false);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("prepare-episode-scope-activation.test.mjs ok");

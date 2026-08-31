import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  eligibleUncutRows,
  matchUncutFile,
  normalizeTitle,
  planUncutUploads,
  validateUncutUploadJobs,
} from "./put-uncut-and-enqueue.mjs";

const table = {
  quarantinedTitles: ["Brain Armstrong", "WEF - Economics", "WTF is a Battery?"],
  rows: [
    {
      title: "AR Rahman",
      status: "mapped",
      uncutPointer: "candidate",
      youtubeVideoId: "FPV5fAkqyBs",
      internal: { rowHash: "sha256:fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7" },
    },
    {
      title: "Bill Gates",
      status: "mapped",
      uncutPointer: "absent",
      internal: { rowHash: "sha256:342777737988c606bc4ee31fe5241ef53eb3f0c1e51688bb6f43be987c0ef8a4" },
    },
    {
      title: "WEF - Economics",
      status: "quarantined",
      uncutPointer: "candidate",
      internal: { rowHash: "sha256:cde1afe21fadd202d8142b2b0c136e2ec658eafec11011eebee5f2a47b221649" },
    },
  ],
};

const eligible = eligibleUncutRows(table);
assert.equal(eligible.length, 1);
assert.equal(eligible[0].title, "AR Rahman");

const reconciledTable = {
  rows: [{
    episode_name: "AR Rahman",
    cf_manifest_title: "A R Rahman on music and creativity",
    cf_youtube_video_id: "FPV5fAkqyBs",
    local_uncut_txt_sha256: "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7",
    local_uncut_txt_path: "/private/corpus/wtf-is-podcast-ep09-ar-rahman.txt",
    mapping_status: "has_transcript_link;has_frame_io_final;has_cf_youtube_asset;extracted_txt",
  }],
};
assert.equal(eligibleUncutRows(reconciledTable).length, 1);
assert.equal(matchUncutFile("AR Rahman.txt", eligibleUncutRows(reconciledTable)).ok, true);
assert.equal(
  matchUncutFile("wtf-is-podcast-ep09-ar-rahman.txt", eligibleUncutRows(reconciledTable)).via,
  "manifest_path",
);

assert.equal(normalizeTitle("AR Rahman"), "arrahman");
assert.equal(matchUncutFile("FPV5fAkqyBs.txt", eligible).reason, "youtube_id_filename");
assert.equal(matchUncutFile("AR Rahman.txt", eligible).ok, true);
assert.equal(
  matchUncutFile("fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7.txt", eligible).via,
  "hash",
);
assert.equal(matchUncutFile("Bill Gates.txt", eligible).reason, "unmapped_filename");

const activationTable = {
  jobs: [{
    title: "AR Rahman",
    videoId: "FPV5fAkqyBs",
    sourceAssetId: "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7",
    file: "/private/corpus/AR Rahman.txt",
    sourceMode: "uncut",
  }],
};
assert.equal(eligibleUncutRows(activationTable).length, 1);
assert.equal(matchUncutFile("AR Rahman.txt", eligibleUncutRows(activationTable)).via, "manifest_path");

function writeAlignmentManifest(directory, entries) {
  writeFileSync(join(directory, "alignment-manifest.json"), JSON.stringify({
    schema: "wtfmedia.uncut-alignment-bindings.v1",
    entries,
  }));
}

function binding(sourceAssetId, videoId, sourceContentSha256, sidecar) {
  return {
    sourceAssetId,
    videoId,
    sourceContentSha256,
    sidecarSha256: createHash("sha256").update(sidecar).digest("hex"),
  };
}

const dir = mkdtempSync(join(tmpdir(), "wtf-uncut-"));
try {
  const body = "studio conversation that is not a youtube caption dump\nan unaligned insert remains unavailable\n";
  const sidecar = `${JSON.stringify([
    {
      t: 42,
      x: "studio conversation that is not a youtube caption dump",
      origin: "published_alignment",
      confidence: 0.86,
    },
    { t: null, x: "an unaligned insert remains unavailable" },
  ])}\n`;
  const timestampsDir = mkdtempSync(join(tmpdir(), "wtf-uncut-timestamps-"));
  const manifestDir = mkdtempSync(join(tmpdir(), "wtf-uncut-manifest-"));
  writeFileSync(join(dir, "AR Rahman.txt"), body);
  writeFileSync(
    join(timestampsDir, "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7.timestamps.json"),
    sidecar,
  );
  const firstBinding = binding(
    "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7",
    "FPV5fAkqyBs",
    createHash("sha256").update(body).digest("hex"),
    sidecar,
  );
  writeAlignmentManifest(timestampsDir, [firstBinding]);
  writeFileSync(join(dir, "FPV5fAkqyBs.txt"), "published youtube captions\n");
  const published = new Map([[createHash("sha256").update("published youtube captions\n").digest("hex"), "FPV5fAkqyBs.txt"]]);
  const plan = planUncutUploads(dir, table, { publishedHashes: published, timestampsDir });
  assert.equal(plan.planned.length, 1);
  assert.equal(plan.planned[0].transcriptKey.startsWith("uncut/"), true);
  assert.equal(
    plan.planned[0].timestampsKey,
    "uncut/fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7.timestamps.json",
  );
  assert.equal(plan.planned[0].videoId, "FPV5fAkqyBs");
  assert.equal(plan.planned[0].sourceAssetId, "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7");
  assert.notEqual(plan.planned[0].videoId, "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7");
  assert.equal(plan.planned[0].sourceMode, "uncut");
  assert.equal(plan.planned[0].sourceContentHash, createHash("sha256").update(body).digest("hex"));
  assert.equal(
    plan.planned[0].contentHash,
    createHash("sha256").update(body).update(sidecar).digest("hex"),
  );
  assert.equal(plan.planned[0].timestampStats.estimated, 1);
  assert.equal(plan.planned[0].timestampStats.unavailable, 1);
  assert.deepEqual(validateUncutUploadJobs(plan.planned), []);
  assert.deepEqual(
    validateUncutUploadJobs([
      ...plan.planned,
      { ...plan.planned[0], transcriptKey: `uncut/${"b".repeat(64)}.txt` },
    ]),
    ["duplicate_source_asset_id:1", "duplicate_video_id:1", "source_asset_key_mismatch:1"],
  );
  assert.ok(plan.skipped.some((item) => item.reason === "youtube_id_filename"));

  const manifestBody = "approved reconciled uncut transcript\n";
  const manifestDigest = createHash("sha256").update(manifestBody).digest("hex");
  const manifestFileName = "wtf-is-podcast-ep09-ar-rahman.txt";
  writeFileSync(join(manifestDir, manifestFileName), manifestBody);
  const manifestSidecar = `${JSON.stringify([{
    t: 12,
    x: "approved reconciled uncut transcript",
    origin: "published_alignment",
    confidence: 0.9,
  }])}\n`;
  writeFileSync(
    join(timestampsDir, `${manifestDigest}.timestamps.json`),
    manifestSidecar,
  );
  const manifestBinding = binding(manifestDigest, "FPV5fAkqyBs", manifestDigest, manifestSidecar);
  writeAlignmentManifest(timestampsDir, [firstBinding, manifestBinding]);
  const reconciledUploadTable = {
    rows: [{
      episode_name: "AR Rahman",
      cf_manifest_title: "A R Rahman on music and creativity",
      cf_youtube_video_id: "FPV5fAkqyBs",
      local_uncut_txt_sha256: manifestDigest,
      local_uncut_txt_path: `/private/corpus/${manifestFileName}`,
      mapping_status: "has_transcript_link;has_frame_io_final;has_cf_youtube_asset;extracted_txt",
    }],
  };
  const reconciledPlan = planUncutUploads(
    manifestDir,
    reconciledUploadTable,
    { publishedHashes: published, timestampsDir },
  );
  assert.equal(reconciledPlan.planned.length, 1);
  assert.equal(reconciledPlan.planned[0].sourceAssetId, manifestDigest);
  assert.equal(reconciledPlan.planned[0].sourceContentHash, manifestDigest);
  assert.equal(reconciledPlan.planned[0].title, "A R Rahman on music and creativity");

  unlinkSync(join(timestampsDir, `${manifestDigest}.timestamps.json`));
  assert.throws(
    () => planUncutUploads(manifestDir, reconciledUploadTable, { publishedHashes: published, timestampsDir }),
    /expected timestamp sidecar missing/,
  );
  writeFileSync(join(timestampsDir, `${manifestDigest}.timestamps.json`), manifestSidecar);

  const tamperedNativeSidecar = `${JSON.stringify([{
    t: 999,
    x: "approved reconciled uncut transcript",
    origin: "source_native",
    confidence: 1,
  }])}\n`;
  writeFileSync(join(timestampsDir, `${manifestDigest}.timestamps.json`), tamperedNativeSidecar);
  assert.throws(
    () => planUncutUploads(manifestDir, reconciledUploadTable, { publishedHashes: published, timestampsDir }),
    /timestamp sidecar binding mismatch/,
  );

  const mismatchedSidecar = `${JSON.stringify([{
    t: 12,
    x: "a different transcript body",
    origin: "published_alignment",
    confidence: 0.9,
  }])}\n`;
  writeFileSync(
    join(timestampsDir, `${manifestDigest}.timestamps.json`),
    mismatchedSidecar,
  );
  writeAlignmentManifest(timestampsDir, [
    firstBinding,
    binding(manifestDigest, "FPV5fAkqyBs", manifestDigest, mismatchedSidecar),
  ]);
  assert.throws(
    () => planUncutUploads(manifestDir, reconciledUploadTable, { publishedHashes: published, timestampsDir }),
    /timestamp sidecar transcript mismatch/,
  );

  writeFileSync(join(dir, "clone.txt"), "published youtube captions\n");
  const clone = planUncutUploads(dir, { ...table, rows: [{ ...table.rows[0], title: "clone" }] }, { publishedHashes: published });
  assert.ok(clone.skipped.some((item) => item.reason === "identical_to_published") || clone.skipped.some((item) => item.reason === "unmapped_filename"));

  const weakSidecar = JSON.stringify([{ t: 42, x: "weak estimate", origin: "published_alignment", confidence: 0.42 }]);
  writeFileSync(
    join(timestampsDir, "fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7.timestamps.json"),
    weakSidecar,
  );
  writeAlignmentManifest(timestampsDir, [binding(
    firstBinding.sourceAssetId,
    firstBinding.videoId,
    firstBinding.sourceContentSha256,
    weakSidecar,
  )]);
  assert.throws(
    () => planUncutUploads(dir, table, { publishedHashes: published, timestampsDir }),
    /invalid timestamp sidecar/,
  );

  const omittedOriginSidecar = JSON.stringify([
    { t: 42, x: "studio conversation that is not a youtube caption dump" },
    { t: null, x: "an unaligned insert remains unavailable" },
  ]);
  writeFileSync(
    join(timestampsDir, `${firstBinding.sourceAssetId}.timestamps.json`),
    omittedOriginSidecar,
  );
  writeAlignmentManifest(timestampsDir, [binding(
    firstBinding.sourceAssetId,
    firstBinding.videoId,
    firstBinding.sourceContentSha256,
    omittedOriginSidecar,
  )]);
  assert.throws(
    () => planUncutUploads(dir, table, { publishedHashes: published, timestampsDir }),
    /invalid timestamp sidecar/,
  );

  const replacementSidecar = JSON.stringify([{ t: null, x: "replacement corpus text" }]);
  writeFileSync(
    join(timestampsDir, `${firstBinding.sourceAssetId}.timestamps.json`),
    replacementSidecar,
  );
  writeAlignmentManifest(timestampsDir, [binding(
    firstBinding.sourceAssetId,
    firstBinding.videoId,
    firstBinding.sourceContentSha256,
    replacementSidecar,
  )]);
  assert.throws(
    () => planUncutUploads(dir, table, { publishedHashes: published, timestampsDir }),
    /timestamp sidecar transcript mismatch/,
  );
  rmSync(manifestDir, { recursive: true, force: true });
  rmSync(timestampsDir, { recursive: true, force: true });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("put-uncut-and-enqueue.test.mjs ok");

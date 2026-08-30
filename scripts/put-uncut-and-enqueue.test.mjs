import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  eligibleUncutRows,
  matchUncutFile,
  normalizeTitle,
  planUncutUploads,
} from "./put-uncut-and-enqueue.mjs";

const table = {
  quarantinedTitles: ["Brain Armstrong", "WEF - Economics", "WTF is a Battery?"],
  rows: [
    {
      title: "AR Rahman",
      status: "mapped",
      uncutPointer: "candidate",
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

assert.equal(normalizeTitle("AR Rahman"), "arrahman");
assert.equal(matchUncutFile("FPV5fAkqyBs.txt", eligible).reason, "youtube_id_filename");
assert.equal(matchUncutFile("AR Rahman.txt", eligible).ok, true);
assert.equal(
  matchUncutFile("fbea2a09b571f2faa1c7a3a425647558f16f800d24ea649d85e40cae613585e7.txt", eligible).via,
  "hash",
);
assert.equal(matchUncutFile("Bill Gates.txt", eligible).reason, "unmapped_filename");

const dir = mkdtempSync(join(tmpdir(), "wtf-uncut-"));
try {
  const body = "studio conversation that is not a youtube caption dump\n";
  writeFileSync(join(dir, "AR Rahman.txt"), body);
  writeFileSync(join(dir, "FPV5fAkqyBs.txt"), "published youtube captions\n");
  const published = new Map([[createHash("sha256").update("published youtube captions\n").digest("hex"), "FPV5fAkqyBs.txt"]]);
  const plan = planUncutUploads(dir, table, { publishedHashes: published });
  assert.equal(plan.planned.length, 1);
  assert.equal(plan.planned[0].transcriptKey.startsWith("uncut/"), true);
  assert.equal(plan.planned[0].sourceMode, "uncut");
  assert.ok(plan.skipped.some((item) => item.reason === "youtube_id_filename"));

  writeFileSync(join(dir, "clone.txt"), "published youtube captions\n");
  const clone = planUncutUploads(dir, { ...table, rows: [{ ...table.rows[0], title: "clone" }] }, { publishedHashes: published });
  assert.ok(clone.skipped.some((item) => item.reason === "identical_to_published") || clone.skipped.some((item) => item.reason === "unmapped_filename"));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("put-uncut-and-enqueue.test.mjs ok");

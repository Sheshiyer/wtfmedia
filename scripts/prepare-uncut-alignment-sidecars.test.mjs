import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  buildAlignmentSidecar,
  main,
  publicAlignmentReceipt,
} from "./prepare-uncut-alignment-sidecars.mjs";

test("builds an estimated uncut sidecar without exposing source bodies in its receipt", () => {
  const uncutSecret = "welcome everyone to the show\ninserted studio aside\nclosing thoughts and thanks";
  const result = buildAlignmentSidecar(
    [
      { t: 0, x: "welcome everyone to the show" },
      { t: 20, x: "closing thoughts and thanks" },
    ],
    uncutSecret,
    {
      confidenceThreshold: 0.8,
      lexicalAnchorThreshold: 0.7,
      publishedWindowWords: 1,
      maxChunkChars: 40,
    },
  );

  assert.ok(result.sidecar.length >= 2);
  assert.equal(result.sidecar[0].origin, "published_alignment");
  assert.ok(result.sidecar[0].confidence >= 0.8);
  assert.equal(result.stats.monotonic, true);
  assert.ok(result.stats.estimatedChunks >= 1);

  const receipt = publicAlignmentReceipt([
    {
      sourceAssetId: "a".repeat(64),
      videoId: "abcdefghijk",
      sidecar: result.sidecar,
      stats: result.stats,
      sidecarSha256: "b".repeat(64),
    },
  ], 1);
  const payload = JSON.stringify(receipt);
  assert.equal(payload.includes(uncutSecret), false);
  assert.equal(payload.includes("inserted studio aside"), false);
  assert.equal(payload.includes("abcdefghijk"), false);
  assert.equal(payload.includes("a".repeat(64)), false);
  assert.equal("sidecar" in receipt, false);
  assert.deepEqual(receipt, {
    schema: "wtfmedia.uncut-alignment-receipt.v1",
    inputRows: 1,
    generatedSidecars: 1,
    skippedRows: 0,
    chunks: result.stats.chunks,
    estimatedChunks: result.stats.estimatedChunks,
    unavailableChunks: result.stats.unavailableChunks,
    estimatedCoverage: result.stats.estimatedCoverage,
    monotonicViolations: 0,
  });
});

test("fails closed when no strong monotonic anchors exist", () => {
  const result = buildAlignmentSidecar(
    [{ t: 10, x: "published vocabulary" }],
    "unrelated studio words\nanother unrelated line",
  );
  assert.ok(result.sidecar.every((line) => line.t === null));
  assert.ok(result.sidecar.every((line) => !("origin" in line)));
  assert.equal(result.stats.estimatedCoverage, 0);
});

test("preserves source-native clocks as exact sidecar provenance", () => {
  const result = buildAlignmentSidecar(
    [{ t: 1, x: "published text must not override native timing" }],
    [
      "[00:12] native opening line",
      "[00:18] native middle line",
      "[00:25] native closing line",
    ].join("\n"),
    { maxChunkChars: 32 },
  );

  assert.deepEqual(result.sidecar, [
    { t: 12, x: "native opening line", origin: "source_native", confidence: 1 },
    { t: 18, x: "native middle line", origin: "source_native", confidence: 1 },
    { t: 25, x: "native closing line", origin: "source_native", confidence: 1 },
  ]);
  assert.equal(result.stats.exactChunks, 3);
  assert.equal(result.stats.estimatedChunks, 0);
});

test("retains untimed inserts between source-native clock lines", () => {
  const result = buildAlignmentSidecar(
    [],
    [
      "[00:12] native opening line",
      "untimed studio insert that must remain searchable",
      "[00:18] native middle line",
      "[00:25] native closing line",
    ].join("\n"),
    { maxChunkChars: 80 },
  );

  assert.equal(
    result.sidecar.map((line) => line.x).join(" ").includes("untimed studio insert that must remain searchable"),
    true,
  );
  assert.equal(result.sidecar.filter((line) => line.origin === "source_native").length, 3);
  assert.equal(result.stats.unavailableChunks, 0);
});

test("writes a private binding manifest for every generated sidecar", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "wtf-alignment-generator-"));
  const outputDir = mkdtempSync(join(tmpdir(), "wtf-alignment-output-"));
  try {
    const videoId = "abcdefghijk";
    const uncutPath = join(fixtureRoot, "uncut.txt");
    const publishedDir = join(fixtureRoot, "published");
    const transcript = "welcome everyone to the show\nclosing thoughts and thanks\n";
    const sourceContentSha256 = createHash("sha256").update(transcript).digest("hex");
    mkdirSync(publishedDir);
    writeFileSync(uncutPath, transcript);
    writeFileSync(join(publishedDir, `${videoId}.json`), JSON.stringify([
      { t: 0, x: "welcome everyone to the show" },
      { t: 20, x: "closing thoughts and thanks" },
    ]));
    const mappingPath = join(fixtureRoot, "mapping.json");
    writeFileSync(mappingPath, JSON.stringify({ jobs: [{
      sourceAssetId: sourceContentSha256,
      file: uncutPath,
      videoId,
      sourceMode: "uncut",
    }] }));
    chmodSync(outputDir, 0o755);
    const sidecarPath = join(outputDir, `${sourceContentSha256}.timestamps.json`);
    writeFileSync(sidecarPath, "preexisting broad file\n");
    chmodSync(sidecarPath, 0o644);

    const result = main([
      "--mapping", mappingPath,
      "--published-dir", publishedDir,
      "--output-dir", outputDir,
      "--write",
    ]);
    const manifest = JSON.parse(readFileSync(join(outputDir, "alignment-manifest.json"), "utf8"));
    const sidecarBytes = readFileSync(sidecarPath);

    assert.equal(result.receipt.generatedSidecars, 1);
    assert.deepEqual(manifest, {
      schema: "wtfmedia.uncut-alignment-bindings.v1",
      entries: [{
        sourceAssetId: sourceContentSha256,
        videoId,
        sourceContentSha256,
        sidecarSha256: createHash("sha256").update(sidecarBytes).digest("hex"),
      }],
    });
    assert.equal(statSync(outputDir).mode & 0o777, 0o700);
    assert.equal(statSync(sidecarPath).mode & 0o777, 0o600);
    assert.equal(statSync(join(outputDir, "alignment-manifest.json")).mode & 0o777, 0o600);

    const redirectTarget = join(fixtureRoot, "redirect-target.json");
    writeFileSync(redirectTarget, "must remain untouched\n");
    unlinkSync(sidecarPath);
    symlinkSync(redirectTarget, sidecarPath);
    assert.throws(
      () => main([
        "--mapping", mappingPath,
        "--published-dir", publishedDir,
        "--output-dir", outputDir,
        "--write",
      ]),
      /refusing symlink output/,
    );
    assert.equal(readFileSync(redirectTarget, "utf8"), "must remain untouched\n");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test("refuses an external output symlink that resolves into the repository", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "wtf-alignment-symlink-"));
  try {
    const mappingPath = join(fixtureRoot, "mapping.json");
    const outputLink = join(fixtureRoot, "redirected-output");
    writeFileSync(mappingPath, JSON.stringify({ rows: [] }));
    symlinkSync(resolve(import.meta.dirname, ".."), outputLink, "dir");

    assert.throws(
      () => main(["--mapping", mappingPath, "--output-dir", outputLink, "--write"]),
      /refusing symlink output directory|outside the repository/,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

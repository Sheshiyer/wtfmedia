import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { loadCatalogueIngestInput } from "../src/catalogue/ingest-input.ts";

const encoder = new TextEncoder();
const transcript = "private uncut transcript";
const sourceContentHash = createHash("sha256").update(transcript).digest("hex");
const transcriptKey = `uncut/${sourceContentHash}.txt`;
const timestampsKey = `uncut/${sourceContentHash}.timestamps.json`;

function object(value) {
  const bytes = encoder.encode(value);
  return {
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

function fixture(sidecarValue) {
  const sidecar = typeof sidecarValue === "string" ? sidecarValue : JSON.stringify(sidecarValue);
  const contentHash = createHash("sha256").update(transcript).update(sidecar).digest("hex");
  return {
    catalogue: {
      async get(key) {
        if (key === transcriptKey) return object(transcript);
        if (key === timestampsKey && sidecarValue != null) return object(sidecar);
        return null;
      },
    },
    job: {
      transcriptKey,
      timestampsKey,
      sourceContentHash,
      contentHash,
      sourceMode: "uncut",
    },
  };
}

test("declared missing timestamp sidecar fails before ingest input is returned", async () => {
  const run = fixture(null);
  await assert.rejects(
    () => loadCatalogueIngestInput(run.job, run.catalogue),
    /missing timestamp sidecar/,
  );
});

test("declared unreadable timestamp sidecar fails before ingest input is returned", async () => {
  const run = fixture("not-json");
  await assert.rejects(
    () => loadCatalogueIngestInput(run.job, run.catalogue),
    /unreadable timestamp sidecar/,
  );
});

test("same job succeeds after its declared sidecar is repaired", async () => {
  const run = fixture([{
    t: 12,
    x: transcript,
    origin: "published_alignment",
    confidence: 0.9,
  }]);
  const loaded = await loadCatalogueIngestInput(run.job, run.catalogue);
  assert.equal(loaded.text, transcript);
  assert.equal(loaded.timestamps.length, 1);
  assert.equal(loaded.timestamps[0].t, 12);
});

test("tampered transcript or sidecar bytes fail their declared hashes", async () => {
  const validSidecar = JSON.stringify([{
    t: 12,
    x: transcript,
    origin: "published_alignment",
    confidence: 0.9,
  }]);
  const run = fixture(validSidecar);
  run.job.sourceContentHash = "a".repeat(64);
  await assert.rejects(
    () => loadCatalogueIngestInput(run.job, run.catalogue),
    /transcript content hash mismatch/,
  );

  const second = fixture(validSidecar);
  second.job.contentHash = "b".repeat(64);
  await assert.rejects(
    () => loadCatalogueIngestInput(second.job, second.catalogue),
    /ingest content hash mismatch/,
  );
});

test("uncut sidecars reject omitted timed provenance and replacement text", async () => {
  const omittedOrigin = fixture([{ t: 12, x: transcript }]);
  await assert.rejects(
    () => loadCatalogueIngestInput(omittedOrigin.job, omittedOrigin.catalogue),
    /invalid timestamp sidecar/,
  );

  const replacementText = fixture([{ t: null, x: "replacement corpus text" }]);
  await assert.rejects(
    () => loadCatalogueIngestInput(replacementText.job, replacementText.catalogue),
    /timestamp sidecar transcript mismatch/,
  );
});

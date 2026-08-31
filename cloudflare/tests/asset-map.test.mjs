import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  hashToken,
  ingestStateKey,
  parseJobSourceMode,
  resolveCatalogueJobIdentity,
  validateCatalogueJobBatch,
  publishedTimestampsKey,
  publishedTranscriptKey,
  uncutTimestampsKey,
  uncutTranscriptKey,
  vectorRecordId,
  vectorSourceRef,
} from "../src/catalogue/asset-map.ts";

describe("catalogue asset map", () => {
  test("published YouTube keys stay on the live transcripts/ prefix", () => {
    assert.equal(publishedTranscriptKey("abcdefghijk"), "transcripts/abcdefghijk.txt");
    assert.equal(publishedTimestampsKey("abcdefghijk"), "timestamps/abcdefghijk.json");
    assert.equal(ingestStateKey("abcdefghijk", "published"), "ingest:abcdefghijk");
    assert.equal(vectorRecordId("abcdefghijk", 3, "published"), "abcdefghijk:3");
    assert.deepEqual(
      resolveCatalogueJobIdentity("abcdefghijk", "transcripts/abcdefghijk.txt", "published"),
      { publicVideoId: "abcdefghijk", sourceAssetId: "abcdefghijk" },
    );
    assert.equal(
      resolveCatalogueJobIdentity("abcdefghijk", `uncut/${"a".repeat(64)}.txt`, "published"),
      null,
    );
    assert.equal(
      validateCatalogueJobBatch([{ videoId: "abcdefghijk", transcriptKey: `uncut/${"a".repeat(64)}.txt` }]),
      "invalid_published_identity",
    );
  });

  test("uncut keys are namespaced and never overwrite published KV or vectors", () => {
    const hash = "sha256:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293";
    assert.equal(hashToken(hash), "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293");
    assert.equal(
      uncutTranscriptKey(hash),
      "uncut/f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293.txt",
    );
    assert.equal(
      uncutTimestampsKey(hash),
      "uncut/f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293.timestamps.json",
    );
    assert.equal(ingestStateKey(hashToken(hash), "uncut"), "ingest:uncut:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293");
    assert.notEqual(ingestStateKey("abcdefghijk", "uncut"), ingestStateKey("abcdefghijk", "published"));
    assert.equal(vectorRecordId("f4ae8eaae69c9ef9", 0, "uncut"), "uncut:f4ae8eaae69c9ef9:0");
    assert.equal(vectorSourceRef("f4ae8eaae69c9ef9", "uncut").startsWith("https://"), false);
    assert.deepEqual(
      resolveCatalogueJobIdentity(
        "FPV5fAkqyBs",
        "uncut/f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293.txt",
        "uncut",
      ),
      {
        publicVideoId: "FPV5fAkqyBs",
        sourceAssetId: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
      },
    );
    assert.equal(resolveCatalogueJobIdentity("FPV5fAkqyBs", "uncut/not-a-hash.txt", "uncut"), null);
    assert.equal(resolveCatalogueJobIdentity("f4ae8eaae69c9ef9", "uncut/f4ae8eaae69c9ef9.txt", "uncut"), null);
    const valid = {
      videoId: "FPV5fAkqyBs",
      sourceAssetId: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
      transcriptKey: "uncut/f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293.txt",
      sourceMode: "uncut",
    };
    assert.equal(validateCatalogueJobBatch([valid]), null);
    assert.equal(validateCatalogueJobBatch([valid, { ...valid }]), "duplicate_uncut_video_id");
    assert.equal(
      validateCatalogueJobBatch([{ ...valid, sourceAssetId: "a".repeat(64) }]),
      "invalid_uncut_identity",
    );
  });

  test("full-hash uncut vector ids fit Vectorize's 64-byte limit", () => {
    const firstHash = "a".repeat(64);
    const secondHash = `${"a".repeat(63)}b`;
    const firstId = vectorRecordId(firstHash, 12345, "uncut");
    const secondId = vectorRecordId(secondHash, 12345, "uncut");

    assert.ok(Buffer.byteLength(firstId, "utf8") <= 64);
    assert.ok(Buffer.byteLength(secondId, "utf8") <= 64);
    assert.notEqual(firstId, secondId);
    assert.match(firstId, /:12345$/);
  });

  test("jobs default to published and reject URL-bearing hashes", () => {
    assert.equal(parseJobSourceMode(undefined), "published");
    assert.equal(parseJobSourceMode("uncut"), "uncut");
    assert.equal(uncutTranscriptKey("https://example.test/file"), null);
  });
});

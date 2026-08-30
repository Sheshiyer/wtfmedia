import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  hashToken,
  ingestStateKey,
  parseJobSourceMode,
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
  });

  test("jobs default to published and reject URL-bearing hashes", () => {
    assert.equal(parseJobSourceMode(undefined), "published");
    assert.equal(parseJobSourceMode("uncut"), "uncut");
    assert.equal(uncutTranscriptKey("https://example.test/file"), null);
  });
});

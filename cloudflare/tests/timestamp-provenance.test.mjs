import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeTimestampLine } from "../src/catalogue/timestamps.ts";

test("normalizes source-native timing as exact provenance", () => {
  assert.deepEqual(normalizeTimestampLine({ t: 12.5, x: "native line" }), {
    t: 12.5,
    x: "native line",
    origin: "source_native",
    confidence: 1,
  });
});

test("accepts a strong published alignment and fails closed below confidence", () => {
  assert.deepEqual(normalizeTimestampLine({
    t: 125,
    x: "estimated line",
    origin: "published_alignment",
    confidence: 0.86,
  }), {
    t: 125,
    x: "estimated line",
    origin: "published_alignment",
    confidence: 0.86,
  });
  assert.deepEqual(normalizeTimestampLine({
    t: 125,
    x: "low confidence line",
    origin: "published_alignment",
    confidence: 0.79,
  }), {
    t: null,
    x: "low confidence line",
    origin: null,
    confidence: null,
  });
});

test("retains untimed text while rejecting invalid provenance", () => {
  assert.deepEqual(normalizeTimestampLine({ t: null, x: "untimed line" }), {
    t: null,
    x: "untimed line",
    origin: null,
    confidence: null,
  });
  assert.deepEqual(normalizeTimestampLine({
    t: 42,
    x: "invalid provenance line",
    origin: "youtube_copy",
    confidence: 1,
  }), {
    t: null,
    x: "invalid provenance line",
    origin: null,
    confidence: null,
  });
  assert.equal(normalizeTimestampLine({ t: 42, x: "   " }), null);
});

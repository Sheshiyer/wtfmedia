import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ingestWindow, MAX_INGEST_CHUNKS_PER_JOB } from "../src/catalogue/ingest-window.ts";

describe("simple Worker ingest window", () => {
  test("large transcripts continue across bounded queue invocations", () => {
    assert.equal(MAX_INGEST_CHUNKS_PER_JOB, 16);
    assert.deepEqual(ingestWindow(20, undefined), { startOffset: 0, endOffset: 16, hasMore: true });
    assert.deepEqual(ingestWindow(20, 16), { startOffset: 16, endOffset: 20, hasMore: false });
  });

  test("invalid offsets clamp instead of expanding the work window", () => {
    assert.deepEqual(ingestWindow(20, -10), { startOffset: 0, endOffset: 16, hasMore: true });
    assert.deepEqual(ingestWindow(20, 200), { startOffset: 20, endOffset: 20, hasMore: false });
    assert.deepEqual(ingestWindow(20, 3.14), { startOffset: 0, endOffset: 16, hasMore: true });
  });
});

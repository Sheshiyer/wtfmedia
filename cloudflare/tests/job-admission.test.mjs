import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { admitTranscriptJobs } from "../src/catalogue/job-admission.ts";

const privateHash = "a".repeat(64);
const uncutJob = {
  videoId: "RSB58m7Xwhg",
  sourceAssetId: privateHash,
  transcriptKey: `uncut/${privateHash}.txt`,
  contentHash: privateHash,
  sourceMode: "uncut",
};
const availableSourceAsset = { id: "ast_available" };

function queueSpy() {
  const batches = [];
  return {
    batches,
    queue: {
      async sendBatch(batch) { batches.push(batch); },
    },
  };
}

function sourceAssetDb(result, bindings = []) {
  return {
    prepare() {
      return {
        bind(...values) {
          bindings.push(values);
          return {
            first: async () => result,
          };
        },
      };
    },
  };
}

describe("catalogue job admission", () => {
  test("valid uncut identity is admitted exactly once", async () => {
    const spy = queueSpy();
    assert.deepEqual(
      await admitTranscriptJobs([uncutJob], spy.queue, sourceAssetDb(availableSourceAsset)),
      { ok: true, queued: 1 },
    );
    assert.equal(spy.batches.length, 1);
  });

  test("published sidecar idempotency keeps the transcript asset hash distinct", async () => {
    const spy = queueSpy();
    const bindings = [];
    const publishedJob = {
      videoId: "RSB58m7Xwhg",
      title: "Example",
      transcriptKey: "transcripts/RSB58m7Xwhg.txt",
      timestampsKey: "timestamps/RSB58m7Xwhg.json",
      sourceContentHash: privateHash,
      contentHash: "b".repeat(64),
      sourceMode: "published",
    };
    assert.deepEqual(
      await admitTranscriptJobs(
        [publishedJob],
        spy.queue,
        sourceAssetDb(availableSourceAsset, bindings),
      ),
      { ok: true, queued: 1 },
    );
    assert.equal(bindings[0][2], privateHash);
  });

  test("uncut storage key cannot enter as published or unspecified", async () => {
    for (const sourceMode of ["published", undefined, "both"]) {
      const spy = queueSpy();
      assert.deepEqual(
        await admitTranscriptJobs(
          [{ ...uncutJob, sourceMode }],
          spy.queue,
          sourceAssetDb(availableSourceAsset),
        ),
        { ok: false, error: "invalid_published_identity" },
      );
      assert.equal(spy.batches.length, 0);
    }
  });

  test("duplicate public or private identities fail before queue mutation", async () => {
    const spy = queueSpy();
    assert.deepEqual(
      await admitTranscriptJobs(
        [uncutJob, { ...uncutJob }],
        spy.queue,
        sourceAssetDb(availableSourceAsset),
      ),
      { ok: false, error: "duplicate_uncut_video_id" },
    );
    assert.equal(spy.batches.length, 0);
  });

  test("missing D1 source asset fails before queue mutation", async () => {
    const spy = queueSpy();
    assert.deepEqual(
      await admitTranscriptJobs([uncutJob], spy.queue, sourceAssetDb(null)),
      { ok: false, error: "source_asset_unavailable" },
    );
    assert.equal(spy.batches.length, 0);
  });
});

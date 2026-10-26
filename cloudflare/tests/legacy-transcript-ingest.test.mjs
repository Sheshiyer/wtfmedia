import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

import worker from "../src/index.ts";
import {
  INGEST_RECEIPT_SCHEMA,
  LEGACY_REPAIR_CHUNK_LIMIT,
  ingestTranscriptJob,
  normalizeTimestampSidecar,
} from "../src/catalogue/transcript-ingest.ts";

const SOURCE_HASH = "a".repeat(64);
const CONTENT_HASH = "b".repeat(64);
const VIDEO_ID = "RSB58m7Xwhg";
const CANONICAL_TIMED_VIDEO_ID = "LcWoP6KtZKw";
const INVALID_JSON = Symbol("invalid-json");

function publishedJob(overrides = {}) {
  return {
    videoId: VIDEO_ID,
    title: "Example published episode",
    transcriptKey: `transcripts/${VIDEO_ID}.txt`,
    timestampsKey: `timestamps/${VIDEO_ID}.json`,
    sourceContentHash: SOURCE_HASH,
    contentHash: CONTENT_HASH,
    sourceMode: "published",
    ...overrides,
  };
}

function fakeObject(value) {
  return {
    async text() {
      return typeof value === "string" ? value : JSON.stringify(value);
    },
    async json() {
      if (value === INVALID_JSON) throw new Error("bad json");
      return value;
    },
  };
}

function createEnv({ objects = {}, state = null, deleteError = null } = {}) {
  const operations = [];
  const upserts = [];
  const deletions = [];
  const puts = [];
  let aiRuns = 0;
  let currentState = state;
  let currentDeleteError = deleteError;

  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return { first: async () => ({ id: "ast_available" }) };
          },
        };
      },
    },
    CATALOGUE: {
      async get(key) {
        return Object.hasOwn(objects, key) ? fakeObject(objects[key]) : null;
      },
    },
    AI: {
      async run() {
        aiRuns += 1;
        return { data: [Array(1024).fill(0.01)] };
      },
    },
    VECTORIZE: {
      async upsert(vectors) {
        operations.push("upsert");
        upserts.push(...vectors);
      },
      async deleteByIds(ids) {
        operations.push("delete");
        deletions.push([...ids]);
        if (currentDeleteError) throw currentDeleteError;
      },
    },
    WTFMEDIA_STATE: {
      async get() {
        return currentState;
      },
      async put(key, value) {
        operations.push("put");
        puts.push({ key, value });
        currentState = value;
      },
    },
  };

  return {
    env,
    operations,
    upserts,
    deletions,
    puts,
    get aiRuns() { return aiRuns; },
    clearDeleteError() { currentDeleteError = null; },
  };
}

function validObjects(sidecar) {
  const transcript = Array.isArray(sidecar)
    ? sidecar
      .map((row) => row && typeof row === "object" ? row.x ?? row.text : "")
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ")
    : "";
  return {
    [`transcripts/${VIDEO_ID}.txt`]: transcript || "A complete searchable transcript passage.",
    [`timestamps/${VIDEO_ID}.json`]: sidecar,
  };
}

describe("active Alpha transcript ingest", () => {
  test("normalizes canonical and source-native timestamp rows", () => {
    assert.deepEqual(normalizeTimestampSidecar([
      { t: 0, x: " canonical opening " },
      { start: 3.52, text: "source native continuation", duration: 2.1 },
    ]), [
      { t: 0, x: "canonical opening" },
      { t: 3.52, x: "source native continuation" },
    ]);
  });

  test("a declared missing sidecar fails before embeddings, vectors, or receipt", async () => {
    const fixture = createEnv({
      objects: { [`transcripts/${VIDEO_ID}.txt`]: "searchable transcript" },
    });

    await assert.rejects(
      () => ingestTranscriptJob(publishedJob(), fixture.env),
      /timestamp_sidecar_unavailable/,
    );
    assert.equal(fixture.aiRuns, 0);
    assert.equal(fixture.upserts.length, 0);
    assert.equal(fixture.deletions.length, 0);
    assert.equal(fixture.puts.length, 0);
  });

  test("invalid declared sidecars fail closed before vector mutation", async () => {
    const invalidSidecars = [
      INVALID_JSON,
      [],
      [{ t: 0, x: "" }],
      [{ t: -1, x: "negative" }],
      [{ t: Number.NaN, x: "nonfinite" }],
      [{ t: 5, x: "later" }, { t: 4, x: "earlier" }],
    ];

    for (const sidecar of invalidSidecars) {
      const fixture = createEnv({ objects: validObjects(sidecar) });
      await assert.rejects(
        () => ingestTranscriptJob(publishedJob(), fixture.env),
        /timestamp_sidecar_invalid/,
      );
      assert.equal(fixture.aiRuns, 0);
      assert.equal(fixture.upserts.length, 0);
      assert.equal(fixture.deletions.length, 0);
      assert.equal(fixture.puts.length, 0);
    }
  });

  test("a sparse but structurally valid published sidecar fails closed before vector mutation", async () => {
    const transcript = [
      "one two three four five six seven eight nine ten",
      "eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen",
    ].join(" ");
    const fixture = createEnv({
      objects: {
        [`transcripts/${VIDEO_ID}.txt`]: transcript,
        [`timestamps/${VIDEO_ID}.json`]: [
          { t: 0, x: "one two" },
          { t: 5, x: "three" },
          { t: 10, x: "four" },
        ],
      },
    });

    await assert.rejects(
      () => ingestTranscriptJob(publishedJob(), fixture.env),
      (error) => error instanceof Error && error.message === "timestamp_sidecar_coverage_insufficient",
    );
    assert.equal(fixture.aiRuns, 0);
    assert.equal(fixture.upserts.length, 0);
    assert.equal(fixture.deletions.length, 0);
    assert.equal(fixture.puts.length, 0);
  });

  test("source-native rows ingest as verified published timing with a v2 receipt", async () => {
    const fixture = createEnv({
      objects: validObjects([
        { start: 3.52, text: "Opening source-native caption", duration: 2.1 },
        { start: 6.1, text: "Continuation source-native caption", duration: 1.5 },
      ]),
    });

    assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "ingested");
    assert.equal(fixture.upserts.length, 1);
    assert.equal(fixture.upserts[0].metadata.start, 3.52);
    assert.equal(fixture.upserts[0].metadata.timestamped, true);
    assert.equal(fixture.upserts[0].metadata.timestamp_status, "verified");
    assert.equal(fixture.upserts[0].metadata.timestamp_origin, "published_sidecar");
    assert.equal(fixture.puts.length, 1);
    assert.deepEqual(JSON.parse(fixture.puts[0].value), {
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: CONTENT_HASH,
      chunkCount: 1,
      timingOrigin: "published_sidecar",
    });
  });

  test("canonical published timing replaces a stale untimed vector tail before its v2 receipt", async () => {
    const [transcript, sidecarJson] = await Promise.all([
      readFile(new URL(`../../web/public/transcripts/${CANONICAL_TIMED_VIDEO_ID}.txt`, import.meta.url), "utf8"),
      readFile(new URL(`../../web/public/transcripts/${CANONICAL_TIMED_VIDEO_ID}.json`, import.meta.url), "utf8"),
    ]);
    const sidecar = JSON.parse(sidecarJson);
    const transcriptKey = `transcripts/${CANONICAL_TIMED_VIDEO_ID}.txt`;
    const timestampsKey = `timestamps/${CANONICAL_TIMED_VIDEO_ID}.json`;
    const objects = { [transcriptKey]: transcript, [timestampsKey]: sidecar };
    const job = publishedJob({
      videoId: CANONICAL_TIMED_VIDEO_ID,
      title: "Canonical published timing fixture",
      transcriptKey,
      timestampsKey,
    });

    const sizingFixture = createEnv({ objects });
    assert.equal(await ingestTranscriptJob(job, sizingFixture.env), "ingested");
    const timedChunkCount = sizingFixture.upserts.length;
    assert.ok(timedChunkCount > 0);

    const fixture = createEnv({
      objects,
      state: JSON.stringify({
        schema: INGEST_RECEIPT_SCHEMA,
        contentHash: "c".repeat(64),
        chunkCount: timedChunkCount + 1,
        timingOrigin: "none",
      }),
    });

    assert.equal(await ingestTranscriptJob(job, fixture.env), "ingested");
    assert.equal(fixture.upserts.length, timedChunkCount);
    assert.equal(fixture.upserts.every((vector) => (
      vector.metadata.source_mode === "published"
      && typeof vector.metadata.start === "number"
      && Number.isFinite(vector.metadata.start)
      && vector.metadata.timestamped === true
      && vector.metadata.timestamp_status === "verified"
      && vector.metadata.timestamp_origin === "published_sidecar"
    )), true);
    assert.deepEqual(fixture.deletions, [[`${CANONICAL_TIMED_VIDEO_ID}:${timedChunkCount}`]]);

    const lastUpsert = fixture.operations.lastIndexOf("upsert");
    const deletion = fixture.operations.indexOf("delete");
    const receiptWrite = fixture.operations.indexOf("put");
    assert.ok(lastUpsert >= 0 && lastUpsert < deletion && deletion < receiptWrite);
    assert.equal(receiptWrite, fixture.operations.length - 1);
    assert.deepEqual(JSON.parse(fixture.puts[0].value), {
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: CONTENT_HASH,
      chunkCount: timedChunkCount,
      timingOrigin: "published_sidecar",
    });
  });

  test("a job without timestamps remains intentionally searchable as untimed evidence", async () => {
    const fixture = createEnv({
      objects: { [`transcripts/${VIDEO_ID}.txt`]: "Untimed published transcript evidence." },
    });

    assert.equal(
      await ingestTranscriptJob(publishedJob({ timestampsKey: undefined, contentHash: SOURCE_HASH }), fixture.env),
      "ingested",
    );
    assert.equal(fixture.upserts.length, 1);
    assert.equal(fixture.upserts[0].metadata.start, null);
    assert.equal(fixture.upserts[0].metadata.timestamped, false);
    assert.equal(fixture.upserts[0].metadata.timestamp_status, "source_timing_unavailable");
    assert.equal(JSON.parse(fixture.puts[0].value).timingOrigin, "none");
  });

  test("a matching structured receipt skips without reading or mutating dependencies", async () => {
    const state = JSON.stringify({
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: CONTENT_HASH,
      chunkCount: 4,
      timingOrigin: "published_sidecar",
    });
    const fixture = createEnv({ state });

    assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "skipped");
    assert.equal(fixture.aiRuns, 0);
    assert.deepEqual(fixture.operations, []);
  });

  test("structured receipts accept every nonnegative safe chunk count", async () => {
    for (const chunkCount of [0, LEGACY_REPAIR_CHUNK_LIMIT + 1, Number.MAX_SAFE_INTEGER]) {
      const fixture = createEnv({
        state: JSON.stringify({
          schema: INGEST_RECEIPT_SCHEMA,
          contentHash: CONTENT_HASH,
          chunkCount,
          timingOrigin: "published_sidecar",
        }),
      });

      assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "skipped");
      assert.deepEqual(fixture.operations, []);
    }
  });

  test("structured receipts reject an unsafe integer chunk count", async () => {
    const fixture = createEnv({
      state: JSON.stringify({
        schema: INGEST_RECEIPT_SCHEMA,
        contentHash: CONTENT_HASH,
        chunkCount: Number.MAX_SAFE_INTEGER + 1,
        timingOrigin: "published_sidecar",
      }),
    });

    await assert.rejects(
      () => ingestTranscriptJob(publishedJob(), fixture.env),
      /legacy_receipt_repair_required/,
    );
    assert.deepEqual(fixture.operations, []);
  });

  test("a changed structured receipt with an unreasonable stale tail fails before mutation", async () => {
    const fixture = createEnv({
      state: JSON.stringify({
        schema: INGEST_RECEIPT_SCHEMA,
        contentHash: "c".repeat(64),
        chunkCount: Number.MAX_SAFE_INTEGER,
        timingOrigin: "none",
      }),
      objects: validObjects([{ t: 0, x: "approved replacement caption" }]),
    });

    await assert.rejects(
      () => ingestTranscriptJob(publishedJob(), fixture.env),
      (error) => error instanceof Error && error.message === "structured_stale_cleanup_limit_exceeded",
    );
    assert.equal(fixture.aiRuns, 0);
    assert.equal(fixture.upserts.length, 0);
    assert.equal(fixture.deletions.length, 0);
    assert.equal(fixture.puts.length, 0);
    assert.deepEqual(fixture.operations, []);
  });

  test("changed structured receipts still clean more than the legacy repair bound", async () => {
    const previousChunkCount = LEGACY_REPAIR_CHUNK_LIMIT + 44;
    const fixture = createEnv({
      state: JSON.stringify({
        schema: INGEST_RECEIPT_SCHEMA,
        contentHash: "c".repeat(64),
        chunkCount: previousChunkCount,
        timingOrigin: "none",
      }),
      objects: validObjects([{ t: 0, x: "approved replacement caption" }]),
    });

    assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "ingested");
    const deleted = fixture.deletions.flat();
    assert.equal(deleted.length, previousChunkCount - 1);
    assert.equal(deleted[0], `${VIDEO_ID}:1`);
    assert.equal(deleted.at(-1), `${VIDEO_ID}:${previousChunkCount - 1}`);
    assert.equal(fixture.deletions.every((batch) => batch.length <= 100), true);
    assert.equal(fixture.operations.at(-1), "put");
  });

  test("an exact repair instruction overrides a matching untimed receipt", async () => {
    const state = JSON.stringify({
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: CONTENT_HASH,
      chunkCount: 4,
      timingOrigin: "none",
    });
    const fixture = createEnv({
      state,
      objects: validObjects([{ t: 0, x: "approved replacement caption" }]),
    });

    assert.equal(
      await ingestTranscriptJob(publishedJob({ replaceExisting: true }), fixture.env),
      "ingested",
    );
    assert.deepEqual(fixture.operations, ["upsert", "delete", "put"]);
    assert.deepEqual(fixture.deletions, [[`${VIDEO_ID}:1`, `${VIDEO_ID}:2`, `${VIDEO_ID}:3`]]);
    assert.equal(JSON.parse(fixture.puts[0].value).timingOrigin, "published_sidecar");
  });

  test("changed structured state upserts, deletes the exact stale tail, then writes receipt", async () => {
    const state = JSON.stringify({
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: "c".repeat(64),
      chunkCount: 5,
      timingOrigin: "none",
    });
    const long = "caption ".repeat(80).trim();
    const fixture = createEnv({
      state,
      objects: validObjects([
        { t: 0, x: long },
        { t: 10, x: long },
        { t: 20, x: long },
      ]),
    });

    assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "ingested");
    assert.deepEqual(fixture.operations, ["upsert", "delete", "put"]);
    assert.deepEqual(fixture.deletions, [[`${VIDEO_ID}:3`, `${VIDEO_ID}:4`]]);
    assert.equal(JSON.parse(fixture.puts[0].value).chunkCount, 3);
  });

  test("cleanup failure leaves the old receipt and retry converges", async () => {
    const state = JSON.stringify({
      schema: INGEST_RECEIPT_SCHEMA,
      contentHash: "c".repeat(64),
      chunkCount: 3,
      timingOrigin: "none",
    });
    const fixture = createEnv({
      state,
      deleteError: new Error("delete failed"),
      objects: validObjects([{ t: 0, x: "replacement caption" }]),
    });

    await assert.rejects(() => ingestTranscriptJob(publishedJob(), fixture.env), /delete failed/);
    assert.equal(fixture.puts.length, 0);

    fixture.clearDeleteError();
    assert.equal(await ingestTranscriptJob(publishedJob(), fixture.env), "ingested");
    assert.equal(fixture.puts.length, 1);
    assert.equal(fixture.upserts.length, 2);
  });

  test("changed legacy state requires an explicit repair instruction", async () => {
    const fixture = createEnv({
      state: SOURCE_HASH,
      objects: validObjects([{ t: 0, x: "replacement caption" }]),
    });

    await assert.rejects(
      () => ingestTranscriptJob(publishedJob(), fixture.env),
      /legacy_receipt_repair_required/,
    );
    assert.deepEqual(fixture.operations, []);
  });

  test("published replaceExisting repair deletes only the bounded deterministic tail", async () => {
    const fixture = createEnv({
      state: SOURCE_HASH,
      objects: validObjects([{ t: 0, x: "replacement caption" }]),
    });

    assert.equal(
      await ingestTranscriptJob(publishedJob({ replaceExisting: true }), fixture.env),
      "ingested",
    );
    const deleted = fixture.deletions.flat();
    assert.equal(deleted.length, LEGACY_REPAIR_CHUNK_LIMIT - 1);
    assert.equal(deleted[0], `${VIDEO_ID}:1`);
    assert.equal(deleted.at(-1), `${VIDEO_ID}:${LEGACY_REPAIR_CHUNK_LIMIT - 1}`);
    assert.equal(deleted.every((id) => id.startsWith(`${VIDEO_ID}:`)), true);
    assert.equal(fixture.deletions.every((batch) => batch.length <= 100), true);
    assert.equal(fixture.operations.at(-1), "put");
  });

  test("the active Worker queue retries a declared-sidecar failure instead of acknowledging it", async () => {
    const fixture = createEnv({
      objects: { [`transcripts/${VIDEO_ID}.txt`]: "searchable transcript" },
    });
    let acknowledgements = 0;
    let retries = 0;

    await worker.queue({
      messages: [{
        body: publishedJob(),
        ack() { acknowledgements += 1; },
        retry() { retries += 1; },
      }],
    }, fixture.env);

    assert.equal(acknowledgements, 0);
    assert.equal(retries, 1);
    assert.equal(fixture.puts.length, 0);
  });
});

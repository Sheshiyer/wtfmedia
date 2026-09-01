/**
 * @file cloudflare/tests/transcript-ingest.test.mjs
 * @description Comprehensive test suite for Milestone 4 (Diarized Multilingual Transcript Pipeline & Vector Staging).
 * Verifies:
 * 1. Multilingual language classification (en, hi, hi-Latn, mixed)
 * 2. Timing monotonicity validation
 * 3. Transcript format parsers (JSON, WebVTT, SRT)
 * 4. Sliding-window chunking
 * 5. Deterministic content hashing and idempotency guard
 * 6. Staged version isolation (state='staging', is_active=0)
 * 7. Atomic D1 batch activation and zero mixed-version retrieval
 * 8. Obsolete vector tombstoning (Vectorize deleteByIds)
 * 9. Queue consumer processing and DLQ error routing
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import {
  classifyLanguage,
  parseJsonTranscript,
  parseSrtTranscript,
  parseTranscriptContent,
  parseVttTranscript,
  processTranscriptIngestMessage,
  validateSegmentTiming,
} from "../src/ingest/transcript-consumer.ts";
import {
  buildSlidingWindowChunks,
  computeTranscriptSha256,
  generateChunkEmbeddings,
  stageAndActivateTranscriptVersion,
} from "../src/ingest/version-staging.ts";
import {
  createIngestionJob,
  createSourceAsset,
  getEpisodeById,
  getTranscriptSegments,
  getTranscriptVersionById,
  listTranscriptVersions,
  upsertEpisode,
} from "../src/db/provenance.ts";
import edgeWorker from "../src/index.ts";
import { episodeUlid, assetUlid, jobUlid } from "../src/utils/ulid.ts";

const root = new URL("..", import.meta.url).pathname;
const persistTo = mkdtempSync(join(tmpdir(), "wtfmedia-transcript-test-"));
const database = join(persistTo, "provenance.sqlite");
const migrations = [
  "0001_ops_foundation.sql",
  "0002_bootstrap_roster.sql",
  "0003_super_admin_transfer_guard.sql",
  "0004_operator_invitation_approvals.sql",
  "0005_provenance_spine.sql",
];

function sql(input, asJson = false) {
  const args = [database];
  if (asJson) args.push("-json");
  return spawnSync("sqlite3", args, {
    input,
    encoding: "utf8",
  });
}

function succeeds(input, asJson = false) {
  const result = sql(input, asJson);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function applyMigrations() {
  succeeds("CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY);");
  for (const migration of migrations) {
    const applied = succeeds(`SELECT COUNT(*) FROM d1_migrations WHERE name = '${migration}';`).trim();
    if (applied === "0") {
      succeeds(readFileSync(join(root, "migrations", migration), "utf8"));
      succeeds(`INSERT INTO d1_migrations (name) VALUES ('${migration}');`);
    }
  }
}

// --------------------------------------------------------------------------
// Real SQLite-backed D1 Database Adapter for Node Test Runner
// --------------------------------------------------------------------------
function formatSqlParam(param) {
  if (param === null || param === undefined) return "NULL";
  if (typeof param === "number") return Number.isFinite(param) ? String(param) : "NULL";
  if (typeof param === "boolean") return param ? "1" : "0";
  if (typeof param === "string") return `'${param.replaceAll("'", "''")}'`;
  return `'${String(param).replaceAll("'", "''")}'`;
}

function bindSql(template, params = []) {
  let paramIndex = 0;
  return template.replace(/\?/g, () => {
    if (paramIndex >= params.length) throw new Error("Too few parameters provided for SQL query");
    return formatSqlParam(params[paramIndex++]);
  });
}

function createSqliteD1(dbFile) {
  function prepare(query) {
    let boundParams = [];
    const stmt = {
      _query: query,
      _params: [],
      bind(...params) {
        boundParams = params;
        stmt._params = params;
        return stmt;
      },
      async run() {
        const fullSql = bindSql(query, boundParams);
        const res = spawnSync("sqlite3", [dbFile], { input: fullSql, encoding: "utf8" });
        if (res.status !== 0) throw new Error(`D1 run error: ${res.stderr || res.stdout}\nSQL: ${fullSql}`);
        return { success: true };
      },
      async first(colName) {
        const fullSql = bindSql(query, boundParams);
        const res = spawnSync("sqlite3", [dbFile, "-json"], { input: fullSql, encoding: "utf8" });
        if (res.status !== 0) throw new Error(`D1 first error: ${res.stderr || res.stdout}\nSQL: ${fullSql}`);
        const text = res.stdout.trim();
        if (!text || text === "") return null;
        try {
          const arr = JSON.parse(text);
          if (!Array.isArray(arr) || arr.length === 0) return null;
          const row = arr[0];
          if (colName && typeof colName === "string") return row[colName] ?? null;
          return row;
        } catch {
          return null;
        }
      },
      async all() {
        const fullSql = bindSql(query, boundParams);
        const res = spawnSync("sqlite3", [dbFile, "-json"], { input: fullSql, encoding: "utf8" });
        if (res.status !== 0) throw new Error(`D1 all error: ${res.stderr || res.stdout}\nSQL: ${fullSql}`);
        const text = res.stdout.trim();
        if (!text || text === "") return { results: [] };
        try {
          const arr = JSON.parse(text);
          return { results: Array.isArray(arr) ? arr : [] };
        } catch {
          return { results: [] };
        }
      },
    };
    return stmt;
  }

  return {
    prepare,
    async batch(statements) {
      const sqlParts = [];
      for (const s of statements) {
        const full = bindSql(s._query, s._params);
        sqlParts.push(full.endsWith(";") ? full : `${full};`);
      }
      const batchSql = `BEGIN TRANSACTION;\n${sqlParts.join("\n")}\nCOMMIT;`;
      const res = spawnSync("sqlite3", [dbFile], { input: batchSql, encoding: "utf8" });
      if (res.status !== 0) {
        throw new Error(`D1 batch error: ${res.stderr || res.stdout}\nSQL:\n${batchSql}`);
      }
      return statements.map(() => ({ success: true }));
    },
    async exec(rawSql) {
      const res = spawnSync("sqlite3", [dbFile], { input: rawSql, encoding: "utf8" });
      if (res.status !== 0) throw new Error(`D1 exec error: ${res.stderr || res.stdout}`);
      return { count: 1, duration: 0 };
    },
  };
}

// --------------------------------------------------------------------------
// Mock Vectorize, Workers AI, R2 Bucket, and DLQ
// --------------------------------------------------------------------------
function createMockVectorize() {
  const store = new Map();
  return {
    _store: store,
    async upsert(vectors) {
      for (const v of vectors) {
        store.set(v.id, v);
      }
      return { count: vectors.length };
    },
    async deleteByIds(ids) {
      let deleted = 0;
      for (const id of ids) {
        if (store.delete(id)) deleted++;
      }
      return { count: deleted };
    },
    async query(vector, options = {}) {
      const topK = options.topK ?? 10;
      const filter = options.filter;
      const results = [];
      for (const [id, record] of store.entries()) {
        if (filter && filter.versionId && record.metadata?.versionId !== filter.versionId) {
          continue;
        }
        results.push({ id, score: 0.95, metadata: record.metadata });
      }
      return { matches: results.slice(0, topK), count: results.length };
    },
  };
}

function createMockAi() {
  return {
    async run(model, input) {
      // Return synthetic 1024-dimension float vector
      const vec = new Array(1024).fill(0).map((_, i) => Math.sin(i * 0.05));
      return { data: [vec], shape: [1, 1024] };
    },
  };
}

function createMockR2() {
  const store = new Map();
  return {
    _store: store,
    async get(key) {
      if (!store.has(key)) return null;
      const content = store.get(key);
      return {
        async text() {
          return content;
        },
        async json() {
          return JSON.parse(content);
        },
        async arrayBuffer() {
          return new TextEncoder().encode(content).buffer;
        },
      };
    },
    async put(key, value) {
      const str = typeof value === "string" ? value : new TextDecoder().decode(value);
      store.set(key, str);
    },
    async delete(key) {
      if (Array.isArray(key)) {
        for (const k of key) store.delete(k);
      } else {
        store.delete(key);
      }
    },
  };
}

// --------------------------------------------------------------------------
// Test Suite Execution
// --------------------------------------------------------------------------

describe("Milestone 4: Diarized Multi-Language Transcript Pipeline & Vector Staging", () => {
  let db;
  let vectorize;
  let ai;
  let r2;
  let dlqMessages;
  let mockDlq;

  before(() => {
    applyMigrations();
    db = createSqliteD1(database);
    vectorize = createMockVectorize();
    ai = createMockAi();
    r2 = createMockR2();
    dlqMessages = [];
    mockDlq = {
      async send(msg) {
        dlqMessages.push(msg);
      },
    };
  });

  describe("1. Diarized Multilingual Language Classifier", () => {
    test("classifies pure Devanagari Hindi text as 'hi'", () => {
      const samples = [
        "नमस्ते दोस्तों, आज के इस एपिसोड में हम बातचीत करेंगे।",
        "व्यापार और तकनीक की दुनिया में आपका स्वागत है।",
        "क्या आप इस नए प्रॉडक्ट के बारे में जानते हैं?",
      ];
      for (const sample of samples) {
        assert.equal(classifyLanguage(sample), "hi", `Failed for: ${sample}`);
      }
    });

    test("classifies phonetic Latin-script Hindi as 'hi-Latn'", () => {
      const samples = [
        "bhai kya matlab yaar acha theek hai",
        "arre bhai aisa nahi hota hai suno",
        "kya baat kar rahe ho yaar bilkul sahi",
        "humne shuru kiya tha aur bohot paisa kamaya",
      ];
      for (const sample of samples) {
        assert.equal(classifyLanguage(sample), "hi-Latn", `Failed for: ${sample}`);
      }
    });

    test("classifies code-switched English/Hinglish sentences as 'mixed'", () => {
      const samples = [
        "The startup raised 10 crore and bhai we grew 50% YoY in revenue.",
        "In this episode we discuss why the valuation is so high yaar, matlab 50x ARR.",
        "The founders told us humne zero marketing budget pe start kiya tha.",
        "We are building an open source platform bhai for developers.",
      ];
      for (const sample of samples) {
        assert.equal(classifyLanguage(sample), "mixed", `Failed for: ${sample}`);
      }
    });

    test("classifies pure English sentences as 'en'", () => {
      const samples = [
        "Welcome to the WTF podcast with our host Nikhil Kamath and special guests.",
        "In today's conversation we discuss the macroeconomic outlook for technology companies.",
        "Artificial intelligence and sovereign compute infrastructure in emerging markets.",
      ];
      for (const sample of samples) {
        assert.equal(classifyLanguage(sample), "en", `Failed for: ${sample}`);
      }
    });

    test("handles edge cases and fallback languages gracefully", () => {
      assert.equal(classifyLanguage("", "hi-Latn"), "hi-Latn");
      assert.equal(classifyLanguage("   ", "en"), "en");
      assert.equal(classifyLanguage("12345 !@#$", "hi-Latn"), "hi-Latn");
    });
  });

  describe("2. Timing Monotonicity and Segment Validation", () => {
    test("accepts valid monotonic non-negative segments", () => {
      const segments = [
        { segmentIndex: 0, startSec: 0.0, endSec: 4.5, speakerLabel: "Speaker 1", text: "Hello world", languageCode: "en" },
        { segmentIndex: 1, startSec: 4.5, endSec: 10.2, speakerLabel: "Speaker 2", text: "Welcome to the show", languageCode: "en" },
      ];
      assert.doesNotThrow(() => validateSegmentTiming(segments));
    });

    test("rejects negative start times", () => {
      const segments = [
        { segmentIndex: 0, startSec: -1.5, endSec: 4.5, speakerLabel: "Speaker 1", text: "Hello", languageCode: "en" },
      ];
      assert.throws(() => validateSegmentTiming(segments), /startSec must be a non-negative number/);
    });

    test("rejects endSec less than startSec", () => {
      const segments = [
        { segmentIndex: 0, startSec: 10.0, endSec: 5.0, speakerLabel: "Speaker 1", text: "Hello", languageCode: "en" },
      ];
      assert.throws(() => validateSegmentTiming(segments), /endSec .* must be >= startSec/);
    });

    test("rejects empty segment arrays", () => {
      assert.throws(() => validateSegmentTiming([]), /segment array is empty/);
    });
  });

  describe("3. ASR Transcript Format Parsers", () => {
    test("parses JSON transcript format with speaker diarization and language tagging", () => {
      const jsonContent = JSON.stringify({
        segments: [
          { start: 0.0, end: 5.2, speaker: "Nikhil", text: "Welcome to WTF podcast, today we have a great discussion." },
          { start: 5.2, end: 12.0, speaker: "Guest", text: "bhai kya matlab yaar we scaled to 10 crore ARR so fast." },
          { start: 12.0, end: 18.5, speaker: "Guest", text: "व्यापार में बहुत मेहनत लगती है।" },
        ],
      });

      const parsed = parseTranscriptContent(jsonContent, "json");
      assert.equal(parsed.length, 3);
      assert.equal(parsed[0].speakerLabel, "Nikhil");
      assert.equal(parsed[0].languageCode, "en");
      assert.equal(parsed[1].speakerLabel, "Guest");
      assert.equal(parsed[1].languageCode, "mixed");
      assert.equal(parsed[2].languageCode, "hi");
    });

    test("parses WebVTT transcripts with voice tags and timestamps", () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:05.500
<v Nikhil Kamath>Welcome to our conversation on fintech.</v>

00:00:05.500 --> 00:00:11.000
<v Guest>Thank you bhai, very happy to be here today.</v>
`;
      const parsed = parseVttTranscript(vttContent);
      assert.equal(parsed.length, 2);
      assert.equal(parsed[0].startSec, 1.0);
      assert.equal(parsed[0].endSec, 5.5);
      assert.equal(parsed[0].speakerLabel, "Nikhil Kamath");
      assert.equal(parsed[0].text, "Welcome to our conversation on fintech.");
      assert.equal(parsed[0].languageCode, "en");
      assert.equal(parsed[1].speakerLabel, "Guest");
      assert.equal(parsed[1].languageCode, "mixed");
    });

    test("parses SRT transcripts with speaker colon prefixes", () => {
      const srtContent = `1
00:00:02,500 --> 00:00:08,000
Host: We started this initiative three years ago.

2
00:00:08,500 --> 00:00:14,200
Co-Host: arre bhai bilkul sahi bola aapne yaar.
`;
      const parsed = parseSrtTranscript(srtContent);
      assert.equal(parsed.length, 2);
      assert.equal(parsed[0].startSec, 2.5);
      assert.equal(parsed[0].endSec, 8.0);
      assert.equal(parsed[0].speakerLabel, "Host");
      assert.equal(parsed[0].languageCode, "en");
      assert.equal(parsed[1].speakerLabel, "Co-Host");
      assert.equal(parsed[1].languageCode, "hi-Latn");
    });
  });

  describe("4. Sliding-Window Chunking and Worker AI Embeddings", () => {
    test("splits transcript segments into overlapping chunks", () => {
      const segments = [
        { segmentIndex: 0, startSec: 0, endSec: 10, speakerLabel: "Speaker 1", text: "A".repeat(400), languageCode: "en" },
        { segmentIndex: 1, startSec: 10, endSec: 20, speakerLabel: "Speaker 2", text: "B".repeat(400), languageCode: "en" },
        { segmentIndex: 2, startSec: 20, endSec: 30, speakerLabel: "Speaker 1", text: "C".repeat(400), languageCode: "en" },
      ];

      const chunks = buildSlidingWindowChunks("txv_test123", "ep_test123", 1, segments, {
        chunkSize: 700,
        chunkOverlap: 150,
      });

      assert.ok(chunks.length >= 2, `Expected >= 2 chunks, got ${chunks.length}`);
      for (const chunk of chunks) {
        assert.ok(chunk.vectorId.startsWith("vec_ep_test123_v1_"));
        assert.ok(chunk.tokenCount > 0);
        assert.equal(chunk.isActive, false);
      }
    });

    test("generates 1024-dimensional embeddings for chunks", async () => {
      const chunks = [
        {
          id: "chk_01",
          chunkIndex: 0,
          vectorId: "vec_ep1_v1_chk1",
          text: "Sample chunk text for embedding test",
          startSec: 0,
          endSec: 10,
          tokenCount: 10,
          languageCode: "en",
        },
      ];

      const records = await generateChunkEmbeddings(ai, chunks, "ep1", "txv1", 1);
      assert.equal(records.length, 1);
      assert.equal(records[0].id, "vec_ep1_v1_chk1");
      assert.equal(records[0].values.length, 1024);
      assert.equal(records[0].metadata.episodeId, "ep1");
      assert.equal(records[0].metadata.versionNumber, 1);
    });
  });

  describe("5. Idempotent Version Staging & Atomic Cutover & Vector Tombstoning", () => {
    let episodeId;
    let sourceAssetId;

    before(async () => {
      episodeId = episodeUlid();
      await upsertEpisode(db, {
        id: episodeId,
        slug: `test-m4-episode-${Date.now()}`,
        title: "Milestone 4 Staging & Tombstoning Test Episode",
        ip: "WTF Main",
        showTitle: "WTF Podcast",
      });

      sourceAssetId = assetUlid();
      await createSourceAsset(db, {
        id: sourceAssetId,
        episodeId,
        assetType: "uncut_audio",
        storageKey: `episodes/${episodeId}/assets/audio.wav`,
        contentSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        mimeType: "audio/wav",
      });
    });

    test("stages version V1, activates atomically, and upserts vectors", async () => {
      const payload = {
        jobId: jobUlid(),
        episodeId,
        sourceAssetId,
        transcriptR2Key: `episodes/${episodeId}/transcripts/v1.json`,
        coordinateSystem: "uncut",
        engine: "whisper_large_v3",
        engineVersion: "2026.1",
        diarizationEnabled: true,
      };

      const segments = [
        { segmentIndex: 0, startSec: 0.0, endSec: 5.0, speakerLabel: "Nikhil", text: "Welcome everyone to WTF.", languageCode: "en" },
        { segmentIndex: 1, startSec: 5.0, endSec: 10.0, speakerLabel: "Guest", text: "Great to be here bhai.", languageCode: "mixed" },
      ];

      const result = await stageAndActivateTranscriptVersion(db, vectorize, ai, payload, segments);
      assert.equal(result.status, "activated");
      assert.equal(result.versionNumber, 1);
      assert.ok(result.versionId.startsWith("txv_"));

      // Verify D1 state: V1 must be active
      const v1 = await getTranscriptVersionById(db, result.versionId);
      assert.ok(v1);
      assert.equal(v1.is_active, 1);
      assert.equal(v1.state, "active");
      assert.equal(v1.version_number, 1);

      // Verify segments in D1
      const d1Segments = await getTranscriptSegments(db, result.versionId);
      assert.equal(d1Segments.length, 2);

      // Verify Vectorize store contains V1 vectors
      const queryV1 = await vectorize.query([], { filter: { versionId: result.versionId } });
      assert.ok(queryV1.count > 0, "Vectorize should have indexed V1 vectors");
    });

    test("idempotently skips re-ingestion when content SHA-256 is unchanged", async () => {
      const payload = {
        jobId: jobUlid(),
        episodeId,
        sourceAssetId,
        transcriptR2Key: `episodes/${episodeId}/transcripts/v1_reingest.json`,
        coordinateSystem: "uncut",
        engine: "whisper_large_v3",
        engineVersion: "2026.1",
        diarizationEnabled: true,
      };

      const segments = [
        { segmentIndex: 0, startSec: 0.0, endSec: 5.0, speakerLabel: "Nikhil", text: "Welcome everyone to WTF.", languageCode: "en" },
        { segmentIndex: 1, startSec: 5.0, endSec: 10.0, speakerLabel: "Guest", text: "Great to be here bhai.", languageCode: "mixed" },
      ];

      const result = await stageAndActivateTranscriptVersion(db, vectorize, ai, payload, segments);
      assert.equal(result.status, "skipped_unchanged");
      assert.equal(result.versionNumber, 1);
      assert.equal(result.stagedChunksCount, 0);

      // Verify version count in D1 is still 1 (no duplicate V2 created)
      const allVersions = await listTranscriptVersions(db, episodeId);
      assert.equal(allVersions.length, 1);
    });

    test("stages version V2, atomically cuts over, and tombstones V1 vectors", async () => {
      const payload = {
        jobId: jobUlid(),
        episodeId,
        sourceAssetId,
        transcriptR2Key: `episodes/${episodeId}/transcripts/v2_edited.json`,
        coordinateSystem: "uncut",
        engine: "whisper_large_v3",
        engineVersion: "2026.2",
        diarizationEnabled: true,
      };

      // V2 has updated editorial transcript text
      const segments = [
        { segmentIndex: 0, startSec: 0.0, endSec: 6.0, speakerLabel: "Nikhil Kamath", text: "Welcome everyone to WTF podcast season 2.", languageCode: "en" },
        { segmentIndex: 1, startSec: 6.0, endSec: 12.5, speakerLabel: "Guest", text: "bhai kya zabardast start kiya hai yaar.", languageCode: "hi-Latn" },
      ];

      const result = await stageAndActivateTranscriptVersion(db, vectorize, ai, payload, segments);
      assert.equal(result.status, "activated");
      assert.equal(result.versionNumber, 2);

      // Verify V2 is active, V1 is tombstoned/archived
      const allVersions = await listTranscriptVersions(db, episodeId);
      assert.equal(allVersions.length, 2);

      const v2 = allVersions.find((v) => v.version_number === 2);
      const v1 = allVersions.find((v) => v.version_number === 1);

      assert.equal(v2.is_active, 1);
      assert.equal(v2.state, "active");

      assert.equal(v1.is_active, 0);
      assert.equal(v1.state, "tombstoned");

      // Verify obsolete V1 vectors were deleted from Vectorize
      const queryV1After = await vectorize.query([], { filter: { versionId: v1.id } });
      assert.equal(queryV1After.count, 0, "Obsolete V1 vectors must be tombstoned in Vectorize");

      const queryV2 = await vectorize.query([], { filter: { versionId: v2.id } });
      assert.ok(queryV2.count > 0, "V2 vectors must be active in Vectorize");
    });
  });

  describe("6. Queue Consumer Integration & DLQ Error Handling", () => {
    let episodeId;
    let sourceAssetId;
    let sourceAssetR2Key;

    before(async () => {
      episodeId = episodeUlid();
      await upsertEpisode(db, {
        id: episodeId,
        slug: `test-m4-queue-episode-${Date.now()}`,
        title: "Queue Consumer Ingestion Episode",
        ip: "WTF Main",
        showTitle: "WTF Podcast",
      });

      sourceAssetId = assetUlid();
      sourceAssetR2Key = `episodes/${episodeId}/assets/audio.wav`;
      await createSourceAsset(db, {
        id: sourceAssetId,
        episodeId,
        assetType: "uncut_audio",
        storageKey: sourceAssetR2Key,
        contentSha256: "0000000000000000000000000000000000000000000000000000000000000000",
        mimeType: "audio/wav",
      });
    });

    test("successfully processes valid transcript job from queue", async () => {
      const jobId = jobUlid();
      const transcriptR2Key = `episodes/${episodeId}/transcripts/test_job.json`;

      await createIngestionJob(db, {
        id: jobId,
        jobType: "asr_transcription",
        episodeId,
        sourceAssetId,
        status: "pending",
      });

      const rawJson = JSON.stringify({
        segments: [
          { start: 0, end: 4, speaker: "Host", text: "Hello and welcome to WTF." },
          { start: 4, end: 8, speaker: "Guest", text: "bhai 10 crore startup funding discussion." },
        ],
      });
      await r2.put(sourceAssetR2Key, "synthetic uncut source bytes");
      await r2.put(transcriptR2Key, rawJson);

      let ackCalled = false;
      const queueMsg = {
        body: {
          jobId,
          episodeId,
          sourceAssetId,
          transcriptR2Key,
          coordinateSystem: "uncut",
          engine: "whisper_large_v3",
          engineVersion: "1.0",
          diarizationEnabled: true,
        },
        ack() {
          ackCalled = true;
        },
        retry() {},
      };

      const env = {
        DB: db,
        CATALOGUE: r2,
        VECTORIZE: vectorize,
        AI: ai,
        INGEST_DLQ: mockDlq,
      };

      await processTranscriptIngestMessage(queueMsg, env);
      assert.equal(ackCalled, true, "Message should be acknowledged on successful processing");

      // Verify job record in D1 is updated to completed
      const jobRow = await db.prepare("SELECT * FROM ingestion_jobs WHERE id = ?").bind(jobId).first();
      assert.equal(jobRow.status, "completed");
      assert.ok(jobRow.started_at);
      assert.ok(jobRow.completed_at);
    });

    test("retries when transcript is missing and fails over to DLQ after max attempts", async () => {
      const jobId = jobUlid();
      const missingKey = `episodes/${episodeId}/transcripts/non_existent.json`;
      await r2.put(sourceAssetR2Key, "synthetic uncut source bytes");

      await createIngestionJob(db, {
        id: jobId,
        jobType: "asr_transcription",
        episodeId,
        sourceAssetId,
        status: "pending",
        maxAttempts: 5,
      });

      let retryCount = 0;
      let ackCount = 0;

      const queueMsg = {
        attempts: 4, // 5th attempt incoming
        body: {
          jobId,
          episodeId,
          sourceAssetId,
          transcriptR2Key: missingKey,
          coordinateSystem: "uncut",
          engine: "whisper_large_v3",
          engineVersion: "1.0",
          diarizationEnabled: true,
          attempts: 4,
        },
        ack() {
          ackCount++;
        },
        retry() {
          retryCount++;
        },
      };

      const env = {
        DB: db,
        CATALOGUE: r2,
        VECTORIZE: vectorize,
        AI: ai,
        INGEST_DLQ: mockDlq,
      };

      await assert.rejects(
        () => processTranscriptIngestMessage(queueMsg, env),
        /transcript_asset_unavailable/
      );

      // On 5th attempt (attempts >= max_attempts), job is failed and sent to DLQ
      assert.equal(ackCount, 1, "Terminal failure must ack queue message to stop retry storm");
      assert.equal(dlqMessages.length, 1, "Failed job must be routed to DLQ");
      assert.equal(dlqMessages[0].jobId, jobId);
      assert.equal(JSON.stringify(dlqMessages[0]).includes(missingKey), false);

      const jobRow = await db.prepare("SELECT * FROM ingestion_jobs WHERE id = ?").bind(jobId).first();
      assert.equal(jobRow.status, "failed");
      assert.equal(jobRow.error_message, "transcript_asset_unavailable");
    });

    test("fails before vector staging when declared uncut source R2 object is missing", async () => {
      const missingSourceEpisodeId = episodeUlid();
      const missingSourceAssetId = assetUlid();
      const jobId = jobUlid();
      const transcriptR2Key = `episodes/${missingSourceEpisodeId}/transcripts/orphaned.json`;
      const vectorCountBefore = vectorize._store.size;

      await upsertEpisode(db, {
        id: missingSourceEpisodeId,
        slug: `test-m4-missing-source-${Date.now()}`,
        title: "Missing Source Asset Episode",
        ip: "WTF Main",
        showTitle: "WTF Podcast",
      });

      await createSourceAsset(db, {
        id: missingSourceAssetId,
        episodeId: missingSourceEpisodeId,
        assetType: "uncut_audio",
        storageKey: `episodes/${missingSourceEpisodeId}/assets/missing-audio.wav`,
        contentSha256: "1111111111111111111111111111111111111111111111111111111111111111",
        mimeType: "audio/wav",
      });

      await createIngestionJob(db, {
        id: jobId,
        jobType: "asr_transcription",
        episodeId: missingSourceEpisodeId,
        sourceAssetId: missingSourceAssetId,
        status: "pending",
        maxAttempts: 5,
      });

      await r2.put(transcriptR2Key, JSON.stringify({
        segments: [
          { start: 0, end: 3, speaker: "Host", text: "This transcript exists without the declared uncut source asset." },
        ],
      }));

      let ackCount = 0;
      const queueMsg = {
        attempts: 4,
        body: {
          jobId,
          episodeId: missingSourceEpisodeId,
          sourceAssetId: missingSourceAssetId,
          transcriptR2Key,
          coordinateSystem: "uncut",
          engine: "whisper_large_v3",
          engineVersion: "1.0",
          diarizationEnabled: true,
          attempts: 4,
        },
        ack() {
          ackCount++;
        },
        retry() {},
      };

      const env = {
        DB: db,
        CATALOGUE: r2,
        VECTORIZE: vectorize,
        AI: ai,
        INGEST_DLQ: mockDlq,
      };

      await assert.rejects(
        () => processTranscriptIngestMessage(queueMsg, env),
        /source_asset_unavailable/
      );

      assert.equal(ackCount, 1, "Terminal source-asset failure must ack queue message");
      assert.equal(vectorize._store.size, vectorCountBefore, "Missing source object must not stage new vectors");

      const jobRow = await db.prepare("SELECT * FROM ingestion_jobs WHERE id = ?").bind(jobId).first();
      assert.equal(jobRow.status, "failed");
      assert.equal(jobRow.error_message, "source_asset_unavailable");
    });

    test("rejects vector staging when declared D1 source asset is missing or unavailable", async () => {
      const transcriptR2Key = `transcripts/edge-admission-${Date.now()}.txt`;
      await r2.put(transcriptR2Key, "Transcript exists, but its declared source receipt does not.");

      const state = new Map();
      const env = {
        DB: db,
        CATALOGUE: r2,
        VECTORIZE: vectorize,
        AI: ai,
        WTFMEDIA_STATE: {
          async get(key) { return state.get(key) ?? null; },
          async put(key, value) { state.set(key, value); },
        },
      };

      for (const [label, sourceAssetId, availability] of [
        ["missing", assetUlid(), undefined],
        ["unavailable", assetUlid(), "offline"],
      ]) {
        const videoId = `${label.slice(0, 4)}${String(Date.now()).slice(-7)}`;
        if (availability) {
          const episodeId = episodeUlid();
          await upsertEpisode(db, {
            id: episodeId,
            slug: `test-edge-admission-${label}-${Date.now()}`,
            title: `Edge admission ${label}`,
            ip: "WTF Main",
            showTitle: "WTF Podcast",
          });
          await createSourceAsset(db, {
            id: sourceAssetId,
            episodeId,
            assetType: "uncut_audio",
            storageKey: `episodes/${episodeId}/assets/${label}.wav`,
            contentSha256: "2".repeat(64),
            mimeType: "audio/wav",
            availability,
          });
        }

        const vectorCountBefore = vectorize._store.size;
        let retryCalled = false;
        await edgeWorker.queue({
          messages: [{
            body: {
              videoId,
              sourceAssetId,
              title: `Edge admission ${label}`,
              transcriptKey: transcriptR2Key,
              contentHash: `${label === "missing" ? "3" : "4"}`.repeat(64),
              sourceMode: "uncut",
            },
            ack() {},
            retry() { retryCalled = true; },
          }],
        }, env);

        assert.equal(retryCalled, true, `${label} source asset must be rejected`);
        assert.equal(vectorize._store.size, vectorCountBefore, `${label} source asset must not stage vectors`);
      }
    });

    test("rejects vector staging when declared D1 source asset backing R2 object is absent", async () => {
      const episodeId = episodeUlid();
      const sourceAssetId = assetUlid();
      const sourceAssetR2Key = `episodes/${episodeId}/assets/missing.wav`;
      const transcriptR2Key = `transcripts/edge-admission-r2-${Date.now()}.txt`;

      await upsertEpisode(db, {
        id: episodeId,
        slug: `test-edge-admission-r2-${Date.now()}`,
        title: "Edge admission absent R2 object",
        ip: "WTF Main",
        showTitle: "WTF Podcast",
      });
      await createSourceAsset(db, {
        id: sourceAssetId,
        episodeId,
        assetType: "uncut_audio",
        storageKey: sourceAssetR2Key,
        contentSha256: "5".repeat(64),
        mimeType: "audio/wav",
      });
      await r2.put(transcriptR2Key, "Transcript exists, but its declared source object does not.");

      const state = new Map();
      const env = {
        DB: db,
        CATALOGUE: r2,
        VECTORIZE: vectorize,
        AI: ai,
        WTFMEDIA_STATE: {
          async get(key) { return state.get(key) ?? null; },
          async put(key, value) { state.set(key, value); },
        },
      };
      const vectorCountBefore = vectorize._store.size;
      let retryCalled = false;

      await edgeWorker.queue({
        messages: [{
          body: {
            videoId: "r2missing01",
            sourceAssetId,
            title: "Edge admission absent R2 object",
            transcriptKey: transcriptR2Key,
            contentHash: "6".repeat(64),
            sourceMode: "uncut",
          },
          ack() {},
          retry() { retryCalled = true; },
        }],
      }, env);

      assert.equal(retryCalled, true, "Absent source object must be rejected");
      assert.equal(vectorize._store.size, vectorCountBefore, "Absent source object must not stage vectors");
    });
  });
});

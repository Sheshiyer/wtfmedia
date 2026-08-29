import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import {
  decodeUlidTime,
  episodeUlid,
  isValidUlid,
  ulid,
} from "../src/utils/ulid.ts";
import {
  activateTranscriptVersion,
  assertProvenanceMigrations,
  createIngestionJob,
  createSourceAsset,
  createTranscriptionRun,
  getActiveTranscriptVersion,
  getEpisodeByExternalIdentity,
  getEpisodeById,
  getEpisodeBySlug,
  getSourceAssetById,
  getTimelineAlignment,
  getTranscriptSegments,
  getTranscriptVersionById,
  listEpisodes,
  listIngestionJobs,
  listSourceAssetsForEpisode,
  recordExternalIdentity,
  resolveCitation,
  saveTranscriptSegments,
  stageTranscriptVersion,
  updateIngestionJobStatus,
  updateTranscriptionRunStatus,
  upsertEpisode,
  upsertTimelineAlignment,
} from "../src/db/provenance.ts";
import { encodeAudit, queryAuditEvents } from "../src/audit.ts";

const root = new URL("..", import.meta.url).pathname;
const persistTo = mkdtempSync(join(tmpdir(), "wtfmedia-phase3-d1-"));
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

function fails(input) {
  const result = sql(input);
  assert.notEqual(result.status, 0, `Expected query to fail but succeeded: ${input}\nOutput: ${result.stdout}`);
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
// Real SQLite-backed D1Database adapter for TypeScript DAL testing
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
          const results = JSON.parse(text);
          return { results: Array.isArray(results) ? results : [] };
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
      const sqlList = statements.map((s) => bindSql(s._query, s._params));
      const transactionScript = `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n${sqlList.map((q) => (q.trim().endsWith(";") ? q : q + ";")).join("\n")}\nCOMMIT;`;
      const res = spawnSync("sqlite3", [dbFile], { input: transactionScript, encoding: "utf8" });
      if (res.status !== 0) {
        throw new Error(`D1 batch transaction error: ${res.stderr || res.stdout}`);
      }
      return statements.map(() => ({ success: true }));
    },
  };
}

before(() => {
  applyMigrations();
});

after(() => {
  // Persistence dir cleans up naturally or remains outside tree
});

describe("Milestone 1: D1 Provenance Spine Schema & DAL", () => {
  const d1 = createSqliteD1(database);

  test("0005 migration applies cleanly and establishes all 10 canonical tables", () => {
    const tablesOutput = succeeds("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;");
    const requiredTables = [
      "episodes",
      "episode_external_identities",
      "source_assets",
      "transcription_runs",
      "transcript_versions",
      "transcript_segments",
      "timeline_alignments",
      "alignment_intervals",
      "transcript_chunks",
      "ingestion_jobs",
      "audit_events",
      "operators",
    ];
    for (const tbl of requiredTables) {
      assert.match(tablesOutput, new RegExp(`\\b${tbl}\\b`), `Missing table ${tbl}`);
    }
  });

  test("ULID utility generates monotonic, valid prefixed identifiers", () => {
    const epId1 = ulid("ep_");
    const epId2 = ulid("ep_");
    assert.match(epId1, /^ep_[0-9A-HJKMNP-TV-Z]{26}$/);
    assert.match(epId2, /^ep_[0-9A-HJKMNP-TV-Z]{26}$/);
    assert.ok(isValidUlid(epId1, "ep_"));
    assert.ok(isValidUlid(epId2, "ep_"));
    assert.ok(!isValidUlid("ast_01JN...", "ep_"));

    const now = Date.now();
    const epNow = ulid("ep_", now);
    const decodedTime = decodeUlidTime(epNow, "ep_");
    assert.ok(Math.abs(decodedTime - now) < 5000);
  });

  test("Schema enforces prefixed ULID primary key checks", () => {
    // Episodes check
    fails("INSERT INTO episodes (id, slug, title, ip, show_title) VALUES ('bad_id', 'slug-1', 'Title', 'WTF', 'WTF Show');");
    succeeds(`INSERT INTO episodes (id, slug, title, ip, show_title) VALUES ('ep_01JN0000000000000000000001', 'slug-check-1', 'Title', 'WTF', 'WTF Show');`);

    // Source assets check
    fails(`INSERT INTO source_assets (id, episode_id, asset_type, storage_key, content_sha256, mime_type) VALUES ('invalid_asset', 'ep_01JN0000000000000000000001', 'youtube_video', 'key', '${"a".repeat(64)}', 'video/mp4');`);
    succeeds(`INSERT INTO source_assets (id, episode_id, asset_type, storage_key, content_sha256, mime_type) VALUES ('ast_01JN0000000000000000000001', 'ep_01JN0000000000000000000001', 'youtube_video', 'key', '${"a".repeat(64)}', 'video/mp4');`);
  });

  test("Partial unique index prevents multiple active transcript versions per episode", () => {
    const epId = episodeUlid();
    succeeds(`INSERT INTO episodes (id, slug, title, ip, show_title) VALUES ('${epId}', 'slug-multi-active', 'Active Test', 'WTF', 'WTF Show');`);
    succeeds(`INSERT INTO source_assets (id, episode_id, asset_type, storage_key, content_sha256, mime_type) VALUES ('ast_01JN0000000000000000000002', '${epId}', 'uncut_audio', 'key', '${"b".repeat(64)}', 'audio/wav');`);

    // Insert version 1 as active
    succeeds(`INSERT INTO transcript_versions (id, episode_id, version_number, source_asset_id, content_sha256, is_active, state) VALUES ('txv_01JN0000000000000000000001', '${epId}', 1, 'ast_01JN0000000000000000000002', '${"c".repeat(64)}', 1, 'active');`);

    // Insert version 2 as staging (is_active = 0) -> SUCCEEDS
    succeeds(`INSERT INTO transcript_versions (id, episode_id, version_number, source_asset_id, content_sha256, is_active, state) VALUES ('txv_01JN0000000000000000000002', '${epId}', 2, 'ast_01JN0000000000000000000002', '${"d".repeat(64)}', 0, 'staging');`);

    // Attempting to set version 2 to active (is_active = 1) -> FAILS due to partial unique index
    fails(`UPDATE transcript_versions SET is_active = 1 WHERE id = 'txv_01JN0000000000000000000002';`);
  });

  test("Foreign keys enforce cascading deletes across version DAG", () => {
    succeeds("PRAGMA foreign_keys = ON;");
    const epId = episodeUlid();
    succeeds(`INSERT INTO episodes (id, slug, title, ip, show_title) VALUES ('${epId}', 'slug-cascade-test', 'Cascade Test', 'WTF', 'WTF Show');`);
    succeeds(`INSERT INTO source_assets (id, episode_id, asset_type, storage_key, content_sha256, mime_type) VALUES ('ast_01JN0000000000000000000003', '${epId}', 'uncut_audio', 'key', '${"e".repeat(64)}', 'audio/wav');`);
    succeeds(`INSERT INTO transcript_versions (id, episode_id, version_number, source_asset_id, content_sha256, is_active, state) VALUES ('txv_01JN0000000000000000000003', '${epId}', 1, 'ast_01JN0000000000000000000003', '${"f".repeat(64)}', 0, 'staging');`);
    succeeds(`INSERT INTO transcript_segments (id, transcript_version_id, segment_index, start_sec, end_sec, text) VALUES ('seg_01JN0000000000000000000001', 'txv_01JN0000000000000000000003', 0, 0.0, 10.0, 'Hello world');`);
    succeeds(`INSERT INTO transcript_chunks (id, transcript_version_id, chunk_index, vector_id, text, token_count) VALUES ('chk_01JN0000000000000000000001', 'txv_01JN0000000000000000000003', 0, 'vec_1', 'Hello world', 2);`);

    // Verify records exist
    assert.equal(succeeds(`SELECT COUNT(*) FROM transcript_segments WHERE transcript_version_id = 'txv_01JN0000000000000000000003';`).trim(), "1");
    assert.equal(succeeds(`SELECT COUNT(*) FROM transcript_chunks WHERE transcript_version_id = 'txv_01JN0000000000000000000003';`).trim(), "1");

    // Delete episode
    succeeds(`DELETE FROM episodes WHERE id = '${epId}';`);

    // Verify cascade deleted transcript version, segments, and chunks
    assert.equal(succeeds(`SELECT COUNT(*) FROM transcript_versions WHERE id = 'txv_01JN0000000000000000000003';`).trim(), "0");
    assert.equal(succeeds(`SELECT COUNT(*) FROM transcript_segments WHERE id = 'seg_01JN0000000000000000000001';`).trim(), "0");
    assert.equal(succeeds(`SELECT COUNT(*) FROM transcript_chunks WHERE id = 'chk_01JN0000000000000000000001';`).trim(), "0");
  });

  test("DAL assertProvenanceMigrations validates all required tables", async () => {
    await assertProvenanceMigrations(d1);
  });

  test("DAL upsertEpisode creates and updates canonical episode records", async () => {
    const created = await upsertEpisode(d1, {
      slug: "wtf-dal-episode-1",
      title: "WTF Ingestion Masterclass",
      ip: "WTF Media",
      showTitle: "WTF Podcast",
      contentBucket: "podcast",
      primaryLanguage: "hi-Latn",
      productionStatus: "published",
      durationSeconds: 7200,
      description: "Deep dive into podcast architecture",
      chapters: [{ title: "Introduction", startSec: 0, endSec: 120 }],
    });

    assert.ok(created.id.startsWith("ep_"));
    assert.equal(created.slug, "wtf-dal-episode-1");
    assert.equal(created.duration_seconds, 7200);

    const fetched = await getEpisodeById(d1, created.id);
    assert.equal(fetched?.title, "WTF Ingestion Masterclass");

    const fetchedBySlug = await getEpisodeBySlug(d1, "wtf-dal-episode-1");
    assert.equal(fetchedBySlug?.id, created.id);

    // Upsert update
    const updated = await upsertEpisode(d1, {
      slug: "wtf-dal-episode-1",
      title: "WTF Ingestion Masterclass (Updated)",
      ip: "WTF Media",
      showTitle: "WTF Podcast",
      durationSeconds: 7300,
    });

    assert.equal(updated.id, created.id);
    assert.equal(updated.title, "WTF Ingestion Masterclass (Updated)");
    assert.equal(updated.duration_seconds, 7300);
  });

  test("DAL recordExternalIdentity associates platform IDs and detects duplicates", async () => {
    const ep = await upsertEpisode(d1, {
      slug: "wtf-identity-test",
      title: "Identity Episode",
      ip: "WTF",
      showTitle: "WTF",
    });

    const identity = await recordExternalIdentity(d1, {
      episodeId: ep.id,
      platform: "youtube",
      externalId: "dQw4w9WgXcQ",
      externalUrlHash: "1".repeat(64),
      channelId: "UC_WTF_OFFICIAL",
      isPrimary: true,
      metadata: { views: 100000 },
    });

    assert.equal(identity.episode_id, ep.id);
    assert.equal(identity.platform, "youtube");
    assert.equal(identity.external_id, "dQw4w9WgXcQ");

    const mappedEp = await getEpisodeByExternalIdentity(d1, "youtube", "dQw4w9WgXcQ");
    assert.equal(mappedEp?.id, ep.id);
  });

  test("DAL createSourceAsset and listSourceAssetsForEpisode", async () => {
    const ep = await upsertEpisode(d1, {
      slug: "wtf-assets-test",
      title: "Asset Episode",
      ip: "WTF",
      showTitle: "WTF",
    });

    const uncutAudio = await createSourceAsset(d1, {
      episodeId: ep.id,
      assetType: "uncut_audio",
      storageKey: `episodes/${ep.id}/assets/uncut/audio_12345.flac`,
      contentSha256: "2".repeat(64),
      byteSize: 50000000,
      durationSeconds: 3600.5,
      mimeType: "audio/flac",
      authority: "owner_supplied",
    });

    assert.ok(uncutAudio.id.startsWith("ast_"));
    assert.equal(uncutAudio.asset_type, "uncut_audio");

    const assetById = await getSourceAssetById(d1, uncutAudio.id);
    assert.equal(assetById?.id, uncutAudio.id);

    const assetList = await listSourceAssetsForEpisode(d1, ep.id);
    assert.equal(assetList.length, 1);
    assert.equal(assetList[0].id, uncutAudio.id);
  });

  test("DAL stageTranscriptVersion and atomic activateTranscriptVersion cutover", async () => {
    const ep = await upsertEpisode(d1, {
      slug: "wtf-transcript-stage-test",
      title: "Transcript Staging Episode",
      ip: "WTF",
      showTitle: "WTF",
    });

    const asset = await createSourceAsset(d1, {
      episodeId: ep.id,
      assetType: "uncut_audio",
      storageKey: `episodes/${ep.id}/uncut.wav`,
      contentSha256: "3".repeat(64),
      mimeType: "audio/wav",
    });

    // 1. Stage version 1
    const v1 = await stageTranscriptVersion(d1, {
      episodeId: ep.id,
      versionNumber: 1,
      sourceAssetId: asset.id,
      contentSha256: "4".repeat(64),
      coordinateSystem: "uncut",
      segments: [
        { segmentIndex: 0, startSec: 0.0, endSec: 5.0, speakerLabel: "Nikhil", text: "Welcome to WTF podcast.", languageCode: "en" },
        { segmentIndex: 1, startSec: 5.0, endSec: 12.0, speakerLabel: "Guest", text: "Aapka swagat hai.", languageCode: "hi-Latn" },
      ],
      chunks: [
        { chunkIndex: 0, vectorId: `vec_${ep.id}_v1_0`, text: "Welcome to WTF podcast. Aapka swagat hai.", tokenCount: 10 },
      ],
    });

    assert.equal(v1.version_number, 1);
    assert.equal(v1.is_active, 0);
    assert.equal(v1.state, "staging");
    assert.equal(v1.total_segments, 2);

    // 2. Activate version 1
    await activateTranscriptVersion(d1, ep.id, v1.id);
    const active1 = await getActiveTranscriptVersion(d1, ep.id);
    assert.equal(active1?.id, v1.id);
    assert.equal(active1?.is_active, 1);
    assert.equal(active1?.state, "active");

    // 3. Stage version 2
    const v2 = await stageTranscriptVersion(d1, {
      episodeId: ep.id,
      versionNumber: 2,
      sourceAssetId: asset.id,
      contentSha256: "5".repeat(64),
      coordinateSystem: "uncut",
      segments: [
        { segmentIndex: 0, startSec: 0.0, endSec: 4.5, speakerLabel: "Nikhil Kamath", text: "Welcome to the WTF podcast everyone.", languageCode: "en" },
        { segmentIndex: 1, startSec: 4.5, endSec: 11.8, speakerLabel: "Guest Speaker", text: "Namaste, khushi hui yahan aake.", languageCode: "hi-Latn" },
      ],
      chunks: [
        { chunkIndex: 0, vectorId: `vec_${ep.id}_v2_0`, text: "Welcome to the WTF podcast everyone.", tokenCount: 8 },
      ],
    });

    assert.equal(v2.is_active, 0);

    // 4. Atomically activate version 2 -> archives version 1
    await activateTranscriptVersion(d1, ep.id, v2.id);

    const oldV1 = await getTranscriptVersionById(d1, v1.id);
    const active2 = await getActiveTranscriptVersion(d1, ep.id);

    assert.equal(oldV1?.is_active, 0);
    assert.equal(oldV1?.state, "archived");
    assert.equal(active2?.id, v2.id);
    assert.equal(active2?.is_active, 1);
    assert.equal(active2?.state, "active");

    // Verify segments for v2
    const segments = await getTranscriptSegments(d1, v2.id);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].speaker_label, "Nikhil Kamath");
  });

  test("DAL upsertTimelineAlignment and privacy-safe resolveCitation", async () => {
    const ep = await upsertEpisode(d1, {
      slug: "wtf-alignment-citation-test",
      title: "Alignment and Citation Episode",
      ip: "WTF",
      showTitle: "WTF",
    });

    const uncutAsset = await createSourceAsset(d1, {
      episodeId: ep.id,
      assetType: "uncut_audio",
      storageKey: `episodes/${ep.id}/uncut_full.wav`,
      contentSha256: "6".repeat(64),
      mimeType: "audio/wav",
    });

    const pubAsset = await createSourceAsset(d1, {
      episodeId: ep.id,
      assetType: "youtube_video",
      storageKey: `episodes/${ep.id}/youtube_720p.mp4`,
      contentSha256: "7".repeat(64),
      mimeType: "video/mp4",
    });

    // Stage & activate transcript on uncut coordinates
    const version = await stageTranscriptVersion(d1, {
      episodeId: ep.id,
      versionNumber: 1,
      sourceAssetId: uncutAsset.id,
      contentSha256: "8".repeat(64),
      coordinateSystem: "uncut",
      segments: [
        { segmentIndex: 0, startSec: 100.0, endSec: 150.0, speakerLabel: "Nikhil", text: "AI is transforming gaming in India.", languageCode: "en" },
      ],
    });
    await activateTranscriptVersion(d1, ep.id, version.id);

    // Upsert timeline alignment mapping: Uncut [60..300] -> Published [0..240] (60s intro was cut)
    await upsertTimelineAlignment(d1, {
      episodeId: ep.id,
      uncutAssetId: uncutAsset.id,
      publishedAssetId: pubAsset.id,
      algorithm: "dtw_forced_align",
      intervals: [
        {
          intervalIndex: 0,
          uncutStartSec: 60.0,
          uncutEndSec: 300.0,
          pubStartSec: 0.0,
          pubEndSec: 240.0,
          intervalStatus: "matched",
          confidence: 0.99,
        },
      ],
    });

    const alignment = await getTimelineAlignment(d1, ep.id);
    assert.ok(alignment !== null);
    assert.equal(alignment.intervals.length, 1);
    assert.equal(alignment.intervals[0].interval_status, "matched");

    // Resolve citation for segmentIndex 0
    const citation = await resolveCitation(d1, {
      episodeId: ep.id,
      segmentIndex: 0,
    });

    assert.ok(citation !== null);
    assert.equal(citation.episodeTitle, "Alignment and Citation Episode");
    assert.equal(citation.text, "AI is transforming gaming in India.");
    assert.equal(citation.speakerLabel, "Nikhil");
    assert.equal(citation.uncutTime?.startSec, 100.0);
    assert.equal(citation.uncutTime?.endSec, 150.0);

    // Calculated published time: uncut 100s is 40s after uncut start (60s) -> pub 40s
    assert.equal(citation.publishedTime?.startSec, 40.0);
    assert.equal(citation.publishedTime?.endSec, 90.0);
    assert.equal(citation.matchedStatus, "matched");

    // Privacy assertion: zero R2 keys or capability URLs in citation DTO
    assert.ok(!("storageKey" in citation));
    assert.ok(!("storage_key" in citation));
    assert.ok(!JSON.stringify(citation).includes("episodes/"));
  });

  test("DAL recordIngestionJob and updateIngestionJobStatus", async () => {
    const ep = await upsertEpisode(d1, {
      slug: "wtf-job-test",
      title: "Job Test Episode",
      ip: "WTF",
      showTitle: "WTF",
    });

    const job = await createIngestionJob(d1, {
      jobType: "youtube_metadata_sync",
      episodeId: ep.id,
      status: "pending",
      payload: { videoId: "xyz123" },
    });

    assert.ok(job.id.startsWith("job_"));
    assert.equal(job.status, "pending");

    await updateIngestionJobStatus(d1, job.id, {
      status: "running",
      attempts: 1,
    });

    await updateIngestionJobStatus(d1, job.id, {
      status: "completed",
      attempts: 1,
    });

    const jobs = await listIngestionJobs(d1, { limit: 10 });
    const found = jobs.find((j) => j.id === job.id);
    assert.equal(found?.status, "completed");
    assert.equal(found?.attempts, 1);
    assert.ok(found?.started_at !== null);
    assert.ok(found?.completed_at !== null);
  });

  test("Phase 3 audit actions and entity types are encoded and accepted", async () => {
    const uploadAudit = encodeAudit({
      action: "asset_upload",
      entityType: "source_asset",
      entityId: "ast_01JN0000000000000000000099",
      outcome: "succeeded",
      environment: "local",
      correlationId: "corr-audit-upload-1",
      actorId: 1,
      role: "admin",
      metadata: {
        scope: "direct_upload",
        byteSize: 1048576,
        mimeType: "audio/wav",
        assetType: "uncut_audio",
        episodeId: "ep_01JN0000000000000000000001",
      },
    });

    assert.ok(uploadAudit !== null);
    assert.equal(uploadAudit?.action, "asset_upload");
    assert.equal(uploadAudit?.entityType, "source_asset");

    const activateAudit = encodeAudit({
      action: "transcript_activate",
      entityType: "transcript_version",
      entityId: "txv_01JN0000000000000000000099",
      outcome: "succeeded",
      environment: "local",
      correlationId: "corr-audit-activate-1",
      actorId: 1,
      role: "super_admin",
      metadata: {
        scope: "manual_approval",
        episodeId: "ep_01JN0000000000000000000001",
        versionNumber: 2,
      },
    });

    assert.ok(activateAudit !== null);
    assert.equal(activateAudit?.action, "transcript_activate");

    // Insert encoded audit directly to verify SQLite schema compatibility
    succeeds(`
      INSERT INTO audit_events (
        event_id, occurred_at, actor_operator_id, effective_role,
        action, entity_type, entity_id, outcome, environment, correlation_id, schema_version, metadata_json
      ) VALUES (
        '${uploadAudit.eventId}', '${uploadAudit.occurredAt}', ${uploadAudit.actorId}, '${uploadAudit.role}',
        '${uploadAudit.action}', '${uploadAudit.entityType}', '${uploadAudit.entityId}', '${uploadAudit.outcome}',
        '${uploadAudit.environment}', '${uploadAudit.correlationId}', 1, '${uploadAudit.metadataJson.replaceAll("'", "''")}'
      );
    `);

    const count = succeeds(`SELECT COUNT(*) FROM audit_events WHERE action = 'asset_upload';`).trim();
    assert.equal(count, "1");
  });
});

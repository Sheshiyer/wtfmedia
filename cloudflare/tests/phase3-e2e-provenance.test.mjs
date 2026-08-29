import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleActivateTranscriptVersion,
  handleGetEpisodeProvenance,
  handleGetEpisodes,
  handleListIngestionJobs,
  handleResolveCitation,
  handleYouTubeSync,
} from "../src/ops-episodes.ts";
import { handleOpsRequest } from "../src/ops-router.ts";
import { canAccessPath, decide } from "../src/auth/policy.ts";

const MOCK_SECRET = "super-secret-edge-key-for-hmac-sha256-testing-0123456789";

function createMockProvenanceDb() {
  const episodes = new Map([
    [
      "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      {
        id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
        slug: "wtf-nikhil-kamath-ep-01-ecommerce",
        title: "WTF with Nikhil Kamath - Episode 1: The Future of E-Commerce & Retail",
        ip: "WTF",
        show_title: "WTF with Nikhil Kamath",
        content_bucket: "podcast",
        primary_language: "hi-Latn",
        production_status: "published",
        published_at: "2026-08-01T12:00:00Z",
        recorded_at: "2026-07-25T10:00:00Z",
        duration_seconds: 5280,
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        description: "Deep dive into retail and e-commerce supply chains.",
        chapters_json: JSON.stringify([
          { title: "Intro", startSec: 0, endSec: 60 },
          { title: "Supply Chain", startSec: 60, endSec: 1800 },
        ]),
        created_at: "2026-08-01T12:00:00Z",
        updated_at: "2026-08-01T12:00:00Z",
      },
    ],
  ]);

  const externalIdentities = [
    {
      id: 1,
      episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      platform: "youtube",
      external_id: "dQw4w9WgXcQ",
      external_url_hash: "hash123",
      channel_id: "UC_WTF_MAIN",
      is_primary: 1,
      metadata_json: "{}",
      observed_at: "2026-08-01T12:00:00Z",
    },
  ];

  const sourceAssets = [
    {
      id: "ast_01J6G7M8N9P0Q1R2S3T4U5A001",
      episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      asset_type: "uncut_video",
      storage_driver: "r2",
      storage_key: "episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/assets/uncut/video_e3b0c442.mp4",
      content_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      byte_size: 15728640000,
      duration_seconds: 5400,
      mime_type: "video/mp4",
      authority: "owner_supplied",
      availability: "available",
      created_at: "2026-08-01T10:00:00Z",
    },
  ];

  const transcriptVersions = [
    {
      id: "trv_01J6G7M8N9P0Q1R2S3T4U5T001",
      episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      version_number: 1,
      transcription_run_id: "run_01",
      source_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A001",
      content_sha256: "sha_ver1",
      coordinate_system: "uncut",
      total_segments: 2,
      word_count: 50,
      is_active: 1,
      state: "active",
      activated_at: "2026-08-01T12:00:00Z",
      created_at: "2026-08-01T11:00:00Z",
    },
    {
      id: "trv_01J6G7M8N9P0Q1R2S3T4U5T002",
      episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      version_number: 2,
      transcription_run_id: "run_02",
      source_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A001",
      content_sha256: "sha_ver2",
      coordinate_system: "uncut",
      total_segments: 2,
      word_count: 55,
      is_active: 0,
      state: "staging",
      activated_at: null,
      created_at: "2026-08-05T14:00:00Z",
    },
  ];

  const transcriptSegments = [
    {
      id: "tsg_01J6G7M8N9P0Q1R2S3T4U5S001",
      transcript_version_id: "trv_01J6G7M8N9P0Q1R2S3T4U5T001",
      segment_index: 0,
      start_sec: 120.0,
      end_sec: 180.0,
      speaker_label: "Nikhil Kamath",
      speaker_operator_id: null,
      text: "The future of Indian retail and e-commerce.",
      text_normalized: "the future of indian retail and e-commerce.",
      language_code: "hi-Latn",
      confidence: 0.98,
      words_json: null,
    },
    {
      id: "tsg_01J6G7M8N9P0Q1R2S3T4U5S002",
      transcript_version_id: "trv_01J6G7M8N9P0Q1R2S3T4U5T001",
      segment_index: 1,
      start_sec: 1850.0,
      end_sec: 1900.0,
      speaker_label: "Guest",
      speaker_operator_id: null,
      text: "This part was cut from YouTube video.",
      text_normalized: "this part was cut from youtube video.",
      language_code: "hi-Latn",
      confidence: 0.95,
      words_json: null,
    },
  ];

  const timelineAlignments = [
    {
      id: "aln_01J6G7M8N9P0Q1R2S3T4U5L001",
      episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
      uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A001",
      published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A002",
      algorithm: "dtw_forced_align",
      confidence_score: 0.99,
      status: "verified",
      created_at: "2026-08-01T12:00:00Z",
      updated_at: "2026-08-01T12:00:00Z",
    },
  ];

  const alignmentIntervals = [
    {
      id: 1,
      alignment_id: "aln_01J6G7M8N9P0Q1R2S3T4U5L001",
      interval_index: 0,
      uncut_start_sec: 0.0,
      uncut_end_sec: 60.0,
      pub_start_sec: 0.0,
      pub_end_sec: 0.0,
      interval_status: "cut_from_published",
      confidence: 1.0,
    },
    {
      id: 2,
      alignment_id: "aln_01J6G7M8N9P0Q1R2S3T4U5L001",
      interval_index: 1,
      uncut_start_sec: 60.0,
      uncut_end_sec: 1800.0,
      pub_start_sec: 0.0,
      pub_end_sec: 1740.0,
      interval_status: "matched",
      confidence: 1.0,
    },
    {
      id: 3,
      alignment_id: "aln_01J6G7M8N9P0Q1R2S3T4U5L001",
      interval_index: 2,
      uncut_start_sec: 1800.0,
      uncut_end_sec: 1920.0,
      pub_start_sec: 1740.0,
      pub_end_sec: 1740.0,
      interval_status: "cut_from_published",
      confidence: 1.0,
    },
  ];

  const ingestionJobs = [];
  const auditEvents = [];

  return {
    _episodes: episodes,
    _transcriptVersions: transcriptVersions,
    _ingestionJobs: ingestionJobs,
    _auditEvents: auditEvents,
    prepare(sql) {
      return {
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          if (sql.includes("COUNT(*) AS count FROM sqlite_master")) {
            return { count: 10 };
          }
          if (sql.includes("SELECT id") && sql.includes("FROM operators")) {
            return { id: 1, email: "operator@example.test", role: "admin", active: 1 };
          }
          if (sql.includes("SELECT COUNT(*) AS count FROM episodes")) {
            return { count: episodes.size };
          }
          if (sql.includes("SELECT * FROM episodes WHERE id = ?")) {
            const id = this.args?.[0];
            return episodes.get(id) ?? null;
          }
          if (sql.includes("SELECT * FROM transcript_versions WHERE id = ?")) {
            const id = this.args?.[0];
            return transcriptVersions.find((v) => v.id === id) ?? null;
          }
          if (sql.includes("SELECT * FROM transcript_versions WHERE episode_id = ? AND is_active = 1")) {
            const epId = this.args?.[0];
            return transcriptVersions.find((v) => v.episode_id === epId && v.is_active === 1) ?? null;
          }
          if (sql.includes("SELECT * FROM transcript_segments WHERE transcript_version_id = ? AND segment_index = ?")) {
            const [verId, sIdx] = this.args;
            return transcriptSegments.find((s) => s.transcript_version_id === verId && s.segment_index === sIdx) ?? null;
          }
          if (sql.includes("SELECT * FROM timeline_alignments WHERE episode_id = ?")) {
            const epId = this.args?.[0];
            return timelineAlignments.find((a) => a.episode_id === epId) ?? null;
          }
          if (sql.includes("INSERT INTO ingestion_jobs")) {
            const [id, job_type, episode_id, source_asset_id, status, max_attempts, payload_json] = this.args;
            const rec = { id, job_type, episode_id, source_asset_id, status, max_attempts, payload_json, attempts: 1, created_at: new Date().toISOString() };
            ingestionJobs.push(rec);
            return rec;
          }
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO audit_events")) {
            auditEvents.push({ sql, args: this.args });
            return { success: true };
          }
          return { success: true };
        },
        async all() {
          if (sql.includes("SELECT * FROM episodes")) {
            return { results: Array.from(episodes.values()) };
          }
          if (sql.includes("SELECT * FROM episode_external_identities WHERE episode_id = ?")) {
            const epId = this.args?.[0];
            return { results: externalIdentities.filter((e) => e.episode_id === epId) };
          }
          if (sql.includes("SELECT * FROM source_assets WHERE episode_id = ?")) {
            const epId = this.args?.[0];
            return { results: sourceAssets.filter((a) => a.episode_id === epId) };
          }
          if (sql.includes("SELECT * FROM transcript_versions WHERE episode_id = ?")) {
            const epId = this.args?.[0];
            return { results: transcriptVersions.filter((v) => v.episode_id === epId) };
          }
          if (sql.includes("SELECT * FROM transcript_segments WHERE transcript_version_id = ?")) {
            const verId = this.args?.[0];
            return { results: transcriptSegments.filter((s) => s.transcript_version_id === verId) };
          }
          if (sql.includes("SELECT * FROM alignment_intervals WHERE alignment_id = ?")) {
            const alnId = this.args?.[0];
            return { results: alignmentIntervals.filter((i) => i.alignment_id === alnId) };
          }
          if (sql.includes("SELECT * FROM ingestion_jobs")) {
            return { results: ingestionJobs };
          }
          return { results: [] };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        // Update mock state for activation
        if (stmt.sql && stmt.sql.includes("UPDATE transcript_versions SET is_active = 0")) {
          for (const v of transcriptVersions) {
            if (v.is_active === 1) {
              v.is_active = 0;
              v.state = "archived";
            }
          }
        }
        if (stmt.sql && stmt.sql.includes("UPDATE transcript_versions") && stmt.sql.includes("SET is_active = 1")) {
          const targetId = stmt.args?.[0];
          const target = transcriptVersions.find((v) => v.id === targetId);
          if (target) {
            target.is_active = 1;
            target.state = "active";
          }
        }
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

function createTestEnv(db) {
  return {
    DB: db,
    OPS_HOSTNAME: "ops.local.test",
    OPS_ORIGIN: "https://origin.local.test",
    OPS_ORIGIN_PROOF: "test-proof",
    OPS_ENVIRONMENT: "local",
    ACCESS_ISSUER: "https://issuer.test",
    ACCESS_AUDIENCE: "audience",
    ACCESS_JWKS_URL: "https://issuer.test/certs",
    EDGE_SHARED_SECRET: MOCK_SECRET,
  };
}

// --------------------------------------------------------------------------
// 1. RBAC Gating & Capability Matrix Tests
// --------------------------------------------------------------------------

test("provenance_rbac: capability checks for episodes and ingestion", () => {
  // super_admin & admin have full access
  for (const role of ["super_admin", "admin"]) {
    assert.equal(decide(role, "episodes", "read"), true);
    assert.equal(decide(role, "episodes", "write"), true);
    assert.equal(decide(role, "ingest", "read"), true);
    assert.equal(decide(role, "ingest", "create"), true);
    assert.equal(decide(role, "transcripts", "write"), true);
    assert.equal(canAccessPath(role, "/ops/api/episodes"), true);
    assert.equal(canAccessPath(role, "/ops/api/ingest/youtube-sync"), true);
  }

  // editor has read access to episodes and ingest jobs, write to transcripts, but cannot create/manage ingestion sync
  assert.equal(decide("editor", "episodes", "read"), true);
  assert.equal(decide("editor", "ingest", "read"), true);
  assert.equal(decide("editor", "ingest", "create"), false);
  assert.equal(canAccessPath("editor", "/ops/api/episodes"), true);
  assert.equal(canAccessPath("editor", "/ops/api/ingest/youtube-sync"), false);

  // unauthenticated / unknown denies
  assert.equal(decide("guest", "episodes", "read"), false);
  assert.equal(canAccessPath("anonymous", "/ops/api/episodes"), false);
});

// --------------------------------------------------------------------------
// 2. Episodes Catalog API & Serialization Tests
// --------------------------------------------------------------------------

test("provenance_api: GET /ops/api/episodes returns sanitized episode summaries", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const context = { operatorId: 1, role: "editor", environment: "local", correlationId: "corr-ep-001" };

  const request = new Request("https://ops.local.test/ops/api/episodes?limit=10", { method: "GET" });
  const response = await handleGetEpisodes(request, env, context);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.total, 1);
  assert.equal(data.episodes.length, 1);
  const ep = data.episodes[0];
  assert.equal(ep.id, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1");
  assert.equal(ep.slug, "wtf-nikhil-kamath-ep-01-ecommerce");
  assert.equal(ep.ip, "WTF");
  assert.equal(ep.showTitle, "WTF with Nikhil Kamath");
  assert.ok(Array.isArray(ep.chapters));
  assert.equal(ep.chapters.length, 2);
});

// --------------------------------------------------------------------------
// 3. Provenance DAG API & Privacy Redaction Tests (PROV-07, QUAL-05, QUAL-12)
// --------------------------------------------------------------------------

test("provenance_api: GET /ops/api/episodes/:id/provenance returns complete DAG with zero path leakage", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const context = { operatorId: 1, role: "admin", environment: "local", correlationId: "corr-prov-001" };

  const request = new Request("https://ops.local.test/ops/api/episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/provenance", { method: "GET" });
  const response = await handleGetEpisodeProvenance(request, env, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1", context);
  assert.equal(response.status, 200);

  const { provenance } = await response.json();
  assert.ok(provenance);
  assert.equal(provenance.episode.id, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1");
  assert.equal(provenance.externalIdentities.length, 1);
  assert.equal(provenance.externalIdentities[0].platform, "youtube");
  assert.equal(provenance.sourceAssets.length, 1);
  assert.equal(provenance.sourceAssets[0].assetType, "uncut_video");
  assert.equal(provenance.transcriptVersions.length, 2);
  assert.equal(provenance.activeSegments.length, 2);
  assert.ok(provenance.timelineAlignment);
  assert.equal(provenance.timelineAlignment.intervals.length, 3);

  // Privacy Redaction Verification: Assert ZERO occurrences of private paths or secrets
  const serialized = JSON.stringify(provenance);
  assert.equal(serialized.includes("/Volumes/"), false, "Must not leak checkout volume paths");
  assert.equal(serialized.includes("/Users/"), false, "Must not leak local user paths");
  assert.equal(serialized.includes("CATALOGUE"), false, "Must not leak internal bucket identifiers");
  assert.equal(serialized.includes("MOCK_SECRET"), false, "Must not leak secret keys");
  assert.equal(serialized.includes("storage_key"), false, "SourceAssetDto must not leak raw storage driver keys");
});

// --------------------------------------------------------------------------
// 4. Deterministic Citation Resolution Tests (PROV-07)
// --------------------------------------------------------------------------

test("provenance_citation: POST /ops/api/episodes/:id/citation maps dual-timeline coordinates", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const context = { operatorId: 1, role: "editor", environment: "local", correlationId: "corr-cite-001" };

  // Case A: Matched interval segment (uncut start 120s in interval 60-1800 -> pub start 60s)
  const reqA = new Request("https://ops.local.test/ops/api/episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/citation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segmentIndex: 0 }),
  });

  const resA = await handleResolveCitation(reqA, env, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1", context);
  assert.equal(resA.status, 200);
  const dataA = await resA.json();
  assert.equal(dataA.citation.segmentIndex, 0);
  assert.equal(dataA.citation.matchedStatus, "matched");
  assert.ok(dataA.citation.uncutTime);
  assert.equal(dataA.citation.uncutTime.startSec, 120.0);
  assert.ok(dataA.citation.publishedTime);
  assert.equal(dataA.citation.publishedTime.startSec, 60.0);

  // Case B: Cut segment (uncut start 1850s in cut interval 1800-1920)
  const reqB = new Request("https://ops.local.test/ops/api/episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/citation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segmentIndex: 1 }),
  });

  const resB = await handleResolveCitation(reqB, env, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1", context);
  assert.equal(resB.status, 200);
  const dataB = await resB.json();
  assert.equal(dataB.citation.segmentIndex, 1);
  assert.equal(dataB.citation.matchedStatus, "cut_from_published");
  assert.equal(dataB.citation.publishedTime, null);
});

// --------------------------------------------------------------------------
// 5. Atomic Transcript Activation Tests (PROV-04, PROV-08)
// --------------------------------------------------------------------------

test("provenance_activation: POST /ops/api/episodes/:id/transcripts/activate switches active version atomically", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const context = { operatorId: 1, role: "admin", environment: "local", correlationId: "corr-act-001" };

  const request = new Request("https://ops.local.test/ops/api/episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/transcripts/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionId: "trv_01J6G7M8N9P0Q1R2S3T4U5T002" }),
  });

  const response = await handleActivateTranscriptVersion(request, env, "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1", context);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  assert.equal(result.versionId, "trv_01J6G7M8N9P0Q1R2S3T4U5T002");
  assert.equal(result.state, "active");

  // Verify audit event recorded
  assert.ok(db._auditEvents.length > 0);
  const auditEvent = db._auditEvents.find((e) => e.args.includes("transcript_activate"));
  assert.ok(auditEvent);
});

// --------------------------------------------------------------------------
// 6. YouTube Manual Sync & Quota Telemetry Tests (INTG-07, PROV-10)
// --------------------------------------------------------------------------

test("provenance_sync: POST /ops/api/ingest/youtube-sync records job and returns quota telemetry", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const context = { operatorId: 1, role: "admin", environment: "local", correlationId: "corr-sync-001" };

  const request = new Request("https://ops.local.test/ops/api/ingest/youtube-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId: "UC_WTF_MAIN" }),
  });

  const response = await handleYouTubeSync(request, env, context);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  assert.ok(result.jobId.startsWith("job_"));
  assert.equal(result.status, "completed");
  assert.equal(result.etagStatus, "cached");
  assert.equal(result.quotaUnitsConsumed, 1);
  assert.equal(result.remainingDailyQuota, 9990);

  // Ingestion job was recorded
  assert.equal(db._ingestionJobs.length, 1);
  assert.equal(db._ingestionJobs[0].job_type, "youtube_metadata_sync");
});

// --------------------------------------------------------------------------
// 7. Full Zero Trust Edge Router Integration via handleOpsRequest
// --------------------------------------------------------------------------

test("provenance_router: handleOpsRequest routes all Phase 3 endpoints through Zero Trust", async () => {
  const db = createMockProvenanceDb();
  const env = createTestEnv(db);
  const deps = {
    verifyAccess: async () => ({ ok: true, email: "admin@example.test" }),
  };

  // Route 1: GET /ops/api/episodes
  const epReq = new Request("https://ops.local.test/ops/api/episodes", {
    method: "GET",
    headers: { "cf-access-jwt-assertion": "valid-token", "x-request-id": "corr-rtr-01" },
  });
  const epRes = await handleOpsRequest(epReq, env, deps);
  assert.equal(epRes.status, 200);

  // Route 2: GET /ops/api/episodes/:id/provenance
  const provReq = new Request("https://ops.local.test/ops/api/episodes/ep_01J6G7M8N9P0Q1R2S3T4U5V6W1/provenance", {
    method: "GET",
    headers: { "cf-access-jwt-assertion": "valid-token", "x-request-id": "corr-rtr-02" },
  });
  const provRes = await handleOpsRequest(provReq, env, deps);
  assert.equal(provRes.status, 200);

  // Route 3: POST /ops/api/ingest/youtube-sync
  const syncReq = new Request("https://ops.local.test/ops/api/ingest/youtube-sync", {
    method: "POST",
    headers: { "cf-access-jwt-assertion": "valid-token", "x-request-id": "corr-rtr-03", "Content-Type": "application/json" },
    body: JSON.stringify({ channelId: "UC_WTF_MAIN" }),
  });
  const syncRes = await handleOpsRequest(syncReq, env, deps);
  assert.equal(syncRes.status, 200);
});

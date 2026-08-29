import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeSha256,
  getAssetR2Key,
  getMaxAssetSizeBytes,
  isByteSizeAllowed,
  isValidMimeType,
  parseAssetR2Key,
  sanitizeExtension,
  verifySha256,
} from "../src/assets/storage-layout.ts";
import {
  createUploadTicket,
  handleAssetConfirmUpload,
  handleAssetUploadIntent,
  handleAssetUploadStream,
  verifyUploadTicket,
} from "../src/assets/upload-handler.ts";
import { canAccessPath, decide } from "../src/auth/policy.ts";
import { handleOpsRequest } from "../src/ops-router.ts";

const MOCK_SECRET = "super-secret-edge-key-for-hmac-sha256-testing-0123456789";

function createMockDb() {
  const episodes = new Map([
    [
      "ep_01TESTEPISODE000000000001",
      {
        id: "ep_01TESTEPISODE000000000001",
        slug: "01-test-episode",
        title: "Test Episode 01",
        ip: "WTF",
        show_title: "WTF Main Show",
        content_bucket: "podcast",
        primary_language: "hi-Latn",
        production_status: "published",
        published_at: "2026-08-20T10:00:00Z",
        recorded_at: "2026-08-15T10:00:00Z",
        duration_seconds: 3600,
        thumbnail_url: "https://assets.wtfmedia.com/thumb01.jpg",
        description: "Test description",
        chapters_json: "[]",
        created_at: "2026-08-20T10:00:00Z",
        updated_at: "2026-08-20T10:00:00Z",
      },
    ],
  ]);

  const sourceAssets = new Map();
  const auditEvents = [];

  return {
    _sourceAssets: sourceAssets,
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
          if (sql.includes("SELECT * FROM episodes WHERE id = ?")) {
            const epId = this.args?.[0];
            return episodes.get(epId) ?? null;
          }
          if (sql.includes("SELECT * FROM episodes WHERE slug = ?")) {
            const slug = this.args?.[0];
            for (const ep of episodes.values()) {
              if (ep.slug === slug) return ep;
            }
            return null;
          }
          if (sql.includes("INSERT INTO source_assets")) {
            const [
              id, episode_id, asset_type, storage_driver, storage_key,
              content_sha256, byte_size, duration_seconds, mime_type, authority, availability
            ] = this.args;
            const record = {
              id, episode_id, asset_type, storage_driver, storage_key,
              content_sha256, byte_size, duration_seconds, mime_type, authority, availability,
              created_at: new Date().toISOString(),
            };
            sourceAssets.set(id, record);
            return record;
          }
          if (sql.includes("SELECT * FROM source_assets WHERE id = ?")) {
            const id = this.args?.[0];
            return sourceAssets.get(id) ?? null;
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
          if (sql.includes("SELECT * FROM source_assets WHERE episode_id = ?")) {
            const epId = this.args?.[0];
            const list = Array.from(sourceAssets.values()).filter((a) => a.episode_id === epId);
            return { results: list };
          }
          return { results: [] };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

function createMockR2() {
  const store = new Map();
  return {
    _store: store,
    async put(key, value, options) {
      let buffer;
      if (typeof value === "string") {
        buffer = new TextEncoder().encode(value);
      } else if (value instanceof Uint8Array) {
        buffer = value;
      } else if (value instanceof ArrayBuffer) {
        buffer = new Uint8Array(value);
      } else {
        buffer = new Uint8Array(0);
      }
      store.set(key, {
        data: buffer,
        size: buffer.byteLength,
        httpMetadata: options?.httpMetadata ?? {},
        customMetadata: options?.customMetadata ?? {},
        uploadedAt: new Date().toISOString(),
      });
      return { key, size: buffer.byteLength };
    },
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        ...entry,
        async text() {
          return new TextDecoder().decode(entry.data);
        },
        async json() {
          return JSON.parse(new TextDecoder().decode(entry.data));
        },
        async arrayBuffer() {
          return entry.data.buffer;
        },
      };
    },
    async head(key) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        key,
        size: entry.size,
        httpMetadata: entry.httpMetadata,
        customMetadata: entry.customMetadata,
      };
    },
    async delete(key) {
      store.delete(key);
      return {};
    },
  };
}

function createReadableStreamFromBytes(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

// --------------------------------------------------------------------------
// 1. Storage Layout & Key Generation Tests
// --------------------------------------------------------------------------

test("storage_layout: canonical R2 keys generated for all asset types", () => {
  const epId = "ep_01J6M789ABCDEF0123456789AB";
  const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const prefix = "e3b0c44298fc1c14";

  assert.equal(
    getAssetR2Key(epId, "uncut_audio", hash, "wav"),
    `episodes/${epId}/assets/uncut/audio_${prefix}.wav`
  );
  assert.equal(
    getAssetR2Key(epId, "uncut_video", hash, "mp4"),
    `episodes/${epId}/assets/uncut/video_${prefix}.mp4`
  );
  assert.equal(
    getAssetR2Key(epId, "published_audio", hash, "mp3"),
    `episodes/${epId}/assets/published/audio_${prefix}.mp3`
  );
  assert.equal(
    getAssetR2Key(epId, "youtube_video", hash, "mp4"),
    `episodes/${epId}/assets/published/video_${prefix}.mp4`
  );
  assert.equal(
    getAssetR2Key(epId, "captions_srt", hash, "srt"),
    `episodes/${epId}/assets/captions/sub_${prefix}.srt`
  );
  assert.equal(
    getAssetR2Key(epId, "captions_vtt", hash, "vtt"),
    `episodes/${epId}/assets/captions/sub_${prefix}.vtt`
  );
  assert.equal(
    getAssetR2Key(epId, "transcript", hash),
    `episodes/${epId}/transcripts/txv_${prefix}.json`
  );
  assert.equal(
    getAssetR2Key(epId, "sidecar_metadata", hash),
    `episodes/${epId}/metadata/manifest_${prefix}.json`
  );
  assert.equal(
    getAssetR2Key(epId, "editorial_notes", hash, "md"),
    `episodes/${epId}/metadata/notes_${prefix}.md`
  );
});

test("storage_layout: extension sanitization enforces clean alphanumeric extensions", () => {
  assert.equal(sanitizeExtension(".wav"), "wav");
  assert.equal(sanitizeExtension("MP4"), "mp4");
  assert.equal(sanitizeExtension(".JSON"), "json");
  assert.throws(() => sanitizeExtension("../etc/passwd"), /invalid_extension/);
  assert.throws(() => sanitizeExtension("a/b"), /invalid_extension/);
  assert.throws(() => sanitizeExtension(""), /invalid_extension/);
});

test("storage_layout: parseAssetR2Key parses valid keys and extracts components", () => {
  const key = "episodes/ep_01JTEST/assets/uncut/audio_1234567890abcdef.wav";
  const parsed = parseAssetR2Key(key);
  assert.ok(parsed);
  assert.equal(parsed.episodeId, "ep_01JTEST");
  assert.equal(parsed.category, "assets");
  assert.equal(parsed.subCategory, "uncut");
  assert.equal(parsed.filename, "audio_1234567890abcdef");
  assert.equal(parsed.hashPrefix, "1234567890abcdef");
  assert.equal(parsed.ext, "wav");
});

test("storage_layout: parseAssetR2Key rejects directory traversal attempts", () => {
  assert.equal(parseAssetR2Key("episodes/../secrets/audio.wav"), null);
  assert.equal(parseAssetR2Key("episodes/ep_1/../../etc/passwd"), null);
  assert.equal(parseAssetR2Key("/episodes/ep_1/assets/uncut/audio_1234.wav"), null);
  assert.equal(parseAssetR2Key("episodes//ep_1/assets/uncut/audio_1234.wav"), null);
  assert.equal(parseAssetR2Key("episodes\\ep_1\\assets\\uncut\\audio_1234.wav"), null);
  assert.equal(parseAssetR2Key("episodes/ep_1/assets/uncut/audio_1234.wav\0.png"), null);
});

test("storage_layout: MIME type validation whitelist", () => {
  assert.equal(isValidMimeType("audio/flac"), true);
  assert.equal(isValidMimeType("audio/wav"), true);
  assert.equal(isValidMimeType("audio/mpeg"), true);
  assert.equal(isValidMimeType("video/mp4"), true);
  assert.equal(isValidMimeType("text/vtt"), true);
  assert.equal(isValidMimeType("application/x-subrip"), true);
  assert.equal(isValidMimeType("application/json"), true);
  assert.equal(isValidMimeType("application/json; charset=utf-8"), true);

  // Unapproved types
  assert.equal(isValidMimeType("application/x-msdownload"), false);
  assert.equal(isValidMimeType("text/html"), false);
  assert.equal(isValidMimeType("image/svg+xml"), false);
  assert.equal(isValidMimeType(""), false);
});

test("storage_layout: file size limit verification", () => {
  assert.equal(getMaxAssetSizeBytes("uncut_video"), 5 * 1024 * 1024 * 1024);
  assert.equal(getMaxAssetSizeBytes("uncut_audio"), 500 * 1024 * 1024);
  assert.equal(getMaxAssetSizeBytes("captions_srt"), 50 * 1024 * 1024);
  assert.equal(getMaxAssetSizeBytes("sidecar_metadata"), 10 * 1024 * 1024);

  assert.equal(isByteSizeAllowed(100 * 1024 * 1024, "uncut_audio"), true);
  assert.equal(isByteSizeAllowed(600 * 1024 * 1024, "uncut_audio"), false); // > 500MB
  assert.equal(isByteSizeAllowed(4 * 1024 * 1024 * 1024, "uncut_video"), true);
  assert.equal(isByteSizeAllowed(6 * 1024 * 1024 * 1024, "uncut_video"), false); // > 5GB
  assert.equal(isByteSizeAllowed(0, "uncut_audio"), false);
  assert.equal(isByteSizeAllowed(-100, "uncut_audio"), false);
});

test("storage_layout: computeSha256 and verifySha256 helpers", async () => {
  const sample = "hello world provenance test";
  const expectedHash = "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e";
  const computed = await computeSha256(sample);
  assert.equal(computed, expectedHash);
  assert.equal(await verifySha256(sample, expectedHash), true);
  assert.equal(await verifySha256(sample, "0000000000000000000000000000000000000000000000000000000000000000"), false);
});

// --------------------------------------------------------------------------
// 2. Ephemeral HMAC Upload Tickets & Tampering Tests
// --------------------------------------------------------------------------

test("ticket_tampering: HMAC-SHA256 ticket issuance and valid verification", async () => {
  const { uploadTicket, ticket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTASSET00000000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey: "episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_1234567890abcdef.wav",
    expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
    byteSize: 1024,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  assert.ok(uploadTicket.includes("."));
  const verified = await verifyUploadTicket(MOCK_SECRET, uploadTicket);
  assert.equal(verified.ticketId, "ast_01TESTASSET00000000000001");
  assert.equal(verified.episodeId, "ep_01TESTEPISODE000000000001");
  assert.equal(verified.expectedSha256, "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e");
  assert.equal(verified.byteSize, 1024);
  assert.ok(verified.expiresAt > Date.now());
});

test("ticket_tampering: tampered ticket payload is rejected", async () => {
  const { uploadTicket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTASSET00000000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey: "episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_1234567890abcdef.wav",
    expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
    byteSize: 1024,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  const [payloadB64, sig] = uploadTicket.split(".");
  // Tamper payload to change operatorId or episodeId
  const tamperedPayloadB64 = Buffer.from(JSON.stringify({ episodeId: "ep_HACKED" })).toString("base64url");
  const tamperedTicket = `${tamperedPayloadB64}.${sig}`;

  await assert.rejects(
    async () => verifyUploadTicket(MOCK_SECRET, tamperedTicket),
    /tampered_upload_ticket/
  );
});

test("ticket_tampering: tampered signature is rejected", async () => {
  const { uploadTicket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTASSET00000000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey: "episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_1234567890abcdef.wav",
    expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
    byteSize: 1024,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  const [payloadB64] = uploadTicket.split(".");
  const badSig = "INVALID_SIGNATURE_000000000000000000000000";
  const tamperedTicket = `${payloadB64}.${badSig}`;

  await assert.rejects(
    async () => verifyUploadTicket(MOCK_SECRET, tamperedTicket),
    /tampered_upload_ticket/
  );
});

test("ticket_tampering: expired upload ticket is rejected", async () => {
  const { uploadTicket } = await createUploadTicket(
    MOCK_SECRET,
    {
      ticketId: "ast_01TESTASSET00000000000001",
      episodeId: "ep_01TESTEPISODE000000000001",
      assetType: "uncut_audio",
      targetKey: "episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_1234567890abcdef.wav",
      expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
      byteSize: 1024,
      mimeType: "audio/wav",
      operatorId: 1,
    },
    { ttlMs: -1000 } // expired 1 sec ago
  );

  await assert.rejects(
    async () => verifyUploadTicket(MOCK_SECRET, uploadTicket),
    /expired_upload_ticket/
  );
});

// --------------------------------------------------------------------------
// 3. Zero Trust Policy Boundary & Route Gating
// --------------------------------------------------------------------------

test("policy_gating: RBAC matrix allows authorized roles for asset upload lifecycle", () => {
  for (const role of ["super_admin", "admin", "editor"]) {
    assert.equal(decide(role, "assets", "create"), true);
    assert.equal(decide(role, "assets", "upload"), true);
    assert.equal(decide(role, "assets", "confirm"), true);
    assert.equal(canAccessPath(role, "/ops/api/assets/upload-intent"), true);
    assert.equal(canAccessPath(role, "/ops/api/assets/upload-stream"), true);
    assert.equal(canAccessPath(role, "/ops/api/assets/confirm-upload"), true);
  }

  // Unauthenticated or unknown role denies
  assert.equal(decide("guest", "assets", "create"), false);
  assert.equal(decide("anonymous", "assets", "upload"), false);
  assert.equal(canAccessPath("guest", "/ops/api/assets/upload-intent"), false);
});

// --------------------------------------------------------------------------
// 4. Endpoint Unit & Integration Tests (Intent, Stream, Confirm)
// --------------------------------------------------------------------------

test("endpoints: POST /ops/api/assets/upload-intent validates inputs and returns ticket", async () => {
  const db = createMockDb();
  const env = {
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

  const context = {
    operatorId: 1,
    email: "admin@example.test",
    role: "admin",
    environment: "local",
    correlationId: "corr-intent-001",
  };

  const body = {
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    byteSize: 10_000_000,
    mimeType: "audio/wav",
    expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
    ext: "wav",
  };

  const request = new Request("https://ops.local.test/ops/api/assets/upload-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const response = await handleAssetUploadIntent(request, env, context);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.uploadTicket);
  assert.ok(result.assetId.startsWith("ast_"));
  assert.ok(result.expiresAt > Date.now());

  // Privacy assertion: zero internal bucket names or filesystem paths in response
  const responseText = JSON.stringify(result);
  assert.equal(responseText.includes("CATALOGUE"), false);
  assert.equal(responseText.includes("/var/"), false);
  assert.equal(responseText.includes("r2.cloudflarestorage.com"), false);
});

test("endpoints: POST /ops/api/assets/upload-intent rejects non-existent episode", async () => {
  const db = createMockDb();
  const env = {
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

  const context = {
    operatorId: 1,
    email: "admin@example.test",
    role: "admin",
    environment: "local",
    correlationId: "corr-intent-002",
  };

  const body = {
    episodeId: "ep_NON_EXISTENT_EPISODE_000",
    assetType: "uncut_audio",
    byteSize: 10_000,
    mimeType: "audio/wav",
    expectedSha256: "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e",
  };

  const request = new Request("https://ops.local.test/ops/api/assets/upload-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const response = await handleAssetUploadIntent(request, env, context);
  assert.equal(response.status, 404);
  const result = await response.json();
  assert.equal(result.error, "episode_not_found");
});

test("endpoints: PUT /ops/api/assets/upload-stream processes direct streaming upload to R2", async () => {
  const db = createMockDb();
  const r2 = createMockR2();
  const env = {
    DB: db,
    CATALOGUE: r2,
    OPS_HOSTNAME: "ops.local.test",
    OPS_ORIGIN: "https://origin.local.test",
    OPS_ORIGIN_PROOF: "test-proof",
    OPS_ENVIRONMENT: "local",
    ACCESS_ISSUER: "https://issuer.test",
    ACCESS_AUDIENCE: "audience",
    ACCESS_JWKS_URL: "https://issuer.test/certs",
    EDGE_SHARED_SECRET: MOCK_SECRET,
  };

  const payloadText = "binary media uncut payload stream content 123456";
  const payloadBytes = new TextEncoder().encode(payloadText);
  const sha256 = await computeSha256(payloadBytes);

  const { uploadTicket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTSTREAM0000000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey: `episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_${sha256.slice(0, 16)}.wav`,
    expectedSha256: sha256,
    byteSize: payloadBytes.byteLength,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  const request = new Request("https://ops.local.test/ops/api/assets/upload-stream", {
    method: "PUT",
    headers: {
      "X-Upload-Ticket": uploadTicket,
      "Content-Type": "audio/wav",
    },
    body: createReadableStreamFromBytes(payloadBytes),
    duplex: "half",
  });

  const response = await handleAssetUploadStream(request, env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  assert.equal(result.byteSize, payloadBytes.byteLength);
  assert.equal(result.sha256, sha256);

  // Verify object in mock R2
  const stored = await r2.get(`episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_${sha256.slice(0, 16)}.wav`);
  assert.ok(stored);
  assert.equal(await stored.text(), payloadText);
});

test("endpoints: PUT /ops/api/assets/upload-stream aborts and cleans up on hash mismatch", async () => {
  const db = createMockDb();
  const r2 = createMockR2();
  const env = {
    DB: db,
    CATALOGUE: r2,
    OPS_HOSTNAME: "ops.local.test",
    OPS_ORIGIN: "https://origin.local.test",
    OPS_ORIGIN_PROOF: "test-proof",
    OPS_ENVIRONMENT: "local",
    ACCESS_ISSUER: "https://issuer.test",
    ACCESS_AUDIENCE: "audience",
    ACCESS_JWKS_URL: "https://issuer.test/certs",
    EDGE_SHARED_SECRET: MOCK_SECRET,
  };

  const actualBytes = new TextEncoder().encode("tampered or corrupt payload");
  const expectedHash = "a7e112461faaa7282eb11d9d95f87f2ff8e7b99c089c1ff9e2b024479e08398e"; // different hash

  const targetKey = "episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_corrupt.wav";

  const { uploadTicket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTCORRUPT000000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey,
    expectedSha256: expectedHash,
    byteSize: actualBytes.byteLength,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  const request = new Request("https://ops.local.test/ops/api/assets/upload-stream", {
    method: "PUT",
    headers: { "X-Upload-Ticket": uploadTicket },
    body: createReadableStreamFromBytes(actualBytes),
    duplex: "half",
  });

  const response = await handleAssetUploadStream(request, env);
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.error, "hash_mismatch");

  // Verify object was NOT retained in R2
  assert.equal(await r2.head(targetKey), null);
});

test("endpoints: POST /ops/api/assets/confirm-upload registers source_assets and writes audit event", async () => {
  const db = createMockDb();
  const r2 = createMockR2();
  const env = {
    DB: db,
    CATALOGUE: r2,
    OPS_HOSTNAME: "ops.local.test",
    OPS_ORIGIN: "https://origin.local.test",
    OPS_ORIGIN_PROOF: "test-proof",
    OPS_ENVIRONMENT: "local",
    ACCESS_ISSUER: "https://issuer.test",
    ACCESS_AUDIENCE: "audience",
    ACCESS_JWKS_URL: "https://issuer.test/certs",
    EDGE_SHARED_SECRET: MOCK_SECRET,
  };

  const context = {
    operatorId: 1,
    email: "admin@example.test",
    role: "admin",
    environment: "local",
    correlationId: "corr-confirm-001",
  };

  const payloadText = "podcast uncut audio bytes 123";
  const payloadBytes = new TextEncoder().encode(payloadText);
  const sha256 = await computeSha256(payloadBytes);
  const targetKey = `episodes/ep_01TESTEPISODE000000000001/assets/uncut/audio_${sha256.slice(0, 16)}.wav`;

  // Put object in R2 first
  await r2.put(targetKey, payloadBytes, { httpMetadata: { contentType: "audio/wav" } });

  const { uploadTicket } = await createUploadTicket(MOCK_SECRET, {
    ticketId: "ast_01TESTCONFIRM00000000001",
    episodeId: "ep_01TESTEPISODE000000000001",
    assetType: "uncut_audio",
    targetKey,
    expectedSha256: sha256,
    byteSize: payloadBytes.byteLength,
    mimeType: "audio/wav",
    operatorId: 1,
  });

  const request = new Request("https://ops.local.test/ops/api/assets/confirm-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadTicket,
      assetId: "ast_01TESTCONFIRM00000000001",
      durationSeconds: 3600,
      authority: "owner_supplied",
    }),
  });

  const response = await handleAssetConfirmUpload(request, env, context);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.ok(result.asset);
  assert.equal(result.asset.id, "ast_01TESTCONFIRM00000000001");
  assert.equal(result.asset.episodeId, "ep_01TESTEPISODE000000000001");
  assert.equal(result.asset.assetType, "uncut_audio");
  assert.equal(result.asset.storageDriver, "r2");
  assert.equal(result.asset.contentSha256, sha256);
  assert.equal(result.asset.availability, "available");

  // Verify D1 source_assets record exists
  const created = db._sourceAssets.get("ast_01TESTCONFIRM00000000001");
  assert.ok(created);
  assert.equal(created.storage_key, targetKey);

  // Verify audit event was logged
  assert.ok(db._auditEvents.length > 0);
  const auditEvent = db._auditEvents.find((e) => e.args.includes("asset_upload"));
  assert.ok(auditEvent);
  assert.ok(auditEvent.args.includes("ast_01TESTCONFIRM00000000001"));
});

// --------------------------------------------------------------------------
// 5. Full End-to-End via handleOpsRequest
// --------------------------------------------------------------------------

test("endpoints: complete upload lifecycle routed through handleOpsRequest Zero Trust boundary", async () => {
  const db = createMockDb();
  const r2 = createMockR2();
  const env = {
    DB: db,
    CATALOGUE: r2,
    OPS_HOSTNAME: "ops.local.test",
    OPS_ORIGIN: "https://origin.local.test",
    OPS_ORIGIN_PROOF: "test-proof",
    OPS_ENVIRONMENT: "local",
    ACCESS_ISSUER: "https://issuer.test",
    ACCESS_AUDIENCE: "audience",
    ACCESS_JWKS_URL: "https://issuer.test/certs",
    EDGE_SHARED_SECRET: MOCK_SECRET,
  };

  const deps = {
    verifyAccess: async () => ({ ok: true, email: "operator@example.test" }),
  };

  const payload = new TextEncoder().encode("full lifecycle audio bytes");
  const sha256 = await computeSha256(payload);

  // Step 1: POST /ops/api/assets/upload-intent
  const intentReq = new Request("https://ops.local.test/ops/api/assets/upload-intent", {
    method: "POST",
    headers: {
      "cf-access-jwt-assertion": "valid-token",
      "x-request-id": "corr-lifecycle-001",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      episodeId: "ep_01TESTEPISODE000000000001",
      assetType: "uncut_audio",
      byteSize: payload.byteLength,
      mimeType: "audio/wav",
      expectedSha256: sha256,
      ext: "wav",
    }),
  });

  const intentRes = await handleOpsRequest(intentReq, env, deps);
  assert.equal(intentRes.status, 200);
  const { uploadTicket, assetId } = await intentRes.json();
  assert.ok(uploadTicket);

  // Step 2: PUT /ops/api/assets/upload-stream
  const streamReq = new Request("https://ops.local.test/ops/api/assets/upload-stream", {
    method: "PUT",
    headers: {
      "cf-access-jwt-assertion": "valid-token",
      "x-request-id": "corr-lifecycle-002",
      "X-Upload-Ticket": uploadTicket,
    },
    body: createReadableStreamFromBytes(payload),
    duplex: "half",
  });

  const streamRes = await handleOpsRequest(streamReq, env, deps);
  assert.equal(streamRes.status, 200);
  const streamJson = await streamRes.json();
  assert.equal(streamJson.success, true);

  // Step 3: POST /ops/api/assets/confirm-upload
  const confirmReq = new Request("https://ops.local.test/ops/api/assets/confirm-upload", {
    method: "POST",
    headers: {
      "cf-access-jwt-assertion": "valid-token",
      "x-request-id": "corr-lifecycle-003",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uploadTicket,
      assetId,
      durationSeconds: 1800,
      authority: "owner_supplied",
    }),
  });

  const confirmRes = await handleOpsRequest(confirmReq, env, deps);
  assert.equal(confirmRes.status, 201);
  const confirmJson = await confirmRes.json();
  assert.equal(confirmJson.asset.id, assetId);
  assert.equal(confirmJson.asset.availability, "available");
});

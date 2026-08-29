import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import {
  extractGuestAndShow,
  generateEpisodeSlug,
  parseChapters,
  parseIsoDuration,
  parseTimestampToSeconds,
} from "../src/ingest/youtube-parser.ts";
import {
  channelIdToUploadsPlaylistId,
  sha256Hex,
  syncYouTubeChannel,
} from "../src/ingest/youtube-adapter.ts";
import { syncYouTubeChannels } from "../src/scheduled.ts";

const root = new URL("..", import.meta.url).pathname;
const persistTo = mkdtempSync(join(tmpdir(), "wtfmedia-youtube-test-"));
const database = join(persistTo, "youtube_test.sqlite");
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

function createMockKv() {
  const store = new Map();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

function createMockYouTubeFetch({ initialEtag = "etag_v1_xyz", videos = [] }) {
  let playlistCalls = 0;
  let videosCalls = 0;
  let quotaExhausted = false;
  let currentEtag = initialEtag;

  const fetchFn = async (urlStr, options = {}) => {
    const url = new URL(urlStr);
    const ifNoneMatch = options.headers?.["If-None-Match"];

    if (quotaExhausted) {
      return new Response(JSON.stringify({ error: { code: 403, message: "Quota Exceeded" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.includes("/playlistItems")) {
      playlistCalls++;
      if (ifNoneMatch && ifNoneMatch === currentEtag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: currentEtag },
        });
      }

      const playlistResponse = {
        etag: currentEtag,
        items: videos.map((v) => ({
          contentDetails: { videoId: v.id },
          snippet: {
            title: v.title,
            description: v.description,
            publishedAt: v.publishedAt,
            channelId: v.channelId,
            channelTitle: v.channelTitle,
          },
        })),
      };

      return new Response(JSON.stringify(playlistResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: currentEtag,
        },
      });
    }

    if (url.pathname.includes("/videos")) {
      videosCalls++;
      const ids = (url.searchParams.get("id") || "").split(",");
      const matchedVideos = videos.filter((v) => ids.includes(v.id));

      const videosResponse = {
        items: matchedVideos.map((v) => ({
          id: v.id,
          snippet: {
            title: v.title,
            description: v.description,
            publishedAt: v.publishedAt,
            channelId: v.channelId,
            channelTitle: v.channelTitle,
            tags: v.tags || [],
            thumbnails: {
              high: { url: v.thumbnailUrl || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` },
            },
          },
          contentDetails: {
            duration: v.durationStr || "PT1H00M00S",
          },
          statistics: {
            viewCount: String(v.viewCount || 50000),
            likeCount: String(v.likeCount || 2000),
          },
        })),
      };

      return new Response(JSON.stringify(videosResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  return {
    fetchFn,
    get playlistCalls() {
      return playlistCalls;
    },
    get videosCalls() {
      return videosCalls;
    },
    setQuotaExhausted(val) {
      quotaExhausted = val;
    },
    setEtag(val) {
      currentEtag = val;
    },
  };
}

before(() => {
  applyMigrations();
});

after(() => {
  // Persistence cleans up or remains outside tree
});

describe("Milestone 3: YouTube Metadata Parser Unit Tests", () => {
  test("parseIsoDuration correctly converts short and multi-hour durations", () => {
    assert.equal(parseIsoDuration("PT1H23M45S"), 5025); // 3600 + 1380 + 45
    assert.equal(parseIsoDuration("PT58M10S"), 3490);
    assert.equal(parseIsoDuration("PT45S"), 45);
    assert.equal(parseIsoDuration("PT2H"), 7200);
    assert.equal(parseIsoDuration("PT15M"), 900);
    assert.equal(parseIsoDuration("P1DT2H3M4S"), 93784); // 86400 + 7200 + 180 + 4
    assert.equal(parseIsoDuration("P2D"), 172800);
    assert.equal(parseIsoDuration("PT0S"), 0);

    // Empty and invalid cases return 0
    assert.equal(parseIsoDuration(""), 0);
    assert.equal(parseIsoDuration(null), 0);
    assert.equal(parseIsoDuration(undefined), 0);
    assert.equal(parseIsoDuration("invalid_iso_string"), 0);
    assert.equal(parseIsoDuration("PT"), 0);
  });

  test("parseTimestampToSeconds handles MM:SS and HH:MM:SS", () => {
    assert.equal(parseTimestampToSeconds("00:00"), 0);
    assert.equal(parseTimestampToSeconds("03:15"), 195);
    assert.equal(parseTimestampToSeconds("1:23:45"), 5025);
    assert.equal(parseTimestampToSeconds("01:23:45"), 5025);
    assert.equal(parseTimestampToSeconds("invalid"), null);
  });

  test("parseChapters extracts monotonic chapter markers and bounds with video duration", () => {
    const description = `
      In this episode, Nikhil Kamath sits down with industry leaders.

      TIMESTAMPS:
      00:00 - Introduction & Welcome
      03:15 | Why Gaming is Booming in India
      12:45 The Business of Esports
      [45:20] Future of Monetization & Web3
      (1:15:30) Closing Remarks & Key Takeaways

      Follow us on Instagram: @wtfmedia
    `;

    const chapters = parseChapters(description, 5000); // 5000s duration (1h 23m 20s)
    assert.equal(chapters.length, 5);

    assert.equal(chapters[0].title, "Introduction & Welcome");
    assert.equal(chapters[0].startSec, 0);
    assert.equal(chapters[0].endSec, 195); // 03:15

    assert.equal(chapters[1].title, "Why Gaming is Booming in India");
    assert.equal(chapters[1].startSec, 195);
    assert.equal(chapters[1].endSec, 765); // 12:45

    assert.equal(chapters[2].title, "The Business of Esports");
    assert.equal(chapters[2].startSec, 765);
    assert.equal(chapters[2].endSec, 2720); // 45:20

    assert.equal(chapters[3].title, "Future of Monetization & Web3");
    assert.equal(chapters[3].startSec, 2720);
    assert.equal(chapters[3].endSec, 4530); // 1:15:30

    assert.equal(chapters[4].title, "Closing Remarks & Key Takeaways");
    assert.equal(chapters[4].startSec, 4530);
    assert.equal(chapters[4].endSec, 5000); // bounded by durationSeconds
  });

  test("parseChapters rejects non-monotonic timestamps and out-of-bounds lines", () => {
    const description = `
      00:00 Intro
      10:00 Topic 1
      05:00 Out of order moment (should be skipped)
      20:00 Topic 2
      1:30:00 Topic 3
    `;

    const chapters = parseChapters(description, 1800); // 1800s (30 min) -> 1:30:00 is out of bounds
    assert.equal(chapters.length, 3);
    assert.equal(chapters[0].title, "Intro");
    assert.equal(chapters[1].title, "Topic 1");
    assert.equal(chapters[2].title, "Topic 2");
    assert.equal(chapters[2].endSec, 1800);
  });

  test("extractGuestAndShow identifies shows, IPs, guests, and languages", () => {
    // 1. WTF Podcast with Ft.
    const res1 = extractGuestAndShow(
      "WTF is Artificial Intelligence? | Ft. Nikhil Kamath, Rajan Anandan & Tanmay Bhat",
      "We discuss AI startups in India."
    );
    assert.equal(res1.showTitle, "WTF Podcast");
    assert.equal(res1.contentBucket, "podcast");
    assert.equal(res1.ip, "WTF");
    assert.deepEqual(res1.guests, ["Rajan Anandan", "Tanmay Bhat"]);

    // 2. People by WTF
    const res2 = extractGuestAndShow(
      "Nikhil Kamath with Kiran Mazumdar-Shaw | People by WTF #1",
      "A candid conversation on life, biotechnology, and entrepreneurship."
    );
    assert.equal(res2.showTitle, "People by WTF");
    assert.equal(res2.ip, "People by WTF");
    assert.deepEqual(res2.guests, ["Kiran Mazumdar-Shaw"]);

    // 3. WTF is Finance
    const res3 = extractGuestAndShow(
      "WTF is Finance Episode 3: How to invest in 2026",
      "Personal finance basics."
    );
    assert.equal(res3.showTitle, "WTF is Finance");
    assert.equal(res3.contentBucket, "finance");
    assert.equal(res3.ip, "WTF is Finance");

    // 4. Special Episode
    const res4 = extractGuestAndShow(
      "Special Episode: Live from Bengaluru Tech Summit",
      "Live audience Q&A."
    );
    assert.equal(res4.showTitle, "Special Episodes");
    assert.equal(res4.contentBucket, "special");
    assert.equal(res4.ip, "WTF Specials");

    // 5. Shorts / Clips
    const res5 = extractGuestAndShow(
      "Best Advice for Founders #shorts",
      "Quick insight from the podcast."
    );
    assert.equal(res5.contentBucket, "short");
    assert.equal(res5.ip, "WTF Clips");
  });

  test("generateEpisodeSlug generates valid URL slugs bounded within limits", () => {
    const slug1 = generateEpisodeSlug("WTF is Artificial Intelligence?", "dQw4w9WgXcQ");
    assert.equal(slug1, "wtf-is-artificial-intelligence-dQw4w9WgXcQ");

    const slug2 = generateEpisodeSlug("People by WTF: Kiran Mazumdar-Shaw", "xyz123");
    assert.equal(slug2, "people-by-wtf-kiran-mazumdar-shaw-xyz123");
  });
});

describe("Milestone 3: YouTube Adapter & KV ETag Caching", () => {
  const testChannelId = "UC_6vmsXQvU_Y1O6iFqH1_Xw";

  test("channelIdToUploadsPlaylistId transforms UC to UU", () => {
    assert.equal(channelIdToUploadsPlaylistId("UC_6vmsXQvU_Y1O6iFqH1_Xw"), "UU_6vmsXQvU_Y1O6iFqH1_Xw");
    assert.equal(channelIdToUploadsPlaylistId("UU_6vmsXQvU_Y1O6iFqH1_Xw"), "UU_6vmsXQvU_Y1O6iFqH1_Xw");
  });

  test("Adapter performs initial sync, saves ETag in KV, and extracts videos", async () => {
    const kv = createMockKv();
    const mockVideos = [
      {
        id: "vid_101",
        title: "WTF is Electric Vehicles? | Ft. Tarun Mehta, Bhavish Aggarwal",
        description: "00:00 Intro\n10:00 Battery tech\n30:00 Conclusion",
        publishedAt: "2026-08-01T12:00:00Z",
        durationStr: "PT45M00S",
        channelId: testChannelId,
        channelTitle: "WTF is with Nikhil Kamath",
        viewCount: 150000,
        likeCount: 6000,
      },
    ];

    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_initial_123", videos: mockVideos });

    const result = await syncYouTubeChannel(
      { WTFMEDIA_STATE: kv, YOUTUBE_API_KEY: "test_key" },
      testChannelId,
      { fetchFn: mockApi.fetchFn }
    );

    assert.equal(result.status, "completed");
    assert.equal(result.changed, true);
    assert.equal(result.etag, "etag_initial_123");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, "vid_101");
    assert.equal(result.items[0].durationSeconds, 2700);

    // Verify ETag was stored in KV
    const storedEtag = await kv.get(`yt:etag:${testChannelId}`);
    assert.equal(storedEtag, "etag_initial_123");
  });

  test("Adapter terminates early on HTTP 304 Not Modified with 0 video calls (Fast Exit)", async () => {
    const kv = createMockKv();
    await kv.put(`yt:etag:${testChannelId}`, "etag_initial_123");

    const mockVideos = [
      {
        id: "vid_101",
        title: "WTF is Electric Vehicles?",
        description: "00:00 Intro",
        publishedAt: "2026-08-01T12:00:00Z",
        durationStr: "PT45M00S",
        channelId: testChannelId,
      },
    ];

    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_initial_123", videos: mockVideos });

    const result = await syncYouTubeChannel(
      { WTFMEDIA_STATE: kv, YOUTUBE_API_KEY: "test_key" },
      testChannelId,
      { fetchFn: mockApi.fetchFn }
    );

    assert.equal(result.status, "skipped_unchanged");
    assert.equal(result.changed, false);
    assert.equal(result.items.length, 0);

    // Assert: Only 1 playlistItems call was made (with If-None-Match), and 0 videos.list calls!
    assert.equal(mockApi.playlistCalls, 1);
    assert.equal(mockApi.videosCalls, 0);
  });

  test("Adapter handles HTTP 403 / 429 quota exhaustion with backoff state in KV", async () => {
    const kv = createMockKv();
    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_v1", videos: [] });
    mockApi.setQuotaExhausted(true);

    const result = await syncYouTubeChannel(
      { WTFMEDIA_STATE: kv, YOUTUBE_API_KEY: "test_key" },
      testChannelId,
      { fetchFn: mockApi.fetchFn }
    );

    assert.equal(result.status, "quota_exhausted");
    assert.equal(result.changed, false);
    assert.match(result.error || "", /Quota Exceeded/);

    // Verify backoff was set in KV
    const backoff = await kv.get("yt:quota_backoff_until");
    assert.ok(backoff !== null);
    assert.ok(parseInt(backoff, 10) > Date.now());

    // Subsequent call should fast-exit without even calling the fetch API
    const priorCalls = mockApi.playlistCalls;
    const result2 = await syncYouTubeChannel(
      { WTFMEDIA_STATE: kv, YOUTUBE_API_KEY: "test_key" },
      testChannelId,
      { fetchFn: mockApi.fetchFn }
    );

    assert.equal(result2.status, "quota_exhausted");
    assert.equal(mockApi.playlistCalls, priorCalls); // 0 additional API calls made
  });
});

describe("Milestone 3: Scheduled Sync & 3x Repeat Idempotency", () => {
  const d1 = createSqliteD1(database);
  const testChannel1 = "UC_6vmsXQvU_Y1O6iFqH1_Xw";
  const testChannel2 = "UCq-Fj5jknLsUf-MWSy4_brA";

  const mockChannel1Videos = [
    {
      id: "vid_alpha_01",
      title: "WTF is Gaming in India? | Ft. Nikhil Kamath, Animesh Agarwal",
      description: "00:00 - Introduction\n15:30 Esports in India\n45:00 Wrap up",
      publishedAt: "2026-08-10T10:00:00Z",
      durationStr: "PT1H10M00S",
      channelId: testChannel1,
      channelTitle: "WTF is with Nikhil Kamath",
      viewCount: 200000,
      likeCount: 8000,
    },
    {
      id: "vid_alpha_02",
      title: "WTF is Artificial Intelligence? | Ft. Rajan Anandan",
      description: "00:00 Intro\n20:00 Generative AI\n50:00 Conclusion",
      publishedAt: "2026-08-15T10:00:00Z",
      durationStr: "PT1H30M00S",
      channelId: testChannel1,
      channelTitle: "WTF is with Nikhil Kamath",
      viewCount: 350000,
      likeCount: 12000,
    },
  ];

  const mockChannel2Videos = [
    {
      id: "vid_beta_01",
      title: "Top 5 AI Startup Lessons | WTF Clips",
      description: "00:00 Key takeaways from the AI episode.",
      publishedAt: "2026-08-16T12:00:00Z",
      durationStr: "PT8M20S",
      channelId: testChannel2,
      channelTitle: "Nikhil Kamath Clips",
      viewCount: 75000,
      likeCount: 3000,
    },
  ];

  const allMockVideos = [...mockChannel1Videos, ...mockChannel2Videos];

  test("Run 1: Initial scheduled sync populates episodes and external identities", async () => {
    const kv = createMockKv();
    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_sync_run_1", videos: allMockVideos });

    const summary = await syncYouTubeChannels(
      { WTFMEDIA_STATE: kv, DB: d1, YOUTUBE_API_KEY: "key123" },
      d1,
      {
        channels: [testChannel1, testChannel2],
        fetchFn: mockApi.fetchFn,
      }
    );

    assert.equal(summary.totalChannels, 2);
    assert.equal(summary.syncedVideos, 3); // 2 from ch1 + 1 from ch2
    assert.equal(summary.failedChannels, 0);

    // Verify D1 records
    const epCount = succeeds("SELECT COUNT(*) FROM episodes;").trim();
    const idCount = succeeds("SELECT COUNT(*) FROM episode_external_identities;").trim();
    const assetCount = succeeds("SELECT COUNT(*) FROM source_assets WHERE asset_type = 'youtube_video';").trim();

    assert.equal(epCount, "3");
    assert.equal(idCount, "3");
    assert.equal(assetCount, "3");

    // Check specific episode
    const ep1 = JSON.parse(succeeds("SELECT * FROM episodes WHERE slug LIKE '%vid_alpha_01%' LIMIT 1;", true))[0];
    assert.ok(ep1.id.startsWith("ep_"));
    assert.equal(ep1.ip, "WTF");
    assert.equal(ep1.duration_seconds, 4200); // 1h 10m = 4200s
    assert.match(ep1.chapters_json, /Esports in India/);

    const identity1 = JSON.parse(succeeds("SELECT * FROM episode_external_identities WHERE external_id = 'vid_alpha_01' LIMIT 1;", true))[0];
    assert.equal(identity1.platform, "youtube");
    assert.equal(identity1.episode_id, ep1.id);
    assert.equal(identity1.is_primary, 1);
  });

  test("Run 2 (Repeat Sync): Running sync again with same data produces EXACTLY 0 duplicate rows", async () => {
    const kv = createMockKv();
    // Force sync (bypassing ETag cache) to test D1 upsert idempotency directly
    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_sync_run_2", videos: allMockVideos });

    const summary = await syncYouTubeChannels(
      { WTFMEDIA_STATE: kv, DB: d1, YOUTUBE_API_KEY: "key123" },
      d1,
      {
        channels: [testChannel1, testChannel2],
        fetchFn: mockApi.fetchFn,
        force: true,
      }
    );

    assert.equal(summary.totalChannels, 2);
    assert.equal(summary.syncedVideos, 3);

    // Critical assertion: 0 duplicate rows created
    const epCount = succeeds("SELECT COUNT(*) FROM episodes;").trim();
    const idCount = succeeds("SELECT COUNT(*) FROM episode_external_identities;").trim();
    const assetCount = succeeds("SELECT COUNT(*) FROM source_assets WHERE asset_type = 'youtube_video';").trim();

    assert.equal(epCount, "3", "Episodes count MUST remain exactly 3 after 2nd sync");
    assert.equal(idCount, "3", "External identities count MUST remain exactly 3 after 2nd sync");
    assert.equal(assetCount, "3", "Source assets count MUST remain exactly 3 after 2nd sync");
  });

  test("Run 3 (Repeat Sync): Third consecutive sync produces EXACTLY 0 duplicate rows", async () => {
    const kv = createMockKv();
    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_sync_run_3", videos: allMockVideos });

    const summary = await syncYouTubeChannels(
      { WTFMEDIA_STATE: kv, DB: d1, YOUTUBE_API_KEY: "key123" },
      d1,
      {
        channels: [testChannel1, testChannel2],
        fetchFn: mockApi.fetchFn,
        force: true,
      }
    );

    assert.equal(summary.totalChannels, 2);
    assert.equal(summary.syncedVideos, 3);

    // Critical assertion: 0 duplicate rows created
    const epCount = succeeds("SELECT COUNT(*) FROM episodes;").trim();
    const idCount = succeeds("SELECT COUNT(*) FROM episode_external_identities;").trim();
    const assetCount = succeeds("SELECT COUNT(*) FROM source_assets WHERE asset_type = 'youtube_video';").trim();

    assert.equal(epCount, "3", "Episodes count MUST remain exactly 3 after 3rd sync");
    assert.equal(idCount, "3", "External identities count MUST remain exactly 3 after 3rd sync");
    assert.equal(assetCount, "3", "Source assets count MUST remain exactly 3 after 3rd sync");
  });

  test("Updating video description in YouTube updates existing episode in place without creating new episode", async () => {
    const kv = createMockKv();
    const updatedMockVideos = allMockVideos.map((v) => {
      if (v.id === "vid_alpha_01") {
        return {
          ...v,
          title: "WTF is Gaming in India? (Updated Title) | Ft. Nikhil Kamath, Animesh Agarwal",
          description: "00:00 - Intro\n10:00 Mobile Gaming Boom\n40:00 Monetization\n1:05:00 Outro",
        };
      }
      return v;
    });

    const mockApi = createMockYouTubeFetch({ initialEtag: "etag_sync_run_updated", videos: updatedMockVideos });

    await syncYouTubeChannels(
      { WTFMEDIA_STATE: kv, DB: d1, YOUTUBE_API_KEY: "key123" },
      d1,
      {
        channels: [testChannel1],
        fetchFn: mockApi.fetchFn,
        force: true,
      }
    );

    // Verify row count is STILL 3
    const epCount = succeeds("SELECT COUNT(*) FROM episodes;").trim();
    assert.equal(epCount, "3");

    // Verify existing record was updated
    const updatedEp = JSON.parse(succeeds("SELECT * FROM episodes WHERE slug LIKE '%vid_alpha_01%' LIMIT 1;", true))[0];
    assert.match(updatedEp.title, /Updated Title/);
    assert.match(updatedEp.chapters_json, /Mobile Gaming Boom/);
  });
});

#!/usr/bin/env node
/**
 * Bootstrap a deliberately small, public-only corpus in the isolated Beta
 * staging plane. This never reads, copies, or names production resources.
 *
 * Usage:
 *   node scripts/bootstrap-staging-public-corpus.mjs --episode-id <youtube-id> --dry-run
 *   node scripts/bootstrap-staging-public-corpus.mjs --episode-id <youtube-id> --apply
 *
 * --apply requires STAGING_INGEST_TOKEN. It is never printed or passed to
 * Wrangler. All Wrangler calls go through scripts/wrangler-profile.mjs.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const root = resolve(dirname(modulePath), "..");
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_EPISODES = 2;

export const STAGING_TARGET = Object.freeze({
  profile: "wtfmedia",
  database: "wtfmedia-ops-staging",
  bucket: "wtfmedia-catalogue-staging",
  enqueueUrl: "https://wtfmedia-edge-staging.connect2nikhai.workers.dev/v1/admin/enqueue",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function stableId(prefix, videoId) {
  return `${prefix}${videoId.replace(/[^A-Za-z0-9]/g, "").toLowerCase()}`;
}

export function assertStagingTarget(target = STAGING_TARGET) {
  if (
    target?.profile !== "wtfmedia"
    || target.database !== "wtfmedia-ops-staging"
    || target.bucket !== "wtfmedia-catalogue-staging"
    || target.enqueueUrl !== "https://wtfmedia-edge-staging.connect2nikhai.workers.dev/v1/admin/enqueue"
  ) {
    throw new Error("staging_target_required");
  }
  if (/production|wtfmedia-ops(?:$|[^-])|wtfmedia-catalogue(?:$|[^-])|wtfmedia-edge\.connect2nikhai/i.test(JSON.stringify(target))) {
    throw new Error("production_target_rejected");
  }
  return target;
}

function parseCatalogue(rootDir) {
  const data = JSON.parse(readFileSync(join(rootDir, "web/src/data/episodes.json"), "utf8"));
  if (!Array.isArray(data.entries)) throw new Error("episodes_entries_missing");
  return data.entries;
}

export function buildBootstrapPlan(rootDir, videoIds, target = STAGING_TARGET) {
  assertStagingTarget(target);
  const ids = [...new Set(videoIds.map((id) => String(id).trim()))];
  if (ids.length === 0) throw new Error("episode_id_required");
  if (ids.length > MAX_EPISODES) throw new Error("staging_corpus_limit_exceeded");
  if (ids.length !== videoIds.length) throw new Error("duplicate_episode_id");
  if (ids.some((id) => !YOUTUBE_ID.test(id))) throw new Error("invalid_youtube_video_id");

  const episodes = new Map(parseCatalogue(rootDir).map((episode) => [episode.video_id, episode]));
  return ids.map((videoId) => {
    const episode = episodes.get(videoId);
    if (
      !episode
      || typeof episode.title !== "string"
      || !Number.isFinite(episode.duration)
      || episode.url !== `https://www.youtube.com/watch?v=${videoId}`
    ) {
      throw new Error(`catalogue_metadata_missing:${videoId}`);
    }
    const transcriptFile = join(rootDir, "web/public/transcripts", `${videoId}.txt`);
    const timestampsFile = join(rootDir, "web/public/transcripts", `${videoId}.json`);
    // Validate every local source before any remote mutation is possible.
    if (!existsSync(transcriptFile) || !existsSync(timestampsFile)) {
      throw new Error(`public_source_asset_missing:${videoId}`);
    }
    const transcript = readFileSync(transcriptFile);
    const timestamps = readFileSync(timestampsFile);
    if (transcript.length === 0 || timestamps.length === 0) throw new Error(`public_source_asset_empty:${videoId}`);
    try { JSON.parse(timestamps.toString("utf8")); } catch { throw new Error(`timestamp_sidecar_invalid:${videoId}`); }

    const transcriptHash = sha256(transcript);
    const timestampsHash = sha256(timestamps);
    const combinedHash = sha256(Buffer.concat([transcript, timestamps]));
    const episodeId = stableId("ep_stg_", videoId);
    const base = {
      videoId,
      episodeId,
      title: episode.title,
      durationSeconds: episode.duration,
      channelId: typeof episode.channel_id === "string" ? episode.channel_id : null,
      slug: `staging-${videoId.toLowerCase()}`,
      youtubeUrlHash: sha256(`https://www.youtube.com/watch?v=${videoId}`),
      transcript: {
        assetId: stableId("ast_stg_txt_", videoId),
        key: `transcripts/${videoId}.txt`,
        file: transcriptFile,
        fileName: `${videoId}.txt`,
        bytes: transcript.length,
        sha256: transcriptHash,
        mimeType: "text/plain; charset=utf-8",
      },
      timestamps: {
        assetId: stableId("ast_stg_meta_", videoId),
        key: `timestamps/${videoId}.json`,
        file: timestampsFile,
        fileName: `${videoId}.json`,
        bytes: timestamps.length,
        sha256: timestampsHash,
        mimeType: "application/json",
      },
      job: {
        videoId,
        title: episode.title,
        transcriptKey: `transcripts/${videoId}.txt`,
        timestampsKey: `timestamps/${videoId}.json`,
        sourceContentHash: transcriptHash,
        contentHash: combinedHash,
        sourceMode: "published",
      },
    };
    return base;
  });
}

function d1(target, statement) {
  return ["d1", "execute", target.database, "--remote", "--command", statement];
}

function setupStatements(item) {
  const metadata = JSON.stringify({ source: "repository_public_catalogue", video_id: item.videoId });
  const episode = `INSERT INTO episodes (id, slug, title, ip, show_title, duration_seconds) VALUES (${sql(item.episodeId)}, ${sql(item.slug)}, ${sql(item.title)}, 'WTF', 'WTF', ${item.durationSeconds}) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, duration_seconds = excluded.duration_seconds;`;
  const identity = `INSERT INTO episode_external_identities (episode_id, platform, external_id, external_url_hash, channel_id, is_primary, metadata_json) VALUES (${sql(item.episodeId)}, 'youtube', ${sql(item.videoId)}, ${sql(item.youtubeUrlHash)}, ${item.channelId ? sql(item.channelId) : "NULL"}, 1, ${sql(metadata)}) ON CONFLICT(platform, external_id) DO UPDATE SET episode_id = excluded.episode_id, external_url_hash = excluded.external_url_hash, channel_id = coalesce(excluded.channel_id, episode_external_identities.channel_id), is_primary = 1, metadata_json = excluded.metadata_json;`;
  const asset = (part, type) => `INSERT INTO source_assets (id, episode_id, asset_type, storage_driver, storage_key, content_sha256, byte_size, mime_type, authority, availability) VALUES (${sql(part.assetId)}, ${sql(item.episodeId)}, '${type}', 'r2', ${sql(part.key)}, ${sql(part.sha256)}, ${part.bytes}, ${sql(part.mimeType)}, 'youtube_official', 'pending') ON CONFLICT(episode_id, asset_type, content_sha256) DO UPDATE SET storage_driver = excluded.storage_driver, storage_key = excluded.storage_key, byte_size = excluded.byte_size, mime_type = excluded.mime_type, authority = excluded.authority;`;
  return [episode, identity, asset(item.transcript, "captions_vtt"), asset(item.timestamps, "sidecar_metadata")];
}

function availabilityStatement(item) {
  return `UPDATE source_assets SET availability = 'available' WHERE episode_id = ${sql(item.episodeId)} AND storage_driver = 'r2' AND ((asset_type = 'captions_vtt' AND storage_key = ${sql(item.transcript.key)} AND content_sha256 = ${sql(item.transcript.sha256)}) OR (asset_type = 'sidecar_metadata' AND storage_key = ${sql(item.timestamps.key)} AND content_sha256 = ${sql(item.timestamps.sha256)}));`;
}

function verificationStatement(item) {
  return `SELECT external.external_id, sa.storage_key, sa.content_sha256, sa.availability FROM episode_external_identities AS external JOIN source_assets AS sa ON sa.episode_id = external.episode_id WHERE external.platform = 'youtube' AND external.external_id = ${sql(item.videoId)} AND sa.storage_driver = 'r2' AND sa.availability = 'available' AND sa.storage_key IN (${sql(item.transcript.key)}, ${sql(item.timestamps.key)}) ORDER BY sa.storage_key;`;
}

export function receipt(plan, mode) {
  return {
    mode,
    target: { profile: STAGING_TARGET.profile, database: STAGING_TARGET.database, bucket: STAGING_TARGET.bucket },
    episodes: plan.map((item) => ({
      videoId: item.videoId,
      episodeId: item.episodeId,
      title: item.title,
      transcript: { key: item.transcript.key, bytes: item.transcript.bytes, sha256: item.transcript.sha256 },
      timestamps: { key: item.timestamps.key, bytes: item.timestamps.bytes, sha256: item.timestamps.sha256 },
      jobContentHash: item.job.contentHash,
    })),
  };
}

function runWrangler(target, args) {
  const wrapper = join(root, "scripts/wrangler-profile.mjs");
  const result = spawnSync(process.execPath, [wrapper, target.profile, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`wrangler_failed:${args.slice(0, 3).join("_")}`);
}

/** Executes only against the fixed staging target; callers can inject fakes for tests. */
export async function applyBootstrap(plan, options = {}) {
  const target = assertStagingTarget(options.target ?? STAGING_TARGET);
  const runner = options.runner ?? ((args) => runWrangler(target, args));
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = options.token ?? process.env.STAGING_INGEST_TOKEN;
  if (!token) throw new Error("STAGING_INGEST_TOKEN_required_for_apply");

  for (const item of plan) for (const statement of setupStatements(item)) runner(d1(target, statement));
  for (const item of plan) {
    for (const part of [item.transcript, item.timestamps]) {
      runner(["r2", "object", "put", `${target.bucket}/${part.key}`, "--file", part.file, "--content-type", part.mimeType]);
    }
  }
  for (const item of plan) runner(d1(target, availabilityStatement(item)));
  for (const item of plan) runner(d1(target, verificationStatement(item)));

  const response = await fetchImpl(target.enqueueUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-token": token },
    body: JSON.stringify({ jobs: plan.map((item) => item.job) }),
  });
  if (!response.ok) throw new Error(`staging_enqueue_failed:${response.status}`);
  return receipt(plan, "apply");
}

export function parseArgs(argv) {
  const args = { apply: false, dryRun: false, episodeIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--episode-id") args.episodeIds.push(argv[++index] ?? "");
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else throw new Error(`unknown_argument:${arg}`);
  }
  if (args.apply && args.dryRun) throw new Error("choose_one_of_apply_or_dry_run");
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const plan = buildBootstrapPlan(root, args.episodeIds);
  if (!args.apply) {
    const output = receipt(plan, "dry-run");
    console.log(JSON.stringify(output, null, 2));
    return output;
  }
  const output = await applyBootstrap(plan);
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

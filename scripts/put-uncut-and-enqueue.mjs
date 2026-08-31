#!/usr/bin/env node
/**
 * Upload approved uncut transcripts to R2 uncut/{internalRowHash}.txt and
 * enqueue sourceMode: "uncut" on the target edge Worker.
 *
 * Never copies published YouTube transcripts. Never writes URLs or bodies
 * into git. Secret values stay in the environment.
 *
 *   node scripts/put-uncut-and-enqueue.mjs --dir /path/to/txt \
 *     [--timestamps-dir /path/to/private-sidecars] [--dry-run|--apply]
 *
 * Filenames may be "{title}.txt", a slug, or the 64-hex internal row hash.
 * INGEST_TOKEN (or INGEST_SECRET) is required only for --apply enqueue.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  timestampSidecarMatchesTranscript,
  validateStrictTimestampSidecar,
} from "../cloudflare/src/catalogue/sidecar-validation.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const HASH64 = /^[a-f0-9]{64}$/;
const PUBLISHED_DIRS = [
  join(root, "web/public/transcripts"),
  join(root, "data/nikhil-kamath/transcripts"),
];
const ENQUEUE_URL = "https://wtfmedia-edge.connect2nikhai.workers.dev/v1/admin/enqueue";
const BUCKET = "wtfmedia-catalogue";

export function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function hashToken(value) {
  const match = /^(?:sha256:)?([a-f0-9]{16,64})$/i.exec(String(value || "").trim());
  return match ? match[1].toLowerCase() : null;
}

export function youtubeVideoId(row) {
  const value = row?.youtubeVideoId
    ?? row?.cf_youtube_video_id
    ?? row?.youtube_video_id
    ?? row?.videoId
    ?? row?.internal?.youtubeVideoId;
  const normalized = String(value || "").trim();
  return YOUTUBE_ID.test(normalized) ? normalized : null;
}

function rowHash(row) {
  return hashToken(row?.local_uncut_txt_sha256 ?? row?.sourceAssetId ?? row?.internal?.rowHash);
}

function rowTitle(row) {
  return String(row?.cf_manifest_title ?? row?.title ?? row?.episode_name ?? "").trim();
}

function rowMatchTitles(row) {
  return [row?.episode_name, row?.title, row?.cf_manifest_title]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function loadAlignmentBindings(timestampsDir) {
  const manifestPath = join(resolve(timestampsDir), "alignment-manifest.json");
  if (!existsSync(manifestPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error("invalid timestamp alignment manifest");
  }
  if (
    parsed?.schema !== "wtfmedia.uncut-alignment-bindings.v1"
    || !Array.isArray(parsed?.entries)
  ) {
    throw new Error("invalid timestamp alignment manifest");
  }
  const bindings = new Map();
  for (const entry of parsed.entries) {
    const sourceAssetId = String(entry?.sourceAssetId ?? "").trim();
    const videoId = String(entry?.videoId ?? "").trim();
    const sourceContentSha256 = String(entry?.sourceContentSha256 ?? "").trim();
    const sidecarSha256 = String(entry?.sidecarSha256 ?? "").trim();
    if (
      !HASH64.test(sourceAssetId)
      || !YOUTUBE_ID.test(videoId)
      || !HASH64.test(sourceContentSha256)
      || !HASH64.test(sidecarSha256)
      || bindings.has(sourceAssetId)
    ) {
      throw new Error("invalid timestamp alignment manifest");
    }
    bindings.set(sourceAssetId, {
      sourceAssetId,
      videoId,
      sourceContentSha256,
      sidecarSha256,
    });
  }
  return bindings;
}

function countDuplicates(values) {
  const seen = new Set();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

export function validateUncutUploadJobs(jobs) {
  const issues = [];
  const videoIds = [];
  const sourceAssetIds = [];
  let invalidVideoId = 0;
  let invalidSourceAssetId = 0;
  let sourceAssetKeyMismatch = 0;
  let timestampAssetKeyMismatch = 0;
  for (const job of jobs) {
    const videoId = String(job?.videoId ?? "").trim();
    const sourceAssetId = String(job?.sourceAssetId ?? "").trim();
    const keyMatch = /^uncut\/([a-f0-9]{64})\.txt$/.exec(String(job?.transcriptKey ?? ""));
    const timestampKeyMatch = job?.timestampsKey == null
      ? null
      : /^uncut\/([a-f0-9]{64})\.timestamps\.json$/.exec(String(job.timestampsKey));
    if (!YOUTUBE_ID.test(videoId)) invalidVideoId += 1;
    if (!HASH64.test(sourceAssetId)) invalidSourceAssetId += 1;
    if (!keyMatch || keyMatch[1] !== sourceAssetId) sourceAssetKeyMismatch += 1;
    if (job?.timestampsKey != null && (!timestampKeyMatch || timestampKeyMatch[1] !== sourceAssetId)) {
      timestampAssetKeyMismatch += 1;
    }
    videoIds.push(videoId);
    sourceAssetIds.push(sourceAssetId);
  }
  const add = (name, count) => { if (count > 0) issues.push(`${name}:${count}`); };
  add("duplicate_source_asset_id", countDuplicates(sourceAssetIds.filter(Boolean)));
  add("duplicate_video_id", countDuplicates(videoIds.filter(Boolean)));
  add("invalid_source_asset_id", invalidSourceAssetId);
  add("invalid_video_id", invalidVideoId);
  add("source_asset_key_mismatch", sourceAssetKeyMismatch);
  add("timestamp_asset_key_mismatch", timestampAssetKeyMismatch);
  return issues.sort();
}

export function validateTimestampSidecar(value) {
  return validateStrictTimestampSidecar(value);
}

export function eligibleUncutRows(table) {
  const quarantined = new Set(table.quarantinedTitles || []);
  const rows = Array.isArray(table?.rows)
    ? table.rows
    : Array.isArray(table?.jobs)
      ? table.jobs
      : [];
  return rows.filter((row) => {
    if (row?.sourceAssetId != null) {
      return row.sourceMode === "uncut" && Boolean(rowHash(row) && youtubeVideoId(row));
    }
    if (row?.local_uncut_txt_sha256 != null) {
      return Boolean(
        rowHash(row)
        && youtubeVideoId(row)
        && String(row?.mapping_status ?? "").includes("has_cf_youtube_asset"),
      );
    }
    if (row.status === "quarantined") return false;
    if (quarantined.has(row.title)) return false;
    if (row.uncutPointer !== "candidate") return false;
    return Boolean(rowHash(row) && youtubeVideoId(row));
  });
}

function publishedBytesByHash(dirs = PUBLISHED_DIRS) {
  const map = new Map();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".txt")) continue;
      const bytes = readFileSync(join(dir, name));
      map.set(createHash("sha256").update(bytes).digest("hex"), name);
    }
  }
  return map;
}

export function matchUncutFile(fileName, rows) {
  const base = fileName.replace(/\.txt$/i, "");
  if (YOUTUBE_ID.test(base)) {
    return { ok: false, reason: "youtube_id_filename" };
  }
  const hex = hashToken(base);
  if (hex && HASH64.test(hex)) {
    const row = rows.find((item) => rowHash(item) === hex);
    return row ? { ok: true, row, via: "hash" } : { ok: false, reason: "hash_not_eligible" };
  }
  const manifestHits = rows.filter((item) => {
    const localPath = String(item?.local_uncut_txt_path ?? item?.file ?? "").trim();
    return localPath && basename(localPath) === fileName;
  });
  if (manifestHits.length === 1) return { ok: true, row: manifestHits[0], via: "manifest_path" };
  if (manifestHits.length > 1) return { ok: false, reason: "ambiguous_manifest_path" };
  const slug = normalizeTitle(base);
  const hits = rows.filter((item) => rowMatchTitles(item).some((title) => normalizeTitle(title) === slug));
  if (hits.length === 1) return { ok: true, row: hits[0], via: "title" };
  if (hits.length > 1) return { ok: false, reason: "ambiguous_title" };
  return { ok: false, reason: "unmapped_filename" };
}

export function planUncutUploads(dir, table, options = {}) {
  const rows = eligibleUncutRows(table);
  const published = options.publishedHashes || publishedBytesByHash();
  const alignmentBindings = options.timestampsDir
    ? loadAlignmentBindings(options.timestampsDir)
    : null;
  const resolved = resolve(dir);
  for (const blocked of PUBLISHED_DIRS) {
    if (resolved === blocked || resolved.startsWith(`${blocked}/`)) {
      throw new Error("refusing published transcript directory");
    }
  }
  const files = readdirSync(resolved).filter((name) => name.toLowerCase().endsWith(".txt"));
  const planned = [];
  const skipped = [];
  for (const name of files) {
    const match = matchUncutFile(name, rows);
    if (!match.ok) {
      skipped.push({ file: name, reason: match.reason });
      continue;
    }
    const abs = join(resolved, name);
    const bytes = readFileSync(abs);
    if (bytes.length === 0) {
      skipped.push({ file: name, reason: "empty" });
      continue;
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (published.has(digest)) {
      skipped.push({ file: name, reason: "identical_to_published", published: published.get(digest) });
      continue;
    }
    const token = rowHash(match.row);
    if (
      (match.row?.local_uncut_txt_sha256 != null || match.row?.sourceAssetId != null)
      && digest !== token
    ) {
      throw new Error(`reconciled transcript hash mismatch for source asset ${token}`);
    }
    const publicVideoId = youtubeVideoId(match.row);
    if (!publicVideoId) {
      skipped.push({ file: name, reason: "missing_youtube_identity" });
      continue;
    }
    let timestampsFile;
    let timestampsKey;
    let timestampStats;
    let sidecarBytes;
    if (options.timestampsDir) {
      const candidate = join(resolve(options.timestampsDir), `${token}.timestamps.json`);
      const expectedBinding = alignmentBindings?.get(token);
      if (!existsSync(candidate) && expectedBinding) {
        throw new Error(`expected timestamp sidecar missing for source asset ${token}`);
      }
      if (existsSync(candidate)) {
        sidecarBytes = readFileSync(candidate);
        const sidecarSha256 = createHash("sha256").update(sidecarBytes).digest("hex");
        if (
          !expectedBinding
          || expectedBinding.sourceAssetId !== token
          || expectedBinding.videoId !== publicVideoId
          || expectedBinding.sourceContentSha256 !== digest
          || expectedBinding.sidecarSha256 !== sidecarSha256
        ) {
          throw new Error(`timestamp sidecar binding mismatch for source asset ${token}`);
        }
        let parsed;
        try {
          parsed = JSON.parse(sidecarBytes.toString("utf8"));
        } catch {
          throw new Error(`invalid timestamp sidecar for source asset ${token}`);
        }
        timestampStats = validateTimestampSidecar(parsed);
        if (!timestampStats) throw new Error(`invalid timestamp sidecar for source asset ${token}`);
        if (!timestampSidecarMatchesTranscript(parsed, bytes.toString("utf8"))) {
          throw new Error(`timestamp sidecar transcript mismatch for source asset ${token}`);
        }
        timestampsFile = candidate;
        timestampsKey = `uncut/${token}.timestamps.json`;
      }
    }
    const ingestHash = createHash("sha256").update(bytes);
    if (sidecarBytes) ingestHash.update(sidecarBytes);
    planned.push({
      title: rowTitle(match.row),
      file: abs,
      bytes: bytes.length,
      contentHash: ingestHash.digest("hex"),
      sourceContentHash: digest,
      videoId: publicVideoId,
      sourceAssetId: token,
      transcriptKey: `uncut/${token}.txt`,
      ...(timestampsFile ? { timestampsFile, timestampsKey, timestampStats } : {}),
      sourceMode: "uncut",
      via: match.via,
    });
  }
  return { planned, skipped, eligible: rows.length };
}

function wrangler(args) {
  const wrapper = join(root, "scripts/wrangler-profile.mjs");
  const result = spawnSync(process.execPath, [wrapper, "wtfmedia", ...args], {
    cwd: root,
    stdio: "inherit",
    env: (() => {
      const env = { ...process.env };
      for (const key of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) {
        delete env[key];
      }
      return env;
    })(),
  });
  if (result.status !== 0) throw new Error(`wrangler_failed ${args.join(" ")}`);
}

async function enqueue(jobs) {
  const token = process.env.INGEST_TOKEN || process.env.INGEST_SECRET;
  if (!token) throw new Error("INGEST_TOKEN is required to enqueue");
  const response = await fetch(ENQUEUE_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-token": token },
    body: JSON.stringify({
      jobs: jobs.map((job) => ({
        videoId: job.videoId,
        sourceAssetId: job.sourceAssetId,
        title: job.title,
        transcriptKey: job.transcriptKey,
        timestampsKey: job.timestampsKey,
        sourceContentHash: job.sourceContentHash,
        contentHash: job.contentHash,
        sourceMode: "uncut",
      })),
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`enqueue_failed status=${response.status}`);
  return body;
}

function parseArgs(argv) {
  const args = {
    dir: process.env.UNCUT_DIR || "",
    timestampsDir: process.env.UNCUT_TIMESTAMPS_DIR || "",
    mapping: "",
    apply: false,
    dryRun: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--dir") args.dir = argv[++i];
    else if (item === "--timestamps-dir") args.timestampsDir = argv[++i];
    else if (item === "--mapping") args.mapping = argv[++i];
    else if (item === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (item === "--dry-run") {
      args.dryRun = true;
      args.apply = false;
    }
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.dir) throw new Error("pass --dir /path/to/uncut-txt");
  if (!existsSync(args.dir) || !statSync(args.dir).isDirectory()) {
    throw new Error("uncut directory not found");
  }
  if (args.timestampsDir && (!existsSync(args.timestampsDir) || !statSync(args.timestampsDir).isDirectory())) {
    throw new Error("timestamp sidecar directory not found");
  }
  const tablePath = args.mapping
    ? resolve(args.mapping)
    : join(root, "web/lib/catalogue/title-map.json");
  if (!existsSync(tablePath) || !statSync(tablePath).isFile()) {
    throw new Error("mapping manifest not found");
  }
  const table = JSON.parse(readFileSync(tablePath, "utf8"));
  const plan = planUncutUploads(args.dir, table, { timestampsDir: args.timestampsDir });
  const issues = validateUncutUploadJobs(plan.planned);
  const receipt = {
    mode: args.apply ? "apply" : "dry-run",
    dir: resolve(args.dir),
    eligibleCandidates: plan.eligible,
    planned: plan.planned.map(({ file, timestampsFile, ...rest }) => ({
      ...rest,
      fileName: file.split("/").pop(),
      ...(timestampsFile ? { timestampsFileName: timestampsFile.split("/").pop() } : {}),
    })),
    skipped: plan.skipped,
    issues,
  };
  console.log(JSON.stringify(receipt, null, 2));
  if (!args.apply) return receipt;
  if (issues.length > 0) throw new Error(`uncut_preflight_failed ${issues.join(",")}`);
  if (plan.planned.length === 0) throw new Error("no_eligible_uncut_files");
  for (const job of plan.planned) {
    wrangler([
      "r2",
      "object",
      "put",
      `${BUCKET}/${job.transcriptKey}`,
      "--file",
      job.file,
      "--content-type",
      "text/plain; charset=utf-8",
    ]);
    if (job.timestampsFile && job.timestampsKey) {
      wrangler([
        "r2",
        "object",
        "put",
        `${BUCKET}/${job.timestampsKey}`,
        "--file",
        job.timestampsFile,
        "--content-type",
        "application/json; charset=utf-8",
      ]);
    }
  }
  let queued = null;
  if (process.env.INGEST_TOKEN || process.env.INGEST_SECRET) {
    queued = await enqueue(plan.planned);
    console.log(queued);
  } else {
    console.log(JSON.stringify({ uploaded: plan.planned.length, enqueue: "skipped_missing_INGEST_TOKEN" }));
  }
  return { ...receipt, queued };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exit(1);
  });
}

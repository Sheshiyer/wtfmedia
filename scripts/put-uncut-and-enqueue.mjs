#!/usr/bin/env node
/**
 * Upload approved uncut transcripts to R2 uncut/{internalRowHash}.txt and
 * enqueue sourceMode: "uncut" on the target edge Worker.
 *
 * Never copies published YouTube transcripts. Never writes URLs or bodies
 * into git. Secret values stay in the environment.
 *
 *   node scripts/put-uncut-and-enqueue.mjs --dir /path/to/txt [--dry-run|--apply]
 *
 * Filenames may be "{title}.txt", a slug, or the 64-hex internal row hash.
 * INGEST_TOKEN (or INGEST_SECRET) is required only for --apply enqueue.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function eligibleUncutRows(table) {
  const quarantined = new Set(table.quarantinedTitles || []);
  return (table.rows || []).filter((row) => {
    if (row.status === "quarantined") return false;
    if (quarantined.has(row.title)) return false;
    if (row.uncutPointer !== "candidate") return false;
    return Boolean(hashToken(row.internal?.rowHash));
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
    const row = rows.find((item) => hashToken(item.internal.rowHash) === hex);
    return row ? { ok: true, row, via: "hash" } : { ok: false, reason: "hash_not_eligible" };
  }
  const slug = normalizeTitle(base);
  const hits = rows.filter((item) => normalizeTitle(item.title) === slug);
  if (hits.length === 1) return { ok: true, row: hits[0], via: "title" };
  if (hits.length > 1) return { ok: false, reason: "ambiguous_title" };
  return { ok: false, reason: "unmapped_filename" };
}

export function planUncutUploads(dir, table, options = {}) {
  const rows = eligibleUncutRows(table);
  const published = options.publishedHashes || publishedBytesByHash();
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
    const token = hashToken(match.row.internal.rowHash);
    planned.push({
      title: match.row.title,
      file: abs,
      bytes: bytes.length,
      contentHash: digest,
      videoId: token,
      transcriptKey: `uncut/${token}.txt`,
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
        title: job.title,
        transcriptKey: job.transcriptKey,
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
  const args = { dir: process.env.UNCUT_DIR || "", apply: false, dryRun: true };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--dir") args.dir = argv[++i];
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
  const table = JSON.parse(readFileSync(join(root, "web/lib/catalogue/title-map.json"), "utf8"));
  const plan = planUncutUploads(args.dir, table);
  const receipt = {
    mode: args.apply ? "apply" : "dry-run",
    dir: resolve(args.dir),
    eligibleCandidates: plan.eligible,
    planned: plan.planned.map(({ file, ...rest }) => ({ ...rest, fileName: file.split("/").pop() })),
    skipped: plan.skipped,
  };
  console.log(JSON.stringify(receipt, null, 2));
  if (!args.apply) return receipt;
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

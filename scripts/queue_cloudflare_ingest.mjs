#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { timestampSidecarReceipt } from "./build_provenance_manifest.mjs";

export const RECOVERY_VIDEO_IDS = Object.freeze([
  "2q7-cTPwf-g",
  "FPV5fAkqyBs",
  "VIlfHB7Jk2s",
  "0JDsFpU6pGQ",
  "2_yA6GoqUnY",
  "fEUoJSTYtyc",
  "LqSEfz4YUFA",
  "lRjprPQHuXw",
  "wHQiewz8k9g",
  "g0CjWbgsdTQ",
  "AdI_XWv-ZTk",
  "WMRO9dvD5T0",
  "LcWoP6KtZKw",
]);
const recoveryVideoIdSet = new Set(RECOVERY_VIDEO_IDS);
const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(modulePath), "..");
const enqueueUrl = "https://wtfmedia-edge.connect2nikhai.workers.dev/v1/admin/enqueue";

function validateRepairVideoIds(repairVideoIds) {
  if (new Set(repairVideoIds).size !== repairVideoIds.length) {
    throw new Error("duplicate_repair_video_id");
  }
  const rejected = repairVideoIds.filter((videoId) => !recoveryVideoIdSet.has(videoId));
  if (rejected.length > 0) {
    throw new Error(`repair_video_id_not_approved:${rejected.join(",")}`);
  }
}

function parseArguments(argv) {
  let root = defaultRoot;
  let apply = false;
  let dryRun = false;
  const repairVideoIds = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--root requires a path");
      root = resolve(value);
      index += 1;
    } else if (argument === "--repair-video-id") {
      const value = argv[index + 1];
      if (!value) throw new Error("--repair-video-id requires a video ID");
      repairVideoIds.push(value);
      index += 1;
    } else if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--apply") {
      apply = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (apply && dryRun) throw new Error("choose_one_of_apply_or_dry_run");
  validateRepairVideoIds(repairVideoIds);
  return { root, apply, repairVideoIds };
}

function digest(body) {
  return createHash("sha256").update(body).digest("hex");
}

export function buildJobs(root, repairVideoIds = []) {
  validateRepairVideoIds(repairVideoIds);
  const catalogue = JSON.parse(readFileSync(join(root, "web/src/data/episodes.json"), "utf8"));
  if (!Array.isArray(catalogue.entries)) throw new Error("episodes_entries_missing");
  const byVideoId = new Map(catalogue.entries.map((episode) => [episode.video_id, episode]));
  const selected = repairVideoIds.length > 0
    ? repairVideoIds.map((videoId) => {
      const episode = byVideoId.get(videoId);
      if (!episode) throw new Error(`repair_video_id_not_in_catalogue:${videoId}`);
      return episode;
    })
    : catalogue.entries;
  const isRepair = repairVideoIds.length > 0;

  return selected.map((episode) => {
    const transcript = readFileSync(
      join(root, "web/public/transcripts", `${episode.video_id}.txt`),
    );
    const timestampPath = join(root, "web/public/transcripts", `${episode.video_id}.json`);
    const timestampReceipt = timestampSidecarReceipt(timestampPath, {
      root,
      videoId: episode.video_id,
      duration: episode.duration,
      publishedTranscript: transcript,
    });
    if (isRepair && !timestampReceipt.available) {
      throw new Error(
        `repair_timestamp_sidecar_unavailable:${episode.video_id}:${timestampReceipt.reason}`,
      );
    }

    const contentHasher = createHash("sha256").update(transcript);
    if (timestampReceipt.available) contentHasher.update(readFileSync(timestampPath));
    return {
      videoId: episode.video_id,
      title: episode.title,
      transcriptKey: `transcripts/${episode.video_id}.txt`,
      ...(timestampReceipt.available
        ? { timestampsKey: `timestamps/${episode.video_id}.json` }
        : {}),
      sourceContentHash: digest(transcript),
      contentHash: contentHasher.digest("hex"),
      ...(isRepair ? { sourceMode: "published", replaceExisting: true } : {}),
    };
  });
}

export async function main(argv = process.argv.slice(2)) {
  const { root, apply, repairVideoIds } = parseArguments(argv);
  const jobs = buildJobs(root, repairVideoIds);
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry_run", jobs }));
    return;
  }

  const token = process.env.INGEST_SECRET;
  if (!token) throw new Error("INGEST_SECRET is required for --apply");
  const response = await fetch(enqueueUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-token": token },
    body: JSON.stringify({ jobs }),
  });
  if (!response.ok) throw new Error(`enqueue failed: ${response.status}`);
  console.log(JSON.stringify(await response.json()));
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

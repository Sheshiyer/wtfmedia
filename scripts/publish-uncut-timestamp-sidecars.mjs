#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildUncutTimestampBundle } from "./uncut-timestamp-sidecars.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mapPath = resolve(root, ".planning/inputs/podcast-catalog/2026-08-31/all-tabs/all-tabs-transcript-frame-youtube-map.json");
const jobsPath = resolve(root, ".planning/inputs/podcast-catalog/2026-08-31/all-tabs/ask-wtf-current-worker-uncut-jobs.json");
const ingestUrl = "https://wtfmedia-edge.connect2nikhai.workers.dev/v1/admin/enqueue";

function fail(message) {
  throw new Error(message);
}

function uploadSidecar(tempRoot, entry) {
  const localPath = join(tempRoot, entry.job.timestampsKey.replaceAll("/", "__"));
  writeFileSync(localPath, `${JSON.stringify(entry.sidecar, null, 2)}\n`);
  const result = spawnSync("npx", [
    "wrangler", "r2", "object", "put",
    `wtfmedia-catalogue/${entry.job.timestampsKey}`,
    "--file", localPath,
    "--content-type", "application/json",
    "--remote",
    "--profile", "wtfmedia",
  ], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    throw new Error(`r2_upload_failed:${entry.videoId}`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const enqueueOnly = process.argv.includes("--enqueue-only");
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const jobs = JSON.parse(readFileSync(jobsPath, "utf8"));
  const bundle = buildUncutTimestampBundle({ map, jobs });

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry_run", sidecars: bundle.entries.length, intervals: bundle.entries.reduce((sum, entry) => sum + entry.intervalCount, 0), skipped: bundle.skipped.length }));
    return;
  }
  if (!process.env.INGEST_SECRET) fail("INGEST_SECRET is required");

  const tempRoot = mkdtempSync(join(tmpdir(), "wtfmedia-uncut-publish-"));
  try {
    if (enqueueOnly) {
      console.log("Skipping sidecar uploads; using existing deterministic R2 objects...");
    } else {
      for (let index = 0; index < bundle.entries.length; index += 1) {
        console.log(`Uploading timestamp sidecar ${index + 1}/${bundle.entries.length}...`);
        uploadSidecar(tempRoot, bundle.entries[index]);
      }
    }
    console.log(`${enqueueOnly ? "Using" : "Uploaded"} ${bundle.entries.length} timestamp sidecars; enqueueing re-ingest...`);
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-token": process.env.INGEST_SECRET },
      body: JSON.stringify({ jobs: bundle.entries.map((entry) => entry.job) }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorCode = typeof errorBody?.error === "string" ? errorBody.error : "unknown";
      fail(`enqueue_failed:${response.status}:${errorCode}`);
    }
    const receipt = await response.json();
    console.log(JSON.stringify({ mode: "apply", uploaded: bundle.entries.length, queued: receipt.queued ?? null, skipped: bundle.skipped.length }));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "publish_failed");
  process.exitCode = 1;
});

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HASH64 = /^[a-f0-9]{64}$/;
const UNCUT_KEY = /^uncut\/([a-f0-9]{64})\.txt$/;

function addIssue(counts, name) {
  counts.set(name, (counts.get(name) ?? 0) + 1);
}

function mappingRows(document) {
  return Array.isArray(document?.rows) ? document.rows : [];
}

function jobRows(document) {
  return Array.isArray(document?.jobs) ? document.jobs : [];
}

export function planEpisodeScopeActivation(mappingDocument, jobsDocument) {
  const expectedByVideoId = new Map();
  const counts = new Map();
  for (const row of mappingRows(mappingDocument)) {
    const videoId = String(row?.cf_youtube_video_id ?? row?.youtubeVideoId ?? "").trim();
    if (!YOUTUBE_VIDEO_ID.test(videoId)) continue;
    const storageId = String(row?.local_uncut_txt_sha256 ?? row?.internal?.rowHash ?? "")
      .replace(/^sha256:/, "")
      .trim();
    if (!HASH64.test(storageId)) {
      addIssue(counts, "invalid_mapping_storage_hash");
      continue;
    }
    if (expectedByVideoId.has(videoId)) addIssue(counts, "duplicate_mapping_video_id");
    expectedByVideoId.set(videoId, storageId);
  }

  const planned = [];
  const seenVideoIds = new Set();
  const seenStorageIds = new Set();
  for (const job of jobRows(jobsDocument)) {
    const videoId = String(job?.videoId ?? "").trim();
    const keyMatch = UNCUT_KEY.exec(String(job?.transcriptKey ?? ""));
    const storageId = keyMatch?.[1] ?? "";
    const metadataHash = String(job?.metadata?.txtSha256 ?? "").trim();
    const file = String(job?.metadata?.localTxtPath ?? "").trim();
    const expectedStorageId = expectedByVideoId.get(videoId);
    let valid = true;

    if (!YOUTUBE_VIDEO_ID.test(videoId)) {
      addIssue(counts, "invalid_job_video_id");
      valid = false;
    }
    if (job?.sourceMode !== "uncut") {
      addIssue(counts, "invalid_job_source_mode");
      valid = false;
    }
    if (!keyMatch) {
      addIssue(counts, "invalid_job_transcript_key");
      valid = false;
    }
    if (!expectedStorageId || storageId !== expectedStorageId) {
      addIssue(counts, "mapping_storage_key_mismatch");
      valid = false;
    }
    if (!HASH64.test(metadataHash)) {
      addIssue(counts, "invalid_metadata_content_hash");
      valid = false;
    }
    if (!file) {
      addIssue(counts, "missing_local_transcript_path");
      valid = false;
    }
    if (seenVideoIds.has(videoId)) {
      addIssue(counts, "duplicate_job_video_id");
      valid = false;
    }
    if (seenStorageIds.has(storageId)) {
      addIssue(counts, "duplicate_job_storage_id");
      valid = false;
    }
    seenVideoIds.add(videoId);
    if (storageId) seenStorageIds.add(storageId);

    let bytes;
    try {
      bytes = valid ? readFileSync(resolve(file)) : null;
    } catch {
      addIssue(counts, "local_transcript_unavailable");
      valid = false;
      bytes = null;
    }
    if (bytes && bytes.byteLength === 0) {
      addIssue(counts, "empty_local_transcript");
      valid = false;
    }
    const actualHash = bytes ? createHash("sha256").update(bytes).digest("hex") : "";
    if (bytes && actualHash !== metadataHash) {
      addIssue(counts, "metadata_content_hash_mismatch");
      valid = false;
    }
    if (bytes && actualHash !== storageId) {
      addIssue(counts, "storage_key_content_hash_mismatch");
      valid = false;
    }
    if (!valid || !bytes) continue;

    planned.push({
      videoId,
      sourceAssetId: storageId,
      title: String(job?.title ?? "").slice(0, 500),
      transcriptKey: `uncut/${storageId}.txt`,
      contentHash: actualHash,
      sourceMode: "uncut",
      file: resolve(file),
      byteSize: bytes.byteLength,
    });
  }

  if (seenVideoIds.size !== expectedByVideoId.size) {
    addIssue(counts, "mapped_job_count_mismatch");
  }
  const issues = [...counts.entries()].map(([name, count]) => `${name}:${count}`).sort();
  return {
    schema: "wtfmedia.episode-scope-activation.v1",
    mappedRows: expectedByVideoId.size,
    inputJobs: jobRows(jobsDocument).length,
    planned: issues.length === 0 ? planned : [],
    issues,
  };
}

function parseArgs(argv) {
  const args = { mapping: "", jobs: "", output: "" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--mapping") args.mapping = argv[++index] ?? "";
    else if (argv[index] === "--jobs") args.jobs = argv[++index] ?? "";
    else if (argv[index] === "--output") args.output = argv[++index] ?? "";
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mapping || !args.jobs) {
    throw new Error("usage: prepare-episode-scope-activation --mapping MAP.json --jobs JOBS.json [--output FILE]");
  }
  const mapping = JSON.parse(readFileSync(resolve(args.mapping), "utf8"));
  const jobs = JSON.parse(readFileSync(resolve(args.jobs), "utf8"));
  const plan = planEpisodeScopeActivation(mapping, jobs);
  if (args.output && plan.issues.length === 0) {
    const output = resolve(args.output);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify({ schema: plan.schema, jobs: plan.planned }, null, 2)}\n`, { mode: 0o600 });
  }
  console.log(JSON.stringify({
    schema: plan.schema,
    mappedRows: plan.mappedRows,
    inputJobs: plan.inputJobs,
    planned: plan.planned.length,
    manifestReady: plan.issues.length === 0 && plan.planned.length === plan.mappedRows,
    outputWritten: Boolean(args.output && plan.issues.length === 0),
    issues: plan.issues,
  }, null, 2));
  if (plan.issues.length > 0) process.exitCode = 1;
  return plan;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "episode_scope_activation_failed");
    process.exitCode = 1;
  }
}

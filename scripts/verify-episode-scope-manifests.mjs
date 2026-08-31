#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HASH64 = /^[a-f0-9]{64}$/;
const UNCUT_KEY = /^uncut\/[a-f0-9]{64}\.txt$/;

function countDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates.size;
}

function issue(issues, name, count) {
  if (count > 0) issues.push(`${name}:${count}`);
}

export function inspectEpisodeScopeManifests(mappingDocument, jobsDocument) {
  const rows = Array.isArray(mappingDocument?.rows) ? mappingDocument.rows : [];
  const jobs = Array.isArray(jobsDocument?.jobs) ? jobsDocument.jobs : [];
  const mappingVideoIds = rows
    .map((row) => String(row?.cf_youtube_video_id ?? row?.youtubeVideoId ?? "").trim())
    .filter((videoId) => YOUTUBE_VIDEO_ID.test(videoId));
  const mappedVideoIds = new Set(mappingVideoIds);
  const mappingByVideoId = new Map();
  const mappingStorageIds = [];
  let invalidMappingStorageHash = 0;
  for (const row of rows) {
    const videoId = String(row?.cf_youtube_video_id ?? row?.youtubeVideoId ?? "").trim();
    if (!YOUTUBE_VIDEO_ID.test(videoId)) continue;
    const storageId = String(row?.local_uncut_txt_sha256 ?? row?.internal?.rowHash ?? "")
      .replace(/^sha256:/, "")
      .trim();
    if (!HASH64.test(storageId)) invalidMappingStorageHash += 1;
    else {
      mappingByVideoId.set(videoId, storageId);
      mappingStorageIds.push(storageId);
    }
  }
  const validJobVideoIds = new Set();
  const allJobVideoIds = [];
  let invalidJobVideoId = 0;
  let invalidJobSourceMode = 0;
  let invalidTranscriptKey = 0;
  let invalidContentHash = 0;
  let mismatchedJobTranscriptKey = 0;
  const jobStorageIds = [];

  for (const job of jobs) {
    const videoId = String(job?.videoId ?? "").trim();
    allJobVideoIds.push(videoId);
    const videoIdValid = YOUTUBE_VIDEO_ID.test(videoId);
    const sourceModeValid = job?.sourceMode === "uncut";
    const transcriptKey = String(job?.transcriptKey ?? "");
    const transcriptKeyValid = UNCUT_KEY.test(transcriptKey);
    const storageId = transcriptKeyValid ? transcriptKey.slice("uncut/".length, -".txt".length) : "";
    const expectedStorageId = mappingByVideoId.get(videoId);
    const transcriptKeyMatchesMapping = Boolean(expectedStorageId && storageId === expectedStorageId);
    const contentHashValid = HASH64.test(String(job?.contentHash ?? ""));
    if (!videoIdValid) invalidJobVideoId += 1;
    if (!sourceModeValid) invalidJobSourceMode += 1;
    if (!transcriptKeyValid) invalidTranscriptKey += 1;
    if (transcriptKeyValid && videoIdValid && !transcriptKeyMatchesMapping) mismatchedJobTranscriptKey += 1;
    if (!contentHashValid) invalidContentHash += 1;
    if (storageId) jobStorageIds.push(storageId);
    if (videoIdValid && sourceModeValid && transcriptKeyValid && contentHashValid && transcriptKeyMatchesMapping) {
      validJobVideoIds.add(videoId);
    }
  }

  const issues = [];
  issue(issues, "duplicate_mapping_video_id", countDuplicates(mappingVideoIds));
  issue(issues, "duplicate_mapping_storage_id", countDuplicates(mappingStorageIds));
  issue(issues, "duplicate_job_video_id", countDuplicates(allJobVideoIds.filter(Boolean)));
  issue(issues, "duplicate_job_storage_id", countDuplicates(jobStorageIds));
  issue(issues, "invalid_job_content_hash", invalidContentHash);
  issue(issues, "invalid_job_source_mode", invalidJobSourceMode);
  issue(issues, "invalid_job_transcript_key", invalidTranscriptKey);
  issue(issues, "invalid_job_video_id", invalidJobVideoId);
  issue(issues, "invalid_mapping_storage_hash", invalidMappingStorageHash);
  issue(issues, "mismatched_job_transcript_key", mismatchedJobTranscriptKey);
  issue(issues, "missing_mapped_job", [...mappedVideoIds].filter((videoId) => !validJobVideoIds.has(videoId)).length);
  issue(issues, "unexpected_job_video_id", allJobVideoIds.filter((videoId) => !mappedVideoIds.has(videoId)).length);
  issues.sort();

  return {
    schema: "wtfmedia.episode-scope-preflight.v1",
    mappingRows: rows.length,
    mappedRows: mappedVideoIds.size,
    heldRows: Math.max(0, rows.length - mappedVideoIds.size),
    jobs: jobs.length,
    manifestReady: issues.length === 0 && jobs.length === mappedVideoIds.size,
    vectorMetadataProperty: "video_id",
    releaseGate: "video_id_metadata_index_then_post_index_reupsert",
    issues,
  };
}

function parseArgs(argv) {
  const args = { mapping: "", jobs: "" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--mapping") args.mapping = argv[++index] ?? "";
    else if (argv[index] === "--jobs") args.jobs = argv[++index] ?? "";
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mapping || !args.jobs) {
    throw new Error("usage: verify-episode-scope-manifests --mapping MAP.json --jobs JOBS.json");
  }
  const mapping = JSON.parse(readFileSync(resolve(args.mapping), "utf8"));
  const jobs = JSON.parse(readFileSync(resolve(args.jobs), "utf8"));
  const receipt = inspectEpisodeScopeManifests(mapping, jobs);
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.manifestReady) process.exitCode = 1;
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "episode_scope_preflight_failed");
    process.exitCode = 1;
  }
}

#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CLOCK = String.raw`((?:\d{1,2}:)?\d{1,2}:\d{2})`;
const RANGE_HEADER = new RegExp(String.raw`^\s*(?:\[[^\]]+\]\s*)?\(${CLOCK}\s*-\s*${CLOCK}\)\s*$`);

function clockToSeconds(value) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) throw new Error("invalid_clock");
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  throw new Error("invalid_clock");
}

function normalizeText(lines) {
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function parseUncutTimestampRecords(text) {
  const records = [];
  let current = null;
  const finish = () => {
    if (!current) return;
    const spoken = normalizeText(current.lines);
    if (spoken) records.push({ start: current.start, end: current.end, text: spoken });
    current = null;
  };

  for (const rawLine of String(text || "").replace(/\r/g, "").replace(/\f/g, "\n").split("\n")) {
    const match = rawLine.match(RANGE_HEADER);
    if (match) {
      finish();
      current = { start: clockToSeconds(match[1]), end: clockToSeconds(match[2]), lines: [] };
      continue;
    }
    if (current) current.lines.push(rawLine);
  }
  finish();
  return records;
}

export function parseUncutTimestampIntervals(text) {
  return parseUncutTimestampRecords(text).map(({ start: t, text: x }) => ({ t, x }));
}

export function validateUncutTimestampIntervals(intervals) {
  let previous = -1;
  for (const interval of intervals) {
    if (!Number.isFinite(interval.t) || interval.t < 0) throw new Error("invalid_timestamp");
    if (interval.t < previous) throw new Error("not_monotonic");
    if (typeof interval.x !== "string" || !interval.x.trim()) throw new Error("empty_timestamp_text");
    previous = interval.t;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function buildUncutTimestampBundle({ map, jobs }) {
  const rows = new Map((map.rows || []).map((row) => [row.key, row]));
  const sourceJobs = Array.isArray(jobs) ? jobs : jobs.jobs || [];
  const output = [];
  const skipped = [];

  for (const job of sourceJobs) {
    const key = job.metadata?.key;
    const row = rows.get(key);
    if (!row) throw new Error(`job_map_missing:${job.videoId}`);
    if (!job.videoId || !row.cf_youtube_video_id) {
      skipped.push({ key, videoId: job.videoId || null, reason: "missing_video_id" });
      continue;
    }
    const transcriptPath = row.local_uncut_txt_path;
    if (!transcriptPath || !existsSync(transcriptPath)) throw new Error(`transcript_missing:${key}`);
    const transcriptBytes = readFileSync(transcriptPath);
    const records = parseUncutTimestampRecords(transcriptBytes.toString("utf8"));
    const intervals = records.map(({ start: t, text: x }) => ({ t, x }));
    if (!intervals.length) {
      skipped.push({ key, videoId: job.videoId, reason: "no_explicit_intervals" });
      continue;
    }
    validateUncutTimestampIntervals(intervals);
    const sidecarBytes = Buffer.from(`${JSON.stringify(intervals, null, 2)}\n`, "utf8");
    const transcriptSha256 = sha256(transcriptBytes);
    const timestampsKey = job.transcriptKey.replace(/\.txt$/u, ".timestamps.json");
    output.push({
      job: {
        videoId: job.videoId,
        title: job.title,
        transcriptKey: job.transcriptKey,
        timestampsKey,
        // Admission binds sourceContentHash to the declared transcript asset.
        // contentHash includes the sidecar so an already-indexed transcript
        // is reprocessed when timestamp evidence is added or corrected.
        sourceContentHash: transcriptSha256,
        contentHash: sha256(Buffer.concat([transcriptBytes, sidecarBytes])),
        sourceMode: "uncut",
        metadata: {
          frameIoFinalEpUrl: row.frame_io_final_ep_url || null,
        },
      },
      key,
      videoId: job.videoId,
      transcriptSha256,
      sidecarSha256: sha256(sidecarBytes),
      sourcePdfSha256: row.local_uncut_pdf_sha256 || null,
      transcriptPath,
      frameIoFinalEpUrl: row.frame_io_final_ep_url || null,
      intervalCount: intervals.length,
      firstTimestampSec: intervals[0].t,
      lastTimestampSec: intervals.at(-1).t,
      sidecarBytes: sidecarBytes.length,
      sidecar: intervals,
    });
  }

  return { entries: output, skipped };
}

function main() {
  const args = process.argv.slice(2);
  const mapPath = argument(args, "--map");
  const jobsPath = argument(args, "--jobs");
  const outDir = argument(args, "--out");
  const manifestPath = argument(args, "--manifest");
  if (!mapPath || !jobsPath || !outDir || !manifestPath) {
    throw new Error("usage: --map MAP.json --jobs JOBS.json --out DIR --manifest MANIFEST.json");
  }

  const bundle = buildUncutTimestampBundle({
    map: JSON.parse(readFileSync(resolve(mapPath), "utf8")),
    jobs: JSON.parse(readFileSync(resolve(jobsPath), "utf8")),
  });
  mkdirSync(resolve(outDir), { recursive: true });
  const jobs = [];
  const manifestEntries = [];
  for (const entry of bundle.entries) {
    const relative = entry.job.timestampsKey;
    const outputPath = resolve(outDir, relative);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(entry.sidecar, null, 2)}\n`);
    jobs.push(entry.job);
    const { sidecar, ...manifestEntry } = entry;
    manifestEntries.push({ ...manifestEntry, sidecarPath: outputPath });
  }
  writeFileSync(resolve(outDir, "jobs.json"), `${JSON.stringify({ jobs }, null, 2)}\n`);
  writeFileSync(resolve(manifestPath), `${JSON.stringify({
    schema: "wtfmedia.uncut_timestamp_sidecars.v1",
    generatedAt: new Date().toISOString(),
    source: "explicit transcript interval headers",
    entries: manifestEntries,
    skipped: bundle.skipped,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ generated: bundle.entries.length, skipped: bundle.skipped.length, intervals: bundle.entries.reduce((total, entry) => total + entry.intervalCount, 0), outDir: resolve(outDir), manifest: resolve(manifestPath) }));
}

if (import.meta.url === `file://${process.argv[1]}`) main();

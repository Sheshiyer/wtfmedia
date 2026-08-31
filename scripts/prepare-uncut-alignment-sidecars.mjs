#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { prepareTranscriptAlignment } from "../cloudflare/src/catalogue/transcript-aligner.ts";
import { extractTimestampSegments } from "../cloudflare/src/catalogue/timestamps.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HASH64 = /^[a-f0-9]{64}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function words(value) {
  return String(value ?? "").match(/[A-Za-z0-9]+/g)?.length ?? 0;
}

function boundedInteger(value, fallback, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function groupPublishedCues(cues, targetWords) {
  const segments = [];
  let text = "";
  let startSec = null;
  let wordCount = 0;
  const flush = () => {
    if (!text || startSec == null) return;
    const publishedIndex = segments.length;
    segments.push({
      publishedSegmentId: `published:${publishedIndex}`,
      publishedIndex,
      startSec,
      text,
    });
    text = "";
    startSec = null;
    wordCount = 0;
  };
  for (const cue of Array.isArray(cues) ? cues : []) {
    const cueText = typeof cue?.x === "string" ? cue.x.replace(/\s+/g, " ").trim() : "";
    const cueTime = typeof cue?.t === "number" && Number.isFinite(cue.t) && cue.t >= 0
      ? cue.t
      : null;
    if (!cueText || cueTime == null) continue;
    if (startSec == null) startSec = cueTime;
    text += `${text ? " " : ""}${cueText}`;
    wordCount += words(cueText);
    if (wordCount >= targetWords) flush();
  }
  flush();
  return segments;
}

function splitUncutLines(text) {
  const nativeSegments = extractTimestampSegments(String(text ?? ""));
  if (nativeSegments.length >= 3) {
    return nativeSegments.map((line, uncutIndex) => ({
      uncutSegmentId: `uncut:${uncutIndex}`,
      uncutIndex,
      ...(line.t == null ? {} : { sourceNativeTimeSec: line.t }),
      text: line.x,
    }));
  }
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line, uncutIndex) => ({
      uncutSegmentId: `uncut:${uncutIndex}`,
      uncutIndex,
      text: line,
    }));
}

function sidecarChunks(uncutSegments, prepared, maxChunkChars) {
  const sidecar = [];
  let text = "";
  let firstTiming = null;
  const flush = () => {
    if (!text) return;
    if (firstTiming?.preparedTimeSec != null) {
      sidecar.push({
        t: firstTiming.preparedTimeSec,
        x: text,
        origin: firstTiming.origin === "source_native"
          ? "source_native"
          : "published_alignment",
        confidence: firstTiming.confidence,
      });
    } else {
      sidecar.push({ t: null, x: text });
    }
    text = "";
    firstTiming = null;
  };

  for (let index = 0; index < uncutSegments.length; index += 1) {
    const line = uncutSegments[index].text;
    const timing = prepared[index] ?? null;
    if (text && timing?.origin === "source_native") flush();
    if (text && text.length + line.length + 1 > maxChunkChars) flush();
    if (!text) firstTiming = timing;
    text += `${text ? " " : ""}${line}`;
  }
  flush();
  return sidecar;
}

export function buildAlignmentSidecar(publishedCues, uncutText, options = {}) {
  const publishedWindowWords = boundedInteger(options.publishedWindowWords, 14, 1, 100);
  const maxChunkChars = boundedInteger(options.maxChunkChars, 1_050, 32, 1_100);
  const published = groupPublishedCues(publishedCues, publishedWindowWords);
  const uncut = splitUncutLines(uncutText);
  const prepared = prepareTranscriptAlignment(published, uncut, {
    confidenceThreshold: options.confidenceThreshold,
    lexicalAnchorThreshold: options.lexicalAnchorThreshold,
  });
  const sidecar = sidecarChunks(uncut, prepared, maxChunkChars);
  const timed = sidecar.filter((line) => typeof line.t === "number");
  const monotonic = timed.every((line, index) => index === 0 || line.t >= timed[index - 1].t);
  const exactChunks = timed.filter((line) => line.origin === "source_native").length;
  const estimatedChunks = timed.filter((line) => line.origin === "published_alignment").length;
  const chunks = sidecar.length;
  return {
    sidecar,
    stats: {
      chunks,
      exactChunks,
      estimatedChunks,
      unavailableChunks: chunks - timed.length,
      estimatedCoverage: chunks === 0 ? 0 : Number((estimatedChunks / chunks).toFixed(6)),
      monotonic,
    },
  };
}

export function privateAlignmentBindings(generated) {
  return {
    schema: "wtfmedia.uncut-alignment-bindings.v1",
    entries: generated.map((item) => ({
      sourceAssetId: item.sourceAssetId,
      videoId: item.videoId,
      sourceContentSha256: item.sourceContentSha256,
      sidecarSha256: item.sidecarSha256,
    })),
  };
}

export function publicAlignmentReceipt(generated, inputRows) {
  const chunks = generated.reduce((sum, item) => sum + item.stats.chunks, 0);
  const estimatedChunks = generated.reduce((sum, item) => sum + item.stats.estimatedChunks, 0);
  const unavailableChunks = generated.reduce((sum, item) => sum + item.stats.unavailableChunks, 0);
  return {
    schema: "wtfmedia.uncut-alignment-receipt.v1",
    inputRows,
    generatedSidecars: generated.length,
    skippedRows: Math.max(0, inputRows - generated.length),
    chunks,
    estimatedChunks,
    unavailableChunks,
    estimatedCoverage: chunks === 0 ? 0 : Number((estimatedChunks / chunks).toFixed(6)),
    monotonicViolations: generated.filter((item) => !item.stats.monotonic).length,
  };
}

function outsideRepository(outputDirectory) {
  const output = resolve(outputDirectory);
  const rel = relative(root, output);
  return rel.startsWith(`..${sep}`) || rel === "..";
}

function pathOutside(base, candidate) {
  const rel = relative(base, candidate);
  return rel.startsWith(`..${sep}`) || rel === "..";
}

function privateOutputDirectory(outputDirectory) {
  const output = resolve(outputDirectory);
  if (!outsideRepository(output)) throw new Error("write output must remain outside the repository");
  if (existsSync(output) && lstatSync(output).isSymbolicLink()) {
    throw new Error("refusing symlink output directory");
  }

  let ancestor = output;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const rootReal = realpathSync(root);
  const projectedReal = resolve(realpathSync(ancestor), relative(ancestor, output));
  if (!pathOutside(rootReal, projectedReal)) {
    throw new Error("write output must remain outside the repository");
  }

  mkdirSync(output, { recursive: true, mode: 0o700 });
  if (lstatSync(output).isSymbolicLink()) throw new Error("refusing symlink output directory");
  const outputReal = realpathSync(output);
  if (!pathOutside(rootReal, outputReal)) {
    throw new Error("write output must remain outside the repository");
  }
  chmodSync(outputReal, 0o700);
  return outputReal;
}

function writePrivateFile(outputDirectory, name, bytes) {
  const destination = join(outputDirectory, name);
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) {
    throw new Error(`refusing symlink output: ${name}`);
  }
  const temporary = join(outputDirectory, `.${name}.${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    writeFileSync(descriptor, bytes);
    fchmodSync(descriptor, 0o600);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, destination);
    chmodSync(destination, 0o600);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

function parseArgs(argv) {
  const args = {
    mapping: "",
    publishedDir: join(root, "web/public/transcripts"),
    outputDir: "",
    write: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--mapping") args.mapping = argv[++index] ?? "";
    else if (argv[index] === "--published-dir") args.publishedDir = argv[++index] ?? "";
    else if (argv[index] === "--output-dir") args.outputDir = argv[++index] ?? "";
    else if (argv[index] === "--write") args.write = true;
    else if (argv[index] === "--dry-run") args.write = false;
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mapping) {
    throw new Error("usage: prepare-uncut-alignment-sidecars --mapping MAP.json [--published-dir DIR] [--output-dir EXTERNAL_DIR --write]");
  }
  if (args.write && (!args.outputDir || !outsideRepository(args.outputDir))) {
    throw new Error("write output must be an explicit directory outside the repository");
  }
  const outputDirectory = args.write ? privateOutputDirectory(args.outputDir) : null;
  const mapping = JSON.parse(readFileSync(resolve(args.mapping), "utf8"));
  const rows = Array.isArray(mapping?.rows)
    ? mapping.rows
    : Array.isArray(mapping?.jobs)
      ? mapping.jobs.filter((job) => job?.sourceMode === "uncut")
      : [];
  const generated = [];

  for (const row of rows) {
    const sourceAssetId = String(row?.local_uncut_txt_sha256 ?? row?.sourceAssetId ?? "").trim();
    const videoId = String(
      row?.cf_youtube_video_id ?? row?.youtube_video_id ?? row?.videoId ?? "",
    ).trim();
    const uncutPath = String(row?.local_uncut_txt_path ?? row?.file ?? "").trim();
    const publishedPath = join(resolve(args.publishedDir), `${videoId}.json`);
    if (
      !HASH64.test(sourceAssetId)
      || !YOUTUBE_ID.test(videoId)
      || !uncutPath
      || !existsSync(uncutPath)
      || !existsSync(publishedPath)
    ) {
      continue;
    }
    let publishedCues;
    let uncutText;
    let sourceContentSha256;
    try {
      publishedCues = JSON.parse(readFileSync(publishedPath, "utf8"));
      const uncutBytes = readFileSync(uncutPath);
      sourceContentSha256 = createHash("sha256").update(uncutBytes).digest("hex");
      if (sourceContentSha256 !== sourceAssetId) continue;
      uncutText = uncutBytes.toString("utf8");
    } catch {
      continue;
    }
    const result = buildAlignmentSidecar(publishedCues, uncutText, {
      confidenceThreshold: 0.8,
      lexicalAnchorThreshold: 0.7,
    });
    if (result.sidecar.length === 0 || !result.stats.monotonic) continue;
    const bytes = Buffer.from(`${JSON.stringify(result.sidecar)}\n`);
    const sidecarSha256 = createHash("sha256").update(bytes).digest("hex");
    generated.push({
      sourceAssetId,
      videoId,
      sidecar: result.sidecar,
      stats: result.stats,
      sourceContentSha256,
      sidecarSha256,
    });
    if (args.write) {
      writePrivateFile(outputDirectory, `${sourceAssetId}.timestamps.json`, bytes);
    }
  }

  if (args.write) {
    writePrivateFile(
      outputDirectory,
      "alignment-manifest.json",
      `${JSON.stringify(privateAlignmentBindings(generated), null, 2)}\n`,
    );
  }

  const receipt = publicAlignmentReceipt(generated, rows.length);
  console.log(JSON.stringify({ ...receipt, outputWritten: args.write }, null, 2));
  if (receipt.monotonicViolations > 0) process.exitCode = 1;
  return { receipt, generated };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "alignment_sidecar_preparation_failed");
    process.exitCode = 1;
  }
}

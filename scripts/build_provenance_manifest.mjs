#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MINIMUM_CUE_COUNT = 3;
export const MINIMUM_TEXT_COVERAGE = 0.80;
const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(modulePath), "..");

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function normalizedLength(value) {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : value;
  if (typeof text !== "string") throw new Error("published_transcript_invalid");
  const normalized = normalizeText(text);
  if (!normalized) throw new Error("published_transcript_invalid");
  return Array.from(normalized).length;
}

export function timestampTextCoverageRatio(value, publishedTranscript) {
  const sidecarText = value.map((cue) => normalizeText(cue.x)).join(" ");
  return Array.from(sidecarText).length / normalizedLength(publishedTranscript);
}

export function validateCanonicalTimestampSidecar(value, duration, publishedTranscript) {
  if (!Array.isArray(value) || value.length < MINIMUM_CUE_COUNT) {
    throw new Error("invalid_schema");
  }
  const maximum = Number.isFinite(duration) && duration >= 0 ? duration : undefined;
  let previous = -1;
  for (const cue of value) {
    if (
      cue === null
      || typeof cue !== "object"
      || Array.isArray(cue)
      || Object.keys(cue).length !== 2
      || !Object.hasOwn(cue, "t")
      || !Object.hasOwn(cue, "x")
      || !Number.isFinite(cue.t)
      || cue.t < 0
      || cue.t < previous
      || (maximum !== undefined && cue.t > maximum)
      || normalizeText(cue.x).length === 0
    ) {
      throw new Error("invalid_schema");
    }
    previous = cue.t;
  }
  if (publishedTranscript !== undefined) {
    const ratio = timestampTextCoverageRatio(value, publishedTranscript);
    if (ratio < MINIMUM_TEXT_COVERAGE) {
      const error = new Error("insufficient_text_coverage");
      error.textCoverageRatio = ratio;
      throw error;
    }
  }
  return value;
}

export function timestampSidecarReceipt(
  path,
  { root, videoId, duration, publishedTranscript } = {},
) {
  if (!existsSync(path)) return { available: false, reason: "missing" };
  if (publishedTranscript === undefined) {
    return { available: false, reason: "published_transcript_missing" };
  }
  let body;
  let parsed;
  try {
    body = readFileSync(path);
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return { available: false, reason: "invalid_json" };
  }
  try {
    validateCanonicalTimestampSidecar(parsed, duration, publishedTranscript);
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_text_coverage") {
      return {
        available: false,
        reason: "insufficient_text_coverage",
        text_coverage_ratio: Number(error.textCoverageRatio.toFixed(6)),
      };
    }
    if (error instanceof Error && error.message === "published_transcript_invalid") {
      return { available: false, reason: "published_transcript_invalid" };
    }
    return { available: false, reason: "invalid_schema" };
  }
  const textCoverageRatio = timestampTextCoverageRatio(parsed, publishedTranscript);
  const relativeKey = root && videoId ? `timestamps/${videoId}.json` : undefined;
  return {
    ...(relativeKey ? { key: relativeKey } : {}),
    available: true,
    schema: "wtfmedia.published_timestamps.v1",
    sha256: sha256(body),
    bytes: body.length,
    cue_count: parsed.length,
    text_coverage_ratio: Number(textCoverageRatio.toFixed(6)),
    first_timestamp_sec: parsed[0].t,
    last_timestamp_sec: parsed.at(-1).t,
  };
}

function parseArguments(argv) {
  let root = defaultRoot;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--root requires a path");
      root = resolve(value);
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return { root };
}

export function buildManifest(root, builtAt = new Date().toISOString()) {
  const episodesPath = join(root, "web/src/data/episodes.json");
  const catalogue = JSON.parse(readFileSync(episodesPath, "utf8"));
  if (!Array.isArray(catalogue.entries)) throw new Error("episodes_entries_missing");

  const entries = catalogue.entries.map((episode) => {
    const transcriptPath = join(root, "web/public/transcripts", `${episode.video_id}.txt`);
    const timestampPath = join(root, "web/public/transcripts", `${episode.video_id}.json`);
    const transcript = readFileSync(transcriptPath);
    return {
      video_id: episode.video_id,
      title: episode.title,
      source_url: episode.url,
      transcript: {
        key: `transcripts/${episode.video_id}.txt`,
        sha256: sha256(transcript),
        bytes: transcript.length,
      },
      timestamps: timestampSidecarReceipt(timestampPath, {
        root,
        videoId: episode.video_id,
        duration: episode.duration,
        publishedTranscript: transcript,
      }),
      embedding: { model: "@cf/baai/bge-large-en-v1.5", dimensions: 1024 },
    };
  });

  return {
    schema_version: 1,
    generated_at: builtAt,
    corpus: {
      episodes: entries.length,
      timestamped_episodes: entries.filter((entry) => entry.timestamps.available).length,
    },
    entries,
  };
}

function atomicWriteJson(path, value) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export function main(argv = process.argv.slice(2)) {
  const { root } = parseArguments(argv);
  const manifest = buildManifest(root);
  atomicWriteJson(join(root, "web/src/data/corpus-manifest.json"), manifest);
  console.log(JSON.stringify(manifest.corpus));
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

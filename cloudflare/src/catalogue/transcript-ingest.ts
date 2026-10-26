import { publishedTimingMetadata, type TimestampOrigin } from "../chat/skills/published-youtube.ts";
import { uncutTimingMetadata } from "../chat/skills/approved-uncut.ts";
import {
  ingestStateKey,
  parseJobSourceMode,
  publishedTimestampsKey,
  resolveCatalogueJobIdentity,
  uncutTimestampsKey,
  vectorRecordId,
  vectorSourceRef,
} from "./asset-map.ts";
import { assertCatalogueJobSourceAsset, type TranscriptJob } from "./job-admission.ts";
import { extractTimestampLines, type TimestampLine } from "./timestamps.ts";

export const INGEST_RECEIPT_SCHEMA = "wtfmedia.ingest.v2" as const;
export const LEGACY_REPAIR_CHUNK_LIMIT = 256;
export const MINIMUM_TIMESTAMP_TEXT_COVERAGE = 0.80;
/**
 * Maximum stale tail an exact structured receipt may ask one ingest job to remove.
 * This is over twenty times the current per-episode high-water mark while
 * bounding Vectorize cleanup work to 41 delete batches.
 */
export const MAX_STRUCTURED_STALE_CHUNKS = 4_096;

const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const MAX_CHUNK_CHARS = 1_100;
const UPSERT_BATCH_SIZE = 8;
const UPSERT_ATTEMPTS = 5;
const DELETE_BATCH_SIZE = 100;
const HASH64 = /^[a-f0-9]{64}$/;

type Passage = { text: string; start?: number };

type IngestReceipt = {
  schema: typeof INGEST_RECEIPT_SCHEMA;
  contentHash: string;
  chunkCount: number;
  timingOrigin: TimestampOrigin;
};

type D1Like = Parameters<typeof assertCatalogueJobSourceAsset>[1];

export type TranscriptIngestEnv = {
  AI: { run(model: string, input: unknown): Promise<any> };
  VECTORIZE: {
    upsert(vectors: unknown[]): Promise<unknown>;
    deleteByIds(ids: string[]): Promise<unknown>;
  };
  WTFMEDIA_STATE: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<unknown>;
  };
  CATALOGUE: {
    get(key: string): Promise<{
      text(): Promise<string>;
      json(): Promise<unknown>;
    } | null>;
  };
  DB: D1Like;
};

function chunks(text: string): Passage[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const result: Passage[] = [];
  let current = "";
  for (const word of words) {
    if (current.length && current.length + word.length + 1 > MAX_CHUNK_CHARS) {
      result.push({ text: current });
      current = word;
    } else {
      current += `${current ? " " : ""}${word}`;
    }
  }
  if (current) result.push({ text: current });
  return result;
}

function timestampedChunks(lines: readonly TimestampLine[]): Passage[] {
  const result: Passage[] = [];
  let text = "";
  let start: number | undefined;
  for (const line of lines) {
    if (text && text.length + line.x.length + 1 > MAX_CHUNK_CHARS) {
      result.push({ text, start });
      text = "";
      start = undefined;
    }
    if (start == null) start = line.t;
    text += `${text ? " " : ""}${line.x}`;
  }
  if (text) result.push({ text, start });
  return result;
}

/** Normalize either canonical `{t,x}` or source-native `{start,text,duration}` rows. */
export function normalizeTimestampSidecar(value: unknown): TimestampLine[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("timestamp_sidecar_invalid");
  const result: TimestampLine[] = [];
  let previous = -Infinity;
  for (const entry of value) {
    if (!entry || typeof entry !== "object") throw new Error("timestamp_sidecar_invalid");
    const row = entry as Record<string, unknown>;
    const canonical = Object.hasOwn(row, "t") || Object.hasOwn(row, "x");
    const t = canonical ? row.t : row.start;
    const rawText = canonical ? row.x : row.text;
    if (
      typeof t !== "number"
      || !Number.isFinite(t)
      || t < 0
      || t < previous
      || typeof rawText !== "string"
      || rawText.trim().length === 0
      || (!canonical && row.duration !== undefined
        && (typeof row.duration !== "number" || !Number.isFinite(row.duration) || row.duration < 0))
    ) throw new Error("timestamp_sidecar_invalid");
    result.push({ t, x: rawText.replace(/\s+/g, " ").trim() });
    previous = t;
  }
  return result;
}

function normalizedTextLength(value: string): number {
  return Array.from(value.replace(/\s+/gu, " ").trim()).length;
}

function timestampTextCoverageRatio(lines: readonly TimestampLine[], transcript: string): number {
  const transcriptLength = normalizedTextLength(transcript);
  if (transcriptLength === 0) throw new Error("transcript_content_invalid");
  return normalizedTextLength(lines.map((line) => line.x).join(" ")) / transcriptLength;
}

function parseReceipt(value: string | null):
  | { kind: "none" }
  | { kind: "legacy"; contentHash: string }
  | { kind: "structured"; receipt: IngestReceipt }
  | { kind: "invalid" } {
  if (value == null) return { kind: "none" };
  if (HASH64.test(value)) return { kind: "legacy", contentHash: value };
  try {
    const parsed = JSON.parse(value) as Partial<IngestReceipt>;
    if (
      parsed?.schema === INGEST_RECEIPT_SCHEMA
      && typeof parsed.contentHash === "string"
      && HASH64.test(parsed.contentHash)
      && Number.isSafeInteger(parsed.chunkCount)
      && Number(parsed.chunkCount) >= 0
      && ["published_sidecar", "uncut_sidecar", "uncut_inline", "none"].includes(String(parsed.timingOrigin))
    ) return { kind: "structured", receipt: parsed as IngestReceipt };
  } catch {
    // A malformed prior receipt is repairable only through the explicit path.
  }
  return { kind: "invalid" };
}

async function vectorFor(env: TranscriptIngestEnv, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text });
  const vector = output?.data?.[0] ?? output?.data;
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error("embedding response was not a 1024-dimensional vector");
  }
  return vector;
}

async function upsertWithRetry(env: TranscriptIngestEnv, vectors: unknown[]): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < UPSERT_ATTEMPTS; attempt += 1) {
    try {
      await env.VECTORIZE.upsert(vectors);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt + Math.floor(Math.random() * 150)));
    }
  }
  throw lastError;
}

function normalizeFrameIoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHost = hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io");
    return parsed.protocol === "https:" && allowedHost ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function deleteStaleVectorIds(
  env: TranscriptIngestEnv,
  sourceAssetId: string,
  sourceMode: "published" | "uncut",
  from: number,
  until: number,
): Promise<void> {
  for (let batchStart = from; batchStart < until; batchStart += DELETE_BATCH_SIZE) {
    const batchEnd = Math.min(until, batchStart + DELETE_BATCH_SIZE);
    const ids: string[] = [];
    for (let chunk = batchStart; chunk < batchEnd; chunk += 1) {
      ids.push(vectorRecordId(sourceAssetId, chunk, sourceMode));
    }
    await env.VECTORIZE.deleteByIds(ids);
  }
}

/**
 * Active Alpha transcript consumer. Every declared dependency is validated
 * before vector mutation, and the receipt is committed only after stale ids
 * are removed so a queue retry safely converges.
 */
export async function ingestTranscriptJob(
  job: TranscriptJob,
  env: TranscriptIngestEnv,
): Promise<"skipped" | "ingested"> {
  const sourceMode = parseJobSourceMode(job.sourceMode);
  const identity = resolveCatalogueJobIdentity(
    job.videoId,
    job.transcriptKey,
    sourceMode,
    job.sourceAssetId,
  );
  if (!identity) throw new Error(`${sourceMode}_identity_invalid`);
  if (job.timestampsKey != null) {
    const expectedTimestampsKey = sourceMode === "published"
      ? publishedTimestampsKey(identity.publicVideoId)
      : uncutTimestampsKey(identity.sourceAssetId);
    if (job.timestampsKey !== expectedTimestampsKey) {
      throw new Error(`invalid_${sourceMode}_timestamps_key`);
    }
  }
  if (
    job.replaceExisting === true
    && (sourceMode !== "published" || job.timestampsKey !== publishedTimestampsKey(identity.publicVideoId))
  ) throw new Error("invalid_replace_existing");

  await assertCatalogueJobSourceAsset(job, env.DB);
  const stateKey = ingestStateKey(identity.sourceAssetId, sourceMode);
  const previous = parseReceipt(await env.WTFMEDIA_STATE.get(stateKey));
  if (
    previous.kind === "structured"
    && previous.receipt.contentHash === job.contentHash
    && job.replaceExisting !== true
  ) return "skipped";
  if (previous.kind === "legacy" && previous.contentHash === job.contentHash && job.replaceExisting !== true) return "skipped";
  if ((previous.kind === "legacy" || previous.kind === "invalid") && job.replaceExisting !== true) {
    throw new Error("legacy_receipt_repair_required");
  }

  const transcriptObject = await env.CATALOGUE.get(job.transcriptKey);
  if (!transcriptObject) throw new Error("transcript_asset_unavailable");
  const transcript = await transcriptObject.text();
  let parts = chunks(transcript);
  let timingOrigin: TimestampOrigin = "none";
  let uncutOrigin: "sidecar" | "inline" | null = null;

  if (job.timestampsKey) {
    const sidecarObject = await env.CATALOGUE.get(job.timestampsKey);
    if (!sidecarObject) throw new Error("timestamp_sidecar_unavailable");
    let sidecar: unknown;
    try {
      sidecar = await sidecarObject.json();
    } catch {
      throw new Error("timestamp_sidecar_invalid");
    }
    const normalized = normalizeTimestampSidecar(sidecar);
    if (
      sourceMode === "published"
      && timestampTextCoverageRatio(normalized, transcript) < MINIMUM_TIMESTAMP_TEXT_COVERAGE
    ) throw new Error("timestamp_sidecar_coverage_insufficient");
    parts = timestampedChunks(normalized);
    timingOrigin = sourceMode === "published" ? "published_sidecar" : "uncut_sidecar";
    uncutOrigin = "sidecar";
  } else if (sourceMode === "uncut") {
    const inline = extractTimestampLines(transcript);
    if (inline.length >= 3) {
      parts = timestampedChunks(inline);
      timingOrigin = "uncut_inline";
      uncutOrigin = "inline";
    }
  }
  if (parts.length === 0) throw new Error("transcript_content_invalid");

  const previousChunkCount = previous.kind === "structured"
    ? previous.receipt.chunkCount
    : job.replaceExisting === true
      ? LEGACY_REPAIR_CHUNK_LIMIT
      : parts.length;
  const staleChunkCount = Math.max(0, previousChunkCount - parts.length);
  if (previous.kind === "structured" && staleChunkCount > MAX_STRUCTURED_STALE_CHUNKS) {
    throw new Error("structured_stale_cleanup_limit_exceeded");
  }

  const source = vectorSourceRef(identity.sourceAssetId, sourceMode);
  const frameIoUrl = sourceMode === "uncut"
    ? normalizeFrameIoUrl(job.metadata?.frameIoFinalEpUrl ?? job.metadata?.frame_io_final_ep_url)
    : null;
  for (let offset = 0; offset < parts.length; offset += UPSERT_BATCH_SIZE) {
    const batch = parts.slice(offset, offset + UPSERT_BATCH_SIZE);
    const vectors = await Promise.all(batch.map(async (part, index) => {
      const timingMetadata = sourceMode === "published"
        ? publishedTimingMetadata(part.start, timingOrigin === "published_sidecar")
        : uncutTimingMetadata(part.start, uncutOrigin);
      return {
        id: vectorRecordId(identity.sourceAssetId, offset + index, sourceMode),
        values: await vectorFor(env, part.text),
        metadata: {
          video_id: identity.publicVideoId,
          source_asset_id: identity.sourceAssetId,
          title: String(job.title ?? "").slice(0, 500),
          chunk: offset + index,
          text: part.text,
          source,
          start: part.start ?? null,
          timestamped: part.start != null && timingMetadata.timestamp_status === "verified",
          source_mode: sourceMode,
          ...timingMetadata,
          ...(frameIoUrl ? { frame_io_url: frameIoUrl } : {}),
        },
      };
    }));
    await upsertWithRetry(env, vectors);
  }

  await deleteStaleVectorIds(env, identity.sourceAssetId, sourceMode, parts.length, previousChunkCount);

  const receipt: IngestReceipt = {
    schema: INGEST_RECEIPT_SCHEMA,
    contentHash: job.contentHash,
    chunkCount: parts.length,
    timingOrigin,
  };
  await env.WTFMEDIA_STATE.put(stateKey, JSON.stringify(receipt));
  return "ingested";
}

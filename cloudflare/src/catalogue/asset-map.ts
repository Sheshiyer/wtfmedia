/**
 * Cloudflare catalogue keys for published YouTube and uncut sources.
 * From the 9d9d→wtfmedia inventory: one R2 bucket, one KV namespace, one
 * Vectorize index, one ingest queue. sourceMode is in the key and metadata.
 * No URLs.
 */

export type CatalogueSourceMode = "published" | "uncut";

const HASH = /^(?:sha256:)?([a-f0-9]{16,64})$/i;
const HASH64 = /^[a-f0-9]{64}$/;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const UNCUT_TRANSCRIPT_KEY = /^uncut\/([a-f0-9]{64})\.txt$/;

export function hashToken(value: string): string | null {
  const match = HASH.exec(value.trim());
  return match ? match[1].toLowerCase() : null;
}

export function publishedTranscriptKey(videoId: string): string {
  return `transcripts/${videoId}.txt`;
}

export function publishedTimestampsKey(videoId: string): string {
  return `timestamps/${videoId}.json`;
}

export function uncutTranscriptKey(rowHash: string): string | null {
  const token = hashToken(rowHash);
  return token ? `uncut/${token}.txt` : null;
}

export function uncutTimestampsKey(rowHash: string): string | null {
  const token = hashToken(rowHash);
  return token ? `uncut/${token}.timestamps.json` : null;
}

export function ingestStateKey(id: string, sourceMode: CatalogueSourceMode = "published"): string {
  return sourceMode === "uncut" ? `ingest:uncut:${id}` : `ingest:${id}`;
}

function compactVectorIdentity(id: string): string {
  if (!HASH64.test(id)) return id;
  const bytes = id.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function vectorRecordId(id: string, chunk: number, sourceMode: CatalogueSourceMode = "published"): string {
  // Vectorize record ids are capped at 64 bytes. Base64url retains every bit
  // of a full SHA-256 source identity while leaving room for the chunk suffix.
  return sourceMode === "uncut" ? `uncut:${compactVectorIdentity(id)}:${chunk}` : `${id}:${chunk}`;
}

export function vectorSourceRef(id: string, sourceMode: CatalogueSourceMode): string {
  return sourceMode === "uncut" ? `uncut:${id}` : `https://www.youtube.com/watch?v=${id}`;
}

export function parseJobSourceMode(value: unknown): CatalogueSourceMode {
  return value === "uncut" ? "uncut" : "published";
}

export type CatalogueJobIdentity = {
  publicVideoId: string;
  sourceAssetId: string;
};

/**
 * Keep the public episode join separate from the privacy-safe asset identity.
 * Published jobs use the same YouTube id for both; uncut jobs derive their
 * private identity from the hash-addressed R2 key.
 */
export function resolveCatalogueJobIdentity(
  videoId: unknown,
  transcriptKey: unknown,
  sourceMode: CatalogueSourceMode,
  declaredSourceAssetId?: unknown,
): CatalogueJobIdentity | null {
  const publicVideoId = String(videoId ?? "").trim();
  if (!YOUTUBE_VIDEO_ID.test(publicVideoId)) return null;
  if (sourceMode === "published") {
    if (String(transcriptKey ?? "").trim() !== publishedTranscriptKey(publicVideoId)) return null;
    if (declaredSourceAssetId != null && declaredSourceAssetId !== publicVideoId) return null;
    return { publicVideoId, sourceAssetId: publicVideoId };
  }
  const match = UNCUT_TRANSCRIPT_KEY.exec(String(transcriptKey ?? "").trim());
  if (!match || !HASH64.test(match[1])) return null;
  const sourceAssetId = match[1];
  if (declaredSourceAssetId != null && declaredSourceAssetId !== sourceAssetId) return null;
  return { publicVideoId, sourceAssetId };
}

export function validateCatalogueJobBatch(
  jobs: readonly {
    videoId?: unknown;
    transcriptKey?: unknown;
    timestampsKey?: unknown;
    sourceMode?: unknown;
    sourceAssetId?: unknown;
  }[],
): string | null {
  const uncutVideoIds = new Set<string>();
  const uncutSourceAssetIds = new Set<string>();
  for (const job of jobs) {
    const sourceMode = parseJobSourceMode(job.sourceMode);
    const identity = resolveCatalogueJobIdentity(
      job.videoId,
      job.transcriptKey,
      sourceMode,
      job.sourceAssetId,
    );
    if (!identity) return sourceMode === "uncut" ? "invalid_uncut_identity" : "invalid_published_identity";
    if (job.timestampsKey != null) {
      const expectedTimestampsKey = sourceMode === "uncut"
        ? uncutTimestampsKey(identity.sourceAssetId)
        : publishedTimestampsKey(identity.publicVideoId);
      if (job.timestampsKey !== expectedTimestampsKey) {
        return sourceMode === "uncut"
          ? "invalid_uncut_timestamps_identity"
          : "invalid_published_timestamps_identity";
      }
    }
    if (sourceMode !== "uncut") continue;
    if (uncutVideoIds.has(identity.publicVideoId)) return "duplicate_uncut_video_id";
    if (uncutSourceAssetIds.has(identity.sourceAssetId)) return "duplicate_uncut_source_asset";
    uncutVideoIds.add(identity.publicVideoId);
    uncutSourceAssetIds.add(identity.sourceAssetId);
  }
  return null;
}

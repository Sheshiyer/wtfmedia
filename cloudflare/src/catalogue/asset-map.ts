/**
 * Cloudflare catalogue keys for published YouTube and uncut sources.
 * From the 9d9d→wtfmedia inventory: one R2 bucket, one KV namespace, one
 * Vectorize index, one ingest queue. sourceMode is in the key and metadata.
 * No URLs.
 */

export type CatalogueSourceMode = "published" | "uncut";

const HASH = /^(?:sha256:)?([a-f0-9]{16,64})$/i;

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

export function vectorRecordId(id: string, chunk: number, sourceMode: CatalogueSourceMode = "published"): string {
  return sourceMode === "uncut" ? `uncut:${id}:${chunk}` : `${id}:${chunk}`;
}

export function vectorSourceRef(id: string, sourceMode: CatalogueSourceMode): string {
  return sourceMode === "uncut" ? `uncut:${id}` : `https://www.youtube.com/watch?v=${id}`;
}

export function parseJobSourceMode(value: unknown): CatalogueSourceMode {
  return value === "uncut" ? "uncut" : "published";
}

import { extractTimestampSegments, type TimestampLine } from "./timestamps.ts";

export type TimestampSidecarStats = {
  chunks: number;
  estimated: number;
  exact: number;
  unavailable: number;
};

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizedTranscriptText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** Strict schema for private uncut sidecars. Timed lines always declare provenance. */
export function validateStrictTimestampSidecar(value: unknown): TimestampSidecarStats | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  let estimated = 0;
  let exact = 0;
  let unavailable = 0;
  let previousTime = -1;
  for (const line of value) {
    if (!line || typeof line !== "object" || Array.isArray(line)) return null;
    const record = line as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.some((key) => !["t", "x", "origin", "confidence"].includes(key))) return null;
    if (typeof record.x !== "string" || !record.x.trim() || record.x.length > 10_000) return null;
    if (record.t == null) {
      if (record.origin != null || record.confidence != null) return null;
      unavailable += 1;
      continue;
    }
    if (!finiteTimestamp(record.t) || record.t < previousTime) return null;
    previousTime = record.t;
    if (record.origin === "published_alignment") {
      if (
        typeof record.confidence !== "number"
        || !Number.isFinite(record.confidence)
        || record.confidence < 0.8
        || record.confidence > 1
      ) return null;
      estimated += 1;
      continue;
    }
    if (record.origin === "source_native" && record.confidence === 1) {
      exact += 1;
      continue;
    }
    return null;
  }
  return { chunks: value.length, estimated, exact, unavailable };
}

/**
 * Proves the sidecar cannot replace transcript text. Source-native sidecars
 * additionally have to reproduce the clocks parsed from the transcript body.
 */
export function timestampSidecarMatchesTranscript(
  value: readonly TimestampLine[],
  transcriptText: string,
): boolean {
  const sidecarText = normalizedTranscriptText(value.map((line) => line.x).join(" "));
  const nativeSidecar = value.filter((line) => line.origin === "source_native");
  if (nativeSidecar.length === 0) {
    return sidecarText === normalizedTranscriptText(transcriptText);
  }

  const sourceSegments = extractTimestampSegments(transcriptText);
  if (sourceSegments.length === 0) return false;
  const sourceText = normalizedTranscriptText(sourceSegments.map((line) => line.x).join(" "));
  const sourceTimes = sourceSegments
    .filter((line): line is TimestampLine & { t: number } => finiteTimestamp(line.t))
    .map((line) => line.t);
  const sidecarTimes = nativeSidecar
    .filter((line): line is TimestampLine & { t: number } => finiteTimestamp(line.t))
    .map((line) => line.t);
  return sidecarText === sourceText
    && sourceTimes.length === sidecarTimes.length
    && sourceTimes.every((time, index) => time === sidecarTimes[index]);
}

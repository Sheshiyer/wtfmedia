export type TimestampStatus = "verified" | "source_timing_unavailable" | "requested_timeline_unavailable";
export type TimestampOrigin = "published_sidecar" | "uncut_sidecar" | "uncut_inline" | "none";

export const PUBLISHED_YOUTUBE_SKILL = Object.freeze({
  id: "published-youtube-evidence-v1",
  mode: "published" as const,
  missingTimestampReason: "This published transcript was ingested without timestamp data; the link opens the full episode.",
  crossTimelineReason: "A published timestamp is not an uncut timestamp; no cross-timeline time was inferred.",
});

export function publishedTimingMetadata(start: number | null | undefined, usedSidecar: boolean) {
  const verified = usedSidecar && typeof start === "number" && Number.isFinite(start) && start >= 0;
  return verified
    ? { timestamp_status: "verified" as const, timestamp_origin: "published_sidecar" as const }
    : { timestamp_status: "source_timing_unavailable" as const, timestamp_origin: "none" as const };
}

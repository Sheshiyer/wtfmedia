export const APPROVED_UNCUT_SKILL = Object.freeze({
  id: "approved-uncut-evidence-v1",
  mode: "uncut" as const,
  missingTimestampReason: "This approved uncut transcript has no verified uncut timestamp; no published time was inferred.",
  crossTimelineReason: "An uncut timestamp is not a published timestamp; no cross-timeline time was inferred.",
});

export function uncutTimingMetadata(
  start: number | null | undefined,
  origin: "sidecar" | "inline" | null,
) {
  const verified = origin !== null && typeof start === "number" && Number.isFinite(start) && start >= 0;
  if (!verified) {
    return { timestamp_status: "source_timing_unavailable" as const, timestamp_origin: "none" as const };
  }
  return {
    timestamp_status: "verified" as const,
    timestamp_origin: origin === "sidecar" ? "uncut_sidecar" as const : "uncut_inline" as const,
  };
}

export const SOURCE_MODES = ["published", "uncut"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

export const MAPPING_STATUSES = ["mapped", "unmapped", "unavailable", "conflicted"] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

export function parseSourceMode(value: unknown): SourceMode {
  return value === "uncut" ? "uncut" : "published";
}

export function isSourceMode(value: unknown): value is SourceMode {
  return value === "published" || value === "uncut";
}

export function isMappingStatus(value: unknown): value is MappingStatus {
  return (
    value === "mapped" ||
    value === "unmapped" ||
    value === "unavailable" ||
    value === "conflicted"
  );
}

/**
 * A published timestamp is never treated as an uncut timestamp.
 * Cross-mode conversion requires a verified alignment interval from the Worker.
 */
export function publicTimestampForMode(opts: {
  requested: SourceMode;
  citationMode?: SourceMode | string;
  mappingStatus?: MappingStatus | string;
  timeSec?: number | null;
}): number | null {
  const mode = parseSourceMode(opts.citationMode ?? opts.requested);
  if (mode !== opts.requested) return null;
  if (opts.mappingStatus && opts.mappingStatus !== "mapped") return null;
  const time = opts.timeSec;
  return typeof time === "number" && Number.isFinite(time) && time >= 0 ? time : null;
}

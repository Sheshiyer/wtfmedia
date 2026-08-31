import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import type { SourceMode } from "@/lib/provenance/source-mode";

type CitationSourceMode = Exclude<SourceMode, "both">;

const SOURCE_MODE_ORDER: readonly CitationSourceMode[] = ["published", "uncut"];

export type SourcePanelCitation = PublicSourceCitation;

export interface PresentedSourceCitation extends Omit<SourcePanelCitation, "sourceMode"> {
  sourceMode: CitationSourceMode;
}

export interface CitationPresentation {
  mode: CitationSourceMode;
  timestampLabel: string;
  href: string | null;
  linkLabel: string | null;
}

export interface SourcePanelItemPresentation extends CitationPresentation {
  key: string;
  label: string;
  episodeHref: string | null;
}

export interface SourcePanelPresentation {
  modes: CitationSourceMode[];
  status: string;
  citations: SourcePanelItemPresentation[];
}

export interface SourcePanelPresentationOptions {
  uncutUnavailable?: boolean;
}

const MIN_ESTIMATED_TIMESTAMP_CONFIDENCE = 0.8;

function hasCitationSourceMode(value: unknown): value is CitationSourceMode {
  return value === "published" || value === "uncut";
}

function isFiniteSourceTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function formatSourceTimestamp(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  const sec = wholeSeconds % 60;
  const totalMinutes = Math.floor(wholeSeconds / 60);
  const min = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function isYouTubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

function extractYouTubeVideoId(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const candidate = hostname === "youtu.be"
      ? parsed.pathname.slice(1).split("/")[0]
      : hostname === "youtube.com" || hostname.endsWith(".youtube.com")
        ? parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).at(-1) ?? null
        : null;

    return candidate && isYouTubeVideoId(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function inferCitationSourceMode(source: SourcePanelCitation): CitationSourceMode | null {
  if (hasCitationSourceMode(source.sourceMode)) return source.sourceMode;
  if (typeof source.segmentId === "string" && source.segmentId.startsWith("uncut:")) return "uncut";
  if (extractYouTubeVideoId(source.url)) return "published";
  return null;
}

function getPublishedHref(source: PresentedSourceCitation, timeSec: number | null): string | null {
  const directVideoId =
    typeof source.videoId === "string" && isYouTubeVideoId(source.videoId) ? source.videoId : null;
  const youtubeVideoId = directVideoId ?? extractYouTubeVideoId(source.url);
  if (!youtubeVideoId) return null;

  if (timeSec === null) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}&t=${Math.floor(timeSec)}s`;
}

function getStatusMessage(
  modes: readonly CitationSourceMode[],
  options: SourcePanelPresentationOptions,
): string {
  const hasPublished = modes.includes("published");
  const hasUncut = modes.includes("uncut");

  if (options.uncutUnavailable === true && !hasUncut) {
    return hasPublished
      ? "uncut is unavailable for this answer. published references returned."
      : "uncut is unavailable for this answer.";
  }

  if (hasPublished && hasUncut) {
    return "published and uncut references returned. timestamps remain source-specific.";
  }

  if (hasUncut) {
    return "uncut references returned. timestamps appear only when the source provides one.";
  }

  if (hasPublished) {
    return "published references returned. timestamps appear only when the source provides one.";
  }

  return "no source citations returned.";
}

export function applyResponseSourceMode<T extends SourcePanelCitation>(
  sources: readonly T[],
  responseMode: SourceMode,
): Array<T & { sourceMode: CitationSourceMode }> {
  return sources.flatMap((source) => {
    const citationMode = inferCitationSourceMode(source)
      ?? (hasCitationSourceMode(responseMode) ? responseMode : null);
    return citationMode ? [{ ...source, sourceMode: citationMode }] : [];
  });
}

export function getCitationPresentation(source: SourcePanelCitation): CitationPresentation | null {
  const mode = inferCitationSourceMode(source);
  if (!mode) return null;
  const mapped = source.mappingStatus == null || source.mappingStatus === "mapped";
  const estimated = source.timestampOrigin === "published_alignment";
  const confidence = source.timestampConfidence;
  const trustedEstimate = estimated
    && typeof confidence === "number"
    && Number.isFinite(confidence)
    && confidence >= MIN_ESTIMATED_TIMESTAMP_CONFIDENCE
    && confidence <= 1;
  const timeSec = mapped
    && isFiniteSourceTimestamp(source.timeSec)
    && (!estimated || trustedEstimate)
    ? source.timeSec
    : null;

  if (mode === "published") {
    const href = getPublishedHref({ ...source, sourceMode: mode }, timeSec);

    return {
      mode,
      timestampLabel: timeSec === null
        ? "published · timestamp unavailable"
        : `published ${formatSourceTimestamp(timeSec)}`,
      href,
      linkLabel: href ? (timeSec === null ? "open published video" : "open published moment") : null,
    };
  }

  if (mode === "uncut") {
    return {
      mode,
      timestampLabel: timeSec === null
        ? "uncut · timestamp unavailable"
        : estimated
          ? `estimated uncut ~${formatSourceTimestamp(timeSec)} · ${Math.round((confidence ?? 0) * 100)}%`
          : `uncut ${formatSourceTimestamp(timeSec)}`,
      href: null,
      linkLabel: null,
    };
  }

  return null;
}

export function getSourcePanelPresentation(
  sources: readonly SourcePanelCitation[],
  options: SourcePanelPresentationOptions = {},
): SourcePanelPresentation {
  const citations = sources.flatMap((source) => {
    const citation = getCitationPresentation(source);
    if (!citation) return [];

    return [{
      key: `${source.episodeId ?? source.videoId ?? source.url ?? "source"}-${source.segmentId ?? citation.mode}`,
      label: source.title || source.episodeId || "WTF episode",
      episodeHref: source.episodeId
        ? `/episodes?id=${encodeURIComponent(source.episodeId)}`
        : null,
      ...citation,
    }];
  });
  const modeSet = new Set<CitationSourceMode>(citations.map((citation) => citation.mode));
  const modes = SOURCE_MODE_ORDER.filter((mode) => modeSet.has(mode));

  return {
    modes,
    status: getStatusMessage(modes, options),
    citations,
  };
}

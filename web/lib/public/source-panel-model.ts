import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import type { SourceMode } from "@/lib/provenance/source-mode";

export interface AnswerQueryScope {
  readonly sourceMode: SourceMode;
  readonly episodeId: string | null;
}

export interface SourcePanelEntry {
  readonly source: PublicSourceCitation;
  readonly originalIndex: number;
  readonly citationNumber: number;
  readonly isCited: boolean;
  readonly evidenceId: string;
  readonly sourceMode: Exclude<SourceMode, "both">;
}

export interface SourcePanelGroup {
  readonly key: string;
  readonly label: string;
  readonly entries: SourcePanelEntry[];
  readonly citedEntries: SourcePanelEntry[];
  readonly candidateEntries: SourcePanelEntry[];
}

export interface SourcePanelModel {
  readonly groups: SourcePanelGroup[];
  readonly totalCitedCount: number;
  readonly visibleCitedCount: number;
  readonly hiddenCitedCount: number;
  readonly visibleCandidateCount: number;
}

export function buildSourcePanelModel(_input: {
  sources: readonly PublicSourceCitation[];
  citedIndices?: readonly number[];
  visibleMode: SourceMode;
}): SourcePanelModel {
  const citedSet = _input.citedIndices === undefined
    ? null
    : new Set(
      _input.citedIndices.filter(
        (value) => Number.isSafeInteger(value) && value > 0 && value <= _input.sources.length,
      ),
    );
  let candidateOrdinal = 0;
  const entries = _input.sources.map((source, originalIndex): SourcePanelEntry => {
    const citationNumber = originalIndex + 1;
    const isCited = citedSet ? citedSet.has(citationNumber) : true;
    if (!isCited) candidateOrdinal += 1;
    return {
      source,
      originalIndex,
      citationNumber,
      isCited,
      evidenceId: isCited ? `[${citationNumber}]` : `C${candidateOrdinal}`,
      sourceMode: source.sourceMode === "uncut" ? "uncut" : "published",
    };
  });
  const visibleEntries = _input.visibleMode === "both"
    ? entries
    : entries.filter((entry) => entry.sourceMode === _input.visibleMode);
  const grouped = new Map<string, {
    key: string;
    label: string;
    entries: SourcePanelEntry[];
    firstOriginalIndex: number;
    firstCitedIndex: number;
  }>();

  for (const entry of visibleEntries) {
    const key = entry.source.episodeId
      ?? entry.source.videoId
      ?? entry.source.url
      ?? `source-${entry.citationNumber}`;
    const fallbackLabel = entry.source.episodeId ?? entry.source.videoId ?? "WTF episode";
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        key,
        label: entry.source.title ?? fallbackLabel,
        entries: [entry],
        firstOriginalIndex: entry.originalIndex,
        firstCitedIndex: entry.isCited ? entry.originalIndex : Number.POSITIVE_INFINITY,
      });
      continue;
    }
    current.entries.push(entry);
    if (entry.isCited && entry.originalIndex < current.firstCitedIndex) {
      current.firstCitedIndex = entry.originalIndex;
      current.label = entry.source.title ?? current.label;
    }
  }

  const groups = [...grouped.values()]
    .map((group) => ({
      key: group.key,
      label: group.label,
      entries: [...group.entries].sort((left, right) => {
        if (left.isCited !== right.isCited) return left.isCited ? -1 : 1;
        return left.originalIndex - right.originalIndex;
      }),
      firstOriginalIndex: group.firstOriginalIndex,
      firstCitedIndex: group.firstCitedIndex,
      hasCited: group.entries.some((entry) => entry.isCited),
    }))
    .sort((left, right) => {
      if (left.hasCited !== right.hasCited) return left.hasCited ? -1 : 1;
      return left.hasCited
        ? left.firstCitedIndex - right.firstCitedIndex
        : left.firstOriginalIndex - right.firstOriginalIndex;
    })
    .map(({ key, label, entries: groupEntries }) => ({
      key,
      label,
      entries: groupEntries,
      citedEntries: groupEntries.filter((entry) => entry.isCited),
      candidateEntries: groupEntries.filter((entry) => !entry.isCited),
    }));
  const totalCitedCount = entries.filter((entry) => entry.isCited).length;
  const visibleCitedCount = visibleEntries.filter((entry) => entry.isCited).length;

  return {
    groups,
    totalCitedCount,
    visibleCitedCount,
    hiddenCitedCount: totalCitedCount - visibleCitedCount,
    visibleCandidateCount: visibleEntries.length - visibleCitedCount,
  };
}

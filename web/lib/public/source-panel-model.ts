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
  /** Groups containing one of the top-N strongest excerpts — always shown. */
  readonly primaryGroups: SourcePanelGroup[];
  /** Remaining groups — collapsed behind the "more matches" disclosure. */
  readonly overflowGroups: SourcePanelGroup[];
  readonly overflowEntryCount: number;
  readonly totalCitedCount: number;
  readonly visibleCitedCount: number;
  readonly hiddenCitedCount: number;
  readonly visibleCandidateCount: number;
}

/** Retrieval confidence drives ordering; a missing score sorts last. */
function entryScore(entry: SourcePanelEntry): number {
  const score = entry.source.score;
  return typeof score === "number" && Number.isFinite(score) ? score : -1;
}

export const SOURCE_PANEL_TOP_MATCHES = 5;

export function buildSourcePanelModel(_input: {
  sources: readonly PublicSourceCitation[];
  citedIndices?: readonly number[];
  visibleMode: SourceMode;
  /** How many of the strongest excerpts stay visible before the overflow. */
  topN?: number;
}): SourcePanelModel {  const citedSet = _input.citedIndices === undefined
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
  }>();  for (const entry of visibleEntries) {
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
      // Confidence first: a high-scoring candidate outranks a low-scoring
      // citation. Cited status and original rank only break score ties.
      entries: [...group.entries].sort((left, right) => {
        const scoreDelta = entryScore(right) - entryScore(left);
        if (scoreDelta !== 0) return scoreDelta;
        if (left.isCited !== right.isCited) return left.isCited ? -1 : 1;
        return left.originalIndex - right.originalIndex;
      }),
      firstOriginalIndex: group.firstOriginalIndex,
      firstCitedIndex: group.firstCitedIndex,
      hasCited: group.entries.some((entry) => entry.isCited),
      bestScore: Math.max(...group.entries.map(entryScore)),
    }))
    .sort((left, right) => {
      // Episodes rank by their strongest excerpt's confidence.
      const scoreDelta = right.bestScore - left.bestScore;
      if (scoreDelta !== 0) return scoreDelta;
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

  // The strongest excerpts stay on the page; the rest of the relevant
  // matches collapse behind the "more matches" disclosure. Ordering still
  // follows content match strength — the badge reports timestamp certainty,
  // so it must not drive the split.
  const topN = Math.max(1, _input.topN ?? SOURCE_PANEL_TOP_MATCHES);
  const strongestKeys = new Set(
    [...visibleEntries]
      .sort((left, right) => {
        const scoreDelta = entryScore(right) - entryScore(left);
        if (scoreDelta !== 0) return scoreDelta;
        if (left.isCited !== right.isCited) return left.isCited ? -1 : 1;
        return left.originalIndex - right.originalIndex;
      })
      .slice(0, topN)
      .map((entry) => entry.source.episodeId ?? entry.source.videoId ?? entry.source.url ?? `source-${entry.citationNumber}`),
  );
  const primaryGroups = groups.filter((group) => strongestKeys.has(group.key));
  const overflowGroups = groups.filter((group) => !strongestKeys.has(group.key));
  const overflowEntryCount = overflowGroups.reduce((total, group) => total + group.entries.length, 0);

  return {
    groups,
    primaryGroups,
    overflowGroups,
    overflowEntryCount,
    totalCitedCount,
    visibleCitedCount,
    hiddenCitedCount: totalCitedCount - visibleCitedCount,
    visibleCandidateCount: visibleEntries.length - visibleCitedCount,
  };
}

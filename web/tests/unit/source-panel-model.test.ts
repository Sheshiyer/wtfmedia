import { describe, expect, it } from "vitest";

import { buildSourcePanelModel } from "@/lib/public/source-panel-model";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";

const sources: PublicSourceCitation[] = [
  {
    videoId: "episode0001",
    title: "Episode one published",
    sourceMode: "published",
    timeSec: 125,
    timestampStatus: "verified",
    url: "https://www.youtube.com/watch?v=episode0001",
  },
  {
    videoId: "episode0001",
    title: "Episode one uncut",
    sourceMode: "uncut",
    timeSec: 300,
    timestampStatus: "verified",
    url: "https://f.io/episode-one",
  },
  {
    videoId: "episode0002",
    title: "Episode two published candidate",
    sourceMode: "published",
    timestampStatus: "source_timing_unavailable",
    url: "https://www.youtube.com/watch?v=episode0002",
  },
  {
    videoId: "episode0003",
    title: "Episode three uncut cited",
    sourceMode: "uncut",
    timeSec: 420,
    timestampStatus: "verified",
    url: "https://f.io/episode-three",
  },
];

describe("source-panel projection", () => {
  it("groups episodes cited-first while preserving native source identity", () => {
    const model = buildSourcePanelModel({
      sources,
      citedIndices: [1, 4],
      visibleMode: "both",
    });

    expect(model.groups.map((group) => group.key)).toEqual([
      "episode0001",
      "episode0003",
      "episode0002",
    ]);
    expect(model.groups[0].entries.map((entry) => entry.evidenceId)).toEqual(["[1]", "C1"]);
    expect(model.groups[0].citedEntries.map((entry) => entry.evidenceId)).toEqual(["[1]"]);
    expect(model.groups[0].candidateEntries.map((entry) => entry.evidenceId)).toEqual(["C1"]);
    expect(model.groups[1].entries.map((entry) => entry.evidenceId)).toEqual(["[4]"]);
    expect(model.groups[2].entries.map((entry) => entry.evidenceId)).toEqual(["C2"]);
    expect(model.groups[0].entries[0].source).toBe(sources[0]);
    expect(model.groups[0].entries[1].source).toBe(sources[1]);
    expect(model.groups[0].entries[1]).toMatchObject({
      originalIndex: 1,
      citationNumber: 2,
      isCited: false,
      sourceMode: "uncut",
    });
  });

  it("orders cited episode groups by their first citation, not an earlier candidate", () => {
    const candidateBeforeCitation: PublicSourceCitation[] = [
      { videoId: "episode0001", title: "Episode one candidate", sourceMode: "uncut" },
      { videoId: "episode0002", title: "Episode two cited", sourceMode: "published" },
      { videoId: "episode0001", title: "Episode one cited", sourceMode: "published" },
    ];

    const model = buildSourcePanelModel({
      sources: candidateBeforeCitation,
      citedIndices: [2, 3],
      visibleMode: "both",
    });

    expect(model.groups.map((group) => group.key)).toEqual(["episode0002", "episode0001"]);
    expect(model.groups[1].entries.map((entry) => entry.evidenceId)).toEqual(["[3]", "C1"]);
  });

  it("keeps candidate identifiers stable while reporting hidden citations", () => {
    const model = buildSourcePanelModel({
      sources,
      citedIndices: [1, 4],
      visibleMode: "published",
    });

    expect(model).toMatchObject({
      totalCitedCount: 2,
      visibleCitedCount: 1,
      hiddenCitedCount: 1,
      visibleCandidateCount: 1,
    });
    expect(model.groups.flatMap((group) => group.entries).map((entry) => entry.evidenceId)).toEqual([
      "[1]",
      "C2",
    ]);
    expect(model.groups.flatMap((group) => group.entries).some((entry) => /^\[C/.test(entry.evidenceId))).toBe(false);
  });

  it("treats legacy responses without cited indices as fully cited", () => {
    const model = buildSourcePanelModel({
      sources: sources.slice(0, 2),
      visibleMode: "both",
    });

    expect(model.totalCitedCount).toBe(2);
    expect(model.visibleCandidateCount).toBe(0);
    expect(model.groups[0].entries.map((entry) => entry.evidenceId)).toEqual(["[1]", "[2]"]);
  });

  it("ranks episodes and excerpts by confidence score ahead of cited status", () => {
    const scored: PublicSourceCitation[] = [
      { videoId: "episode-low", title: "Low confidence cited", sourceMode: "published", score: 0.54 },
      { videoId: "episode-low", title: "Low confidence cited", sourceMode: "published", score: 0.53 },
      { videoId: "episode-high", title: "High confidence candidate", sourceMode: "uncut", score: 0.59 },
    ];

    const model = buildSourcePanelModel({
      sources: scored,
      citedIndices: [1, 2],
      visibleMode: "both",
    });

    expect(model.groups.map((group) => group.key)).toEqual(["episode-high", "episode-low"]);
    expect(model.groups[0].entries.map((entry) => entry.evidenceId)).toEqual(["C1"]);
    expect(model.groups[1].entries.map((entry) => entry.evidenceId)).toEqual(["[1]", "[2]"]);
  });

  it("ranks a higher-scored candidate above a lower-scored citation within an episode", () => {
    const scored: PublicSourceCitation[] = [
      { videoId: "episode0001", title: "Episode one", sourceMode: "published", score: 0.54 },
      { videoId: "episode0001", title: "Episode one", sourceMode: "uncut", score: 0.59 },
    ];

    const model = buildSourcePanelModel({
      sources: scored,
      citedIndices: [1],
      visibleMode: "both",
    });

    expect(model.groups[0].entries.map((entry) => entry.evidenceId)).toEqual(["C1", "[1]"]);
  });

  it("keeps the strongest excerpts visible and collapses the rest behind the overflow", () => {
    const many: PublicSourceCitation[] = Array.from({ length: 9 }, (_, index) => ({
      videoId: `episode${String(index + 1).padStart(4, "0")}`,
      title: `Episode ${index + 1}`,
      sourceMode: "published",
      // Descending scores so the split is deterministic.
      score: 0.9 - index * 0.01,
    }));

    const model = buildSourcePanelModel({ sources: many, citedIndices: [], visibleMode: "both" });

    expect(model.groups).toHaveLength(9);
    expect(model.primaryGroups.map((group) => group.key)).toEqual([
      "episode0001",
      "episode0002",
      "episode0003",
      "episode0004",
      "episode0005",
    ]);
    expect(model.overflowGroups).toHaveLength(4);
    expect(model.overflowEntryCount).toBe(4);
  });

  it("keeps cited excerpts visible and collapses surplus candidates within the same episode", () => {
    // One episode carrying the whole retrieval set — the screenshot case:
    // cited rows plus the top-5 candidates stay, the remaining candidates
    // move behind the "more matches" disclosure.
    const clustered: PublicSourceCitation[] = [
      { videoId: "episode0001", title: "Episode one", sourceMode: "published", score: 0.95 },
      { videoId: "episode0001", title: "Episode one", sourceMode: "uncut", score: 0.93 },
      ...Array.from({ length: 10 }, (_, index) => ({
        videoId: "episode0001",
        title: "Episode one",
        sourceMode: "uncut" as const,
        score: 0.9 - index * 0.01,
      })),
    ];

    const model = buildSourcePanelModel({
      sources: clustered,
      citedIndices: [1, 2],
      visibleMode: "both",
    });

    expect(model.primaryGroups.map((group) => group.key)).toEqual(["episode0001"]);
    const group = model.primaryGroups[0];
    expect(group.citedEntries.map((entry) => entry.evidenceId)).toEqual(["[1]", "[2]"]);
    expect(group.visibleCandidateEntries).toHaveLength(5);
    expect(group.hiddenCandidateEntries).toHaveLength(5);
    expect(model.overflowGroups).toEqual([
      { key: "episode0001", label: "Episode one", entries: group.hiddenCandidateEntries },
    ]);
    expect(model.overflowEntryCount).toBe(5);
  });

  it("hides a candidate-only episode entirely behind the disclosure when nothing ranks", () => {
    const clustered: PublicSourceCitation[] = [
      { videoId: "episode0001", title: "Episode one", sourceMode: "published", score: 0.99 },
      { videoId: "episode0002", title: "Episode two", sourceMode: "published", score: 0.80 },
    ];

    const model = buildSourcePanelModel({
      sources: clustered,
      citedIndices: [],
      visibleMode: "both",
      topN: 1,
    });

    expect(model.primaryGroups.map((group) => group.key)).toEqual(["episode0001"]);
    expect(model.overflowGroups.map((group) => [group.key, group.entries.length])).toEqual([
      ["episode0002", 1],
    ]);
    expect(model.overflowEntryCount).toBe(1);
  });
});

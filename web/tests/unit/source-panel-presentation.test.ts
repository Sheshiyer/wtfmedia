import { describe, expect, it } from "vitest";

import {
  applyResponseSourceMode,
  getCitationPresentation,
  getSourcePanelPresentation,
} from "@/lib/provenance/source-panel-presentation";

describe("Ask WTF source drawer presentation", () => {
  it("never manufactures citation provenance from a both-mode query", () => {
    expect(
      applyResponseSourceMode(
        [
          { videoId: "UKag4LVAEdU", sourceMode: "uncut" },
          { videoId: "SPLFyVyTI1A", sourceMode: "published" },
          { videoId: "_A2gWZvs-qM" },
          { segmentId: "uncut:private-hash" },
          { url: "https://www.youtube.com/watch?v=_A2gWZvs-qM" },
        ],
        "both",
      ).map((source) => source.sourceMode),
    ).toEqual(["uncut", "published", "uncut", "published"]);
  });

  it("treats returned uncut evidence as available without claiming timeline alignment", () => {
    const presentation = getSourcePanelPresentation([
      {
        videoId: "UKag4LVAEdU",
        title: "Uncut source",
        sourceMode: "uncut",
        mappingStatus: "unmapped",
        segmentId: "uncut:asset-hash",
      },
    ], { uncutUnavailable: false });

    expect(presentation.modes).toEqual(["uncut"]);
    expect(presentation.status).toBe(
      "uncut references returned. timestamps appear only when the source provides one.",
    );
  });

  it("renders the authoritative unavailable state only when no uncut evidence returned", () => {
    const presentation = getSourcePanelPresentation([
      { videoId: "SPLFyVyTI1A", sourceMode: "published", mappingStatus: "mapped", timeSec: 125 },
    ], { uncutUnavailable: true });

    expect(presentation.status).toBe(
      "uncut is unavailable for this answer. published references returned.",
    );

    const contradictory = getSourcePanelPresentation([
      { videoId: "UKag4LVAEdU", sourceMode: "uncut", mappingStatus: "unmapped" },
    ], { uncutUnavailable: true });
    expect(contradictory.status).not.toContain("uncut is unavailable");
  });

  it("keeps mixed response modes attached to their individual citations", () => {
    const presentation = getSourcePanelPresentation([
      { videoId: "UKag4LVAEdU", sourceMode: "uncut", mappingStatus: "unmapped" },
      { videoId: "SPLFyVyTI1A", sourceMode: "published", mappingStatus: "mapped", timeSec: 125 },
    ]);

    expect(presentation.modes).toEqual(["published", "uncut"]);
    expect(presentation.status).toBe(
      "published and uncut references returned. timestamps remain source-specific.",
    );
  });

  it("renders a finite published timestamp and deep-link from response evidence", () => {
    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "published",
        mappingStatus: "mapped",
        timeSec: 125,
      }),
    ).toEqual({
      mode: "published",
      timestampLabel: "published 02:05",
      href: "https://www.youtube.com/watch?v=SPLFyVyTI1A&t=125s",
      linkLabel: "open published moment",
    });
  });

  it("renders a confidence-labelled approximate uncut timestamp", () => {
    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "uncut",
        mappingStatus: "mapped",
        timeSec: 125,
        timestampOrigin: "published_alignment",
        timestampConfidence: 0.86,
      }),
    ).toEqual({
      mode: "uncut",
      timestampLabel: "estimated uncut ~02:05 · 86%",
      href: null,
      linkLabel: null,
    });
  });

  it("fails closed for low-confidence or explicitly unmapped timestamps", () => {
    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "uncut",
        mappingStatus: "mapped",
        timeSec: 125,
        timestampOrigin: "published_alignment",
        timestampConfidence: 0.79,
      })?.timestampLabel,
    ).toBe("uncut · timestamp unavailable");

    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "published",
        mappingStatus: "unmapped",
        timeSec: 125,
      }),
    ).toEqual({
      mode: "published",
      timestampLabel: "published · timestamp unavailable",
      href: "https://www.youtube.com/watch?v=SPLFyVyTI1A",
      linkLabel: "open published video",
    });
  });

  it("links an untimed published video without inventing a timestamp", () => {
    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "published",
        mappingStatus: "unmapped",
      }),
    ).toEqual({
      mode: "published",
      timestampLabel: "published · timestamp unavailable",
      href: "https://www.youtube.com/watch?v=SPLFyVyTI1A",
      linkLabel: "open published video",
    });
  });

  it("never turns an uncut reference into a published YouTube destination", () => {
    expect(
      getCitationPresentation({
        videoId: "SPLFyVyTI1A",
        sourceMode: "uncut",
        mappingStatus: "unmapped",
        segmentId: "uncut:asset-hash",
      }),
    ).toEqual({
      mode: "uncut",
      timestampLabel: "uncut · timestamp unavailable",
      href: null,
      linkLabel: null,
    });
  });
});

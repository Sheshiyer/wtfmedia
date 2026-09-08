import { describe, expect, it } from "vitest";

import { parsePublicMomentsHeader } from "@/lib/provenance/public-moment-header";
import { formatClock, momentExportRows } from "@/lib/public/moments-export";

function headerPayload() {
  return {
    moments: [
      {
        video_id: "fL2wyVLX08o",
        title: "Ep 1 — A Guest",
        url: "https://www.youtube.com/watch?v=fL2wyVLX08o",
        start_sec: 300,
        end_sec: 345,
        duration_sec: 45,
        score: 0.9,
        timestamp_confidence: 0.8,
        citation_numbers: [1, 2],
        within_budget: true,
        guest: "A Guest",
        theme: "Love",
        topic: "long distance",
        summary: "They describe keeping a relationship alive apart.",
        why_relevant: "Directly answers the relationship question.",
        strength: 5,
      },
      {
        video_id: "fL2wyVLX08o",
        title: "Ep 1 — A Guest",
        url: "https://www.youtube.com/watch?v=fL2wyVLX08o",
        start_sec: 630,
        end_sec: 705,
        duration_sec: 75,
        score: 0.7,
        timestamp_confidence: 0.8,
        citation_numbers: [3],
        within_budget: false,
      },
    ],
    total_duration_sec: 45,
    budget_sec: 1800,
  };
}

describe("parsePublicMomentsHeader", () => {
  it("parses a URI-encoded payload", () => {
    const payload = parsePublicMomentsHeader(encodeURIComponent(JSON.stringify(headerPayload())));
    expect(payload.moments).toHaveLength(2);
    expect(payload.moments[0].topic).toBe("long distance");
    expect(payload.moments[1].withinBudget).toBe(false);
    expect(payload.totalDurationSec).toBe(45);
    expect(payload.budgetSec).toBe(1800);
  });

  it("fails closed on malformed input", () => {
    expect(parsePublicMomentsHeader(null).moments).toHaveLength(0);
    expect(parsePublicMomentsHeader("not json").moments).toHaveLength(0);
    expect(parsePublicMomentsHeader("%7Bbroken").moments).toHaveLength(0);
  });

  it("drops moments without a video id or start, and bad citation numbers", () => {
    const payload = parsePublicMomentsHeader(JSON.stringify({
      moments: [
        { video_id: "", start_sec: 10 },
        { video_id: "abc123def45", start_sec: "soon" },
        {
          video_id: "abc123def45",
          start_sec: 10,
          citation_numbers: [1, -2, 1.5, "x"],
          strength: 9,
        },
      ],
      total_duration_sec: 0,
      budget_sec: null,
    }));
    expect(payload.moments).toHaveLength(1);
    expect(payload.moments[0].citationNumbers).toEqual([1]);
    expect(payload.moments[0].strength).toBeUndefined();
  });
});

describe("formatClock", () => {
  it("formats mm:ss under an hour, h:mm:ss above, blank for null", () => {
    expect(formatClock(305)).toBe("05:05");
    expect(formatClock(3785)).toBe("1:03:05");
    expect(formatClock(null)).toBe("");
  });
});

describe("momentExportRows", () => {
  it("exports only within-budget moments with sheet columns and deep links", () => {
    const rows = momentExportRows(parsePublicMomentsHeader(JSON.stringify(headerPayload())));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Guest: "A Guest",
      "Name of EP": "Ep 1 — A Guest",
      Start: "05:00",
      End: "05:45",
      Duration: "00:45",
      Topic: "long distance",
      "Strength★": 5,
    });
    expect(rows[0]["Link to EP"]).toBe("https://www.youtube.com/watch?v=fL2wyVLX08o&t=300");
    expect(rows[0]["Clean Cut"]).toBe("");
  });
});

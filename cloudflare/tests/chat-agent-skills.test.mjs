import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  WTF_OS_CONVERSATION_SKILL,
  buildFollowUpGenerationInput,
  parseCitationMarkers,
  parseFollowUpCandidates,
  selectAnswerableFollowUps,
} from "../src/chat/skills/wtf-os-conversation.ts";
import {
  PUBLISHED_YOUTUBE_SKILL,
  publishedTimingMetadata,
} from "../src/chat/skills/published-youtube.ts";
import {
  APPROVED_UNCUT_SKILL,
  uncutTimingMetadata,
} from "../src/chat/skills/approved-uncut.ts";

describe("WTF OS conversation skill", () => {
  test("registers the three focused Alpha runtime skills", () => {
    assert.equal(WTF_OS_CONVERSATION_SKILL.id, "wtf-os-conversation-v1");
    assert.equal(PUBLISHED_YOUTUBE_SKILL.mode, "published");
    assert.equal(APPROVED_UNCUT_SKILL.mode, "uncut");
  });

  test("accepts numeric grouped citations and rejects placeholder markers", () => {
    assert.deepEqual(
      parseCitationMarkers("The evidence supports this [1, 2] and adds context [3].", 3),
      { valid: true, indices: [1, 2, 3] },
    );
    assert.deepEqual(
      parseCitationMarkers("The excerpts do not explicitly solve it [N], but suggest pressure [1].", 3),
      { valid: false, indices: [1] },
    );
    assert.deepEqual(
      parseCitationMarkers("Unsupported source [7].", 3),
      { valid: false, indices: [7] },
    );
  });

  test("builds follow-up input from bounded evidence text rather than titles alone", () => {
    const input = buildFollowUpGenerationInput(
      "What changed?",
      "A grounded answer [1].",
      [{ n: 1, title: "Episode", text: "The guest changed the distribution strategy after a failed launch." }],
    );

    assert.match(input, /EVIDENCE:/);
    assert.match(input, /changed the distribution strategy/);
    assert.match(input, /Every suggestion must be answerable/);
  });

  test("parses unique question candidates and keeps only retrieval-qualified suggestions", async () => {
    const candidates = parseFollowUpCandidates([
      "1. What distribution strategy did the guest adopt?",
      "What distribution strategy did the guest adopt?",
      "- Which city-council policy might work?",
      "This is not a question",
    ].join("\n"));

    assert.deepEqual(candidates, [
      "What distribution strategy did the guest adopt?",
      "Which city-council policy might work?",
    ]);

    const checked = [];
    const selected = await selectAnswerableFollowUps(candidates, async (question) => {
      checked.push(question);
      return question.startsWith("What distribution");
    });
    assert.deepEqual(checked, candidates);
    assert.deepEqual(selected, ["What distribution strategy did the guest adopt?"]);
  });
});

describe("source-native timing skills", () => {
  test("published timing metadata distinguishes sidecar timing from absent timing", () => {
    assert.deepEqual(publishedTimingMetadata(42, true), {
      timestamp_status: "verified",
      timestamp_origin: "published_sidecar",
    });
    assert.deepEqual(publishedTimingMetadata(undefined, false), {
      timestamp_status: "source_timing_unavailable",
      timestamp_origin: "none",
    });
  });

  test("uncut timing metadata keeps sidecar and inline coordinates distinct", () => {
    assert.deepEqual(uncutTimingMetadata(95, "sidecar"), {
      timestamp_status: "verified",
      timestamp_origin: "uncut_sidecar",
    });
    assert.deepEqual(uncutTimingMetadata(95, "inline"), {
      timestamp_status: "verified",
      timestamp_origin: "uncut_inline",
    });
    assert.deepEqual(uncutTimingMetadata(undefined, null), {
      timestamp_status: "source_timing_unavailable",
      timestamp_origin: "none",
    });
  });
});

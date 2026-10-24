import assert from "node:assert/strict";
import { test } from "node:test";
import { standaloneTopic, prioritizeTopicPassages } from "../src/chat/query-topic.ts";
import { resolveEpisodeScopedSources } from "../src/chat/source-mode.ts";

test("an explicit topic remains standalone even with a relative discussion clause", () => {
  for (const question of [
    "tell me about quick commerce that is discussed",
    "What was discussed about quick commerce on the podcast?",
    "Tell me about quick-commerce which was mentioned.",
    "What about quick commerce?",
  ]) assert.match(standaloneTopic(question), /^quick[ -]commerce$/);
  assert.equal(standaloneTopic("Tell me about hospitality that discussed"), "hospitality");
});

test("referential follow-ups still require conversational resolution", () => {
  for (const question of [
    "tell me more about that", "tell me about his company", "What did he say about quick commerce?",
    "What about the same business?", "tell me about everything", "give me all the timestamps",
    "top 10 minutes of this", "tell me about that which was discussed",
    "tell me about the company", "tell me about quick commerce that was discussed by him",
    "tell me about quick commerce that was discussed in the previous episode",
    "tell me about quick commerce on the podcast with her",
  ]) assert.equal(standaloneTopic(question), null, question);
});

test("passage mentions survive the six-citation cap without an episode-diversity penalty", () => {
  const irrelevant = Array.from({ length: 6 }, (_, i) => ({ id: `other:${i}`, score: .95 - i / 100,
    metadata: { video_id: `other00000${i}`, source_mode: "published", title: "A different topic", text: "Synthetic discussion of unrelated travel." } }));
  const relevant = Array.from({ length: 3 }, (_, i) => ({ id: `topic:${i}`, score: .7 - i / 100,
    metadata: { video_id: "example0001", source_mode: "published", title: "A commerce discussion", text: "Synthetic quick-commerce discussion of delivery economics." } }));
  const result = prioritizeTopicPassages([...irrelevant, ...relevant], "quick commerce", .45);
  assert.equal(result.anchored, true);
  const selected = resolveEpisodeScopedSources(result.matches, "published", null, .45, 6, { dedupeByEpisode: !result.anchored });
  assert.deepEqual(selected.citations.slice(0, 3).map(s => s.segmentId), relevant.map(s => s.id));
  assert.equal(result.matches.length, 9, "semantic alternatives are retained, not filtered out");
});

test("topic ranking does not invent anchors from titles, partial words, or below-floor matches", () => {
  const matches = [
    { id: "title", score: .8, metadata: { title: "quick commerce", text: "Nothing on that subject." } },
    { id: "partial", score: .7, metadata: { text: "A quick commercial break." } },
    { id: "weak", score: .1, metadata: { text: "quick commerce" } },
  ];
  const ranked = prioritizeTopicPassages(matches, "quick commerce", .45);
  assert.equal(ranked.anchored, false);
  assert.deepEqual(ranked.matches, matches);
  assert.deepEqual(prioritizeTopicPassages(matches, "astrology", .45).matches, matches);
});

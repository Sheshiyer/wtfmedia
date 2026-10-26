import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/connections/route";
import { topicConnections } from "../../lib/topic-connections";

describe("topic connections", () => {
  it("ships a versioned topic index with cross-episode evidence", () => {
    expect(topicConnections.schemaVersion).toBe("topic-connections.v1");
    expect(topicConnections.topics.length).toBeGreaterThanOrEqual(50);
    expect(topicConnections.edges.length).toBeGreaterThan(0);
    expect(new Set(topicConnections.topics.map((topic) => topic.id)).size).toBe(topicConnections.topics.length);
    for (const topic of topicConnections.topics) {
      expect(topic.episodeCount).toBeGreaterThanOrEqual(3);
      expect(topic.occurrences.length).toBeGreaterThanOrEqual(3);
      expect(topic.episodeCount).toBe(topic.occurrenceCount);
      expect(topic.episodeCount).toBe(topic.occurrences.length);
      expect(topic.anchorPhrases.length).toBeGreaterThan(0);
      expect(new Set(topic.occurrences.map((item) => item.episodeId)).size).toBe(topic.occurrences.length);
    }
  });

  it("exposes only valid native-caption time ranges", () => {
    for (const topic of topicConnections.topics) {
      for (const occurrence of topic.occurrences) {
        expect(occurrence.startSec).toBeGreaterThanOrEqual(0);
        expect(occurrence.endSec).toBeGreaterThan(occurrence.startSec);
        expect(occurrence.url).toBe(
          `https://www.youtube.com/watch?v=${occurrence.episodeId}&t=${occurrence.startSec}s`,
        );
        expect(occurrence.excerpt.length).toBeGreaterThan(40);
        expect(occurrence.connection).toContain(topic.label);
        const normalizedExcerpt = occurrence.excerpt.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        expect(topic.anchorPhrases.some((phrase) => normalizedExcerpt.includes(phrase))).toBe(true);
      }
    }
  });

  it("has valid graph endpoints and shared episode receipts", () => {
    const topicIds = new Set(topicConnections.topics.map((topic) => topic.id));
    const degree = new Map<string, number>();
    for (const edge of topicConnections.edges) {
      expect(topicIds.has(edge.source)).toBe(true);
      expect(topicIds.has(edge.target)).toBe(true);
      expect(edge.sharedEpisodeCount).toBe(edge.sharedEpisodeIds.length);
      expect(edge.sharedEpisodeCount).toBeGreaterThanOrEqual(2);
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    expect(Math.max(...degree.values())).toBeLessThanOrEqual(6);
  });

  it("serves full, filtered, detail, and missing-topic API states", async () => {
    const full = GET(new NextRequest("https://wtfhq.in/api/connections"));
    expect(full.status).toBe(200);
    expect(full.headers.get("x-connections-schema")).toBe("topic-connections.v1");
    const fullBody = await full.json() as typeof topicConnections;
    expect(fullBody.topics).toHaveLength(topicConnections.topics.length);

    const selected = topicConnections.topics.find((topic) => topic.label === "AI Agents") ?? topicConnections.topics[0];
    const filtered = GET(new NextRequest(`https://wtfhq.in/api/connections?q=${encodeURIComponent(selected.label)}&limit=3`));
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json() as typeof topicConnections;
    expect(filteredBody.topics.length).toBeGreaterThan(0);
    expect(filteredBody.topics.length).toBeLessThanOrEqual(3);

    const detail = GET(new NextRequest(`https://wtfhq.in/api/connections?topic=${selected.id}`));
    expect(detail.status).toBe(200);
    expect((await detail.json() as { topic: TopicConnection }).topic.id).toBe(selected.id);

    const missing = GET(new NextRequest("https://wtfhq.in/api/connections?topic=not-a-topic"));
    expect(missing.status).toBe(404);
  });
});

type TopicConnection = (typeof topicConnections.topics)[number];

import { NextRequest } from "next/server";
import {
  topicConnections,
  type TopicConnection,
} from "@/lib/topic-connections";

// OpenNext bundles this route into the Cloudflare Worker server runtime.
export const runtime = "nodejs";

const MAX_QUERY_CHARS = 120;

function searchableText(topic: TopicConnection): string {
  return [
    topic.label,
    topic.category,
    topic.summary,
    ...topic.anchorPhrases,
    ...topic.relatedPhrases,
    ...topic.occurrences.flatMap((occurrence) => [occurrence.title, occurrence.connection]),
  ].join(" ").toLowerCase();
}

function response(body: unknown, status = 200): Response {
  const etag = `W/\"${topicConnections.schemaVersion}:${topicConnections.generatedAt}\"`;
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      ETag: etag,
      "X-Connections-Schema": topicConnections.schemaVersion,
      "X-Connections-Generated-At": topicConnections.generatedAt,
    },
  });
}

export function GET(request: NextRequest): Response {
  const topicId = request.nextUrl.searchParams.get("topic")?.trim() ?? "";
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? topicConnections.topics.length);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(topicConnections.topics.length, Math.floor(rawLimit)))
    : topicConnections.topics.length;

  if (query.length > MAX_QUERY_CHARS) {
    return response({ error: "query_too_long" }, 400);
  }

  if (topicId) {
    const topic = topicConnections.topics.find((candidate) => candidate.id === topicId);
    if (!topic) return response({ error: "topic_not_found" }, 404);
    return response({
      schemaVersion: topicConnections.schemaVersion,
      generatedAt: topicConnections.generatedAt,
      source: topicConnections.source,
      topic,
      edges: topicConnections.edges.filter(
        (edge) => edge.source === topic.id || edge.target === topic.id,
      ),
    });
  }

  const normalizedQuery = query.toLowerCase();
  const topics = topicConnections.topics
    .filter((topic) => !normalizedQuery || searchableText(topic).includes(normalizedQuery))
    .slice(0, limit);
  const visibleIds = new Set(topics.map((topic) => topic.id));

  return response({
    ...topicConnections,
    topics,
    edges: topicConnections.edges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
    ),
  });
}

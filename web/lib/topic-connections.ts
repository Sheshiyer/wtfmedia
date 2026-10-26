import raw from "@/src/data/topic-connections.json";

export type TopicConfidence = "high" | "medium" | "exploratory";

export type TopicOccurrence = {
  episodeId: string;
  title: string;
  startSec: number;
  endSec: number;
  excerpt: string;
  connection: string;
  relevance: number;
  url: string;
};

export type TopicConnection = {
  id: string;
  label: string;
  category: string;
  summary: string;
  episodeCount: number;
  occurrenceCount: number;
  anchorPhrases: string[];
  confidence: TopicConfidence;
  confidenceScore: number;
  relatedPhrases: string[];
  occurrences: TopicOccurrence[];
};

export type TopicEdge = {
  source: string;
  target: string;
  sharedEpisodeCount: number;
  sharedEpisodeIds: string[];
};

export type TopicConnectionsData = {
  schemaVersion: "topic-connections.v1";
  generatedAt: string;
  source: {
    embeddingModel: string;
    transcriptMode: "published";
    episodeCount: number;
    passageCount: number;
    timestampPolicy: "native-caption-alignment-only";
  };
  topics: TopicConnection[];
  edges: TopicEdge[];
};

export const topicConnections = raw as TopicConnectionsData;

import {
  buildVectorQueryOptions,
  extractNamedEntityPhrases,
  parseEpisodeId,
  parseSourceMode,
  prioritizeMatchesForQuestion,
  resolveEpisodeScopedSources,
  type DualSourceCitation,
  type SourceMode,
} from "./source-mode.ts";

export type ChatAnswerEnvironment = {
  AI: any;
  VECTORIZE: any;
};

export type ChatAnswerInput = {
  question: string;
  sourceMode?: unknown;
  episodeId?: unknown;
  requestId?: unknown;
};

export type ChatAnswer = {
  answer: string;
  sources: DualSourceCitation[];
  grounded: boolean;
  sourceMode: SourceMode;
  uncutUnavailable: boolean;
  model: string | null;
  modelFallback: boolean;
  requestId: string;
};

const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const ANSWER_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
const MAX_QUESTION_CHARS = 2_000;
const MIN_SCORE = 0.45;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/u;

const SYSTEM = `You are the WTF Media research assistant. Answer only from the supplied excerpts.
Every factual sentence needs a matching [source] citation. A mention of a person or company does not prove
ownership, employment, authorship, guest status, or any other relationship. Do not infer catalogue-wide counts
from excerpts. If the excerpts do not establish the answer, say so plainly.
When the question names a person, use only excerpts whose title or text contains that named person.
Do not answer from semantically similar excerpts about another guest or episode.`;

function requestId(value: unknown): string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

async function vectorFor(env: ChatAnswerEnvironment, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text });
  const vector = output?.data?.[0] ?? output?.data;
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error("embedding response was not a 1024-dimensional vector");
  }
  return vector;
}

async function answerWithFallback(env: ChatAnswerEnvironment, messages: unknown[]) {
  const failures: string[] = [];
  for (const model of ANSWER_MODELS) {
    try {
      const result = await env.AI.run(model, { messages, max_tokens: 600, temperature: 0.1 });
      const answer = typeof result === "string" ? result : result?.response;
      if (typeof answer !== "string" || !answer.trim()) throw new Error("empty answer response");
      if (failures.length) console.warn("wtfmedia answer model fallback used", { model, failedAttempts: failures.length });
      return { answer, model, fallback: failures.length > 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      failures.push(`${model}:${message}`);
      console.warn("wtfmedia answer model failed", { model, message });
    }
  }
  throw new Error(`answer models unavailable: ${failures.length}`);
}

function citedEvidenceFallback(sources: Array<{ n: number; title: string; text?: string }>) {
  const lines = sources.slice(0, 3).map((source) => {
    const excerpt = String(source.text || "").replace(/\s+/g, " ").trim().slice(0, 260);
    return `[${source.n}] ${source.title}: ${excerpt}${excerpt.length === 260 ? "..." : ""}`;
  });
  return [
    "I found relevant evidence, but the synthesis model did not return valid citations. Here are the closest cited excerpts instead:",
    ...lines,
  ].join("\n\n");
}

function requiresVerifiedMetadata(question: string) {
  return /\b(?:own|owner|owns|ownership|co-?founder|founder|host|producer|created|runs)\b[\s\S]{0,100}\b(?:wtf|podcast|show|channel)\b/i.test(question)
    || /\b(?:recur(?:ring|s)?|repeat(?:s|ed|ing)?|appear(?:s|ances?|ing)?|mentioned|occur(?:s|rence)?|most)\b[\s\S]{0,100}\b(?:\d+\s*\+?\s*(?:episodes?|conversations?)|across|throughout)\b/i.test(question);
}

function insufficientEvidence(resolved: ReturnType<typeof resolveEpisodeScopedSources>, episodeId: string | null) {
  return resolved.uncutUnavailable
    ? episodeId
      ? "No approved uncut evidence is mapped to this episode, and there is not enough published evidence to answer reliably. no timestamp was inferred."
      : "uncut is not activated and there is not enough published YouTube evidence for this question. no timestamp was inferred."
    : episodeId
      ? "I don’t have enough relevant evidence in this episode to answer that reliably."
      : "I don’t have enough relevant evidence in the catalogue to answer that reliably.";
}

export async function runChat(input: ChatAnswerInput, env: ChatAnswerEnvironment): Promise<ChatAnswer> {
  const question = input.question.trim();
  if (!question || question.length > MAX_QUESTION_CHARS) throw new Error("invalid_chat_question");
  const sourceMode = parseSourceMode(input.sourceMode);
  const episodeId = parseEpisodeId(input.episodeId);
  if (input.episodeId !== undefined && episodeId === null) throw new Error("invalid_episode_id");
  const resolvedRequestId = requestId(input.requestId);

  if (requiresVerifiedMetadata(question)) {
    return {
      answer: "I can’t verify catalogue-wide counts or ownership/role claims from transcript search. Try asking what a named guest said about a topic, or ask about a specific episode instead.",
      sources: [], grounded: false, sourceMode, uncutUnavailable: false,
      model: null, modelFallback: false, requestId: resolvedRequestId,
    };
  }

  try {
    const matches = await env.VECTORIZE.query(await vectorFor(env, question), buildVectorQueryOptions(episodeId));
    const relevantMatches = prioritizeMatchesForQuestion(matches.matches ?? [], question);
    const namedEntityQuestion = extractNamedEntityPhrases(question).length > 0;
    const resolved = resolveEpisodeScopedSources(relevantMatches, sourceMode, episodeId, MIN_SCORE, 6, {
      dedupeByEpisode: !namedEntityQuestion,
    });
    const sources = resolved.citations.map((source) => {
      const match = relevantMatches.find((item: { id?: string; metadata?: { video_id?: string } }) => item.id === source.segmentId)
        ?? relevantMatches.find((item: { metadata?: { video_id?: string } }) => item.metadata?.video_id === source.videoId);
      return { ...source, text: match?.metadata?.text };
    });
    if (sources.length < 2) {
      return {
        answer: insufficientEvidence(resolved, episodeId),
        sources: sources.map(({ text: _text, ...source }) => source),
        grounded: false, sourceMode: resolved.sourceMode, uncutUnavailable: resolved.uncutUnavailable,
        model: null, modelFallback: false, requestId: resolvedRequestId,
      };
    }
    const context = sources.map((source: any) => `[${source.n}] ${source.title}\n${source.text}`).join("\n\n---\n\n");
    const answered = await answerWithFallback(env, [
      { role: "system", content: SYSTEM },
      { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
    ]);
    const citations = [...answered.answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    const projectedSources = sources.map(({ text: _text, ...source }) => source);
    if (citations.length === 0 || citations.some((citation) => citation < 1 || citation > sources.length)) {
      console.warn("wtfmedia answer rejected: invalid citations", { sourceCount: sources.length, citations });
      return {
        answer: citedEvidenceFallback(sources), sources: projectedSources, grounded: true,
        sourceMode: resolved.sourceMode, uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model, modelFallback: true, requestId: resolvedRequestId,
      };
    }
    return {
      answer: answered.answer, sources: projectedSources, grounded: true,
      sourceMode: resolved.sourceMode, uncutUnavailable: resolved.uncutUnavailable,
      model: answered.model, modelFallback: answered.fallback, requestId: resolvedRequestId,
    };
  } catch (error) {
    console.error("wtfmedia chat failed", { message: error instanceof Error ? error.message : "unknown", sourceMode });
    throw new Error("retrieval_unavailable");
  }
}

export { vectorFor };

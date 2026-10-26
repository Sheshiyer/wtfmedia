/**
 * Read-only bridge from the authenticated Beta lane to the public Alpha chat
 * contract. Beta deliberately owns identities and private history only; it
 * never receives a corpus, vector index, ingest queue, or transcript bucket.
 */
import { parseSourceMode, type DualSourceCitation, type MappingStatus, type SourceMode } from "./source-mode.ts";
import type { ChatAnswer, ChatAnswerInput } from "./answer.ts";
import { parseCitationMarkers } from "./skills/wtf-os-conversation.ts";

export type AlphaChatService = { fetch(request: Request): Promise<Response> };

export type AlphaGatewayEnvironment = {
  WTFMEDIA_ALPHA_WEB?: AlphaChatService;
};

type RecordValue = Record<string, unknown>;
type PublicMoment = NonNullable<ChatAnswer["moments"]>[number];

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;
const REQUEST_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const MAPPING_STATUSES = new Set<MappingStatus>(["mapped", "unmapped", "unavailable", "conflicted"]);
const TIMESTAMP_STATUSES = new Set(["verified", "source_timing_unavailable", "requested_timeline_unavailable"]);

function record(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function text(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maximum) : null;
}

function seconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function jsonHeader(header: string | null): unknown {
  if (!header) return null;
  try {
    return JSON.parse(decodeURIComponent(header));
  } catch {
    try { return JSON.parse(header); } catch { return null; }
  }
}

function safeUrl(value: unknown, fallback: string): string {
  const candidate = text(value, 500);
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function citation(value: unknown, fallbackMode: SourceMode): DualSourceCitation | null {
  const raw = record(value);
  const videoId = text(raw?.video_id ?? raw?.videoId, 32);
  const n = raw?.n;
  if (!raw || !videoId || !VIDEO_ID.test(videoId) || !Number.isSafeInteger(n) || n <= 0) return null;
  const sourceMode = parseSourceMode(raw.source_mode ?? raw.sourceMode ?? fallbackMode);
  const start = seconds(raw.t ?? raw.start);
  const timestampStatus = text(raw.timestamp_status ?? raw.timestampStatus, 64);
  const hasTimestamp = start !== null && timestampStatus === "verified";
  const mappingStatus = text(raw.mapping_status ?? raw.mappingStatus, 32);
  const segmentId = text(raw.segment_id ?? raw.segmentId, 180);
  const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : 0;
  return {
    n,
    score,
    videoId,
    title: text(raw.title, 240) ?? videoId,
    url: safeUrl(raw.url, sourceMode === "uncut" ? `uncut:${videoId}` : `https://www.youtube.com/watch?v=${videoId}`),
    sourceMode,
    segmentId: segmentId ?? `${videoId}:public-${n}`,
    start: hasTimestamp ? start : null,
    timestamped: hasTimestamp,
    mappingStatus: mappingStatus && MAPPING_STATUSES.has(mappingStatus as MappingStatus)
      ? mappingStatus as MappingStatus
      : hasTimestamp ? "mapped" : "unmapped",
    timestampStatus: timestampStatus && TIMESTAMP_STATUSES.has(timestampStatus)
      ? timestampStatus as DualSourceCitation["timestampStatus"]
      : hasTimestamp ? "verified" : "source_timing_unavailable",
    timestampReason: text(raw.timestamp_reason ?? raw.timestampReason, 500),
  };
}

function moment(value: unknown, sourceNumbers: ReadonlySet<number>): PublicMoment | null {
  const raw = record(value);
  const videoId = text(raw?.video_id ?? raw?.videoId, 32);
  const startSec = seconds(raw?.start_sec ?? raw?.startSec);
  if (!raw || !videoId || !VIDEO_ID.test(videoId) || startSec === null) return null;
  const endSec = seconds(raw.end_sec ?? raw.endSec);
  if (endSec !== null && endSec < startSec) return null;
  const durationSec = seconds(raw.duration_sec ?? raw.durationSec);
  const timestampConfidence = seconds(raw.timestamp_confidence ?? raw.timestampConfidence);
  const strength = Number(raw.strength);
  const citationNumbers = Array.isArray(raw.citation_numbers ?? raw.citationNumbers)
    ? [...new Set((raw.citation_numbers ?? raw.citationNumbers).filter((item): item is number => Number.isSafeInteger(item) && sourceNumbers.has(item)))]
    : [];
  return {
    videoId,
    title: text(raw.title, 240) ?? videoId,
    url: safeUrl(raw.url, `https://www.youtube.com/watch?v=${videoId}`),
    startSec,
    endSec,
    durationSec,
    ...(raw.duration_estimated === true || raw.durationEstimated === true ? { durationEstimated: true } : {}),
    score: seconds(raw.score) ?? 0,
    timestampConfidence,
    citationNumbers,
    withinBudget: raw.within_budget !== false && raw.withinBudget !== false,
    ...(text(raw.guest, 160) ? { guest: text(raw.guest, 160)! } : {}),
    ...(text(raw.theme, 160) ? { theme: text(raw.theme, 160)! } : {}),
    ...(text(raw.topic, 160) ? { topic: text(raw.topic, 160)! } : {}),
    ...(text(raw.summary, 400) ? { summary: text(raw.summary, 400)! } : {}),
    ...(text(raw.why_relevant ?? raw.whyRelevant, 300) ? { whyRelevant: text(raw.why_relevant ?? raw.whyRelevant, 300)! } : {}),
    ...(Number.isInteger(strength) && strength >= 1 && strength <= 5 ? { strength } : {}),
  };
}

function requestId(value: unknown): string {
  return typeof value === "string" && REQUEST_ID.test(value) ? value : crypto.randomUUID();
}

/**
 * Calls Alpha via a Worker service binding. The cross-plane payload is limited
 * to bounded chat turns on Alpha's public request/response contract; Clerk
 * credentials, owner identifiers, and private Beta memory are never sent, and
 * the response is revalidated before persistence.
 */
export async function runAlphaChat(input: ChatAnswerInput, env: AlphaGatewayEnvironment): Promise<ChatAnswer> {
  const service = env.WTFMEDIA_ALPHA_WEB;
  if (!service) throw new Error("alpha_chat_service_unavailable");
  const question = input.question.trim();
  if (!question || question.length > 2_000) throw new Error("invalid_chat_question");
  const sourceMode = parseSourceMode(input.sourceMode);
  const episodeId = input.episodeId === undefined ? undefined : text(input.episodeId, 32);
  if (input.episodeId !== undefined && (!episodeId || !VIDEO_ID.test(episodeId))) {
    throw new Error("invalid_episode_id");
  }
  const history = (input.priorTurns ?? []).slice(-7)
    .filter((turn): turn is { role: "user" | "assistant"; content: string } => Boolean(turn)
      && (turn.role === "user" || turn.role === "assistant")
      && typeof turn.content === "string"
      && turn.content.trim().length > 0)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 2_000) }));
  const resolvedRequestId = requestId(input.requestId);
  const response = await service.fetch(new Request("https://wtfhq.in/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": resolvedRequestId,
    },
    body: JSON.stringify({
      messages: [...history, { role: "user", content: question }],
      sourceMode,
      ...(episodeId ? { episodeId } : {}),
    }),
  }));
  if (!response.ok) throw new Error("alpha_chat_unavailable");
  const answer = (await response.text()).trim();
  if (!answer) throw new Error("alpha_chat_invalid_response");
  const responseMode = parseSourceMode(response.headers.get("x-source-mode") ?? sourceMode);
  const rawSources = jsonHeader(response.headers.get("x-sources"));
  const sources = Array.isArray(rawSources)
    ? rawSources.flatMap((item) => {
      const parsed = citation(item, responseMode);
      return parsed ? [parsed] : [];
    })
    : [];
  const sourceNumbers = new Set(sources.map((source) => source.n));
  const rawMoments = record(jsonHeader(response.headers.get("x-moments")));
  const moments = Array.isArray(rawMoments?.moments)
    ? rawMoments.moments.flatMap((item) => {
      const parsed = moment(item, sourceNumbers);
      return parsed ? [parsed] : [];
    })
    : [];
  const rawCitedIndices = jsonHeader(response.headers.get("x-cited-indices"));
  const parsedMarkers = parseCitationMarkers(answer, sources.length);
  const answerMarkers = new Set(parsedMarkers.indices);
  const declaredCitations = Array.isArray(rawCitedIndices) ? [...new Set(rawCitedIndices)] : [];
  const citationsMatch = parsedMarkers.valid && declaredCitations.length > 0
    && declaredCitations.every((item) => Number.isSafeInteger(item) && sourceNumbers.has(item) && answerMarkers.has(item))
    && [...answerMarkers].every((item) => sourceNumbers.has(item) && declaredCitations.includes(item));
  const citedIndices = citationsMatch
    ? declaredCitations as number[]
    : [];
  const fallback = response.headers.get("x-fallback") === "true";
  return {
    answer,
    sources,
    // A model-fallback response with valid Alpha citations is still grounded;
    // anything malformed, out-of-range, or uncited fails closed instead.
    grounded: sources.length > 0 && citedIndices.length > 0,
    sourceMode: responseMode,
    uncutUnavailable: response.headers.get("x-uncut-unavailable") === "true",
    model: text(response.headers.get("x-model"), 200),
    modelFallback: fallback,
    requestId: resolvedRequestId,
    ...(moments.length ? { moments } : {}),
    ...(rawMoments ? { totalMomentDurationSec: seconds(rawMoments.total_duration_sec ?? rawMoments.totalDurationSec) ?? 0 } : {}),
    ...(rawMoments ? { durationBudgetSec: seconds(rawMoments.budget_sec ?? rawMoments.budgetSec) } : {}),
    ...(citedIndices.length ? { citedIndices } : {}),
  };
}

import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { chatStream, embedQuery, type ChatMessage } from "@/lib/nvidia";
import {
  isTimestampStatus,
  parseSourceMode,
  type SourceMode,
  type TimestampStatus,
} from "@/lib/provenance/source-mode";
import { isReady, search } from "@/lib/vectors";

export const runtime = "nodejs";
export const maxDuration = 30;

const EDGE_SHARED_SECRET = process.env.EDGE_SHARED_SECRET ?? process.env.CLOUDFLARE_EDGE_SHARED_SECRET;
const MAX_MESSAGES = 8;
const MAX_QUESTION_CHARS = 2_000;
const PUBLIC_EPISODE_ID = /^[A-Za-z0-9_-]{11}$/;

async function callAnswerService(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.WTFMEDIA_EDGE) throw new Error("wtfmedia_edge_binding_missing");
  return env.WTFMEDIA_EDGE.fetch(request);
}

type EdgeSource = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  start: number | null;
  timestamped: boolean;
  sourceMode?: SourceMode;
  mappingStatus?: "mapped" | "unmapped" | "unavailable" | "conflicted";
  timestampStatus?: TimestampStatus;
  timestampReason?: string | null;
  segmentId?: string;
};

type ResponseState = "answered_grounded" | "retrieval_weak" | "synthesis_invalid" | "abstained";
type SourceFallbackReason = "requested_mode_insufficient" | "requested_mode_not_competitive";

type EdgeAnswer = {
  answer?: string;
  sources?: EdgeSource[];
  grounded?: boolean;
  sourceMode?: SourceMode;
  requestedSourceMode?: SourceMode;
  evidenceSourceMode?: SourceMode | null;
  fallbackReason?: SourceFallbackReason | null;
  uncutUnavailable?: boolean;
  model?: string;
  modelFallback?: boolean;
  error?: string;
  responseState?: ResponseState;
  citedIndices?: number[];
  followUps?: string[];
  searchQuery?: string;
};

const SOURCE_FALLBACK_REASONS = new Set<SourceFallbackReason>([
  "requested_mode_insufficient",
  "requested_mode_not_competitive",
]);
const RESPONSE_STATES = new Set<ResponseState>([
  "answered_grounded",
  "retrieval_weak",
  "synthesis_invalid",
  "abstained",
]);
const MAPPING_STATUSES = new Set<NonNullable<EdgeSource["mappingStatus"]>>([
  "mapped",
  "unmapped",
  "unavailable",
  "conflicted",
]);

function optionalSourceMode(value: unknown): SourceMode | null {
  return value === "published" || value === "uncut" || value === "both" ? value : null;
}

function publicSourceFallbackReason(value: unknown): SourceFallbackReason | null {
  return typeof value === "string" && SOURCE_FALLBACK_REASONS.has(value as SourceFallbackReason)
    ? value as SourceFallbackReason
    : null;
}

function publicResponseState(value: unknown): ResponseState {
  return typeof value === "string" && RESPONSE_STATES.has(value as ResponseState)
    ? value as ResponseState
    : "answered_grounded";
}

function publicMappingStatus(
  value: unknown,
  fallback: NonNullable<EdgeSource["mappingStatus"]>,
): NonNullable<EdgeSource["mappingStatus"]> {
  return typeof value === "string"
    && MAPPING_STATUSES.has(value as NonNullable<EdgeSource["mappingStatus"]>)
    ? value as NonNullable<EdgeSource["mappingStatus"]>
    : fallback;
}

const PUBLIC_TIMESTAMP_REASONS = new Set([
  "This published transcript was ingested without timestamp data; the link opens the full episode.",
  "This approved uncut transcript has no verified uncut timestamp; no published time was inferred.",
  "A published timestamp is not an uncut timestamp; no cross-timeline time was inferred.",
  "An uncut timestamp is not a published timestamp; no cross-timeline time was inferred.",
]);

function publicTimestampReason(
  source: EdgeSource,
  mode: SourceMode,
  status: TimestampStatus,
): string | null {
  if (status === "verified") return null;
  if (typeof source.timestampReason === "string" && PUBLIC_TIMESTAMP_REASONS.has(source.timestampReason)) {
    return source.timestampReason;
  }
  if (status === "requested_timeline_unavailable") {
    return mode === "uncut"
      ? "An uncut timestamp is not a published timestamp; no cross-timeline time was inferred."
      : "A published timestamp is not an uncut timestamp; no cross-timeline time was inferred.";
  }
  return mode === "uncut"
    ? "This approved uncut transcript has no verified uncut timestamp; no published time was inferred."
    : "This published transcript was ingested without timestamp data; the link opens the full episode.";
}

function sourceHeader(sources: EdgeSource[], sourceMode: SourceMode) {
  return JSON.stringify(sources.map((source) => {
    const mode: Exclude<SourceMode, "both"> = source.sourceMode === "uncut"
      || (source.sourceMode == null && sourceMode === "uncut")
      ? "uncut"
      : "published";
    const candidateStart = sourceMode === "both" || mode === sourceMode ? source.start : null;
    const declaredTimestampStatus = isTimestampStatus(source.timestampStatus)
      ? source.timestampStatus
      : undefined;
    const timestampStatus: TimestampStatus = candidateStart == null
      ? declaredTimestampStatus === "requested_timeline_unavailable"
        ? "requested_timeline_unavailable"
        : "source_timing_unavailable"
      : declaredTimestampStatus === "source_timing_unavailable"
        || declaredTimestampStatus === "requested_timeline_unavailable"
        ? declaredTimestampStatus
        : "verified";
    const start = timestampStatus === "verified" ? candidateStart : null;
    const direct = mode === "uncut"
      ? (typeof source.url === "string" && (source.url.startsWith("uncut:") || isApprovedFrameIoUrl(source.url))
        ? source.url
        : `uncut:${source.videoId}`)
      : source.url;
    const publicUncutUrl = mode === "uncut" && isApprovedFrameIoUrl(direct) ? direct : undefined;
    return {
      n: source.n,
      video_id: source.videoId,
      title: source.title,
      score: source.score,
      t: start,
      time: start == null ? "" : new Date(start * 1_000).toISOString().slice(11, 19).replace(/^00:/, ""),
      url: mode === "uncut" ? publicUncutUrl : direct,
      source_mode: mode,
      mapping_status: publicMappingStatus(
        source.mappingStatus,
        start == null ? "unmapped" : "mapped",
      ),
      timestamp_status: timestampStatus,
      timestamp_reason: publicTimestampReason(source, mode, timestampStatus),
      segment_id: source.segmentId ?? (mode === "uncut" ? `uncut:${source.videoId}` : null),
    };
  }));
}

function isApprovedFrameIoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHost = hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io");
    return parsed.protocol === "https:" && allowedHost;
  } catch {
    return false;
  }
}

/** Local-only RAG path for `next dev`; production remains Cloudflare-only. */
async function localAnswer(question: string, sourceMode: SourceMode, episodeId: string | null): Promise<Response> {
  if (!isReady()) return Response.json({ error: "local_catalogue_unavailable" }, { status: 503 });
  if (sourceMode === "uncut") {
    return new Response("uncut is unavailable in local mode; switch to published.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": encodeURIComponent("[]"),
        "X-Requested-Source-Mode": "uncut",
        "X-Evidence-Source-Mode": "none",
        "X-Source-Mode": "uncut",
        "X-Source-Fallback-Reason": "requested_mode_insufficient",
        "X-Uncut-Unavailable": "true",
        "X-Model": "nvidia-local",
        "X-Fallback": "true",
      },
    });
  }
  const hits = search(await embedQuery(question), episodeId ? 48 : 6)
    .filter((hit) => episodeId == null || hit.video_id === episodeId)
    .slice(0, 6);
  if (hits.length === 0) return Response.json({ error: "local_catalogue_unavailable" }, { status: 503 });
  const sources: EdgeSource[] = hits.map((hit, index) => ({
    n: index + 1,
    score: hit.score,
    videoId: hit.video_id,
    title: hit.title,
    url: `https://www.youtube.com/watch?v=${hit.video_id}`,
    start: hit.start ?? null,
    timestamped: hit.start != null,
    sourceMode: "published",
    mappingStatus: hit.start == null ? "unmapped" : "mapped",
    segmentId: `local:${hit.video_id}:${hit.chunk_idx}`,
  }));
  const context = hits.map((hit, index) => `[${index + 1}] ${hit.title}\n${hit.text}`).join("\n\n---\n\n");
  const stream = await chatStream([
    { role: "system", content: "Answer only from the supplied transcript excerpts. Cite every factual sentence with [1], [2], etc. If the excerpts do not answer the question, say so plainly." },
    { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
  ], { maxTokens: 600, temperature: 0.1 });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(sourceHeader(sources, "published")),
      "X-Requested-Source-Mode": sourceMode,
      "X-Evidence-Source-Mode": "published",
      "X-Source-Mode": "published",
      ...(sourceMode === "both"
        ? { "X-Source-Fallback-Reason": "requested_mode_insufficient" }
        : {}),
      "X-Uncut-Unavailable": sourceMode === "both" ? "true" : "false",
      "X-Model": "nvidia-local",
      "X-Fallback": "false",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[]; sourceMode?: unknown; episodeId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last?.content?.trim()) return new Response("no user message", { status: 400 });
  if (last.content.length > MAX_QUESTION_CHARS) return new Response("question too long", { status: 400 });
  const sourceMode = parseSourceMode(body.sourceMode);
  const episodeId = typeof body.episodeId === "string" && PUBLIC_EPISODE_ID.test(body.episodeId.trim())
    ? body.episodeId.trim()
    : null;
  if (body.episodeId !== undefined && episodeId === null) {
    return new Response("invalid episode id", { status: 400 });
  }
  if (!EDGE_SHARED_SECRET) {
    if (process.env.NODE_ENV !== "production" && process.env.NVIDIA_API_KEY) {
      try { return await localAnswer(last.content, sourceMode, episodeId); }
      catch (error) {
        console.error("local NVIDIA RAG failed", error instanceof Error ? error.message : "unknown");
        return Response.json({ error: "local_answer_unavailable" }, { status: 503 });
      }
    }
    return Response.json({ error: "The answer service is not configured." }, { status: 503 });
  }

  let edge: Response;
  try {
    edge = await callAnswerService(new Request("https://wtfmedia-edge.internal/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edge-Secret": EDGE_SHARED_SECRET,
        "X-Client-IP": req.headers.get("cf-connecting-ip")?.trim() || "unknown",
        "X-Request-ID": crypto.randomUUID(),
      },
      body: JSON.stringify({
        question: last.content,
        sourceMode,
        ...(episodeId ? { episodeId } : {}),
        history: messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    }));
  } catch (error) {
    console.error("wtfmedia web chat transport failed", {
      message: error instanceof Error ? error.message : "unknown",
      sourceMode,
    });
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }

  const result = await edge.json().catch(() => undefined) as EdgeAnswer | undefined;
  if (!edge.ok || !result || typeof result.answer !== "string") {
    console.error("wtfmedia web chat rejected edge response", {
      status: edge.status,
      edgeError: result?.error ?? "invalid_body",
      sourceMode,
    });
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const responseMode = parseSourceMode(result.sourceMode ?? sourceMode);
  const requestedMode = optionalSourceMode(result.requestedSourceMode) ?? sourceMode;
  const evidenceMode = result.evidenceSourceMode === null
    ? null
    : optionalSourceMode(result.evidenceSourceMode) ?? (sources.length > 0 ? responseMode : null);
  const fallbackReason = publicSourceFallbackReason(result.fallbackReason);
  const uncutUnavailable = fallbackReason === "requested_mode_not_competitive"
    ? false
    : result.uncutUnavailable === true;
  const citedIndices = Array.isArray(result.citedIndices) ? result.citedIndices : [];
  const followUps = Array.isArray(result.followUps) ? result.followUps.filter((f): f is string => typeof f === "string") : [];
  return new Response(result.answer, {
    status: edge.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(sourceHeader(sources, responseMode)),
      "X-Requested-Source-Mode": requestedMode,
      "X-Evidence-Source-Mode": evidenceMode ?? "none",
      "X-Source-Mode": responseMode,
      ...(fallbackReason ? { "X-Source-Fallback-Reason": fallbackReason } : {}),
      "X-Uncut-Unavailable": uncutUnavailable ? "true" : "false",
      "X-Model": result.model ?? "cloudflare/llama-3.3-70b-instruct",
      "X-Fallback": result.grounded && !result.modelFallback ? "false" : "true",
      "X-Response-State": publicResponseState(result.responseState),
      "X-Cited-Indices": JSON.stringify(citedIndices),
      ...(followUps.length > 0 ? { "X-Follow-Ups": JSON.stringify(followUps) } : {}),
      "Cache-Control": "no-store",
    },
  });
}

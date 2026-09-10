import {
  getOperatorByEmail,
  listOperators,
  createOperator,
  updateOperatorRole,
  deactivateOperator,
  reactivateOperator,
  logAuditEvent,
  queryAuditEvents,
  getSetting,
  setSetting,
  type Operator,
  type AuditAction,
  type DB,
} from "./db.ts";
import { handleOpsRequest, type OpsEnv } from "./ops-router.ts";
import { handleMemberRequest } from "./member-router.ts";
import { createRemoteClerkVerifier } from "./auth/clerk.ts";
import { allowCalendarRequest, handleCalendarRequest } from "./calendar.ts";
import {
  applyUncutClockOffset,
  queryCounterpartMatches,
  dropUncutOnlyEpisodes,
  findSingleTimelineGaps,
  parseEpisodeId,
  parseSourceMode,
  parseUncutClockOffset,
  pickProjectableCounterpart,
  withRestoredDualMode,
  prioritizeMatchesForQuestionWithAnchor,
  resolveEpisodeScopedSources,
  filterAndProjectMatches,
  timestampConfidenceFor,
  UNCUT_OFFSET_KEY_PREFIX,
} from "./chat/source-mode.ts";
import { queryEvidenceSourcesForQuestion } from "./chat/evidence-coordinator.ts";
import {
  applyDurationBudget,
  buildMomentEnrichmentInput,
  buildMoments,
  MOMENT_ENRICHMENT_PROMPT,
  parseDurationBudget,
  parseMomentEnrichment,
  resolveMomentEnds,
  type EnrichedMoment,
  type Moment,
  type MomentEnrichment,
} from "./chat/moments.ts";
import {
  WTF_OS_CONVERSATION_SKILL,
  buildFollowUpGenerationInput,
  parseCitationMarkers,
  parseFollowUpCandidates,
  selectAnswerableFollowUps,
} from "./chat/skills/wtf-os-conversation.ts";
import {
  admitTranscriptJobs,
  type TranscriptJob,
} from "./catalogue/job-admission.ts";
import { ingestTranscriptJob } from "./catalogue/transcript-ingest.ts";

export interface Env extends OpsEnv {
  AI: any;
  VECTORIZE: any;
  WTFMEDIA_STATE: any;
  CATALOGUE: any;
  INGEST_QUEUE: any;
  DB: DB;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_PER_MINUTE: string;
  INGEST_TOKEN: string;
  EDGE_SHARED_SECRET: string;
  CALENDAR_READ_RATE_LIMIT_PER_MINUTE?: string;
  CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_API_KEY_2?: string;
  OPENROUTER_ANSWER_MODEL?: string;
}

const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const DEFAULT_OPENROUTER_ANSWER_MODEL = "google/gemini-3.5-flash";
const ANSWER_MODELS = [
  "@cf/zai-org/glm-5.3-flash",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
const FAST_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
// Models a visitor may force for a "retry with model" regeneration. All are
// served through OpenRouter; the allowlist keeps arbitrary (expensive) model
// strings out of a public, rate-limited endpoint.
const RETRYABLE_OPENROUTER_MODELS = new Set([
  "google/gemini-3.5-flash",
  "openai/gpt-5",
  "poolside/laguna-s-2.1",
  "thinkingmachines/inkling",
]);
const MAX_BODY_BYTES = 16_000;
const MAX_QUESTION_CHARS = 2_000;
const MAX_HISTORY_TURNS = 6;
const MIN_SCORE = 0.45;
// Wide retrieval slice for moments: distinct from the answer's 6-source
// citation cap — the sheet view keeps multiple passages per episode.
const MOMENT_CHUNK_LIMIT = 48;
// Bound on moments shipped in the response header after merging/budgeting,
// so the enrichment call and the X-Moments header stay sized sanely.
const MAX_MOMENTS = 25;
type HistoryTurn = { role: "user" | "assistant"; content: string };

function cors(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  return origin === env.ALLOWED_ORIGIN
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};
}

function reply(request: Request, env: Env, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...cors(request, env), "Cache-Control": "no-store", "X-Request-ID": request.headers.get("X-Request-ID") || crypto.randomUUID() },
  });
}

async function vectorFor(env: Env, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text });
  const vector = output?.data?.[0] ?? output?.data;
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error("embedding response was not a 1024-dimensional vector");
  }
  return vector;
}

// glm-5.3-flash returns the OpenAI chat-completions shape (choices[0].message.content)
// while the llama models return { response } — accept both.
function extractAnswerText(result: any): string {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: any) => (typeof part?.text === "string" ? part.text : "")).join("");
  }
  return "";
}

async function answerWithWorkersAi(env: Env, model: string, messages: unknown[]) {
  const params: Record<string, unknown> = { messages, max_tokens: 900, temperature: 0.1 };
  // glm-5.3-flash is a reasoning model; low effort keeps hidden reasoning from
  // eating the completion budget and adding latency.
  if (model.includes("glm")) params.reasoning_effort = "low";
  const result = await env.AI.run(model, params);
  const answer = extractAnswerText(result);
  if (!answer.trim()) throw new Error("empty answer response");
  return { answer, model };
}

async function openRouterCompletion(apiKey: string, model: string, messages: unknown[]) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://wtfhq.in",
      "X-Title": "Ask WTF",
    },
    body: JSON.stringify({
      model,
      messages,
      // Reasoning models (gpt-5, inkling) burn hidden reasoning tokens against
      // this cap — 900 starved them into empty answers.
      max_tokens: 3000,
      temperature: 0.1,
      // Keep thinking at the floor; gpt-5 cannot fully disable reasoning.
      reasoning: { effort: "low" },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    const error = new Error(`openrouter ${response.status}: ${detail}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }
  const payload: any = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const answer = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => (typeof part?.text === "string" ? part.text : "")).join("")
      : "";
  if (!answer.trim()) throw new Error("empty openrouter answer response");
  return { answer, model };
}

// Key rotation: the primary key is tried first; only an auth/credit failure
// (401/402/403 — the key itself failing) falls through to the backup key.
// Transient upstream errors do not, so a model outage never masquerades as a
// key failure.
const OPENROUTER_KEY_FALLBACK_STATUSES = new Set([401, 402, 403]);

export async function answerWithOpenRouter(env: Env, messages: unknown[], modelOverride?: string) {
  const keys = [env.OPENROUTER_API_KEY, env.OPENROUTER_API_KEY_2].filter(
    (key): key is string => typeof key === "string" && key.length > 0,
  );
  if (keys.length === 0) throw new Error("openrouter api key not configured");
  const model = modelOverride || env.OPENROUTER_ANSWER_MODEL || DEFAULT_OPENROUTER_ANSWER_MODEL;
  let lastError: Error | null = null;
  for (const [index, key] of keys.entries()) {
    try {
      return await openRouterCompletion(key, model, messages);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("openrouter request failed");
      const status = (lastError as { status?: number }).status;
      const hasBackupKey = index < keys.length - 1;
      if (!hasBackupKey || status == null || !OPENROUTER_KEY_FALLBACK_STATUSES.has(status)) {
        throw lastError;
      }
      console.warn("wtfmedia openrouter primary key rejected, trying backup key", { status });
    }
  }
  throw lastError ?? new Error("openrouter request failed");
}

async function answerWithFallback(env: Env, messages: unknown[], forcedOpenRouterModel?: string) {
  const failures: string[] = [];
  // Primary stays on Workers AI; OpenRouter (Gemini) is the mid-chain fallback,
  // with the small Workers AI model as the final resort. A user-picked retry
  // model jumps the queue when present.
  const providers: Array<() => Promise<{ answer: string; model: string }>> = [];
  if (forcedOpenRouterModel) {
    providers.push(() => answerWithOpenRouter(env, messages, forcedOpenRouterModel));
  }
  providers.push(() => answerWithWorkersAi(env, ANSWER_MODELS[0], messages));
  const defaultOpenRouterModel = env.OPENROUTER_ANSWER_MODEL || DEFAULT_OPENROUTER_ANSWER_MODEL;
  if (forcedOpenRouterModel !== defaultOpenRouterModel) {
    providers.push(() => answerWithOpenRouter(env, messages));
  }
  providers.push(() => answerWithWorkersAi(env, ANSWER_MODELS[1], messages));
  for (const provider of providers) {
    try {
      const { answer, model } = await provider();
      if (failures.length) console.warn("wtfmedia answer model fallback used", { model, failedAttempts: failures.length });
      return { answer, model, fallback: failures.length > 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      failures.push(message);
      console.warn("wtfmedia answer model failed", { message });
    }
  }
  throw new Error(`answer models unavailable: ${failures.length}`);
}

function citedEvidenceFallback(sources: Array<{ n: number; title: string; text?: string }>) {
  const lines = sources.slice(0, 3).map((source) => {
    const excerpt = String(source.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260);
    return `[${source.n}] ${source.title}: ${excerpt}${excerpt.length === 260 ? "..." : ""}`;
  });
  return [
    "I found relevant evidence, but the synthesis model did not return valid citations. Here are the closest cited excerpts instead:",
    ...lines,
  ].join("\n\n");
}

async function rateLimit(request: Request, env: Env) {
  const ip = request.headers.get("X-Client-IP") || request.headers.get("CF-Connecting-IP") || "unknown";
  const window = Math.floor(Date.now() / 60_000);
  const key = `rate:${window}:${ip}`;
  const seen = Number((await env.WTFMEDIA_STATE.get(key)) || "0");
  if (seen >= Number(env.RATE_LIMIT_PER_MINUTE || 20)) return false;
  await env.WTFMEDIA_STATE.put(key, String(seen + 1), { expirationTtl: 120 });
  return true;
}

function parseHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is { role: string; content: string } =>
      t && typeof t.role === "string" && typeof t.content === "string"
      && (t.role === "user" || t.role === "assistant"),
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role as "user" | "assistant", content: t.content.slice(0, 400) }));
}

function historyContext(history: HistoryTurn[]): string {
  if (history.length === 0) return "";
  return history.map((t) => `${t.role}: ${t.content}`).join("\n");
}

const NEEDS_REFORMULATION = /\b(that|this|those|these|it|they|them|he|she|his|her|the same|more about|else|also|another|previous|earlier|above|you said|you mentioned|what about|how about|and what|tell me more|go deeper|expand|elaborate)\b/i;

// Users naturally address the show by its host ("What does Nikhil Kamath say about X?").
// His name sits in nearly every episode title, so these questions really ask what the
// show's episodes say about X — phrased as the host's own speech, the synthesis model
// abstains even when an episode answers the substance. Normalize to the show-level
// question; attribution rules in the conversation skill still name the actual speaker.
function normalizeHostAttribution(question: string): string {
  return question.replace(
    /\bwhat\s+(?:does|did|do)\s+(?:nikhil\s+kamath|nikhil|kamath|the\s+host)\s+(?:say|said|think|believe|claim)s?\s+(?:about\s+)?/i,
    "what was said on the podcast about ",
  );
}

async function reformulateQuery(env: Env, question: string, history: HistoryTurn[]): Promise<string> {
  if (history.length === 0 || !NEEDS_REFORMULATION.test(question)) return question;
  const ctx = history.slice(-4).map((t) => `${t.role}: ${t.content.slice(0, 200)}`).join("\n");
  try {
    const result = await env.AI.run(FAST_MODEL, {
      messages: [
        { role: "system", content: "Rewrite the follow-up question as a standalone search query. Resolve pronouns and references using the conversation. Output ONLY the rewritten query, nothing else. Keep it under 60 words." },
        { role: "user", content: `CONVERSATION:\n${ctx}\n\nFOLLOW-UP: ${question}` },
      ],
      max_tokens: 80,
      temperature: 0,
    });
    const text = typeof result === "string" ? result : result?.response;
    return (typeof text === "string" && text.trim().length > 5) ? text.trim() : question;
  } catch {
    return question;
  }
}

async function resolveSearchQuery(env: Env, question: string, history: HistoryTurn[]): Promise<string> {
  if (parseDurationBudget(question) != null && NEEDS_REFORMULATION.test(question)) {
    const priorStandalone = [...history].reverse().find(
      (t) => t.role === "user" && !NEEDS_REFORMULATION.test(t.content),
    );
    if (priorStandalone) return priorStandalone.content;
  }
  return reformulateQuery(env, question, history);
}

async function retrieveSourcesForQuery(
  env: Env,
  searchQuery: string,
  sourceMode: ReturnType<typeof parseSourceMode>,
  episodeId: string | null,
) {
  const vector = await vectorFor(env, searchQuery);
  const queried = await queryEvidenceSourcesForQuestion(
    env.DB,
    env.VECTORIZE,
    vector,
    searchQuery,
    sourceMode,
    episodeId,
  );
  const prioritized = prioritizeMatchesForQuestionWithAnchor(queried.matches, searchQuery);
  const dedupeByEpisode = queried.episodeId == null && !prioritized.anchored;
  // Both mode is episode-paired; let every episode above the score floor show
  // both timelines instead of capping at three episodes. The floor and the
  // per-mode retrieval window are the real bounds, not a chunk count.
  const chunkLimit = sourceMode === "both" ? 40 : 6;
  let resolved = resolveEpisodeScopedSources(prioritized.matches, sourceMode, queried.episodeId, MIN_SCORE, chunkLimit, {
    dedupeByEpisode,
  });
  let sources = resolved.citations.map((source) => {
    const match = prioritized.matches.find((item: { id?: unknown }) => String(item.id ?? "") === source.segmentId)
      ?? prioritized.matches.find((item: { metadata?: { video_id?: unknown } }) => item.metadata?.video_id === source.videoId);
    return { ...source, text: match?.metadata?.text };
  });

  // In "both" mode an episode must never render with a single timeline when
  // the other timeline is ingested. The per-mode retrieval window can exclude
  // a weakly scoring counterpart, so backfill each gap with a targeted
  // per-episode query and insert it next to its pair.
  if (sourceMode === "both" && queried.episodeId == null && sources.length > 0) {
    const gaps = findSingleTimelineGaps(resolved.citations);
    if (gaps.length > 0) {
      const backfilled = await Promise.all(gaps.map(async ({ videoId, missing }) => {
        try {
          const matches = await queryCounterpartMatches(env.VECTORIZE, vector, videoId, missing);
          const candidates = matches.filter(
            (match: { metadata?: Record<string, unknown> | null }) => match?.metadata,
          );
          if (candidates.length === 0) return null;
          const anchorText = sources.find((source) => source.videoId === videoId)?.text;
          const picked = pickProjectableCounterpart(
            typeof anchorText === "string" && anchorText.length > 0 ? anchorText : null,
            candidates,
            "both",
            0,
          );
          if (!picked) return null;
          return {
            ...picked.citation,
            text: typeof picked.match.metadata?.text === "string" ? picked.match.metadata.text : undefined,
          };
        } catch (error) {
          console.warn("wtfmedia counterpart backfill failed", {
            videoId,
            missing,
            error: error instanceof Error ? error.message : "unknown",
          });
          return null;
        }
      }));
      const counterpartByEpisode = new Map(
        backfilled
          .filter((citation): citation is NonNullable<typeof citation> => citation != null)
          .map((citation) => [citation.videoId, citation]),
      );
      if (counterpartByEpisode.size > 0) {
        const merged: typeof sources = [];
        for (const source of sources) {
          merged.push(source);
          const counterpart = counterpartByEpisode.get(source.videoId);
          if (counterpart) {
            merged.push(counterpart);
            counterpartByEpisode.delete(source.videoId);
          }
        }
        for (const leftover of counterpartByEpisode.values()) merged.push(leftover);
        sources = merged.map((source, index) => ({ ...source, n: index + 1 }));
      }
    }
  }

  // Published is the floor: an episode that can only show an uncut excerpt
  // is dropped rather than rendered single-timeline, then the response mode
  // label is aligned with whatever evidence survived.
  if (sourceMode === "both" && queried.episodeId == null && sources.length > 0) {
    const publishedFloor = dropUncutOnlyEpisodes(sources);
    if (publishedFloor.length !== sources.length) {
      sources = publishedFloor.map((source, index) => ({ ...source, n: index + 1 }));
    }
    resolved = withRestoredDualMode(resolved, sources);
  }

  // Some uncut transcripts were ingested on a different clock than the
  // published cut (pre-roll, cold opens). The alignment job stores a measured
  // per-episode offset in KV; shift verified uncut citations onto the
  // published clock so the pair shows the same moment within seconds, and
  // stamp every citation with a timestamp confidence for the public badge.
  const offsetVideoIds = [
    ...new Set(
      sources
        .filter((source) => source.sourceMode === "uncut")
        .map((source) => source.videoId),
    ),
  ];
  const offsets = new Map(
    await Promise.all(
      offsetVideoIds.map(async (videoId) => {
        try {
          const raw = await env.WTFMEDIA_STATE.get(`${UNCUT_OFFSET_KEY_PREFIX}${videoId}`);
          return [videoId, parseUncutClockOffset(raw)] as const;
        } catch (error) {
          console.warn("wtfmedia uncut offset lookup failed", {
            videoId,
            error: error instanceof Error ? error.message : "unknown",
          });
          return [videoId, null] as const;
        }
      }),
    ),
  );
  sources = sources.map((source) => {
    const offset = offsets.get(source.videoId) ?? null;
    const corrected = applyUncutClockOffset(source, offset);
    return { ...corrected, timestampConfidence: timestampConfidenceFor(corrected, offset) };
  });

  // Moments need a wider window than the answer's citation list: the answer
  // caps at 6 deduped episodes, but the editor sheet wants every relevant
  // passage — multiple chunks per episode, no episode dedupe. Same ranking,
  // same score floor, just a bigger slice of the matches already retrieved.
  // Uncut chunks only form moments when the evidence is uncut-mode; otherwise
  // published is the floor (its YouTube timestamps are what the sheet links).
  const momentMode = resolved.sourceMode === "uncut" ? "uncut" : "published";
  const momentSources = filterAndProjectMatches(
    prioritized.matches,
    momentMode,
    MIN_SCORE,
    MOMENT_CHUNK_LIMIT,
    false,
  ).map((source) => {
    const match = prioritized.matches.find((item: { id?: unknown }) => String(item.id ?? "") === source.segmentId);
    return { ...source, text: match?.metadata?.text as string | undefined };
  });

  return { resolved, sources, momentSources, episodeId: queried.episodeId };
}

async function generateFollowUps(
  env: Env,
  question: string,
  answer: string,
  sources: Array<{ n: number; title: string; text?: string }>,
  sourceMode: ReturnType<typeof parseSourceMode>,
  episodeId: string | null,
): Promise<string[]> {
  try {
    const result = await env.AI.run(FAST_MODEL, {
      messages: [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.followUpPrompt },
        { role: "user", content: buildFollowUpGenerationInput(question, answer, sources) },
      ],
      max_tokens: 220,
      temperature: 0.2,
    });
    const text = typeof result === "string" ? result : result?.response;
    if (typeof text !== "string") return [];
    const normalizedQuestion = question.toLocaleLowerCase("en-US");
    const candidates = parseFollowUpCandidates(text).filter(
      (candidate) => candidate.toLocaleLowerCase("en-US") !== normalizedQuestion,
    );
    return selectAnswerableFollowUps(candidates, async (candidate) => {
      if (requiresVerifiedMetadata(candidate)) return false;
      const validation = await retrieveSourcesForQuery(env, candidate, sourceMode, episodeId);
      return validation.sources.length >= 2;
    });
  } catch {
    return [];
  }
}

function requiresVerifiedMetadata(question: string) {
  return /\b(?:own|owner|owns|ownership|co-?founder|founder|host|producer|created|runs)\b[\s\S]{0,100}\b(?:wtf|podcast|show|channel)\b/i.test(question)
    || /\b(?:recur(?:ring|s)?|repeat(?:s|ed|ing)?|appear(?:s|ances?|ing)?|mentioned|occur(?:s|rence)?|most)\b[\s\S]{0,100}\b(?:\d+\s*\+?\s*(?:episodes?|conversations?)|across|throughout)\b/i.test(question);
}

/**
 * Editor-sheet moments: merge adjacent chunks into start–end ranges, fill
 * durations from the next chunk's start, apply any duration budget in the
 * question, then label each moment (theme/topic/summary/why/strength) with
 * one fast-model call. Every step degrades independently — a failure anywhere
 * still returns moments with timestamps, never blocks the answer.
 */
async function momentsForAnswer(
  env: Env,
  question: string,
  sources: Array<{ n: number; videoId: string; title: string; url: string; score: number; start: number | null; segmentId?: string; text?: string; timestampConfidence?: number | null }>,
): Promise<{ moments: EnrichedMoment[]; totalDurationSec: number; budgetSec: number | null }> {
  let moments: Moment[] = buildMoments(sources);
  if (moments.length === 0) return { moments: [], totalDurationSec: 0, budgetSec: null };
  // Score-ordered cap before end resolution keeps the getByIds lookups, the
  // enrichment call, and the response header bounded on broad queries.
  moments = moments.slice(0, MAX_MOMENTS);
  moments = await resolveMomentEnds(env.VECTORIZE, moments);
  const budgetSec = parseDurationBudget(question);
  // Strength only exists after enrichment, so with a budget in play enrich
  // the whole candidate pool first and cut by strength after — otherwise the
  // score-greedy cut fills the reel with ★2 moments while ★4s sit outside.
  const budgeted = budgetSec == null
    ? applyDurationBudget(moments, null)
    : { moments, totalDurationSec: 0, budgetSec };
  const visible = budgetSec == null
    ? budgeted.moments.filter((moment) => moment.withinBudget)
    : moments;
  if (visible.length === 0) {
    return { moments: budgeted.moments, totalDurationSec: budgeted.totalDurationSec, budgetSec };
  }
  // Enrich in parallel batches: one 25-moment call truncates near the token
  // cap and silently leaves the tail unlabeled. A failed batch only leaves
  // its own moments unlabeled. Strict mode (single-moment retries) forbids
  // empty text fields — the excerpt always supports a conservative label,
  // and the sheet must not ship blank columns.
  const enrichBatch = async (batch: Moment[], strict = false): Promise<MomentEnrichment[]> => {
    const suffix = strict
      ? `There is 1 MOMENT. Output exactly 1 JSON object labeling it. Every text field (guest, theme, topic, summary, whyRelevant) is REQUIRED — never output empty strings; infer conservatively from the excerpt and episode title.`
      : `There are ${batch.length} MOMENTs. Output exactly ${batch.length} JSON objects, one per MOMENT, in order — use empty strings when a text field cannot be honest, but never skip a MOMENT and never default strength.`;
    try {
      const result = await env.AI.run(FAST_MODEL, {
        messages: [
          { role: "system", content: MOMENT_ENRICHMENT_PROMPT },
          // The model silently skips moments it can't label unless the exact
          // object count is demanded — a short count costs the tail slots.
          { role: "user", content: `${buildMomentEnrichmentInput(question, batch)}\n\n${suffix}` },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });
      const text = extractAnswerText(result);
      if (!text.trim()) throw new Error("empty moment enrichment");
      return parseMomentEnrichment(text, batch.length);
    } catch (error) {
      console.warn("wtfmedia moment enrichment failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return batch.map(() => ({}));
    }
  };
  const ENRICH_BATCH = 10;
  const batches = Array.from({ length: Math.ceil(visible.length / ENRICH_BATCH) }, (_, index) =>
    visible.slice(index * ENRICH_BATCH, (index + 1) * ENRICH_BATCH));
  const settled = await Promise.all(batches.map((batch) => enrichBatch(batch)));
  const enrichments = visible.map((_, index) =>
    settled[Math.floor(index / ENRICH_BATCH)]?.[index % ENRICH_BATCH] ?? {});
  // Retry pass: ANY blank text field shows up as an empty column in the
  // sheet, so partially-labeled moments retry too — not just fully empty
  // ones. Single-moment strict calls are tiny and can't truncate; fields the
  // batch already found survive the merge. Two rounds: the fast model
  // occasionally ignores the no-empty-fields rule once, almost never twice.
  const incomplete = () => enrichments
    .map((enrichment, index) =>
      (!enrichment.guest || !enrichment.theme || !enrichment.topic || !enrichment.summary || !enrichment.whyRelevant)
        ? index
        : -1)
    .filter((index) => index !== -1);
  for (let round = 0; round < 2; round += 1) {
    const missingIndices = incomplete();
    if (missingIndices.length === 0) break;
    const retried = await Promise.all(missingIndices.map((index) => enrichBatch([visible[index]], true)));
    missingIndices.forEach((visibleIndex, retryIndex) => {
      const retry = retried[retryIndex]?.[0];
      if (retry && Object.keys(retry).length > 0) {
        enrichments[visibleIndex] = { ...retry, ...enrichments[visibleIndex] };
      }
    });
  }
  // Last resort for summary only: the model sometimes refuses to summarize a
  // thin or off-topic excerpt no matter how often it is asked. Fall back to
  // the excerpt's own first sentence — a quote, never a fabrication — rather
  // than ship a blank sheet column.
  visible.forEach((moment, index) => {
    if (!enrichments[index].summary) {
      const firstSentence = moment.excerpt.trim().split(/(?<=[.?!])\s+/)[0] ?? "";
      if (firstSentence) {
        enrichments[index] = { ...enrichments[index], summary: firstSentence.slice(0, 200) };
      }
    }
  });
  const enriched = new Map(visible.map((moment, index) => [moment, enrichments[index]]));
  if (budgetSec != null) {
    const ranked = moments
      .map((moment) => ({ ...moment, ...(enriched.get(moment) ?? {}) }))
      .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0) || b.score - a.score);
    const cut = applyDurationBudget(ranked, budgetSec);
    return { moments: cut.moments, totalDurationSec: cut.totalDurationSec, budgetSec };
  }
  return {
    moments: budgeted.moments.map((moment) => ({ ...moment, ...(enriched.get(moment) ?? {}) })),
    totalDurationSec: budgeted.totalDurationSec,
    budgetSec,
  };
}

async function chat(request: Request, env: Env) {
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "application/json") return reply(request, env, { error: "content_type_required" }, 415);
  if (!(await rateLimit(request, env))) {
    return reply(request, env, { error: "rate_limited" }, 429);
  }
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_BODY_BYTES) return reply(request, env, { error: "body_too_large" }, 413);
  let payload: { question?: unknown; sourceMode?: unknown; episodeId?: unknown; history?: unknown; answerModel?: unknown };
  try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return reply(request, env, { error: "question_required" }, 400);
  }
  let forcedAnswerModel: string | undefined;
  if (payload.answerModel !== undefined) {
    if (typeof payload.answerModel !== "string" || !RETRYABLE_OPENROUTER_MODELS.has(payload.answerModel)) {
      return reply(request, env, { error: "invalid_answer_model" }, 400);
    }
    forcedAnswerModel = payload.answerModel;
  }
  const question = normalizeHostAttribution(payload.question.trim());
  const sourceMode = parseSourceMode(payload.sourceMode);
  const episodeId = parseEpisodeId(payload.episodeId);
  const history = parseHistory(payload.history);
  if (payload.episodeId !== undefined && episodeId === null) {
    return reply(request, env, { error: "invalid_episode_id" }, 400);
  }
  if (question.length > MAX_QUESTION_CHARS) return reply(request, env, { error: "question_too_long" }, 400);
  if (requiresVerifiedMetadata(question)) {
    return reply(request, env, {
      answer: "I can’t verify catalogue-wide counts or ownership/role claims from transcript search. Try asking what a named guest said about a topic, or ask about a specific episode instead.",
      sources: [],
      grounded: false,
      sourceMode,
      requestedSourceMode: sourceMode,
      evidenceSourceMode: null,
      uncutUnavailable: false,
      responseState: "abstained",
      citedIndices: [],
      followUps: [],
    });
  }
  try {
    // A budget-only follow-up ("top 10 mins of this") asks to re-cut the
    // moments the reader just saw, not to search again — an LLM rewrite can
    // drift the topic (and the episode anchor can collapse the reel to one
    // wrong episode). Reuse the last standalone user question verbatim so
    // retrieval reproduces the previous turn exactly; the new budget then
    // ranks that same pool by strength.
    const searchQuery = await resolveSearchQuery(env, question, history);
    const { resolved, sources, momentSources, episodeId: resolvedEpisodeId } = await retrieveSourcesForQuery(env, searchQuery, sourceMode, episodeId);
    if (sources.length < 2) {
      return reply(request, env, {
        answer: resolved.uncutUnavailable
          ? resolvedEpisodeId
            ? "No sufficiently relevant approved uncut excerpt was returned for this episode, and there is not enough published evidence to answer reliably. no timestamp was inferred."
            : "No sufficiently relevant approved uncut excerpt was returned for this question, and there is not enough published YouTube evidence to answer reliably. no timestamp was inferred."
          : resolvedEpisodeId
            ? "I don’t have enough relevant evidence in this episode to answer that reliably."
            : "I don’t have enough relevant evidence in the catalogue to answer that reliably.",
        sources: sources.map(({ text: _text, ...source }) => source),
        grounded: false,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        responseState: "retrieval_weak",
        citedIndices: [],
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const evidenceContext = sources.map((source: any) => `[${source.n}] ${source.title}\n${source.text}`).join("\n\n---\n\n");
    const priorContext = historyContext(history);
    // When the question carries a duration budget ("top 10 mins of this"),
    // the response already includes a ranked reel of timestamped moments
    // filling it — the answer must summarize that reel, not refuse it.
    const answerBudgetSec = parseDurationBudget(question);
    const budgetNote = answerBudgetSec != null
      ? `\n\nNOTE: Alongside your answer, the interface shows a ranked reel of the top timestamped moments filling ~${Math.round(answerBudgetSec / 60)} minutes for this question, ordered by relevance and strength. Summarize what the strongest moments cover in 2-4 sentences and point the reader to the reel for playback. The excerpts DO carry timestamps — never claim timestamps or durations are unavailable.`
      : "";
    const userContent = priorContext
      ? `PRIOR CONVERSATION:\n${priorContext}\n\nCONTEXT:\n${evidenceContext}\n\nQUESTION: ${question}${budgetNote}`
      : `CONTEXT:\n${evidenceContext}\n\nQUESTION: ${question}${budgetNote}`;
    // Moments don't need the answer text — run the merge/duration/enrichment
    // pipeline alongside answer generation so its LLM call hides behind it.
    // Moments use the wide retrieval slice (no per-episode dedupe) so an
    // episode can contribute several distinct passages, like the editor sheet.
    const momentsPromise = momentsForAnswer(
      env,
      question,
      momentSources.length > 0 ? momentSources : sources,
    );
    const answered = await answerWithFallback(env, [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.systemPrompt },
        { role: "user", content: userContent },
      ], forcedAnswerModel);
    // A model-driven "the evidence does not support this" reply carries no
    // citations by design — return it as an abstention instead of routing it
    // into the citation-repair/excerpt-dump path.
    const isModelAbstention = (text: string) =>
      !/\[[^\]]*\d/.test(text)
      && /(?:do(?:es)? not establish|not enough relevant evidence|not supported|cannot be answered from|no excerpt)/i.test(text);
    const projectSources = () => sources.map(({ text: _text, ...source }: any) => source);
    // Excerpt is enrichment input, not public payload.
    const projectMoments = async () => {
      const { moments, totalDurationSec, budgetSec } = await momentsPromise;
      return {
        moments: moments.map(({ excerpt: _excerpt, ...moment }) => moment),
        totalMomentDurationSec: totalDurationSec,
        durationBudgetSec: budgetSec,
      };
    };
    if (isModelAbstention(answered.answer)) {
      return reply(request, env, {
        answer: answered.answer,
        sources: [],
        grounded: false,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model,
        modelFallback: answered.fallback,
        responseState: "abstained",
        citedIndices: [],
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const citationValidation = parseCitationMarkers(answered.answer, sources.length);
    if (!citationValidation.valid) {
      // One repair pass: the model answered but dropped/mangled citations. Ask
      // it to rewrite the same answer with valid [n] citations before giving up.
      console.warn("wtfmedia answer missing valid citations; attempting repair", { sourceCount: sources.length, citations: citationValidation.indices });
      const repaired = await answerWithFallback(env, [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: answered.answer },
        { role: "user", content: `Your answer has no valid citations. Rewrite it: cite every factual sentence with [n], using only numbers 1 to ${sources.length}. If the excerpts do not answer the question, say plainly what is not supported instead.` },
      ], forcedAnswerModel);
      if (isModelAbstention(repaired.answer)) {
        return reply(request, env, {
          answer: repaired.answer,
          sources: [],
          grounded: false,
          sourceMode: resolved.sourceMode,
          requestedSourceMode: resolved.requestedSourceMode,
          evidenceSourceMode: resolved.evidenceSourceMode,
          fallbackReason: resolved.fallbackReason,
          uncutUnavailable: resolved.uncutUnavailable,
          model: repaired.model,
          modelFallback: true,
          responseState: "abstained",
          citedIndices: [],
          followUps: [],
          ...(searchQuery !== question ? { searchQuery } : {}),
        });
      }
      const repairedValidation = parseCitationMarkers(repaired.answer, sources.length);
      if (repairedValidation.valid) {
        return reply(request, env, {
          answer: repaired.answer,
          sources: projectSources(),
          ...(await projectMoments()),
          grounded: true,
          sourceMode: resolved.sourceMode,
          requestedSourceMode: resolved.requestedSourceMode,
          evidenceSourceMode: resolved.evidenceSourceMode,
          fallbackReason: resolved.fallbackReason,
          uncutUnavailable: resolved.uncutUnavailable,
          model: repaired.model,
          modelFallback: true,
          responseState: "answered_grounded",
          citedIndices: repairedValidation.indices,
          followUps: [],
          ...(searchQuery !== question ? { searchQuery } : {}),
        });
      }
      console.warn("wtfmedia answer rejected: invalid citations after repair", { sourceCount: sources.length, citations: repairedValidation.indices });
      const fallbackCited = sources.slice(0, 3).map((s) => s.n);
      return reply(request, env, {
        answer: citedEvidenceFallback(sources),
        sources: projectSources(),
        ...(await projectMoments()),
        grounded: true,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model,
        modelFallback: true,
        responseState: "synthesis_invalid",
        citedIndices: fallbackCited,
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const citedIndices = citationValidation.indices;
    const followUps = await generateFollowUps(env, question, answered.answer, sources, sourceMode, resolvedEpisodeId);
    return reply(request, env, {
      answer: answered.answer,
      sources: projectSources(),
      ...(await projectMoments()),
      grounded: true,
      sourceMode: resolved.sourceMode,
      requestedSourceMode: resolved.requestedSourceMode,
      evidenceSourceMode: resolved.evidenceSourceMode,
      fallbackReason: resolved.fallbackReason,
      uncutUnavailable: resolved.uncutUnavailable,
      model: answered.model,
      modelFallback: answered.fallback,
      responseState: "answered_grounded",
      citedIndices,
      followUps,
      ...(searchQuery !== question ? { searchQuery } : {}),
    });
  } catch (error) {
    console.error("wtfmedia chat failed", {
      message: error instanceof Error ? error.message : "unknown",
      sourceMode,
    });
    return reply(request, env, { error: "retrieval_unavailable" }, 503);
  }
}

async function requireAuth(request: Request, env: Env): Promise<Operator | null> {
  const authorizedParties = env.CLERK_AUTHORIZED_PARTIES?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL || !authorizedParties?.length) return null;
  const identity = await createRemoteClerkVerifier({
    issuer: env.CLERK_ISSUER,
    jwksUrl: env.CLERK_JWKS_URL,
    authorizedParties: authorizedParties ?? [],
    ...(env.CLERK_AUDIENCE ? { audience: env.CLERK_AUDIENCE } : {}),
  })(request);
  return identity.ok ? getOperatorByEmail(env.DB, identity.email) : null;
}

async function requireAdmin(request: Request, env: Env): Promise<Operator | null> {
  const operator = await requireAuth(request, env);
  if (!operator || operator.role !== "admin") return null;
  return operator;
}

async function handleOperators(request: Request, env: Env) {
  const url = new URL(request.url);
  const idMatch = url.pathname.match(/^\/v1\/operators\/(\d+)$/);

  if (request.method === "GET" && url.pathname === "/v1/operators") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const operators = await listOperators(env.DB);
    return reply(request, env, { operators });
  }

  if (request.method === "GET" && url.pathname === "/v1/operators/me") {
    const operator = await requireAuth(request, env);
    if (!operator) return reply(request, env, { error: "unauthorized" }, 401);
    return reply(request, env, { operator });
  }

  if (request.method === "POST" && url.pathname === "/v1/operators") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    let payload: { email?: string; name?: string; role?: "admin" | "editor" };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.email || !payload.name) return reply(request, env, { error: "email_and_name_required" }, 400);
    const role = payload.role ?? "editor";
    const operator = await createOperator(env.DB, payload.email, payload.name, role);
    await logAuditEvent(env.DB, admin.id, "invite", "operator", String(operator.id), { email: operator.email, role });
    return reply(request, env, { operator }, 201);
  }

  if (request.method === "PATCH" && idMatch) {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const id = Number(idMatch[1]);
    let payload: { role?: "admin" | "editor"; active?: boolean };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (payload.role) {
      const updated = await updateOperatorRole(env.DB, id, payload.role);
      await logAuditEvent(env.DB, admin.id, "role_change", "operator", String(id), { role: payload.role });
      return reply(request, env, { operator: updated });
    }
    if (payload.active === false) {
      await deactivateOperator(env.DB, id);
      await logAuditEvent(env.DB, admin.id, "deactivate", "operator", String(id));
      return reply(request, env, { deactivated: true });
    }
    if (payload.active === true) {
      await reactivateOperator(env.DB, id);
      await logAuditEvent(env.DB, admin.id, "reactivate", "operator", String(id));
      return reply(request, env, { reactivated: true });
    }
    return reply(request, env, { error: "no_valid_fields" }, 400);
  }

  return reply(request, env, { error: "not_found" }, 404);
}

async function handleAudit(request: Request, env: Env) {
  if (request.method === "POST" && new URL(request.url).pathname === "/v1/audit") {
    const operator = await requireAuth(request, env);
    if (!operator) return reply(request, env, { error: "unauthorized" }, 401);
    let payload: { action?: AuditAction; resource?: string; resource_id?: string; metadata?: Record<string, unknown> };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.action) return reply(request, env, { error: "action_required" }, 400);
    await logAuditEvent(env.DB, operator.id, payload.action, payload.resource ?? "", payload.resource_id ?? "", payload.metadata);
    return reply(request, env, { logged: true }, 201);
  }

  if (request.method === "GET" && new URL(request.url).pathname === "/v1/audit") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const url = new URL(request.url);
    const action = url.searchParams.get("action") as AuditAction | null;
    const since = url.searchParams.get("since") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const result = await queryAuditEvents(env.DB, { action: action ?? undefined, since, limit, offset });
    return reply(request, env, result);
  }

  return reply(request, env, { error: "not_found" }, 404);
}

async function handleSettings(request: Request, env: Env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return reply(request, env, { error: "forbidden" }, 403);

  if (request.method === "GET") {
    const defaultRole = await getSetting(env.DB, "default_role");
    const retentionDays = await getSetting(env.DB, "audit_retention_days");
    return reply(request, env, { settings: { default_role: defaultRole, audit_retention_days: retentionDays } });
  }

  if (request.method === "PUT") {
    let payload: { key?: string; value?: string };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.key || !payload.value) return reply(request, env, { error: "key_and_value_required" }, 400);
    await setSetting(env.DB, payload.key, payload.value);
    await logAuditEvent(env.DB, admin.id, "settings_change", "setting", payload.key, { value: payload.value });
    return reply(request, env, { updated: true });
  }

  return reply(request, env, { error: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors(request, env), "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-Request-ID, Idempotency-Key" } });
    }
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return reply(request, env, { status: "ok", service: "wtfmedia-edge", index: "wtfmedia-catalogue-v1" });
    }
    if (url.pathname === "/ops" || url.pathname.startsWith("/ops/") || url.pathname === "/api/ops" || url.pathname.startsWith("/api/ops/")) {
      return handleOpsRequest(request, env);
    }
    if (url.pathname.startsWith("/beta/api/")) return handleMemberRequest(request, env);
    if (url.pathname === "/v1/calendar" || url.pathname.startsWith("/v1/calendar/")) {
      if (!env.EDGE_SHARED_SECRET || request.headers.get("X-Edge-Secret") !== env.EDGE_SHARED_SECRET) {
        return reply(request, env, { error: "unauthorized" }, 401);
      }
      try {
        if (!(await allowCalendarRequest(request, env))) {
          return reply(request, env, { error: "rate_limited" }, 429);
        }
      } catch {
        return reply(request, env, { error: "calendar_unavailable" }, 503);
      }
      return handleCalendarRequest(request, env);
    }
    if (request.method === "POST" && url.pathname === "/v1/chat") {
      if (!env.EDGE_SHARED_SECRET || request.headers.get("X-Edge-Secret") !== env.EDGE_SHARED_SECRET) return reply(request, env, { error: "unauthorized" }, 401);
      return chat(request, env);
    }
    if (request.method === "POST" && url.pathname === "/v1/admin/enqueue") {
      if (request.headers.get("X-Ingest-Token") !== env.INGEST_TOKEN) return reply(request, env, { error: "unauthorized" }, 401);
      let payload: { jobs?: TranscriptJob[] };
      try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
      const admission = await admitTranscriptJobs(payload.jobs, env.INGEST_QUEUE, env.DB);
      return admission.ok
        ? reply(request, env, { queued: admission.queued }, 202)
        : reply(request, env, { error: admission.error }, 400);
    }
    return reply(request, env, { error: "not_found" }, 404);
  },
  async queue(batch: any, env: Env) {
    for (const message of batch.messages) {
      try { await ingestTranscriptJob(message.body as TranscriptJob, env); message.ack(); }
      catch (error) { console.error("wtfmedia ingest failed", { message: error instanceof Error ? error.message : "unknown" }); message.retry(); }
    }
  },
};

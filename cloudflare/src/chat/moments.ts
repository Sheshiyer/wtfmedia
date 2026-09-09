/**
 * Moments — the editor-sheet view of retrieval evidence.
 *
 * Adjacent chunks of the same episode merge into one moment with a real
 * start–end range: a chunk knows only its own start, so a moment's end is the
 * start of the next chunk in that episode (one batched getByIds lookup).
 * A query like "30 min of relationships" parses a duration budget; moments
 * are then selected by score until the budget is filled.
 */

export interface MomentSource {
  n: number;
  videoId: string;
  title: string;
  url: string;
  score: number;
  start: number | null;
  segmentId?: string;
  text?: string;
  timestampConfidence?: number | null;
}

export interface Moment {
  videoId: string;
  title: string;
  url: string;
  /** First chunk index of the merged range. */
  chunkStart: number;
  /** Last chunk index of the merged range. */
  chunkEnd: number;
  startSec: number;
  /** Null when the episode's next chunk is missing (e.g. final chunk). */
  endSec: number | null;
  durationSec: number | null;
  /** Strongest calibrated score among merged sources. */
  score: number;
  /** Weakest timestamp confidence among merged sources — never overstated. */
  timestampConfidence: number | null;
  /** Citation numbers of the merged sources, for [n] mapping. */
  citationNumbers: number[];
  /** Excerpt preview for the enrichment call. */
  excerpt: string;
  /** Set when the moment survived a duration-budget cut. */
  withinBudget: boolean;
  /** True when endSec comes from a text-length estimate, not the next chunk. */
  durationEstimated?: boolean;
}

export interface MomentEnrichment {
  guest?: string;
  theme?: string;
  topic?: string;
  summary?: string;
  whyRelevant?: string;
  strength?: number;
}

export type EnrichedMoment = Moment & MomentEnrichment;

/** Parse "videoId:chunk" segment IDs. Returns null for non-conforming IDs. */
function parseSegmentRef(segmentId: string | undefined): { videoId: string; chunk: number } | null {
  if (!segmentId) return null;
  const match = /^([A-Za-z0-9_-]{11}):(\d+)$/.exec(segmentId);
  if (!match) return null;
  return { videoId: match[1], chunk: Number(match[2]) };
}

/**
 * Merge timestamped sources into per-episode moments. Sources without a
 * verified start or a parseable chunk index cannot form a moment and are
 * skipped — the source list still shows them separately.
 */
export function buildMoments(sources: readonly MomentSource[]): Moment[] {
  const byEpisode = new Map<string, Array<{ source: MomentSource; chunk: number }>>();
  for (const source of sources) {
    if (source.start == null) continue;
    const ref = parseSegmentRef(source.segmentId);
    if (!ref || ref.videoId !== source.videoId) continue;
    const bucket = byEpisode.get(source.videoId);
    if (bucket) bucket.push({ source, chunk: ref.chunk });
    else byEpisode.set(source.videoId, [{ source, chunk: ref.chunk }]);
  }

  const moments: Moment[] = [];
  for (const [videoId, items] of byEpisode) {
    items.sort((a, b) => a.chunk - b.chunk);
    let run: Array<{ source: MomentSource; chunk: number }> = [];
    const flush = () => {
      if (run.length === 0) return;
      const first = run[0].source;
      const confidences = run
        .map((item) => item.source.timestampConfidence)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      moments.push({
        videoId,
        title: first.title,
        url: first.url,
        chunkStart: run[0].chunk,
        chunkEnd: run[run.length - 1].chunk,
        startSec: first.start ?? 0,
        endSec: null,
        durationSec: null,
        score: Math.max(...run.map((item) => item.source.score)),
        timestampConfidence: confidences.length > 0 ? Math.min(...confidences) : null,
        citationNumbers: run.map((item) => item.source.n),
        excerpt: run
          .map((item) => (typeof item.source.text === "string" ? item.source.text : ""))
          .join(" ")
          .slice(0, 600),
        withinBudget: true,
      });
      run = [];
    };
    for (const item of items) {
      // Gap > 1 chunk means the retrieval window skipped material between the
      // two hits — those are two moments, not one continuous one.
      if (run.length > 0 && item.chunk > run[run.length - 1].chunk + 1) flush();
      run.push(item);
    }
    flush();
  }

  return moments.sort((a, b) => b.score - a.score);
}

/**
 * Fill each moment's end from the start of the following chunk. The chunk
 * after a moment's last chunk belongs to the next moment (or was never
 * retrieved), so its start is this moment's end on the episode clock.
 * Vectorize getByIds caps at 20 ids per call, so the lookup is batched.
 * When the next chunk does not exist (the moment ends at the episode's final
 * chunk), the end is estimated from that chunk's transcript length instead —
 * speech runs ~2.5 words per second — and flagged durationEstimated so the
 * panel and sheet can show "~" rather than a bare "–?".
 */
const GET_BY_IDS_BATCH = 20;
const WORDS_PER_SECOND = 2.5;
const MIN_ESTIMATED_CHUNK_SEC = 5;
const MAX_ESTIMATED_CHUNK_SEC = 300;
type VectorLookup = { id: string; metadata?: Record<string, unknown> | null };
// The real binding resolves to a bare VectorizeVector[]; some mocks/SDKs wrap
// it in { matches }. Accept both.
type GetByIdsResult = VectorLookup[] | { matches?: VectorLookup[] };

export async function resolveMomentEnds(
  vectorize: { getByIds(ids: string[]): Promise<GetByIdsResult> },
  moments: Moment[],
): Promise<Moment[]> {
  // Next-chunk ids give exact ends; each moment's own last chunk rides along
  // so a final-chunk moment can fall back to a text-length estimate.
  const ids = [...new Set(moments.flatMap((moment) => [
    `${moment.videoId}:${moment.chunkEnd + 1}`,
    `${moment.videoId}:${moment.chunkEnd}`,
  ]))];
  if (ids.length === 0) return moments;
  let found: VectorLookup[] = [];
  try {
    const batches: GetByIdsResult[] = await Promise.all(
      Array.from({ length: Math.ceil(ids.length / GET_BY_IDS_BATCH) }, (_, index) =>
        vectorize.getByIds(ids.slice(index * GET_BY_IDS_BATCH, (index + 1) * GET_BY_IDS_BATCH))),
    );
    found = batches.flatMap((result) =>
      Array.isArray(result) ? result : Array.isArray(result?.matches) ? result.matches : []);
  } catch (error) {
    console.warn("wtfmedia moment end lookup failed", {
      message: error instanceof Error ? error.message : "unknown",
      idCount: ids.length,
    });
    return moments; // durations stay unknown; the answer must not fail on this
  }
  const startById = new Map<string, number>();
  const textById = new Map<string, string>();
  for (const match of found) {
    const start = match?.metadata?.start;
    if (typeof start === "number" && Number.isFinite(start) && start >= 0) {
      startById.set(match.id, start);
    }
    const text = match?.metadata?.text;
    if (typeof text === "string" && text.trim()) textById.set(match.id, text);
  }
  return moments.map((moment) => {
    const end = startById.get(`${moment.videoId}:${moment.chunkEnd + 1}`);
    if (end != null && end > moment.startSec) {
      return { ...moment, endSec: end, durationSec: end - moment.startSec };
    }
    // Final chunk of the episode: no next chunk exists, so estimate the last
    // chunk's own length from its transcript and add it to its start.
    const ownId = `${moment.videoId}:${moment.chunkEnd}`;
    const lastStart = startById.get(ownId);
    const lastText = textById.get(ownId);
    if (lastStart == null || !lastText) return moment;
    const words = lastText.trim().split(/\s+/).length;
    const estimate = Math.min(MAX_ESTIMATED_CHUNK_SEC, Math.max(MIN_ESTIMATED_CHUNK_SEC, words / WORDS_PER_SECOND));
    const estimatedEnd = lastStart + estimate;
    if (estimatedEnd <= moment.startSec) return moment;
    return { ...moment, endSec: estimatedEnd, durationSec: estimatedEnd - moment.startSec, durationEstimated: true };
  });
}

const MINUTE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:min(?:ute)?s?)\b/i;
const HOUR_PATTERN = /(\d+(?:\.\d+)?)\s*(?:hr|hrs|hours?)\b/i;
const HALF_HOUR = /\bhalf\s+an?\s+hour\b/i;

/**
 * Extract a duration budget from the question, in seconds.
 * "30 min", "30 minutes", "1.5 hours", "half an hour" all parse; anything
 * else returns null and every moment stays visible.
 */
export function parseDurationBudget(question: string): number | null {
  const hours = HOUR_PATTERN.exec(question);
  if (hours) return Math.round(Number(hours[1]) * 3600);
  if (HALF_HOUR.test(question)) return 1800;
  const minutes = MINUTE_PATTERN.exec(question);
  if (minutes) return Math.round(Number(minutes[1]) * 60);
  return null;
}

/**
 * Greedy score-ordered selection under a duration budget. Moments with an
 * unknown duration are kept but do not spend the budget — hiding a relevant
 * moment over a missing end chunk is worse than a slightly soft total.
 * Budget spending stops at the relevance cutoff: padding a "10 minutes"
 * request with weak matches just to reach 10:00 is dishonest — the sheet
 * shows the duration we actually have instead.
 */
const BUDGET_RELEVANCE_RATIO = 0.7;

export function applyDurationBudget(moments: Moment[], budgetSec: number | null): {
  moments: Moment[];
  totalDurationSec: number;
  budgetSec: number | null;
} {
  if (budgetSec == null) {
    return {
      moments,
      totalDurationSec: moments.reduce((sum, moment) => sum + (moment.durationSec ?? 0), 0),
      budgetSec: null,
    };
  }
  const topScore = moments.reduce((best, moment) => Math.max(best, moment.score), 0);
  const relevanceFloor = topScore * BUDGET_RELEVANCE_RATIO;
  let spent = 0;
  const selected = moments.map((moment) => {
    const duration = moment.durationSec;
    if (duration == null) return moment;
    if (moment.score < relevanceFloor) return { ...moment, withinBudget: false };
    if (spent + duration <= budgetSec || spent === 0) {
      spent += duration;
      return moment;
    }
    return { ...moment, withinBudget: false };
  });
  return { moments: selected, totalDurationSec: spent, budgetSec };
}

const EXCERPT_LIMIT = 400;

export function buildMomentEnrichmentInput(question: string, moments: readonly Moment[]): string {
  const lines = moments.map((moment, index) => {
    const range = moment.endSec != null
      ? `${formatClock(moment.startSec)}-${formatClock(moment.endSec)}`
      : `${formatClock(moment.startSec)}-?`;
    return `MOMENT ${index + 1} | ${moment.title} | ${range}\n${moment.excerpt.slice(0, EXCERPT_LIMIT)}`;
  });
  return `QUESTION: ${question}\n\n${lines.join("\n\n---\n\n")}`;
}

export const MOMENT_ENRICHMENT_PROMPT = `You label podcast moments for an editorial clip sheet. For each MOMENT, output one JSON object on one line, in order, with keys:
"m" (integer: the MOMENT number this object labels — required, the parser anchors on it),
"guest" (guest name(s) from the episode title, without the show title),
"theme" (2-4 word umbrella theme, e.g. "Grief / father"),
"topic" (3-6 word specific topic, lowercase),
"summary" (one sentence, max 25 words, what is actually said),
"whyRelevant" (one sentence, max 20 words, why an editor would cut this for the question),
"strength" (integer 1-5: how strongly the moment answers the question).
Output ONLY the JSON objects, no commentary, no code fences. If a text field cannot be honest from the excerpt, use an empty string; strength is always your honest 1-5 judgment.`;

/** Parse one-JSON-object-per-line enrichment output. Tolerant of fences,
 * extra text, and objects the model splits across lines. The "m" key anchors
 * each object to its MOMENT number; without it, the next unfilled slot is
 * used (positional fallback). */
export function parseMomentEnrichment(text: string, count: number): MomentEnrichment[] {
  const results: MomentEnrichment[] = Array.from({ length: count }, () => ({}));
  const filled = new Set<number>();
  const cleaned = text.replace(/```(?:json)?/g, "");
  let buffer = "";
  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    if (!buffer) {
      if (!trimmed.startsWith("{")) continue;
      buffer = trimmed;
    } else if (trimmed.startsWith("{")) {
      buffer = trimmed; // previous object never closed (token cutoff) — drop it
    } else {
      buffer = `${buffer}\n${trimmed}`;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(buffer) as Record<string, unknown>;
    } catch {
      continue; // incomplete or malformed — accumulate the next line
    }
    buffer = "";
    // Anchor on the "m" key when present and unfilled; otherwise take the
    // next unfilled slot so a skipped MOMENT never shifts the rest.
    const anchor = Number(parsed.m);
    let slot = Number.isInteger(anchor) && anchor >= 1 && anchor <= count && !filled.has(anchor - 1)
      ? anchor - 1
      : -1;
    if (slot === -1) {
      for (let candidate = 0; candidate < count; candidate += 1) {
        if (!filled.has(candidate)) { slot = candidate; break; }
      }
    }
    if (slot === -1) continue;
    const enrichment: MomentEnrichment = {};
    for (const key of ["guest", "theme", "topic", "summary", "whyRelevant"] as const) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) enrichment[key] = value.trim().slice(0, 300);
    }
    const strength = Number(parsed.strength);
    if (Number.isInteger(strength) && strength >= 1 && strength <= 5) enrichment.strength = strength;
    results[slot] = enrichment;
    filled.add(slot);
  }
  return results;
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

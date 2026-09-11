/**
 * Safe parser for the public Ask WTF moments header.
 *
 * Same transport contract as public-source-header: URI-encoded JSON, and only
 * documented public fields survive. Malformed payloads fail closed to an
 * empty moment list.
 */

export interface PublicMoment {
  videoId: string;
  title: string;
  url: string;
  startSec: number;
  endSec: number | null;
  durationSec: number | null;
  /** True when durationSec is a transcript-length estimate, not an exact range. */
  durationEstimated?: boolean;
  score: number;
  timestampConfidence: number | null;
  citationNumbers: number[];
  withinBudget: boolean;
  guest?: string;
  theme?: string;
  topic?: string;
  summary?: string;
  whyRelevant?: string;
  strength?: number;
}

export interface PublicMomentsPayload {
  moments: PublicMoment[];
  totalDurationSec: number;
  budgetSec: number | null;
}

const EMPTY: PublicMomentsPayload = { moments: [], totalDurationSec: 0, budgetSec: null };

type Record_ = Record<string, unknown>;

function textField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function secondsField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parseHeaderJson(header: string): unknown {
  try {
    return JSON.parse(decodeURIComponent(header));
  } catch {
    try {
      return JSON.parse(header);
    } catch {
      return null;
    }
  }
}

function normalizeMoment(value: unknown): PublicMoment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record_;
  const videoId = textField(raw.video_id ?? raw.videoId);
  const startSec = secondsField(raw.start_sec ?? raw.startSec);
  if (!videoId || startSec == null) return null;
  const citationNumbers = raw.citation_numbers ?? raw.citationNumbers;

  const moment: PublicMoment = {
    videoId,
    title: textField(raw.title) ?? videoId,
    url: textField(raw.url) ?? `https://www.youtube.com/watch?v=${videoId}`,
    startSec,
    endSec: secondsField(raw.end_sec ?? raw.endSec),
    durationSec: secondsField(raw.duration_sec ?? raw.durationSec),
    ...(raw.duration_estimated === true || raw.durationEstimated === true ? { durationEstimated: true } : {}),
    score: secondsField(raw.score) ?? 0,
    timestampConfidence: secondsField(raw.timestamp_confidence ?? raw.timestampConfidence),
    citationNumbers: Array.isArray(citationNumbers)
      ? citationNumbers.filter((n): n is number => Number.isSafeInteger(n) && n > 0)
      : [],
    withinBudget: raw.within_budget !== false && raw.withinBudget !== false,
  };

  const guest = textField(raw.guest);
  const theme = textField(raw.theme);
  const topic = textField(raw.topic);
  const summary = textField(raw.summary);
  const whyRelevant = textField(raw.why_relevant ?? raw.whyRelevant);
  const strength = Number(raw.strength);
  if (guest) moment.guest = guest;
  if (theme) moment.theme = theme;
  if (topic) moment.topic = topic;
  if (summary) moment.summary = summary;
  if (whyRelevant) moment.whyRelevant = whyRelevant;
  if (Number.isInteger(strength) && strength >= 1 && strength <= 5) moment.strength = strength;
  return moment;
}

/** Parses a public moment projection from either transport or persisted metadata. */
export function parsePublicMomentsPayload(parsed: unknown): PublicMomentsPayload {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
  const raw = parsed as Record_;
  const moments = Array.isArray(raw.moments)
    ? raw.moments.flatMap((item) => {
      const moment = normalizeMoment(item);
      return moment ? [moment] : [];
    })
    : [];
  return {
    moments,
    totalDurationSec: secondsField(raw.total_duration_sec ?? raw.totalDurationSec ?? raw.totalMomentDurationSec) ?? 0,
    budgetSec: secondsField(raw.budget_sec ?? raw.budgetSec ?? raw.durationBudgetSec),
  };
}

/** Decodes the `X-Moments` projection. */
export function parsePublicMomentsHeader(header: string | null): PublicMomentsPayload {
  return header ? parsePublicMomentsPayload(parseHeaderJson(header)) : EMPTY;
}

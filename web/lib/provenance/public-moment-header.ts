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
  const videoId = textField(raw.video_id);
  const startSec = secondsField(raw.start_sec);
  if (!videoId || startSec == null) return null;

  const moment: PublicMoment = {
    videoId,
    title: textField(raw.title) ?? videoId,
    url: textField(raw.url) ?? `https://www.youtube.com/watch?v=${videoId}`,
    startSec,
    endSec: secondsField(raw.end_sec),
    durationSec: secondsField(raw.duration_sec),
    score: secondsField(raw.score) ?? 0,
    timestampConfidence: secondsField(raw.timestamp_confidence),
    citationNumbers: Array.isArray(raw.citation_numbers)
      ? raw.citation_numbers.filter((n): n is number => Number.isSafeInteger(n) && n > 0)
      : [],
    withinBudget: raw.within_budget !== false,
  };

  const guest = textField(raw.guest);
  const theme = textField(raw.theme);
  const topic = textField(raw.topic);
  const summary = textField(raw.summary);
  const whyRelevant = textField(raw.why_relevant);
  const strength = Number(raw.strength);
  if (guest) moment.guest = guest;
  if (theme) moment.theme = theme;
  if (topic) moment.topic = topic;
  if (summary) moment.summary = summary;
  if (whyRelevant) moment.whyRelevant = whyRelevant;
  if (Number.isInteger(strength) && strength >= 1 && strength <= 5) moment.strength = strength;
  return moment;
}

/** Decodes the `X-Moments` projection. */
export function parsePublicMomentsHeader(header: string | null): PublicMomentsPayload {
  if (!header) return EMPTY;
  const parsed = parseHeaderJson(header);
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
    totalDurationSec: secondsField(raw.total_duration_sec) ?? 0,
    budgetSec: secondsField(raw.budget_sec),
  };
}

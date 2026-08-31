/**
 * Timestamp lines for catalogue ingest. Uncut does not need a public URL;
 * a clock on the transcript line is enough to project M:SS.
 */

export type TimestampOrigin = "source_native" | "published_alignment";
export type TimestampLine = {
  t: number | null;
  x: string;
  origin?: TimestampOrigin;
  confidence?: number;
};
export type NormalizedTimestampLine = {
  t: number | null;
  x: string;
  origin: TimestampOrigin | null;
  confidence: number | null;
};

const MIN_ESTIMATED_TIMESTAMP_CONFIDENCE = 0.8;

const BRACKET = /^\[(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\]\s*(.+)$/;
const LEADING = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s+(.+)$/;
const SRT_CLOCK = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

function clock(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

function fromParts(a: string, b: string, c?: string): number {
  if (c != null) return clock(Number(a), Number(b), Number(c));
  return clock(0, Number(a), Number(b));
}

function pushLine(lines: TimestampLine[], t: number, text: string) {
  const x = text.replace(/\s+/g, " ").trim();
  if (!x || !Number.isFinite(t) || t < 0) return;
  lines.push({ t, x });
}

export function normalizeTimestampLine(value: unknown): NormalizedTimestampLine | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const x = typeof raw.x === "string" ? raw.x.replace(/\s+/g, " ").trim() : "";
  if (!x) return null;
  const time = typeof raw.t === "number" && Number.isFinite(raw.t) && raw.t >= 0
    ? raw.t
    : null;
  if (time == null) return { t: null, x, origin: null, confidence: null };

  const rawOrigin = raw.origin ?? raw.timestampOrigin ?? raw.timestamp_origin;
  const origin = rawOrigin == null ? "source_native" : rawOrigin;
  if (origin !== "source_native" && origin !== "published_alignment") {
    return { t: null, x, origin: null, confidence: null };
  }
  const rawConfidence = raw.confidence ?? raw.timestampConfidence ?? raw.timestamp_confidence;
  const confidence = rawConfidence == null
    ? 1
    : typeof rawConfidence === "number"
      && Number.isFinite(rawConfidence)
      && rawConfidence >= 0
      && rawConfidence <= 1
      ? rawConfidence
      : null;
  if (confidence == null) return { t: null, x, origin: null, confidence: null };
  if (origin === "published_alignment" && confidence < MIN_ESTIMATED_TIMESTAMP_CONFIDENCE) {
    return { t: null, x, origin: null, confidence: null };
  }
  return { t: time, x, origin, confidence };
}

/**
 * Read a transcript with at least three source-native clocks while retaining
 * untimed spoken inserts. The full sequence is used by private sidecar
 * generation so exact timing never causes unclocked corpus text to disappear.
 */
export function extractTimestampSegments(text: string): TimestampLine[] {
  const raw = String(text || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) return [];

  const srt: TimestampLine[] = [];
  let srtTimed = 0;
  const blocks = raw.split(/\n{2,}/);
  for (const block of blocks) {
    const rows = block.split("\n").map((row) => row.trim()).filter(Boolean);
    if (rows.length === 0) continue;
    const clockRow = rows.find((row) => row.includes("-->"));
    const match = clockRow ? SRT_CLOCK.exec(clockRow) : null;
    const spoken = rows
      .filter((row) => row !== clockRow && !/^\d+$/.test(row))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!spoken) continue;
    if (match) {
      srt.push({
        t: clock(Number(match[1]), Number(match[2]), Number(match[3])),
        x: spoken,
      });
      srtTimed += 1;
    } else {
      srt.push({ t: null, x: spoken });
    }
  }
  if (srtTimed >= 3) return srt;

  const lines: TimestampLine[] = [];
  let timed = 0;
  for (const row of raw.split("\n")) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    const bracket = BRACKET.exec(trimmed);
    if (bracket) {
      pushLine(lines, fromParts(bracket[1], bracket[2], bracket[3]), bracket[4]);
      timed += 1;
      continue;
    }
    const leading = LEADING.exec(trimmed);
    if (leading) {
      pushLine(lines, fromParts(leading[1], leading[2], leading[3]), leading[4]);
      timed += 1;
      continue;
    }
    lines.push({ t: null, x: trimmed.replace(/\s+/g, " ") });
  }
  return timed >= 3 ? lines : [];
}

/**
 * Read only clocked lines from a transcript body. Returns [] unless at least
 * three timed lines exist, so untimed prose is not given invented offsets.
 */
export function extractTimestampLines(text: string): TimestampLine[] {
  return extractTimestampSegments(text).filter((line): line is TimestampLine & { t: number } => (
    typeof line.t === "number" && Number.isFinite(line.t) && line.t >= 0
  ));
}

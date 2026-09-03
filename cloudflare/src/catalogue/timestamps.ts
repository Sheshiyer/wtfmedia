/**
 * Timestamp lines for catalogue ingest. Uncut does not need a public URL;
 * a clock on the transcript line is enough to project M:SS.
 */

export type TimestampLine = { t: number; x: string };

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

/**
 * Read clocked lines from a transcript body. Sidecar JSON still wins when
 * present. Returns [] unless at least three timed lines exist, so untimed
 * prose is not given invented offsets.
 */
export function extractTimestampLines(text: string): TimestampLine[] {
  const raw = String(text || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) return [];

  const srt: TimestampLine[] = [];
  const blocks = raw.split(/\n{2,}/);
  for (const block of blocks) {
    const rows = block.split("\n").map((row) => row.trim()).filter(Boolean);
    if (rows.length < 2) continue;
    const clockRow = rows.find((row) => row.includes("-->"));
    if (!clockRow) continue;
    const match = SRT_CLOCK.exec(clockRow);
    if (!match) continue;
    const t = clock(Number(match[1]), Number(match[2]), Number(match[3]));
    const spoken = rows.filter((row) => row !== clockRow && !/^\d+$/.test(row)).join(" ");
    pushLine(srt, t, spoken);
  }
  if (srt.length >= 3) return srt;

  const lines: TimestampLine[] = [];
  for (const row of raw.split("\n")) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    const bracket = BRACKET.exec(trimmed);
    if (bracket) {
      pushLine(lines, fromParts(bracket[1], bracket[2], bracket[3]), bracket[4]);
      continue;
    }
    const leading = LEADING.exec(trimmed);
    if (leading) {
      pushLine(lines, fromParts(leading[1], leading[2], leading[3]), leading[4]);
    }
  }
  return lines.length >= 3 ? lines : [];
}

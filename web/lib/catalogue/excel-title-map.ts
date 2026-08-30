export const QUARANTINED_TRANSCRIPT_TITLES = [
  "Brain Armstrong",
  "WEF - Economics",
  "WTF is a Battery?",
] as const;

export type TitleMapStatus = "mapped" | "quarantined" | "missing-source";
export type UncutPointer = "absent" | "candidate";

export type SnapshotRecord = {
  source_row: number;
  row_hash: string;
  fields: Record<string, unknown>;
};

export type SnapshotSheet = {
  sheet: string;
  records: SnapshotRecord[];
};

export type TitleMapSide = {
  sheet: string;
  sourceRow: number;
  rowHash: string;
};

export type TitleMapRow = {
  title: string;
  status: TitleMapStatus;
  internal?: TitleMapSide;
  transcript?: TitleMapSide;
  uncutPointer: UncutPointer;
  uncutActivation: "not-activated";
};

export type TitleMapTable = {
  snapshotAt: string;
  internalCount: number;
  transcriptCount: number;
  quarantinedCount: number;
  mappedCount: number;
  missingSourceCount: number;
  rows: TitleMapRow[];
};

const SHEET_PAIRS = [
  { internal: "people-by-wtf", transcript: "people-by-wtf" },
  { internal: "podcasts-by-wtf", transcript: "wtf-is-podcast" },
  { internal: "wtf-is-finance", transcript: "wtf-is-finance" },
  { internal: "special-episodes", transcript: "special-episode" },
  { internal: "wtf-online", transcript: "online" },
] as const;

export function exactTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  return title.length > 0 ? title : null;
}

function isQuarantined(title: string): boolean {
  return (QUARANTINED_TRANSCRIPT_TITLES as readonly string[]).includes(title);
}

function hasHttpPointer(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function side(sheet: string, record: SnapshotRecord): TitleMapSide {
  return {
    sheet,
    sourceRow: record.source_row,
    rowHash: record.row_hash,
  };
}

/**
 * Exact-title map from Internal workbook rows to transcript-sheet rows.
 * URLs, paths, and transcript bodies are not copied into the result.
 */
export function mapCatalogueTitles(input: {
  snapshotAt: string;
  internal: SnapshotSheet[];
  transcripts: SnapshotSheet[];
}): TitleMapTable {
  const internals = new Map<string, { sheet: string; record: SnapshotRecord }>();
  const transcripts = new Map<string, { sheet: string; record: SnapshotRecord }>();
  let internalCount = 0;
  let transcriptCount = 0;

  for (const sheet of input.internal) {
    for (const record of sheet.records) {
      const title = exactTitle(record.fields["Name of Episode"]);
      if (!title) continue;
      internalCount += 1;
      internals.set(title, { sheet: sheet.sheet, record });
    }
  }

  for (const sheet of input.transcripts) {
    for (const record of sheet.records) {
      const title = exactTitle(record.fields["Name of Episode"]);
      if (!title) continue;
      transcriptCount += 1;
      transcripts.set(title, { sheet: sheet.sheet, record });
    }
  }

  const titles = new Set<string>([...internals.keys(), ...transcripts.keys()]);
  const rows: TitleMapRow[] = [];

  for (const title of [...titles].sort((a, b) => a.localeCompare(b))) {
    const internal = internals.get(title);
    const transcript = transcripts.get(title);
    const quarantined = isQuarantined(title);
    const uncutPointer: UncutPointer =
      transcript && hasHttpPointer(transcript.record.fields["Clean Cut"])
        ? "candidate"
        : "absent";

    let status: TitleMapStatus;
    if (quarantined) {
      status = "quarantined";
    } else if (internal && transcript) {
      status = "mapped";
    } else {
      status = "missing-source";
    }

    rows.push({
      title,
      status,
      ...(internal ? { internal: side(internal.sheet, internal.record) } : {}),
      ...(transcript ? { transcript: side(transcript.sheet, transcript.record) } : {}),
      uncutPointer,
      uncutActivation: "not-activated",
    });
  }

  return {
    snapshotAt: input.snapshotAt,
    internalCount,
    transcriptCount,
    quarantinedCount: rows.filter((row) => row.status === "quarantined").length,
    mappedCount: rows.filter((row) => row.status === "mapped").length,
    missingSourceCount: rows.filter((row) => row.status === "missing-source").length,
    rows,
  };
}

export function catalogueSheetPairs(): readonly { internal: string; transcript: string }[] {
  return SHEET_PAIRS;
}

export function isExcludedFromActivation(row: TitleMapRow): boolean {
  return row.status === "quarantined" || row.uncutActivation === "not-activated";
}

function isSide(value: unknown): value is TitleMapSide {
  if (!value || typeof value !== "object") return false;
  const side = value as TitleMapSide;
  return (
    typeof side.sheet === "string" &&
    typeof side.sourceRow === "number" &&
    typeof side.rowHash === "string" &&
    side.rowHash.startsWith("sha256:")
  );
}

function isRow(value: unknown): value is TitleMapRow {
  if (!value || typeof value !== "object") return false;
  const row = value as TitleMapRow;
  if (typeof row.title !== "string" || row.title.trim().length === 0) return false;
  if (row.status !== "mapped" && row.status !== "quarantined" && row.status !== "missing-source") {
    return false;
  }
  if (row.uncutPointer !== "absent" && row.uncutPointer !== "candidate") return false;
  if (row.uncutActivation !== "not-activated") return false;
  if (row.internal && !isSide(row.internal)) return false;
  if (row.transcript && !isSide(row.transcript)) return false;
  return true;
}

/**
 * Fail closed: malformed maps, URL leakage, or missing quarantine rows
 * produce null so the UI cannot invent a catalogue.
 */
export function parseTitleMapTable(value: unknown): TitleMapTable | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as TitleMapTable & { quarantinedTitles?: unknown };
  if (typeof raw.snapshotAt !== "string" || !Array.isArray(raw.rows)) return null;
  if (raw.rows.some((row) => !isRow(row))) return null;

  const serialized = JSON.stringify(value);
  if (serialized.includes("http://") || serialized.includes("https://")) return null;

  const quarantined = raw.rows.filter((row) => row.status === "quarantined").map((row) => row.title);
  for (const title of QUARANTINED_TRANSCRIPT_TITLES) {
    if (!quarantined.includes(title)) return null;
  }

  return {
    snapshotAt: raw.snapshotAt,
    internalCount: Number(raw.internalCount) || 0,
    transcriptCount: Number(raw.transcriptCount) || 0,
    quarantinedCount: raw.rows.filter((row) => row.status === "quarantined").length,
    mappedCount: raw.rows.filter((row) => row.status === "mapped").length,
    missingSourceCount: raw.rows.filter((row) => row.status === "missing-source").length,
    rows: raw.rows,
  };
}

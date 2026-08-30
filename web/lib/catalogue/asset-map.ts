import type { TitleMapRow, TitleMapTable } from "./excel-title-map";

export type CatalogueSourceMode = "published" | "uncut";

const HASH = /^(?:sha256:)?([a-f0-9]{16,64})$/i;

export function hashToken(value: string): string | null {
  const match = HASH.exec(value.trim());
  return match ? match[1].toLowerCase() : null;
}

export function publishedTranscriptKey(videoId: string): string {
  return `transcripts/${videoId}.txt`;
}

export function uncutTranscriptKey(rowHash: string): string | null {
  const token = hashToken(rowHash);
  return token ? `uncut/${token}.txt` : null;
}

export type MappedCatalogueAsset = {
  title: string;
  status: TitleMapRow["status"];
  uncutPointer: TitleMapRow["uncutPointer"];
  uncutActivation: TitleMapRow["uncutActivation"];
  publishedKey: string | null;
  uncutKey: string | null;
};

export function mapTitleRowAssets(row: TitleMapRow, videoId?: string): MappedCatalogueAsset {
  const uncutKey =
    row.status === "quarantined"
      ? null
      : row.uncutPointer === "candidate" && row.internal?.rowHash
        ? uncutTranscriptKey(row.internal.rowHash)
        : null;
  return {
    title: row.title,
    status: row.status,
    uncutPointer: row.uncutPointer,
    uncutActivation: row.uncutActivation,
    publishedKey: videoId ? publishedTranscriptKey(videoId) : null,
    uncutKey,
  };
}

export function mapTitleTableAssets(table: TitleMapTable, videoIdsByTitle: ReadonlyMap<string, string> = new Map()) {
  return table.rows.map((row) => mapTitleRowAssets(row, videoIdsByTitle.get(row.title)));
}

import type { TimestampLine } from "./timestamps.ts";
import {
  timestampSidecarMatchesTranscript,
  validateStrictTimestampSidecar,
} from "./sidecar-validation.ts";

type CatalogueObject = {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  text?: () => Promise<string>;
};

type CatalogueBinding = {
  get(key: string): Promise<CatalogueObject | null>;
};

type IngestInputJob = {
  transcriptKey: string;
  timestampsKey?: string;
  sourceContentHash?: string;
  contentHash: string;
  sourceMode?: "published" | "uncut";
};

async function objectBytes(object: CatalogueObject): Promise<Uint8Array> {
  if (typeof object.arrayBuffer === "function") {
    return new Uint8Array(await object.arrayBuffer());
  }
  if (typeof object.text === "function") {
    return new TextEncoder().encode(await object.text());
  }
  throw new Error("catalogue object unreadable");
}

async function sha256Hex(parts: readonly Uint8Array[]): Promise<string> {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Loads and verifies the exact R2 bytes named by an admitted catalogue job.
 * A declared sidecar is mandatory and hash-bound; failures occur before any
 * vector or idempotency state mutation in the caller.
 */
export async function loadCatalogueIngestInput(
  job: IngestInputJob,
  catalogue: CatalogueBinding,
): Promise<{ text: string; timestamps: TimestampLine[] | null }> {
  const transcriptObject = await catalogue.get(job.transcriptKey);
  if (!transcriptObject) throw new Error(`missing transcript object: ${job.transcriptKey}`);
  const transcriptBytes = await objectBytes(transcriptObject);
  const text = new TextDecoder().decode(transcriptBytes);
  if (job.sourceContentHash && await sha256Hex([transcriptBytes]) !== job.sourceContentHash) {
    throw new Error("transcript content hash mismatch");
  }

  let timestampBytes: Uint8Array | null = null;
  let timestamps: TimestampLine[] | null = null;
  if (job.timestampsKey) {
    const timestampObject = await catalogue.get(job.timestampsKey);
    if (!timestampObject) throw new Error(`missing timestamp sidecar: ${job.timestampsKey}`);
    timestampBytes = await objectBytes(timestampObject);
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(timestampBytes));
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("invalid");
      timestamps = parsed as TimestampLine[];
    } catch {
      throw new Error(`unreadable timestamp sidecar: ${job.timestampsKey}`);
    }
    if (job.sourceMode === "uncut") {
      if (!validateStrictTimestampSidecar(timestamps)) {
        throw new Error(`invalid timestamp sidecar: ${job.timestampsKey}`);
      }
      if (!timestampSidecarMatchesTranscript(timestamps, text)) {
        throw new Error(`timestamp sidecar transcript mismatch: ${job.timestampsKey}`);
      }
    }
  }

  const actualContentHash = await sha256Hex(
    timestampBytes ? [transcriptBytes, timestampBytes] : [transcriptBytes],
  );
  if (actualContentHash !== job.contentHash) throw new Error("ingest content hash mismatch");
  return { text, timestamps };
}

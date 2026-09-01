export const MAX_INGEST_CHUNKS_PER_JOB = 16;

export function ingestWindow(totalChunks: number, chunkOffset: unknown, limit = MAX_INGEST_CHUNKS_PER_JOB) {
  const total = Math.max(0, Math.trunc(totalChunks));
  const parsedOffset = typeof chunkOffset === "number" && Number.isInteger(chunkOffset) ? chunkOffset : 0;
  const startOffset = Math.min(total, Math.max(0, parsedOffset));
  const endOffset = Math.min(total, startOffset + limit);
  return {
    startOffset,
    endOffset,
    hasMore: endOffset < total,
  };
}

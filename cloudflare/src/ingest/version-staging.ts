/**
 * @file cloudflare/src/ingest/version-staging.ts
 * @description Version staging, chunking, Workers AI embedding, Vectorize upsert, atomic activation, and vector tombstoning.
 * Eliminates mixed-version retrieval windows by staging version V_{N+1} completely in D1 and Vectorize before atomic cutover.
 */

import type { DB } from "../db.ts";
import type { PrimaryLanguage } from "../dto.ts";
import {
  chunkUlid,
  segmentUlid,
  transcriptVersionUlid,
} from "../utils/ulid.ts";
import type {
  DiarizedSegmentInput,
  StageTranscriptVersionOptions,
  TranscriptChunk,
  TranscriptIngestJobPayload,
  VectorizeIndexBinding,
  VectorizeRecord,
  VersionStagingResult,
  WorkersAiBinding,
} from "./types.ts";

const DEFAULT_EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;
const DEFAULT_BATCH_SIZE = 8;

/**
 * Computes deterministic SHA-256 hex digest of normalized transcript segments.
 */
export async function computeTranscriptSha256(segments: DiarizedSegmentInput[]): Promise<string> {
  const canonical = segments
    .map(
      (s) =>
        `${s.segmentIndex}:${s.startSec.toFixed(3)}:${s.endSec.toFixed(3)}:${s.speakerLabel.trim()}:${s.languageCode}:${s.text.trim()}`
    )
    .join("\n");

  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Splits diarized transcript segments into overlapping text chunks for vector embedding.
 */
export function buildSlidingWindowChunks(
  versionId: string,
  episodeId: string,
  versionNumber: number,
  segments: DiarizedSegmentInput[],
  options?: { chunkSize?: number; chunkOverlap?: number }
): TranscriptChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  const chunks: TranscriptChunk[] = [];
  if (segments.length === 0) return chunks;

  let currentChunkSegments: DiarizedSegmentInput[] = [];
  let currentLength = 0;

  function emitChunk(segs: DiarizedSegmentInput[], chunkIdx: number) {
    if (segs.length === 0) return;

    const firstSeg = segs[0];
    const lastSeg = segs[segs.length - 1];

    const textPieces = segs.map((s) => `[${s.speakerLabel}] ${s.text}`);
    const chunkText = textPieces.join("\n");

    // Dominant language calculation
    const langCounts: Record<string, number> = {};
    for (const s of segs) {
      langCounts[s.languageCode] = (langCounts[s.languageCode] || 0) + s.text.length;
    }
    let dominantLang: PrimaryLanguage = firstSeg.languageCode;
    let maxCount = 0;
    for (const [lang, count] of Object.entries(langCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantLang = lang as PrimaryLanguage;
      }
    }

    const cId = chunkUlid();
    const vecId = `vec_${episodeId}_v${versionNumber}_${cId}`;
    const tokenCount = Math.max(1, Math.ceil(chunkText.length / 4));

    chunks.push({
      id: cId,
      chunkIndex: chunkIdx,
      vectorId: vecId,
      text: chunkText,
      startSec: firstSeg.startSec,
      endSec: lastSeg.endSec,
      startSegmentId: firstSeg.id,
      endSegmentId: lastSeg.id,
      tokenCount,
      languageCode: dominantLang,
      isActive: false,
    });
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segTextLen = seg.text.length + seg.speakerLabel.length + 4; // "[Speaker] Text\n"

    if (currentLength + segTextLen > chunkSize && currentChunkSegments.length > 0) {
      emitChunk(currentChunkSegments, chunks.length);

      // Slide window backward to achieve target overlap
      let overlapLen = 0;
      const overlapSegments: DiarizedSegmentInput[] = [];
      for (let j = currentChunkSegments.length - 1; j >= 0; j--) {
        const oSeg = currentChunkSegments[j];
        const oLen = oSeg.text.length + oSeg.speakerLabel.length + 4;
        if (overlapLen + oLen <= chunkOverlap || overlapSegments.length === 0) {
          overlapSegments.unshift(oSeg);
          overlapLen += oLen;
        } else {
          break;
        }
      }

      currentChunkSegments = [...overlapSegments];
      currentLength = overlapLen;
    }

    currentChunkSegments.push(seg);
    currentLength += segTextLen;
  }

  if (currentChunkSegments.length > 0) {
    emitChunk(currentChunkSegments, chunks.length);
  }

  return chunks;
}

/**
 * Generates vector embeddings for chunks in batches using Cloudflare Workers AI.
 */
export async function generateChunkEmbeddings(
  ai: WorkersAiBinding,
  chunks: TranscriptChunk[],
  episodeId: string,
  versionId: string,
  versionNumber: number,
  options?: StageTranscriptVersionOptions
): Promise<VectorizeRecord[]> {
  const model = options?.embeddingModel ?? DEFAULT_EMBEDDING_MODEL;
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const records: VectorizeRecord[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Call Workers AI for each chunk in the batch
    const embeddings = await Promise.all(
      batch.map(async (chunk) => {
        const response = await ai.run(model, { text: chunk.text });
        let vector: number[] = [];

        if (Array.isArray(response?.data)) {
          if (Array.isArray(response.data[0])) {
            vector = response.data[0] as number[];
          } else {
            vector = response.data as number[];
          }
        } else if (Array.isArray(response)) {
          vector = response as number[];
        }

        if (!vector || vector.length === 0) {
          throw new Error(`Workers AI returned empty embedding for chunk ${chunk.id}`);
        }

        return vector;
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const vector = embeddings[j];

      const publicVideoId = typeof options?.publicVideoId === "string"
        && /^[A-Za-z0-9_-]{11}$/.test(options.publicVideoId)
        ? options.publicVideoId
        : undefined;
      records.push({
        id: chunk.vectorId,
        values: vector,
        metadata: {
          episodeId,
          episode_id: episodeId,
          ...(publicVideoId ? { video_id: publicVideoId } : {}),
          ...(options?.sourceAssetId ? { source_asset_id: options.sourceAssetId } : {}),
          source_mode: options?.sourceMode ?? "published",
          versionId,
          versionNumber,
          chunkId: chunk.id,
          languageCode: chunk.languageCode,
          startSec: chunk.startSec,
          endSec: chunk.endSec,
          text: chunk.text.slice(0, 500), // Excerpt preview
        },
      });
    }
  }

  return records;
}

/**
 * Stages and atomically activates a transcript version in D1 and Vectorize.
 *
 * Steps:
 * 1. Idempotency Check: Computes SHA-256 of segments and compares against active version.
 * 2. Staging: Inserts transcript version (is_active = 0, state = 'staging') and segments into D1.
 * 3. Chunking & Embedding: Chunks segments, generates 1024-dim embeddings via Workers AI, and upserts vectors.
 * 4. Atomic Cutover: Batch updates D1 to deactivate old versions and activate version V_{N+1}.
 * 5. Vector Tombstoning: Deletes obsolete vector IDs from Vectorize and marks old versions 'tombstoned'.
 */
export async function stageAndActivateTranscriptVersion(
  db: DB,
  vectorize: VectorizeIndexBinding,
  ai: WorkersAiBinding,
  payload: TranscriptIngestJobPayload,
  segments: DiarizedSegmentInput[],
  options?: StageTranscriptVersionOptions
): Promise<VersionStagingResult> {
  const contentSha256 = await computeTranscriptSha256(segments);

  // 1. Idempotency Guard
  const activeVersion = await db
    .prepare("SELECT id, version_number, content_sha256 FROM transcript_versions WHERE episode_id = ? AND is_active = 1 LIMIT 1")
    .bind(payload.episodeId)
    .first<{ id: string; version_number: number; content_sha256: string }>();

  if (activeVersion && activeVersion.content_sha256 === contentSha256) {
    return {
      versionId: activeVersion.id,
      versionNumber: activeVersion.version_number,
      status: "skipped_unchanged",
      stagedSegmentsCount: segments.length,
      stagedChunksCount: 0,
      tombstonedVectorCount: 0,
      contentSha256,
    };
  }

  // 2. Determine Next Version Number
  const nextVerRow = await db
    .prepare("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM transcript_versions WHERE episode_id = ?")
    .bind(payload.episodeId)
    .first<{ next_ver: number }>();
  const nextVersionNumber = nextVerRow?.next_ver ?? 1;

  const versionId = transcriptVersionUlid();
  const coordinateSystem = payload.coordinateSystem ?? "uncut";

  // Assign IDs to segments if not present
  const preparedSegments = segments.map((seg, idx) => ({
    ...seg,
    id: seg.id ?? segmentUlid(),
    segmentIndex: seg.segmentIndex ?? idx,
  }));

  let wordCount = 0;
  for (const seg of preparedSegments) {
    const words = seg.text.trim().split(/\s+/).filter((w) => w.length > 0);
    wordCount += words.length;
  }

  // 3. Build Chunks and Generate Vector Embeddings
  const chunks = buildSlidingWindowChunks(
    versionId,
    payload.episodeId,
    nextVersionNumber,
    preparedSegments,
    options
  );

  let vectorRecords: VectorizeRecord[] = [];
  if (chunks.length > 0) {
    vectorRecords = await generateChunkEmbeddings(
      ai,
      chunks,
      payload.episodeId,
      versionId,
      nextVersionNumber,
      {
        ...options,
        publicVideoId: payload.publicVideoId,
        sourceAssetId: payload.sourceAssetId,
        sourceMode: coordinateSystem,
      }
    );

    // Upsert staged vectors into Vectorize
    if (vectorRecords.length > 0) {
      await vectorize.upsert(vectorRecords);
    }
  }

  // 4. Batch Staging in D1 (is_active = 0, state = 'staging')
  const stagingStatements: D1PreparedStatement[] = [];

  // 4a. Insert Transcript Version
  stagingStatements.push(
    db.prepare(`
      INSERT INTO transcript_versions (
        id, episode_id, version_number, source_asset_id, content_sha256,
        coordinate_system, total_segments, word_count, is_active, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'staging')
    `).bind(
      versionId,
      payload.episodeId,
      nextVersionNumber,
      payload.sourceAssetId,
      contentSha256,
      coordinateSystem,
      preparedSegments.length,
      wordCount
    )
  );

  // 4b. Insert Diarized Segments
  for (const seg of preparedSegments) {
    stagingStatements.push(
      db.prepare(`
        INSERT INTO transcript_segments (
          id, transcript_version_id, segment_index, start_sec, end_sec,
          speaker_label, speaker_operator_id, text, text_normalized,
          language_code, confidence, words_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        seg.id,
        versionId,
        seg.segmentIndex,
        seg.startSec,
        seg.endSec,
        seg.speakerLabel ?? "Speaker",
        seg.speakerOperatorId ?? null,
        seg.text,
        seg.textNormalized ?? seg.text.replace(/\s+/g, " "),
        seg.languageCode ?? "hi-Latn",
        seg.confidence ?? null,
        seg.wordsJson ?? (seg.words ? JSON.stringify(seg.words) : null)
      )
    );
  }

  // 4c. Insert Chunks in Staging State
  for (const chunk of chunks) {
    stagingStatements.push(
      db.prepare(`
        INSERT INTO transcript_chunks (
          id, transcript_version_id, chunk_index, vector_id, text,
          start_sec, end_sec, start_segment_id, end_segment_id,
          token_count, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(
        chunk.id,
        versionId,
        chunk.chunkIndex,
        chunk.vectorId,
        chunk.text,
        chunk.startSec ?? null,
        chunk.endSec ?? null,
        chunk.startSegmentId ?? null,
        chunk.endSegmentId ?? null,
        chunk.tokenCount
      )
    );
  }

  // Execute staging transaction
  await db.batch(stagingStatements);

  // 5. Atomic Activation Transaction
  const activationStatements: D1PreparedStatement[] = [
    // Archive currently active versions
    db.prepare(`
      UPDATE transcript_versions
      SET is_active = 0, state = 'archived'
      WHERE episode_id = ? AND is_active = 1
    `).bind(payload.episodeId),

    // Deactivate chunks of other versions
    db.prepare(`
      UPDATE transcript_chunks
      SET is_active = 0
      WHERE transcript_version_id IN (
        SELECT id FROM transcript_versions WHERE episode_id = ? AND id != ?
      )
    `).bind(payload.episodeId, versionId),

    // Activate the staged version
    db.prepare(`
      UPDATE transcript_versions
      SET is_active = 1, state = 'active', activated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND episode_id = ?
    `).bind(versionId, payload.episodeId),

    // Activate chunks for this version
    db.prepare(`
      UPDATE transcript_chunks
      SET is_active = 1
      WHERE transcript_version_id = ?
    `).bind(versionId),
  ];

  await db.batch(activationStatements);

  // 6. Obsolete Vector Tombstoning
  let tombstonedCount = 0;
  try {
    const obsoleteChunks = await db
      .prepare(`
        SELECT vector_id FROM transcript_chunks
        WHERE transcript_version_id IN (
          SELECT id FROM transcript_versions WHERE episode_id = ? AND is_active = 0
        )
      `)
      .bind(payload.episodeId)
      .all<{ vector_id: string }>();

    const obsoleteVectorIds = (obsoleteChunks.results || []).map((r) => r.vector_id);

    if (obsoleteVectorIds.length > 0) {
      await vectorize.deleteByIds(obsoleteVectorIds);
      tombstonedCount = obsoleteVectorIds.length;

      // Mark archived versions as tombstoned
      await db.prepare(`
        UPDATE transcript_versions
        SET state = 'tombstoned'
        WHERE episode_id = ? AND is_active = 0 AND state = 'archived'
      `).bind(payload.episodeId).run();
    }
  } catch (err: any) {
    console.warn(`[version-staging] Vector tombstoning warning for episode ${payload.episodeId}:`, err.message);
  }

  return {
    versionId,
    versionNumber: nextVersionNumber,
    status: "activated",
    stagedSegmentsCount: preparedSegments.length,
    stagedChunksCount: chunks.length,
    tombstonedVectorCount: tombstonedCount,
    contentSha256,
  };
}

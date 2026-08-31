/**
 * @file cloudflare/src/ingest/types.ts
 * @description Type definitions and data contracts for the Diarized Multi-Language Transcript Pipeline.
 */

import type { CoordinateSystem, PrimaryLanguage, TranscriptionEngine } from "../dto.ts";

/**
 * Payload sent to Cloudflare INGEST_QUEUE for transcript ingestion jobs.
 */
export interface TranscriptIngestJobPayload {
  jobId: string;
  episodeId: string;
  sourceAssetId: string;
  /** Published YouTube identity used by public episode-scoped retrieval. */
  publicVideoId?: string;
  transcriptR2Key: string;
  coordinateSystem: CoordinateSystem;
  engine: TranscriptionEngine;
  engineVersion: string;
  parameters?: Record<string, unknown>;
  diarizationEnabled: boolean;
  defaultLanguageCode?: PrimaryLanguage;
  initiatedByOperatorId?: number;
}

/**
 * Word-level timing alignment within a transcript segment.
 */
export interface DiarizedWord {
  word: string;
  startSec: number;
  endSec: number;
  confidence?: number;
}

/**
 * Normalized input segment parsed from ASR transcripts (JSON, WebVTT, SRT).
 */
export interface DiarizedSegmentInput {
  id?: string;
  segmentIndex: number;
  startSec: number;
  endSec: number;
  speakerLabel: string;
  speakerOperatorId?: number | null;
  text: string;
  textNormalized?: string;
  languageCode: PrimaryLanguage;
  confidence?: number;
  words?: DiarizedWord[];
  wordsJson?: string;
}

/**
 * Intermediate text chunk created via sliding-window for vector indexing.
 */
export interface TranscriptChunk {
  id: string; // chk_<ulid>
  chunkIndex: number;
  vectorId: string;
  text: string;
  startSec: number;
  endSec: number;
  startSegmentId?: string;
  endSegmentId?: string;
  tokenCount: number;
  languageCode: PrimaryLanguage;
  isActive?: boolean;
}

/**
 * Structure of a Vectorize vector record.
 */
export interface VectorizeRecord {
  id: string;
  values: number[];
  metadata: {
    episodeId: string;
    episode_id: string;
    video_id?: string;
    source_asset_id?: string;
    source_mode: CoordinateSystem;
    versionId: string;
    versionNumber: number;
    chunkId: string;
    languageCode: PrimaryLanguage;
    startSec: number;
    endSec: number;
    text: string;
    [key: string]: unknown;
  };
}

/**
 * Configuration options for version staging and chunking.
 */
export interface StageTranscriptVersionOptions {
  chunkSize?: number; // default 1000 characters
  chunkOverlap?: number; // default 150 characters
  embeddingModel?: string; // default @cf/baai/bge-large-en-v1.5
  batchSize?: number; // default 8
  publicVideoId?: string;
  sourceAssetId?: string;
  sourceMode?: CoordinateSystem;
}

/**
 * Result returned by the atomic version staging and activation lifecycle.
 */
export interface VersionStagingResult {
  versionId: string;
  versionNumber: number;
  status: "activated" | "skipped_unchanged";
  stagedSegmentsCount: number;
  stagedChunksCount: number;
  tombstonedVectorCount: number;
  contentSha256: string;
}

/**
 * Minimal interface for Cloudflare Workers AI binding.
 */
export interface WorkersAiBinding {
  run(model: string, input: { text: string | string[] } | Record<string, unknown>): Promise<{
    data?: number[][] | number[];
    shape?: number[];
    [key: string]: unknown;
  }>;
}

/**
 * Minimal interface for Cloudflare Vectorize binding.
 */
export interface VectorizeIndexBinding {
  upsert(vectors: VectorizeRecord[]): Promise<unknown>;
  deleteByIds(ids: string[]): Promise<unknown>;
  query(vector: number[], options?: { topK?: number; returnMetadata?: string | boolean; filter?: Record<string, unknown> }): Promise<{
    matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
    count?: number;
  }>;
}

/**
 * Minimal interface for Cloudflare R2 bucket binding.
 */
export interface R2BucketBinding {
  get(key: string): Promise<{
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: Record<string, unknown>): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
}

/**
 * Cloudflare Queue message interface.
 */
export interface QueueMessage<T = unknown> {
  readonly id?: string;
  readonly timestamp?: Date | number;
  readonly body: T;
  readonly attempts?: number;
  ack(): void;
  retry(): void;
}

/**
 * Cloudflare Queue batch interface.
 */
export interface MessageBatch<T = unknown> {
  readonly queue: string;
  readonly messages: readonly QueueMessage<T>[];
  ackAll(): void;
  retryAll(): void;
}

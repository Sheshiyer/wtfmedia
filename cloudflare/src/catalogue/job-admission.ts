import {
  parseJobSourceMode,
  resolveCatalogueJobIdentity,
  validateCatalogueJobBatch,
} from "./asset-map.ts";

export type TranscriptJob = {
  videoId: string;
  sourceAssetId?: string;
  title: string;
  transcriptKey: string;
  timestampsKey?: string;
  sourceContentHash?: string;
  contentHash: string;
  sourceMode?: "published" | "uncut";
  metadata?: Record<string, unknown>;
};

type QueueBinding = {
  sendBatch(messages: { body: TranscriptJob }[]): Promise<unknown>;
};

type D1Binding = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
    };
  };
};

export type JobAdmissionResult =
  | { ok: true; queued: number }
  | { ok: false; error: string };

export async function assertCatalogueJobSourceAsset(
  job: TranscriptJob,
  db: D1Binding,
): Promise<void> {
  const sourceMode = parseJobSourceMode(job.sourceMode);
  const identity = resolveCatalogueJobIdentity(
    job.videoId,
    job.transcriptKey,
    sourceMode,
    job.sourceAssetId,
  );
  const sourceContentHash = job.sourceContentHash ?? job.contentHash;
  if (
    !identity ||
    !/^[a-f0-9]{64}$/.test(job.contentHash) ||
    !/^[a-f0-9]{64}$/.test(sourceContentHash)
  ) {
    throw new Error("source_asset_unavailable");
  }
  const row = await db.prepare(`
    SELECT sa.id
    FROM episode_external_identities AS external
    JOIN source_assets AS sa ON sa.episode_id = external.episode_id
    WHERE external.platform = 'youtube'
      AND external.external_id = ?
      AND sa.storage_driver = 'r2'
      AND sa.storage_key = ?
      AND sa.content_sha256 = ?
      AND sa.availability = 'available'
    LIMIT 1
  `).bind(
    identity.publicVideoId,
    job.transcriptKey,
    sourceContentHash,
  ).first<{ id: string }>();
  if (!row?.id) throw new Error("source_asset_unavailable");
}

export async function admitTranscriptJobs(
  jobs: unknown,
  queue: QueueBinding,
  db: D1Binding,
): Promise<JobAdmissionResult> {
  if (!Array.isArray(jobs) || jobs.length === 0 || jobs.length > 100) {
    return { ok: false, error: "invalid_jobs" };
  }
  const invalidJob = validateCatalogueJobBatch(jobs);
  if (invalidJob) return { ok: false, error: invalidJob };
  try {
    for (const job of jobs as TranscriptJob[]) {
      await assertCatalogueJobSourceAsset(job, db);
    }
  } catch {
    return { ok: false, error: "source_asset_unavailable" };
  }
  await queue.sendBatch(jobs.map((body) => ({ body: body as TranscriptJob })));
  return { ok: true, queued: jobs.length };
}

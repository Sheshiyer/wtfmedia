import { validateCatalogueJobBatch } from "./asset-map.ts";

export type TranscriptJob = {
  videoId: string;
  sourceAssetId?: string;
  title: string;
  transcriptKey: string;
  timestampsKey?: string;
  contentHash: string;
  sourceMode?: "published" | "uncut";
};

type QueueBinding = {
  sendBatch(messages: { body: TranscriptJob }[]): Promise<unknown>;
};

export type JobAdmissionResult =
  | { ok: true; queued: number }
  | { ok: false; error: string };

export async function admitTranscriptJobs(
  jobs: unknown,
  queue: QueueBinding,
): Promise<JobAdmissionResult> {
  if (!Array.isArray(jobs) || jobs.length === 0 || jobs.length > 100) {
    return { ok: false, error: "invalid_jobs" };
  }
  const invalidJob = validateCatalogueJobBatch(jobs);
  if (invalidJob) return { ok: false, error: invalidJob };
  await queue.sendBatch(jobs.map((body) => ({ body: body as TranscriptJob })));
  return { ok: true, queued: jobs.length };
}

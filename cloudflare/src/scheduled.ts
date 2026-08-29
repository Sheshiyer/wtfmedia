import type { DB } from "./db.ts";
import { auditInsertStatement, encodeAudit, type Environment } from "./audit.ts";
import { syncYouTubeChannel, type YouTubeSyncOptions, type YouTubeSyncResult } from "./ingest/youtube-adapter.ts";

const dayMilliseconds = 86_400_000;

export const DEFAULT_YOUTUBE_CHANNELS: readonly string[] = Object.freeze([
  "UC_6vmsXQvU_Y1O6iFqH1_Xw", // WTF is with Nikhil Kamath
  "UCq-Fj5jknLsUf-MWSy4_brA", // Nikhil Kamath Clips / Secondary
]);

export function retentionDays(environment: Environment): 0 | 30 | 365 {
  if (environment === "production") return 365;
  if (environment === "staging") return 30;
  return 0;
}

export function retentionCutoff(environment: Environment, scheduledAt: Date): string {
  return new Date(scheduledAt.getTime() - retentionDays(environment) * dayMilliseconds).toISOString();
}

/**
 * Server-only scheduled work: the caller can supply a test clock, but never a
 * client cutoff. D1 batch is transactional: a failed delete also rolls back
 * the purge receipt.
 */
export async function purgeExpiredAudit(db: DB, environment: Environment, scheduledAt = new Date()): Promise<boolean> {
  const cutoff = retentionCutoff(environment, scheduledAt);
  const count = await db.prepare("SELECT COUNT(*) AS total FROM audit_events WHERE created_at < ?").bind(cutoff).first<{ total: number }>();
  const event = encodeAudit({
    action: "audit_purge", entityType: "audit", entityId: "retention", outcome: "succeeded", environment,
    correlationId: `audit-purge:${scheduledAt.toISOString()}`, metadata: { count: count?.total ?? 0, scope: "expired" },
  }, scheduledAt.toISOString());
  if (!event) return false;
  try {
    await db.batch([
      auditInsertStatement(db, event),
      db.prepare("DELETE FROM audit_events WHERE created_at < ?").bind(cutoff),
    ]);
    return true;
  } catch {
    return false;
  }
}

export interface ScheduledSyncSummary {
  totalChannels: number;
  syncedVideos: number;
  unchangedChannels: number;
  failedChannels: number;
  results: YouTubeSyncResult[];
}

/**
 * Cloudflare Worker scheduled cron handler for synchronizing approved YouTube channels.
 * Runs with KV ETag caching (<10 quota units/day) and idempotent D1 persistence.
 */
export async function syncYouTubeChannels(
  env: { WTFMEDIA_STATE?: any; YOUTUBE_API_KEY?: string; DB?: DB; YOUTUBE_CHANNELS?: string[] },
  db?: DB,
  options?: {
    channels?: string[];
    scheduledAt?: Date;
    fetchFn?: typeof fetch;
    force?: boolean;
    apiKey?: string;
  }
): Promise<ScheduledSyncSummary> {
  const targetDb = db ?? env.DB;
  const channels = options?.channels ?? env.YOUTUBE_CHANNELS ?? DEFAULT_YOUTUBE_CHANNELS;

  const results: YouTubeSyncResult[] = [];
  let syncedVideos = 0;
  let unchangedChannels = 0;
  let failedChannels = 0;

  const syncOptions: YouTubeSyncOptions = {
    db: targetDb,
    fetchFn: options?.fetchFn,
    force: options?.force,
    apiKey: options?.apiKey,
    scheduledAt: options?.scheduledAt ?? new Date(),
  };

  for (const channelId of channels) {
    try {
      const res = await syncYouTubeChannel(env, channelId, syncOptions);
      results.push(res);

      if (res.status === "completed") {
        syncedVideos += res.upsertedCount;
      } else if (res.status === "skipped_unchanged") {
        unchangedChannels++;
      } else {
        failedChannels++;
      }
    } catch (err: any) {
      failedChannels++;
      results.push({
        channelId,
        changed: false,
        items: [],
        upsertedCount: 0,
        status: "failed",
        error: err?.message || String(err),
      });
    }
  }

  return {
    totalChannels: channels.length,
    syncedVideos,
    unchangedChannels,
    failedChannels,
    results,
  };
}

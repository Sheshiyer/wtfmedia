/**
 * YouTube Data API v3 Ingestion Adapter for WTF OS.
 * Quota-optimized, read-only client with ETag caching in Cloudflare KV (WTFMEDIA_STATE),
 * Channel Uploads Playlist batch extraction (UU...), and idempotent D1 provenance persistence.
 */

import type { DB } from "../db.ts";
import {
  createIngestionJob,
  createSourceAsset,
  getEpisodeByExternalIdentity,
  recordExternalIdentity,
  updateIngestionJobStatus,
  upsertEpisode,
} from "../db/provenance.ts";
import type { EpisodeRecord, ExternalIdentityRecord } from "../dto.ts";
import { episodeUlid } from "../utils/ulid.ts";
import {
  extractGuestAndShow,
  generateEpisodeSlug,
  parseChapters,
  parseIsoDuration,
} from "./youtube-parser.ts";

export interface YouTubeVideoItem {
  id: string; // videoId
  title: string;
  description: string;
  publishedAt: string;
  durationStr: string; // ISO 8601 e.g. PT1H23M45S
  durationSeconds: number;
  thumbnailUrl: string | null;
  channelId: string;
  channelTitle: string;
  tags?: string[];
  viewCount?: number;
  likeCount?: number;
}

export interface YouTubeSyncOptions {
  /**
   * Ephemeral OAuth access token supplied by the authorized connection layer.
   * It is never read from client input or written to D1/KV by this adapter.
   */
  oauthAccessToken?: string;
  fetchFn?: typeof fetch;
  db?: DB;
  force?: boolean;
  maxResults?: number;
  scheduledAt?: Date;
}

export interface YouTubeSyncResult {
  channelId: string;
  changed: boolean;
  etag?: string | null;
  items: YouTubeVideoItem[];
  upsertedCount: number;
  status: "completed" | "skipped_unchanged" | "quota_exhausted" | "connection_required" | "failed";
  error?: string;
  jobId?: string;
}

/**
 * Computes a standard SHA-256 hex string (64 characters) using Web Crypto API.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Transforms a YouTube Channel ID (UC...) to its corresponding Uploads Playlist ID (UU...).
 */
export function channelIdToUploadsPlaylistId(channelId: string): string {
  if (channelId.startsWith("UC")) {
    return channelId.replace(/^UC/, "UU");
  }
  return channelId;
}

/**
 * Synchronizes video metadata for a single YouTube channel.
 * Uses KV ETag caching (yt:etag:<channelId>) to skip processing with HTTP 304 (<10 quota units/day).
 */
export async function syncYouTubeChannel(
  env: { WTFMEDIA_STATE?: any; DB?: DB },
  channelId: string,
  options: YouTubeSyncOptions = {}
): Promise<YouTubeSyncResult> {
  const fetchImpl = options.fetchFn ?? fetch;
  const oauthAccessToken = options.oauthAccessToken?.trim() ?? "";
  const db = options.db ?? env.DB;
  const maxResults = Math.min(options.maxResults ?? 50, 50);

  if (!oauthAccessToken) {
    return {
      channelId,
      changed: false,
      items: [],
      upsertedCount: 0,
      status: "connection_required",
      error: "YouTube OAuth authorization is not configured",
    };
  }

  // 1. Check for active quota backoff in KV
  if (env.WTFMEDIA_STATE) {
    const backoffUntilStr = await env.WTFMEDIA_STATE.get("yt:quota_backoff_until");
    if (backoffUntilStr) {
      const backoffUntil = parseInt(backoffUntilStr, 10);
      if (!isNaN(backoffUntil) && backoffUntil > Date.now()) {
        return {
          channelId,
          changed: false,
          items: [],
          upsertedCount: 0,
          status: "quota_exhausted",
          error: "YouTube API quota backoff active until " + new Date(backoffUntil).toISOString(),
        };
      }
    }
  }

  // 2. Derive Uploads Playlist ID (UC... -> UU...)
  const uploadsPlaylistId = channelIdToUploadsPlaylistId(channelId);

  // 3. Read cached ETag from KV
  const kvEtagKey = `yt:etag:${channelId}`;
  let cachedEtag: string | null = null;
  if (env.WTFMEDIA_STATE && !options.force) {
    cachedEtag = await env.WTFMEDIA_STATE.get(kvEtagKey);
  }

  // 4. Call playlistItems.list with If-None-Match header
  const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  playlistUrl.searchParams.set("part", "snippet,contentDetails");
  playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
  playlistUrl.searchParams.set("maxResults", String(maxResults));

  const playlistHeaders: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${oauthAccessToken}`,
  };
  if (cachedEtag && !options.force) {
    playlistHeaders["If-None-Match"] = cachedEtag;
  }

  let playlistRes: Response;
  try {
    playlistRes = await fetchImpl(playlistUrl.toString(), {
      method: "GET",
      headers: playlistHeaders,
    });
  } catch (netErr: any) {
    return {
      channelId,
      changed: false,
      items: [],
      upsertedCount: 0,
      status: "failed",
      error: `Network error calling playlistItems.list: ${netErr?.message || netErr}`,
    };
  }

  // 5. Handle HTTP 304 Not Modified -> Fast exit with 0 DB writes & 0 additional quota
  if (playlistRes.status === 304) {
    return {
      channelId,
      changed: false,
      etag: cachedEtag,
      items: [],
      upsertedCount: 0,
      status: "skipped_unchanged",
    };
  }

  // 6. Handle HTTP 403 / 429 Quota exhaustion
  if (playlistRes.status === 403 || playlistRes.status === 429) {
    if (env.WTFMEDIA_STATE) {
      const backoffMs = Date.now() + 3600_000; // 1 hour backoff
      await env.WTFMEDIA_STATE.put("yt:quota_backoff_until", String(backoffMs), {
        expirationTtl: 3600,
      });
    }
    return {
      channelId,
      changed: false,
      items: [],
      upsertedCount: 0,
      status: "quota_exhausted",
      error: `YouTube API returned HTTP ${playlistRes.status} (Quota Exceeded)`,
    };
  }

  if (!playlistRes.ok) {
    const errBody = await playlistRes.text().catch(() => "");
    return {
      channelId,
      changed: false,
      items: [],
      upsertedCount: 0,
      status: "failed",
      error: `YouTube API playlistItems error ${playlistRes.status}: ${errBody}`,
    };
  }

  // 7. Parse playlist items response and extract ETag
  const responseEtag = playlistRes.headers.get("ETag") || playlistRes.headers.get("etag");
  let playlistData: any;
  try {
    playlistData = await playlistRes.json();
  } catch (jsonErr: any) {
    return {
      channelId,
      changed: false,
      items: [],
      upsertedCount: 0,
      status: "failed",
      error: `Failed to parse playlistItems JSON: ${jsonErr?.message}`,
    };
  }

  const items = Array.isArray(playlistData?.items) ? playlistData.items : [];
  const videoIds: string[] = [];
  for (const item of items) {
    const vId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
    if (vId && typeof vId === "string" && !videoIds.includes(vId)) {
      videoIds.push(vId);
    }
  }

  if (videoIds.length === 0) {
    const newEtag = responseEtag || playlistData?.etag || null;
    if (newEtag && env.WTFMEDIA_STATE) {
      await env.WTFMEDIA_STATE.put(kvEtagKey, newEtag);
    }
    return {
      channelId,
      changed: true,
      etag: newEtag,
      items: [],
      upsertedCount: 0,
      status: "completed",
    };
  }

  // 8. Fetch video details via videos.list in batches of up to 50 IDs (costs 1 unit per 50 videos)
  const videoItems: YouTubeVideoItem[] = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
    const chunk = videoIds.slice(i, i + CHUNK_SIZE);
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,contentDetails,statistics");
    videosUrl.searchParams.set("id", chunk.join(","));

    let videosRes: Response;
    try {
      videosRes = await fetchImpl(videosUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${oauthAccessToken}`,
        },
      });
    } catch (vErr: any) {
      return {
        channelId,
        changed: false,
        items: videoItems,
        upsertedCount: 0,
        status: "failed",
        error: `Network error calling videos.list: ${vErr?.message}`,
      };
    }

    if (videosRes.status === 403 || videosRes.status === 429) {
      if (env.WTFMEDIA_STATE) {
        await env.WTFMEDIA_STATE.put("yt:quota_backoff_until", String(Date.now() + 3600_000), {
          expirationTtl: 3600,
        });
      }
      return {
        channelId,
        changed: false,
        items: videoItems,
        upsertedCount: 0,
        status: "quota_exhausted",
        error: `YouTube API videos.list returned HTTP ${videosRes.status} (Quota Exceeded)`,
      };
    }

    if (!videosRes.ok) {
      const vErrBody = await videosRes.text().catch(() => "");
      return {
        channelId,
        changed: false,
        items: videoItems,
        upsertedCount: 0,
        status: "failed",
        error: `YouTube API videos.list error ${videosRes.status}: ${vErrBody}`,
      };
    }

    const videosData = await videosRes.json();
    const fetchedVideos = Array.isArray(videosData?.items) ? videosData.items : [];

    for (const v of fetchedVideos) {
      const id = v?.id;
      if (!id) continue;
      const snippet = v?.snippet ?? {};
      const contentDetails = v?.contentDetails ?? {};
      const statistics = v?.statistics ?? {};

      const durationStr = contentDetails?.duration ?? "PT0S";
      const durationSeconds = parseIsoDuration(durationStr);

      const thumbnails = snippet?.thumbnails ?? {};
      const thumbUrl =
        thumbnails?.maxres?.url ||
        thumbnails?.high?.url ||
        thumbnails?.medium?.url ||
        thumbnails?.default?.url ||
        null;

      videoItems.push({
        id,
        title: snippet?.title ?? "Untitled Episode",
        description: snippet?.description ?? "",
        publishedAt: snippet?.publishedAt ?? new Date().toISOString(),
        durationStr,
        durationSeconds,
        thumbnailUrl: thumbUrl,
        channelId: snippet?.channelId ?? channelId,
        channelTitle: snippet?.channelTitle ?? "",
        tags: Array.isArray(snippet?.tags) ? snippet.tags : [],
        viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
        likeCount: statistics?.likeCount ? parseInt(statistics.likeCount, 10) : undefined,
      });
    }
  }

  // 9. Store new ETag in KV
  const finalEtag = responseEtag || playlistData?.etag || null;
  if (finalEtag && env.WTFMEDIA_STATE) {
    await env.WTFMEDIA_STATE.put(kvEtagKey, finalEtag);
  }

  // 10. Persist into D1 if database handle is available
  let upsertedCount = 0;
  let jobId: string | undefined;

  if (db && videoItems.length > 0) {
    // Record ingestion job in D1
    const job = await createIngestionJob(db, {
      jobType: "youtube_metadata_sync",
      status: "running",
      payload: { channelId, videoCount: videoItems.length },
    });
    jobId = job.id;

    try {
      for (const item of videoItems) {
        await ingestSingleYouTubeVideo(db, item);
        upsertedCount++;
      }

      await updateIngestionJobStatus(db, jobId, {
        status: "completed",
        payload: { channelId, videoCount: videoItems.length, upsertedCount },
      });
    } catch (dbErr: any) {
      await updateIngestionJobStatus(db, jobId, {
        status: "failed",
        errorMessage: dbErr?.message || String(dbErr),
      });
      return {
        channelId,
        changed: true,
        etag: finalEtag,
        items: videoItems,
        upsertedCount,
        status: "failed",
        error: `Database upsert failed: ${dbErr?.message}`,
        jobId,
      };
    }
  }

  return {
    channelId,
    changed: true,
    etag: finalEtag,
    items: videoItems,
    upsertedCount,
    status: "completed",
    jobId,
  };
}

/**
 * Ingests or updates a single YouTube video record into the D1 provenance spine.
 * Performs idempotent resolution via (platform, external_id) preventing duplicate episodes.
 */
export async function ingestSingleYouTubeVideo(
  db: DB,
  item: YouTubeVideoItem
): Promise<{ episode: EpisodeRecord; identity: ExternalIdentityRecord }> {
  // 1. Check if external identity already exists in D1
  const existingEpisode = await getEpisodeByExternalIdentity(db, "youtube", item.id);

  // 2. Parse chapters and metadata
  const durationSeconds = item.durationSeconds > 0 ? item.durationSeconds : parseIsoDuration(item.durationStr);
  const chapters = parseChapters(item.description, durationSeconds);
  const extracted = extractGuestAndShow(item.title, item.description, item.channelTitle);
  const urlHash = await sha256Hex(`https://www.youtube.com/watch?v=${item.id}`);

  let episode: EpisodeRecord;

  if (existingEpisode) {
    // Update existing episode metadata in place without creating new row
    episode = await upsertEpisode(db, {
      id: existingEpisode.id,
      slug: existingEpisode.slug,
      title: item.title,
      ip: extracted.ip,
      showTitle: extracted.showTitle,
      contentBucket: extracted.contentBucket,
      primaryLanguage: extracted.primaryLanguage,
      productionStatus: "published",
      publishedAt: item.publishedAt,
      durationSeconds,
      thumbnailUrl: item.thumbnailUrl,
      description: item.description,
      chapters,
    });
  } else {
    // Insert brand new canonical episode record
    const newId = episodeUlid();
    const slug = generateEpisodeSlug(item.title, item.id);
    episode = await upsertEpisode(db, {
      id: newId,
      slug,
      title: item.title,
      ip: extracted.ip,
      showTitle: extracted.showTitle,
      contentBucket: extracted.contentBucket,
      primaryLanguage: extracted.primaryLanguage,
      productionStatus: "published",
      publishedAt: item.publishedAt,
      durationSeconds,
      thumbnailUrl: item.thumbnailUrl,
      description: item.description,
      chapters,
    });
  }

  // 3. Idempotently record external identity
  const identity = await recordExternalIdentity(db, {
    episodeId: episode.id,
    platform: "youtube",
    externalId: item.id,
    externalUrlHash: urlHash,
    channelId: item.channelId,
    isPrimary: true,
    metadata: {
      tags: item.tags,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      channelTitle: item.channelTitle,
    },
  });

  // 4. Create or update source_asset record for published YouTube video
  const assetSha256 = await sha256Hex(`youtube:${item.id}`);
  await createSourceAsset(db, {
    episodeId: episode.id,
    assetType: "youtube_video",
    storageDriver: "external_youtube",
    storageKey: `https://www.youtube.com/watch?v=${item.id}`,
    contentSha256: assetSha256,
    durationSeconds,
    mimeType: "video/mp4",
    authority: "youtube_official",
    availability: "available",
  });

  return { episode, identity };
}

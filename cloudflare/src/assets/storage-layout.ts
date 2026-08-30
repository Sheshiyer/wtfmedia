/**
 * Canonical Cloudflare R2 Storage Layout & Integrity Coordinator.
 * Enforces deterministic immutable path structures, strict MIME whitelisting,
 * byte size constraints, and cryptographic SHA-256 validation for all media assets.
 *
 * Requirements: PROV-03, PROV-11, QUAL-05, QUAL-12
 */

import type { SourceAssetType } from "../dto.ts";

/**
 * Whitelist of allowed MIME types for podcast media, captions, and metadata.
 */
export const ALLOWED_MIME_TYPES = new Set<string>([
  // Audio
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/m4a",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Captions & Subtitles
  "text/vtt",
  "application/x-subrip",
  "text/plain",
  "text/srt",
  // Transcripts & Metadata
  "application/json",
  "text/markdown",
]);

/**
 * Strict maximum byte sizes by asset category.
 * Video: 5GB
 * Audio: 500MB
 * Captions & Transcripts: 50MB
 * Metadata & Sidecars: 10MB
 */
export const MAX_ASSET_SIZE_BYTES = Object.freeze({
  uncut_video: 5 * 1024 * 1024 * 1024, // 5 GB
  youtube_video: 5 * 1024 * 1024 * 1024, // 5 GB
  published_video: 5 * 1024 * 1024 * 1024, // 5 GB
  uncut_audio: 500 * 1024 * 1024, // 500 MB
  published_audio: 500 * 1024 * 1024, // 500 MB
  captions_srt: 50 * 1024 * 1024, // 50 MB
  captions_vtt: 50 * 1024 * 1024, // 50 MB
  transcript: 50 * 1024 * 1024, // 50 MB
  transcripts: 50 * 1024 * 1024, // 50 MB
  sidecar_metadata: 10 * 1024 * 1024, // 10 MB
  editorial_notes: 10 * 1024 * 1024, // 10 MB
});

/**
 * Returns the maximum allowed byte size for a given asset type.
 */
export function getMaxAssetSizeBytes(assetType: string): number {
  const normalized = assetType.toLowerCase();
  if (normalized in MAX_ASSET_SIZE_BYTES) {
    return (MAX_ASSET_SIZE_BYTES as Record<string, number>)[normalized];
  }
  if (normalized.includes("video")) return 5 * 1024 * 1024 * 1024;
  if (normalized.includes("audio")) return 500 * 1024 * 1024;
  if (normalized.includes("caption") || normalized.includes("transcript") || normalized.includes("srt") || normalized.includes("vtt")) {
    return 50 * 1024 * 1024;
  }
  if (normalized.includes("metadata") || normalized.includes("notes") || normalized.includes("manifest")) {
    return 10 * 1024 * 1024;
  }
  return 50 * 1024 * 1024; // Default fallback: 50 MB
}

/**
 * Validates whether a given MIME type is within the permitted whitelist.
 */
export function isValidMimeType(mimeType: string): boolean {
  if (typeof mimeType !== "string" || !mimeType.trim()) return false;
  const cleanMime = mimeType.toLowerCase().split(";")[0].trim();
  return ALLOWED_MIME_TYPES.has(cleanMime);
}

/**
 * Validates whether the byte size is positive and within the maximum limit.
 */
export function isByteSizeAllowed(byteSize: number, assetType: string): boolean {
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) return false;
  const maxLimit = getMaxAssetSizeBytes(assetType);
  return byteSize <= maxLimit;
}

/**
 * Sanitizes and normalizes a file extension string.
 */
export function sanitizeExtension(ext: string): string {
  const clean = ext.replace(/^\./, "").toLowerCase().trim();
  if (!/^[a-z0-9]{1,10}$/.test(clean)) {
    throw new Error("invalid_extension");
  }
  return clean;
}

/**
 * Computes the SHA-256 hex digest of an ArrayBuffer, Uint8Array, or UTF-8 string.
 */
export async function computeSha256(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else {
    bytes = new Uint8Array(data);
  }
  const digestBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies that the computed SHA-256 digest of data matches the expected hash.
 */
export async function verifySha256(data: ArrayBuffer | Uint8Array | string, expectedSha256: string): Promise<boolean> {
  if (!expectedSha256 || typeof expectedSha256 !== "string" || !/^[a-fA-F0-9]{64}$/.test(expectedSha256)) {
    return false;
  }
  const actual = await computeSha256(data);
  return actual.toLowerCase() === expectedSha256.toLowerCase();
}

/**
 * Generates the canonical R2 storage key for an episode asset.
 *
 * Conventions:
 * - Uncut audio: episodes/${episodeId}/assets/uncut/audio_${contentShaPrefix}.${ext}
 * - Uncut video: episodes/${episodeId}/assets/uncut/video_${contentShaPrefix}.${ext}
 * - Published audio: episodes/${episodeId}/assets/published/audio_${contentShaPrefix}.${ext}
 * - Published video / YouTube: episodes/${episodeId}/assets/published/video_${contentShaPrefix}.${ext}
 * - Captions / Subtitles: episodes/${episodeId}/assets/captions/sub_${contentShaPrefix}.${ext}
 * - Transcripts: episodes/${episodeId}/transcripts/txv_${contentShaPrefix}.json
 * - Sidecar metadata: episodes/${episodeId}/metadata/manifest_${contentShaPrefix}.json
 * - Editorial notes: episodes/${episodeId}/metadata/notes_${contentShaPrefix}.${ext}
 */
export function getAssetR2Key(
  episodeId: string,
  assetType: SourceAssetType | string,
  contentSha256: string,
  ext?: string
): string {
  if (!episodeId || typeof episodeId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(episodeId)) {
    throw new Error("invalid_episode_id");
  }
  if (!contentSha256 || typeof contentSha256 !== "string" || !/^[a-fA-F0-9]{16,64}$/.test(contentSha256)) {
    throw new Error("invalid_content_sha256");
  }

  const hashPrefix = contentSha256.toLowerCase().slice(0, 16);
  const normalizedType = assetType.toLowerCase();

  switch (normalizedType) {
    case "uncut_audio": {
      const cleanExt = ext ? sanitizeExtension(ext) : "wav";
      return `episodes/${episodeId}/assets/uncut/audio_${hashPrefix}.${cleanExt}`;
    }
    case "uncut_video": {
      const cleanExt = ext ? sanitizeExtension(ext) : "mp4";
      return `episodes/${episodeId}/assets/uncut/video_${hashPrefix}.${cleanExt}`;
    }
    case "published_audio": {
      const cleanExt = ext ? sanitizeExtension(ext) : "mp3";
      return `episodes/${episodeId}/assets/published/audio_${hashPrefix}.${cleanExt}`;
    }
    case "youtube_video":
    case "published_video": {
      const cleanExt = ext ? sanitizeExtension(ext) : "mp4";
      return `episodes/${episodeId}/assets/published/video_${hashPrefix}.${cleanExt}`;
    }
    case "captions_srt": {
      const cleanExt = ext ? sanitizeExtension(ext) : "srt";
      return `episodes/${episodeId}/assets/captions/sub_${hashPrefix}.${cleanExt}`;
    }
    case "captions_vtt":
    case "captions": {
      const cleanExt = ext ? sanitizeExtension(ext) : "vtt";
      return `episodes/${episodeId}/assets/captions/sub_${hashPrefix}.${cleanExt}`;
    }
    case "transcript":
    case "transcripts":
    case "transcript_version": {
      return `episodes/${episodeId}/transcripts/txv_${hashPrefix}.json`;
    }
    case "sidecar_metadata":
    case "metadata": {
      return `episodes/${episodeId}/metadata/manifest_${hashPrefix}.json`;
    }
    case "editorial_notes":
    case "notes": {
      const cleanExt = ext ? sanitizeExtension(ext) : "md";
      return `episodes/${episodeId}/metadata/notes_${hashPrefix}.${cleanExt}`;
    }
    default: {
      const cleanExt = ext ? sanitizeExtension(ext) : "bin";
      return `episodes/${episodeId}/assets/misc/asset_${hashPrefix}.${cleanExt}`;
    }
  }
}

export interface ParsedR2Key {
  episodeId: string;
  category: "assets" | "transcripts" | "metadata";
  subCategory?: "uncut" | "published" | "captions" | "misc";
  filename: string;
  hashPrefix: string;
  ext: string;
  canonicalKey: string;
}

/**
 * Parses and validates an R2 storage key, ensuring strict compliance with
 * naming conventions and rejecting directory traversal or malicious characters.
 */
export function parseAssetR2Key(key: string): ParsedR2Key | null {
  if (!key || typeof key !== "string") return null;

  // Reject path traversal, backslashes, double slashes, null bytes, absolute paths
  if (
    key.includes("..") ||
    key.includes("//") ||
    key.includes("\\") ||
    key.includes("\0") ||
    key.startsWith("/") ||
    key.endsWith("/")
  ) {
    return null;
  }

  // Regex pattern matching canonical R2 paths
  const pattern = /^episodes\/([a-zA-Z0-9_-]+)\/(assets\/(uncut|published|captions|misc)|transcripts|metadata)\/([a-zA-Z0-9_-]+)\.([a-zA-Z0-9]+)$/;
  const match = key.match(pattern);
  if (!match) return null;

  const episodeId = match[1];
  const fullCategory = match[2];
  const filename = match[4];
  const ext = match[5];

  let category: ParsedR2Key["category"] = "assets";
  let subCategory: ParsedR2Key["subCategory"];

  if (fullCategory.startsWith("assets/")) {
    category = "assets";
    subCategory = match[3] as ParsedR2Key["subCategory"];
  } else if (fullCategory === "transcripts") {
    category = "transcripts";
  } else if (fullCategory === "metadata") {
    category = "metadata";
  }

  // Extract hash prefix from filename (e.g., audio_abcdef0123456789 -> abcdef0123456789)
  const hashMatch = filename.match(/(?:audio|video|sub|txv|manifest|notes|asset)_([a-fA-F0-9]{16})/);
  const hashPrefix = hashMatch ? hashMatch[1].toLowerCase() : "";

  return {
    episodeId,
    category,
    subCategory,
    filename,
    hashPrefix,
    ext,
    canonicalKey: key,
  };
}

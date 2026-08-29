/**
 * Metadata parser utilities for YouTube ingestion in WTF OS.
 * Handles ISO 8601 duration parsing, chapter timestamp extraction,
 * guest name extraction, and show/IP taxonomy classification.
 */

import type { ChapterEntry, ContentBucket, PrimaryLanguage } from "../dto.ts";

/**
 * Converts an ISO 8601 duration string (e.g., PT1H23M45S, PT58M10S, PT45S, P1DT2H)
 * into total integer seconds.
 */
export function parseIsoDuration(durationStr: string | null | undefined): number {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const trimmed = durationStr.trim();
  if (!trimmed) return 0;

  // Regex matching standard ISO 8601 duration: P[n]DT[n]H[n]M[n]S or PT[n]H[n]M[n]S
  const match = trimmed.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (!match) return 0;

  const days = parseFloat(match[1] || "0");
  const hours = parseFloat(match[2] || "0");
  const minutes = parseFloat(match[3] || "0");
  const seconds = parseFloat(match[4] || "0");

  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return Math.floor(totalSeconds);
}

/**
 * Parses timestamp string (HH:MM:SS or MM:SS) into seconds.
 */
export function parseTimestampToSeconds(ts: string): number | null {
  if (!ts || typeof ts !== "string") return null;
  const clean = ts.trim();
  const parts = clean.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

/**
 * Parses chapter markers from a YouTube video description.
 * Scans for timestamp patterns (HH:MM:SS or MM:SS), enforces monotonicity,
 * computes start and end seconds, and optionally bounds against total video duration.
 */
export function parseChapters(
  description: string | null | undefined,
  durationSeconds?: number | null
): ChapterEntry[] {
  if (!description || typeof description !== "string") return [];

  const lines = description.split(/\r?\n/);
  const rawChapters: Array<{ title: string; startSec: number }> = [];

  // Match lines containing timestamp at the start or after standard bullet markers
  // Examples:
  // 00:00 - Introduction
  // 01:23:45 Deep Dive
  // [05:12] Topic Title
  // (10:45) Topic Title
  // 1. 00:00 Intro
  // • 04:30 Market analysis
  const lineRegex = /^(?:[•*\-\d\.\s\[\(]*?)((?:\d{1,2}:)?\d{1,2}:\d{2})(?:[\]\)\s\-–—|:]+)(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(lineRegex);
    if (!match) continue;

    const tsStr = match[1];
    let titleStr = match[2].trim();

    // Clean title string: remove leading/trailing punctuation and markdown artifacts
    titleStr = titleStr
      .replace(/^[\s\-–—|:\]\)]+/, "")
      .replace(/[\s\-–—|:\[\(]+$/, "")
      .trim();

    if (!titleStr) continue;

    const startSec = parseTimestampToSeconds(tsStr);
    if (startSec === null || startSec < 0) continue;

    // Bound check if durationSeconds is provided
    if (typeof durationSeconds === "number" && durationSeconds > 0 && startSec > durationSeconds) {
      continue;
    }

    // Monotonicity check: chapters must have strictly increasing timestamps
    if (rawChapters.length > 0) {
      const prevSec = rawChapters[rawChapters.length - 1].startSec;
      if (startSec <= prevSec) {
        // Non-monotonic or duplicate timestamp -> skip out-of-order entry
        continue;
      }
    }

    rawChapters.push({ title: titleStr, startSec });
  }

  if (rawChapters.length === 0) return [];

  // Build final ChapterEntry list with computed endSec
  const chapters: ChapterEntry[] = [];
  for (let i = 0; i < rawChapters.length; i++) {
    const current = rawChapters[i];
    let endSec: number | undefined = undefined;

    if (i < rawChapters.length - 1) {
      endSec = rawChapters[i + 1].startSec;
    } else if (typeof durationSeconds === "number" && durationSeconds > current.startSec) {
      endSec = durationSeconds;
    }

    chapters.push({
      title: current.title,
      startSec: current.startSec,
      ...(endSec !== undefined ? { endSec } : {}),
    });
  }

  return chapters;
}

export interface ExtractedGuestAndShow {
  guests: string[];
  showTitle: string;
  contentBucket: ContentBucket;
  ip: string;
  primaryLanguage: PrimaryLanguage;
}

/**
 * Extracts guest names, show bucket, IP taxonomy, and primary language from video metadata.
 */
export function extractGuestAndShow(
  title: string,
  description?: string,
  channelTitle?: string
): ExtractedGuestAndShow {
  const safeTitle = title || "";
  const safeDesc = description || "";
  const safeChannel = channelTitle || "";

  // 1. Determine show title, content bucket, and IP taxonomy
  let showTitle = "WTF Podcast";
  let contentBucket: ContentBucket = "podcast";
  let ip = "WTF";

  const lowerTitle = safeTitle.toLowerCase();
  const lowerDesc = safeDesc.toLowerCase();
  const lowerChannel = safeChannel.toLowerCase();
  const combinedText = `${lowerTitle} ${lowerChannel} ${lowerDesc.slice(0, 500)}`;

  if (combinedText.includes("people by wtf")) {
    showTitle = "People by WTF";
    contentBucket = "podcast";
    ip = "People by WTF";
  } else if (combinedText.includes("wtf is finance")) {
    showTitle = "WTF is Finance";
    contentBucket = "finance";
    ip = "WTF is Finance";
  } else if (combinedText.includes("special episode") || lowerTitle.startsWith("special:")) {
    showTitle = "Special Episodes";
    contentBucket = "special";
    ip = "WTF Specials";
  } else if (combinedText.includes("wtf online") || (combinedText.includes("online") && combinedText.includes("wtf"))) {
    showTitle = "WTF Online";
    contentBucket = "online";
    ip = "WTF Online";
  } else if (lowerTitle.includes("#shorts") || lowerTitle.includes(" #short") || lowerChannel.includes("clips") || lowerTitle.includes("clip")) {
    showTitle = "WTF Clips";
    contentBucket = lowerTitle.includes("#shorts") || lowerTitle.includes(" #short") ? "short" : "clip";
    ip = "WTF Clips";
  } else if (combinedText.includes("podcasts by wtf") || combinedText.includes("wtf is podcast") || combinedText.includes("wtf is with nikhil kamath")) {
    showTitle = "WTF Podcast";
    contentBucket = "podcast";
    ip = "WTF";
  }

  // 2. Extract guests
  const guests: string[] = [];
  const knownHosts = new Set(["nikhil kamath", "nikhil", "kamath"]);

  function addGuestName(name: string) {
    const cleaned = name
      .replace(/^[\s\-–—|:,&]+/, "")
      .replace(/[\s\-–—|:,&]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length < 2 || cleaned.length > 60) return;
    if (knownHosts.has(cleaned.toLowerCase())) return;
    // Filter out common non-name words
    const lower = cleaned.toLowerCase();
    if (lower.startsWith("episode") || lower.startsWith("ep ") || lower.startsWith("part ") || lower.includes("podcast")) return;
    if (!guests.includes(cleaned)) {
      guests.push(cleaned);
    }
  }

  // Check title for guest patterns:
  // "Ft. [Guests]" / "feat. [Guests]" / "featuring [Guests]"
  const ftMatch = safeTitle.match(/(?:ft\.|feat\.|featuring|guests?:)\s+([^|\n#\(\)]+)/i);
  if (ftMatch) {
    const guestChunk = ftMatch[1];
    const parts = guestChunk.split(/[,&/]| and /i);
    for (const part of parts) {
      addGuestName(part);
    }
  }

  // "Nikhil Kamath with [Guest]" or "[Show] with [Guest]"
  const withMatch = safeTitle.match(/(?:with)\s+([A-Z][a-zA-Z\s\.\-]+?)(?:\s+(?:\||#|\()|\s+-\s+|\n|$)/);
  if (withMatch && guests.length === 0) {
    const parts = withMatch[1].split(/[,&/]| and /i);
    for (const part of parts) {
      addGuestName(part);
    }
  }

  // Check description if title didn't contain explicit guests
  if (guests.length === 0) {
    const descGuestMatch = safeDesc.match(/(?:guests?|featuring|in conversation with)[:\s]+([^\n\r.]+)/i);
    if (descGuestMatch) {
      const parts = descGuestMatch[1].split(/[,&/]| and /i);
      for (const part of parts) {
        addGuestName(part);
      }
    }
  }

  // 3. Detect primary language
  // Check for Devanagari script: \u0900-\u097F
  let primaryLanguage: PrimaryLanguage = "hi-Latn";
  const devanagariCount = (safeTitle.match(/[\u0900-\u097F]/g) || []).length + (safeDesc.slice(0, 1000).match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCount > 20) {
    primaryLanguage = "hi";
  } else {
    // Check if primarily English or Hinglish (hi-Latn is default standard for WTF episodes)
    const hindiWordMatch = /\b(?:kya|hai|hum|bhai|aap|crore|lakh|paisa|jugaad|kar|rahe|hota|nahi|kaise|karo)\b/i.test(combinedText);
    if (hindiWordMatch) {
      primaryLanguage = "hi-Latn";
    } else {
      // Default standard for WTF OS provenance is hi-Latn, or en if strictly English
      primaryLanguage = "hi-Latn";
    }
  }

  return {
    guests,
    showTitle,
    contentBucket,
    ip,
    primaryLanguage,
  };
}

/**
 * Generates a clean URL slug from title and external video ID.
 */
export function generateEpisodeSlug(title: string, externalId?: string): string {
  const base = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Keep the complete external identity in the suffix so distinct provider IDs
  // cannot collapse to the same slug after an arbitrary 11-character trim.
  const idSuffix = externalId ? `-${externalId.slice(0, 64)}` : "";
  const baseLimit = Math.max(2, 150 - idSuffix.length);
  const combined = `${base.slice(0, baseLimit).replace(/-+$/, "")}${idSuffix}`
    .slice(0, 150)
    .replace(/-+$/, "");

  if (combined.length < 2) {
    return `ep-${externalId || "untitled"}`;
  }
  return combined;
}

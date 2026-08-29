/**
 * @file cloudflare/src/ingest/transcript-consumer.ts
 * @description Cloudflare Queue Consumer for Diarized Multilingual Transcript Ingestion.
 * Implements regex language classification (en, hi, hi-Latn, mixed), ASR format parsing (JSON, VTT, SRT),
 * timing monotonicity validation, D1 job state ledger tracking, and DLQ error routing.
 */

import type { DB } from "../db.ts";
import type { PrimaryLanguage } from "../dto.ts";
import { updateIngestionJobStatus } from "../db/provenance.ts";
import type {
  DiarizedSegmentInput,
  DiarizedWord,
  QueueMessage,
  R2BucketBinding,
  TranscriptIngestJobPayload,
  VectorizeIndexBinding,
  WorkersAiBinding,
} from "./types.ts";
import { stageAndActivateTranscriptVersion } from "./version-staging.ts";

/**
 * Phonetic Hinglish vocabulary patterns (Latin script representation of common Hindi tokens).
 */
const HINGLISH_TOKEN_REGEX = /\b(bhai|bhaiya|bhabhi|crore|crores|cr|lakh|lakhs|kya|nahi|nahin|na|yaar|matlab|acha|accha|achha|theek|thik|haan|suno|arre|are|arrey|kaise|kaisa|kaisi|karo|karna|karta|karte|karti|hoga|hogi|hoge|honge|hain|hai|tha|thi|the|mujhe|mera|meri|mere|tum|tumhe|tumhara|tumhari|aap|aapka|aapki|aapke|hum|humara|humari|humare|unka|unki|unke|unhe|use|isko|usko|kyun|kyu|bolo|bol|dekho|dekh|chalo|chal|paisa|paise|jugaad|desh|dost|waise|sabse|lekin|magar|aur|ab|kab|jab|tab|kuch|bahut|bohot|thoda|thodi|zyada|jyada|sahi|galat|beta|saab|sirf|kyuki|kyunki|samajh|samjha|samjhe|baat|baatein|shuru|khatam|vapis|wapas|dekhte|bolte|sunte|aisa|aise|aisi|yahan|wahan|kahan|idhar|udhar|kitna|kitne|kitni)\b/gi;

/**
 * Devanagari Unicode Block: U+0900 to U+097F
 */
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const DEVANAGARI_ALL_REGEX = /[\u0900-\u097F]+/g;

/**
 * Latin word tokenization regex
 */
const LATIN_WORD_REGEX = /[A-Za-z0-9]+/g;

/**
 * Classifies segment text into one of the canonical language codes:
 * - 'hi': Devanagari script text
 * - 'hi-Latn': Phonetic Latin-script Hindi / Hinglish
 * - 'mixed': Code-switched sentences combining English and Hindi / Hinglish tokens
 * - 'en': Pure English text
 */
export function classifyLanguage(
  text: string,
  defaultLanguage?: PrimaryLanguage
): PrimaryLanguage {
  if (!text || typeof text !== "string") {
    return defaultLanguage ?? "en";
  }

  const clean = text.trim();
  if (clean.length === 0) {
    return defaultLanguage ?? "en";
  }

  const hasDevanagari = DEVANAGARI_REGEX.test(clean);
  const latinWords = clean.match(LATIN_WORD_REGEX) || [];
  const devanagariMatches = clean.match(DEVANAGARI_ALL_REGEX) || [];

  // 1. Devanagari script analysis
  if (hasDevanagari) {
    // If text contains substantial Latin words alongside Devanagari -> mixed
    if (latinWords.length >= 2) {
      return "mixed";
    }
    return "hi";
  }

  // 2. Latin script phonetic Hinglish vs English analysis
  if (latinWords.length === 0) {
    return defaultLanguage ?? "en";
  }

  const totalLatinWords = latinWords.length;
  const hinglishMatches = clean.match(HINGLISH_TOKEN_REGEX) || [];
  const hinglishCount = hinglishMatches.length;

  if (hinglishCount === 0) {
    return "en";
  }

  // Calculate ratio of Hinglish tokens to total words
  const hinglishRatio = hinglishCount / totalLatinWords;
  const nonHinglishCount = totalLatinWords - hinglishCount;

  // Code-switching detection:
  // If there are both Hinglish tokens and significant English words (e.g. 2+ non-hinglish words)
  if (hinglishCount >= 1 && nonHinglishCount >= 2 && hinglishRatio < 0.65) {
    return "mixed";
  }

  // If Hinglish tokens dominate or sentence is predominantly phonetic Hindi
  if (hinglishRatio >= 0.35 || hinglishCount >= 2) {
    return "hi-Latn";
  }

  if (hinglishCount >= 1 && nonHinglishCount >= 1) {
    return "mixed";
  }

  return "hi-Latn";
}

/**
 * Validates timing monotonicity and non-negativity across transcript segments.
 */
export function validateSegmentTiming(segments: DiarizedSegmentInput[]): void {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Invalid transcript: segment array is empty");
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (typeof seg.startSec !== "number" || isNaN(seg.startSec) || seg.startSec < 0) {
      throw new Error(`Invalid segment timing at index ${i}: startSec must be a non-negative number (got ${seg.startSec})`);
    }
    if (typeof seg.endSec !== "number" || isNaN(seg.endSec) || seg.endSec < seg.startSec) {
      throw new Error(`Invalid segment timing at index ${i}: endSec (${seg.endSec}) must be >= startSec (${seg.startSec})`);
    }
  }
}

/**
 * Parses timestamp string (e.g. "00:01:23.456" or "01:23,456" or "83.45") into seconds float.
 */
function parseTimestampToSeconds(ts: string): number {
  const clean = ts.trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  const parts = clean.split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses WebVTT formatted transcript.
 */
export function parseVttTranscript(
  vttContent: string,
  defaultLanguage?: PrimaryLanguage
): DiarizedSegmentInput[] {
  const lines = vttContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const segments: DiarizedSegmentInput[] = [];

  let currentStart = -1;
  let currentEnd = -1;
  let currentSpeaker = "Speaker";
  let currentTextLines: string[] = [];

  function flushCue() {
    if (currentStart >= 0 && currentEnd >= currentStart && currentTextLines.length > 0) {
      const fullText = currentTextLines.join(" ").trim();
      if (fullText.length > 0) {
        // Extract speaker from <v Speaker> or Speaker: if not already extracted
        let speaker = currentSpeaker;
        let cleanText = fullText;

        const voiceTagMatch = cleanText.match(/^<v\s+([^>]+)>(.*?)<\/v>$/i) || cleanText.match(/^<v\s+([^>]+)>(.*)$/i);
        if (voiceTagMatch) {
          speaker = voiceTagMatch[1].trim();
          cleanText = voiceTagMatch[2].replace(/<\/v>/gi, "").trim();
        } else {
          const colonMatch = cleanText.match(/^([A-Za-z0-9_\-\s]{1,40}):\s+(.+)$/);
          if (colonMatch && !colonMatch[1].toLowerCase().startsWith("http")) {
            speaker = colonMatch[1].trim();
            cleanText = colonMatch[2].trim();
          }
        }

        // Strip any remaining HTML tags
        cleanText = cleanText.replace(/<[^>]+>/g, "").trim();

        if (cleanText.length > 0) {
          const lang = classifyLanguage(cleanText, defaultLanguage);
          segments.push({
            segmentIndex: segments.length,
            startSec: Math.round(currentStart * 1000) / 1000,
            endSec: Math.round(currentEnd * 1000) / 1000,
            speakerLabel: speaker,
            text: cleanText,
            textNormalized: cleanText.replace(/\s+/g, " "),
            languageCode: lang,
          });
        }
      }
    }
    currentStart = -1;
    currentEnd = -1;
    currentSpeaker = "Speaker";
    currentTextLines = [];
  }

  const timeRegex = /((?:\d+:)?\d+:\d+(?:[\.,]\d+)?)\s+-->\s+((?:\d+:)?\d+:\d+(?:[\.,]\d+)?)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("WEBVTT") || trimmed.startsWith("NOTE") || trimmed.startsWith("STYLE")) {
      continue;
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      flushCue();
      currentStart = parseTimestampToSeconds(match[1]);
      currentEnd = parseTimestampToSeconds(match[2]);
      continue;
    }

    if (trimmed === "") {
      flushCue();
    } else if (currentStart >= 0) {
      currentTextLines.push(trimmed);
    }
  }

  flushCue();
  return segments;
}

/**
 * Parses SRT formatted transcript.
 */
export function parseSrtTranscript(
  srtContent: string,
  defaultLanguage?: PrimaryLanguage
): DiarizedSegmentInput[] {
  const blocks = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\s*\n/);
  const segments: DiarizedSegmentInput[] = [];
  const timeRegex = /((?:\d+:)?\d+:\d+(?:[\.,]\d+)?)\s+-->\s+((?:\d+:)?\d+:\d+(?:[\.,]\d+)?)/;

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (timeRegex.test(lines[i])) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeMatch = lines[timeLineIdx].match(timeRegex)!;
    const startSec = parseTimestampToSeconds(timeMatch[1]);
    const endSec = parseTimestampToSeconds(timeMatch[2]);
    const textLines = lines.slice(timeLineIdx + 1);
    let rawText = textLines.join(" ").trim();

    if (!rawText) continue;

    let speaker = "Speaker";
    // Check speaker prefix "Speaker 1: text" or "[Speaker 1] text"
    const prefixMatch = rawText.match(/^\[([^\]]+)\]\s*(.*)$/) || rawText.match(/^([A-Za-z0-9_\-\s]{1,40}):\s+(.+)$/);
    if (prefixMatch) {
      speaker = prefixMatch[1].trim();
      rawText = prefixMatch[2].trim();
    }

    rawText = rawText.replace(/<[^>]+>/g, "").trim();
    if (!rawText) continue;

    const lang = classifyLanguage(rawText, defaultLanguage);
    segments.push({
      segmentIndex: segments.length,
      startSec: Math.round(startSec * 1000) / 1000,
      endSec: Math.round(endSec * 1000) / 1000,
      speakerLabel: speaker,
      text: rawText,
      textNormalized: rawText.replace(/\s+/g, " "),
      languageCode: lang,
    });
  }

  return segments;
}

/**
 * Parses JSON ASR transcript formats (Whisper, AssemblyAI, Deepgram, or native schemas).
 */
export function parseJsonTranscript(
  jsonData: unknown,
  defaultLanguage?: PrimaryLanguage
): DiarizedSegmentInput[] {
  let rawList: Array<Record<string, unknown>> = [];

  if (Array.isArray(jsonData)) {
    rawList = jsonData as Array<Record<string, unknown>>;
  } else if (jsonData && typeof jsonData === "object") {
    const obj = jsonData as Record<string, unknown>;
    if (Array.isArray(obj.segments)) {
      rawList = obj.segments as Array<Record<string, unknown>>;
    } else if (Array.isArray(obj.utterances)) {
      rawList = obj.utterances as Array<Record<string, unknown>>;
    } else if (Array.isArray(obj.results)) {
      rawList = obj.results as Array<Record<string, unknown>>;
    } else if (obj.results && typeof obj.results === "object" && Array.isArray((obj.results as Record<string, unknown>).utterances)) {
      rawList = (obj.results as Record<string, unknown>).utterances as Array<Record<string, unknown>>;
    } else if (Array.isArray(obj.cues)) {
      rawList = obj.cues as Array<Record<string, unknown>>;
    }
  }

  if (rawList.length === 0) {
    throw new Error("Invalid JSON transcript: unable to locate segments array in payload");
  }

  const segments: DiarizedSegmentInput[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];

    const rawStart = item.start_sec ?? item.startSec ?? item.start ?? item.start_time ?? item.startTime ?? 0;
    const rawEnd = item.end_sec ?? item.endSec ?? item.end ?? item.end_time ?? item.endTime ?? rawStart;
    const rawSpeaker = item.speaker_label ?? item.speakerLabel ?? item.speaker ?? item.speaker_tag ?? item.speakerTag ?? "Speaker";
    const rawText = item.text ?? item.transcript ?? item.content ?? item.caption ?? "";
    const rawConfidence = item.confidence ?? item.score;

    const startSec = typeof rawStart === "string" ? parseTimestampToSeconds(rawStart) : Number(rawStart);
    const endSec = typeof rawEnd === "string" ? parseTimestampToSeconds(rawEnd) : Number(rawEnd);
    const speakerLabel = String(rawSpeaker).trim() || "Speaker";
    const text = String(rawText).trim();

    if (!text) continue;

    let words: DiarizedWord[] | undefined = undefined;
    if (Array.isArray(item.words)) {
      words = (item.words as Array<Record<string, unknown>>).map((w) => ({
        word: String(w.word ?? w.text ?? "").trim(),
        startSec: Number(w.start_sec ?? w.startSec ?? w.start ?? 0),
        endSec: Number(w.end_sec ?? w.endSec ?? w.end ?? 0),
        confidence: w.confidence !== undefined ? Number(w.confidence) : undefined,
      })).filter((w) => w.word.length > 0);
    }

    const explicitLang = (item.language_code ?? item.languageCode ?? item.language) as PrimaryLanguage | undefined;
    const lang = explicitLang && ["en", "hi", "hi-Latn", "mixed"].includes(explicitLang)
      ? explicitLang
      : classifyLanguage(text, defaultLanguage);

    segments.push({
      segmentIndex: segments.length,
      startSec: Math.round(startSec * 1000) / 1000,
      endSec: Math.max(Math.round(endSec * 1000) / 1000, Math.round(startSec * 1000) / 1000),
      speakerLabel,
      text,
      textNormalized: text.replace(/\s+/g, " "),
      languageCode: lang,
      confidence: typeof rawConfidence === "number" ? rawConfidence : undefined,
      words,
      wordsJson: words && words.length > 0 ? JSON.stringify(words) : undefined,
    });
  }

  return segments;
}

/**
 * Universal parser detecting format (JSON, VTT, SRT) and converting to normalized DiarizedSegmentInput[].
 */
export function parseTranscriptContent(
  rawContent: string,
  format?: "json" | "vtt" | "srt",
  defaultLanguage?: PrimaryLanguage
): DiarizedSegmentInput[] {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error("Transcript content is empty");
  }

  if (format === "json" || (!format && (trimmed.startsWith("{") || trimmed.startsWith("[")))) {
    try {
      const parsedJson = JSON.parse(trimmed);
      return parseJsonTranscript(parsedJson, defaultLanguage);
    } catch (e: any) {
      if (format === "json") {
        throw new Error(`Failed to parse JSON transcript: ${e.message}`);
      }
    }
  }

  if (format === "vtt" || (!format && trimmed.startsWith("WEBVTT"))) {
    return parseVttTranscript(trimmed, defaultLanguage);
  }

  // Fallback or explicit SRT
  return parseSrtTranscript(trimmed, defaultLanguage);
}

/**
 * Cloudflare Worker Queue Consumer handler for processing transcript ingestion messages.
 */
export async function processTranscriptIngestMessage(
  msg: QueueMessage<TranscriptIngestJobPayload> | TranscriptIngestJobPayload,
  env: {
    DB: DB;
    CATALOGUE: R2BucketBinding;
    VECTORIZE: VectorizeIndexBinding;
    AI: WorkersAiBinding;
    INGEST_DLQ?: { send(message: unknown): Promise<void> };
  },
  ctx?: { waitUntil(promise: Promise<unknown>): void }
): Promise<void> {
  const payload: TranscriptIngestJobPayload = "body" in msg ? msg.body : msg;
  const isQueueMessage = typeof (msg as any).ack === "function";

  if (!payload || !payload.jobId || !payload.episodeId || !payload.transcriptR2Key) {
    const errorMsg = "Invalid transcript job payload: missing jobId, episodeId, or transcriptR2Key";
    console.error(`[transcript-consumer] ${errorMsg}`);
    if (isQueueMessage) {
      (msg as QueueMessage).ack(); // Bad payload cannot be retried
    }
    throw new Error(errorMsg);
  }

  // 1. Mark job as running in D1
  try {
    await updateIngestionJobStatus(env.DB, payload.jobId, {
      status: "running",
    });
  } catch (err: any) {
    console.warn(`[transcript-consumer] Failed to update job ${payload.jobId} to running:`, err.message);
  }

  try {
    // 2. Fetch raw transcript content from R2 Vault
    const r2Object = await env.CATALOGUE.get(payload.transcriptR2Key);
    if (!r2Object) {
      throw new Error(`Transcript asset not found in R2 vault: ${payload.transcriptR2Key}`);
    }

    const rawContent = await r2Object.text();
    if (!rawContent || !rawContent.trim()) {
      throw new Error(`Transcript asset in R2 is empty: ${payload.transcriptR2Key}`);
    }

    // 3. Parse segments and validate timing monotonicity
    const parsedSegments = parseTranscriptContent(rawContent, undefined, payload.defaultLanguageCode);
    validateSegmentTiming(parsedSegments);

    // 4. Atomic staging, embedding, vector upsert, and tombstoning
    const stagingResult = await stageAndActivateTranscriptVersion(
      env.DB,
      env.VECTORIZE,
      env.AI,
      payload,
      parsedSegments
    );

    // 5. Update D1 ingestion job to completed or skipped_unchanged
    await updateIngestionJobStatus(env.DB, payload.jobId, {
      status: stagingResult.status === "skipped_unchanged" ? "skipped_unchanged" : "completed",
    });

    // 6. Acknowledge queue message
    if (isQueueMessage) {
      (msg as QueueMessage).ack();
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[transcript-consumer] Job ${payload.jobId} failed: ${errorMessage}`);

    const maxAttempts = 5;
    const currentAttempt = (payload as any).attempts ? (payload as any).attempts + 1 : 1;

    try {
      if (currentAttempt >= maxAttempts) {
        await updateIngestionJobStatus(env.DB, payload.jobId, {
          status: "failed",
          errorMessage,
          attempts: currentAttempt,
        });

        // Route to DLQ if available
        if (env.INGEST_DLQ && typeof env.INGEST_DLQ.send === "function") {
          await env.INGEST_DLQ.send({
            payload,
            error: errorMessage,
            failedAt: new Date().toISOString(),
            attempts: currentAttempt,
          });
        }

        if (isQueueMessage) {
          (msg as QueueMessage).ack(); // Terminate retry loop on max attempts
        }
      } else {
        await updateIngestionJobStatus(env.DB, payload.jobId, {
          errorMessage,
          attempts: currentAttempt,
        });

        if (isQueueMessage) {
          (msg as QueueMessage).retry();
        }
      }
    } catch (d1Err: any) {
      console.error(`[transcript-consumer] Failed updating error state for job ${payload.jobId}:`, d1Err.message);
    }

    throw error;
  }
}

/**
 * @file web/lib/provenance/useDualPlayback.ts
 * @description React hook for dual timeline coordinate playback management.
 * Seamlessly tracks and converts timestamps between Published YouTube cut and Uncut studio recording.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  TimelineEngine,
  createTimelineEngine,
  parseAndValidateIntervals,
} from './timeline-engine';
import type {
  TimelineSystem,
  ConversionStatus,
  TimelineInterval,
  NormalizedTimelineInterval,
  CoordinateConversionResult,
} from './types';

export interface UseDualPlaybackOptions {
  episodeId?: string;
  videoId?: string;
  intervals?: TimelineInterval[];
  initialTimeline?: TimelineSystem;
  initialTimeSec?: number;
  onTimelineChange?: (timeline: TimelineSystem) => void;
  onTimeUpdate?: (timeSec: number, timeline: TimelineSystem) => void;
}

export interface UseDualPlaybackReturn {
  /** Active timeline coordinate system ('published' | 'uncut') */
  activeTimeline: TimelineSystem;
  /** Current playback time in seconds within the active coordinate system */
  playbackTimeSec: number;
  /** Playback status */
  isPlaying: boolean;

  /** Full coordinate conversion result to the alternate timeline */
  convertedResult: CoordinateConversionResult;
  /** Converted/reconciled Published YouTube timestamp in seconds, or null if cut/unmapped */
  publishedTimeSec: number | null;
  /** Converted/reconciled Uncut studio timestamp in seconds, or null if added/unmapped */
  uncutTimeSec: number | null;
  /** Alignment conversion status ('matched' | 'cut_from_published' | 'added_in_published' | 'unmapped' | 'conflicted') */
  status: ConversionStatus;
  /** Confidence score of the active alignment (0.0 to 1.0) */
  confidence: number;

  /** True if the current timestamp cleanly matches across both timelines */
  isMatched: boolean;
  /** True if the current uncut moment was cut/trimmed from the published YouTube video */
  isCutFromPublished: boolean;
  /** True if the current published moment is an added post-production bumper/intro */
  isAddedInPublished: boolean;
  /** True if the timestamp is out of mapped episode bounds */
  isUnmapped: boolean;
  /** True if the interval has an ambiguous or conflicted alignment */
  isConflicted: boolean;

  /** All normalized piecewise intervals for the episode */
  intervals: NormalizedTimelineInterval[];
  /** Active interval covering the current playback position */
  activeInterval: NormalizedTimelineInterval | null;
  /** Total duration of uncut recording in seconds */
  totalUncutSec: number;
  /** Total duration of published video in seconds */
  totalPubSec: number;

  /** Toggle or switch the active timeline */
  switchTimeline: (target?: TimelineSystem) => void;
  /** Set the active timeline explicitly */
  setTimeline: (timeline: TimelineSystem) => void;
  /** Seek to a timestamp in the specified (or active) timeline system */
  seekTo: (timeSec: number, timeline?: TimelineSystem) => void;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle playback */
  togglePlay: () => void;
  /** Convert any arbitrary timestamp between coordinate systems */
  convertTime: (timeSec: number, fromTimeline?: TimelineSystem) => CoordinateConversionResult;
  /** Formats a timestamp in seconds as [h:]m:ss */
  formatTime: (timeSec: number | null) => string;
}

/**
 * Formats seconds into human-readable timestamp (e.g. "3:45" or "1:24:10").
 */
export function formatPlaybackTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '—';
  }
  const s = Math.floor(seconds);
  const sec = s % 60;
  const totalMin = Math.floor(s / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function useDualPlayback(options: UseDualPlaybackOptions = {}): UseDualPlaybackReturn {
  const {
    intervals: customIntervals,
    initialTimeline = 'published',
    initialTimeSec = 0,
    onTimelineChange,
    onTimeUpdate,
  } = options;

  const [activeTimeline, setActiveTimelineState] = useState<TimelineSystem>(initialTimeline);
  const [playbackTimeSec, setPlaybackTimeSec] = useState<number>(Math.max(0, initialTimeSec));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Load and memoize intervals
  const normalizedIntervals = useMemo<NormalizedTimelineInterval[]>(() => {
    if (customIntervals && customIntervals.length > 0) {
      return parseAndValidateIntervals(customIntervals);
    }

    // Never invent a one-hour identity interval from an episode ID. A caller
    // must pass a trusted alignment projection explicitly.
    return [];
  }, [customIntervals]);

  // Memoize timeline engine instance
  const engine = useMemo<TimelineEngine>(() => {
    return createTimelineEngine(normalizedIntervals);
  }, [normalizedIntervals]);

  // Total durations
  const summary = useMemo(() => engine.getSummary(), [engine]);
  const totalUncutSec = summary.totalUncutSec;
  const totalPubSec = summary.totalPubSec;

  // Convert current playback position
  const convertedResult = useMemo<CoordinateConversionResult>(() => {
    return engine.convert(activeTimeline, playbackTimeSec);
  }, [engine, activeTimeline, playbackTimeSec]);

  // Compute published and uncut coordinate positions
  const publishedTimeSec = useMemo<number | null>(() => {
    if (activeTimeline === 'published') return playbackTimeSec;
    return convertedResult.targetTimeSec;
  }, [activeTimeline, playbackTimeSec, convertedResult]);

  const uncutTimeSec = useMemo<number | null>(() => {
    if (activeTimeline === 'uncut') return playbackTimeSec;
    return convertedResult.targetTimeSec;
  }, [activeTimeline, playbackTimeSec, convertedResult]);

  // Status and flags
  const status = convertedResult.status;
  const confidence = convertedResult.confidence;
  const isMatched = status === 'matched';
  const isCutFromPublished = status === 'cut_from_published';
  const isAddedInPublished = status === 'added_in_published';
  const isUnmapped = status === 'unmapped';
  const isConflicted = status === 'conflicted';

  // Find active interval
  const activeInterval = useMemo<NormalizedTimelineInterval | null>(() => {
    if (convertedResult.intervalIndex !== null) {
      return (
        normalizedIntervals.find((inv) => inv.intervalIndex === convertedResult.intervalIndex) ||
        null
      );
    }
    return null;
  }, [convertedResult.intervalIndex, normalizedIntervals]);

  // Switch timeline
  const switchTimeline = useCallback(
    (target?: TimelineSystem) => {
      const nextTimeline = target ?? (activeTimeline === 'published' ? 'uncut' : 'published');
      if (nextTimeline === activeTimeline) return;

      // Convert current position if matched
      let nextTime = playbackTimeSec;
      if (convertedResult.status === 'matched' && convertedResult.targetTimeSec !== null) {
        nextTime = convertedResult.targetTimeSec;
      } else if (convertedResult.status === 'cut_from_published' && nextTimeline === 'published') {
        // If cut from published and user switches to published, find nearest valid published interval
        const nextMatched = normalizedIntervals.find(
          (i) => i.status === 'matched' && i.uncutStartSec >= playbackTimeSec
        );
        nextTime = nextMatched ? nextMatched.pubStartSec : 0;
      }

      setActiveTimelineState(nextTimeline);
      setPlaybackTimeSec(nextTime);
      onTimelineChange?.(nextTimeline);
      onTimeUpdate?.(nextTime, nextTimeline);
    },
    [
      activeTimeline,
      playbackTimeSec,
      convertedResult,
      normalizedIntervals,
      onTimelineChange,
      onTimeUpdate,
    ]
  );

  const setTimeline = useCallback(
    (timeline: TimelineSystem) => {
      switchTimeline(timeline);
    },
    [switchTimeline]
  );

  // Seek to
  const seekTo = useCallback(
    (timeSec: number, timeline?: TimelineSystem) => {
      const targetSystem = timeline ?? activeTimeline;
      const clamped = Math.max(0, timeSec);

      if (targetSystem !== activeTimeline) {
        setActiveTimelineState(targetSystem);
        onTimelineChange?.(targetSystem);
      }

      setPlaybackTimeSec(clamped);
      onTimeUpdate?.(clamped, targetSystem);
    },
    [activeTimeline, onTimelineChange, onTimeUpdate]
  );

  // Media playback controls
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);

  const convertTime = useCallback(
    (timeSec: number, fromTimeline?: TimelineSystem) => {
      const source = fromTimeline ?? activeTimeline;
      return engine.convert(source, timeSec);
    },
    [engine, activeTimeline]
  );

  return {
    activeTimeline,
    playbackTimeSec,
    isPlaying,
    convertedResult,
    publishedTimeSec,
    uncutTimeSec,
    status,
    confidence,
    isMatched,
    isCutFromPublished,
    isAddedInPublished,
    isUnmapped,
    isConflicted,
    intervals: normalizedIntervals,
    activeInterval,
    totalUncutSec,
    totalPubSec,
    switchTimeline,
    setTimeline,
    seekTo,
    play,
    pause,
    togglePlay,
    convertTime,
    formatTime: formatPlaybackTimestamp,
  };
}

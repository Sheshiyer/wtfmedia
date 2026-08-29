/**
 * @file cloudflare/tests/timeline-alignment.test.mjs
 * @description Test suite for Piecewise Continuous Linear Timeline Alignment Engine.
 * Verifies bidirectional coordinate conversion, status classification, mathematical symmetry,
 * boundary edge cases, and 10-episode performance benchmark (<0.1ms mean, <2.0s total for 1,000 queries).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import {
  TimelineEngine,
  TimelineAlignmentEngine,
  convertCoordinate,
  parseAndValidateIntervals,
  normalizeInterval,
  verifyMathematicalSymmetry,
  createIdentityAlignment,
  loadTimelineAlignment,
} from '../src/provenance/alignment-engine.ts';

// ---------------------------------------------------------------------------
// 10 Golden Benchmark Evaluation Episodes Fixture Dataset
// ---------------------------------------------------------------------------

const benchmarkEpisodes = [
  {
    episodeId: 'ep_01_simple_intro_offset',
    title: 'WTF #01 - Simple Intro Offset',
    description: '12-second post-production bumper added; rest is continuous 1:1 dialog.',
    uncutDurationSec: 3600,
    publishedDurationSec: 3612,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 0, pubStartSec: 0, pubEndSec: 12, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 0, uncutEndSec: 3600, pubStartSec: 12, pubEndSec: 3612, status: 'matched', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 0, expectedTargetTimeSec: 12, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 100, expectedTargetTimeSec: 112, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 3600, expectedTargetTimeSec: 3612, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 6, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'published', sourceTimeSec: 12, expectedTargetTimeSec: 0, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 112, expectedTargetTimeSec: 100, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_02_intro_and_outro_cuts',
    title: 'WTF #02 - Intro & Outro Banter Removed',
    description: '30s pre-roll warm-up cut from uncut, 60s post-roll banter cut from uncut.',
    uncutDurationSec: 5400,
    publishedDurationSec: 5310,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 30, pubStartSec: 0, pubEndSec: 0, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 30, uncutEndSec: 5340, pubStartSec: 0, pubEndSec: 5310, status: 'matched', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 5340, uncutEndSec: 5400, pubStartSec: 5310, pubEndSec: 5310, status: 'cut_from_published', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 15, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 30, expectedTargetTimeSec: 0, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2685, expectedTargetTimeSec: 2655, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 5350, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'published', sourceTimeSec: 0, expectedTargetTimeSec: 30, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 5310, expectedTargetTimeSec: 5340, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_03_sponsor_cuts_and_bloopers',
    title: 'WTF #03 - Sponsor Cuts & Blooper Removals',
    description: 'Mid-roll sponsor inserts in published, 2 blooper takes removed from uncut.',
    uncutDurationSec: 4200,
    publishedDurationSec: 4190,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 1200, pubStartSec: 0, pubEndSec: 1200, status: 'matched', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 1200, uncutEndSec: 1290, pubStartSec: 1200, pubEndSec: 1200, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 1290, uncutEndSec: 2500, pubStartSec: 1200, pubEndSec: 2410, status: 'matched', confidence: 1.0 },
      { intervalIndex: 3, uncutStartSec: 2500, uncutEndSec: 2500, pubStartSec: 2410, pubEndSec: 2470, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 4, uncutStartSec: 2500, uncutEndSec: 3400, pubStartSec: 2470, pubEndSec: 3370, status: 'matched', confidence: 1.0 },
      { intervalIndex: 5, uncutStartSec: 3400, uncutEndSec: 3460, pubStartSec: 3370, pubEndSec: 3370, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 6, uncutStartSec: 3460, uncutEndSec: 4200, pubStartSec: 3370, pubEndSec: 4110, status: 'matched', confidence: 1.0 },
      { intervalIndex: 7, uncutStartSec: 4200, uncutEndSec: 4200, pubStartSec: 4110, pubEndSec: 4190, status: 'added_in_published', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 600, expectedTargetTimeSec: 600, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 1245, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 1895, expectedTargetTimeSec: 1805, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 2440, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'published', sourceTimeSec: 2470, expectedTargetTimeSec: 2500, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 3430, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'published', sourceTimeSec: 4150, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
    ],
  },
  {
    episodeId: 'ep_04_deleted_tangent_long',
    title: 'WTF #04 - 45-Minute Deleted Tangent',
    description: 'Major confidential segment (2700 seconds) removed from uncut studio recording.',
    uncutDurationSec: 7200,
    publishedDurationSec: 4500,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 1800, pubStartSec: 0, pubEndSec: 1800, status: 'matched', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 1800, uncutEndSec: 4500, pubStartSec: 1800, pubEndSec: 1800, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 4500, uncutEndSec: 7200, pubStartSec: 1800, pubEndSec: 4500, status: 'matched', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 900, expectedTargetTimeSec: 900, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2500, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 4500, expectedTargetTimeSec: 1800, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 5850, expectedTargetTimeSec: 3150, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 1800, expectedTargetTimeSec: 4500, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 3150, expectedTargetTimeSec: 5850, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_05_added_bumpers_and_recaps',
    title: 'WTF #05 - Post-Production Recap & Chapter Cards',
    description: '3-minute intro recap and 4 post-production graphic cards added in published cut.',
    uncutDurationSec: 3600,
    publishedDurationSec: 3840,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 0, pubStartSec: 0, pubEndSec: 180, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 0, uncutEndSec: 900, pubStartSec: 180, pubEndSec: 1080, status: 'matched', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 900, uncutEndSec: 900, pubStartSec: 1080, pubEndSec: 1100, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 3, uncutStartSec: 900, uncutEndSec: 1800, pubStartSec: 1100, pubEndSec: 2000, status: 'matched', confidence: 1.0 },
      { intervalIndex: 4, uncutStartSec: 1800, uncutEndSec: 1800, pubStartSec: 2000, pubEndSec: 2020, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 5, uncutStartSec: 1800, uncutEndSec: 2700, pubStartSec: 2020, pubEndSec: 2920, status: 'matched', confidence: 1.0 },
      { intervalIndex: 6, uncutStartSec: 2700, uncutEndSec: 2700, pubStartSec: 2920, pubEndSec: 2940, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 7, uncutStartSec: 2700, uncutEndSec: 3600, pubStartSec: 2940, pubEndSec: 3840, status: 'matched', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'published', sourceTimeSec: 90, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 450, expectedTargetTimeSec: 630, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 1090, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 1350, expectedTargetTimeSec: 1550, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 2010, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 3150, expectedTargetTimeSec: 3390, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_06_multi_segment_spliced',
    title: 'WTF #06 - 5 Spliced Studio Segments',
    description: 'Recorded across 5 separate takes with setup breaks excluded.',
    uncutDurationSec: 5000,
    publishedDurationSec: 4200,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 800, pubStartSec: 0, pubEndSec: 800, status: 'matched', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 800, uncutEndSec: 1000, pubStartSec: 800, pubEndSec: 800, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 1000, uncutEndSec: 1900, pubStartSec: 800, pubEndSec: 1700, status: 'matched', confidence: 1.0 },
      { intervalIndex: 3, uncutStartSec: 1900, uncutEndSec: 2100, pubStartSec: 1700, pubEndSec: 1700, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 4, uncutStartSec: 2100, uncutEndSec: 3000, pubStartSec: 1700, pubEndSec: 2600, status: 'matched', confidence: 1.0 },
      { intervalIndex: 5, uncutStartSec: 3000, uncutEndSec: 3200, pubStartSec: 2600, pubEndSec: 2600, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 6, uncutStartSec: 3200, uncutEndSec: 4000, pubStartSec: 2600, pubEndSec: 3400, status: 'matched', confidence: 1.0 },
      { intervalIndex: 7, uncutStartSec: 4000, uncutEndSec: 4200, pubStartSec: 3400, pubEndSec: 3400, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 8, uncutStartSec: 4200, uncutEndSec: 5000, pubStartSec: 3400, pubEndSec: 4200, status: 'matched', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 400, expectedTargetTimeSec: 400, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 900, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 1450, expectedTargetTimeSec: 1250, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2000, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2550, expectedTargetTimeSec: 2150, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 3800, expectedTargetTimeSec: 4600, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_07_dense_micro_edits',
    title: 'WTF #07 - Dense Micro-Edits (15 Pause/Cough Cuts)',
    description: 'High-frequency editorial silence trimming across a rapid dialogue interview.',
    uncutDurationSec: 3600,
    publishedDurationSec: 3450,
    intervals: [
      // 15 matched chunks with 10s cuts in between
      ...Array.from({ length: 15 }, (_, i) => [
        {
          intervalIndex: i * 2,
          uncutStartSec: i * 240,
          uncutEndSec: i * 240 + 230,
          pubStartSec: i * 230,
          pubEndSec: (i + 1) * 230,
          status: 'matched',
          confidence: 1.0,
        },
        {
          intervalIndex: i * 2 + 1,
          uncutStartSec: i * 240 + 230,
          uncutEndSec: (i + 1) * 240,
          pubStartSec: (i + 1) * 230,
          pubEndSec: (i + 1) * 230,
          status: 'cut_from_published',
          confidence: 1.0,
        },
      ]).flat(),
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 115, expectedTargetTimeSec: 115, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 235, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 355, expectedTargetTimeSec: 345, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 475, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'published', sourceTimeSec: 690, expectedTargetTimeSec: 720, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_08_multilingual_hindi_postroll',
    title: 'WTF #08 - Hindi/English Banter & YouTube End-Screen',
    description: 'Multilingual conversational episode with YouTube end-screen cut.',
    uncutDurationSec: 4800,
    publishedDurationSec: 4760,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 4740, pubStartSec: 0, pubEndSec: 4740, status: 'matched', confidence: 0.98 },
      { intervalIndex: 1, uncutStartSec: 4740, uncutEndSec: 4800, pubStartSec: 4740, pubEndSec: 4740, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 4800, uncutEndSec: 4800, pubStartSec: 4740, pubEndSec: 4760, status: 'added_in_published', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 2400, expectedTargetTimeSec: 2400, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 4770, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'published', sourceTimeSec: 4750, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
    ],
  },
  {
    episodeId: 'ep_09_complex_non_linear_interspersed',
    title: 'WTF #09 - Interspersed B-Roll Montage',
    description: 'Complex editorial layout with interleaved sponsor breaks and uncut segments.',
    uncutDurationSec: 6000,
    publishedDurationSec: 5800,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 1500, pubStartSec: 0, pubEndSec: 1500, status: 'matched', confidence: 1.0 },
      { intervalIndex: 1, uncutStartSec: 1500, uncutEndSec: 1600, pubStartSec: 1500, pubEndSec: 1500, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 1600, uncutEndSec: 1600, pubStartSec: 1500, pubEndSec: 1560, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 3, uncutStartSec: 1600, uncutEndSec: 3200, pubStartSec: 1560, pubEndSec: 3160, status: 'matched', confidence: 1.0 },
      { intervalIndex: 4, uncutStartSec: 3200, uncutEndSec: 3350, pubStartSec: 3160, pubEndSec: 3160, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 5, uncutStartSec: 3350, uncutEndSec: 3350, pubStartSec: 3160, pubEndSec: 3220, status: 'added_in_published', confidence: 1.0 },
      { intervalIndex: 6, uncutStartSec: 3350, uncutEndSec: 6000, pubStartSec: 3220, pubEndSec: 5870, status: 'matched', confidence: 1.0 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 1550, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'published', sourceTimeSec: 1530, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2400, expectedTargetTimeSec: 2360, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 3190, expectedTargetTimeSec: null, expectedStatus: 'added_in_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 4675, expectedTargetTimeSec: 4545, expectedStatus: 'matched' },
    ],
  },
  {
    episodeId: 'ep_10_long_form_masterclass',
    title: 'WTF #10 - 3.5h Uncut Condensed to 1.75h Published',
    description: 'Heavy editorial condensation of an uncut studio deep-dive into a tight published episode.',
    uncutDurationSec: 12600,
    publishedDurationSec: 6300,
    intervals: [
      { intervalIndex: 0, uncutStartSec: 0, uncutEndSec: 1800, pubStartSec: 0, pubEndSec: 1200, status: 'matched', confidence: 0.95 },
      { intervalIndex: 1, uncutStartSec: 1800, uncutEndSec: 3600, pubStartSec: 1200, pubEndSec: 1200, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 2, uncutStartSec: 3600, uncutEndSec: 5400, pubStartSec: 1200, pubEndSec: 2400, status: 'matched', confidence: 0.95 },
      { intervalIndex: 3, uncutStartSec: 5400, uncutEndSec: 7200, pubStartSec: 2400, pubEndSec: 2400, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 4, uncutStartSec: 7200, uncutEndSec: 9000, pubStartSec: 2400, pubEndSec: 3900, status: 'matched', confidence: 0.95 },
      { intervalIndex: 5, uncutStartSec: 9000, uncutEndSec: 10800, pubStartSec: 3900, pubEndSec: 3900, status: 'cut_from_published', confidence: 1.0 },
      { intervalIndex: 6, uncutStartSec: 10800, uncutEndSec: 12600, pubStartSec: 3900, pubEndSec: 6300, status: 'matched', confidence: 0.95 },
    ],
    testPoints: [
      { sourceTimeline: 'uncut', sourceTimeSec: 900, expectedTargetTimeSec: 600, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 2700, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 4500, expectedTargetTimeSec: 1800, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 6300, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 8100, expectedTargetTimeSec: 3150, expectedStatus: 'matched' },
      { sourceTimeline: 'uncut', sourceTimeSec: 9900, expectedTargetTimeSec: null, expectedStatus: 'cut_from_published' },
      { sourceTimeline: 'uncut', sourceTimeSec: 11700, expectedTargetTimeSec: 5100, expectedStatus: 'matched' },
      { sourceTimeline: 'published', sourceTimeSec: 5100, expectedTargetTimeSec: 11700, expectedStatus: 'matched' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Unit Tests: Interval Parser & Normalization
// ---------------------------------------------------------------------------

test('Interval Parser: normalizes both snake_case and camelCase intervals', () => {
  const rawSnake = {
    interval_index: 0,
    uncut_start_sec: 10,
    uncut_end_sec: 100,
    pub_start_sec: 15,
    pub_end_sec: 105,
    interval_status: 'matched',
    confidence: 0.95,
  };
  const normalized = normalizeInterval(rawSnake);
  assert.equal(normalized.intervalIndex, 0);
  assert.equal(normalized.uncutStartSec, 10);
  assert.equal(normalized.uncutEndSec, 100);
  assert.equal(normalized.pubStartSec, 15);
  assert.equal(normalized.pubEndSec, 105);
  assert.equal(normalized.status, 'matched');
  assert.equal(normalized.confidence, 0.95);
});

test('Interval Parser: handles inverted timestamps safely by ordering start <= end', () => {
  const inverted = {
    uncutStartSec: 200,
    uncutEndSec: 50,
    pubStartSec: 300,
    pubEndSec: 100,
  };
  const normalized = normalizeInterval(inverted);
  assert.equal(normalized.uncutStartSec, 50);
  assert.equal(normalized.uncutEndSec, 200);
  assert.equal(normalized.pubStartSec, 100);
  assert.equal(normalized.pubEndSec, 300);
});

test('Interval Parser: sorts and re-indexes un-ordered interval arrays', () => {
  const unOrdered = [
    { uncutStartSec: 500, uncutEndSec: 600, pubStartSec: 400, pubEndSec: 500, status: 'matched' },
    { uncutStartSec: 0, uncutEndSec: 200, pubStartSec: 0, pubEndSec: 200, status: 'matched' },
    { uncutStartSec: 200, uncutEndSec: 500, pubStartSec: 200, pubEndSec: 400, status: 'matched' },
  ];
  const parsed = parseAndValidateIntervals(unOrdered);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].uncutStartSec, 0);
  assert.equal(parsed[1].uncutStartSec, 200);
  assert.equal(parsed[2].uncutStartSec, 500);
});

// ---------------------------------------------------------------------------
// Unit Tests: Bidirectional Coordinate Conversion & Accuracy
// ---------------------------------------------------------------------------

test('TimelineEngine: converts linear matched coordinates bidirectionally', () => {
  const intervals = [
    { uncutStartSec: 0, uncutEndSec: 1000, pubStartSec: 50, pubEndSec: 1050, status: 'matched', confidence: 1.0 },
  ];
  const engine = new TimelineEngine(intervals);

  const uToP = engine.convertUncutToPublished(250);
  assert.equal(uToP.status, 'matched');
  assert.equal(uToP.targetTimeSec, 300);
  assert.equal(uToP.sourceTimeline, 'uncut');
  assert.equal(uToP.targetTimeline, 'published');

  const pToU = engine.convertPublishedToUncut(300);
  assert.equal(pToU.status, 'matched');
  assert.equal(pToU.targetTimeSec, 250);
  assert.equal(pToU.sourceTimeline, 'published');
  assert.equal(pToU.targetTimeline, 'uncut');
});

test('TimelineEngine: non-linear slope scaling (e.g. condensed segment)', () => {
  // 100s in uncut mapped to 50s in published (2x speed / condensed)
  const intervals = [
    { uncutStartSec: 100, uncutEndSec: 200, pubStartSec: 50, pubEndSec: 100, status: 'matched', confidence: 1.0 },
  ];
  const engine = new TimelineEngine(intervals);

  // 150s uncut (midpoint) -> 75s published (midpoint)
  const toPub = engine.convertUncutToPublished(150);
  assert.equal(toPub.targetTimeSec, 75);

  const toUncut = engine.convertPublishedToUncut(75);
  assert.equal(toUncut.targetTimeSec, 150);
});

test('TimelineEngine: cut moments return targetTimeSec = null with status cut_from_published', () => {
  const intervals = [
    { uncutStartSec: 0, uncutEndSec: 100, pubStartSec: 0, pubEndSec: 100, status: 'matched' },
    { uncutStartSec: 100, uncutEndSec: 200, pubStartSec: 100, pubEndSec: 100, status: 'cut_from_published' },
    { uncutStartSec: 200, uncutEndSec: 300, pubStartSec: 100, pubEndSec: 200, status: 'matched' },
  ];
  const engine = new TimelineEngine(intervals);

  const cutQuery = engine.convertUncutToPublished(150);
  assert.equal(cutQuery.targetTimeSec, null);
  assert.equal(cutQuery.status, 'cut_from_published');
  assert.match(cutQuery.reason ?? '', /trimmed|excluded|cut/i);
});

test('TimelineEngine: added moments in published return targetTimeSec = null with status added_in_published', () => {
  const intervals = [
    { uncutStartSec: 0, uncutEndSec: 0, pubStartSec: 0, pubEndSec: 30, status: 'added_in_published' },
    { uncutStartSec: 0, uncutEndSec: 500, pubStartSec: 30, pubEndSec: 530, status: 'matched' },
  ];
  const engine = new TimelineEngine(intervals);

  const addedQuery = engine.convertPublishedToUncut(15);
  assert.equal(addedQuery.targetTimeSec, null);
  assert.equal(addedQuery.status, 'added_in_published');
  assert.match(addedQuery.reason ?? '', /added|post-production|bumper/i);
});

test('TimelineEngine: boundary edges and negative timestamps return unmapped', () => {
  const intervals = [
    { uncutStartSec: 10, uncutEndSec: 100, pubStartSec: 10, pubEndSec: 100, status: 'matched' },
  ];
  const engine = new TimelineEngine(intervals);

  // Negative timestamp
  const neg = engine.convertUncutToPublished(-5);
  assert.equal(neg.targetTimeSec, null);
  assert.equal(neg.status, 'unmapped');

  // Before first interval
  const before = engine.convertUncutToPublished(5);
  assert.equal(before.targetTimeSec, null);
  assert.equal(before.status, 'unmapped');

  // After last interval
  const after = engine.convertUncutToPublished(200);
  assert.equal(after.targetTimeSec, null);
  assert.equal(after.status, 'unmapped');
});

test('TimelineEngine: exact boundary transitions at interval endpoints', () => {
  const intervals = [
    { uncutStartSec: 0, uncutEndSec: 100, pubStartSec: 0, pubEndSec: 100, status: 'matched' },
    { uncutStartSec: 100, uncutEndSec: 200, pubStartSec: 100, pubEndSec: 200, status: 'matched' },
  ];
  const engine = new TimelineEngine(intervals);

  const at0 = engine.convertUncutToPublished(0);
  assert.equal(at0.targetTimeSec, 0);

  const at100 = engine.convertUncutToPublished(100);
  assert.equal(at100.targetTimeSec, 100);

  const at200 = engine.convertUncutToPublished(200);
  assert.equal(at200.targetTimeSec, 200);
});

test('TimelineEngine: identity alignment generator creates 1:1 map', () => {
  const identity = createIdentityAlignment('ep_test_identity', 3600);
  assert.equal(identity.status, 'verified');
  assert.equal(identity.intervals.length, 1);

  const res = convertCoordinate(identity, 'uncut', 1234.5);
  assert.equal(res.status, 'matched');
  assert.equal(res.targetTimeSec, 1234.5);
});

// ---------------------------------------------------------------------------
// Mathematical Symmetry Guarantee Test (|U(P(t)) - t| < 10^-3 s)
// ---------------------------------------------------------------------------

test('Mathematical Symmetry: verify round-trip symmetry across all 10 benchmark episodes', () => {
  for (const ep of benchmarkEpisodes) {
    const sym = verifyMathematicalSymmetry(ep.intervals, {
      sampleCountPerInterval: 30,
      toleranceSec: 1e-3, // 1 millisecond
    });

    assert.equal(
      sym.symmetric,
      true,
      `Episode ${ep.episodeId} failed mathematical symmetry. Max deviation: ${sym.maxDeviationSec}s`
    );
    assert.ok(
      sym.maxDeviationSec < 1e-3,
      `Max deviation ${sym.maxDeviationSec}s must be < 10^-3s for ${ep.episodeId}`
    );
    assert.ok(
      sym.sampleCount > 0,
      `Sample count must be > 0 for ${ep.episodeId}`
    );
  }
});

// ---------------------------------------------------------------------------
// 10 Golden Benchmark Evaluation Accuracy Tests
// ---------------------------------------------------------------------------

test('Golden Benchmark: all 10 evaluation episodes pass ground-truth test points', () => {
  assert.equal(benchmarkEpisodes.length, 10, 'Must contain exactly 10 benchmark episodes');

  for (const ep of benchmarkEpisodes) {
    const engine = new TimelineEngine(ep.intervals);

    for (const point of ep.testPoints) {
      const result = engine.convert(point.sourceTimeline, point.sourceTimeSec);

      assert.equal(
        result.status,
        point.expectedStatus,
        `[${ep.episodeId}] Query ${point.sourceTimeline}@${point.sourceTimeSec} expected status ${point.expectedStatus}, got ${result.status}`
      );

      if (point.expectedTargetTimeSec === null) {
        assert.equal(
          result.targetTimeSec,
          null,
          `[${ep.episodeId}] Query ${point.sourceTimeline}@${point.sourceTimeSec} expected target null, got ${result.targetTimeSec}`
        );
      } else {
        assert.ok(
          result.targetTimeSec !== null,
          `[${ep.episodeId}] Target time must not be null for matched query`
        );
        const diff = Math.abs(result.targetTimeSec - point.expectedTargetTimeSec);
        const tol = point.toleranceSec ?? 0.5; // < 0.5s resolution
        assert.ok(
          diff <= tol,
          `[${ep.episodeId}] Coordinate conversion error ${diff}s exceeded tolerance ${tol}s for query ${point.sourceTimeline}@${point.sourceTimeSec} (expected ${point.expectedTargetTimeSec}, got ${result.targetTimeSec})`
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Performance Benchmark: 1,000 Queries (<0.1ms mean, <2.0s total)
// ---------------------------------------------------------------------------

test('Performance Benchmark: 1,000 queries across 10 episodes execute with sub-0.1ms mean latency and <2.0s total', () => {
  const engines = benchmarkEpisodes.map((ep) => ({
    ep,
    engine: new TimelineEngine(ep.intervals),
  }));

  const QUERY_COUNT = 1000;
  const latenciesMs = [];

  const totalStart = performance.now();

  for (let i = 0; i < QUERY_COUNT; i++) {
    const item = engines[i % engines.length];
    // Deterministic pseudo-random sample point within duration
    const ratio = (i * 7919) % 10000 / 10000;
    const system = i % 2 === 0 ? 'uncut' : 'published';
    const maxDur = system === 'uncut' ? item.ep.uncutDurationSec : item.ep.publishedDurationSec;
    const timeSec = ratio * maxDur;

    const qStart = performance.now();
    const res = item.engine.convert(system, timeSec);
    const qEnd = performance.now();

    latenciesMs.push(qEnd - qStart);
    assert.ok(res !== null);
  }

  const totalEnd = performance.now();
  const totalElapsedMs = totalEnd - totalStart;
  const totalElapsedSec = totalElapsedMs / 1000;

  latenciesMs.sort((a, b) => a - b);
  const meanLatencyMs = latenciesMs.reduce((acc, v) => acc + v, 0) / latenciesMs.length;
  const p99LatencyMs = latenciesMs[Math.floor(latenciesMs.length * 0.99)];

  // Assertions meeting PROV-13 and Milestone 5 acceptance criteria:
  // 1. Mean query latency < 0.1ms (100 microseconds)
  // 2. 99th percentile < 1.0ms
  // 3. Total benchmark execution time < 2.0s
  assert.ok(
    meanLatencyMs < 0.1,
    `Mean query latency ${meanLatencyMs.toFixed(4)}ms must be < 0.1ms`
  );
  assert.ok(
    p99LatencyMs < 1.0,
    `P99 query latency ${p99LatencyMs.toFixed(4)}ms must be < 1.0ms`
  );
  assert.ok(
    totalElapsedSec < 2.0,
    `Total benchmark execution time ${totalElapsedSec.toFixed(3)}s must be < 2.0s for 1,000 queries`
  );
});

// ---------------------------------------------------------------------------
// D1 Mock Loader Test
// ---------------------------------------------------------------------------

test('loadTimelineAlignment: loads and normalizes D1 rows cleanly', async () => {
  const mockDb = {
    prepare(query) {
      return {
        bind(...args) {
          return {
            async first() {
              if (query.includes('FROM timeline_alignments')) {
                return {
                  id: 'aln_01J00000000000000000000001',
                  episode_id: args[0],
                  uncut_asset_id: 'ast_uncut_01',
                  published_asset_id: 'ast_pub_01',
                  algorithm: 'dtw_forced_align',
                  confidence_score: 0.98,
                  status: 'verified',
                  created_at: '2026-08-29T00:00:00.000Z',
                  updated_at: '2026-08-29T00:00:00.000Z',
                };
              }
              return null;
            },
            async all() {
              if (query.includes('FROM alignment_intervals')) {
                return {
                  results: [
                    {
                      interval_index: 0,
                      uncut_start_sec: 0,
                      uncut_end_sec: 1800,
                      pub_start_sec: 10,
                      pub_end_sec: 1810,
                      interval_status: 'matched',
                      confidence: 0.99,
                    },
                    {
                      interval_index: 1,
                      uncut_start_sec: 1800,
                      uncut_end_sec: 2100,
                      pub_start_sec: 1810,
                      pub_end_sec: 1810,
                      interval_status: 'cut_from_published',
                      confidence: 1.0,
                    },
                  ],
                };
              }
              return { results: [] };
            },
          };
        },
      };
    },
  };

  const loaded = await loadTimelineAlignment(mockDb, 'ep_mock_01');
  assert.ok(loaded !== null);
  assert.equal(loaded.episodeId, 'ep_mock_01');
  assert.equal(loaded.intervals.length, 2);
  assert.equal(loaded.intervals[0].status, 'matched');
  assert.equal(loaded.intervals[1].status, 'cut_from_published');

  const engine = new TimelineEngine(loaded);
  const res = engine.convertUncutToPublished(100);
  assert.equal(res.targetTimeSec, 110);
  assert.equal(res.status, 'matched');
});

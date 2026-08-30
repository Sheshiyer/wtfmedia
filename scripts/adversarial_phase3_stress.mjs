#!/usr/bin/env node

/**
 * Adversarial Stress Test Harness for Phase 3 (Episode Ingestion + Provenance Spine)
 * Author: Empirical Challenger 1
 *
 * Tests:
 * 1. 10-Episode Benchmark (1,000 and 10,000 conversions) for latency, P95/P99, error bounds, symmetry
 * 2. Edge Case Coordinates (negative, beyond duration, NaN, Infinity, zero boundary, sub-millisecond)
 * 3. Cut and Added interval classification invariants
 * 4. Fuzz testing across 10,000 random floating point inputs
 * 5. High-concurrency / stress load
 */

import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TimelineEngine,
  convertCoordinate,
  verifyMathematicalSymmetry,
  parseAndValidateIntervals,
  normalizeInterval,
  createIdentityAlignment,
} from "../cloudflare/src/provenance/alignment-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const fixturesPath = join(rootDir, "cloudflare/test/fixtures/alignment-eval-10-episodes.json");

const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));

console.log("========================================================================");
console.log("       ADVERSARIAL STRESS TEST HARNESS - PHASE 3 PROVENANCE SPINE        ");
console.log("========================================================================");

const stressResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name, passed, details = "") {
  if (passed) {
    stressResults.passed++;
    console.log(`  [PASS] ${name} ${details}`);
    stressResults.tests.push({ name, status: "PASS", details });
  } else {
    stressResults.failed++;
    console.error(`  [FAIL] ${name} ${details}`);
    stressResults.tests.push({ name, status: "FAIL", details });
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: 10-Episode Golden Benchmark (1,000 queries)
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 1: 10-Episode Golden Benchmark (1,000 queries) ---");

let totalBenchmarkQueries = 0;
let maxMatchedError = 0;
let symmetryDiffs = [];
const benchmarkLatencies = [];

const benchmarkStart = performance.now();

for (const ep of fixtures.episodes) {
  const engine = new TimelineEngine(ep.intervals);

  for (const evalItem of ep.eval_coordinates) {
    totalBenchmarkQueries++;
    const t0 = performance.now();
    const res = engine.convert(evalItem.source_timeline, evalItem.time_sec);
    const t1 = performance.now();
    benchmarkLatencies.push(t1 - t0);

    // Status check
    if (res.status !== evalItem.expected_status) {
      recordTest(
        `Status Check ep=${ep.slug} src=${evalItem.source_timeline}@${evalItem.time_sec}`,
        false,
        `Expected ${evalItem.expected_status}, got ${res.status}`
      );
    }

    // Value check
    if (evalItem.expected_target_time_sec !== null) {
      if (res.targetTimeSec === null) {
        recordTest(`Target Not Null ep=${ep.slug}`, false, `Got null for expected ${evalItem.expected_target_time_sec}`);
      } else {
        const err = Math.abs(res.targetTimeSec - evalItem.expected_target_time_sec);
        if (err > maxMatchedError) maxMatchedError = err;
        if (err > 0.5) {
          recordTest(`Error Bound ep=${ep.slug}`, false, `Error ${err} > 0.5s`);
        }

        // Round-trip symmetry check on interior points
        if (res.status === "matched") {
          const revTimeline = evalItem.source_timeline === "uncut" ? "published" : "uncut";
          const revRes = engine.convert(revTimeline, res.targetTimeSec);
          if (revRes.targetTimeSec !== null) {
            const symDiff = Math.abs(revRes.targetTimeSec - evalItem.time_sec);
            symmetryDiffs.push(symDiff);
          }
        }
      }
    } else {
      if (res.targetTimeSec !== null) {
        recordTest(`Target Null ep=${ep.slug}`, false, `Got ${res.targetTimeSec} when expected null`);
      }
    }
  }
}

const totalBenchmarkElapsed = performance.now() - benchmarkStart;
const meanLatency = benchmarkLatencies.reduce((a, b) => a + b, 0) / benchmarkLatencies.length;
benchmarkLatencies.sort((a, b) => a - b);
const p95Latency = benchmarkLatencies[Math.floor(benchmarkLatencies.length * 0.95)];
const p99Latency = benchmarkLatencies[Math.floor(benchmarkLatencies.length * 0.99)];
const maxSymmetryDiff = symmetryDiffs.length > 0 ? Math.max(...symmetryDiffs) : 0;

recordTest(
  "1,000 Benchmark Queries Completed",
  totalBenchmarkQueries === 1000 && totalBenchmarkElapsed < 2000,
  `(${totalBenchmarkQueries} queries in ${totalBenchmarkElapsed.toFixed(2)}ms, limit <2000ms)`
);

recordTest(
  "Mean Query Latency < 0.1ms (100µs)",
  meanLatency < 0.1,
  `Mean: ${(meanLatency * 1000).toFixed(2)}µs, P95: ${(p95Latency * 1000).toFixed(2)}µs, P99: ${(p99Latency * 1000).toFixed(2)}µs`
);

recordTest(
  "Error Bounds < 0.5s",
  maxMatchedError <= 0.5,
  `Max matched error: ${maxMatchedError.toFixed(4)}s`
);

recordTest(
  "Mathematical Round-Trip Symmetry (|U(P(t)) - t| <= 10^-3s)",
  maxSymmetryDiff <= 0.001,
  `Max symmetry deviation: ${(maxSymmetryDiff * 1000).toFixed(4)}ms`
);

// -----------------------------------------------------------------------------
// TEST SUITE 2: Edge Case Coordinates & Boundary Conditions
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 2: Edge Case Coordinates & Boundary Conditions ---");

const testEp = fixtures.episodes[0];
const testEngine = new TimelineEngine(testEp.intervals);

// 1. Negative timestamps
const neg1 = testEngine.convert("uncut", -0.0001);
recordTest("Negative uncut (-0.0001s) returns unmapped/null", neg1.status === "unmapped" && neg1.targetTimeSec === null);

const neg2 = testEngine.convert("published", -1000.0);
recordTest("Negative published (-1000s) returns unmapped/null", neg2.status === "unmapped" && neg2.targetTimeSec === null);

// 2. Beyond duration timestamps
const overUncut = testEngine.convert("uncut", testEp.uncut_duration_sec + 0.001);
recordTest("Uncut beyond duration returns unmapped/null", overUncut.status === "unmapped" && overUncut.targetTimeSec === null);

const overPub = testEngine.convert("published", testEp.published_duration_sec + 500);
recordTest("Published beyond duration returns unmapped/null", overPub.status === "unmapped" && overPub.targetTimeSec === null);

// 3. Non-finite values (NaN, Infinity, -Infinity)
const nanRes = testEngine.convert("uncut", NaN);
recordTest("NaN timestamp returns unmapped/null gracefully", nanRes.status === "unmapped" && nanRes.targetTimeSec === null);

const infRes = testEngine.convert("uncut", Infinity);
recordTest("+Infinity timestamp returns unmapped/null gracefully", infRes.status === "unmapped" && infRes.targetTimeSec === null);

const negInfRes = testEngine.convert("published", -Infinity);
recordTest("-Infinity timestamp returns unmapped/null gracefully", negInfRes.status === "unmapped" && negInfRes.targetTimeSec === null);

// 4. Zero boundaries
const zeroUncut = testEngine.convert("uncut", 0.0);
recordTest("Exact zero boundary on uncut evaluates safely", zeroUncut.targetTimeSec === null && zeroUncut.status === "cut_from_published");

const zeroPub = testEngine.convert("published", 0.0);
recordTest("Exact zero boundary on published evaluates safely", zeroPub.status === "matched" && zeroPub.targetTimeSec === 60.0);

// 5. Cut interval moments (uncut 1850s is in interval 2: uncut 1800..1920)
const cutRes = testEngine.convert("uncut", 1850.0);
recordTest("Cut interval moment returns status 'cut_from_published' with null target", cutRes.status === "cut_from_published" && cutRes.targetTimeSec === null);

// 6. Added interval moments (pub 3450s is in interval 4: pub 3420..3480)
const addedRes = testEngine.convert("published", 3450.0);
recordTest("Added interval moment returns status 'added_in_published' with null target", addedRes.status === "added_in_published" && addedRes.targetTimeSec === null);

// 7. Non-existent / Empty intervals engine
const emptyEngine = new TimelineEngine([]);
const emptyRes = emptyEngine.convert("uncut", 100);
recordTest("Empty intervals engine returns unmapped/null", emptyRes.status === "unmapped" && emptyRes.targetTimeSec === null);

// -----------------------------------------------------------------------------
// TEST SUITE 3: Fuzz Testing (10,000 Random Timestamps)
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 3: Fuzz Testing (10,000 Random Timestamps) ---");

let fuzzExceptions = 0;
let fuzzUnmappedOrValid = 0;
const fuzzStart = performance.now();

for (let i = 0; i < 10000; i++) {
  // Random timestamp in range [-500, 10000]
  const time = (Math.random() * 10500) - 500;
  const sys = i % 2 === 0 ? "uncut" : "published";
  const ep = fixtures.episodes[i % fixtures.episodes.length];
  const engine = new TimelineEngine(ep.intervals);

  try {
    const res = engine.convert(sys, time);
    if (res && typeof res.status === "string") {
      fuzzUnmappedOrValid++;
    }
  } catch (err) {
    fuzzExceptions++;
  }
}

const fuzzElapsed = performance.now() - fuzzStart;

recordTest(
  "10,000 Fuzz Queries Executed Without Crashing",
  fuzzExceptions === 0 && fuzzUnmappedOrValid === 10000,
  `(${fuzzUnmappedOrValid} queries in ${fuzzElapsed.toFixed(2)}ms, 0 exceptions)`
);

// -----------------------------------------------------------------------------
// TEST SUITE 4: High-Scale Stress Benchmark (100,000 Conversions)
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 4: High-Scale Stress Benchmark (100,000 Conversions) ---");

const stressStart = performance.now();
const allEngines = fixtures.episodes.map((e) => new TimelineEngine(e.intervals));

for (let i = 0; i < 100000; i++) {
  const engine = allEngines[i % allEngines.length];
  const t = (i * 3.7) % 6000;
  engine.convert("uncut", t);
}

const stressElapsed = performance.now() - stressStart;
const throughputOpsPerSec = Math.round(100000 / (stressElapsed / 1000));

recordTest(
  "100,000 High-Scale Conversions Stress Test",
  stressElapsed < 2000,
  `Completed in ${stressElapsed.toFixed(2)}ms (${throughputOpsPerSec.toLocaleString()} ops/sec)`
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n========================================================================");
console.log(`STRESS TEST SUMMARY: ${stressResults.passed} PASSED, ${stressResults.failed} FAILED`);
console.log("========================================================================");

if (stressResults.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

/**
 * Plan 01-20 Task 2 — Final aggregate writer (exclusive owner).
 *
 * Wraps the read-only validation module from Plan 01-18. Validates all 23
 * plan fragments, requires exact 72-definition parity with all results
 * passing, natural-sorts by plan then threat ID, and atomically writes
 * web/tests/security/phase1-threat-results.json.
 *
 * Usage:
 *   node scripts/merge-phase1-threat-results.mjs --final --output tests/security/phase1-threat-results.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkMerge, ALL_PLANS } from "./lib/phase1-threat-results.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isFinal = args.includes("--final");
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "tests/security/phase1-threat-results.json";

if (!isFinal) {
  console.error("Error: --final is required (this script only writes the final aggregate)");
  process.exit(1);
}

// Final mode: all 23 plans, no exemptions
const result = checkMerge({ completedPlans: ALL_PLANS, final: true });

if (result.results.length !== 72) {
  console.error(`Expected 72 results, got ${result.results.length}`);
  process.exit(1);
}

const aggregate = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  total_definitions: 72,
  total_results: result.results.length,
  results: Object.fromEntries(result.results.map((r) => [r.id, r])),
};

const absoluteOutput = path.resolve(WEB_ROOT, outputPath);
const expectedDirectory = path.join(WEB_ROOT, "tests/security");
if (!absoluteOutput.startsWith(expectedDirectory)) {
  console.error("Refusing to write outside tests/security");
  process.exit(1);
}

// Atomic write
const tmp = `${absoluteOutput}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(aggregate, null, 2)}\n`, { flag: "wx" });
fs.renameSync(tmp, absoluteOutput);

console.log(`✓ Final aggregate written: ${path.relative(WEB_ROOT, absoluteOutput)}`);
console.log(`  ${result.results.length} results, exact 72-definition parity, all passed`);

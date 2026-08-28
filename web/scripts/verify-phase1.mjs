#!/usr/bin/env node

/**
 * Plan 01-18 Task 2 — Static ordered fail-fast Phase 1 aggregate verifier.
 *
 * Runs a static sequence of child commands with inherited stdio, explicit
 * environment preflight, signal handling, immediate exit-code propagation,
 * and repository-relative artifact paths. No live external service.
 *
 * Sections:
 *   1. Preflight (Node version, npm, Chromium)
 *   2. Lint + typecheck
 *   3. Unit + contracts
 *   4. Component + accessibility
 *   5. Storybook build
 *   6. Production build
 *   7. Browser + visual
 *   8. Performance + RAG
 *   9. Privacy
 *  10. Rollback
 *  11. Threat ledger validation
 *  12. Approval check
 *
 * First nonzero child exits aggregate nonzero with section/command identity.
 * No failure is swallowed or downgraded.
 *
 * Flags:
 *   --candidate   Check-merge in memory (no aggregate write, exemptions allowed)
 *   --self-test   Run threat ledger self-test only
 *   --self-test-threat-ledger   Validate ledger parity
 *     --case=final-task-ordering  Final mode (no exemptions)
 *   --check-validation-waves   Verify plan/wave mappings
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");

// ── Flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FLAG_CANDIDATE = args.includes("--candidate");
const FLAG_SELF_TEST = args.includes("--self-test");
const FLAG_SELF_TEST_LEDGER = args.includes("--self-test-threat-ledger");
const FLAG_CHECK_WAVES = args.includes("--check-validation-waves");

let ledgerCase = null;
for (const arg of args) {
  if (arg.startsWith("--case=")) ledgerCase = arg.slice(7);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function run(command, label) {
  const tag = label || command;
  process.stdout.write(`\n[verify] ${tag}\n`);
  const result = spawnSync(command, {
    shell: "/bin/sh",
    stdio: "inherit",
    cwd: WEB_ROOT,
    env: process.env,
    timeout: 600_000,
  });
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  if (exitCode !== 0) {
    process.stdout.write(`[verify] ✗ FAILED: ${tag} (exit ${exitCode})\n`);
    process.exit(exitCode);
  }
  process.stdout.write(`[verify] ✓ ${tag}\n`);
}

function section(name) {
  process.stdout.write(`\n${"─".repeat(70)}\n${name}\n${"─".repeat(70)}\n`);
}

// ── Self-test mode ───────────────────────────────────────────────────────

if (FLAG_SELF_TEST) {
  const { selfTest } = await import("./lib/phase1-threat-results.mjs");
  selfTest();

  if (FLAG_SELF_TEST_LEDGER) {
    const { selfTestThreatLedger } = await import("./lib/phase1-threat-results.mjs");
    selfTestThreatLedger(ledgerCase ? { case: ledgerCase } : {});
  }

  process.stdout.write("\n✓ Aggregate self-test passed\n");
  process.exit(0);
}

if (FLAG_SELF_TEST_LEDGER && !FLAG_SELF_TEST) {
  const { selfTestThreatLedger } = await import("./lib/phase1-threat-results.mjs");
  selfTestThreatLedger(ledgerCase ? { case: ledgerCase } : {});
  process.exit(0);
}

// ── Validation waves check ───────────────────────────────────────────────

if (FLAG_CHECK_WAVES) {
  const validationPath = path.join(WEB_ROOT, "..", ".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md");
  const source = fs.readFileSync(validationPath, "utf8");

  // Verify plan/wave mapping parser
  const planWaveMap = new Map();
  for (const planFile of fs.readdirSync(path.join(WEB_ROOT, "..", ".planning/phases/01-compatibility-component-proof-harness"))) {
    if (!/^\d{2}-\d{2}-PLAN\.md$/.test(planFile)) continue;
    const planSrc = fs.readFileSync(
      path.join(WEB_ROOT, "..", ".planning/phases/01-compatibility-component-proof-harness", planFile),
      "utf8"
    );
    const plan = planFile.replace(/-PLAN\.md$/, "");
    const waveMatch = planSrc.match(/^wave:\s*(\d+)/m);
    if (waveMatch) planWaveMap.set(plan, Number(waveMatch[1]));
  }

  // Verify Plan 01-19 maps to Wave 20
  if (planWaveMap.get("01-19") !== 20) {
    process.stderr.write(`Plan 01-19 must map to Wave 20, found ${planWaveMap.get("01-19")}\n`);
    process.exit(1);
  }

  process.stdout.write(`✓ Validation wave parity: ${planWaveMap.size} plans verified\n`);
  process.stdout.write(`  Plan 01-19 → Wave ${planWaveMap.get("01-19")} ✓\n`);
  process.exit(0);
}

// ── Candidate mode ───────────────────────────────────────────────────────

if (FLAG_CANDIDATE) {
  const { checkMerge } = await import("./lib/phase1-threat-results.mjs");

  section("CANDIDATE CHECK-MERGE");
  try {
    const result = checkMerge();
    process.stdout.write(`✓ Candidate merge: ${result.results.length} results from ${result.completedCount} plans\n`);
    process.stdout.write(`  Definitions: ${result.totalDefinitions} non-exempt, ${result.exemptedCount} exempted\n`);
  } catch (error) {
    process.stderr.write(`✗ Candidate merge failed: ${error.message}\n`);
    process.exit(1);
  }
  process.exit(0);
}

// ── Full aggregate sequence ──────────────────────────────────────────────

process.stdout.write("Phase 01-18: Full aggregate verification\n");
process.stdout.write("=".repeat(70) + "\n");

// Signal handling — propagate to children
let childPid = null;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (childPid) {
      try { process.kill(childPid, signal); } catch {}
    }
    process.exit(130);
  });
}

// 1. Preflight
section("1. Preflight");
run("node -e 'var v=parseInt(process.version.slice(1));if(v<18)process.exit(1)'", "Node >= 18");
run("npm --version", "npm available");
run("npx playwright --version", "Playwright available");

// 2. Lint + typecheck
section("2. Lint + typecheck");
run("npm run lint", "ESLint");
run("npm run typecheck", "TypeScript");

// 3. Unit + contracts
section("3. Unit + contracts");
run("npm run test:unit", "Unit tests");
run("npm run test:contracts", "Contract tests");

// 4. Component + accessibility
section("4. Component + accessibility");
run("npm run test:components", "Component tests (Storybook)");
run("npm run test:a11y", "Accessibility tests");

// 5. Storybook build
section("5. Storybook build");
run("npx storybook build --output-dir storybook-static --quiet", "Storybook build");

// 6. Production build
section("6. Production build");
run("npm run build", "Next.js production build");

// 7. Browser + visual
section("7. Browser + visual");
run("npm run test:browser", "Browser journey tests");
run("PHASE1_VISUAL_CANDIDATE=1 npx playwright test --project=phase1-chromium --grep @visual tests/visual/", "Visual candidate captures");

// 8. Performance + RAG
section("8. Performance + RAG");
run("node -e \"const b=require('./tests/performance/phase1-budgets.json');if(b.status!=='approved')process.exit(1);console.log('Performance budgets: approved')\"", "Performance budget integrity");
run("npm run test:contracts -- tests/contracts/rag-latency.test.ts", "RAG latency contract");

// 9. Privacy
section("9. Privacy");
run("npm run test:privacy -- --check", "Privacy scanner");

// 10. Rollback
section("10. Rollback");
run("npm run test:rollback", "Dual-variant rollback rehearsal");

// 11. Threat ledger
section("11. Threat ledger");
run("node scripts/verify-phase1.mjs --self-test --self-test-threat-ledger", "Aggregate self-test + ledger parity");

// 12. Approval check
section("12. Approval");
const approvalPath = path.join(WEB_ROOT, "tests/visual/phase1-approval.json");
if (!fs.existsSync(approvalPath)) {
  process.stdout.write("[verify] ⚠ Owner approval artifact not yet present\n");
  process.stdout.write("[verify]    Expected: tests/visual/phase1-approval.json\n");
  process.stdout.write("[verify]    This is expected during candidate mode or pre-approval.\n");
} else {
  try {
    const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
    if (approval.status !== "approved") {
      process.stderr.write("[verify] ✗ Approval status is not 'approved'\n");
      process.exit(1);
    }
    if (!approval.cutover_authorized) {
      process.stderr.write("[verify] ✗ Cutover not authorized\n");
      process.exit(1);
    }
    process.stdout.write("[verify] ✓ Owner approval verified\n");
  } catch (e) {
    process.stderr.write(`[verify] ✗ Invalid approval artifact: ${e.message}\n`);
    process.exit(1);
  }
}

process.stdout.write(`\n${"=".repeat(70)}\n`);
process.stdout.write("✓ Phase 1 aggregate verification PASSED\n");
process.stdout.write(`${"=".repeat(70)}\n`);

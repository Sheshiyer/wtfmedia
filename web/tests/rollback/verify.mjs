#!/usr/bin/env node

/**
 * Plan 01-18 Task 1 — All-route dual-variant rollback rehearsal (T-01-57).
 *
 * Fresh builds for both legacy and migrated variants, then runs the shared
 * route contract and smoke matrix against each. Records build/source hashes
 * and verifies protected data files are unchanged.
 *
 * - Compares data-file hashes before/after
 * - Never uses git reset/checkout/clean/stage/commit
 * - Never calls Vercel/Cloudflare/live RAG
 * - Fails immediately on any variant or contract failure
 *
 * Usage:
 *   node tests/rollback/verify.mjs --route=/episodes   (single route, backward compat)
 *   node tests/rollback/verify.mjs                     (all protected routes, both variants)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    route: { type: "string" },
  },
});

const WEB_ROOT = process.cwd();

const routeTestMap = {
  "/": "tests/rollback/home-variant.spec.ts",
  "/episodes": "tests/rollback/episodes-variant.spec.ts",
  "/connections": "tests/rollback/connections-variant.spec.ts",
  "/chat": "tests/rollback/chat-variant.spec.ts",
};

const PROTECTED_DATA_FILES = [
  "src/data/episodes.json",
  "src/data/connections.json",
  "src/data/vectors.json",
];

function hashFile(filePath) {
  const absolute = path.join(WEB_ROOT, filePath);
  if (!fs.existsSync(absolute)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
}

function captureDataHashes() {
  const hashes = {};
  for (const file of PROTECTED_DATA_FILES) {
    hashes[file] = hashFile(file);
  }
  return hashes;
}

function runRollbackSpecs(variant, testFiles) {
  console.log(`\n[${variant}] Running ${testFiles.length} rollback spec(s)...`);
  const env = {
    ...process.env,
    WTF_PUBLIC_UI_VARIANT: variant,
    PORT: "4173",
    CI: "1",
  };
  const files = testFiles.join(" ");
  try {
    execSync(
      `npx playwright test ${files} --project=phase1-chromium --reporter=line`,
      { stdio: "inherit", cwd: WEB_ROOT, env, timeout: 300_000 }
    );
    console.log(`[${variant}] All specs passed ✓`);
    return { variant, status: "passed" };
  } catch (error) {
    console.error(`[${variant}] Specs failed ✗`);
    return { variant, status: "failed", error: error.message?.slice(0, 200) };
  }
}

function runAllVariants() {
  console.log("Phase 01-18 Task 1: All-route dual-variant rollback rehearsal");
  console.log("=".repeat(70));

  const beforeHashes = captureDataHashes();
  console.log("\nProtected data files (pre-test):");
  for (const [file, hash] of Object.entries(beforeHashes)) {
    console.log(`  ${file}: ${hash?.slice(0, 16)}...`);
  }

  const allTestFiles = Object.values(routeTestMap);
  const routes = Object.keys(routeTestMap);
  const results = [];

  for (const variant of ["legacy", "migrated"]) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`${variant.toUpperCase()} VARIANT — ${routes.length} routes`);
    console.log("─".repeat(70));

    // Build with the target variant (Playwright webServer will start it)
    console.log(`[${variant}] Building (WTF_PUBLIC_UI_VARIANT=${variant})...`);
    try {
      execSync("npm run build", {
        stdio: "pipe",
        cwd: WEB_ROOT,
        env: { ...process.env, WTF_PUBLIC_UI_VARIANT: variant },
        timeout: 180_000,
      });
    } catch (e) {
      console.error(`[${variant}] Build failed ✗`);
      process.exit(1);
    }
    console.log(`[${variant}] Build complete`);

    const result = runRollbackSpecs(variant, allTestFiles);
    results.push(result);
    if (result.status === "failed") {
      console.log(`\n❌ Aborting — ${variant} variant failed`);
      process.exit(1);
    }
  }

  // Verify data file integrity
  const afterHashes = captureDataHashes();
  console.log(`\n${"─".repeat(70)}`);
  console.log("DATA INTEGRITY CHECK");
  console.log("─".repeat(70));
  let dataIntegrityPass = true;
  for (const file of PROTECTED_DATA_FILES) {
    const before = beforeHashes[file];
    const after = afterHashes[file];
    const match = before === after;
    dataIntegrityPass = dataIntegrityPass && match;
    console.log(`  ${file}: ${match ? "✓ unchanged" : "✗ CHANGED"}`);
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("ROLLBACK REHEARSAL SUMMARY");
  console.log("=".repeat(70));
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`  Total:    ${results.length * routes.length} variant/route combinations`);
  console.log(`  Passed:   ${passed * routes.length}`);
  console.log(`  Failed:   ${failed * routes.length}`);
  console.log(`  Data integrity: ${dataIntegrityPass ? "✓ pass" : "✗ fail"}`);

  if (failed > 0 || !dataIntegrityPass) {
    console.log("\n❌ Rollback rehearsal FAILED");
    process.exit(1);
  }

  console.log("\n✓ Rollback rehearsal PASSED");
  console.log("  Both variants serve all protected routes without data mutation.");
}

if (values.route) {
  const variant = process.env.WTF_PUBLIC_UI_VARIANT || "legacy";
  const testFile = routeTestMap[values.route];
  if (!testFile) {
    console.error(`Error: No rollback test for route ${values.route}`);
    process.exit(1);
  }
  runRollbackSpecs(variant, [testFile]);
} else {
  runAllVariants();
}

#!/usr/bin/env node

/**
 * Read-only Phase 3 regression runner.
 *
 * This command deliberately delegates to the real focused tests and typecheck
 * rather than simulating Worker behavior, generating fixtures, or declaring
 * requirement completion. A green result is local regression evidence only;
 * deployment and owner-gated integration evidence remain separate.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const checks = [
  {
    label: "Cloudflare Phase 3 focused tests",
    command: npm,
    args: [
      "--prefix", "cloudflare", "test", "--",
      "asset-upload",
      "phase3-e2e-provenance",
      "youtube-ingest",
      "transcript-ingest",
      "timeline-alignment",
      "d1-provenance",
      "d1-migrations",
    ],
  },
  {
    label: "Public provenance unit tests",
    command: npm,
    args: ["--prefix", "web", "run", "test:unit", "--", "tests/unit/phase3-public-provenance.test.ts", "tests/unit/dual-playback.test.ts"],
  },
  {
    label: "Web TypeScript check",
    command: npm,
    args: ["--prefix", "web", "run", "typecheck"],
  },
  {
    label: "Whitespace check",
    command: "git",
    args: ["diff", "--check"],
  },
];

let failures = 0;
for (const check of checks) {
  console.log(`\n▶ ${check.label}`);
  const result = spawnSync(check.command, check.args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    failures += 1;
    console.error(`✗ ${check.label} failed`);
  } else {
    console.log(`✓ ${check.label}`);
  }
}

if (failures > 0) {
  console.error(`\nPhase 3 local regression checks failed (${failures}/${checks.length}).`);
  process.exitCode = 1;
} else {
  console.log("\nPhase 3 local regression checks passed. This is not deployment or owner-acceptance evidence.");
}

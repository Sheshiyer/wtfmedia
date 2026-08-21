#!/usr/bin/env node
/**
 * Minimal offline privacy scanner for Plan 01-04.
 * Accepts only --check.
 * Scans Storybook config and synthetic public fixture roots.
 * Rejects: secret names, private-link patterns, model prompts, operator fields, machine-local absolute paths.
 * Emits repository-relative names + zero-violation summary.
 * Never reads live services or raw production corpus.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const WEB_ROOT = path.resolve(__dirname, "../..");

const FORBIDDEN = {
  secret: /\b(secret|api[_-]?key|token|auth|password|credential)\b/i,
  privateLink: /https?:\/\/(?!example\.test|localhost|127\.0\.0\.1)/i,
  prompt: /\b(prompt|system|user|assistant)\s*[:=]\s*["'].{20,}/i,
  operator: /\b(owner|lead|budget|brief|task|dossier|production|health|permission)\b/i,
  machinePath: /\/(Users|home|root|Volumes|private\/tmp)\/[^\s"']+/i,
};

const ALLOWED_ROOTS = [
  path.join(WEB_ROOT, ".storybook"),
  path.join(WEB_ROOT, "stories/fixtures"),
];

function isAllowed(p) {
  return ALLOWED_ROOTS.some((root) => p.startsWith(root));
}

function scanFile(file) {
  const rel = path.relative(REPO_ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  const violations = [];

  for (const [name, re] of Object.entries(FORBIDDEN)) {
    if (re.test(src)) {
      violations.push({ type: name, file: rel });
    }
  }
  return violations;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|json|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] !== "--check") {
    console.error("Usage: node tests/privacy/scan.mjs --check");
    process.exit(2);
  }

  const files = [];
  for (const root of ALLOWED_ROOTS) {
    if (fs.existsSync(root)) files.push(...walk(root));
  }

  const allViolations = [];
  for (const f of files) {
    if (!isAllowed(f)) continue;
    allViolations.push(...scanFile(f));
  }

  const summary = {
    scanned: files.map((f) => path.relative(REPO_ROOT, f)),
    violations: allViolations,
    count: allViolations.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (allViolations.length > 0) {
    console.error(`Privacy scan failed: ${allViolations.length} violation(s)`);
    process.exit(1);
  }

  console.log("Privacy scan: 0 violations across deterministic public fixture roots.");
  process.exit(0);
}

main();

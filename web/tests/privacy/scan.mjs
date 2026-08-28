#!/usr/bin/env node
/**
 * Offline privacy scanner for Plan 01-04/01-05.
 * Accepts only --check.
 *
 * Two coverage tiers:
 *  - Legacy roots (.storybook, stories/fixtures): the original 5 broad
 *    FORBIDDEN keyword categories, unchanged.
 *  - Extended roots (source, tests, generated artifacts, .planning): a
 *    narrower set of value-shaped/key-shaped patterns designed to avoid
 *    false positives against ordinary source code and planning prose
 *    (plain English words like "task", "owner", "production", "health"
 *    are not themselves leaks).
 *
 * Rejects: secret-shaped literal values, assigned secret literals, the
 * forbidden operator/private vocabulary used as a quoted object key,
 * machine-local absolute paths, and (in .planning only) shared-drive
 * links and private meeting-transcript phrasing (ISC-121/ISC-122).
 *
 * This is not a general-purpose secret detector: it reports named leak
 * classes and fails closed on matches outside documented synthetic dummy
 * allowlists. It never reads live services or raw production corpus.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const WEB_ROOT = path.resolve(__dirname, "../..");

// Original 5 categories — unchanged, apply only to the legacy roots below.
const LEGACY_FORBIDDEN = {
  secret: /\b(secret|api[_-]?key|token|auth|password|credential)\b/i,
  privateLink: /https?:\/\/(?!example\.test|localhost|127\.0\.0\.1)/i,
  prompt: /\b(prompt|system|user|assistant)\s*[:=]\s*["'].{20,}/i,
  operator: /\b(owner|lead|budget|brief|task|dossier|production|health|permission)\b/i,
  machinePath: /\/(Users|home|root|Volumes|private\/tmp)\/[^\s"']+/i,
};

const LEGACY_ROOTS = [path.join(WEB_ROOT, ".storybook"), path.join(WEB_ROOT, "stories/fixtures")];

// Extended, narrow, value/key-shaped patterns for source/artifact/planning roots.
const OPERATOR_VOCAB = [
  "tasks",
  "owners",
  "leads",
  "budgets",
  "briefs",
  "health",
  "production",
  "permissions",
  "credentials",
  "credential",
  "secret",
  "secrets",
  "token",
  "apiKey",
  "api_key",
  "password",
  "sessionId",
  "session_id",
  "internalNotes",
  "dossier",
  "ownerEmail",
  "assignee",
  "assignees",
  "guests",
  "guestLeads",
  "meetingNotes",
  "driveLink",
  "calendarInvite",
  "prompt",
  "systemPrompt",
  "rawPayload",
  "internalId",
];
const operatorKeyPattern = new RegExp(`["'](${OPERATOR_VOCAB.join("|")})["']\\s*:`, "i");

const EXTENDED_FORBIDDEN = {
  // Secret-shaped literal values: Bearer tokens, sk-/ghp_ style keys, AWS access key ids.
  credentialValue: /\b(Bearer\s+[A-Za-z0-9._-]{10,}|sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/,
  // ALL_CAPS SECRET/TOKEN/PASSWORD/CREDENTIAL identifier assigned to a quoted literal of 6+ chars.
  // Skips process.env reads (no literal there) and camelCase identifiers (dummy test doubles).
  assignedSecretLiteral: /\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*\s*[:=]\s*["']([^"']{6,})["']/,
  operatorKey: operatorKeyPattern,
  machinePath: /\/(Users|home|root|Volumes|private\/tmp)\/[^\s"']+/i,
};

// .planning-only checks (ISC-121/ISC-122): narrow, not prose-wide keyword matching.
const PLANNING_FORBIDDEN = {
  driveLink: /https?:\/\/(docs\.google\.com|drive\.google\.com|[a-z0-9-]+\.notion\.so|[a-z0-9-]+\.slack\.com)\/(?!#sha256)\S+/i,
  privateMeetingPhrase: /\b(zoom transcript|meeting transcript|attendees:|meeting notes:)\b/i,
  machinePath: /\/(Users|home|root|Volumes|private\/tmp)\/[^\s"']+/i,
};

// Extended source/test/artifact roots. Existence-gated ones are checked at scan time.
const EXTENDED_REQUIRED_ROOTS = [
  path.join(WEB_ROOT, "app"),
  path.join(WEB_ROOT, "lib"),
  path.join(WEB_ROOT, "components"),
  path.join(WEB_ROOT, "tests/contracts"),
  path.join(WEB_ROOT, "tests/support"),
];
const EXTENDED_OPTIONAL_ROOTS = [
  path.join(WEB_ROOT, ".next"),
  path.join(WEB_ROOT, "storybook-static"),
  path.join(WEB_ROOT, "playwright-report"),
  path.join(WEB_ROOT, "test-results"),
  path.join(WEB_ROOT, "lighthouse-reports"),
];
const PLANNING_ROOT = path.join(REPO_ROOT, ".planning");

function isDummyValue(literal) {
  return typeof literal === "string" && literal.toLowerCase().startsWith("dummy");
}

/**
 * Extended/planning roots may contain gitignored local build or dispatch-
 * tooling state (e.g. web/.next's own deploy manifests, which structurally
 * embed the local build-time absolute path on every checkout, or ephemeral
 * .planning dispatch snapshots). Those are not part of the repository's
 * shipped or reviewed content, so they are out of scope for this scanner.
 * Falls back to scanning everything if git is unavailable.
 */
function filterIgnored(absPaths) {
  if (absPaths.length === 0) return absPaths;
  const result = spawnSync("git", ["check-ignore", "--stdin"], {
    cwd: REPO_ROOT,
    input: absPaths.join("\n"),
    encoding: "utf8",
  });
  if (result.error || result.status === null) return absPaths;
  const ignored = new Set(result.stdout.split("\n").filter(Boolean));
  return absPaths.filter((p) => !ignored.has(p));
}

function isAllowedRoot(p, roots) {
  return roots.some((root) => p.startsWith(root));
}

function scanFileWithPatterns(file, relRoot, patterns, { extractAssignedLiteral = false } = {}) {
  const rel = path.relative(relRoot, file);
  const src = fs.readFileSync(file, "utf8");
  const violations = [];
  for (const [name, re] of Object.entries(patterns)) {
    if (name === "assignedSecretLiteral" && extractAssignedLiteral) {
      const match = src.match(re);
      if (match && !isDummyValue(match[1])) {
        violations.push({ type: name, file: rel });
      }
      continue;
    }
    if (re.test(src)) {
      violations.push({ type: name, file: rel });
    }
  }
  return violations;
}

function walk(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, exts, acc);
    } else if (exts.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] !== "--check") {
    console.error("Usage: node tests/privacy/scan.mjs --check");
    process.exit(2);
  }

  const allViolations = [];
  const scanned = [];

  // Legacy roots — original 5 categories, unchanged behavior.
  const legacyFiles = [];
  for (const root of LEGACY_ROOTS) {
    if (fs.existsSync(root)) legacyFiles.push(...walk(root, /\.(ts|tsx|js|json|mjs)$/));
  }
  for (const f of legacyFiles) {
    if (!isAllowedRoot(f, LEGACY_ROOTS)) continue;
    scanned.push(path.relative(REPO_ROOT, f));
    allViolations.push(...scanFileWithPatterns(f, REPO_ROOT, LEGACY_FORBIDDEN));
  }

  // Extended source/test/artifact roots — narrow value/key-shaped patterns.
  const extendedRoots = [
    ...EXTENDED_REQUIRED_ROOTS,
    ...EXTENDED_OPTIONAL_ROOTS.filter((root) => fs.existsSync(root)),
  ];
  let extendedFiles = [];
  for (const root of extendedRoots) {
    extendedFiles.push(...walk(root, /\.(ts|tsx|js|jsx|json|mjs|cjs|html)$/));
  }
  extendedFiles = filterIgnored(extendedFiles);
  for (const f of extendedFiles) {
    scanned.push(path.relative(REPO_ROOT, f));
    allViolations.push(...scanFileWithPatterns(f, REPO_ROOT, EXTENDED_FORBIDDEN, { extractAssignedLiteral: true }));
  }

  // .planning root — driveLink + privateMeetingPhrase + machinePath only, no prose-wide keyword matching.
  if (fs.existsSync(PLANNING_ROOT)) {
    const planningFiles = filterIgnored(walk(PLANNING_ROOT, /\.(md|json)$/));
    for (const f of planningFiles) {
      scanned.push(path.relative(REPO_ROOT, f));
      allViolations.push(...scanFileWithPatterns(f, REPO_ROOT, PLANNING_FORBIDDEN));
    }
  }

  const summary = {
    scanned,
    violations: allViolations,
    count: allViolations.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (allViolations.length > 0) {
    console.error(`Privacy scan failed: ${allViolations.length} violation(s)`);
    process.exit(1);
  }

  console.log(`Privacy scan: 0 violations across ${scanned.length} files in bounded public/artifact/planning roots.`);
  process.exit(0);
}

main();

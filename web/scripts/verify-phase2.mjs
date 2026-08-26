#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(webRoot, "..");
const args = new Set(process.argv.slice(2));
function run(command, label) { const result = spawnSync(command, { cwd: webRoot, shell: "/bin/sh", stdio: "inherit", timeout: 600_000 }); if (result.status !== 0) { console.error(`Phase 2 failed: ${label}`); process.exit(result.status || 1); } }
function receipt(file, label) { if (!fs.existsSync(file)) { console.error(`Missing required ${label} receipt`); process.exit(1); } try { const value = JSON.parse(fs.readFileSync(file, "utf8")); if (value.status !== "passed" && value.status !== "approved") throw new Error("non-passing status"); } catch { console.error(`Invalid ${label} receipt`); process.exit(1); } }
if (args.has("--negative-fixtures")) {
  const missing = path.join(root, ".runtime/preflight/phase2-staging.json");
  if (fs.existsSync(missing)) { console.error("Negative fixture requires absent staging receipt"); process.exit(1); }
  console.log("negative fixture passed: absent staging receipt blocks verification"); process.exit(0);
}
console.log("Phase 2 deterministic verification");
for (const [label, command] of [["threat definitions", "node scripts/lib/phase2-threat-results.mjs --check-definitions"], ["typecheck", "npm run typecheck"], ["Cloudflare tests", "npm --prefix ../cloudflare test"], ["operator UI", "npm run test:browser -- tests/phase2/control-room.spec.ts tests/phase2/operators.spec.ts tests/phase2/audit-ui.spec.ts"], ["audit filter unit", "npm run test:unit -- audit-filters"], ["privacy", "npm run test:privacy -- --check"]]) run(command, label);
if (args.has("--staging") || args.has("--final")) receipt(path.join(root, ".runtime/preflight/phase2-staging.json"), "staging");
if (args.has("--final")) { receipt(path.join(webRoot, "tests/visual/phase2-approval.json"), "owner approval"); receipt(path.join(root, ".runtime/preflight/phase2-production-smoke.json"), "production smoke"); }
console.log("Phase 2 deterministic verification passed");

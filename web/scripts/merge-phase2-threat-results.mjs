import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefinitions, validateDefinitionLedger, validateFragment } from "./lib/phase2-threat-results.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitions = validateDefinitionLedger(loadDefinitions());
const fragments = path.join(root, "tests/security/phase2-threat-results");
const results = {};
for (const plan of new Set([...definitions.values()].map((value) => value.plan))) { const file = path.join(fragments, `${plan}.json`); if (!fs.existsSync(file)) throw new Error(`Missing threat fragment: ${plan}`); const fragment = JSON.parse(fs.readFileSync(file, "utf8")); validateFragment(fragment, plan, definitions); Object.assign(results, fragment.results); }
if (Object.keys(results).length !== definitions.size || Object.values(results).some((result) => result.status !== "passed")) throw new Error("Threat evidence is incomplete or failed");
if (process.argv.includes("--check")) { console.log(`Phase 2 threat aggregate: ${Object.keys(results).length} passed`); process.exit(0); }
fs.writeFileSync(path.join(root, "tests/security/phase2-threat-results.json"), `${JSON.stringify({ schema_version: 1, total_definitions: definitions.size, results }, null, 2)}\n`);

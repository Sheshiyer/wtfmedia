import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "BASE_URL", "WTFMEDIA_STAGING_HOST", "WTFMEDIA_STAGING_D1_REF",
  "WTFMEDIA_STAGING_ACCESS_APPLICATION_REF", "WTFMEDIA_STAGING_ACCESS_POLICY_REF",
  "WTFMEDIA_STAGING_CACHE_NAMESPACE_REF", "WTFMEDIA_STAGING_WORKER_ROUTE_REF",
  "WTFMEDIA_STAGING_SECRET_SET", "WTFMEDIA_STAGING_COMMANDS",
  "WTFMEDIA_PRODUCTION_D1_REF", "WTFMEDIA_PRODUCTION_ACCESS_APPLICATION_REF",
  "WTFMEDIA_PRODUCTION_ACCESS_POLICY_REF", "WTFMEDIA_PRODUCTION_CACHE_NAMESPACE_REF",
  "WTFMEDIA_PRODUCTION_WORKER_ROUTE_REF", "WTFMEDIA_PRODUCTION_SECRET_SET",
];
const stagingResources = ["D1_REF", "ACCESS_APPLICATION_REF", "ACCESS_POLICY_REF", "CACHE_NAMESPACE_REF", "WORKER_ROUTE_REF", "SECRET_SET"];

function fail(message) { console.error(message); process.exit(1); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function option(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
function requiredValue(name) { const value = process.env[name]; if (!value) fail(`Missing required staging target: ${name}`); return value; }
function symbolic(value, name) { if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(value)) fail(`Invalid symbolic staging target: ${name}`); }

const receipt = option("--receipt");
if (!receipt || process.argv.length !== 4 || process.argv[2] !== "--receipt") fail("Usage: node cloudflare/scripts/phase2-preflight.mjs --receipt .runtime/preflight/phase2-staging.json");
if (process.env.WTFMEDIA_ENVIRONMENT !== "staging") fail("WTFMEDIA_ENVIRONMENT must equal staging");
for (const name of required) requiredValue(name);

let base;
try { base = new URL(requiredValue("BASE_URL")); } catch { fail("BASE_URL must be an absolute HTTP(S) URL"); }
if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") fail("BASE_URL must be a credential-free staging origin");
if (base.hostname.toLowerCase() !== requiredValue("WTFMEDIA_STAGING_HOST").toLowerCase()) fail("BASE_URL host must exactly match WTFMEDIA_STAGING_HOST");

const resources = {};
for (const suffix of stagingResources) {
  const staging = requiredValue(`WTFMEDIA_STAGING_${suffix}`); const production = requiredValue(`WTFMEDIA_PRODUCTION_${suffix}`);
  symbolic(staging, `WTFMEDIA_STAGING_${suffix}`); symbolic(production, `WTFMEDIA_PRODUCTION_${suffix}`);
  if (staging === production) fail(`Staging and production must be distinct: ${suffix}`);
  resources[suffix.toLowerCase()] = staging;
}

let commands;
try { commands = JSON.parse(requiredValue("WTFMEDIA_STAGING_COMMANDS")); } catch { fail("WTFMEDIA_STAGING_COMMANDS must be a JSON command list"); }
if (!Array.isArray(commands) || commands.length < 3 || commands.some((command) => typeof command !== "string" || command.length > 500 || /(?:[;&`]|\$\(|\r|\n)/.test(command))) fail("WTFMEDIA_STAGING_COMMANDS must be a bounded safe command list");
if (!commands.some((command) => /wrangler d1 migrations apply/.test(command) && /--env staging/.test(command) && /--remote/.test(command))
  || !commands.some((command) => /wrangler deploy/.test(command) && /--env staging/.test(command))
  || !commands.some((command) => /verify:phase2.*--staging/.test(command))) fail("Staging command list is missing a required migration, deploy, or verification command");

const destination = path.resolve(root, receipt);
const receiptRoot = path.join(root, ".runtime", "preflight") + path.sep;
if (!destination.startsWith(receiptRoot) || path.extname(destination) !== ".json") fail("Receipt path must be an ignored .runtime/preflight JSON file");
fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
if (fs.lstatSync(path.dirname(destination)).isSymbolicLink() || fs.existsSync(destination)) fail("Receipt target must be new and non-symlinked");

const migrations = fs.readdirSync(path.join(root, "cloudflare", "migrations")).filter((entry) => /^\d{4}_.+\.sql$/.test(entry)).map((entry) => entry.slice(0, 4)).sort();
const evidence = {
  schema_version: 1, status: "passed", environment: "staging", created_at: new Date().toISOString(),
  base_url_sha256: sha256(base.origin), resource_refs: resources, migrations,
  commands_sha256: sha256(JSON.stringify(commands)), distinctness_sha256: sha256(JSON.stringify({ resources, production: stagingResources.map((suffix) => process.env[`WTFMEDIA_PRODUCTION_${suffix}`]) })),
};
fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
console.log("Phase 2 staging target preflight passed; remote commands remain separately owner-authorized");

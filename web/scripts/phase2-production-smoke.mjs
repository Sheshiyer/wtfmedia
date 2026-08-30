import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(webRoot, "..");
function fail(message) { console.error(message); process.exit(1); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function option(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
function required(name) { const value = process.env[name]; if (!value) fail(`Missing required production target: ${name}`); return value; }

const receipt = option("--receipt"); const allowedHost = option("--allow-production-host") ?? process.env.WTFMEDIA_PRODUCTION_HOST;
if (!receipt || !allowedHost || (process.argv.length !== 4 && process.argv.length !== 6)) fail("Usage: node web/scripts/phase2-production-smoke.mjs --allow-production-host HOST --receipt .runtime/preflight/phase2-production-smoke.json");
if (process.env.WTFMEDIA_ENVIRONMENT !== "production") fail("WTFMEDIA_ENVIRONMENT must equal production");
let base;
try { base = new URL(required("BASE_URL")); } catch { fail("BASE_URL must be an absolute HTTP(S) URL"); }
if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") fail("BASE_URL must be a credential-free production origin");
if (base.hostname.toLowerCase() !== allowedHost.toLowerCase() || base.hostname.toLowerCase() !== required("WTFMEDIA_PRODUCTION_HOST").toLowerCase()) fail("BASE_URL host must exactly match the allowlisted production host");

const approvalPath = path.resolve(webRoot, "tests/visual/phase2-approval.json");
let approval;
try { approval = JSON.parse(fs.readFileSync(approvalPath, "utf8")); } catch { fail("Missing required owner approval"); }
for (const field of ["candidate_sha256", "evidence_sha256", "commit", "policy_sha256", "approved_at"]) if (typeof approval[field] !== "string" || !approval[field]) fail(`Invalid owner approval: ${field}`);
if (approval.status !== "approved" || !Number.isFinite(Date.parse(approval.approved_at))) fail("Owner approval is not active");

const destination = path.resolve(root, receipt); const receiptRoot = path.join(root, ".runtime", "preflight") + path.sep;
if (!destination.startsWith(receiptRoot) || path.extname(destination) !== ".json") fail("Receipt path must be an ignored .runtime/preflight JSON file");
fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
if (fs.lstatSync(path.dirname(destination)).isSymbolicLink()) fail("Receipt directory must not be symlinked");
if (fs.existsSync(destination)) fs.unlinkSync(destination);

async function get(pathname) {
  const response = await fetch(new URL(pathname, base), { method: "GET", redirect: "manual", headers: { accept: "text/html,application/json" } });
  const location = response.headers.get("location");
  if (location && new URL(location, base).hostname.toLowerCase() !== base.hostname.toLowerCase()) fail("Production smoke refused cross-host redirect");
  return response;
}
const publicResponse = await get("/");
if (publicResponse.status < 200 || publicResponse.status >= 400) fail("Public continuity check did not return a successful status");
const protectedResponse = await get("/ops");
const isDenied = [401, 403, 404, 302, 303, 307, 308].includes(protectedResponse.status) || (protectedResponse.status === 200 && protectedResponse.headers.get("x-matched-path") === "/ops/recover");
if (!isDenied) fail("Anonymous protected request was not denied");
if (protectedResponse.headers.get("cache-control")?.toLowerCase().includes("no-store") !== true) fail("Protected response must be no-store");
const evidence = { schema_version: 1, status: "passed", environment: "production", created_at: new Date().toISOString(), base_url_sha256: sha256(base.origin), approval_sha256: sha256(JSON.stringify(approval)), public_status: publicResponse.status, protected_status: protectedResponse.status, protected_no_store: true };
fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log("Phase 2 production smoke passed with read-only exact-host requests");

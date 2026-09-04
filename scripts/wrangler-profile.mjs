import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [profile, ...args] = process.argv.slice(2);
if (!profile || args.length === 0 || !/^[A-Za-z0-9_-]+$/.test(profile)) {
  console.error("usage: node scripts/wrangler-profile.mjs <profile> <wrangler arguments...>");
  process.exit(2);
}

const configured = process.env.WTFMEDIA_WRANGLER_BIN;
const candidates = [configured, "/opt/homebrew/bin/wrangler", "/usr/local/bin/wrangler"]
  .filter((value) => typeof value === "string" && value.length > 0);
const binary = candidates.find((candidate) => existsSync(candidate));
if (!binary) {
  console.error("A host Wrangler build with named-profile support is required. Set WTFMEDIA_WRANGLER_BIN.");
  process.exit(2);
}

const env = { ...process.env };
for (const key of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) {
  delete env[key];
}

const result = spawnSync(binary, [`--profile=${profile}`, ...args], {
  env,
  stdio: "inherit",
});
process.exit(result.status ?? 1);

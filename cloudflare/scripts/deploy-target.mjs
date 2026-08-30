import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cloudflareRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = join(cloudflareRoot, "..");
const webRoot = join(repositoryRoot, "web");
const targetConfig = join(cloudflareRoot, "wrangler.target.generated.jsonc");
const webConfig = join(webRoot, "wrangler.jsonc");

for (const required of [targetConfig, webConfig, join(webRoot, ".open-next", "worker.js")]) {
  if (!existsSync(required)) throw new Error("target_deploy_prerequisite_missing");
}

const configured = process.env.WTFMEDIA_WRANGLER_BIN;
const binary = [configured, "/opt/homebrew/bin/wrangler", "/usr/local/bin/wrangler"]
  .filter((value) => typeof value === "string" && value.length > 0)
  .find((candidate) => existsSync(candidate));
if (!binary) throw new Error("host_wrangler_with_profile_support_required");

const cleanEnv = { ...process.env };
for (const key of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) {
  delete cleanEnv[key];
}

function deploy(cwd, args) {
  const result = spawnSync(binary, ["--profile", "wtfmedia", "deploy", ...args], {
    cwd,
    env: cleanEnv,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error("target_worker_deploy_failed");
}

const secretDirectory = mkdtempSync(join(tmpdir(), "wtfmedia-target-secrets-"));
const edgeSecrets = join(secretDirectory, "edge.json");
const webSecrets = join(secretDirectory, "web.json");
const sharedSecret = randomBytes(48).toString("base64url");
const ingestToken = randomBytes(48).toString("base64url");

try {
  writeFileSync(edgeSecrets, JSON.stringify({ EDGE_SHARED_SECRET: sharedSecret, INGEST_TOKEN: ingestToken }), { mode: 0o600 });
  writeFileSync(webSecrets, JSON.stringify({ CLOUDFLARE_EDGE_SHARED_SECRET: sharedSecret }), { mode: 0o600 });
  deploy(cloudflareRoot, ["--config", targetConfig, "--secrets-file", edgeSecrets, "--message", "WTF OS target edge and calendar release"]);
  deploy(webRoot, ["--config", webConfig, "--secrets-file", webSecrets, "--message", "WTF OS target web release"]);
  console.log("TARGET_DEPLOY_COMPLETE profile=wtfmedia workers=wtfmedia-edge,wtfmedia-web secrets=fresh");
} finally {
  for (const file of [edgeSecrets, webSecrets]) {
    if (existsSync(file)) {
      writeFileSync(file, "", { mode: 0o600 });
      unlinkSync(file);
    }
  }
  rmdirSync(secretDirectory);
}

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cloudflareRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const configured = process.env.WTFMEDIA_WRANGLER_BIN;
const binary = [configured, "/opt/homebrew/bin/wrangler", "/usr/local/bin/wrangler"]
  .filter((value) => typeof value === "string" && value.length > 0)
  .find((candidate) => existsSync(candidate));
if (!binary) throw new Error("host_wrangler_with_profile_support_required");

const cleanEnv = { ...process.env, NO_COLOR: "1" };
for (const key of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) {
  delete cleanEnv[key];
}

function wranglerJson(args) {
  const result = spawnSync(binary, ["--profile", "wtfmedia", ...args], {
    cwd: cloudflareRoot,
    env: cleanEnv,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`target_inventory_failed:${args.slice(0, 2).join(":")}`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`target_inventory_invalid_json:${args.slice(0, 2).join(":")}`);
  }
}

const namespaces = wranglerJson(["kv", "namespace", "list"]);
const databases = wranglerJson(["d1", "list", "--json"]);
const namespace = namespaces.filter((item) => item.title === "WTFMEDIA_STATE");
const database = databases.filter((item) => item.name === "wtfmedia-ops");
if (namespace.length !== 1 || database.length !== 1) throw new Error("target_binding_ambiguity");

const targetConfig = {
  $schema: "node_modules/wrangler/config-schema.json",
  name: "wtfmedia-edge",
  main: "src/index.ts",
  compatibility_date: "2026-08-11",
  workers_dev: true,
  preview_urls: false,
  observability: { enabled: true },
  vars: {
    ALLOWED_ORIGIN: "https://wtfmedia-web.connect2nikhai.workers.dev,https://wtfhq.in",
    RATE_LIMIT_PER_MINUTE: "20",
    CALENDAR_READ_RATE_LIMIT_PER_MINUTE: "60",
    CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE: "12",
  },
  ai: { binding: "AI" },
  vectorize: [{ binding: "VECTORIZE", index_name: "wtfmedia-catalogue-v1" }],
  kv_namespaces: [{ binding: "WTFMEDIA_STATE", id: namespace[0].id }],
  r2_buckets: [{ binding: "CATALOGUE", bucket_name: "wtfmedia-catalogue" }],
  queues: {
    producers: [{ binding: "INGEST_QUEUE", queue: "wtfmedia-ingest" }],
    consumers: [{
      queue: "wtfmedia-ingest",
      max_batch_size: 1,
      max_concurrency: 1,
      max_batch_timeout: 30,
      max_retries: 5,
      retry_delay: 0,
      dead_letter_queue: "wtfmedia-ingest-dlq",
    }],
  },
  d1_databases: [{
    binding: "DB",
    database_name: "wtfmedia-ops",
    database_id: database[0].uuid,
    migrations_dir: "migrations",
  }],
};

const output = join(cloudflareRoot, "wrangler.target.generated.jsonc");
writeFileSync(output, `${JSON.stringify(targetConfig, null, 2)}\n`, { mode: 0o600 });
chmodSync(output, 0o600);
console.log("TARGET_CONFIG_READY profile=wtfmedia bindings=R2,KV,Vectorize,Queues,D1,AI");

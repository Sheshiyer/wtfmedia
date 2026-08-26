import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const selectors = process.argv.slice(2).filter((value) => !value.startsWith("--") && value !== "audit" && value !== "super_admin");
const tests = readdirSync(join(root, "tests"))
  .filter((file) => file.endsWith(".test.mjs"))
  .filter((file) => selectors.length === 0 || selectors.some((selector) => file.includes(selector)))
  .map((file) => join(root, "tests", file));

if (tests.length === 0) {
  console.error("No selected Cloudflare tests");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
process.exit(result.status ?? 1);

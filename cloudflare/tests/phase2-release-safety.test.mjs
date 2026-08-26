import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));

function run(relativeScript, args = [], environment = {}) {
  return spawnSync(process.execPath, [fileURLToPath(new URL(relativeScript, import.meta.url)), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

test("staging preflight refuses an incomplete target manifest before it can write a receipt", () => {
  const result = run("../scripts/phase2-preflight.mjs", ["--receipt", ".runtime/preflight/phase2-preflight-test.json"], { WTFMEDIA_ENVIRONMENT: "staging" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required staging target: BASE_URL/);
});

test("production smoke refuses an unallowlisted host before issuing a request", () => {
  const result = run("../../web/scripts/phase2-production-smoke.mjs", ["--allow-production-host", "production.example.test", "--receipt", ".runtime/preflight/phase2-smoke-test.json"], { WTFMEDIA_ENVIRONMENT: "production" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required production target: BASE_URL/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../wrangler.jsonc", import.meta.url);

test("Beta staging has only D1 state plus the read-only Alpha web binding", async () => {
  const config = await readFile(configUrl, "utf8");
  const staging = config.slice(config.indexOf('"staging": {'));
  assert.match(staging, /"binding": "WTFMEDIA_ALPHA_WEB"/);
  assert.match(staging, /"service": "wtfmedia-web"/);
  assert.match(staging, /"database_name": "wtfmedia-ops-staging"/);
  for (const forbidden of [
    "wtfmedia-catalogue-staging-v1",
    "wtfmedia-catalogue-staging",
    "wtfmedia-ingest-staging",
    '"VECTORIZE"',
    '"CATALOGUE"',
    '"WTFMEDIA_STATE"',
    '"INGEST_QUEUE"',
    '"ai":',
  ]) assert.equal(staging.includes(forbidden), false, forbidden);
  // Production's established Alpha data plane remains independently declared.
  assert.match(config.slice(0, config.indexOf('"env": {')), /"index_name": "wtfmedia-catalogue-v1"/);
});

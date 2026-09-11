import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

test("health reports declared environment resources instead of production labels", async () => {
  const response = await worker.fetch(new Request("https://edge.example/v1/health"), {
    ALLOWED_ORIGIN: "https://beta-staging.wtfhq.in",
    DEPLOYMENT_ENVIRONMENT: "staging",
    SERVICE_NAME: "wtfmedia-edge-staging",
    CATALOGUE_INDEX_NAME: "wtfmedia-catalogue-staging-v1",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    environment: "staging",
    service: "wtfmedia-edge-staging",
    index: "wtfmedia-catalogue-staging-v1",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

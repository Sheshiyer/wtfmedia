import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

test("health reports declared environment resources instead of production labels", async () => {
  const response = await worker.fetch(new Request("https://edge.example/v1/health"), {
    ALLOWED_ORIGIN: "https://beta-staging.wtfhq.in",
    DEPLOYMENT_ENVIRONMENT: "staging",
    SERVICE_NAME: "wtfmedia-edge-staging",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    environment: "staging",
    service: "wtfmedia-edge-staging",
    localGeneration: { provider: "anthropic", model: "claude-sonnet-5-5", configured: false },
    inferenceService: "wtfmedia-web",
    corpusAuthority: "alpha_public_api",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("staging disables public RAG and ingest entrypoints", async () => {
  const env = {
    ALLOWED_ORIGIN: "https://beta-staging.wtfhq.in",
    DEPLOYMENT_ENVIRONMENT: "staging",
    SERVICE_NAME: "wtfmedia-edge-staging",
  };
  for (const path of ["/v1/chat", "/v1/admin/enqueue"]) {
    const response = await worker.fetch(new Request(`https://edge.example${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }), env);
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: "not_found" });
  }
});

test('generation readiness describes this worker without claiming the Alpha bridge is migrated', async () => {
  for (const configured of [false, true]) {
    const response = await worker.fetch(new Request('https://edge.example/v1/health'), {
      ALLOWED_ORIGIN: 'https://beta-staging.wtfhq.in', DEPLOYMENT_ENVIRONMENT: 'staging',
      ...(configured ? { ANTHROPIC_API_KEY: 'test-only-key' } : {}),
    });
    const body = await response.json();
    assert.deepEqual(body.localGeneration, { provider: 'anthropic', model: 'claude-sonnet-5-5', configured });
    assert.equal(body.inferenceService, 'wtfmedia-web');
    assert.doesNotMatch(JSON.stringify(body), /test-only-key/);
  }
});

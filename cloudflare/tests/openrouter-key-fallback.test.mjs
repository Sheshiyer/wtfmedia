import assert from "node:assert/strict";
import { test } from "node:test";

import { answerWithOpenRouter } from "../src/index.ts";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const okPayload = {
  choices: [{ message: { content: "Grounded answer [1]." } }],
};

function stubFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    const key = String(init?.headers?.Authorization ?? "");
    calls.push(key);
    return handler(key);
  });
  return {
    calls,
    restore() { globalThis.fetch = original; },
  };
}

test("openrouter uses the primary key when it succeeds", async () => {
  const stub = stubFetch(() => jsonResponse(okPayload));
  try {
    const env = { OPENROUTER_API_KEY: "primary-key", OPENROUTER_API_KEY_2: "backup-key" };
    const result = await answerWithOpenRouter(env, [{ role: "user", content: "q" }]);
    assert.equal(result.answer, "Grounded answer [1].");
    assert.deepEqual(stub.calls, ["Bearer primary-key"]);
  } finally {
    stub.restore();
  }
});

test("openrouter falls back to the backup key on auth failure", async () => {
  const statuses = [401, 402, 403];
  for (const status of statuses) {
    const stub = stubFetch((key) =>
      key === "Bearer primary-key"
        ? new Response(`{"error":"key rejected"}`, { status })
        : jsonResponse(okPayload));
    try {
      const env = { OPENROUTER_API_KEY: "primary-key", OPENROUTER_API_KEY_2: "backup-key" };
      const result = await answerWithOpenRouter(env, [{ role: "user", content: "q" }]);
      assert.equal(result.answer, "Grounded answer [1].");
      assert.deepEqual(stub.calls, ["Bearer primary-key", "Bearer backup-key"]);
    } finally {
      stub.restore();
    }
  }
});

test("openrouter does not burn the backup key on transient upstream errors", async () => {
  const stub = stubFetch(() => new Response("upstream broke", { status: 500 }));
  try {
    const env = { OPENROUTER_API_KEY: "primary-key", OPENROUTER_API_KEY_2: "backup-key" };
    await assert.rejects(
      answerWithOpenRouter(env, [{ role: "user", content: "q" }]),
      /openrouter 500/,
    );
    assert.deepEqual(stub.calls, ["Bearer primary-key"]);
  } finally {
    stub.restore();
  }
});

test("openrouter fails when both keys are rejected", async () => {
  const stub = stubFetch(() => new Response("nope", { status: 401 }));
  try {
    const env = { OPENROUTER_API_KEY: "primary-key", OPENROUTER_API_KEY_2: "backup-key" };
    await assert.rejects(
      answerWithOpenRouter(env, [{ role: "user", content: "q" }]),
      /openrouter 401/,
    );
    assert.deepEqual(stub.calls, ["Bearer primary-key", "Bearer backup-key"]);
  } finally {
    stub.restore();
  }
});

test("openrouter reports missing configuration when no keys are set", async () => {
  await assert.rejects(
    answerWithOpenRouter({}, [{ role: "user", content: "q" }]),
    /openrouter api key not configured/,
  );
});

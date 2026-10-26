import assert from "node:assert/strict";
import { test } from "node:test";
import { mutationRequestAllowed } from "../src/ops-router.ts";
import { handleMemberRequest } from "../src/member-router.ts";

const env = {
  OPS_HOSTNAME: "ops.staging.test",
  OPS_ENVIRONMENT: "staging",
  CHAT_HISTORY_ENABLED: "stable",
  CLERK_ISSUER: "https://clerk.example.test",
  CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json",
  CLERK_AUTHORIZED_PARTIES: "https://ops.staging.test",
};

function db() {
  return {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; },
        async all() { return { results: [] }; },
      };
    },
  };
}

test("reads are always allowed", () => {
  const url = new URL("https://ops.staging.test/beta/api/chat");
  assert.equal(mutationRequestAllowed(new Request(url, { method: "GET" }), url), true);
  assert.equal(mutationRequestAllowed(new Request(url, { method: "HEAD" }), url), true);
});

test("mutations with a matching Origin pass", () => {
  const url = new URL("https://ops.staging.test/beta/api/chat/mcnv_abcdefgh/archive");
  const request = new Request(url, { method: "POST", headers: { Origin: "https://ops.staging.test" } });
  assert.equal(mutationRequestAllowed(request, url), true);
});

test("cross-origin and same-site-subdomain mutations are rejected", () => {
  const url = new URL("https://ops.staging.test/beta/api/chat/mcnv_abcdefgh/archive");
  for (const origin of ["https://evil.example.test", "https://other.staging.test", "null", "not-a-url"]) {
    const request = new Request(url, { method: "POST", headers: { Origin: origin } });
    assert.equal(mutationRequestAllowed(request, url), false, origin);
  }
});

test("Origin-less mutations must speak JSON; the ticketed upload stream is exempt", () => {
  const archive = new URL("https://ops.staging.test/ops/api/chat/conversations/cnv_abcdefgh/archive");
  assert.equal(mutationRequestAllowed(new Request(archive, { method: "POST" }), archive), false);
  assert.equal(
    mutationRequestAllowed(new Request(archive, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }), archive),
    true,
  );
  assert.equal(
    mutationRequestAllowed(new Request(archive, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }), archive),
    false,
  );
  const stream = new URL("https://ops.staging.test/ops/api/assets/upload-stream");
  const upload = new Request(stream, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: "bytes" });
  assert.equal(mutationRequestAllowed(upload, stream), true);
});

test("a cross-origin mutation is denied before Clerk verification", async () => {
  let verified = false;
  const request = new Request("https://ops.staging.test/beta/api/chat/mcnv_abcdefgh/archive", {
    method: "POST",
    headers: { authorization: "Bearer verified", Origin: "https://evil.example.test" },
  });
  const response = await handleMemberRequest(request, { ...env, DB: db() }, { verifyClerk: async () => { verified = true; return { ok: false }; } });
  assert.equal(response.status, 404);
  assert.equal(verified, false);
});

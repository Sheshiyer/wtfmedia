import assert from "node:assert/strict";
import { test } from "node:test";
import { createClerkInvitationClient } from "../src/clerk/invitations.ts";

test("Clerk invitation client sends only the documented server-side payload", async () => {
  const requests = [];
  const client = createClerkInvitationClient("sk_test_worker_only", async (request) => {
    requests.push(request);
    return Response.json({ id: "invitation_12345678", status: "pending" }, { status: 201 });
  });

  const invitation = await client.create({
    email: "pilot@example.test",
    redirectUrl: "https://staging.example.test/beta",
    publicMetadata: { workspace: "wtfmedia", pilot_cohort: "bangalore" },
  });

  assert.deepEqual(invitation, { id: "invitation_12345678", status: "pending" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.clerk.com/v1/invitations");
  assert.equal(requests[0].headers.get("authorization"), "Bearer sk_test_worker_only");
  assert.deepEqual(await requests[0].json(), {
    email_address: "pilot@example.test",
    redirect_url: "https://staging.example.test/beta",
    public_metadata: { workspace: "wtfmedia", pilot_cohort: "bangalore" },
  });
});

test("Clerk invitation client exposes no provider body when invitation delivery fails", async () => {
  const client = createClerkInvitationClient("sk_test_worker_only", async () => new Response("rate limited", {
    status: 429,
    headers: { "retry-after": "60" },
  }));

  const invitation = await client.create({
    email: "pilot@example.test",
    redirectUrl: "https://staging.example.test/beta",
    publicMetadata: { workspace: "wtfmedia", pilot_cohort: "bangalore" },
  });

  assert.deepEqual(invitation, { error: "rate_limited", retryAfterSeconds: 60 });
});

test("Clerk invitation revocation uses the narrow documented backend endpoint", async () => {
  let request;
  const client = createClerkInvitationClient("sk_test_123456", async (value) => {
    request = value;
    return Response.json({ id: "invitation_12345678", status: "revoked" });
  });
  assert.deepEqual(await client.revoke("invitation_12345678"), { id: "invitation_12345678", status: "revoked" });
  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://api.clerk.com/v1/invitations/invitation_12345678/revoke");
});

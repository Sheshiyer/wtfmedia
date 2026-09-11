import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMemberChatAdapter,
  createOperatorChatAdapter,
  type BetaChatFetch,
} from "@/components/domain/beta/BetaChatAdapter";

const memberHistory = {
  conversations: [{
    id: "mcnv_abcdefgh",
    title: "Saved question",
    source_mode: "published",
    lifecycle_state: "active",
  }],
  nextCursor: null,
};

const memberConversation = {
  conversation: memberHistory.conversations[0],
  messages: [],
};

const operatorHistory = {
  conversations: [{
    id: "cnv_abcdefgh",
    title: "Operator question",
    source_mode: "both",
    lifecycle_state: "active",
    message_count: 1,
  }],
  nextCursor: null,
  policy: { archive: true, export: false },
};

const operatorConversation = {
  conversation: operatorHistory.conversations[0],
  messages: [],
  policy: { archive: true, export: false },
};

type FetchResult = Response | Error;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function statusResponse(status: number): Response {
  return new Response(null, { status });
}

function sequenceFetcher(results: FetchResult[]): { fetcher: BetaChatFetch; inputs: string[]; init: RequestInit[] } {
  let index = 0;
  const inputs: string[] = [];
  const init: RequestInit[] = [];
  const fetcher: BetaChatFetch = async (input, requestInit) => {
    inputs.push(String(input));
    init.push(requestInit ?? {});
    const result = results[index++];
    if (!result) throw new Error("unexpected_fetch");
    if (result instanceof Error) throw result;
    return result;
  };
  return { fetcher, inputs, init };
}

describe("BetaChatAdapter read paths", () => {
  it("keeps active-only history default and composes cursor with includeArchived", async () => {
    const calls = sequenceFetcher([jsonResponse(memberHistory), jsonResponse(memberHistory)]);
    const adapter = createMemberChatAdapter(calls.fetcher);

    expect(await adapter.list("opaque.cursor:1", { includeArchived: true })).toMatchObject({
      conversations: [{ id: "mcnv_abcdefgh" }],
    });
    expect(await adapter.list()).toMatchObject({ conversations: [{ id: "mcnv_abcdefgh" }] });
    expect(calls.inputs).toEqual([
      "/beta/api/chat?cursor=opaque.cursor%3A1&includeArchived=1",
      "/beta/api/chat",
    ]);
  });

  it.each([401, 502, 503, 504])("retries member history once after transient %s", async (status) => {
    const calls = sequenceFetcher([statusResponse(status), jsonResponse(memberHistory)]);
    const adapter = createMemberChatAdapter(calls.fetcher);

    expect(await adapter.list()).not.toBeNull();
    expect(calls.inputs).toHaveLength(2);
    expect(adapter.readFailure?.()).toBeNull();
  });

  it("retries a network failure for member conversation reads and preserves before", async () => {
    const calls = sequenceFetcher([new Error("staging network reset"), jsonResponse(memberConversation)]);
    const adapter = createMemberChatAdapter(calls.fetcher);

    expect(await adapter.get("mcnv_abcdefgh", "older_cursor")).toMatchObject({
      conversation: { id: "mcnv_abcdefgh" },
    });
    expect(calls.inputs).toEqual([
      "/beta/api/chat/mcnv_abcdefgh?before=older_cursor",
      "/beta/api/chat/mcnv_abcdefgh?before=older_cursor",
    ]);
    expect(adapter.readFailure?.()).toBeNull();
  });

  it("retries operator history reads and keeps includeArchived after the cursor", async () => {
    const calls = sequenceFetcher([statusResponse(503), jsonResponse(operatorHistory)]);
    const adapter = createOperatorChatAdapter(calls.fetcher);

    expect(await adapter.list("operator.cursor", { includeArchived: true })).toMatchObject({
      conversations: [{ id: "cnv_abcdefgh" }],
    });
    expect(calls.inputs).toEqual([
      "/ops/api/chat/conversations?cursor=operator.cursor&includeArchived=1",
      "/ops/api/chat/conversations?cursor=operator.cursor&includeArchived=1",
    ]);
    expect(calls.init[0]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
  });

  it("retries operator conversation reads after a gateway response", async () => {
    const calls = sequenceFetcher([statusResponse(502), jsonResponse(operatorConversation)]);
    const adapter = createOperatorChatAdapter(calls.fetcher);

    expect(await adapter.get("cnv_abcdefgh")).toMatchObject({
      conversation: { id: "cnv_abcdefgh" },
    });
    expect(calls.inputs).toEqual([
      "/ops/api/chat/conversations/cnv_abcdefgh",
      "/ops/api/chat/conversations/cnv_abcdefgh",
    ]);
  });

  it("reports account verification when the final read is 401 or 403", async () => {
    const unauthorized = sequenceFetcher([statusResponse(401), statusResponse(401)]);
    const unauthorizedAdapter = createMemberChatAdapter(unauthorized.fetcher);
    expect(await unauthorizedAdapter.list()).toBeNull();
    expect(unauthorized.inputs).toHaveLength(2);
    expect(unauthorizedAdapter.readFailure?.()).toEqual({ kind: "verification", status: 401 });

    const forbidden = sequenceFetcher([statusResponse(403)]);
    const forbiddenAdapter = createMemberChatAdapter(forbidden.fetcher);
    expect(await forbiddenAdapter.list()).toBeNull();
    expect(forbidden.inputs).toHaveLength(1);
    expect(forbiddenAdapter.readFailure?.()).toEqual({ kind: "verification", status: 403 });
  });

  it("reports a temporary staging failure after the single retry is exhausted", async () => {
    const calls = sequenceFetcher([statusResponse(504), statusResponse(504)]);
    const adapter = createOperatorChatAdapter(calls.fetcher);

    expect(await adapter.get("cnv_abcdefgh")).toBeNull();
    expect(adapter.readFailure?.()).toEqual({ kind: "temporary", status: 504 });
  });
});

describe("MemberSessionNavigator read error contract", () => {
  it("distinguishes verification copy from temporary staging failure", () => {
    const navigator = readFileSync(new URL("../../components/domain/member/MemberSessionNavigator.tsx", import.meta.url), "utf8");

    expect(navigator).toContain("account verification is required to load conversations");
    expect(navigator).toContain("the staging service is temporarily unavailable while loading conversations");
    expect(navigator).toContain("data-session-read-error");
    expect(navigator).toContain("readFailure");
  });
});

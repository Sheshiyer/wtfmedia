import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SocialAnswerView, SocialAnalyticsChat } from "../../components/domain/social/SocialAnalyticsChat";
import type { SocialChatAnswer, SocialScope } from "../../lib/social-analytics/contracts";
import {
  candidateQuestion, createSocialRequestGate, formatSocialValue, parseSocialAnswer,
  parseSocialMessages, readSocialAnswerResponse, safeSocialUrl, socialAnswerText, socialRequestBody,
} from "../../lib/social-analytics/chat-view";

vi.mock("../../components/domain/beta/BetaPrincipalGate", () => ({ useMemberFetch: () => fetch }));

const scope: SocialScope = { platform: "instagram", fromDate: "2026-09-01", toDate: "2026-09-30" };
const answer: SocialChatAnswer = {
  status: "partial", scope, summary: "Some metrics are unavailable.", columns: ["Current", "Previous"],
  rows: [{ label: "Views", values: [12, 0], unit: "count", difference: 12, percentChange: null },
    { label: "Engagement rate", values: [12, 10], unit: "%", difference: 2, percentChange: null },
    { label: "Clicks", values: [null, 0], unit: "count" }],
  entities: [{ kind: "post", platform: "instagram", id: "post-b", label: "Second post" }],
  evidence: [{ entity: { kind: "post", platform: "instagram", id: "post-b", label: "Second post" },
    metric: "views", value: 12, unit: "count", basis: "lifetime", fromDate: scope.fromDate,
    toDate: scope.toDate, fetchedAt: "2026-10-01T12:00:00Z", dataAsOf: null,
    sourceUrl: "https://instagram.com/p/example" }], limitations: ["Clicks unsupported"], retryable: true,
};

describe("social chat view", () => {
  it("renders untrusted labels as text, safe sources and a single-entity follow-up table", () => {
    const markup = renderToStaticMarkup(createElement(SocialAnswerView, { answer: {
      ...answer, summary: "<img src=x onerror=alert(1)>", columns: ["Second post"],
      rows: [{ label: "Clicks", values: [null], unit: "count" }],
      evidence: [{ ...answer.evidence[0], sourceUrl: "javascript:alert(1)" }],
    } }));
    expect(markup).toContain("&lt;img");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("javascript:");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Second post");
    expect(markup).not.toContain("Previous");
    expect(markup).toContain("2026-09-01");
    expect(markup).toContain("2026-10-01T12:00:00Z");
  });

  it("starts with keyboard-accessible suggestion controls and a labeled composer", () => {
    const markup = renderToStaticMarkup(createElement(SocialAnalyticsChat, { scope }));
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Hide suggestions");
    expect(markup).toContain("Ask about social analytics");
    expect(markup).toContain("New chat");
    expect(markup).toContain("Save chat");
    expect(markup).not.toContain("Which platform gained");
  });

  it("preserves zero, distinguishes missing values and labels percentage points", () => {
    expect(formatSocialValue(null, "count")).toBe("Unavailable");
    expect(formatSocialValue(0, "count")).toBe("0");
    const text = socialAnswerText(answer);
    expect(text).toContain("Views | 12 | 0 | +12 | Unavailable (zero baseline)");
    expect(text).toContain("Engagement rate | 12% | 10% | +2 percentage points | Unavailable");
    expect(text).toContain("Clicks | Unavailable | 0");
    expect(text).toContain("Second post");
    expect(text).toContain("lifetime");
    expect(text).toContain("2026-10-01T12:00:00Z");
    expect(text).toContain("Data as of: unavailable");
  });

  it("exports only the returned columns for a singular follow-up", () => {
    const text = socialAnswerText({ ...answer, columns: ["Second post"], rows: [
      { label: "Views", values: [12], unit: "count" },
    ] });
    expect(text).toContain("Metric | Second post");
    expect(text).not.toContain("Previous");
    expect(text).not.toContain("Difference");
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "//evil.example", "https://user:pass@example.com", "<b>url</b>"])("rejects unsafe source %s", (url) => {
    expect(safeSocialUrl(url)).toBeNull();
    expect(socialAnswerText({ ...answer, evidence: [{ ...answer.evidence[0], sourceUrl: url }] })).not.toContain(url);
  });

  it("accepts absolute provider links and serializes explicit post ID plus platform", () => {
    expect(safeSocialUrl("https://instagram.com/p/example")).toBe("https://instagram.com/p/example");
    expect(candidateQuestion(answer.entities[0])).toBe('Show metrics for post ID "post-b" on instagram.');
  });

  it("uses prior resolved scope/entities but resets them after a deliberate filter change", () => {
    const next: SocialScope = { ...scope, platform: "facebook" };
    const history = [{ role: "assistant" as const, content: answer.summary, answer }];
    const followup = socialRequestBody("Only its clicks", scope, history, answer);
    expect(followup.context).toEqual({ visibleScope: scope, scope, entities: answer.entities });
    expect(followup.history).toEqual([{ role: "assistant", content: answer.summary }]);
    const changed = socialRequestBody("Only its clicks", next, history, null);
    expect(changed.context).toEqual({ visibleScope: next, scope: next, entities: [] });
    expect(answer.scope.platform).toBe("instagram");
  });

  it("keeps the original dashboard scope separate from an answer's explicit date override", () => {
    const resolved = { ...scope, fromDate: "2026-08-01", toDate: "2026-08-31" };
    const request = socialRequestBody("Only clicks", scope, [], { ...answer, visibleScope: scope, scope: resolved });
    expect(request.context.visibleScope).toEqual(scope);
    expect(request.context.scope).toEqual(resolved);
  });

  it("bounds prior text without transmitting saved evidence as context", () => {
    const history = Array.from({ length: 12 }, () => ({ role: "assistant" as const, content: "a".repeat(2100), answer }));
    const request = socialRequestBody(" next ", scope, history, answer);
    expect(request.question).toBe("next");
    expect(request.history).toHaveLength(8);
    expect(request.history[0].content).toHaveLength(2000);
    expect(request.context).not.toHaveProperty("evidence");
    expect(request.history[0]).not.toHaveProperty("answer");
  });

  it("validates structured answers and rejects malformed saved snapshots", () => {
    expect(parseSocialAnswer(answer)).toEqual(answer);
    expect(() => parseSocialAnswer({ ...answer, rows: [{ label: "Views", values: [12], unit: "count" }] })).toThrow();
    expect(() => parseSocialAnswer({ ...answer, rows: [{ label: "Views", values: [NaN, 0], unit: "count" }] })).toThrow();
    expect(() => parseSocialAnswer({ ...answer, evidence: [{ ...answer.evidence[0], entity: null }] })).toThrow();
    expect(() => parseSocialAnswer("<html>not an answer</html>")).toThrow();
    expect(parseSocialMessages([{ role: "assistant", content: answer.summary, answer }])[0].answer?.evidence[0].fetchedAt).toBe("2026-10-01T12:00:00Z");
    expect(() => parseSocialMessages([{ role: "system", content: "instructions" }])).toThrow();
    expect(() => parseSocialMessages(Array.from({ length: 101 }, () => ({ role: "user", content: "q" })))).toThrow();
    expect(() => parseSocialMessages([{ role: "user", content: "q".repeat(100_001) }])).toThrow();
  });

  it("keeps a typed unavailable answer and retry guidance from HTTP 503", async () => {
    const unavailable = { ...answer, status: "unavailable", summary: "Metrics timed out.", retryable: true };
    expect(await readSocialAnswerResponse(Response.json(unavailable, { status: 503 }))).toMatchObject({
      status: "unavailable", summary: "Metrics timed out.", retryable: true,
    });
    await expect(readSocialAnswerResponse(new Response("<html>login</html>"))).rejects.toThrow();
    await expect(readSocialAnswerResponse(Response.json({ error: "denied" }, { status: 403 }))).rejects.toThrow(/access/);
  });

  it("drops unsafe URLs from parsed snapshots before rendering or re-saving", () => {
    const parsed = parseSocialAnswer({ ...answer,
      entities: [{ ...answer.entities[0], url: "javascript:alert(1)" }],
      evidence: [{ ...answer.evidence[0], sourceUrl: "data:text/html,unsafe" }],
    });
    expect(parsed.entities[0]).not.toHaveProperty("url");
    expect(parsed.evidence[0]).not.toHaveProperty("sourceUrl");
  });
});

describe("social chat request ownership", () => {
  it("blocks double-submit synchronously and releases the lock on cancellation", () => {
    const gate = createSocialRequestGate();
    const first = gate.start();
    expect(first).not.toBeNull();
    expect(gate.start()).toBeNull();
    gate.cancel();
    expect(first!.controller.signal.aborted).toBe(true);
    expect(gate.start()).not.toBeNull();
  });

  it("ignores superseded results and stale cleanup even when transport ignores abort", async () => {
    const gate = createSocialRequestGate();
    const old = gate.start()!;
    let resolve!: (value: string) => void;
    const delayed = new Promise<string>((done) => { resolve = done; });
    let displayed = "new conversation";
    const completion = delayed.then((value) => { if (gate.current(old)) displayed = value; });
    gate.cancel();
    const next = gate.start()!;
    resolve("stale result");
    await completion;
    expect(displayed).toBe("new conversation");
    gate.finish(old);
    expect(gate.current(next)).toBe(true);
    expect(gate.start()).toBeNull();
    gate.finish(next);
    expect(gate.current(next)).toBe(false);
    expect(gate.start()).not.toBeNull();
  });
});

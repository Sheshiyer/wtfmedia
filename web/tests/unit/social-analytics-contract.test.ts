import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isBetaDestinationVisible } from "../../lib/beta/navigation";
import { principalCanAccess, type PrincipalContext } from "../../lib/beta/principal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSocialPlatform,
  hostnameFromHostHeader,
  localHostnameAllowed,
  PLATFORM_DEFINITIONS,
  SOCIAL_PLATFORMS,
} from "../../lib/social-analytics/contracts";

describe("social analytics contract", () => {
  it("exposes the four approved launch platforms", () => {
    expect(SOCIAL_PLATFORMS).toEqual(["linkedin", "instagram", "facebook", "twitter"]);
    expect(PLATFORM_DEFINITIONS.map((item) => item.label)).toEqual(["LinkedIn", "Instagram", "Facebook", "X (Twitter)"]);
    expect(isSocialPlatform("linkedin")).toBe(true);
    expect(isSocialPlatform("youtube")).toBe(false);
  });

  it("keeps the public lab hostname guard local-only", () => {
    expect(localHostnameAllowed("localhost")).toBe(true);
    expect(localHostnameAllowed("127.0.0.1")).toBe(true);
    expect(localHostnameAllowed("[::1]")).toBe(true);
    expect(localHostnameAllowed("beta-staging.wtfhq.in")).toBe(false);
    expect(localHostnameAllowed("localhost.evil.example")).toBe(false);
    expect(hostnameFromHostHeader("localhost:4322")).toBe("localhost");
    expect(hostnameFromHostHeader("[::1]:4322")).toBe("::1");
    expect(hostnameFromHostHeader("beta-staging.wtfhq.in")).toBe("beta-staging.wtfhq.in");
  });
});

// Exercise the workspace's requests and controls without a live Clerk session.

const harness = vi.hoisted(() => ({
  state: [] as unknown[], cursor: 0, refs: [] as { current: unknown }[], refCursor: 0,
  effects: [] as Array<() => void | (() => void)>,
  buttons: [] as Array<{ children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }>,
  request: vi.fn(), memberHook: vi.fn(), host: "localhost:3000",
}));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.state)) harness.state[index] = initial;
    return [harness.state[index], (value: unknown) => { harness.state[index] = value; }];
  },
  useRef: (initial: unknown) => {
    const index = harness.refCursor++;
    return harness.refs[index] ??= { current: initial };
  },
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); },
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), notFound: () => { throw new Error("not_found"); } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: harness.host }) }));
vi.mock("@/components/domain/beta/BetaPrincipalGate", () => ({
  useMemberFetch: () => { harness.memberHook(); return harness.request; },
  useBetaPrincipal: () => ({ environment: "staging" }),
}));
vi.mock("@/components/domain/social/SocialAnalyticsChat", () => ({
  SocialAnalyticsChat: ({ scope }: { scope: unknown }) => createElement("div", { "data-chat-scope": JSON.stringify(scope) }, "Social chat"),
}));
vi.mock("@/components/ui/Button", () => ({
  Button: (props: typeof harness.buttons[number]) => {
    harness.buttons.push(props);
    return createElement("button", { disabled: props.disabled || props.loading }, props.children);
  },
}));
import { BetaSocialAnalyticsWorkspace, SocialAnalyticsWorkspace } from "../../components/domain/social/SocialAnalyticsWorkspace";
import BetaSocialAnalyticsPage from "../../app/beta/social-analytics/page";

const adminStatus = {
  configured: false, profileId: null, accounts: [], checkedAt: "2026-10-18T12:00:00Z",
  canManage: true, selectionRequired: true, profiles: [{ id: "profile-a", name: "Workspace A" }],
};
const activeAccount = { id: "account-a", platform: "instagram", isActive: true, health: "connected" };
function renderWorkspace(beta = true) {
  harness.cursor = 0;
  harness.refCursor = 0;
  harness.buttons = [];
  harness.effects = [];
  return renderToStaticMarkup(createElement(beta ? BetaSocialAnalyticsWorkspace : SocialAnalyticsWorkspace));
}
function button(label: string) {
  return harness.buttons.find(item => item.children === label)!;
}
beforeEach(() => {
  harness.state = [];
  harness.refs = [];
  harness.request.mockReset();
  harness.memberHook.mockClear();
  harness.host = "localhost:3000";
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("authenticated social workspace", () => {
  it("keeps the public lab on plain fetch with no chat or principal hook", async () => {
    const plainFetch = vi.fn().mockResolvedValue(Response.json(adminStatus));
    vi.stubGlobal("fetch", plainFetch);
    const html = renderWorkspace(false);
    expect(html).not.toContain("Social chat");
    expect(harness.memberHook).not.toHaveBeenCalled();
    harness.effects[0]();
    await vi.waitFor(() => expect(plainFetch).toHaveBeenCalledWith("/api/social-analytics/status", expect.any(Object)));
    expect(harness.request).not.toHaveBeenCalled();
  });

  it("reads Beta status through session fetch and adds scoped chat", async () => {
    harness.request.mockResolvedValue(Response.json(adminStatus));
    expect(renderWorkspace()).toContain("data-chat-scope");
    harness.effects[0]();
    await vi.waitFor(() => expect(harness.state[0]).toEqual(adminStatus));
    expect(harness.request).toHaveBeenCalledWith("/beta/api/social-analytics/status", expect.any(Object));
  });

  it("displays the sole option without silently saving and requires confirmation", async () => {
    harness.state[0] = adminStatus;
    harness.state[4] = false;
    let finish!: (response: Response) => void;
    harness.request.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(Response.json({ ...adminStatus, configured: true, selectionRequired: false }));
    const html = renderWorkspace();
    expect(html).toContain('value="profile-a" selected=""');
    expect(harness.request).not.toHaveBeenCalled();
    button("confirm workspace profile").onClick!();
    button("confirm workspace profile").onClick!();
    expect(harness.request).toHaveBeenCalledTimes(1);
    expect(harness.request).toHaveBeenCalledWith("/beta/api/social-analytics/selection", expect.objectContaining({ method: "POST", body: JSON.stringify({ profileId: "profile-a" }) }));
    expect(renderWorkspace()).toContain("Confirming workspace profile…");
    expect(button("confirm workspace profile").loading).toBe(true);
    finish(Response.json({ ok: true }));
    await vi.waitFor(() => expect(harness.state[9]).toBe(false));
    expect(renderWorkspace()).toContain("Workspace profile confirmed.");
  });

  it("requires a choice for multiple profiles and disables configured overrides", () => {
    harness.state[0] = { ...adminStatus, profiles: [...adminStatus.profiles, { id: "profile-b", name: "Workspace B" }] };
    renderWorkspace();
    expect(button("confirm workspace profile").disabled).toBe(true);
    harness.state[0] = { ...adminStatus, configured: true, profileId: "profile-b", configuredOverride: true, profiles: [...adminStatus.profiles, { id: "profile-b", name: "Workspace B" }] };
    const html = renderWorkspace();
    expect(html).toMatch(/<select[^>]*disabled/);
    expect(html).toContain('value="profile-b" selected=""');
    button("confirm workspace profile").onClick!();
    expect(harness.request).not.toHaveBeenCalled();
  });

  it("shows setup for no profiles and hides management/profile lists from readers", () => {
    harness.state[0] = { ...adminStatus, profiles: [] };
    expect(renderWorkspace()).toContain('href="https://zernio.com"');
    harness.state[0] = { ...adminStatus, canManage: false };
    const html = renderWorkspace();
    expect(html).not.toContain("Workspace A");
    expect(html).not.toContain("confirm workspace profile");
    expect(html).not.toContain("connect LinkedIn");
    expect(html).toContain("Social chat");
  });

  it("posts connections without profile IDs and shows immediate progress", async () => {
    harness.state[0] = { ...adminStatus, configured: true, selectionRequired: false };
    harness.state[4] = false;
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    harness.request.mockResolvedValue(Response.json({ authUrl: "https://zernio.com/connect" }));
    renderWorkspace();
    button("connect LinkedIn").onClick!();
    expect(renderWorkspace()).toContain("Opening secure platform connection…");
    expect(harness.request).toHaveBeenCalledWith("/beta/api/social-analytics/connect", expect.objectContaining({ method: "POST", body: '{"platform":"linkedin"}' }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://zernio.com/connect"));
  });

  it("distinguishes unavailable metrics, pending sync and reported zero activity", () => {
    harness.state[0] = { ...adminStatus, configured: true, selectionRequired: false, accounts: [activeAccount] };
    harness.state[2] = "instagram";
    harness.state[4] = false;
    harness.state[5] = false;
    const totals = { impressions: null, reach: null, likes: null, comments: null, shares: null, saves: null, clicks: null, views: null, engagementRate: null };
    const dashboard = { totals, followers: { current: null, gained: null }, daily: [], topPosts: [], dateRange: { fromDate: "2026-10-01", toDate: "2026-10-02" }, dataAsOf: null };
    harness.state[1] = dashboard;
    expect(renderWorkspace()).not.toContain("No activity in this range.");
    expect(renderWorkspace()).toContain("Performance data is unavailable");
    harness.state[1] = { ...dashboard, totals: { ...totals, views: 0 } };
    expect(renderWorkspace()).toContain("No activity reported in this range.");
    harness.state[0] = { ...adminStatus, configured: true, accounts: [{ ...activeAccount, analyticsSyncStatus: "never_synced" }] };
    expect(renderWorkspace()).toContain("Analytics sync is pending.");
    expect(renderWorkspace()).not.toContain("No activity reported");
    harness.state[1] = { ...dashboard, totals: { ...totals, views: 42 } };
    expect(renderWorkspace()).not.toContain("No activity reported");
    harness.state[1] = { ...dashboard, topPosts: [{ postId: "opaque-id", platform: "instagram", publishedAt: "invalid", text: null, metrics: totals }] };
    expect(renderWorkspace()).toContain("Instagram post");
    expect(renderWorkspace()).not.toContain("opaque-id");
  });

  it("clears old dashboard data on a failed request and ignores a late aborted result", async () => {
    harness.state[0] = { ...adminStatus, configured: true, selectionRequired: false, accounts: [activeAccount] };
    harness.state[2] = "instagram";
    harness.request.mockResolvedValueOnce(Response.json({ message: "Unavailable" }, { status: 503 }));
    const html = renderWorkspace();
    const chatScope = JSON.parse(html.match(/data-chat-scope="([^"]+)"/)![1].replaceAll("&quot;", '"'));
    harness.state[1] = { old: "report" };
    harness.effects[1]();
    expect(harness.state[1]).toBeNull();
    expect(harness.state[5]).toBe(true);
    await vi.waitFor(() => expect(harness.state[7]).toBe("Unavailable"));
    const url = new URL(harness.request.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/beta/api/social-analytics/dashboard");
    expect(Object.fromEntries(url.searchParams)).toEqual(chatScope);
    expect(url.searchParams.get("platform")).toBe("instagram");
    expect(url.searchParams.get("fromDate")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    let finish!: (response: Response) => void;
    harness.request.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    renderWorkspace();
    const cleanup = harness.effects[1]();
    if (cleanup) cleanup();
    finish(Response.json({ dashboard: { stale: true } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(harness.state[1]).toBeNull();
  });

  it("clears stale account/report data when refreshing status fails", async () => {
    harness.state[0] = { ...adminStatus, configured: true, selectionRequired: false, accounts: [activeAccount] };
    harness.state[4] = false;
    harness.request.mockResolvedValueOnce(Response.json({ message: "No access" }, { status: 403 }));
    renderWorkspace();
    harness.state[1] = { old: "report" };
    button("refresh connections").onClick!();
    expect(harness.state[0]).toBeNull();
    expect(harness.state[1]).toBeNull();
    await vi.waitFor(() => expect(harness.state[7]).toBe("No access"));
  });
});

describe("social feature gates", () => {
  it("keeps hosted navigation hidden by default and preserves production YouTube hiding", () => {
    vi.stubEnv("NEXT_PUBLIC_SOCIAL_ANALYTICS_ENABLED", "");
    expect(isBetaDestinationVisible("/beta/social-analytics", "local")).toBe(true);
    for (const environment of ["staging", "production"]) expect(isBetaDestinationVisible("/beta/social-analytics", environment)).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SOCIAL_ANALYTICS_ENABLED", "1");
    expect(isBetaDestinationVisible("/beta/social-analytics/", "production")).toBe(true);
    expect(isBetaDestinationVisible("/beta/analytics", "production")).toBe(false);
    expect(isBetaDestinationVisible("/beta/settings/workspace/analytics", "production")).toBe(false);
  });

  it.each([
    ["production", "beta.wtfhq.in", "", "1", false],
    ["production", "localhost", "", "1", false],
    ["development", "localhost", "", "1", true],
    ["development", "localhost", "", "", false],
    ["development", "localhost.evil.example", "", "1", false],
    ["production", "beta.wtfhq.in", "1", "", true],
  ])("gates the server page for %s / %s / hosted=%s / local=%s", async (node, host, enabled, local, allowed) => {
    vi.stubEnv("NODE_ENV", node);
    vi.stubEnv("SOCIAL_ANALYTICS_ENABLED", enabled);
    vi.stubEnv("SOCIAL_ANALYTICS_LOCAL_ENABLED", local);
    harness.host = host;
    if (allowed) await expect(BetaSocialAnalyticsPage()).resolves.toBeTruthy();
    else await expect(BetaSocialAnalyticsPage()).rejects.toThrow("not_found");
  });

  it.each(["member", "editor", "admin", "super_admin"] as const)("requires the projected read capability for %s", role => {
    const context: PrincipalContext = { role, kind: role === "member" ? "member" : "operator", email: "test@example.com", environment: "local", canonicalLanding: "/beta/chat", capabilities: [] };
    expect(principalCanAccess(context, "/beta/social-analytics")).toBe(false);
    expect(principalCanAccess({ ...context, capabilities: ["analytics:read"] }, "/beta/social-analytics")).toBe(true);
  });
});

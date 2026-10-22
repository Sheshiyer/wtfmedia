import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getSocialDashboard, createConnectionUrl, socialAnalyticsLocalEnabled } from "../../lib/social-analytics/zernio";
import { GET as dashboardRoute } from "../../app/api/social-analytics/dashboard/route";
import { POST as connectRoute } from "../../app/api/social-analytics/connect/route";

import { GET as listPages, PUT as selectPage } from "../../app/api/social-analytics/linkedin-pages/route";
import { DELETE as removeAccount } from "../../app/api/social-analytics/accounts/[accountId]/route";

const scope = { platform: "instagram" as const, fromDate: "2026-09-01", toDate: "2026-09-02" };
beforeEach(() => {
  vi.stubEnv("ZERNIO_API_KEY", "test-key");
  vi.stubEnv("ZERNIO_PROFILE_ID", "test-profile");
  vi.stubEnv("SOCIAL_ANALYTICS_LOCAL_ENABLED", "1");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Zernio local adapter", () => {
  it("preserves reported zero and marks missing metrics unavailable", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({profiles:[{_id:"test-profile"}]})).mockResolvedValue(Response.json({ totals: { views: 0, impressions: 5400, reach: null, likes: "" }, followers: {}, daily: [{ date: scope.fromDate, impressions: 0, views: 120 }], topPosts: [] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await getSocialDashboard(scope);
    expect(result.totals).toMatchObject({ views: 0, impressions: 5400, reach: null, likes: null, clicks: null });
    expect(result.followers.current).toBeNull();
    expect(result.daily[0]).toMatchObject({ impressions: 0, views: 120, reach: null });
    const [url, options] = fetcher.mock.calls[1];
    expect(url).toContain("profileId=test-profile");
    expect(url).toContain("platform=instagram");
    expect(options.headers.get("authorization")).toBe("Bearer test-key");
    expect(JSON.stringify(result)).not.toContain("test-key");
  });
  it("rejects provider errors and non-HTTPS connection URLs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({}, { status: 402 })).mockResolvedValueOnce(Response.json({profiles:[{_id:"test-profile"}]})).mockResolvedValueOnce(Response.json({ authUrl: "javascript:alert(1)" })));
    await expect(getSocialDashboard(scope)).rejects.toMatchObject({ status: 402 });
    await expect(createConnectionUrl("instagram", "http://localhost:3000/social-analytics")).rejects.toMatchObject({ code: "invalid_auth_url" });
  });
  it("keeps the local lab disabled in production even if its flag is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(socialAnalyticsLocalEnabled()).toBe(false);
  });
  it("rejects non-loopback hosts and invalid or reversed dates before fetching", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const request = (query: string, host = "localhost:3000") => new NextRequest(`http://${host}/api/social-analytics/dashboard?${query}`, { headers: { host } });
    expect((await dashboardRoute(request("", "beta-staging.wtfhq.in"))).status).toBe(404);
    for (const query of ["fromDate=2026-02-30&toDate=2026-03-01", "fromDate=2026-10-03&toDate=2026-10-01", "fromDate=2024-01-01&toDate=2026-01-01"]) {
      expect((await dashboardRoute(request(query))).status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires the authenticated admin flow even on the local lab", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const request = new NextRequest("http://localhost:3000/api/social-analytics/connect", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ platform: "instagram" }) });
    const response = await connectRoute(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({error:"admin_sign_in_required"});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["GET", "PUT", "DELETE"])("requires admin admission for local %s connection management", async method => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const route = method === "GET" ? listPages : method === "PUT" ? selectPage : removeAccount;
    const request = (host = "localhost:3000") => new NextRequest(`http://${host}/api/social-analytics/linkedin-pages?accountId=account-a`, { method, headers: { host, "content-type": "application/json" }, ...(method === "PUT" ? { body: JSON.stringify({ accountId: "account-a", organizationId: "page-a" }) } : {}) });
    expect((await route(request())).status).toBe(403);
    expect((await route(request("app.example"))).status).toBe(404);
    vi.stubEnv("NODE_ENV", "production");
    expect((await route(request())).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects cross-origin connection requests", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const req = new NextRequest("http://localhost:3000/api/social-analytics/connect", { method: "POST", headers: { host: "localhost:3000", origin: "https://external.example", "content-type": "application/json" }, body: JSON.stringify({ platform: "instagram" }) });
    expect((await connectRoute(req)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

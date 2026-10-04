import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync("public/analytics-demo/auth-bridge.js", "utf8");
describe("analytics authentication bridge", () => {
  it("waits for the app session before requesting connection status or OAuth", async () => {
    const window = new EventTarget() as EventTarget & { wtfAuthenticatedFetch?: ReturnType<typeof vi.fn> };
    const fetch = vi.fn();
    const context = vm.createContext({ window, location: { search: "?embedded=1" }, URLSearchParams, fetch, setTimeout, clearTimeout });
    vm.runInContext(source, context);
    const request = context.wtfAnalyticsRequest("/beta/api/analytics/status");
    expect(fetch).not.toHaveBeenCalled();
    const response = { ok: true };
    window.wtfAuthenticatedFetch = vi.fn().mockResolvedValue(response);
    window.dispatchEvent(new Event("wtf-analytics-auth-ready"));
    expect(await request).toBe(response);
    await context.wtfAnalyticsRequest("/beta/api/analytics/oauth/start", { method: "POST" });
    expect(window.wtfAuthenticatedFetch).toHaveBeenLastCalledWith("/beta/api/analytics/oauth/start", { method: "POST" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverZernioProfileId, socialAnalyticsConfigured } from "../../lib/social-analytics/zernio";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockProfiles(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Zernio profile discovery", () => {
  it("needs only the API key and selects the sole accessible profile", async () => {
    vi.stubEnv("ZERNIO_API_KEY", "test-key");
    vi.stubEnv("ZERNIO_PROFILE_ID", "");
    const fetchMock = mockProfiles({ profiles: [{ _id: "profile-one", isDefault: true }] });

    expect(socialAnalyticsConfigured()).toBe(true);
    await expect(discoverZernioProfileId()).resolves.toBe("profile-one");
    expect(fetchMock).toHaveBeenCalledWith("https://zernio.com/api/v1/profiles", expect.objectContaining({
      headers: expect.any(Headers),
    }));
  });

  it("selects the unique default when a key sees several profiles", async () => {
    vi.stubEnv("ZERNIO_API_KEY", "test-key");
    mockProfiles({ profiles: [{ _id: "other" }, { _id: "default", isDefault: true }] });

    await expect(discoverZernioProfileId()).resolves.toBe("default");
  });

  it("fails closed instead of using an arbitrary profile", async () => {
    vi.stubEnv("ZERNIO_API_KEY", "test-key");
    mockProfiles({ profiles: [{ _id: "one" }, { _id: "two" }] });

    await expect(discoverZernioProfileId()).rejects.toMatchObject({
      code: "profile_ambiguous",
      status: 409,
    });
  });

  it("reports an empty or malformed profile response", async () => {
    vi.stubEnv("ZERNIO_API_KEY", "test-key");
    mockProfiles({ profiles: [] });
    await expect(discoverZernioProfileId()).rejects.toMatchObject({ code: "profile_unavailable" });

    mockProfiles({});
    await expect(discoverZernioProfileId()).rejects.toMatchObject({ code: "invalid_profiles_response" });
  });
});

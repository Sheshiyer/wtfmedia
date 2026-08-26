import { afterEach, describe, expect, it } from "vitest";
import {
  appUiVariant,
  publicUiVariant,
} from "@/lib/public/public-ui-variant";

afterEach(() => {
  delete process.env.WTF_PUBLIC_UI_VARIANT;
});

describe("WTF OS application version", () => {
  it("defaults the application to wtfos", () => {
    expect(appUiVariant()).toBe("wtfos");
  });

  it("keeps legacy as the explicit rollback", () => {
    process.env.WTF_PUBLIC_UI_VARIANT = "legacy";
    expect(appUiVariant()).toBe("legacy");
  });

  it("accepts migrated as a temporary compatibility alias", () => {
    process.env.WTF_PUBLIC_UI_VARIANT = "migrated";
    expect(appUiVariant()).toBe("wtfos");
    expect(publicUiVariant()).toBe("migrated");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fromWeb = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("member settings route contract", () => {
  it("exposes only the four member settings destinations", () => {
    const navigation = fromWeb("components/domain/member/MemberSettingsNavigation.tsx");
    expect(navigation).toContain('href: "/beta/settings"');
    expect(navigation).toContain('href: "/beta/settings/memory"');
    expect(navigation).toContain('href: "/beta/settings/sessions"');
    expect(navigation).toContain('href: "/beta/settings/appearance"');
    expect(navigation).not.toContain("/beta/ops/");
    expect(navigation).not.toContain("operator");
  });

  it("keeps settings copy member-safe and memory controls explicit", () => {
    const files = [
      "app/beta/settings/page.tsx",
      "app/beta/settings/sessions/page.tsx",
      "app/beta/settings/appearance/page.tsx",
      "components/domain/member/MemoryPreferencesPanel.tsx",
      "components/domain/member/PreferenceImportPrompt.tsx",
    ].map(fromWeb).join("\n");

    expect(files).toContain("ThemeToggle");
    expect(files).toContain("save");
    const adaptiveMemory = fromWeb("app/beta/settings/memory/page.tsx");
    expect(adaptiveMemory).toContain("MemoryGovernancePanel");
    expect(adaptiveMemory).toContain("MemoryPreferencesPanel");
    const renderedCopy = files.replace(/^import[\s\S]*?;\n/gm, "");
    expect(renderedCopy).not.toMatch(/\b(?:D1|RBAC|issuer|provider|infrastructure|operator|Clerk)\b/i);
  });

  it("does not nest a second main landmark inside the shared application shell", () => {
    const layout = fromWeb("app/beta/settings/layout.tsx");
    expect(layout).not.toContain("<main");
    expect(layout).not.toContain("<header");
    expect(layout).not.toContain('href="/beta"');
    expect(layout).not.toContain("private workspace");
  });
});

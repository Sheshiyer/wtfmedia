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
    const account = fromWeb("app/beta/settings/page.tsx");
    const files = [
      "app/beta/settings/sessions/page.tsx",
      "app/beta/settings/appearance/page.tsx",
      "components/domain/member/MemoryPreferencesPanel.tsx",
      "components/domain/member/PreferenceImportPrompt.tsx",
    ].map(fromWeb).join("\n");

    expect(files).toContain("ThemeToggle");
    expect(files).toContain("save");
    expect(account).toContain("ClerkLogoutButton");
    expect(account).toContain("data-settings-account");
    const adaptiveMemory = fromWeb("app/beta/settings/memory/page.tsx");
    expect(adaptiveMemory).toContain("MemoryGovernancePanel");
    expect(adaptiveMemory).toContain("MemoryPreferencesPanel");
    const renderedCopy = files.replace(/^import[\s\S]*?;\n/gm, "");
    expect(renderedCopy).not.toMatch(/\b(?:D1|RBAC|issuer|provider|infrastructure|operator|Clerk)\b/i);
  });

  it("uses the canonical sessions and preferences routes without duplicate operator entries", () => {
    const navigation = fromWeb("components/domain/beta/BetaSettingsNavigation.tsx");
    const workspaceSessions = fromWeb("app/beta/settings/workspace/sessions/page.tsx");
    const workspaceMemory = fromWeb("app/beta/settings/workspace/memory/page.tsx");

    expect(navigation).toContain('"/beta/settings/sessions"');
    expect(navigation).toContain('"/beta/settings/memory"');
    expect(navigation).not.toContain("/beta/settings/workspace/sessions");
    expect(navigation).not.toContain("/beta/settings/workspace/memory");
    expect(workspaceSessions).toContain('redirect("/beta/settings/sessions")');
    expect(workspaceMemory).toContain('redirect("/beta/settings/memory")');
  });

  it("frames operator saved context as immutable preferences and custom instructions", () => {
    const panel = fromWeb("components/domain/ops/MemoryGovernancePanel.tsx");

    expect(panel).toContain("custom instructions");
    expect(panel).toContain("immutable");
    expect(panel).toContain("replacement");
    expect(panel).toContain("/ops/api/memory");
    expect(panel).toContain("archive");
    expect(panel).not.toContain('method: "PATCH"');
    expect(panel).not.toContain('method: "PUT"');
  });

  it("maps canonical sessions to live active and archived lifecycle controls", () => {
    const page = fromWeb("app/beta/settings/sessions/page.tsx");
    const panel = fromWeb("components/domain/beta/BetaSessionsSettingsPanel.tsx");

    expect(page).toContain("BetaSessionsSettingsPanel");
    expect(panel).toContain("includeArchived: true");
    expect(panel).toContain("delete permanently");
    expect(panel).toContain("audit-retained");
    expect(panel).toContain("adapter.canDelete");
  });

  it("does not nest a second main landmark inside the shared application shell", () => {
    const layout = fromWeb("app/beta/settings/layout.tsx");
    expect(layout).not.toContain("<main");
    expect(layout).not.toContain("<header");
    expect(layout).not.toContain('href="/beta"');
    expect(layout).not.toContain("private workspace");
  });
});

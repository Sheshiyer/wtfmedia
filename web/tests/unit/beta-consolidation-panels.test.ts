import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Beta consolidation admin panels", () => {
  it("projects explicit memory as separate from durable history", () => {
    const panel = source("components/domain/ops/MemoryGovernancePanel.tsx");

    expect(panel).toMatch(/automatic extraction/i);
    expect(panel).toContain("explicit only");
    expect(panel).toContain("data-memory-workspace");
    expect(panel).toContain("/ops/api/memory");
    expect(panel).toContain("durable account history");
    expect(panel).toContain("saved memory");
    for (const control of ["explicit save", "source provenance", "owner scope", "retention", "archive", "export", "audit"]) {
      expect(panel).toContain(control);
    }
    for (const sensitiveField of ["prompt", "answer", "token", "secret", "private payload"]) {
      expect(panel).not.toContain(`{${sensitiveField}`);
    }
  });

  it("keeps the RAG panel read-only and receipt-bound", () => {
    const panel = source("components/domain/ops/RagSourceHealthPanel.tsx");

    for (const receipt of ["55 / 55", "49 / 49", "11,948", "not observed", "published-only safe default", "timeline alignment unverified"]) {
      expect(panel).toContain(receipt);
    }
    for (const mode of ["published", "uncut", "both"]) expect(panel).toContain(mode);
    for (const exception of ["WTF is a Battery?", "WEF - Economics", "The Foundery", "Brain Armstrong transcript-row mismatch"]) {
      expect(panel).toContain(exception);
    }
    expect(panel).toContain("read-only");
    expect(panel).not.toContain("useState");
    expect(panel).not.toContain("fetch(");
  });

  it("shows sessions, protected admin links, and pending Clerk verification", () => {
    const panel = source("components/domain/ops/SessionHistoryPolicyPanel.tsx");
    const administration = source("components/domain/ops/OperatorAdministrationPanel.tsx");
    const readiness = source("components/domain/ops/BetaReadinessLedger.tsx");
    const ai = source("components/domain/ops/AIProviderSettingsPanel.tsx");
    const youtube = source("components/domain/ops/YouTubeAnalyticsSettingsPanel.tsx");
    const chat = source("app/(operator)/ops/chat/ChatWorkspace.tsx");
    const sessionNavigator = source("app/(operator)/ops/chat/ChatSessionNavigator.tsx");
    const publicChat = source("components/domain/public/MigratedChatPage.tsx");
    const settings = source("app/(operator)/ops/settings/page.tsx");
    const settingsLayout = source("app/(operator)/ops/settings/layout.tsx");
    const settingsNavigation = source("components/domain/ops/SettingsNavigation.tsx");
    const appRail = source("components/shells/AppRail.tsx");
    const profile = source("components/domain/ops/OperatorProfilePage.tsx");
    const profileRoute = source("app/(operator)/ops/profile/page.tsx");
    const profileContract = source("lib/ops/profile.ts");
    const settingsContract = source("lib/ops/settings-navigation.ts");

    for (const value of ["Clerk session JWT", "server / D1 operator record", "720 hours", "MFA precedence", "archive-only", "admin export", "verification pending"]) {
      expect(panel).toContain(value);
    }
    for (const href of ["/beta/ops/chat", "/beta/ops/operators", "/beta/ops/audit"]) expect(panel).toContain(href);
    for (const value of ["operator access", "roster read", "seat mutations", "super-admin transfer", "server-authorized"]) {
      expect(administration).toContain(value);
    }
    for (const value of ["data-operator-access-context", "verified request", "access boundary", "server readback", "organization scope", "last verified"]) {
      expect(administration).toContain(value);
    }
    for (const value of ["Clerk widget", "Clerk → D1 mapping", "session + recovery", "account history", "cross-chat memory", "activation held"]) {
      expect(readiness).toContain(value);
    }
    for (const value of ["AI route policy", "YouTube Analytics", "local contract ready", "mock preview"]) {
      expect(readiness).toContain(value);
    }
    for (const value of ["global primary model", "fallback order", "add fallback", "OpenRouter API key", "KV projection", "write-only", "save local policy"]) {
      expect(ai).toContain(value);
    }
    for (const value of ["YouTube Analytics", "OAuth-first", "local preview", "mock dashboard", "fixture data", "no analytics observation"]) {
      expect(youtube).toContain(value);
    }
    expect(ai).not.toContain("process.env");
    expect(youtube).not.toContain("process.env");
    for (const value of ["data-new-chat", "new chat", "data-history-back", "back to history", "ChatSessionNavigator", "data-chat-conversation-layout"]) {
      expect(chat).toContain(value);
    }
    for (const value of ["data-chat-session-navigator", "data-chat-session-link", "data-chat-new-session", "load more", "Session navigation is unavailable right now."]) {
      expect(sessionNavigator).toContain(value);
    }
    expect(publicChat).toContain("sign in for account sessions");
    for (const href of ["/beta/ops/settings/readiness", "/beta/ops/settings/release", "/beta/ops/settings/ai", "/beta/ops/settings/analytics", "/beta/ops/settings/sessions", "/beta/ops/settings/memory", "/beta/ops/settings/sources", "/beta/ops/settings/access"]) {
      expect(settingsContract + settingsLayout + settingsNavigation + settings).toContain(href);
    }
    expect(settings).not.toContain("AIProviderSettingsPanel");
    expect(settings).not.toContain("YouTubeAnalyticsSettingsPanel");
    expect(settings).not.toContain("SessionHistoryPolicyPanel");
    expect(settingsNavigation).toContain("settingsSectionsFor");
    expect(settingsNavigation).not.toContain("OperatorContextStrip");
    expect(settingsNavigation).not.toContain("data-ops-context-strip");
    expect(settingsLayout).not.toContain("OperatorContextStrip");
    expect(settingsLayout).toContain("canReadSettingsSection");
    expect(settings).toContain("ClerkLogoutButton");
    expect(settings).toContain("data-settings-account");
    expect(appRail).not.toContain("ClerkLogoutButton");
    expect(appRail).toContain("data-shell-profile");
    expect(appRail).toContain("data-shell-settings");
    expect(appRail).toContain("ThemeToggle");
    expect(appRail).toContain("data-navigation-utilities");
    expect(appRail).toContain("data-bottom-navigation");
    expect(appRail).toContain('href="/beta/ops/profile"');
    expect(profileRoute).toContain("OperatorProfilePage");
    for (const value of ["identity & role", "verified scope", "settings access map", "Clerk", "normalized email", "edge readback", "verification required", "/ops/api/profile"]) {
      expect(profile).toContain(value);
    }
    for (const value of ["displayName", "mappingStatus", "identityProvider", "createdAt", "updatedAt", "parseOperatorProfile"]) {
      expect(profileContract).toContain(value);
    }
    for (const sensitiveField of ["userId", "token", "secret", "authorization"]) {
      expect(profile).not.toContain(sensitiveField);
      expect(profileContract).not.toContain(sensitiveField);
    }
    for (const [route, component] of [
      ["readiness", "BetaReadinessLedger"],
      ["release", "ReleaseControl"],
      ["ai", "AIProviderSettingsPanel"],
      ["analytics", "YouTubeAnalyticsSettingsPanel"],
      ["sessions", "SessionHistoryPolicyPanel"],
      ["memory", "MemoryGovernancePanel"],
      ["sources", "RagSourceHealthPanel"],
      ["access", "OperatorAdministrationPanel"],
    ]) {
      expect(source(`app/(operator)/ops/settings/${route}/page.tsx`)).toContain(component);
    }
  });
});

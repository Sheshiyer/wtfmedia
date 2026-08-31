import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(import.meta.dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), "utf8");
}

describe("Ask WTF hotfix component contract", () => {
  it("generates the semantic foreground utilities consumed by public components", () => {
    const tailwind = read("tailwind.config.ts");

    expect(tailwind).toContain("primary:");
    expect(tailwind).toContain("secondary:");
    expect(tailwind).toContain("muted:");
    expect(tailwind).toContain('"on-structure"');
  });

  it("keeps header context in document flow so it cannot cover scrolled answers", () => {
    const header = read("components/patterns/WorkspaceHeader.tsx");

    expect(header).not.toContain("lg:fixed");
    expect(header).not.toContain("lg:top-9");
  });

  it("threads authoritative uncut availability to the source drawer", () => {
    const chat = read("components/domain/public/MigratedChatPage.tsx");
    const thread = read("components/domain/public/ConversationThread.tsx");
    const panel = read("components/domain/public/SourcePanel.tsx");

    expect(chat).toContain('response.headers.get("X-Uncut-Unavailable")');
    expect(thread).toContain("uncutUnavailable={msg.uncutUnavailable}");
    expect(panel).toContain("uncutUnavailable");
    expect(panel).not.toContain("disabled");
  });

  it("keeps an expanded mobile source drawer above the fixed composer", () => {
    const panel = read("components/domain/public/SourcePanel.tsx");

    expect(panel).toContain("onToggle");
    expect(panel).toContain('[data-testid="ask-composer"]');
    expect(panel).toContain("scrollIntoView");
    expect(panel).toContain("prefers-reduced-motion");
  });

  it("keeps floating shell controls clear of content without a bottom dock", () => {
    const rail = read("components/shells/AppRail.tsx");
    const shell = read("components/shells/AppShell.tsx");
    const composer = read("components/domain/public/AskComposer.tsx");

    expect(rail).toContain("data-top-app-rail");
    expect(rail).toContain("bg-canvas");
    expect(rail).toContain('aria-label="Application"');
    expect(rail).toContain("former floating bottom navigation pill is intentionally disabled");
    expect(rail).not.toContain("wtf-bottom-pill");
    expect(shell).toContain("pt-[calc(5rem+env(safe-area-inset-top))]");
    expect(shell).not.toContain("pb-28");
    expect(composer).toContain("bottom-[max(1rem,env(safe-area-inset-bottom))]");
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("WTF OS semantic shell substrate", () => {
  it("emits the unprefixed semantic utilities used by application components", () => {
    const tailwind = read("tailwind.config.ts");

    for (const declaration of [
      'canvas: "var(--wtf-canvas)"',
      'foreground: "var(--wtf-foreground)"',
      '"surface-subtle": "var(--wtf-surface-subtle)"',
      '"surface-raised": "var(--wtf-surface-raised)"',
      'editorial: "var(--wtf-editorial)"',
      'live: "var(--wtf-live)"',
      'attention: "var(--wtf-attention)"',
      'knowledge: "var(--wtf-knowledge)"',
      'information: "var(--wtf-information)"',
    ]) {
      expect(tailwind).toContain(declaration);
    }

    expect(tailwind).toContain('heading: ["var(--wtf-font-display)"]');
    expect(tailwind).toContain('body: ["var(--wtf-font-body)"]');
    expect(tailwind).toContain('label: ["var(--wtf-font-body)"]');
    expect(tailwind).toContain('panel: "var(--wtf-radius-panel)"');
    expect(tailwind).toContain('fast: "var(--wtf-duration-fast)"');
  });

  it("uses the canonical control radius in shared interactive primitives", () => {
    for (const primitive of [
      "components/ui/Button.tsx",
      "components/ui/IconButton.tsx",
      "components/ui/LinkButton.tsx",
      "components/ui/Drawer.tsx",
      "components/ui/SkipLink.tsx",
    ]) {
      const source = read(primitive);
      expect(source).toContain("--wtf-radius-control");
      expect(source).not.toContain("--radius-control");
    }
  });

  it("keeps whole-app shell surfaces on semantic color tokens", () => {
    for (const surface of [
      "components/shells/AppShell.tsx",
      "components/shells/AppRail.tsx",
      "components/patterns/PublicShell.tsx",
      "components/patterns/WorkspaceHeader.tsx",
      "components/patterns/StatusLedger.tsx",
      "components/domain/public/MigratedHomePage.tsx",
      "components/domain/public/MigratedEpisodesPage.tsx",
      "components/domain/public/MigratedConnectionsPage.tsx",
      "components/domain/public/MigratedChatPage.tsx",
      "components/domain/ops/OperatorShell.tsx",
      "components/domain/ops/ControlRoomStatusLedger.tsx",
    ]) {
      expect(read(surface)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });
});

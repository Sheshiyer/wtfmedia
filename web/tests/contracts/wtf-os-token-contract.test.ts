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
      'canvas: "rgb(var(--wtf-canvas-rgb) / <alpha-value>)"',
      'foreground: "rgb(var(--wtf-foreground-rgb) / <alpha-value>)"',
      '"surface-subtle": "rgb(var(--wtf-surface-subtle-rgb) / <alpha-value>)"',
      '"surface-raised": "rgb(var(--wtf-surface-raised-rgb) / <alpha-value>)"',
      '"surface-structure": "rgb(var(--wtf-surface-structure-rgb) / <alpha-value>)"',
      'overlay: "rgb(var(--wtf-overlay-rgb) / <alpha-value>)"',
      'editorial: "rgb(var(--wtf-editorial-rgb) / <alpha-value>)"',
      'live: "rgb(var(--wtf-live-rgb) / <alpha-value>)"',
      'attention: "rgb(var(--wtf-attention-rgb) / <alpha-value>)"',
      'knowledge: "rgb(var(--wtf-knowledge-rgb) / <alpha-value>)"',
      'information: "rgb(var(--wtf-information-rgb) / <alpha-value>)"',
      '"on-attention": "rgb(var(--wtf-on-attention-rgb) / <alpha-value>)"',
      '"on-editorial": "rgb(var(--wtf-on-editorial-rgb) / <alpha-value>)"',
      '"on-knowledge": "rgb(var(--wtf-on-knowledge-rgb) / <alpha-value>)"',
      '"on-information": "rgb(var(--wtf-on-information-rgb) / <alpha-value>)"',
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

  it("uses explicit structural, overlay, and on-accent roles in shared interactive surfaces", () => {
    const required: Record<string, string[]> = {
      "components/ui/Button.tsx": [
        "bg-surface-structure text-on-structure",
        "bg-surface-raised text-foreground",
        "bg-attention text-on-attention",
      ],
      "components/ui/IconButton.tsx": [
        "bg-surface-structure text-on-structure",
        "bg-surface-raised text-foreground",
      ],
      "components/ui/LinkButton.tsx": [
        "bg-surface-structure text-on-structure",
        "bg-attention text-on-attention",
      ],
      "components/ui/Drawer.tsx": [
        "bg-overlay/40",
        "bg-surface-raised",
        "text-secondary",
      ],
      "components/shells/AppShell.tsx": [
        "bg-surface-structure",
        "text-on-structure",
        "hover:text-on-attention",
      ],
      "components/domain/ops/OperatorActionDialog.tsx": [
        "bg-overlay/70",
        "bg-editorial",
        "text-on-editorial",
      ],
      "components/domain/ops/AuditExportDialog.tsx": [
        "bg-overlay/70",
      ],
    };

    for (const [relativePath, expectedClasses] of Object.entries(required)) {
      const source = read(relativePath);
      for (const expectedClass of expectedClasses) {
        expect(source, `${relativePath} should use ${expectedClass}`).toContain(expectedClass);
      }
    }
  });

  it("uses named text and surface roles for active route summaries, forms, and dialogs", () => {
    const required: Record<string, string[]> = {
      "components/patterns/WorkspaceHeader.tsx": ["text-secondary", "text-muted"],
      "components/domain/public/MigratedEpisodesPage.tsx": [
        "text-secondary",
        "bg-foreground/10",
        "bg-foreground/5",
      ],
      "components/domain/ops/OperatorContextStrip.tsx": ["text-muted", "text-secondary"],
      "components/domain/ops/OperatorsWorkspace.tsx": ["text-secondary"],
      "components/domain/ops/AuditWorkspace.tsx": ["text-secondary"],
      "components/domain/ops/OperatorRoster.tsx": ["text-secondary", "text-muted"],
      "components/domain/ops/AuditLedger.tsx": ["text-secondary"],
      "components/patterns/StatusLedger.tsx": ["text-muted"],
      "components/domain/ops/AccessRecovery.tsx": ["text-secondary"],
      "components/domain/ops/OperatorActionDialog.tsx": ["bg-surface-raised"],
      "components/domain/ops/AuditExportDialog.tsx": ["bg-surface-raised"],
    };

    for (const [relativePath, expectedClasses] of Object.entries(required)) {
      const source = read(relativePath);
      for (const expectedClass of expectedClasses) {
        expect(source, `${relativePath} should use ${expectedClass}`).toContain(expectedClass);
      }
    }
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(import.meta.dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), "utf8");
}

describe("adaptive component surfaces", () => {
  it("keeps shared components on semantic theme tokens", () => {
    const availability = read("components/ui/AvailabilityState.tsx");
    const ingestLedger = read("components/domain/ops/ingest/IngestionJobLedger.tsx");
    const guestRail = read("components/domain/public/MigratedGuestStrip.tsx");
    const graph = read("components/domain/public/MigratedConnectionGraph.tsx");
    const folder = read("components/patterns/brand/PaperFolder.tsx");
    const askComposer = read("components/domain/public/AskComposer.tsx");
    const tailwind = read("tailwind.config.ts");

    expect(availability).toContain("var(--wtf-radius-control)");
    expect(availability).toContain("bg-surface-raised");
    expect(availability).toContain("border-foreground/20");
    expect(availability).toContain("text-secondary");
    expect(availability).not.toContain("--radius-control");
    expect(availability).not.toContain("border-ink");
    expect(availability).not.toContain("text-ink");

    expect(ingestLedger).toContain("text-on-information");
    expect(ingestLedger).not.toContain("text-white");

    expect(guestRail).toContain("var(--wtf-foreground)");
    expect(guestRail).not.toContain("var(--color-foreground)");

    expect(graph).toContain("graphPaletteFromCssVariables");
    expect(graph).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(graph).not.toContain("text-ink");
    expect(graph).not.toContain("bg-cream");

    expect(folder).toContain("var(--wtf-attention)");
    expect(folder).not.toContain('color = "#f1b333"');
    expect(askComposer).toContain("!bg-knowledge");
    expect(askComposer).toContain("!text-on-knowledge");

    // Every `text-on-structure` consumer needs a generated Tailwind color
    // alias; without it, the dark structure fill inherits dark foreground
    // text in both themes.
    expect(tailwind).toContain("primary:");
    expect(tailwind).toContain("secondary:");
    expect(tailwind).toContain("muted:");
    expect(tailwind).toContain('"on-structure"');
    expect(tailwind).toContain("--wtf-text-primary-rgb");
    expect(tailwind).toContain("--wtf-text-secondary-rgb");
    expect(tailwind).toContain("--wtf-text-muted-rgb");
    expect(tailwind).toContain("--wtf-text-on-structure-rgb");
  });
});

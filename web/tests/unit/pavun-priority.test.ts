import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("Pavun57 PR #49 capability precedence", () => {
  it("preserves session context and the extended edge timeout", () => {
    const route = read("app/api/chat/route.ts");

    expect(route).toContain("export const maxDuration = 90");
    expect(route).toContain("history: messages.slice(0, -1)");
    expect(route).toContain("AbortSignal.timeout(75_000)");
  });

  it("keeps local Cloudflare secrets ignored", () => {
    expect(read("../.gitignore")).toContain("cloudflare/.dev.vars");
  });

  it("keeps retrieval confidence out of the source sheet", () => {
    const panel = read("components/domain/public/SourcePanel.tsx");

    // Product decision: no match labels or percentage scores on evidence.
    expect(panel).not.toContain("MatchStrengthBadge");
    expect(panel).not.toContain('data-testid="match-strength-badge"');
    expect(panel).toContain("StrengthStars");
  });
});

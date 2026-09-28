import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPENROUTER_MODEL_OPTIONS,
  OPENROUTER_LOCAL_POLICY,
} from "@/lib/ops/integration-contract";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("integration settings contracts", () => {
  it("keeps the local model policy unique and primary-first", () => {
    const ids = OPENROUTER_MODEL_OPTIONS.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(OPENROUTER_LOCAL_POLICY.primaryModel);
    expect(OPENROUTER_LOCAL_POLICY.fallbacks).not.toContain(OPENROUTER_LOCAL_POLICY.primaryModel);
    expect(new Set(OPENROUTER_LOCAL_POLICY.fallbacks).size).toBe(OPENROUTER_LOCAL_POLICY.fallbacks.length);
  });

  it("keeps provider credentials out of the analytics UI source contract", () => {
    const ai = source("components/domain/ops/AIProviderSettingsPanel.tsx");
    const youtube = source("components/domain/ops/YouTubeAnalyticsSettingsPanel.tsx");
    expect(ai).toContain("type=\"password\"");
    expect(ai).toContain("write-only");
    for (const component of [ai, youtube]) {
      expect(component).not.toContain("NEXT_PUBLIC_");
      expect(component).not.toContain("Authorization: Bearer");
    }
    expect(youtube).not.toContain("type=\"password\"");
    expect(youtube).not.toContain("YOUTUBE_ANALYTICS_FIXTURE");
    expect(youtube).toContain("/beta/api/analytics/oauth/start");
    expect(youtube).toContain("Website (GA4)");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPENROUTER_MODEL_OPTIONS,
  OPENROUTER_LOCAL_POLICY,
  YOUTUBE_ANALYTICS_FIXTURE,
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

  it("labels analytics values as fixture observations", () => {
    expect(YOUTUBE_ANALYTICS_FIXTURE.source).toBe("local fixture");
    expect(YOUTUBE_ANALYTICS_FIXTURE.refreshed).toBe("not observed");
    expect(YOUTUBE_ANALYTICS_FIXTURE.metrics.length).toBeGreaterThan(2);
  });

  it("keeps provider credentials out of the UI source contract", () => {
    const ai = source("components/domain/ops/AIProviderSettingsPanel.tsx");
    const youtube = source("components/domain/ops/YouTubeAnalyticsSettingsPanel.tsx");
    for (const component of [ai, youtube]) {
      expect(component).toContain("type=\"password\"");
      expect(component).toContain("write-only");
      expect(component).not.toContain("NEXT_PUBLIC_");
      expect(component).not.toContain("Authorization: Bearer");
    }
  });
});

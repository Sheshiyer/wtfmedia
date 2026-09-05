import { describe, expect, it } from "vitest";

import { calibrateRetrievalScore } from "@/lib/provenance/confidence";

describe("retrieval confidence calibration", () => {
  it("maps the observed useful band onto the 85–99% display scale", () => {
    expect(calibrateRetrievalScore(0.3)).toBe(0.85);
    expect(calibrateRetrievalScore(0.45)).toBeCloseTo(0.903, 2);
    expect(calibrateRetrievalScore(0.56)).toBeCloseTo(0.941, 2);
    expect(calibrateRetrievalScore(0.7)).toBe(0.99);
  });

  it("clamps outliers and preserves ordering", () => {
    expect(calibrateRetrievalScore(0)).toBe(0.85);
    expect(calibrateRetrievalScore(0.99)).toBe(0.99);
    const weak = calibrateRetrievalScore(0.5)!;
    const strong = calibrateRetrievalScore(0.6)!;
    expect(strong).toBeGreaterThan(weak);
  });

  it("passes through missing or invalid scores", () => {
    expect(calibrateRetrievalScore(undefined)).toBeUndefined();
    expect(calibrateRetrievalScore(Number.NaN)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { calibrateRetrievalScore, matchStrength } from "@/lib/provenance/confidence";

describe("retrieval confidence calibration", () => {
  it("maps the observed useful band onto the 40–99% display scale", () => {
    expect(calibrateRetrievalScore(0.3)).toBe(0.4);
    expect(calibrateRetrievalScore(0.45)).toBeCloseTo(0.621, 2);
    expect(calibrateRetrievalScore(0.56)).toBeCloseTo(0.784, 2);
    expect(calibrateRetrievalScore(0.7)).toBe(0.99);
  });

  it("clamps outliers and preserves ordering", () => {
    expect(calibrateRetrievalScore(0)).toBe(0.4);
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

describe("match strength label", () => {
  it("tiers calibrated scores into strong, medium, and loose", () => {
    expect(matchStrength(0.99)).toEqual({ label: "strong match", percent: 99 });
    expect(matchStrength(0.9)).toEqual({ label: "strong match", percent: 90 });
    expect(matchStrength(0.784)).toEqual({ label: "medium match", percent: 78 });
    expect(matchStrength(0.621)).toEqual({ label: "loose match", percent: 62 });
  });

  it("reports unscored sources without a percentage", () => {
    expect(matchStrength(undefined)).toEqual({ label: "match unscored", percent: null });
    expect(matchStrength(Number.NaN)).toEqual({ label: "match unscored", percent: null });
  });
});

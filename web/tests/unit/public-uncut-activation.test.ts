import { describe, expect, it } from "vitest";

import {
  isPublicUncutActivated,
  publicUncutActivation,
} from "@/lib/catalogue/public-uncut-activation";

describe("public uncut activation receipt", () => {
  it("contains the privacy-safe 49-episode backend receipt", () => {
    expect(publicUncutActivation.schema).toBe("wtfmedia.public_uncut_activation.v1");
    expect(publicUncutActivation.snapshotAt).toBe("2026-08-31");
    expect(publicUncutActivation.activationCount).toBe(49);
    expect(publicUncutActivation.activationTitles).toHaveLength(49);
    expect(new Set(publicUncutActivation.activationTitles).size).toBe(49);
    expect(publicUncutActivation.videoIds).toHaveLength(49);
    expect(new Set(publicUncutActivation.videoIds).size).toBe(49);
    expect(publicUncutActivation.videoIds.every((id) => /^[A-Za-z0-9_-]{11}$/.test(id))).toBe(true);
    expect(publicUncutActivation.videoIds.every(isPublicUncutActivated)).toBe(true);
  });
});

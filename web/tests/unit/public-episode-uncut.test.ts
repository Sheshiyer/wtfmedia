import { describe, expect, it } from "vitest";

import { resolvePublicEpisodeUncutState } from "@/lib/catalogue/public-episode-uncut";
import { publicUncutActivation } from "@/lib/catalogue/public-uncut-activation";

describe("public episode uncut state", () => {
  it("uses the backend activation receipt for mapped public episodes", () => {
    const state = resolvePublicEpisodeUncutState(
      "The AI Tsunami is Here & Society Isn't Ready | Dario Amodei x Nikhil Kamath | People by WTF",
      "68ylaeBbdsg",
    );

    expect(publicUncutActivation.activationCount).toBe(49);
    expect(state.kind).toBe("active");
    expect(state.label).toBe("uncut indexed");
  });

  it("keeps an unmapped public episode truthful despite a sheet candidate", () => {
    const state = resolvePublicEpisodeUncutState(
      "A public candidate without a backend activation",
      "abcdefghijk",
    );

    expect(state.kind).toBe("absent");
    expect(state.label).toBe("uncut not tracked");
  });

  it("marks mapped clean-cut rows as candidates without activating playback", () => {
    const state = resolvePublicEpisodeUncutState(
      "The AI Tsunami is Here & Society Isn't Ready | Dario Amodei x Nikhil Kamath | People by WTF",
    );

    expect(state.kind).toBe("candidate");
    expect(state.label).toBe("uncut candidate");
    expect(state.row?.uncutActivation).toBe("not-activated");
  });

  it("marks mapped rows without clean-cut pointers as not tracked", () => {
    const state = resolvePublicEpisodeUncutState(
      "The World Bank President On Why Jobs Fix Everything | Ajay Banga x Nikhil Kamath | People by WTF",
    );

    expect(state.kind).toBe("absent");
    expect(state.label).toBe("uncut not tracked");
    expect(state.row?.status).toBe("mapped");
    expect(state.row?.uncutPointer).toBe("absent");
  });

  it("fails closed for public titles outside the title map", () => {
    const state = resolvePublicEpisodeUncutState("Synthetic public episode");

    expect(state.kind).toBe("absent");
    expect(state.row).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { resolvePublicEpisodeUncutState } from "@/lib/catalogue/public-episode-uncut";

describe("public episode uncut state", () => {
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

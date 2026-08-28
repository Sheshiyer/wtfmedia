import { describe, expect, it } from "vitest";
import { bootForceFromSearch, resolveWtfOsBoot } from "@/lib/public/boot";

describe("wtf os boot overlay", () => {
  it("skips automated clients and a session that already saw the plates", () => {
    expect(
      resolveWtfOsBoot({ webdriver: true, reducedMotion: false, seen: false, force: false }),
    ).toBe("hidden");
    expect(
      resolveWtfOsBoot({ webdriver: false, reducedMotion: false, seen: true, force: false }),
    ).toBe("hidden");
  });

  it("shows motion or stills, and force can replay after skip", () => {
    expect(
      resolveWtfOsBoot({ webdriver: false, reducedMotion: false, seen: false, force: false }),
    ).toBe("motion");
    expect(
      resolveWtfOsBoot({ webdriver: false, reducedMotion: true, seen: false, force: false }),
    ).toBe("still");
    expect(
      resolveWtfOsBoot({ webdriver: true, reducedMotion: false, seen: true, force: true }),
    ).toBe("motion");
    expect(bootForceFromSearch("?boot=1")).toBe(true);
    expect(bootForceFromSearch("")).toBe(false);
  });
});

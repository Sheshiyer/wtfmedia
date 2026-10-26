import { describe, expect, it } from "vitest";

import { projectPublicMoments, projectPublicSources } from "@/lib/provenance/public-answer-projection";

describe("projectPublicSources URL safety", () => {
  const base = { n: 1, score: 0.9, videoId: "fL2wyVLX08o", title: "Ep 1", start: 12 };

  it("passes http(s) published URLs through", () => {
    const [source] = projectPublicSources([{ ...base, url: "https://www.youtube.com/watch?v=fL2wyVLX08o&t=12" }], "published");
    expect(source.url).toBe("https://www.youtube.com/watch?v=fL2wyVLX08o&t=12");
  });

  it("drops non-http published URLs that would render as raw hrefs", () => {
    for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "vbscript:msgbox(1)", "not a url", ""]) {
      const [source] = projectPublicSources([{ ...base, url }], "published");
      expect(source.url, url).toBeUndefined();
    }
  });

  it("still requires approved frame.io hosts in uncut mode", () => {
    const [approved] = projectPublicSources([{ ...base, url: "https://frame.io/player/abc" }], "uncut");
    expect(approved.url).toBe("https://frame.io/player/abc");
    const [rejected] = projectPublicSources([{ ...base, url: "https://evil.example/watch?v=fL2wyVLX08o" }], "uncut");
    expect(rejected.url).toBeUndefined();
  });
});

describe("projectPublicMoments URL safety", () => {
  const base = { videoId: "fL2wyVLX08o", title: "Ep 1", startSec: 300 };

  it("passes http(s) moment URLs through", () => {
    const { moments } = projectPublicMoments({ moments: [{ ...base, url: "https://youtu.be/fL2wyVLX08o?t=300" }] }) as {
      moments: { url: string }[];
    };
    expect(moments[0].url).toBe("https://youtu.be/fL2wyVLX08o?t=300");
  });

  it("falls back to the canonical YouTube watch URL for unsafe moment URLs", () => {
    const { moments } = projectPublicMoments({ moments: [{ ...base, url: "javascript:alert(1)" }] }) as {
      moments: { url: string }[];
    };
    expect(moments[0].url).toBe("https://www.youtube.com/watch?v=fL2wyVLX08o");
  });
});

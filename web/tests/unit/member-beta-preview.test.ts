import { describe, expect, it } from "vitest";
import { isMemberBetaPreviewHost, memberBetaPreviewFixtures } from "@/lib/member-beta-preview";

describe("member Beta staging preview", () => {
  it("admits only the staging Workers host", () => {
    expect(isMemberBetaPreviewHost("wtfmedia-web-staging.connect2nikhai.workers.dev")).toBe(true);
    expect(isMemberBetaPreviewHost("wtfhq.in")).toBe(false);
    expect(isMemberBetaPreviewHost(null)).toBe(false);
  });

  it("keeps each fixture member's records disjoint", () => {
    const memberA = memberBetaPreviewFixtures["member-a"];
    const memberB = memberBetaPreviewFixtures["member-b"];
    expect(memberA.email).not.toBe(memberB.email);
    expect(memberA.conversations.map((item) => item.id)).not.toContain(memberB.conversations[0]?.id);
    expect(memberA.memories.map((item) => item.id)).not.toContain(memberB.memories[0]?.id);
  });
});

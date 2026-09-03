import { describe, expect, test } from "vitest";
import { toCitedMarkdown } from "@/lib/public/chat-citations";

describe("Ask WTF citation formatting", () => {
  test("links each grouped citation to its exact episode route", () => {
    const result = toCitedMarkdown("The answer is supported by [1,2,3].", [
      { videoId: "abcdefghijk" },
      { episodeId: "lmnopqrstuv" },
      { videoId: "zyxwvutsrq1" },
    ]);

    expect(result).toBe(
      "The answer is supported by [1](/episodes/abcdefghijk), [2](/episodes/lmnopqrstuv), [3](/episodes/zyxwvutsrq1).",
    );
  });

  test("leaves non-citation brackets and unresolved citations unchanged", () => {
    const result = toCitedMarkdown("Use [draft] and verify [2].", [{ videoId: "abcdefghijk" }]);

    expect(result).toBe("Use [draft] and verify [2].");
  });
});

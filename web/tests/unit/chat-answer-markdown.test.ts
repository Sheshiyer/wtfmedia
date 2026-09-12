import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChatAnswerMarkdown } from "@/components/domain/public/ChatAnswerMarkdown";

describe("ChatAnswerMarkdown", () => {
  test("renders Alpha Markdown and grouped citations as episode links", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        { className: "prose-chat" },
        createElement(ChatAnswerMarkdown, {
          content: "**Guests food habits:**\n\n- fruit\n- breakfast\n\nThe answer is grounded in [1,2].",
          sources: [{ videoId: "abcdefghijk" }, { episodeId: "lmnopqrstuv" }],
        }),
      ),
    );

    expect(markup).toContain("<strong>Guests food habits:</strong>");
    expect(markup).toContain("<ul>");
    expect(markup).toContain("<li>fruit</li>");
    expect(markup).toContain('href="/episodes/abcdefghijk"');
    expect(markup).toContain('href="/episodes/lmnopqrstuv"');
    expect(markup).toContain('class="cite"');
  });

  test("keeps ordinary links safe and leaves raw HTML inert", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatAnswerMarkdown, {
        content: '[source](https://example.com) <script>alert("no")</script> [unsafe](javascript:alert("no"))',
      }),
    );

    expect(markup).toMatch(/href="https:\/\/example\.com"[^>]*target="_blank"[^>]*rel="noreferrer"/);
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain('href="javascript:');
  });
});

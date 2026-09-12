import type { Meta, StoryObj } from "storybook";
import { ChatAnswerMarkdown } from "@/components/domain/public/ChatAnswerMarkdown";

const meta = {
  title: "Domain/Public/Chat Answer Markdown",
  component: ChatAnswerMarkdown,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="prose-chat max-w-2xl border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary"><Story /></div>],
} satisfies Meta<typeof ChatAnswerMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GroundedAnswer: Story = {
  args: {
    content: "**Guests food habits:**\n\n- fruit before a recording\n- breakfast after an early workout\n\nThe comparison is grounded in [1,2].",
    sources: [{ videoId: "abcdefghijk" }, { episodeId: "lmnopqrstuv" }],
  },
};

export const SafeMalformedMarkup: Story = {
  args: {
    content: '[source](https://example.com) <script>alert("no")</script> [unsafe](javascript:alert("no"))',
  },
  play: async ({ canvasElement }) => {
    if (canvasElement.querySelector("script")) {
      throw new Error("Chat answers must not render raw HTML as executable markup");
    }
    if ([...canvasElement.querySelectorAll("a")].some((link) => link.href.startsWith("javascript:"))) {
      throw new Error("Chat answers must not render javascript links");
    }
  },
};

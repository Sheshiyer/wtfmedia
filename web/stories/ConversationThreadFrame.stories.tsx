import type { Meta, StoryObj } from "storybook";
import { expect } from "storybook/test";
import { AskComposer } from "@/components/domain/public/AskComposer";
import { ConversationThreadFrame } from "@/components/domain/public/ConversationThread";

const meta: Meta = {
  title: "Domain/Public/ConversationThreadFrame",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function composer() {
  return <AskComposer value="" onChange={() => undefined} onSubmit={() => undefined} placement="inline" />;
}

function Frame({ long }: { long: boolean }) {
  const paragraphs = long ? Array.from({ length: 24 }, (_, index) => `evidence passage ${index + 1}: the conversation stays readable while the thread grows.`) : ["The conversation fits the available reading frame."];
  return (
    <div style={{ height: 480, display: "flex", flexDirection: "column" }}>
      <ConversationThreadFrame
        contentVersion={paragraphs}
        renderFooter={composer}
        renderContent={({ scrollAnchor }) => (
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {scrollAnchor}
          </div>
        )}
      />
    </div>
  );
}

export const ShortContentKeepsComposerAtViewportBottom: Story = {
  render: () => <Frame long={false} />,
  play: async ({ canvasElement }) => {
    window.dispatchEvent(new Event("resize"));
    const thread = canvasElement.querySelector("[data-testid='conversation-thread']");
    const fixedComposer = canvasElement.querySelector("[data-fixed-composer]");
    if (thread?.getAttribute("data-composer-placement") !== "fixed" || !fixedComposer) {
      throw new Error("Short conversation must keep the composer fixed");
    }
    await expect(fixedComposer.getBoundingClientRect().bottom).toBeGreaterThan(0);
  },
};

export const LongContentScrollsAboveInlineComposer: Story = {
  render: () => <Frame long />,
  play: async ({ canvasElement }) => {
    const thread = canvasElement.querySelector("[data-testid='conversation-thread']");
    if (thread?.getAttribute("data-composer-placement") !== "inline") {
      throw new Error("Long conversation must keep the composer after scrollable content");
    }
    if (canvasElement.querySelector("[data-fixed-composer]")) {
      throw new Error("Long conversation must not obscure messages with a fixed composer");
    }
  },
};

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

function Frame({ long, fixed = false }: { long: boolean; fixed?: boolean }) {
  const paragraphs = long ? Array.from({ length: 24 }, (_, index) => `evidence passage ${index + 1}: the conversation stays readable while the thread grows.`) : ["The conversation fits the available reading frame."];
  return (
    <div style={{ height: 480, display: "flex", flexDirection: "column" }}>
      <ConversationThreadFrame
        contentVersion={paragraphs}
        composerPlacement={fixed ? "fixed" : "auto"}
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

export const PrivateShortContentKeepsComposerAtViewportBottom: Story = {
  render: () => <Frame long={false} fixed />,
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

export const PrivateLongContentKeepsComposerAtViewportBottom: Story = {
  render: () => <Frame long fixed />,
  play: async ({ canvasElement }) => {
    const thread = canvasElement.querySelector("[data-testid='conversation-thread']");
    const fixedComposer = canvasElement.querySelector("[data-fixed-composer]");
    if (thread?.getAttribute("data-composer-placement") !== "fixed" || !fixedComposer) {
      throw new Error("Private long conversation must keep the composer fixed");
    }
    const rect = fixedComposer.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      throw new Error("Private composer must remain within the viewport");
    }
  },
};

export const AutoLongContentScrollsAboveInlineComposer: Story = {
  render: () => <Frame long />,
  play: async ({ canvasElement }) => {
    const thread = canvasElement.querySelector("[data-testid='conversation-thread']");
    if (thread?.getAttribute("data-composer-placement") !== "inline") throw new Error("Auto mode must retain Alpha overflow behavior");
  },
};

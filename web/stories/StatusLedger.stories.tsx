import type { Meta, StoryObj } from "@storybook/react";
import { StatusLedger } from "@/components/patterns/StatusLedger";

const meta: Meta<typeof StatusLedger> = {
  title: "Patterns/StatusLedger",
  component: StatusLedger,
};

export default meta;
type Story = StoryObj<typeof StatusLedger>;

export const StateVocabulary: Story = {
  args: {
    title: "workspace state",
    items: [
      {
        label: "episodes",
        state: "active",
        detail: "the public episode workspace is available.",
        href: "/episodes",
      },
      {
        label: "production",
        state: "not-activated",
        detail: "the production workflow is not activated.",
        href: "/production",
      },
      {
        label: "integration status",
        state: "unknown",
        detail: "no trustworthy observation exists.",
        observed: "not observed",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const active = canvasElement.querySelector('[data-state="active"]');
    const inactive = canvasElement.querySelector('[data-state="not-activated"]');
    if (active?.tagName !== "A") {
      throw new Error("Active workspace row must be a semantic link");
    }
    if (inactive?.tagName === "A" || inactive?.tagName === "BUTTON") {
      throw new Error("Not-activated state must not be interactive");
    }
    for (const row of canvasElement.querySelectorAll("[data-state]")) {
      if (!row.textContent?.trim()) throw new Error("State meaning cannot be color-only");
    }
  },
};

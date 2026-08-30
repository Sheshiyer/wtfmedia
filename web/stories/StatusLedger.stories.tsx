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
        label: "analytics",
        state: "not-activated",
        detail: "platform reporting is not activated.",
        href: "/analytics",
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

export const Promoted: Story = {
  args: {
    title: "workspace state",
    eyebrow: "now / next",
    items: [
      {
        label: "ask wtf",
        state: "active",
        detail: "ask the catalogue and keep quoted evidence beside the answer.",
        href: "/chat",
        promoted: true,
      },
      {
        label: "episodes",
        state: "active",
        detail: "the public episode workspace is available.",
        href: "/episodes",
      },
      {
        label: "analytics",
        state: "not-activated",
        detail: "platform reporting is not activated.",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const promoted = canvasElement.querySelectorAll('[data-promoted="true"]');
    if (promoted.length !== 1) {
      throw new Error("StatusLedger must render exactly one promoted item");
    }
    if (!promoted[0]?.textContent?.includes("do this next")) {
      throw new Error("Promoted item must replace the observed slot with do this next");
    }
    const firstState = canvasElement.querySelector("[data-state]");
    if (firstState?.getAttribute("data-promoted") !== "true") {
      throw new Error("Promoted item must render above the divided list");
    }
  },
};

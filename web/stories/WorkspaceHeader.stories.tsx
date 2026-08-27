import type { Meta, StoryObj } from "@storybook/react";
import { LinkButton } from "@/components/ui/LinkButton";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

const meta: Meta<typeof WorkspaceHeader> = {
  title: "Patterns/WorkspaceHeader",
  component: WorkspaceHeader,
};

export default meta;
type Story = StoryObj<typeof WorkspaceHeader>;

export const ControlRoom: Story = {
  args: {
    eyebrow: "run the show from the source",
    title: "control room",
    summary: "one brain for the catalogue, evidence, and the work that follows.",
    accent: "attention",
    primaryAction: (
      <LinkButton href="/chat" variant="primary">
        ask the catalogue
      </LinkButton>
    ),
  },
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector("[data-workspace-header]")) {
      throw new Error("Missing workspace header marker");
    }
    if (canvasElement.querySelectorAll("[data-primary-action]").length !== 1) {
      throw new Error("Workspace header must expose one primary action slot");
    }
  },
};

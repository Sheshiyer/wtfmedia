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
    size: "control-room",
    eyebrow: "run the show from the source",
    title: "control room",
    summary: "your access is verified. workflow systems will appear here when they are activated.",
    accent: "attention",
    primaryAction: (
      <LinkButton href="/ops/operators" variant="attention">
        review operator access
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

export const OperatorsPage: Story = {
  args: {
    size: "page",
    eyebrow: "access boundary",
    title: "operators",
    summary: "manage approved operator access through the protected operator service.",
    accent: "attention",
  },
};

export const AuditPage: Story = {
  args: {
    size: "page",
    eyebrow: "recorded evidence",
    title: "audit",
    summary: "review only allowlisted administrative evidence.",
    accent: "information",
  },
};

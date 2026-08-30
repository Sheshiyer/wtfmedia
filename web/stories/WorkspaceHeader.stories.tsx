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
    summary: "production records are live. ingest, seats, and access gates are not. missing evidence stays unnamed.",
    accent: "attention",
    primaryAction: (
      <LinkButton href="/ops/production" variant="attention">
        open production
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
    eyebrow: "seats",
    title: "operators",
    summary: "seats and access gates are not in this release. this roster is not a live gate.",
    accent: "attention",
  },
};

export const AuditPage: Story = {
  args: {
    size: "page",
    eyebrow: "recorded evidence",
    title: "audit",
    summary: "allowlisted admin events only. empty means empty. this is not an access log for a gate that is off.",
    accent: "information",
  },
};

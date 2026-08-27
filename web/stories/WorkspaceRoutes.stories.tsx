import type { Meta, StoryObj } from "@storybook/react";
import MigratedEpisodesPage from "@/components/domain/public/MigratedEpisodesPage";
import MigratedConnectionsPage from "@/components/domain/public/MigratedConnectionsPage";
import MigratedChatPage from "@/components/domain/public/MigratedChatPage";

const meta: Meta = {
  title: "Pages/WorkspaceRoutes",
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
  },
};

export default meta;
type Story = StoryObj;

function assertWorkspaceHeader(canvasElement: HTMLElement, title: string) {
  const header = canvasElement.querySelector("[data-workspace-header]");
  if (!header) throw new Error(`${title} must use the shared workspace header`);
  if (header.querySelector("h1")?.textContent?.trim() !== title) {
    throw new Error(`${title} must be the visible workspace title`);
  }
}

export const Episodes: Story = {
  render: () => <MigratedEpisodesPage />,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/episodes" } } },
  play: async ({ canvasElement }) => assertWorkspaceHeader(canvasElement, "episodes"),
};

export const Connections: Story = {
  render: () => <MigratedConnectionsPage />,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/connections" } } },
  play: async ({ canvasElement }) => assertWorkspaceHeader(canvasElement, "connections"),
};

export const AskWtf: Story = {
  render: () => <MigratedChatPage />,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/chat" } } },
  play: async ({ canvasElement }) => assertWorkspaceHeader(canvasElement, "ask wtf"),
};

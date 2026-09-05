import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "@/components/shells/AppShell";

const publicNavigation = [
  { href: "/", label: "ask wtf", section: "workspace" as const },
  { href: "/episodes", label: "episodes", section: "workspace" as const },
  { href: "/connections", label: "connections", section: "workspace" as const },
];

const meta: Meta<typeof AppShell> = {
  title: "Shells/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const PublicEpisodesActive: Story = {
  args: {
    mode: "public",
    navigation: publicNavigation,
  },
  render: (args) => (
    <AppShell {...args}>
      <div className="p-8">
        <h1>episodes workspace</h1>
      </div>
    </AppShell>
  ),
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/episodes" } },
    viewport: { width: 1440, height: 900 },
  },
  play: async ({ canvasElement }) => {
    const shell = canvasElement.querySelector('[data-wtf-shell="wtfos"]');
    const mode = canvasElement.querySelector('[data-shell-mode="public"]');
    const active = canvasElement.querySelector('a[aria-current="page"]');
    if (!shell || !mode) throw new Error("Missing canonical public WTF OS shell");
    if (active?.textContent?.trim() !== "episodes") {
      throw new Error(
        `Episodes must be the one active workspace; received ${active?.textContent?.trim() ?? "none"}`,
      );
    }
    // Non-chat pages keep the bottom dock, and "ask wtf" (the chat home)
    // leads it.
    const dockLinks = Array.from(
      canvasElement.querySelectorAll("#wtf-application-navigation a"),
    ).map((link) => link.textContent?.trim());
    if (dockLinks[0] !== "ask wtf") {
      throw new Error(`Dock must lead with ask wtf; received ${dockLinks.join("|") || "none"}`);
    }
  },
};

export const OperatorProjection: Story = {
  args: {
    mode: "operator",
    navigation: [
      { href: "/ops", label: "control room", section: "workspace" },
      { href: "/ops/operators", label: "operators", section: "administration" },
      { href: "/ops/audit", label: "audit", section: "administration" },
    ],
  },
  render: (args) => (
    <AppShell {...args}>
      <div className="p-8">
        <h1>operations</h1>
      </div>
    </AppShell>
  ),
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/ops/operators" } },
  },
  play: async ({ canvasElement }) => {
    const links = Array.from(canvasElement.querySelectorAll("nav a")).map(
      (link) => link.textContent?.trim(),
    );
    if (links.join("|") !== "control room|operators|audit") {
      throw new Error(`Unexpected operator projection: ${links.join("|")}`);
    }
  },
};

export const MobileDrawer: Story = {
  args: {
    mode: "public",
    navigation: publicNavigation,
  },
  render: (args) => (
    <AppShell {...args}>
      <div className="p-4">
        <h1>mobile chat home</h1>
      </div>
    </AppShell>
  ),
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    viewport: { width: 320, height: 640 },
  },
  play: async ({ canvasElement }) => {
    // Chat home contract: header controls (logo + drawer toggle) stay, the
    // bottom dock is intentionally hidden so the conversation runs
    // edge-to-edge.
    const dock = canvasElement.querySelector("#wtf-application-navigation");
    const logo = canvasElement.querySelector('header a[aria-label="WTF OS"]');
    const toggle = canvasElement.querySelector("[data-navigation-toggle]");
    if (!logo || !toggle) {
      throw new Error("Mobile chat home must keep header controls");
    }
    if (dock) {
      throw new Error("Chat home must not render the bottom dock");
    }
    const logoHref = logo.getAttribute("href");
    if (logoHref !== "/") {
      throw new Error(`Logo must return to the chat home; received ${logoHref ?? "none"}`);
    }
  },
};

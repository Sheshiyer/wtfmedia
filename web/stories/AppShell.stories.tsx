import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "@/components/shells/AppShell";

const publicNavigation = [
  { href: "/", label: "the room", section: "workspace" as const },
  { href: "/episodes", label: "episodes", section: "workspace" as const },
  { href: "/connections", label: "connections", section: "workspace" as const },
  { href: "/chat", label: "ask wtf", section: "workspace" as const },
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
    const headerNavigation = canvasElement.querySelector("#wtf-application-navigation");
    const bottomNavigation = canvasElement.querySelector("#wtf-bottom-navigation");
    const headerLinks = Array.from(headerNavigation?.querySelectorAll("a") ?? []).map(
      (link) => link.textContent?.trim(),
    );
    if (headerLinks.join("|") !== "control room|operators|audit") {
      throw new Error(`Unexpected operator header projection: ${headerLinks.join("|")}`);
    }
    if (
      !bottomNavigation ||
      bottomNavigation.querySelectorAll("a").length !== 4 ||
      !bottomNavigation.querySelector("[data-bottom-wordmark]")
    ) {
      throw new Error("Operator bottom navigation must mirror destinations and include the WTF OS wordmark");
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
        <h1>mobile control room</h1>
      </div>
    </AppShell>
  ),
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    viewport: { width: 320, height: 640 },
  },
  play: async ({ canvasElement }) => {
    const primaryNav = canvasElement.querySelector("#wtf-application-navigation");
    const bottomNav = canvasElement.querySelector("#wtf-bottom-navigation");
    const applicationNav = canvasElement.querySelector('nav[aria-label="Application"]');
    const logo = canvasElement.querySelector('header a[aria-label="WTF OS"]');
    const toggle = canvasElement.querySelector("[data-navigation-toggle]");
    if (!primaryNav || !bottomNav || !applicationNav || !logo || !toggle) {
      throw new Error("Mobile shell must keep header controls and scroll-safe dock navigation");
    }
    if (primaryNav.id === bottomNav.id) throw new Error("Header and bottom navigation IDs must be distinct");
  },
};

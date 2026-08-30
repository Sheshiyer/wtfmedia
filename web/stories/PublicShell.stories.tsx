import type { Meta, StoryObj } from "@storybook/react";
import { PublicShell } from "@/components/patterns/PublicShell";

const meta: Meta<typeof PublicShell> = {
  title: "Shells/PublicShellAdapter",
  component: PublicShell,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
  },
};

export default meta;
type Story = StoryObj<typeof PublicShell>;

function content(title: string) {
  return (
    <div className="p-8">
      <h1>{title}</h1>
    </div>
  );
}

export const ControlRoomDesktop: Story = {
  render: () => <PublicShell>{content("the room")}</PublicShell>,
  parameters: { viewport: { width: 1440, height: 900 } },
};

export const EpisodesActive: Story = {
  render: () => <PublicShell>{content("episodes")}</PublicShell>,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/episodes" } },
  },
  play: async ({ canvasElement }) => {
    const active = canvasElement.querySelector('nav a[aria-current="page"]');
    if (active?.textContent?.trim() !== "episodes") {
      throw new Error("Episodes must be the active WTF OS workspace");
    }
  },
};

export const Mobile320: Story = {
  render: () => <PublicShell>{content("mobile workspace")}</PublicShell>,
  parameters: { viewport: { width: 320, height: 640 } },
  play: async ({ canvasElement }) => {
    const controls = Array.from(canvasElement.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "controls",
    );
    if (!controls) {
      throw new Error("Missing compact workspace controls trigger");
    }
  },
};

export const CanonicalScope: Story = {
  render: () => <PublicShell>{content("scope")}</PublicShell>,
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector('[data-wtf-shell="wtfos"]')) {
      throw new Error("Missing canonical WTF OS shell marker");
    }
    const copy = canvasElement.textContent ?? "";
    for (const forbidden of ["NVIDIA", "llama", "model picker", "api key"]) {
      if (copy.toLowerCase().includes(forbidden.toLowerCase())) {
        throw new Error(`Public shell contains forbidden copy: ${forbidden}`);
      }
    }
  },
};

export const SkipLink: Story = {
  render: () => <PublicShell>{content("skip target")}</PublicShell>,
  play: async ({ canvasElement }) => {
    const skip = canvasElement.querySelector<HTMLAnchorElement>('a[href="#wtf-main"]');
    const main = canvasElement.querySelector("#wtf-main");
    if (!skip || main?.getAttribute("tabindex") !== "-1") {
      throw new Error("Shared skip-link contract is incomplete");
    }
  },
};

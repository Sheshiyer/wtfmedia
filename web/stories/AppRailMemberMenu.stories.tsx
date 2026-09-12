import type { Meta, StoryObj } from "storybook";
import { expect } from "storybook/test";
import { AppRail } from "@/components/shells/AppRail";

const meta: Meta<typeof AppRail> = {
  title: "Shells/AppRail/MemberMenu",
  component: AppRail,
  parameters: {
    layout: "fullscreen",
    viewport: { width: 320, height: 640 },
    nextjs: { appDirectory: true, navigation: { pathname: "/beta/chat/mcnv_abcdefgh" } },
  },
};

export default meta;
type Story = StoryObj<typeof AppRail>;

export const ContainedAndDismissible: Story = {
  args: {
    mode: "member",
    navigation: [{ href: "/beta", label: "ask wtf", icon: "chat" }, { href: "/beta/settings", label: "settings", icon: "settings" }],
    disclosureGroups: [{ label: "Beta workspace", items: [{ href: "/beta", label: "ask wtf" }, { href: "/beta/settings", label: "settings" }] }],
    utility: <button type="button" className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-foreground px-3 py-2 text-xs font-bold">log out to public alpha</button>,
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: /open member workspace navigation/i });
    await userEvent.click(toggle);
    const menu = canvasElement.querySelector("[data-navigation-disclosure]");
    if (!menu || menu.getAttribute("data-state") !== "open") throw new Error("Member menu must open");
    const utility = canvas.getByRole("button", { name: "log out to public alpha" });
    const menuRect = menu.getBoundingClientRect();
    const utilityRect = utility.getBoundingClientRect();
    if (utilityRect.left < menuRect.left || utilityRect.right > menuRect.right) throw new Error("Logout control must stay inside menu");
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) throw new Error("Member menu must not create horizontal overflow");
    await userEvent.keyboard("{Escape}");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await userEvent.click(canvasElement.ownerDocument.body);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  },
};

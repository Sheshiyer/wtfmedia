import type { Meta, StoryObj } from "@storybook/react";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";

const meta: Meta<typeof OperatorShell> = {
  title: "Operations/OperatorShell",
  component: OperatorShell,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/ops" } },
  },
};

export default meta;
type Story = StoryObj<typeof OperatorShell>;

const adminNavigation = [
  { label: "Control Room", href: "/ops" as const },
  { label: "Operators", href: "/ops/operators" as const },
  { label: "Audit", href: "/ops/audit" as const },
];

export const AdminDesktop: Story = {
  args: { nav: adminNavigation },
  render: (args) => (
    <OperatorShell {...args}>
      <div id="ops-main" className="p-8">
        <h1>control room</h1>
      </div>
    </OperatorShell>
  ),
  parameters: { viewport: { width: 1440, height: 900 } },
};

export const EditorMobile: Story = {
  args: { nav: [{ label: "Control Room", href: "/ops" }] },
  render: (args) => (
    <OperatorShell {...args}>
      <div id="ops-main" className="p-4">
        <h1>control room</h1>
      </div>
    </OperatorShell>
  ),
  parameters: { viewport: { width: 320, height: 640 } },
};

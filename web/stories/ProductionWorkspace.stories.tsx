import type { Meta, StoryObj } from "@storybook/react";
import { ProductionWorkspace } from "@/components/domain/ops/ProductionWorkspace";

const meta: Meta<typeof ProductionWorkspace> = {
  title: "Operations/ProductionWorkspace",
  component: ProductionWorkspace,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ProductionWorkspace>;

export const EmptyChrome: Story = {
  render: () => (
    <div className="bg-canvas p-6">
      <ProductionWorkspace />
    </div>
  ),
};

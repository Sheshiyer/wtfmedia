import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { ProductionWorkspaceView } from "@/components/domain/ops/ProductionWorkspaceView";

const meta: Meta<typeof ProductionWorkspaceView> = {
  title: "Operations/ProductionWorkspace",
  component: ProductionWorkspaceView,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ProductionWorkspaceView>;

export const EmptyChrome: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Calendar and production board" })).toBeVisible();
    await expect(canvas.queryByText("Workbook reference")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Board", exact: true }));
    await expect(canvas.getByText("0 episodes", { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Dubbing", exact: true }));
    await expect(canvas.getByRole("button", { name: "Dubbing", exact: true })).toHaveAttribute("aria-pressed", "true");
  },
  render: () => (
    <div className="bg-canvas p-6">
      <ProductionWorkspaceView fetcher={async () => Response.json({ ips: [], items: [], events: [], guests: [], itemGuests: [], dubbing: [], permissions: [], blockers: [], sourceChecks: [], sourceSheets: [], sourceSummary: null, canEdit: false, canManage: false })} />
    </div>
  ),
};

export const Unavailable: Story = {
  args: { fetcher: async () => Response.json({ error: "production_unavailable" }, { status: 503 }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent("temporarily unavailable");
    await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Calendar and production board" })).not.toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { OperatorRoster } from "@/components/domain/ops/OperatorRoster";

const meta: Meta<typeof OperatorRoster> = { title: "Operations/OperatorRoster", component: OperatorRoster, parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj<typeof OperatorRoster>;
const rows = [{ name: "Asha Patel", email: "asha@example.test", role: "admin" as const, active: true, changedAt: "2026-08-26T10:00:00Z" }, { name: "Jules Park", email: "jules@example.test", role: "editor" as const, active: false, changedAt: null }];
export const PopulatedDesktop: Story = { args: { rows }, parameters: { viewport: { width: 1440, height: 900 } } };
export const PopulatedMobile: Story = { args: { rows }, parameters: { viewport: { width: 320, height: 640 } } };
export const Unavailable: Story = { args: { rows: [], state: "unavailable" } };

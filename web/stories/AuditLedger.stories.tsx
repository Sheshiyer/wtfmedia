import type { Meta, StoryObj } from "@storybook/react";
import { AuditLedger } from "@/components/domain/ops/AuditLedger";

const meta: Meta<typeof AuditLedger> = { title: "Operations/AuditLedger", component: AuditLedger, parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj<typeof AuditLedger>;
const rows = [{ timestamp: "2026-08-26T00:00:00.000Z", subject: "recorded operator", role: "admin", action: "operator_invite", entityType: "operator", entityId: "invitation", outcome: "succeeded", environment: "local", correlationId: "fixture-correlation" }];
export const Populated: Story = { args: { rows, state: "ready" } };
export const Empty: Story = { args: { rows: [], state: "measured-zero" } };
export const Unavailable: Story = { args: { rows: [], state: "unavailable" } };

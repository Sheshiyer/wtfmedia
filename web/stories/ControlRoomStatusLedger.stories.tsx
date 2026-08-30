import type { Meta, StoryObj } from "@storybook/react";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";

const meta: Meta<typeof ControlRoomStatusLedger> = {
  title: "Operations/ControlRoomStatusLedger",
  component: ControlRoomStatusLedger,
};

export default meta;
type Story = StoryObj<typeof ControlRoomStatusLedger>;

export const EditorProjection: Story = {
  args: { role: "editor" },
  play: async ({ canvasElement }) => {
    const copy = canvasElement.textContent ?? "";
    if (copy.includes("audit ledger")) {
      throw new Error("Editor status projection must not reveal Audit");
    }
    if (canvasElement.querySelectorAll('[data-state="not-activated"]').length !== 0) {
      throw new Error("Control room must not render inactive placeholder modules");
    }
    const promoted = canvasElement.querySelector('[data-promoted="true"]');
    if (promoted?.textContent?.toLowerCase().includes("production") !== true) {
      throw new Error("Editor next action must promote production");
    }
  },
};

export const AdminProjection: Story = {
  args: { role: "admin" },
  play: async ({ canvasElement }) => {
    if (!(canvasElement.textContent ?? "").includes("audit")) {
      throw new Error("Authorized administration projection must include Audit");
    }
    const promoted = canvasElement.querySelector('[data-promoted="true"]');
    if (promoted?.textContent?.toLowerCase().includes("production") !== true) {
      throw new Error("Admin next action must promote production");
    }
  },
};

export const SuperAdminProjection: Story = {
  args: { role: "super_admin" },
  play: async ({ canvasElement }) => {
    const promoted = canvasElement.querySelector('[data-promoted="true"]');
    if (promoted?.textContent?.toLowerCase().includes("production") !== true) {
      throw new Error("Super-admin next action must promote production");
    }
  },
};

import type { Meta, StoryObj } from "storybook";
import { expect } from "storybook/test";

import { publicEpisodeFixture } from "./fixtures/public";

function HarnessSmoke() {
  return (
    <section aria-labelledby="harness-smoke-title">
      <h1 id="harness-smoke-title">Harness smoke</h1>
      <p>{publicEpisodeFixture.title}</p>
      <a href="#fixture-source">Open fixture source</a>
      <button type="button">Confirm focus</button>
    </section>
  );
}

const meta = {
  title: "Harness/Smoke",
  component: HarnessSmoke,
  tags: ["test"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof HarnessSmoke>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const source = canvas.getByRole("link", { name: "Open fixture source" });
    const button = canvas.getByRole("button", { name: "Confirm focus" });

    await userEvent.tab();
    await expect(source).toHaveFocus();
    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { MigratedHomePage } from "@/components/domain/public/MigratedHomePage";

const meta: Meta<typeof MigratedHomePage> = {
  title: "Pages/MigratedHomePage",
  component: MigratedHomePage,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof MigratedHomePage>;

export const Default: Story = {};

export const PublicRoomContract: Story = {
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector("[data-workspace-header]")) {
      throw new Error("Root workspace must use the shared workspace header");
    }
    const ledger = canvasElement.querySelector('[aria-labelledby="what\'s-open-title"]');
    if (ledger) throw new Error("Workspace state belongs in compact settings, not the public room");
    const copy = canvasElement.textContent ?? "";
    for (const forbidden of ["all systems operational", "0 tasks", "workspace state"]) {
      if (copy.includes(forbidden)) throw new Error(`Fabricated dashboard copy: ${forbidden}`);
    }
  },
};

export const WithEpisodes: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};

export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};

export const DarkMode: Story = {
  parameters: {
    themes: {
      default: "dark",
    },
  },
};

export const ReducedMotion: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "motion",
            enabled: true,
          },
        ],
      },
    },
  },
};

export const HighContrast: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
        ],
      },
    },
  },
};

export const GuestStripScrollable: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const CtaHover: Story = {
  parameters: {
    pseudo: {
      hover: ["[data-testid='cta-primary']"],
    },
  },
};

export const CtaFocus: Story = {
  parameters: {
    pseudo: {
      focus: ["[data-testid='cta-primary']"],
    },
  },
};

export const EmptyState: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
};

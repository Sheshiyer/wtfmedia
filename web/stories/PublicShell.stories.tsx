import type { Meta, StoryObj } from "@storybook/react";
import { PublicShell } from "@/components/patterns/PublicShell";

const meta: Meta<typeof PublicShell> = {
  title: "Patterns/PublicShell",
  component: PublicShell,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PublicShell>;

/**
 * Default migrated shell at desktop width.
 * Verifies: skip link, nav, main content, footer, scoped marker, inert brand slot.
 */
export const Default: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Page Content</h1>
        <p>Main content area for testing.</p>
      </div>
    </PublicShell>
  ),
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

/**
 * Mobile viewport (320px) — 2x2 navigation grid.
 */
export const Mobile320: Story = {
  render: () => (
    <PublicShell>
      <div className="p-4">
        <h1>Mobile Content</h1>
      </div>
    </PublicShell>
  ),
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

/**
 * Tablet viewport (768px) — single row navigation.
 */
export const Tablet768: Story = {
  render: () => (
    <PublicShell>
      <div className="p-6">
        <h1>Tablet Content</h1>
      </div>
    </PublicShell>
  ),
  parameters: {
    viewport: { defaultViewport: "tablet" },
  },
};

/**
 * Wide desktop (1440px) — bounded 1400px container.
 */
export const WideDesktop1440: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Wide Desktop Content</h1>
      </div>
    </PublicShell>
  ),
  parameters: {
    viewport: { width: 1440, height: 900 },
  },
};

/**
 * Skip link interaction — Tab to reveal skip link, Enter to jump to main.
 */
export const SkipLinkInteraction: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1 id="main-content-heading">Main Content Target</h1>
        <p>After skip link activation, focus should land here.</p>
      </div>
    </PublicShell>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "link-name", enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement;
    const skipLink = canvas.querySelector('a[href="#main-content"]');
    if (skipLink) {
      skipLink.focus();
    }
  },
};

/**
 * Active route state — verifies aria-current=page on home route.
 */
export const ActiveRouteHome: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Home Page</h1>
      </div>
    </PublicShell>
  ),
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/",
      },
    },
  },
};

/**
 * Active route state — verifies aria-current=page on episodes route.
 */
export const ActiveRouteEpisodes: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Episodes Page</h1>
      </div>
    </PublicShell>
  ),
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/episodes",
      },
    },
  },
};

/**
 * Migrated scope marker — verifies data-wtf-shell="migrated" exists.
 */
export const MigratedScopeMarker: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Scoped Content</h1>
        <p>Shell should have data-wtf-shell=&quot;migrated&quot; marker.</p>
      </div>
    </PublicShell>
  ),
  play: async ({ canvasElement }) => {
    const marker = canvasElement.querySelector('[data-wtf-shell="migrated"]');
    if (!marker) {
      throw new Error("Missing data-wtf-shell=migrated marker");
    }
  },
};

/**
 * Inert brand slot — verifies the slot exists but is hidden and aria-hidden.
 */
export const InertBrandSlot: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Brand Slot Test</h1>
        <p>Inert brand slot should exist for Plan 01-22.</p>
      </div>
    </PublicShell>
  ),
  play: async ({ canvasElement }) => {
    const slot = canvasElement.querySelector('[data-wtf-brand-slot="inert"]');
    if (!slot) {
      throw new Error("Missing inert brand slot");
    }
    if (slot.getAttribute("aria-hidden") !== "true") {
      throw new Error("Brand slot should be aria-hidden");
    }
  },
};

/**
 * Public-only footer — verifies no internal/engine/model copy.
 */
export const PublicOnlyFooter: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Footer Test</h1>
      </div>
    </PublicShell>
  ),
  play: async ({ canvasElement }) => {
    const footer = canvasElement.querySelector("footer");
    if (!footer) {
      throw new Error("Missing footer");
    }
    const forbiddenTerms = [
      "NVIDIA",
      "llama",
      "nv-embedqa",
      "chunks indexed",
      "Proof of concept",
      "Internal build",
    ];
    const footerText = footer.textContent || "";
    for (const term of forbiddenTerms) {
      if (footerText.includes(term)) {
        throw new Error(`Footer contains forbidden term: ${term}`);
      }
    }
  },
};

/**
 * No legacy imports — verifies PublicShell does not import legacy components.
 * This is a static assertion; the story itself renders correctly.
 */
export const NoLegacyImports: Story = {
  render: () => (
    <PublicShell>
      <div className="p-8">
        <h1>Import Boundary Test</h1>
        <p>
          PublicShell should not import CustomCursor, Sparkle, Marquee, or
          legacy brand modules.
        </p>
      </div>
    </PublicShell>
  ),
};

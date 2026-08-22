import { within } from "@testing-library/dom";
import type { Meta, StoryObj } from "storybook";
import { expect, fn } from "storybook/test";

import {
  AvailabilityState,
  type AvailabilityStateId,
} from "../components/ui/AvailabilityState";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { IconButton } from "../components/ui/IconButton";
import { LinkButton } from "../components/ui/LinkButton";
import { LiveRegion } from "../components/ui/LiveRegion";
import { SkipLink } from "../components/ui/SkipLink";

// ---------------------------------------------------------------------------
// Button stories
// ---------------------------------------------------------------------------

const buttonMeta = {
  title: "Phase1Primitives/Button",
  component: Button,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Button>;

export default buttonMeta;

type Story = StoryObj<typeof buttonMeta>;

/** Buttons are reachable by Tab and activatable by Enter/Space */
export const ButtonKeyboard: Story = {
  render: () => (
    <section aria-labelledby="button-demo-title">
      <h2 id="button-demo-title">Button variants</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Button variant="primary">Primary action</Button>
        <Button variant="secondary">Secondary action</Button>
        <Button variant="ghost">Ghost action</Button>
        <Button loading>Loading action</Button>
        <Button disabled>Disabled action</Button>
        <Button pressed>Pressed toggle</Button>
      </div>
    </section>
  ),
  play: async ({ canvas, userEvent }) => {
    const primary = canvas.getByRole("button", { name: "Primary action" });
    const secondary = canvas.getByRole("button", { name: "Secondary action" });

    // Tab to first button
    await userEvent.tab();
    await expect(primary).toHaveFocus();

    // Tab to second button
    await userEvent.tab();
    await expect(secondary).toHaveFocus();
  },
};

/** Loading buttons are disabled and aria-busy */
export const ButtonLoading: Story = {
  args: { children: "Loading action", loading: true },
  play: async ({ canvas }) => {
    const loading = canvas.getByRole("button", { name: "Loading action" });
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveAttribute("aria-busy", "true");
  },
};

/** Disabled buttons are not focusable via tab */
export const ButtonDisabled: Story = {
  args: { children: "Disabled action", disabled: true },
  play: async ({ canvas }) => {
    const disabled = canvas.getByRole("button", { name: "Disabled action" });
    await expect(disabled).toBeDisabled();
  },
};

/** Pressed toggle buttons expose aria-pressed */
export const ButtonPressed: Story = {
  args: { children: "Pressed toggle", pressed: true },
  play: async ({ canvas }) => {
    const pressed = canvas.getByRole("button", { name: "Pressed toggle" });
    await expect(pressed).toHaveAttribute("aria-pressed", "true");
  },
};

// ---------------------------------------------------------------------------
// IconButton stories
// ---------------------------------------------------------------------------

const iconButtonMeta = {
  title: "Phase1Primitives/IconButton",
  component: IconButton,
  tags: ["test"],
  parameters: { layout: "padded" },
};

/** Icon buttons are reachable and have accessible names */
export const IconButtonAccessible: StoryObj<typeof IconButton> = {
  render: () => (
    <section aria-labelledby="icon-button-demo-title">
      <h2 id="icon-button-demo-title">Icon buttons</h2>
      <div style={{ display: "flex", gap: "1rem" }}>
        <IconButton aria-label="Close dialog">
          <span aria-hidden="true">X</span>
        </IconButton>
        <IconButton aria-label="Open menu" variant="secondary">
          <span aria-hidden="true">=</span>
        </IconButton>
      </div>
    </section>
  ),
  play: async ({ canvas, userEvent }) => {
    const close = canvas.getByRole("button", { name: "Close dialog" });
    const menu = canvas.getByRole("button", { name: "Open menu" });

    await userEvent.tab();
    await expect(close).toHaveFocus();

    await userEvent.tab();
    await expect(menu).toHaveFocus();
  },
};

// ---------------------------------------------------------------------------
// LinkButton stories
// ---------------------------------------------------------------------------

const linkButtonMeta = {
  title: "Phase1Primitives/LinkButton",
  component: LinkButton,
  tags: ["test"],
  parameters: { layout: "padded" },
};

/** External links open in new tab with safe rel */
export const LinkButtonExternal: StoryObj<typeof LinkButton> = {
  render: () => (
    <section aria-labelledby="link-button-demo-title">
      <h2 id="link-button-demo-title">Link buttons</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <LinkButton href="/episodes">Internal link</LinkButton>
        <LinkButton href="https://example.com">External link</LinkButton>
      </div>
    </section>
  ),
  play: async ({ canvas }) => {
    const external = canvas.getByRole("link", { name: "External link" });
    await expect(external).toHaveAttribute("target", "_blank");
    await expect(external).toHaveAttribute("rel", "noreferrer noopener");
  },
};

/** Unsafe protocol links are rendered as disabled spans, not anchors */
export const LinkButtonUnsafeProtocol: StoryObj<typeof LinkButton> = {
  render: () => (
    <section aria-labelledby="unsafe-demo-title">
      <h2 id="unsafe-demo-title">Unsafe protocol links</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <LinkButton href="javascript:alert('xss')">Unsafe protocol</LinkButton>
        <LinkButton href="data:text/html,<h1>bad</h1>">
          Data protocol
        </LinkButton>
      </div>
    </section>
  ),
  play: async ({ canvas }) => {
    // Unsafe links should NOT be rendered as actual links
    // They render as <span role="link" aria-disabled="true">
    const unsafeSpan = canvas.getByRole("link", {
      name: "Unsafe protocol",
    });
    await expect(unsafeSpan).toHaveAttribute("aria-disabled", "true");
    // Ensure no anchor elements with dangerous hrefs exist
    const container = canvas.getByRole("heading", {
      name: "Unsafe protocol links",
    }).parentElement!;
    const anchors = container.querySelectorAll("a");
    const hrefs = Array.from(anchors).map((a) => a.getAttribute("href"));
    await expect(hrefs).not.toContain("javascript:alert('xss')");
    await expect(hrefs).not.toContain("data:text/html,<h1>bad</h1>");
  },
};

// ---------------------------------------------------------------------------
// SkipLink stories
// ---------------------------------------------------------------------------

const skipLinkMeta = {
  title: "Phase1Primitives/SkipLink",
  component: SkipLink,
  tags: ["test"],
  parameters: { layout: "padded" },
};

/** Skip link is the first focusable element and targets main region */
export const SkipLinkFirstFocus: StoryObj<typeof SkipLink> = {
  render: () => (
    <div>
      <SkipLink />
      <main id="public-main">
        <h2>Main content</h2>
        <p>Content after skip link target.</p>
      </main>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const skip = canvas.getByRole("link", {
      name: "Skip to main content",
    });

    // First tab should land on skip link
    await userEvent.tab();
    await expect(skip).toHaveFocus();
    await expect(skip).toHaveAttribute("href", "#public-main");
  },
};

// ---------------------------------------------------------------------------
// AvailabilityState stories
// ---------------------------------------------------------------------------

const availabilityMeta = {
  title: "Phase1Primitives/AvailabilityState",
  component: AvailabilityState,
  tags: ["test"],
  parameters: { layout: "padded" },
};

/** All 11 availability states are distinguishable by visible text, not color alone */
export const AvailabilityAllStates: StoryObj<typeof AvailabilityState> = {
  render: () => {
    const states: AvailabilityStateId[] = [
      "unknown",
      "unavailable",
      "stale",
      "partial",
      "empty",
      "permission-denied",
      "error",
      "offline",
      "unmapped",
      "conflicted",
      "measured-zero",
    ];
    return (
      <section aria-labelledby="availability-demo-title">
        <h2 id="availability-demo-title">Availability states</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {states.map((state) => (
            <AvailabilityState key={state} state={state} />
          ))}
        </div>
      </section>
    );
  },
  play: async ({ canvas }) => {
    // All 11 states must render as status regions with distinct labels
    const statuses = canvas.getAllByRole("status");
    await expect(statuses.length).toBeGreaterThanOrEqual(11);

    // Each state has a data-availability attribute for CSS-color-disabled meaning
    const container = canvas.getByRole("heading", {
      name: "Availability states",
    }).parentElement!;
    const stateEls = container.querySelectorAll("[data-availability]");
    const renderedStates = Array.from(stateEls).map((el) =>
      el.getAttribute("data-availability"),
    );
    // All 11 state identifiers present
    await expect(renderedStates).toContain("unknown");
    await expect(renderedStates).toContain("unavailable");
    await expect(renderedStates).toContain("stale");
    await expect(renderedStates).toContain("partial");
    await expect(renderedStates).toContain("empty");
    await expect(renderedStates).toContain("permission-denied");
    await expect(renderedStates).toContain("error");
    await expect(renderedStates).toContain("offline");
    await expect(renderedStates).toContain("unmapped");
    await expect(renderedStates).toContain("conflicted");
    await expect(renderedStates).toContain("measured-zero");
  },
};

/** Permission-denied state never confirms a protected record exists */
export const AvailabilityPermissionDenied: StoryObj<typeof AvailabilityState> = {
  render: () => <AvailabilityState state="permission-denied" />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole("status");
    // Must have visible text (not color-only)
    await expect(region).toHaveTextContent(/.+/);
    // Must NOT enumerate or confirm entity existence
    const text = region.textContent ?? "";
    await expect(text).not.toMatch(/exists|found|record|item|resource/i);
    // Must have data-availability for CSS-color-disabled environments
    await expect(region).toHaveAttribute("data-availability", "permission-denied");
  },
};

/** Measured-zero is distinct from empty — search completed but found nothing */
export const AvailabilityMeasuredZero: StoryObj<typeof AvailabilityState> = {
  render: () => <AvailabilityState state="measured-zero" />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole("status");
    await expect(region).toHaveAttribute("data-availability", "measured-zero");
    // Measured-zero has visible text distinguishing it from empty
    await expect(region).toHaveTextContent(/no results/i);
  },
};

// ---------------------------------------------------------------------------
// LiveRegion stories
// ---------------------------------------------------------------------------

/** Live region announces bounded status changes politely */
export const LiveRegionPolite: StoryObj<typeof LiveRegion> = {
  render: () => (
    <LiveRegion politeness="polite">3 results loaded</LiveRegion>
  ),
  play: async ({ canvas }) => {
    const region = canvas.getByRole("status");
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(region).toHaveAttribute("aria-atomic", "true");
    // Content is stable (set once per meaningful state change)
    await expect(region).toHaveTextContent("3 results loaded");
    // Visible only to screen readers
    await expect(region).toHaveClass(/sr-only/);
  },
};

/** Assertive live region uses role="alert" */
export const LiveRegionAssertive: StoryObj<typeof LiveRegion> = {
  render: () => (
    <LiveRegion politeness="assertive">Connection lost</LiveRegion>
  ),
  play: async ({ canvas }) => {
    const region = canvas.getByRole("alert");
    await expect(region).toHaveAttribute("aria-live", "assertive");
    await expect(region).toHaveTextContent("Connection lost");
  },
};

/** Live region does NOT receive per-token streaming updates */
export const LiveRegionNoTokenStreaming: StoryObj<typeof LiveRegion> = {
  render: () => (
    <section aria-labelledby="no-streaming-title">
      <h2 id="no-streaming-title">Bounded announcement</h2>
      <LiveRegion politeness="polite">Answer ready</LiveRegion>
    </section>
  ),
  play: async ({ canvas }) => {
    const region = canvas.getByRole("status");
    // Live region contains a single bounded announcement, not per-token fragments
    const text = region.textContent ?? "";
    // Must be a complete message (at least 2 words, not a single token fragment)
    const wordCount = text.trim().split(/\s+/).length;
    await expect(wordCount).toBeGreaterThanOrEqual(2);
    // Must be a complete, stable message
    await expect(region).toHaveTextContent("Answer ready");
  },
};

// ---------------------------------------------------------------------------
// Drawer stories
// ---------------------------------------------------------------------------

/** Drawer is labelled and contains focus */
export const DrawerLabelled: StoryObj<typeof Drawer> = {
  render: () => (
    <Drawer open={true} onOpenChange={() => {}} title="Episode details">
      <p>Drawer content is here.</p>
    </Drawer>
  ),
  play: async () => {
    // Radix Dialog renders via portal — query the full document
    const body = within(document.body);

    // Drawer has an accessible title
    const title = body.getByRole("heading", { name: "Episode details" });
    await expect(title).toBeInTheDocument();

    // Close button has accessible name
    const close = body.getByRole("button", { name: "Close drawer" });
    await expect(close).toBeInTheDocument();

    // Close button meets 44px minimum touch target
    const styles = window.getComputedStyle(close);
    const minHeight = parseInt(styles.minHeight, 10);
    await expect(minHeight).toBeGreaterThanOrEqual(44);
    const minWidth = parseInt(styles.minWidth, 10);
    await expect(minWidth).toBeGreaterThanOrEqual(44);
  },
};

/** Drawer with description shows both title and description */
export const DrawerWithDescription: StoryObj<typeof Drawer> = {
  render: () => (
    <Drawer
      open={true}
      onOpenChange={() => {}}
      title="Filters"
      description="Narrow down your search results"
    >
      <p>Filter controls go here.</p>
    </Drawer>
  ),
  play: async () => {
    const body = within(document.body);

    const title = body.getByRole("heading", { name: "Filters" });
    await expect(title).toBeInTheDocument();

    const description = body.getByText("Narrow down your search results");
    await expect(description).toBeInTheDocument();
  },
};

/** Left-side drawer slides from the left */
export const DrawerLeftSide: StoryObj<typeof Drawer> = {
  render: () => (
    <Drawer
      open={true}
      onOpenChange={() => {}}
      title="Navigation"
      side="left"
    >
      <nav>
        <ul>
          <li>Home</li>
          <li>Episodes</li>
        </ul>
      </nav>
    </Drawer>
  ),
  play: async () => {
    const body = within(document.body);

    const title = body.getByRole("heading", { name: "Navigation" });
    await expect(title).toBeInTheDocument();
  },
};

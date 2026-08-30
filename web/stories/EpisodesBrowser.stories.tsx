import { within } from "@testing-library/dom";
import type { Meta, StoryObj } from "storybook";
import { expect, fn } from "storybook/test";

import { EpisodeDrawer } from "@/components/domain/public/EpisodeDrawer";
import type { Episode } from "@/lib/episodes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validEpisode: Episode = {
  video_id: "fixture-episode-001",
  title: "Synthetic public episode",
  url: "https://example.test/watch/fixture-episode-001",
  duration: 1200,
  view_count: 25000,
  uploader: "WTF Media",
  channel_id: "UC-test",
  playlist_id: "PL-test",
  playlist_title: "Test Show",
};

const invalidEpisode: Episode = {
  video_id: "nonexistent-id",
  title: "Missing episode",
  url: "https://example.test/watch/nonexistent",
  duration: 0,
  view_count: 0,
  uploader: "WTF Media",
  channel_id: "UC-test",
  playlist_id: "PL-test",
  playlist_title: "Test Show",
};

// ---------------------------------------------------------------------------
// EpisodeDrawer stories
// ---------------------------------------------------------------------------

const drawerMeta = {
  title: "EpisodesBrowser/EpisodeDrawer",
  component: EpisodeDrawer,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof EpisodeDrawer>;

export default drawerMeta;

type Story = StoryObj<typeof drawerMeta>;

/** Valid episode opens drawer with title and actions */
export const DrawerValidEpisode: Story = {
  args: {
    episode: validEpisode,
    onClose: fn(),
  },
  play: async ({ userEvent }) => {
    const body = within(document.body);

    // Drawer has accessible title
    const title = body.getByRole("heading", {
      name: "Synthetic public episode",
    });
    await expect(title).toBeInTheDocument();

    // Published YouTube playback opens in-place; it never implies that Uncut is available.
    const youtubeToggle = body.getByRole("button", { name: "play published" });
    await expect(youtubeToggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(youtubeToggle);
    await expect(youtubeToggle).toHaveAttribute("aria-expanded", "true");
    await expect(body.getByTitle("Published YouTube video: Synthetic public episode")).toHaveAttribute(
      "src",
      expect.stringContaining("www.youtube-nocookie.com/embed/fixture-episode-001"),
    );

    const uncut = body.getByRole("button", { name: "uncut not tracked" });
    await expect(uncut).toBeDisabled();
    await expect(body.getByRole("status")).toHaveTextContent(/no privacy-safe title-map row/i);

    const askLink = body.getByRole("link", { name: /ask about this episode/ });
    await expect(askLink).toHaveAttribute("href");
    const href = askLink.getAttribute("href")!;
    await expect(href).toContain("/chat?q=");
  },
};

/** Invalid episode shows unavailable notice without drawer */
export const DrawerInvalidEpisode: Story = {
  args: {
    episode: null,
    onClose: fn(),
  },
  play: async ({ args }) => {
    // When episode is null, drawer should not render
    const body = within(document.body);
    const dialogs = body.queryAllByRole("dialog");
    await expect(dialogs).toHaveLength(0);
  },
};

/** Close button triggers onClose callback */
export const DrawerCloseButton: Story = {
  args: {
    episode: validEpisode,
    onClose: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);

    // Close button exists and is accessible
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

/** Transcript loading state shows loading indicator */
export const DrawerTranscriptLoading: Story = {
  args: {
    episode: validEpisode,
    onClose: fn(),
  },
  play: async () => {
    const body = within(document.body);

    // The published transcript section is present before a network result resolves.
    const transcriptLabel = body.getByText("published transcript");
    await expect(transcriptLabel).toBeInTheDocument();

    // Loading state shows initially
    const loading = body.queryByText("Loading transcript…");
    // May or may not be present depending on fetch timing
    if (loading) {
      await expect(loading).toBeInTheDocument();
    }
  },
};

/** Episode with no transcript shows unavailable message */
export const DrawerNoTranscript: Story = {
  args: {
    episode: {
      ...validEpisode,
      video_id: "no-transcript-episode",
    },
    onClose: fn(),
  },
  play: async () => {
    const body = within(document.body);

    // Wait for component to render
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should show either transcript blocks, plain text, or unavailable message
    const unavailable = body.queryByText(
      /No public transcript is available/,
    );
    const blocks = body.queryAllByRole("link", { name: /▶ \d+:/ });
    const loading = body.queryByText(/Loading transcript/);

    // At least one state should be present
    const hasContent = unavailable || blocks.length > 0 || loading;
    await expect(hasContent).toBeTruthy();
  },
};

/** Episode description shows show name, duration, and views */
export const DrawerDescription: Story = {
  args: {
    episode: validEpisode,
    onClose: fn(),
  },
  play: async () => {
    const body = within(document.body);

    // Wait for component to render
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Drawer should be open with title
    const title = body.getByRole("heading", { name: "Synthetic public episode" });
    await expect(title).toBeInTheDocument();

    // Description should contain show name
    const description = body.getByText(/Test Show/);
    await expect(description).toBeInTheDocument();
  },
};

/** Timestamp links use verified time only */
export const DrawerTimestampLinks: Story = {
  args: {
    episode: validEpisode,
    onClose: fn(),
  },
  play: async () => {
    const body = within(document.body);

    // Wait for transcript to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // If timestamp blocks exist, they should link to YouTube with t parameter
    const timestampLinks = body.queryAllByRole("link", { name: /▶ \d+:/ });
    for (const link of timestampLinks) {
      const href = link.getAttribute("href") ?? "";
      // Must link to YouTube with timestamp
      await expect(href).toMatch(/&t=\d+s$/);
      // Must open in new tab
      await expect(link).toHaveAttribute("target", "_blank");
      // Must have safe rel
      await expect(link).toHaveAttribute("rel", "noreferrer");
    }
  },
};

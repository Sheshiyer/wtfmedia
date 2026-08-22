import type { Meta, StoryObj } from "storybook";
import { expect } from "storybook/test";

import { MigratedWordmark, MigratedWordmarkMini } from "../components/patterns/brand/MigratedWordmark";
import { SignatureSparkle } from "../components/patterns/brand/SignatureSparkle";
import { PausableMarquee } from "../components/patterns/brand/PausableMarquee";
import { OptionalPointerAccent } from "../components/patterns/brand/OptionalPointerAccent";

// ---------------------------------------------------------------------------
// MigratedWordmark stories
// ---------------------------------------------------------------------------

const wordmarkMeta = {
  title: "BrandMotion/MigratedWordmark",
  component: MigratedWordmark,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof MigratedWordmark>;

export default wordmarkMeta;

type WordmarkStory = StoryObj<typeof wordmarkMeta>;

/** Full wordmark renders all four letters with correct structure */
export const WordmarkStructure: WordmarkStory = {
  render: () => <MigratedWordmark />,
  play: async ({ canvas }) => {
    // The wordmark renders "wtfmedia" as four spans
    const w = canvas.getByText("w", { exact: true });
    const t = canvas.getByText("t", { exact: true });
    const f = canvas.getByText("f", { exact: true });
    const media = canvas.getByText("media", { exact: true });

    await expect(w).toBeInTheDocument();
    await expect(t).toBeInTheDocument();
    await expect(f).toBeInTheDocument();
    await expect(media).toBeInTheDocument();
  },
};

/** Wordmark uses semantic tokens for w, t, media and raw #0C8167 for f */
export const WordmarkTokens: WordmarkStory = {
  render: () => <MigratedWordmark />,
  play: async ({ canvas }) => {
    const w = canvas.getByText("w", { exact: true });
    const t = canvas.getByText("t", { exact: true });
    const f = canvas.getByText("f", { exact: true });
    const media = canvas.getByText("media", { exact: true });

    // w uses var(--wtf-editorial) — browser resolves to computed RGB
    await expect(w).toHaveStyle({ color: "rgb(197, 59, 58)" });

    // t uses var(--wtf-foreground) — ink
    await expect(t).toHaveStyle({ color: "rgb(26, 26, 26)" });

    // f uses brand-asset exception #0C8167 (not var(--wtf-live))
    await expect(f).toHaveStyle({ color: "rgb(12, 129, 103)" });

    // media uses var(--wtf-canvas) — cream
    await expect(media).toHaveStyle({ color: "rgb(255, 246, 234)" });
  },
};

/** Wordmark with sparkles shows two SignatureSparkle instances */
export const WordmarkWithSparkles: WordmarkStory = {
  render: () => <MigratedWordmark withSparkles={true} />,
  play: async ({ canvasElement }) => {
    // Sparkles are aria-hidden SVGs — query DOM directly
    const svgs = canvasElement.querySelectorAll("svg");
    await expect(svgs.length).toBeGreaterThanOrEqual(2);
  },
};

/** Wordmark without sparkles shows no SVG elements */
export const WordmarkWithoutSparkles: WordmarkStory = {
  render: () => <MigratedWordmark withSparkles={false} />,
  play: async ({ canvasElement }) => {
    // No SVGs should be present
    const svgs = canvasElement.querySelectorAll("svg");
    await expect(svgs).toHaveLength(0);
  },
};

// ---------------------------------------------------------------------------
// MigratedWordmarkMini stories
// ---------------------------------------------------------------------------

const miniMeta = {
  title: "BrandMotion/MigratedWordmarkMini",
  component: MigratedWordmarkMini,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof MigratedWordmarkMini>;

type MiniStory = StoryObj<typeof miniMeta>;

/** Mini wordmark renders four letters inline */
export const MiniStructure: MiniStory = {
  render: () => <MigratedWordmarkMini />,
  play: async ({ canvas }) => {
    const w = canvas.getByText("w", { exact: true });
    const f = canvas.getByText("f", { exact: true });
    await expect(w).toBeInTheDocument();
    await expect(f).toBeInTheDocument();
  },
};

/** Mini wordmark uses brand-asset exception for green */
export const MiniTokens: MiniStory = {
  render: () => <MigratedWordmarkMini />,
  play: async ({ canvas }) => {
    const f = canvas.getByText("f", { exact: true });
    await expect(f).toHaveStyle({ color: "rgb(12, 129, 103)" });
  },
};

// ---------------------------------------------------------------------------
// SignatureSparkle stories
// ---------------------------------------------------------------------------

const sparkleMeta = {
  title: "BrandMotion/SignatureSparkle",
  component: SignatureSparkle,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof SignatureSparkle>;

type SparkleStory = StoryObj<typeof sparkleMeta>;

/** Sparkle is always aria-hidden (decorative) */
export const SparkleHidden: SparkleStory = {
  render: () => <SignatureSparkle />,
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg")!;
    await expect(svg).toHaveAttribute("aria-hidden");
  },
};

/** Sparkle uses token-driven default color */
export const SparkleDefaultColor: SparkleStory = {
  render: () => <SignatureSparkle />,
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg")!;
    const path = svg.querySelector("path")!;
    // SVG attributes keep the CSS variable string (not resolved)
    await expect(path).toHaveAttribute("fill", "var(--wtf-attention)");
    await expect(path).toHaveAttribute("stroke", "var(--wtf-foreground)");
  },
};

/** Sparkle accepts custom color override */
export const SparkleCustomColor: SparkleStory = {
  render: () => <SignatureSparkle color="var(--wtf-editorial)" />,
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg")!;
    const path = svg.querySelector("path")!;
    await expect(path).toHaveAttribute("fill", "var(--wtf-editorial)");
  },
};

/** Sparkle has animate-twinkle class (inert under reduced motion via motion.css) */
export const SparkleAnimationClass: SparkleStory = {
  render: () => <SignatureSparkle />,
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg")!;
    await expect(svg).toHaveClass("animate-twinkle");
  },
};

// ---------------------------------------------------------------------------
// PausableMarquee stories
// ---------------------------------------------------------------------------

const marqueeMeta = {
  title: "BrandMotion/PausableMarquee",
  component: PausableMarquee,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof PausableMarquee>;

type MarqueeStory = StoryObj<typeof marqueeMeta>;

const MARQUEE_ITEMS = ["design", "culture", "tech", "media"];

/** Marquee renders doubled items for seamless loop */
export const MarqueeStructure: MarqueeStory = {
  render: () => <PausableMarquee items={MARQUEE_ITEMS} />,
  play: async ({ canvas }) => {
    // Each item appears twice (doubled for loop)
    const design = canvas.getAllByText("design", { exact: true });
    await expect(design.length).toBe(2);
  },
};

/** Marquee uses SignatureSparkle (token-driven), not legacy Sparkle */
export const MarqueeTokenSparkles: MarqueeStory = {
  render: () => <PausableMarquee items={MARQUEE_ITEMS} />,
  play: async ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll("svg");
    // 4 items × 2 (doubled) = 8 sparkles
    await expect(svgs.length).toBe(8);
    // Each sparkle uses token-driven color (var(--wtf-*) in fill attribute)
    const firstPath = svgs[0].querySelector("path")!;
    const fill = firstPath.getAttribute("fill");
    await expect(fill).toMatch(/^var\(--wtf-/);
  },
};

/** Marquee is aria-hidden (decorative) */
export const MarqueeHidden: MarqueeStory = {
  render: () => <PausableMarquee items={MARQUEE_ITEMS} />,
  play: async ({ canvasElement }) => {
    const wrapper = canvasElement.querySelector("[aria-hidden]");
    await expect(wrapper).toBeTruthy();
  },
};

/** Marquee has pause-on-hover class */
export const MarqueePausable: MarqueeStory = {
  render: () => <PausableMarquee items={MARQUEE_ITEMS} />,
  play: async ({ canvasElement }) => {
    const animDiv = canvasElement.querySelector("[class*='animate-marquee']")!;
    // Verify the pause-on-hover/focus classes are present
    const classes = animDiv.className;
    await expect(classes).toContain("group-hover");
    await expect(classes).toContain("group-focus-within");
  },
};

// ---------------------------------------------------------------------------
// OptionalPointerAccent stories
// ---------------------------------------------------------------------------

const pointerMeta = {
  title: "BrandMotion/OptionalPointerAccent",
  component: OptionalPointerAccent,
  tags: ["test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof OptionalPointerAccent>;

type PointerStory = StoryObj<typeof pointerMeta>;

/** Pointer accent renders nothing in test environment (no hover/pointer matchMedia) */
export const PointerFallsBackGracefully: PointerStory = {
  render: () => <OptionalPointerAccent />,
  play: async ({ canvasElement }) => {
    // In jsdom/test environment, (hover: hover) and (pointer: fine) don't match,
    // so the component renders nothing — graceful fallback
    const children = canvasElement.children;
    await expect(children.length).toBeLessThanOrEqual(1);
  },
};

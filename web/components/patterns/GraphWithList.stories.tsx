import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { GraphWithList } from "./GraphWithList";
import { ConnectionGraph } from "../ConnectionGraph";

/**
 * Connections Graph stories (Plan 01-14).
 *
 * Demonstrates the GraphWithList pattern wrapping ConnectionGraph
 * as the expressive canvas slot with shared selection state.
 */

const SAMPLE_NODES = [
  {
    id: "ai",
    label: "AI",
    category: "AI & Tech",
    episodeCount: 8,
    episodes: ["abc123", "def456", "ghi789"],
  },
  {
    id: "startups",
    label: "Startups",
    category: "Business",
    episodeCount: 5,
    episodes: ["abc123", "jkl012"],
  },
  {
    id: "crypto",
    label: "Crypto",
    category: "Finance",
    episodeCount: 3,
    episodes: ["def456", "mno345"],
  },
  {
    id: "health",
    label: "Health",
    category: "Health",
    episodeCount: 2,
    episodes: ["ghi789"],
  },
  {
    id: "india",
    label: "India",
    category: "Geography",
    episodeCount: 4,
    episodes: ["abc123", "pqr678"],
  },
];

const SAMPLE_EDGES = [
  { a: "ai", b: "startups", shared: 3 },
  { a: "ai", b: "crypto", shared: 2 },
  { a: "startups", b: "crypto", shared: 1 },
  { a: "ai", b: "india", shared: 2 },
  { a: "health", b: "india", shared: 1 },
];

const SAMPLE_TITLES: Record<string, string> = {
  abc123: "Episode 1: AI Revolution",
  def456: "Episode 2: Crypto Markets",
  ghi789: "Episode 3: Health Tech",
  jkl012: "Episode 4: Startup Stories",
  mno345: "Episode 5: DeFi Deep Dive",
  pqr678: "Episode 6: India Rising",
};

const meta: Meta<typeof GraphWithList> = {
  title: "Patterns/GraphWithList",
  component: GraphWithList,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof GraphWithList>;

/**
 * Default story: GraphWithList wrapping ConnectionGraph canvas.
 * Demonstrates shared selection between canvas and semantic list.
 */
function DefaultStory() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/61">
        Selected: {selectedId ?? "none"}
      </div>
      <GraphWithList
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedId={selectedId}
        onSelect={setSelectedId}
        canvas={
          <ConnectionGraph
            nodes={SAMPLE_NODES}
            edges={SAMPLE_EDGES}
            titles={SAMPLE_TITLES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        }
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

/**
 * Reduced motion story: GraphWithList with prefers-reduced-motion.
 * The canvas should render once without physics animation.
 */
function ReducedMotionStory() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/61">
        Canvas renders once (no physics) when prefers-reduced-motion is
        active.
      </div>
      <GraphWithList
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedId={selectedId}
        onSelect={setSelectedId}
        canvas={
          <ConnectionGraph
            nodes={SAMPLE_NODES}
            edges={SAMPLE_EDGES}
            titles={SAMPLE_TITLES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        }
      />
    </div>
  );
}

export const ReducedMotion: Story = {
  render: () => <ReducedMotionStory />,
  parameters: {
    // Simulate reduced-motion preference
    chromatic: { prefersReducedMotion: "reduce" },
  },
};

/**
 * Pre-selected story: GraphWithList with a node already selected.
 * Demonstrates the selection detail panel and canvas highlighting.
 */
function PreSelectedStory() {
  const [selectedId, setSelectedId] = useState<string | null>("ai");

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/61">
        Pre-selected: AI node. Orange stroke on canvas, detail panel below
        list.
      </div>
      <GraphWithList
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedId={selectedId}
        onSelect={setSelectedId}
        canvas={
          <ConnectionGraph
            nodes={SAMPLE_NODES}
            edges={SAMPLE_EDGES}
            titles={SAMPLE_TITLES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        }
      />
    </div>
  );
}

export const PreSelected: Story = {
  render: () => <PreSelectedStory />,
};

/**
 * Keyboard navigation story: GraphWithList semantic list only.
 * Demonstrates keyboard-accessible node selection without canvas.
 */
function KeyboardOnlyStory() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/61">
        Tab through nodes, press Enter/Space to select. Canvas is
        aria-hidden.
      </div>
      <GraphWithList
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        selectedId={selectedId}
        onSelect={setSelectedId}
        canvas={
          <div className="h-64 bg-ink/5 rounded-lg flex items-center justify-center text-ink/61">
            Canvas placeholder (aria-hidden)
          </div>
        }
      />
    </div>
  );
}

export const KeyboardOnly: Story = {
  render: () => <KeyboardOnlyStory />,
};

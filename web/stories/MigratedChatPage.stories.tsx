import type { Meta, StoryObj } from "storybook";
import { fn } from "storybook/test";
import { AskComposer } from "@/components/domain/public/AskComposer";
import { ConversationThread } from "@/components/domain/public/ConversationThread";
import { SourcePanel } from "@/components/domain/public/SourcePanel";

const meta: Meta = {
  title: "Domain/Public/Chat",
  tags: ["autodocs"],
};
export default meta;

/* ── AskComposer ─────────────────────────────────────────────────────── */

type ComposerStory = StoryObj;

export const EmptyComposer: ComposerStory = {
  render: () => (
    <AskComposer value="" onChange={fn()} onSubmit={fn()} loading={false} />
  ),
};

export const WithInput: ComposerStory = {
  render: () => (
    <AskComposer
      value="what is this episode about?"
      onChange={fn()}
      onSubmit={fn()}
      loading={false}
    />
  ),
};

export const LoadingComposer: ComposerStory = {
  render: () => (
    <AskComposer value="" onChange={fn()} onSubmit={fn()} loading />
  ),
};

/* ── ConversationThread ──────────────────────────────────────────────── */

type ThreadStory = StoryObj;

export const EmptyThread: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread messages={[]} loading={false} onRetry={fn()} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector("[data-evidence-empty]")) {
      throw new Error("Empty Ask WTF must explain the evidence contract");
    }
    if (canvasElement.querySelector(".extrude")) {
      throw new Error("Empty Ask WTF must not fall back to the catalogue hero");
    }
  },
};

export const LoadingThread: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread
        messages={[{ role: "user", content: "What did they say about founders?" }]}
        loading
        onRetry={fn()}
      />
    </div>
  ),
};

export const GroundedTimestampedSources: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread
        messages={[
          { role: "user", content: "What did they say about founders?" },
          {
            role: "assistant",
            content:
              "The hosts discussed how founders often underestimate the importance of timing [EP:abc123]. One guest noted that persistence matters more than raw talent [EP:def456].",
            sources: [
              {
                episodeId: "abc123",
                title: "Episode 1: The Beginning",
                url: "https://youtube.com/watch?v=abc123",
                chunk: "Founders often underestimate timing...",
                score: 0.92,
              },
              {
                episodeId: "def456",
                title: "Episode 5: Persistence",
                url: "https://youtube.com/watch?v=def456",
                chunk: "Persistence matters more than raw talent...",
                score: 0.87,
              },
            ],
          },
        ]}
        loading={false}
        onRetry={fn()}
      />
    </div>
  ),
};

export const GroundedUntimedSources: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread
        messages={[
          { role: "user", content: "Summarize the episode" },
          {
            role: "assistant",
            content: "This episode covers the basics of startup culture [EP:xyz789].",
            sources: [
              {
                episodeId: "xyz789",
                title: "Startup Culture 101",
                chunk: "Startup culture basics...",
                score: 0.78,
              },
            ],
          },
        ]}
        loading={false}
        onRetry={fn()}
      />
    </div>
  ),
};

export const AbstentionThread: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread
        messages={[
          { role: "user", content: "What is the meaning of life?" },
          {
            role: "assistant",
            content: "",
            abstained: true,
          },
        ]}
        loading={false}
        onRetry={fn()}
      />
    </div>
  ),
};

export const SafeErrorThread: ThreadStory = {
  render: () => (
    <div style={{ height: 400 }}>
      <ConversationThread
        messages={[
          { role: "user", content: "Tell me something" },
          {
            role: "assistant",
            content:
              "answer failed. retry ask.",
          },
        ]}
        loading={false}
        onRetry={fn()}
      />
    </div>
  ),
};

export const MultiTurnThread: ThreadStory = {
  render: () => (
    <div style={{ height: 500 }}>
      <ConversationThread
        messages={[
          { role: "user", content: "What did they say about founders?" },
          {
            role: "assistant",
            content: "The hosts discussed founder resilience [EP:abc123].",
            sources: [
              {
                episodeId: "abc123",
                title: "Episode 1",
                url: "https://youtube.com/watch?v=abc123",
                score: 0.9,
              },
            ],
          },
          { role: "user", content: "Can you elaborate?" },
          {
            role: "assistant",
            content:
              "Specifically, they highlighted three traits: adaptability, grit, and vision [EP:abc123] [EP:def456].",
            sources: [
              {
                episodeId: "abc123",
                title: "Episode 1",
                score: 0.85,
              },
              {
                episodeId: "def456",
                title: "Episode 5",
                score: 0.8,
              },
            ],
          },
        ]}
        loading={false}
        onRetry={fn()}
      />
    </div>
  ),
};

/* ── SourcePanel ─────────────────────────────────────────────────────── */

type SourceStory = StoryObj;

export const SingleSource: SourceStory = {
  render: () => (
    <SourcePanel
      sources={[
        {
          episodeId: "abc123",
          title: "Episode 1: The Beginning",
          url: "https://youtube.com/watch?v=abc123",
          score: 0.92,
        },
      ]}
    />
  ),
};

export const MultipleSources: SourceStory = {
  render: () => (
    <SourcePanel
      sources={[
        {
          episodeId: "abc123",
          title: "Episode 1: The Beginning",
          url: "https://youtube.com/watch?v=abc123",
          score: 0.92,
        },
        {
          episodeId: "def456",
          title: "Episode 5: Persistence",
          url: "https://youtube.com/watch?v=def456",
          score: 0.87,
        },
        {
          episodeId: "xyz789",
          title: "Startup Culture 101",
          score: 0.78,
        },
      ]}
    />
  ),
};

export const UntimedSource: SourceStory = {
  render: () => (
    <SourcePanel
      sources={[
        {
          episodeId: "xyz789",
          title: "Startup Culture 101",
          chunk: "General overview of startup culture...",
          score: 0.78,
        },
      ]}
    />
  ),
};

export const EmptySources: SourceStory = {
  render: () => <SourcePanel sources={[]} />,
};

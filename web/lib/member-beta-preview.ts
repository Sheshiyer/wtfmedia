export type MemberBetaPreviewPersona = "member-a" | "member-b";

export type MemberBetaPreviewFixture = {
  label: string;
  email: string;
  conversations: Array<{ id: string; title: string; updatedAt: string; excerpt: string }>;
  memories: Array<{ id: string; content: string }>;
};

export const memberBetaPreviewFixtures: Record<MemberBetaPreviewPersona, MemberBetaPreviewFixture> = {
  "member-a": {
    label: "Member A",
    email: "member-a@example.test",
    conversations: [
      {
        id: "preview-a-catalogue",
        title: "How does the catalogue approach research?",
        updatedAt: "Today · 10:24",
        excerpt: "A source-backed answer with its own conversation history.",
      },
      {
        id: "preview-a-ideas",
        title: "Recurring ideas across conversations",
        updatedAt: "Yesterday · 16:08",
        excerpt: "A second private session belongs to this fixture member only.",
      },
    ],
    memories: [
      { id: "preview-a-memory-focus", content: "Prefer concise evidence summaries before deeper context." },
      { id: "preview-a-memory-format", content: "Keep source links grouped at the end of an answer." },
    ],
  },
  "member-b": {
    label: "Member B",
    email: "member-b@example.test",
    conversations: [
      {
        id: "preview-b-production",
        title: "What makes a product launch durable?",
        updatedAt: "Today · 09:41",
        excerpt: "This separate session is never listed for Member A.",
      },
    ],
    memories: [
      { id: "preview-b-memory-topic", content: "Track themes about long-term company building." },
    ],
  },
};

export function isMemberBetaPreviewHost(host: string | null): boolean {
  return Boolean(host && host.toLowerCase().endsWith(".connect2nikhai.workers.dev"));
}

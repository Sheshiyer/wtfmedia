import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const conversationThread = readFileSync(
  new URL("../../components/domain/public/ConversationThread.tsx", import.meta.url),
  "utf8",
);

describe("shared Alpha conversation frame", () => {
  it("exports a typed frame that gives other surfaces Alpha's overflow-aware composer placement", () => {
    expect(conversationThread).toContain("export type ConversationComposerPlacement = \"fixed\" | \"inline\"");
    expect(conversationThread).toContain("export interface ConversationThreadFrameProps");
    expect(conversationThread).toContain("export function ConversationThreadFrame");
    expect(conversationThread).toContain("renderFooter?: (placement: ConversationComposerPlacement) => ReactNode");
    expect(conversationThread).toContain('data-composer-placement={isOverflowing ? "inline" : "fixed"}');
  });
});

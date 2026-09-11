"use client";

import { BetaChatWorkspace } from "./BetaChatWorkspace";

export function BetaConversationRoute({ conversationId }: { conversationId: string }) {
  return <BetaChatWorkspace conversationId={conversationId} />;
}

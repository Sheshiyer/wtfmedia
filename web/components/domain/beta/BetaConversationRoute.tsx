"use client";

import { ChatWorkspace } from "@/app/(operator)/ops/chat/ChatWorkspace";
import { MemberChatWorkspace } from "@/components/domain/member/MemberChatWorkspace";
import { useBetaPrincipal } from "./BetaPrincipalGate";

export function BetaConversationRoute({ conversationId }: { conversationId: string }) {
  const principal = useBetaPrincipal();
  return principal.kind === "member"
    ? <MemberChatWorkspace conversationId={conversationId} />
    : <ChatWorkspace view="conversation" conversationId={conversationId} />;
}

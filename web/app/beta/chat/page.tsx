"use client";

import { ChatWorkspace } from "@/app/(operator)/ops/chat/ChatWorkspace";
import { MemberChatWorkspace } from "@/components/domain/member/MemberChatWorkspace";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";

export default function BetaChatPage() {
  const principal = useBetaPrincipal();
  return principal.kind === "member" ? <MemberChatWorkspace /> : <ChatWorkspace view="history" />;
}

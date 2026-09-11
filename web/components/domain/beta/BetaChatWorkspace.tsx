"use client";

import { useMemo } from "react";
import { MemberChatWorkspace } from "@/components/domain/member/MemberChatWorkspace";
import { createMemberChatAdapter, createOperatorChatAdapter } from "./BetaChatAdapter";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";

/**
 * One Alpha-shaped authenticated chat surface. The principal gate selects the
 * transport only; persistence IDs and server routes remain role-specific.
 */
export function BetaChatWorkspace({ conversationId }: { conversationId?: string }) {
  const principal = useBetaPrincipal();
  const fetcher = useMemberFetch();
  const adapter = useMemo(
    () => principal.kind === "operator"
      ? createOperatorChatAdapter(fetcher)
      : createMemberChatAdapter(fetcher),
    [fetcher, principal.kind],
  );
  return <MemberChatWorkspace conversationId={conversationId} adapter={adapter} />;
}

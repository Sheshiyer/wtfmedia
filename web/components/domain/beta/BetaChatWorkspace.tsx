"use client";

import { useMemo } from "react";
import { MemberChatWorkspace } from "@/components/domain/member/MemberChatWorkspace";
import { createMemberChatAdapter } from "./BetaChatAdapter";
import { useMemberFetch } from "./BetaPrincipalGate";

/** One chat surface, one transport: every principal uses the beta chat API. */
export function BetaChatWorkspace({ conversationId }: { conversationId?: string }) {
  const fetcher = useMemberFetch();
  const adapter = useMemo(() => createMemberChatAdapter(fetcher), [fetcher]);
  return <MemberChatWorkspace conversationId={conversationId} adapter={adapter} />;
}

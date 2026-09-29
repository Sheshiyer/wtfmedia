import { redirect } from "next/navigation";
import { legacyAuthenticatedChatConversationId } from "@/lib/ops/chat-route";

export const dynamic = "force-dynamic";

export default async function LegacyChatConversationRedirect({ params }: { params: Promise<{ conversationSlug: string }> }) {
  const { conversationSlug } = await params;
  const conversationId = legacyAuthenticatedChatConversationId(`/chat/${conversationSlug}`);
  redirect(conversationId ? `/beta/chat/${encodeURIComponent(conversationId)}` : "/chat");
}

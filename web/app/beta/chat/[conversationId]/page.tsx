import { BetaConversationRoute } from "@/components/domain/beta/BetaConversationRoute";

export default async function BetaConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <BetaConversationRoute conversationId={conversationId} />;
}

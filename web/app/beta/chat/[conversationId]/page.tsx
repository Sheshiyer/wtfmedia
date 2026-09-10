import { MemberChatWorkspace } from "@/components/domain/member/MemberChatWorkspace";

export default async function MemberConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <MemberChatWorkspace conversationId={conversationId} />;
}

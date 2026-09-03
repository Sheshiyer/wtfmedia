import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { getVerifiedOpsContext } from "@/lib/ops/context";
import { authenticatedChatReleaseEnabled, canAccessOpsPath } from "@/lib/ops/policy";
import { ChatUnavailableState } from "@/app/(operator)/ops/chat/ChatUnavailableState";
import { ChatWorkspace } from "@/app/(operator)/ops/chat/ChatWorkspace";

export const dynamic = "force-dynamic";

function conversationIdFromSlug(value: string): string | null {
  const separator = value.lastIndexOf("-");
  if (separator <= 0 || separator === value.length - 1) return null;
  const conversationId = value.slice(0, separator);
  const username = value.slice(separator + 1);
  return /^[A-Za-z0-9_-]+$/.test(conversationId) && /^[a-z0-9][a-z0-9_-]*$/.test(username) ? conversationId : null;
}

export default async function AuthenticatedChatConversationPage({ params }: { params: Promise<{ conversationSlug: string }> }) {
  const { conversationSlug } = await params;
  const conversationId = conversationIdFromSlug(conversationSlug);
  const context = await getVerifiedOpsContext();
  const authorized = Boolean(context && conversationId && canAccessOpsPath(context.role, "/ops/chat"));
  const enabled = context?.environment !== "local" || authenticatedChatReleaseEnabled();
  const content = !authorized
    ? <ChatUnavailableState reason="unauthorized" />
    : !enabled
      ? <ChatUnavailableState reason="feature-off" />
      : <ChatWorkspace view="conversation" conversationId={conversationId ?? undefined} />;

  return (
    <div id="ops-main" data-authenticated-chat-deep-link="true">
      <WorkspaceHeader
        size="page"
        eyebrow="operator conversation"
        title="authenticated ask wtf"
        summary="the URL slug is a navigation identifier. server-resolved Access identity owns the conversation."
        accent="knowledge"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">{content}</div>
    </div>
  );
}

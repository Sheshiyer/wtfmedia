import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { getVerifiedOpsContext } from "@/lib/ops/context";
import { authenticatedChatReleaseEnabled, canAccessOpsPath } from "@/lib/ops/policy";
import { ChatUnavailableState } from "./ChatUnavailableState";
import { ChatWorkspace } from "./ChatWorkspace";

export const dynamic = "force-dynamic";

export default async function OperatorChatHistoryPage() {
  const context = await getVerifiedOpsContext();
  // Preserve the deterministic local shell test; staging and production are
  // gated by the protected edge/API, never this environment seam.
  const locallyEnabled = context?.environment !== "local" || authenticatedChatReleaseEnabled();
  const authorized = Boolean(context && canAccessOpsPath(context.role, "/ops/chat"));
  const content = !locallyEnabled
    ? <ChatUnavailableState reason="feature-off" />
    : !authorized
    ? <ChatUnavailableState reason="unauthorized" />
    : <ChatWorkspace view="history" />;

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="operator history"
        title="authenticated ask wtf"
        summary="durable operator conversations stay behind server authorization. browser cache is a convenience, never an authority."
        accent="knowledge"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">{content}</div>
    </div>
  );
}

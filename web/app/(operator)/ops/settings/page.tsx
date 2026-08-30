import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/domain/ops/SettingsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function SettingsPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/settings")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="release and connection record"
        title="settings"
        summary="inspect local preferences and held integration states. no provider, client, or release configuration is changed here."
        accent="knowledge"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><SettingsWorkspace /></div>
    </div>
  );
}

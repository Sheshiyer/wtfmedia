import { redirect } from "next/navigation";
import { AuditWorkspace } from "@/components/domain/ops/AuditWorkspace";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function AuditPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/audit")) redirect("/ops/recover?mode=reauthenticate");
  return <main id="ops-main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><p className="text-label">recorded evidence</p><h1 className="mt-3 font-display text-4xl lowercase">audit</h1><p className="mt-4 max-w-2xl text-lg">review only allowlisted administrative evidence.</p><AuditWorkspace /></main>;
}

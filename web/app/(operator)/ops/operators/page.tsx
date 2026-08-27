import { redirect } from "next/navigation";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";
import { OperatorsWorkspace } from "@/components/domain/ops/OperatorsWorkspace";

export default async function OperatorsPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/operators")) redirect("/ops/recover?mode=reauthenticate");
  return <div id="ops-main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><p className="text-label">access boundary</p><h1 className="mt-3 font-display text-4xl lowercase">operators</h1><p className="mt-4 max-w-2xl text-lg">manage approved operator access through the protected operator service.</p><OperatorsWorkspace role={context.role} /></div>;
}

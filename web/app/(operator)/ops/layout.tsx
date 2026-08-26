import { redirect } from "next/navigation";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { operatorContextDto } from "@/lib/ops/dto";
import { activatedOpsNavigation } from "@/lib/ops/policy";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";
import { OperatorContextStrip } from "@/components/domain/ops/OperatorContextStrip";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  try {
    const context = await requireVerifiedOpsContext();
    const dto = operatorContextDto(context);
    return <OperatorContextProvider value={dto}><OperatorShell nav={activatedOpsNavigation(context.role)}><OperatorContextStrip context={dto} />{children}</OperatorShell></OperatorContextProvider>;
  } catch {
    redirect("/ops/recover?mode=reauthenticate");
  }
}

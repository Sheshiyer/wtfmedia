import { getVerifiedOpsContext } from "@/lib/ops/context";
import { operatorContextDto, ungatedReleaseContextDto } from "@/lib/ops/dto";
import { currentReleaseNavigation } from "@/lib/public/current-release-nav";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const verified = await getVerifiedOpsContext();
  const dto = verified ? operatorContextDto(verified) : ungatedReleaseContextDto();
  const nav = currentReleaseNavigation.map((item) => ({
    label: item.label,
    href: item.href,
    section: item.section,
  }));
  return (
    <OperatorContextProvider value={dto}>
      <OperatorShell nav={nav}>
        {children}
      </OperatorShell>
    </OperatorContextProvider>
  );
}

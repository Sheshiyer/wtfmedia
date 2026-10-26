import { getVerifiedOpsContext } from "@/lib/ops/context";
import { operatorContextDto, opsEnvironmentForHost, ungatedReleaseContextDto } from "@/lib/ops/dto";
import { currentReleaseNavigation } from "@/lib/public/current-release-nav";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const verified = await getVerifiedOpsContext();
  const requestHeaders = await headers();
  const dto = verified ? operatorContextDto(verified) : ungatedReleaseContextDto(opsEnvironmentForHost(requestHeaders.get("host")));
  const nav = currentReleaseNavigation.map((item) => ({
    label: item.label,
    href: item.href === "/beta/workspace/production" && process.env.NODE_ENV === "development" && process.env.WTF_PRODUCTION_LOCAL_PREVIEW === "1"
      ? "/ops/production"
      : item.href,
    section: item.section,
  }));
  return (
    <OperatorContextProvider value={dto}>
      <OperatorShell
        nav={nav}
      >
        {children}
      </OperatorShell>
    </OperatorContextProvider>
  );
}

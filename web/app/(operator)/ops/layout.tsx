import { getVerifiedOpsContext } from "@/lib/ops/context";
import { operatorContextDto, ungatedReleaseContextDto } from "@/lib/ops/dto";
import { currentReleaseNavigation } from "@/lib/public/current-release-nav";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";
import { accessLogoutUrl } from "@/lib/ops/return-to";

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
      <OperatorShell
        nav={nav}
        utility={verified ? (
          <a
            href={accessLogoutUrl("/")}
            data-operator-logout
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-foreground bg-surface-subtle px-3 py-2 font-label text-xs font-bold lowercase tracking-wide text-foreground transition-colors hover:bg-attention hover:text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-sm"
          >
            log out to public alpha
          </a>
        ) : undefined}
      >
        {children}
      </OperatorShell>
    </OperatorContextProvider>
  );
}

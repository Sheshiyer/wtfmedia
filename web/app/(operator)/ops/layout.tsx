import { getVerifiedOpsContext } from "@/lib/ops/context";
import { operatorContextDto, opsEnvironmentForHost, ungatedReleaseContextDto } from "@/lib/ops/dto";
import { currentReleaseNavigation } from "@/lib/public/current-release-nav";
import { OperatorShell } from "@/components/domain/ops/OperatorShell";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";
import { accessLogoutUrl } from "@/lib/ops/return-to";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function ProtectedOpsBoundary({ environment }: { environment: "staging" | "production" }) {
  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="protected operator surface"
        title="access required"
        summary="Cloudflare Access must establish a verified operator context before this route can render."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <section
          className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
          aria-labelledby="ops-access-required-title"
          data-ops-access-required
          data-ops-environment={environment}
        >
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            verified context unavailable
          </p>
          <h2 id="ops-access-required-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            this operator route is protected
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            The public workspace remains available. Return there and use the configured Access entry point to continue.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-[var(--wtf-radius-control)] border-2 border-foreground bg-surface-raised px-4 py-2 font-label text-sm font-bold tracking-wide text-foreground transition-[transform,box-shadow] duration-fast ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            return to public workspace
          </Link>
        </section>
      </div>
    </div>
  );
}

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const verified = await getVerifiedOpsContext();
  const requestHeaders = await headers();
  const environment = opsEnvironmentForHost(requestHeaders.get("host"));
  const trusted = verified?.environment === environment ? verified : null;
  if (!trusted && environment !== "local") {
    return (
      <OperatorShell nav={[]}>
        <ProtectedOpsBoundary environment={environment} />
      </OperatorShell>
    );
  }

  const dto = trusted ? operatorContextDto(trusted) : ungatedReleaseContextDto(environment);
  const nav = currentReleaseNavigation.map((item) => ({
    label: item.label,
    href: item.href,
    section: item.section,
  }));
  return (
    <OperatorContextProvider value={dto}>
      <OperatorShell
        nav={nav}
        utility={trusted ? (
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

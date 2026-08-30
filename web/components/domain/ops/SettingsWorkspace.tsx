import Link from "next/link";
import { StatusLedger, type StatusLedgerItem } from "@/components/patterns/StatusLedger";
import { AppearanceControl } from "@/components/shells/AppearanceControl";
import { data } from "@/lib/episodes";

const connections = [
  { name: "hosted MCP", detail: "requires an owner-approved endpoint and server-side verification record." },
  { name: "analytics provider", detail: "requires OAuth scope, revocation ownership, and an audited projection." },
  { name: "external calendar provider", detail: "target D1 is active, while provider sync, OAuth, and external calendar administration remain held." },
] as const;

const setupTemplates = [
  { name: "Codex", detail: "copy-only client setup is awaiting an owner-approved host." },
  { name: "Cursor", detail: "copy-only client setup is awaiting an owner-approved host." },
] as const;

const workspaceItems: readonly StatusLedgerItem[] = [
  {
    label: "episodes",
    state: "active",
    detail: "browse the current public episode projection and open its source material.",
    href: "/episodes",
  },
  {
    label: "connections",
    state: "active",
    detail: "inspect recurring themes and ideas across the published conversations.",
    href: "/connections",
  },
  {
    label: "ask wtf",
    state: "active",
    detail: "ask the catalogue and keep quoted evidence beside the answer.",
    href: "/chat",
  },
  {
    label: "production",
    state: "active",
    detail: "open the shared target D1 production calendar and board; list, create, and update are active while delete is unavailable.",
    href: "/production",
  },
  {
    label: "analytics",
    state: "not-activated",
    detail: "platform reporting is not activated; no performance values are inferred.",
  },
  {
    label: "people",
    state: "not-activated",
    detail: "guest and relationship operations are not activated in this release.",
  },
  {
    label: "integrations",
    state: "not-activated",
    detail: "integration health is not observed from the public application.",
  },
];

type SettingsDisclosureProps = {
  testId: string;
  eyebrow: string;
  title: string;
  meta: string;
  children: React.ReactNode;
};

function SettingsDisclosure({ testId, eyebrow, title, meta, children }: SettingsDisclosureProps) {
  const headingId = `${testId}-heading`;

  return (
    <details data-testid={testId} className="group border-2 border-foreground bg-surface-raised">
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-information [&::-webkit-details-marker]:hidden sm:px-6">
        <div className="min-w-0">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
          <h2 id={headingId} className="mt-1 font-heading text-2xl font-bold lowercase">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden border-2 border-foreground/35 bg-surface-subtle px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary sm:inline-flex">
            {meta}
          </span>
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center border-2 border-foreground font-heading text-2xl leading-none">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </div>
      </summary>
      <div aria-labelledby={headingId} className="border-t-2 border-foreground bg-canvas p-4 sm:p-6">
        {children}
      </div>
    </details>
  );
}

function StateCard({ title, detail, state = "not configured" }: { title: string; detail: string; state?: string }) {
  return (
    <article className="border-2 border-foreground bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-heading text-xl font-bold lowercase">{title}</h3>
        <span className="border-2 border-foreground/40 bg-surface-subtle px-2 py-1 font-label text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">
          {state}
        </span>
      </div>
      <p className="mt-4 max-w-[54ch] font-body text-sm leading-relaxed text-secondary">{detail}</p>
    </article>
  );
}

export function SettingsWorkspace() {
  const episodeCount = data.entry_count;

  return (
    <div className="space-y-3">
      <SettingsDisclosure testId="settings-workspace-state" eyebrow="now / next" title="workspace state" meta="4 active · 3 held">
        <p className="mb-5 max-w-[65ch] font-body text-sm leading-relaxed text-secondary">
          Current public workspaces and held capabilities. Active means the local UI route is available; it does not imply a connected provider, production record, or release authorization.
        </p>
        <StatusLedger title="workspace state" items={workspaceItems} className="bg-surface-raised" />
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-evidence-receipt" eyebrow="source discipline" title="evidence receipt" meta={`${episodeCount} episodes`}>
        <div className="border-2 border-foreground bg-surface-structure p-5 text-on-structure sm:p-6">
          <h3 className="font-display text-3xl font-extrabold lowercase leading-none sm:text-4xl">receipts become actions.</h3>
          <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-on-structure/70">
            Ask WTF keeps source episodes beside the answer. A timestamp appears only when the underlying source timing is verified; an unknown stays unknown.
          </p>
          <dl className="mt-6 divide-y divide-foreground/20 border-y border-foreground/20 font-label text-sm">
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-on-structure/55">catalogue scope</dt><dd className="font-bold">{episodeCount} episodes</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-on-structure/55">answer mode</dt><dd className="font-bold">source-backed</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-on-structure/55">missing evidence</dt><dd className="font-bold">shown plainly</dd></div>
          </dl>
          <Link href="/connections" className="mt-5 inline-flex min-h-11 items-center border-b-2 border-attention font-label text-sm font-bold lowercase text-on-structure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">
            inspect recurring ideas ↗
          </Link>
        </div>
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-appearance" eyebrow="personal workspace" title="appearance" meta="browser local">
        <p className="max-w-[60ch] font-body text-sm leading-relaxed text-secondary">This preference changes only this browser’s visual presentation. It does not change a provider, account, role, or application configuration.</p>
        <div className="mt-5 max-w-sm"><AppearanceControl context="surface" /></div>
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-agentic-connections" eyebrow="observed connections" title="agentic connections" meta="3 held">
        <p className="max-w-[65ch] font-body text-body text-secondary">A card says connected only after a recent server-side verification. These integrations are not configured in this release.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">{connections.map((connection) => <StateCard key={connection.name} title={connection.name} detail={connection.detail} />)}</div>
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-client-setup" eyebrow="local clients" title="client setup" meta="2 templates">
        <p className="max-w-[65ch] font-body text-body text-secondary">Setup panels are documentation only. They do not execute commands or apply client configuration.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{setupTemplates.map((template) => <StateCard key={template.name} title={template.name} detail={template.detail} state="awaiting approval" />)}</div>
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-release-history" eyebrow="release record" title="release and history" meta="v0.1.3 · target preview">
        <p className="max-w-[60ch] font-body text-body text-secondary">Target Cloudflare preview snapshot — workers.dev only; no custom-domain cutover or signed production release.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <StateCard title="v0.1.3" detail="Package version deployed to target preview Workers; custom domain, approver, signed manifest, and rollback cutover are not active." state="target preview" />
          <section aria-labelledby="settings-changelog-heading" className="border-2 border-foreground bg-surface-raised p-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">local change record</p>
            <h3 id="settings-changelog-heading" className="mt-1 font-heading text-xl font-bold lowercase">changelog</h3>
            <ul className="mt-4 space-y-3 border-t-2 border-foreground/15 pt-4 font-body text-sm leading-relaxed text-secondary">
              <li>Settings consolidates workspace state and evidence receipts into compact, closed-by-default sections.</li>
              <li>Connections lists reveal the complete public atlas only when requested.</li>
              <li>Production calendar and board now use shared target D1 records; edits are anonymous and delete remains unavailable.</li>
            </ul>
          </section>
        </div>
      </SettingsDisclosure>

      <SettingsDisclosure testId="settings-ota" eyebrow="future delivery" title="over-the-air updates" meta="not supported">
        <StateCard title="native OTA" detail="Signed manifests, compatibility, staged cohorts, and rollback evidence are required before OTA can be activated." state="not supported" />
      </SettingsDisclosure>
    </div>
  );
}

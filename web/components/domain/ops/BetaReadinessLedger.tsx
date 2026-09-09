import Link from "next/link";

type ReadinessTone = "attention" | "information" | "held";

type ReadinessItem = {
  label: string;
  status: string;
  detail: string;
  tone: ReadinessTone;
  href?: string;
  action?: string;
};

const readinessItems: readonly ReadinessItem[] = [
  {
    label: "Clerk widget",
    status: "live receipt required",
    detail: "The repository renders the Clerk path when its publishable key is present. The deployed staging host must prove that widget before account testing.",
    tone: "attention",
    href: "/sign-in",
    action: "open sign-in path",
  },
  {
    label: "Clerk → D1 mapping",
    status: "source contract ready",
    detail: "The edge verifies issuer, JWKS, and authorized party, then resolves normalized email to an active D1 operator role. A live roster readback is still required.",
    tone: "information",
    href: "/ops/operators",
    action: "open roster boundary",
  },
  {
    label: "session + recovery",
    status: "live receipt required",
    detail: "720 hours and MFA precedence are policy targets. Expiry, sign-out, revocation, and reauthentication remain interactive staging checks.",
    tone: "attention",
    href: "/ops/recover",
    action: "open recovery state",
  },
  {
    label: "account history",
    status: "local contract ready",
    detail: "Owner-scoped D1 conversations, source metadata, archive-only lifecycle, and protected deep links exist locally. Staging D1 migration and persistence remain unreceipted.",
    tone: "information",
    href: "/ops/chat",
    action: "open history workspace",
  },
  {
    label: "cross-chat memory",
    status: "explicit save active",
    detail: "Owner-scoped saved memory now has a bounded D1 store, optional conversation provenance, server-side context injection, and reversible archive. Automatic extraction remains disabled.",
    tone: "information",
    href: "/ops/settings/memory",
    action: "review memory boundary",
  },
  {
    label: "AI route policy",
    status: "local contract ready",
    detail: "Global model and fallback editing is present locally. Provider verification and credential custody remain server-gated.",
    tone: "information",
    href: "/ops/settings/ai",
    action: "open AI route settings",
  },
  {
    label: "YouTube Analytics",
    status: "mock preview",
    detail: "The read-only dashboard composition is available as fixture data. OAuth, observation freshness, and account scope are not connected.",
    tone: "held",
    href: "/ops/settings/analytics",
    action: "open analytics settings",
  },
] as const;

const toneClass: Record<ReadinessTone, string> = {
  attention: "border-attention bg-attention text-on-attention",
  information: "border-information bg-information text-on-information",
  held: "border-foreground/40 bg-surface-subtle text-secondary",
};

export function BetaReadinessLedger() {
  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="beta-readiness-title"
      data-beta-readiness-ledger
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            release evidence
          </p>
          <h2 id="beta-readiness-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            beta readiness ledger
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
            Repository contracts and live receipts stay separate. These links expose the intended surface without treating a browser state, local flag, or static panel as authority.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-foreground/40 bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
          activation held
        </span>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-2" aria-label="beta readiness gates">
        {readinessItems.map((item, index) => (
          <li key={item.label} className="border-2 border-foreground bg-canvas p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className="font-label text-xs font-bold text-muted">0{index + 1}</span>
                <div>
                  <h3 className="font-heading text-xl font-bold lowercase text-foreground">{item.label}</h3>
                  <p className={`mt-2 inline-flex rounded-control border-2 px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${toneClass[item.tone]}`}>
                    {item.status}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-secondary">{item.detail}</p>
            {item.href && item.action ? (
              <Link
                href={item.href}
                className="mt-4 inline-flex min-h-11 items-center border-b-2 border-attention font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
              >
                {item.action}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

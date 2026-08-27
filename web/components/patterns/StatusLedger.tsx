import Link from "next/link";

export type WorkspaceState =
  | "active"
  | "verified"
  | "unknown"
  | "unavailable"
  | "access-restricted"
  | "not-activated"
  | "stale";

export type StatusLedgerItem = {
  label: string;
  state: WorkspaceState;
  detail: string;
  href?: string;
  observed?: string;
};

export type StatusLedgerProps = {
  title: string;
  eyebrow?: string;
  items: readonly StatusLedgerItem[];
  className?: string;
};

const stateCopy: Record<WorkspaceState, string> = {
  active: "active",
  verified: "verified",
  unknown: "unknown",
  unavailable: "unavailable",
  "access-restricted": "access restricted",
  "not-activated": "not activated",
  stale: "stale",
};

const stateStyle: Record<WorkspaceState, string> = {
  active: "bg-attention text-foreground",
  verified: "border-live bg-canvas text-foreground",
  unknown: "border-foreground/40 bg-surface-subtle text-foreground",
  unavailable: "border-editorial bg-canvas text-foreground",
  "access-restricted": "border-foreground bg-foreground text-canvas",
  "not-activated": "border-foreground/30 bg-surface-subtle text-foreground/70",
  stale: "border-information bg-canvas text-foreground",
};

export function StatusLedger({
  title,
  eyebrow,
  items,
  className = "",
}: StatusLedgerProps) {
  return (
    <section
      aria-labelledby={`${title.replaceAll(" ", "-")}-title`}
      className={`border-2 border-foreground bg-surface-raised ${className}`}
    >
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground px-4 py-4 sm:px-6">
        <div>
          {eyebrow && (
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">
              {eyebrow}
            </p>
          )}
          <h2
            id={`${title.replaceAll(" ", "-")}-title`}
            className="mt-1 font-heading text-2xl font-bold lowercase"
          >
            {title}
          </h2>
        </div>
        <span className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/50">
          {items.length} systems
        </span>
      </div>

      <ul className="divide-y-2 divide-foreground">
        {items.map((item) => {
          const content = (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 border-2 border-current bg-current"
                />
                <strong className="font-heading text-lg lowercase">
                  {item.label}
                </strong>
              </div>
              <span
                className={`w-fit border-2 px-2 py-1 font-label text-[11px] font-bold uppercase tracking-[0.1em] ${stateStyle[item.state]}`}
              >
                {stateCopy[item.state]}
              </span>
              <p className="font-body text-sm leading-relaxed text-foreground/70">
                {item.detail}
              </p>
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50">
                {item.observed ?? (item.href ? "open workspace ↗" : "no action")}
              </span>
            </>
          );
          const rowClass =
            "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(9rem,1fr)_9.5rem_minmax(12rem,1.6fr)_8.5rem] sm:items-center sm:px-6";
          const isInteractive = Boolean(item.href) && item.state !== "not-activated";

          return (
            <li key={item.label}>
              {isInteractive ? (
                <Link
                  href={item.href!}
                  data-state={item.state}
                  className={`${rowClass} transition-colors duration-fast hover:bg-attention/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-information`}
                >
                  {content}
                </Link>
              ) : (
                <div data-state={item.state} className={rowClass}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

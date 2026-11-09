import type { OperatorContextDto } from "@/lib/ops/dto";
import { formatOpsRole, formatVerifiedTime } from "@/lib/ops/display";

function Field({
  label,
  value,
  unknown = false,
  tabular = false,
}: {
  label: string;
  value: string;
  unknown?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt
        role="term"
        className="font-label text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </dt>
      <dd role="definition" className="mt-1">
        {unknown ? (
          <span className="inline-flex min-h-7 max-w-full items-center border-2 border-foreground/40 bg-surface-raised px-1.5 font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
            {value}
          </span>
        ) : (
          <span
            className={[
              "break-words font-body text-[12px] font-semibold lowercase leading-[1.35] text-foreground",
              tabular ? "tabular-nums" : "",
            ].join(" ")}
          >
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

export function OperatorContextStrip({ context }: { context: OperatorContextDto }) {
  const organizationUnknown = context.organizationScope === "unknown";

  return (
    <section
      data-ops-context-strip
      aria-labelledby="operator-context-title"
      className="rounded-control border-2 border-foreground bg-surface-subtle p-3 shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.12)]"
    >
      <div className="flex items-start justify-between gap-2 border-b border-foreground/20 pb-3">
        <div className="min-w-0">
          <p className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-muted">request context</p>
          <h2 id="operator-context-title" className="mt-1 font-heading text-base font-bold lowercase text-foreground">operator readback</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/30 bg-surface-raised px-2 py-1 font-label text-[9px] font-bold uppercase tracking-[0.1em] text-secondary">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-live" />
          scoped
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
        <Field label="environment" value={context.environment} />
        <Field label="workspace" value={context.workspace} />
        <Field
          label="organization scope"
          value={organizationUnknown ? "unknown" : context.organizationScope}
          unknown={organizationUnknown}
        />
        <Field label="effective role" value={formatOpsRole(context.role)} />
        <Field
          label="last verified"
          value={formatVerifiedTime(context.lastVerifiedAt)}
          tabular
        />
      </dl>
    </section>
  );
}

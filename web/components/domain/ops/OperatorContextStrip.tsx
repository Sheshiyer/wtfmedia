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
    <div className="min-w-0 sm:border-l-2 sm:border-foreground/15 sm:px-5 sm:first:border-l-0 sm:first:pl-0">
      <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="mt-1">
        {unknown ? (
          <span className="inline-flex min-h-7 items-center border-2 border-foreground/40 bg-surface-subtle px-2 font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
            {value}
          </span>
        ) : (
          <span
            className={[
              "break-words font-body text-[13px] font-semibold lowercase leading-[1.45] text-foreground",
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
    <dl
      data-ops-context-strip
      aria-label="verified operator context"
      className="border-b-2 border-foreground bg-canvas"
    >
      <div className="mx-auto flex max-w-[var(--wtf-content-max)] flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-y-3 sm:px-8 xl:px-12">
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
      </div>
    </dl>
  );
}

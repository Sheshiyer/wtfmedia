export type AuditLedgerRow = {
  timestamp: string;
  subject: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
  environment: string;
  correlationId: string;
};

const panel =
  "mt-8 border-2 border-foreground bg-surface-raised p-5 rounded-panel";

export function AuditLedger({
  rows,
  state,
}: {
  rows: readonly AuditLedgerRow[];
  state: "loading" | "ready" | "unavailable" | "measured-zero";
}) {
  if (state === "loading") {
    return (
      <section className={panel} aria-live="polite">
        checking audit records…
      </section>
    );
  }

  if (state === "unavailable") {
    return (
      <section className={panel}>
        <h2 className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
          audit records are unavailable right now
        </h2>
        <p className="mt-3 font-body text-body">no audit details were loaded.</p>
        <a
          href="/ops/audit"
          className="mt-5 inline-flex min-h-11 items-center border-2 border-foreground px-4 py-3 font-label text-sm font-bold"
        >
          retry
        </a>
      </section>
    );
  }

  if (state === "measured-zero") {
    return (
      <section className={panel}>
        <h2 className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
          no audit records match these filters
        </h2>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-labelledby="audit-ledger-title">
      <h2
        id="audit-ledger-title"
        className="font-heading text-[23px] font-bold lowercase leading-[1.2]"
      >
        audit ledger
      </h2>
      <div className="mt-4 hidden overflow-hidden rounded-panel border-2 border-foreground md:block">
        <table className="w-full text-left font-body text-[13px] leading-[1.45]">
          <thead className="bg-surface-subtle font-label text-[11px] font-semibold uppercase tracking-[0.08em]">
            <tr>
              {["timestamp", "subject", "role", "action", "entity", "outcome", "environment", "correlation"].map(
                (label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.correlationId}-${row.timestamp}`} className="border-t-2 border-foreground">
                <td className="p-3 tabular-nums">{row.timestamp}</td>
                <td className="p-3">{row.subject}</td>
                <td className="p-3">{row.role}</td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.entityType}:{row.entityId}</td>
                <td className="p-3">{row.outcome}</td>
                <td className="p-3">{row.environment}</td>
                <td className="p-3 font-mono text-xs">{row.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={`${row.correlationId}-${row.timestamp}`}
            className="rounded-panel border-2 border-foreground bg-surface-raised p-4"
          >
            <dl className="grid gap-2 font-body text-[13px] leading-[1.45]">
              {(
                [
                  ["timestamp", row.timestamp],
                  ["subject", row.subject],
                  ["effective role", row.role],
                  ["action", row.action],
                  ["entity", `${row.entityType}:${row.entityId}`],
                  ["outcome", row.outcome],
                  ["environment", row.environment],
                  ["correlation ID", row.correlationId],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                    {label}
                  </dt>
                  <dd
                    className={
                      label === "correlation ID"
                        ? "mt-1 font-mono text-xs"
                        : label === "timestamp"
                          ? "mt-1 tabular-nums"
                          : "mt-1"
                    }
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

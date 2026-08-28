export type OperatorRosterRow = {
  name: string;
  email: string;
  role: "admin" | "editor" | "super_admin";
  active: boolean;
  changedAt: string | null;
};

const panel =
  "border-2 border-foreground bg-surface-raised p-5 rounded-panel";

function AccessChip({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex min-h-8 items-center border-2 px-2 font-label text-[11px] font-semibold uppercase tracking-[0.08em]",
        active
          ? "border-live bg-canvas text-foreground"
          : "border-foreground/40 bg-surface-subtle text-muted",
      ].join(" ")}
    >
      {active ? "active" : "inactive"}
    </span>
  );
}

export function OperatorRoster({
  rows,
  state = "ready",
}: {
  rows: readonly OperatorRosterRow[];
  state?: "loading" | "ready" | "unavailable" | "measured-zero";
}) {
  if (state === "loading") {
    return (
      <section aria-labelledby="operator-roster-title" className={panel}>
        <h2 id="operator-roster-title" className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
          operator roster
        </h2>
        <p className="mt-3 font-body text-body">checking the protected operator service…</p>
      </section>
    );
  }

  if (state === "unavailable") {
    return (
      <section aria-labelledby="operator-roster-title" className={panel}>
        <h2 id="operator-roster-title" className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
          operator roster unavailable
        </h2>
        <p className="mt-3 font-body text-body">
          operator records are unavailable right now. no roster details were loaded.
        </p>
        <a
          href="/ops/operators"
          className="mt-5 inline-flex min-h-11 items-center border-2 border-foreground px-4 py-3 font-label text-sm font-bold"
        >
          retry
        </a>
      </section>
    );
  }

  if (state === "measured-zero") {
    return (
      <section aria-labelledby="operator-roster-title" className={panel}>
        <h2 id="operator-roster-title" className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
          operator roster
        </h2>
        <p className="mt-3 font-body text-body">no operators match this recorded view.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="operator-roster-title">
      <h2 id="operator-roster-title" className="font-heading text-[23px] font-bold lowercase leading-[1.2]">
        operator roster
      </h2>
      <div className="mt-4 hidden overflow-hidden rounded-panel border-2 border-foreground md:block">
        <table className="w-full border-collapse text-left font-body text-[13px] leading-[1.45]">
          <thead className="bg-surface-subtle font-label text-[11px] font-semibold uppercase tracking-[0.08em]">
            <tr>
              <th scope="col" className="p-3">name</th>
              <th scope="col" className="p-3">email</th>
              <th scope="col" className="p-3">role</th>
              <th scope="col" className="p-3">access</th>
              <th scope="col" className="p-3">recorded change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.email} className="border-t-2 border-foreground">
                <td className="p-3 font-semibold">{row.name}</td>
                <td className="p-3">{row.email}</td>
                <td className="p-3">{row.role}</td>
                <td className="p-3"><AccessChip active={row.active} /></td>
                <td className="p-3 tabular-nums">{row.changedAt ?? "unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.email} className="rounded-panel border-2 border-foreground bg-surface-raised p-4">
            <dl className="grid gap-3 font-body text-[13px] leading-[1.45]">
              <div>
                <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">name</dt>
                <dd className="mt-1 font-semibold">{row.name}</dd>
              </div>
              <div>
                <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">email</dt>
                <dd className="mt-1 break-words">{row.email}</dd>
              </div>
              <div>
                <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">application role</dt>
                <dd className="mt-1">{row.role}</dd>
              </div>
              <div>
                <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">access</dt>
                <dd className="mt-1"><AccessChip active={row.active} /></dd>
              </div>
              <div>
                <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">recorded change</dt>
                <dd className="mt-1 tabular-nums">{row.changedAt ?? "unknown"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

const governanceControls = [
  "explicit save",
  "source provenance",
  "owner scope",
  "retention",
  "archive",
  "export",
  "audit",
] as const;

export function MemoryGovernancePanel() {
  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="memory-governance-title"
      data-memory-governance-panel
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            beta policy
          </p>
          <h2 id="memory-governance-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            memory governance
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            durable account history and saved memory are separate products. No conversation is silently promoted into memory.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-foreground/40 bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
          not activated
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            durable account history
          </p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">owner-scoped archive</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Authenticated chat history is retained for the verified account, remains archive-only, and does not become saved memory or training data.
          </p>
          <span className="mt-4 inline-flex border-2 border-live bg-canvas px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em]">
            separate from memory
          </span>
        </article>
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            saved memory
          </p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">explicit activation required</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Automatic extraction, background profiling, and implicit saves are disabled. There is no saved-memory corpus to manage in this release.
          </p>
          <span className="mt-4 inline-flex border-2 border-foreground/40 bg-surface-subtle px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
            disabled
          </span>
        </article>
      </div>

      <div className="mt-5 border-l-4 border-information bg-canvas px-4 py-3">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          future activation gates
        </p>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          Saved memory cannot be activated until every control below has an owner, retention rule, reversible lifecycle, and audit receipt.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="memory governance controls">
          {governanceControls.map((control) => (
            <li key={control} className="border-2 border-foreground/20 px-3 py-2 font-label text-xs font-bold lowercase text-foreground">
              {control}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

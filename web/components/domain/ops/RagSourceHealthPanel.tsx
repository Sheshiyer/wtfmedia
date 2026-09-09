"use client";

const sourceModes = ["published", "uncut", "both"] as const;
const deferredExceptions = [
  "WTF is a Battery?",
  "WEF - Economics",
  "The Foundery",
  "Brain Armstrong transcript-row mismatch",
] as const;

function Receipt({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-foreground bg-canvas p-4">
      <dt className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-2 font-heading text-2xl font-bold lowercase tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function RagSourceHealthPanel() {
  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="rag-source-health-title"
      data-rag-source-health-panel
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            read-only corpus receipt
          </p>
          <h2 id="rag-source-health-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            RAG and source health
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            This panel reports the approved ingestion receipt. It does not infer freshness, alignment, or live provider health from browser state.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-information bg-information px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-on-information">
          read only
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="approved corpus receipt">
        <Receipt label="published assets" value="55 / 55" />
        <Receipt label="approved mapped uncut" value="49 / 49" />
        <Receipt label="vector records" value="11,948" />
        <Receipt label="freshness" value="not observed" />
      </dl>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">retrieval contract</p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">published-only safe default</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Public Alpha retrieval stays published-only. Beta source selection is server-governed and accepts only the reconciled source modes below.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="supported source modes">
            {sourceModes.map((mode) => (
              <li key={mode} className="border-2 border-foreground px-2.5 py-1 font-label text-xs font-bold lowercase">
                {mode}
              </li>
            ))}
          </ul>
        </article>
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">known boundary</p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">timeline alignment unverified</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            The mapped uncut receipt is not a trusted timeline alignment. Synchronized playback and uncut timestamp claims remain unverified.
          </p>
          <span className="mt-4 inline-flex border-2 border-foreground/40 bg-surface-subtle px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
            no alignment claim
          </span>
        </article>
      </div>

      <div className="mt-5 border-l-4 border-attention bg-canvas px-4 py-3">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          deferred sheet exceptions
        </p>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          These exceptions remain outside fully-ingested claims until separately reconciled.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="deferred source exceptions">
          {deferredExceptions.map((exception) => (
            <li key={exception} className="border-2 border-foreground/20 px-3 py-2 font-body text-xs leading-relaxed">
              {exception}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

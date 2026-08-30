import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodeProvenancePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="episode records"
        title="provenance unavailable"
        summary="no live source for this episode. assets, transcripts, and timestamps stay hidden."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <section
          aria-labelledby="provenance-unavailable-heading"
          className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
        >
          <h2 id="provenance-unavailable-heading" className="font-heading text-xl font-bold lowercase text-foreground">
            no verified provenance record
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            Episode <span className="font-mono text-foreground">{id}</span> is not rendered from a local fixture. Connect an approved
            source before showing assets, transcripts, or timestamps.
          </p>
        </section>
      </div>
    </div>
  );
}

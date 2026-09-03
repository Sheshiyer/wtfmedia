"use client";

import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { OperatorContextStrip } from "@/components/domain/ops/OperatorContextStrip";
import { ReleaseControl } from "./ReleaseControl";
import { ReleaseStatusWidget } from "@/components/patterns/ReleaseStatusWidget";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsPage() {
  const context = useOperatorContext();

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="release context"
        title="settings"
        summary="environment, workspace, role, verification status, and roadmap for held features."
        accent="information"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        {context.role !== "public_link" && (
          <div className="overflow-hidden rounded-panel border-2 border-foreground">
            <OperatorContextStrip context={context} />
          </div>
        )}
        <div className="mt-6">
          <ReleaseControl />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ReleaseStatusWidget
            title="public link"
            status="current"
            tone="active"
            detail="This release keeps the rooms open to view. It does not prove organization scope or a live access gate."
          />
          <ReleaseStatusWidget
            title="next release gates"
            status="held"
            detail="Operator seats, audit export, ingest admin, and integration health need verified backend authority before they become active controls."
          />
        </div>
        <section className="mt-8" aria-labelledby="release-roadmap-title">
          <div className="mb-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              roadmap
            </p>
            <h2
              id="release-roadmap-title"
              className="font-heading text-2xl font-bold lowercase"
            >
              held out of the build
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReleaseStatusWidget
              title="ingest"
              status="coming soon"
              tone="coming-soon"
              detail="Published sync and uncut upload controls stay out of the active build. No upload ticket, OAuth sync, ASR job, or timeline alignment is inferred."
              next="Activate after approved OAuth, upload-ticket endpoints, queue consumers, and persisted job receipts exist."
              href="/ops/ingest"
            />
            <ReleaseStatusWidget
              title="operators"
              status="coming soon"
              tone="coming-soon"
              detail="Operator seats are not a live gate in this public-link release. Public mode does not show roster details or mutation controls."
              next="Activate after operator authority, roster reads, and seat mutations are backed by verified infrastructure."
              href="/ops/operators"
            />
            <ReleaseStatusWidget
              title="audit"
              status="coming soon"
              tone="coming-soon"
              detail="Audit export and protected event reads are not active in public-link mode. No audit records are inferred from an unavailable endpoint."
              next="Activate after verified ops context, read authority, and export confirmation are active."
              href="/ops/audit"
            />
            <ReleaseStatusWidget
              title="analytics"
              status="not activated"
              detail="Platform reporting is not activated; no performance state is inferred."
            />
            <ReleaseStatusWidget
              title="people"
              status="not activated"
              detail="Guest and relationship operations are not activated in this release."
            />
            <ReleaseStatusWidget
              title="integrations"
              status="not activated"
              detail="Integration health is not observed from this workspace."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { OperatorContextStrip } from "@/components/domain/ops/OperatorContextStrip";
import { ReleaseControl } from "./ReleaseControl";
import { ReleaseStatusWidget } from "@/components/patterns/ReleaseStatusWidget";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { CURRENT_RELEASE_VERSION } from "@/lib/public/release-version";
import { MemoryGovernancePanel } from "@/components/domain/ops/MemoryGovernancePanel";
import { OperatorAdministrationPanel } from "@/components/domain/ops/OperatorAdministrationPanel";
import { RagSourceHealthPanel } from "@/components/domain/ops/RagSourceHealthPanel";
import { SessionHistoryPolicyPanel } from "@/components/domain/ops/SessionHistoryPolicyPanel";

export default function SettingsPage() {
  const context = useOperatorContext();

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="release context"
        title="settings"
        summary="environment, workspace, role, verification status, and Beta policy readbacks."
        accent="information"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <div className="overflow-hidden rounded-panel border-2 border-foreground">
          <OperatorContextStrip context={context} />
        </div>
        <div className="mt-6">
          <ReleaseControl />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ReleaseStatusWidget
            title={CURRENT_RELEASE_VERSION}
            status="current"
            tone="active"
            detail="Current named alpha release. It keeps the rooms open to view and does not prove organization scope or a live access gate."
          />
          <ReleaseStatusWidget
            title="next release gates"
            status="held"
            detail="Ingest admin and integration health remain held until their verified backend authorities and receipts are active."
          />
        </div>
        <section className="mt-8 space-y-4" aria-labelledby="beta-consolidation-title">
          <div className="mb-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              beta consolidation
            </p>
            <h2 id="beta-consolidation-title" className="font-heading text-2xl font-bold lowercase">
              sessions, memory, RAG, and administration
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
              These panels expose the server policy and evidence boundaries. A pending or held label is intentional and never implies that an interactive staging gate has passed.
            </p>
          </div>
          <SessionHistoryPolicyPanel />
          <MemoryGovernancePanel />
          <RagSourceHealthPanel />
          <OperatorAdministrationPanel />
        </section>
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

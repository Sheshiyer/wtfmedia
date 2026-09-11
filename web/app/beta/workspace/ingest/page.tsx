import { IngestWorkspace } from "@/components/domain/ops/ingest";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function BetaIngestPage() {
  return <div id="beta-workspace-ingest"><WorkspaceHeader size="page" eyebrow="source intake" title="ingest" summary="intake controls are visible only where the server capability projection permits them." accent="attention" /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><IngestWorkspace /></div></div>;
}

import { ReleaseStatusWidget } from "@/components/patterns/ReleaseStatusWidget";

export function IngestWorkspace() {
  return (
    <div className="space-y-8">
      <ReleaseStatusWidget
        title="ingest admin"
        status="coming soon"
        tone="coming-soon"
        titleAs="label"
        detail="Published sync and uncut upload controls are held for this release. No upload ticket, OAuth sync, ASR job, or timeline alignment is inferred from this page."
        next="Next release needs approved OAuth, upload-ticket endpoints, queue consumers, and persisted job receipts before these controls become active."
      />
    </div>
  );
}

export { IngestionJobLedger } from "./IngestionJobLedger";
export { YouTubeSyncControl } from "./YouTubeSyncControl";
export { UncutUploadDropzone } from "./UncutUploadDropzone";

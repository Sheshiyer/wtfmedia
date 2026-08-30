"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";

export type UploadAssetType =
  | "uncut_video"
  | "uncut_audio"
  | "captions_vtt"
  | "captions_srt"
  | "editorial_notes";

interface ConfirmedAsset {
  id: string;
  episodeId: string;
  assetType: string;
  byteSize: number;
  contentSha256: string;
  mimeType: string;
  createdAt: string;
}

export function UncutUploadDropzone({ onUploadComplete }: { onUploadComplete?: (asset: ConfirmedAsset) => void }) {
  const [episodeId, setEpisodeId] = useState<string>("");
  const [assetType, setAssetType] = useState<UploadAssetType>("uncut_audio");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [confirmedAsset, setConfirmedAsset] = useState<ConfirmedAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateSha256 = async (fileData: File): Promise<string> => {
    setStatusMessage("checking the file");
    const buffer = await fileData.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setConfirmedAsset(null);
      setErrorMessage("");
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setConfirmedAsset(null);
      setErrorMessage("");
    }
  };

  const executeUpload = async () => {
    if (!file || !episodeId.trim()) {
      setErrorMessage("Please select a valid file and provide an episode ID.");
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setErrorMessage("");
    setConfirmedAsset(null);

    try {
      // Step 1: Compute SHA-256
      const sha256 = await calculateSha256(file);
      setUploadProgress(25);

      // Step 2: Request Ephemeral HMAC Upload Ticket
      setStatusMessage("requesting an upload ticket");
      const intentRes = await fetch("/ops/api/assets/upload-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId: episodeId.trim(),
          assetType,
          byteSize: file.size,
          mimeType: file.type || "audio/mp4",
          expectedSha256: sha256,
        }),
      });

      if (!intentRes.ok) {
        throw new Error("Upload authorization is unavailable. No file was streamed or registered.");
      }
      const intentData = await intentRes.json() as { uploadTicket?: unknown; assetId?: unknown };
      const uploadTicket = typeof intentData.uploadTicket === "string" ? intentData.uploadTicket : "";
      const assetId = typeof intentData.assetId === "string" ? intentData.assetId : "";
      if (!uploadTicket || !assetId) {
        throw new Error("Upload authorization response was incomplete. No file was streamed or registered.");
      }

      setUploadProgress(50);

      // Step 3: Stream to R2 Vault
      setStatusMessage("uploading the file");
      const streamRes = await fetch("/ops/api/assets/upload-stream", {
        method: "PUT",
        headers: {
          "x-upload-ticket": uploadTicket,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!streamRes.ok) {
        throw new Error("upload failed. the file was not confirmed.");
      }

      setUploadProgress(80);

      // Step 4: Confirm Upload & D1 Provenance Registration
      setStatusMessage("Verifying object presence and recording in D1 provenance spine...");
      const confirmRes = await fetch("/ops/api/assets/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadTicket,
          assetId,
          authority: "owner_supplied",
        }),
      });

      if (!confirmRes.ok) {
        throw new Error("the upload was not confirmed. no success was recorded.");
      }
      const confirmation = await confirmRes.json() as { asset?: ConfirmedAsset };
      const confirmedData = confirmation.asset;
      if (!confirmedData?.id || !confirmedData.contentSha256) {
        throw new Error("Upload confirmation was incomplete. No provenance success was recorded.");
      }

      setUploadProgress(100);
      setStatusMessage("the file was confirmed. no extra provenance was inferred.");
      setConfirmedAsset(confirmedData);
      onUploadComplete?.(confirmedData);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed unexpectedly.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-label="uncut upload"
      className="space-y-6 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-2 border-b-2 border-foreground pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            uncut upload
          </span>
          <h2 className="font-heading text-xl font-bold lowercase sm:text-2xl">
            uncut media &amp; sidecar upload
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1" htmlFor="uncut-episode-id">
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">
            episode id
          </span>
          <input
            id="uncut-episode-id"
            type="text"
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value)}
            placeholder="approved episode id"
            className="min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-mono text-xs text-foreground focus-visible:outline-attention"
          />
        </label>

        <label className="grid gap-1" htmlFor="uncut-asset-type">
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">
            source type
          </span>
          <select
            id="uncut-asset-type"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as UploadAssetType)}
            className="min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm font-semibold text-foreground focus-visible:outline-attention"
          >
            <option value="uncut_audio">Uncut Studio Master Audio (.wav / .m4a)</option>
            <option value="uncut_video">Uncut Camera Video Stream (.mov / .mp4)</option>
            <option value="captions_vtt">Diarized Captions Sidecar (.vtt)</option>
            <option value="captions_srt">Subtitles Sidecar (.srt)</option>
            <option value="editorial_notes">Editorial Notes &amp; Timestamps (.json / .txt)</option>
          </select>
        </label>
      </div>

      {/* Drag and Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Select an uncut media file"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-panel border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver
            ? "border-attention bg-attention/20"
            : "border-foreground/40 bg-canvas hover:border-foreground hover:bg-surface-subtle"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="space-y-1">
            <strong className="block font-heading text-base lowercase text-foreground">
              {file.name}
            </strong>
            <p className="font-mono text-xs text-secondary">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || "application/octet-stream"}
            </p>
            <span className="inline-block font-label text-[10px] font-bold uppercase tracking-wider text-live">
              Ready for direct streaming
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-heading text-lg font-bold lowercase text-foreground">
              drop a studio file, or browse
            </p>
            <p className="font-body text-xs text-muted max-w-sm">
              upload is unavailable until an approved connection exists. no file is stored from this screen until then.
            </p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-2 rounded-control border-2 border-foreground bg-canvas p-4">
          <div className="flex items-center justify-between text-xs font-mono" role="status" aria-live="polite">
            <span className="text-secondary">{statusMessage}</span>
            <strong className="text-foreground">{uploadProgress}%</strong>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded bg-surface-subtle border border-foreground/30">
            <div
              className="h-full bg-attention transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-control border-2 border-editorial bg-editorial/10 p-3 text-xs text-foreground" role="alert">
          <strong>Upload Error:</strong> {errorMessage}
        </div>
      )}

      {confirmedAsset && (
        <div className="rounded-panel border-2 border-live bg-live/10 p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <strong className="font-heading text-sm text-live">file confirmed</strong>
            <span className="rounded bg-canvas border border-foreground/30 px-2 py-0.5 text-[10px]">
              {confirmedAsset.id}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-secondary text-[11px]">
            <div>
              <span className="text-muted">fingerprint: </span>
              <span className="font-bold text-foreground break-all">{confirmedAsset.contentSha256}</span>
            </div>
            <div>
              <span className="text-muted">Byte Size: </span>
              <span className="font-bold text-foreground">{(confirmedAsset.byteSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {file && !uploading && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFile(null);
              setConfirmedAsset(null);
            }}
            className="border-2 border-foreground text-xs font-bold uppercase"
          >
            clear file
          </Button>
        )}
        <Button
          type="button"
          variant="attention"
          onClick={() => void executeUpload()}
          disabled={!file || !episodeId.trim() || uploading}
          className="min-h-11 border-2 border-foreground font-label text-sm font-bold uppercase tracking-wider text-on-attention shadow-[4px_4px_0_var(--wtf-foreground)]"
        >
          {uploading ? "uploading" : "start upload"}
        </Button>
      </div>
    </section>
  );
}

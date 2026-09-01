import type { SourceAssetType } from "../dto.ts";

/**
 * Local-only contract for a workbook adapter. It deliberately accepts no links,
 * transcript text, storage keys, or provider credentials. A protected owner-run
 * importer must resolve those separately after this decision boundary.
 */
export type ReconciliationStatus =
  | "mapped"
  | "missing_transcript"
  | "missing_uncut"
  | "ambiguous"
  | "inaccessible"
  | "needs_alignment"
  | "rejected";

export type SourceRole =
  | "candidate_internal_media"
  | "uncut_master"
  | "clean_cut"
  | "subtitle"
  | "final_frame"
  | "not_an_asset";

export type ApprovedAssetRole = Exclude<SourceRole, "candidate_internal_media" | "not_an_asset">;
export type ApprovedMediaKind = "video" | "audio" | "srt" | "vtt" | "metadata";

export interface WorkbookReconciliationInput {
  sourceLabel: string;
  sourceRow: number;
  category: string;
  normalizedTitle: string;
  sourceField: string;
  /** Set only after a human approves the canonical episode relationship. */
  approvedEpisodeId?: string;
  /** Retained to make title-only matches explicit, but never used for activation. */
  titleMatchedEpisodeId?: string;
  accessible: boolean;
  ownerApprovedRole?: ApprovedAssetRole;
  ownerApprovedMediaKind?: ApprovedMediaKind;
  assetVerified?: boolean;
}

export interface WorkbookReconciliationResult {
  rowIdentity: string;
  sourceRole: SourceRole;
  status: ReconciliationStatus;
  resolvedAssetType: SourceAssetType | null;
  activation: "blocked" | "review_required";
  reason:
    | "approved_episode_required"
    | "owner_role_or_verification_required"
    | "asset_inaccessible"
    | "alignment_required"
    | "mapped_for_review"
    | "unsupported_asset_role";
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function roleFromField(sourceField: string): SourceRole {
  return normalise(sourceField) === "internal" ? "candidate_internal_media" : "not_an_asset";
}

function resolveAssetType(role: ApprovedAssetRole, mediaKind?: ApprovedMediaKind): SourceAssetType | null {
  if (role === "uncut_master" && mediaKind === "video") return "uncut_video";
  if (role === "uncut_master" && mediaKind === "audio") return "uncut_audio";
  if (role === "subtitle" && mediaKind === "srt") return "captions_srt";
  if (role === "subtitle" && mediaKind === "vtt") return "captions_vtt";
  if (role === "final_frame" && mediaKind === "metadata") return "sidecar_metadata";
  return null;
}

async function sourceRowIdentity(input: WorkbookReconciliationInput): Promise<string> {
  const fingerprintInput = [
    normalise(input.sourceLabel),
    input.sourceRow,
    normalise(input.category),
    normalise(input.normalizedTitle),
  ].join("\u001f");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintInput));
  const hex = [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
  return `src_${hex.slice(0, 16)}`;
}

function result(
  rowIdentity: string,
  sourceRole: SourceRole,
  status: ReconciliationStatus,
  resolvedAssetType: SourceAssetType | null,
  activation: WorkbookReconciliationResult["activation"],
  reason: WorkbookReconciliationResult["reason"],
): WorkbookReconciliationResult {
  return { rowIdentity, sourceRole, status, resolvedAssetType, activation, reason };
}

/**
 * Produces a safe status projection. It does not perform import, D1 writes, R2
 * reads, title-based activation, or timeline alignment.
 */
export async function reconcileWorkbookCandidate(input: WorkbookReconciliationInput): Promise<WorkbookReconciliationResult> {
  const rowIdentity = await sourceRowIdentity(input);
  const sourceRole = input.ownerApprovedRole ?? roleFromField(input.sourceField);

  if (!input.approvedEpisodeId) {
    return result(rowIdentity, sourceRole, "ambiguous", null, "blocked", "approved_episode_required");
  }

  if (!input.accessible) {
    return result(rowIdentity, sourceRole, "inaccessible", null, "blocked", "asset_inaccessible");
  }

  if (!input.ownerApprovedRole || !input.assetVerified) {
    return result(rowIdentity, sourceRole, "ambiguous", null, "blocked", "owner_role_or_verification_required");
  }

  const resolvedAssetType = resolveAssetType(input.ownerApprovedRole, input.ownerApprovedMediaKind);
  if (!resolvedAssetType) {
    return result(rowIdentity, sourceRole, "rejected", null, "blocked", "unsupported_asset_role");
  }

  if (input.ownerApprovedRole === "uncut_master") {
    return result(rowIdentity, sourceRole, "needs_alignment", resolvedAssetType, "blocked", "alignment_required");
  }

  return result(rowIdentity, sourceRole, "mapped", resolvedAssetType, "review_required", "mapped_for_review");
}

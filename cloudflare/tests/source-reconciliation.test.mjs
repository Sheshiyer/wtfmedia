import assert from "node:assert/strict";
import { test } from "node:test";

let reconcileWorkbookCandidate;
try {
  ({ reconcileWorkbookCandidate } = await import("../src/ingest/source-reconciliation.ts"));
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

function reconciliation(input) {
  assert.equal(typeof reconcileWorkbookCandidate, "function", "missing source reconciliation adapter");
  return reconcileWorkbookCandidate(input);
}

test("Internal remains a non-activatable candidate until an owner confirms and verifies its role", async () => {
  const result = await reconciliation({
    sourceLabel: "internal-links-workbook",
    sourceRow: 8,
    category: "podcast",
    normalizedTitle: "synthetic-episode",
    sourceField: "Internal",
    approvedEpisodeId: "ep_01J0000000000000000000001",
    accessible: true,
  });

  assert.match(result.rowIdentity, /^src_[a-f0-9]{16}$/);
  assert.equal(result.sourceRole, "candidate_internal_media");
  assert.equal(result.status, "ambiguous");
  assert.equal(result.resolvedAssetType, null);
  assert.equal(result.activation, "blocked");
  assert.equal("assetReference" in result, false);
});

test("a title and category match alone never activates an uncut asset", async () => {
  const result = await reconciliation({
    sourceLabel: "internal-links-workbook",
    sourceRow: 9,
    category: "podcast",
    normalizedTitle: "synthetic-episode",
    sourceField: "Internal",
    titleMatchedEpisodeId: "ep_01J0000000000000000000001",
    accessible: true,
    ownerApprovedRole: "uncut_master",
    ownerApprovedMediaKind: "video",
    assetVerified: true,
  });

  assert.equal(result.status, "ambiguous");
  assert.equal(result.resolvedAssetType, null);
  assert.equal(result.activation, "blocked");
  assert.equal(result.reason, "approved_episode_required");
});

test("a verified uncut master is typed but stays unavailable until alignment is verified", async () => {
  const result = await reconciliation({
    sourceLabel: "internal-links-workbook",
    sourceRow: 10,
    category: "podcast",
    normalizedTitle: "synthetic-episode",
    sourceField: "Internal",
    approvedEpisodeId: "ep_01J0000000000000000000001",
    accessible: true,
    ownerApprovedRole: "uncut_master",
    ownerApprovedMediaKind: "video",
    assetVerified: true,
  });

  assert.equal(result.sourceRole, "uncut_master");
  assert.equal(result.resolvedAssetType, "uncut_video");
  assert.equal(result.status, "needs_alignment");
  assert.equal(result.activation, "blocked");
});

test("confirmed non-timeline assets can map without exposing workbook values", async () => {
  const result = await reconciliation({
    sourceLabel: "internal-links-workbook",
    sourceRow: 11,
    category: "podcast",
    normalizedTitle: "synthetic-episode",
    sourceField: "Final Frame",
    approvedEpisodeId: "ep_01J0000000000000000000001",
    accessible: true,
    ownerApprovedRole: "final_frame",
    ownerApprovedMediaKind: "metadata",
    assetVerified: true,
  });

  assert.equal(result.sourceRole, "final_frame");
  assert.equal(result.resolvedAssetType, "sidecar_metadata");
  assert.equal(result.status, "mapped");
  assert.equal(result.activation, "review_required");
  assert.deepEqual(Object.keys(result).sort(), [
    "activation",
    "reason",
    "resolvedAssetType",
    "rowIdentity",
    "sourceRole",
    "status",
  ]);
});

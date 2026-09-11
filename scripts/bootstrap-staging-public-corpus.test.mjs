import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  STAGING_TARGET,
  applyBootstrap,
  assertStagingTarget,
  buildBootstrapPlan,
  parseArgs,
  receipt,
} from "./bootstrap-staging-public-corpus.mjs";

const VIDEO_ID = "FPV5fAkqyBs";

async function fixture({ transcript = true, timestamps = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), "wtf-staging-bootstrap-"));
  mkdirSync(join(root, "web/src/data"), { recursive: true });
  mkdirSync(join(root, "web/public/transcripts"), { recursive: true });
  writeFileSync(join(root, "web/src/data/episodes.json"), JSON.stringify({ entries: [{
    video_id: VIDEO_ID, title: "Public test episode", duration: 120, channel_id: "UCpublic",
    url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  }] }));
  if (transcript) writeFileSync(join(root, "web/public/transcripts", `${VIDEO_ID}.txt`), "public transcript body\n");
  if (timestamps) writeFileSync(join(root, "web/public/transcripts", `${VIDEO_ID}.json`), JSON.stringify([{ start: 0, text: "public" }]));
  return root;
}

test("rejects production resources and URLs before planning", () => {
  assert.throws(() => assertStagingTarget({ ...STAGING_TARGET, database: "wtfmedia-ops" }), /staging_target_required|production_target_rejected/);
  assert.throws(() => assertStagingTarget({ ...STAGING_TARGET, enqueueUrl: "https://wtfmedia-edge.connect2nikhai.workers.dev/v1/admin/enqueue" }), /staging_target_required|production_target_rejected/);
});

test("missing public transcript or timestamp asset fails before any mutation", async () => {
  const root = await fixture({ timestamps: false });
  try {
    assert.throws(() => buildBootstrapPlan(root, [VIDEO_ID]), /public_source_asset_missing/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("bounds the staging corpus and rejects ambiguous execution modes", async () => {
  const root = await fixture();
  try {
    assert.throws(() => buildBootstrapPlan(root, [VIDEO_ID, "WMRO9dvD5T0", "SPLFyVyTI1A"]), /staging_corpus_limit_exceeded/);
    assert.throws(() => parseArgs(["--episode-id", VIDEO_ID, "--apply", "--dry-run"]), /choose_one_of_apply_or_dry_run/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("dry-run produces privacy-safe provenance without invoking remote operations", async () => {
  const root = await fixture();
  try {
    const plan = buildBootstrapPlan(root, [VIDEO_ID]);
    const output = receipt(plan, "dry-run");
    assert.equal(output.mode, "dry-run");
    assert.equal(output.episodes[0].videoId, VIDEO_ID);
    assert.match(output.episodes[0].transcript.sha256, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(output).includes(root), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("apply orders staging provenance, R2 upload, verification, then Worker enqueue", async () => {
  const root = await fixture();
  try {
    const plan = buildBootstrapPlan(root, [VIDEO_ID]);
    const commands = [];
    const calls = [];
    await applyBootstrap(plan, {
      runner: (args) => commands.push(args),
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 202 };
      },
      token: "test-token-not-a-secret-receipt",
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, STAGING_TARGET.enqueueUrl);
    assert.equal(commands.every((args) => !args.join(" ").includes("wtfmedia-ops ")), true);
    const firstUpload = commands.findIndex((args) => args[0] === "r2");
    const firstAvailable = commands.findIndex((args) => args.join(" ").includes("availability = 'available'"));
    const verification = commands.findIndex((args) => args.join(" ").startsWith("d1 execute wtfmedia-ops-staging --remote --command SELECT"));
    assert.ok(firstUpload >= 4, "D1 episode, identity, and asset rows precede uploads");
    assert.ok(firstAvailable > firstUpload, "assets become available only after upload");
    assert.ok(verification > firstAvailable, "D1 verification follows availability");
    assert.equal(commands.filter((args) => args[0] === "r2").length, 2);
    assert.ok(commands.slice(0, 4).every((args) => args.join(" ").includes("ON CONFLICT")), "D1 setup is idempotent");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.jobs[0].sourceMode, "published");
    assert.equal(body.jobs[0].timestampsKey, `timestamps/${VIDEO_ID}.json`);
    assert.match(body.jobs[0].sourceContentHash, /^[a-f0-9]{64}$/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

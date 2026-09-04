import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrapperPath = join(root, "scripts/wrangler-profile.mjs");
const manifestPath = join(root, "scripts/build_provenance_manifest.mjs");
const queuePath = join(root, "scripts/queue_cloudflare_ingest.mjs");

function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
}

function fixtureRoot(tempRoot, videoIds) {
  const dataDir = join(tempRoot, "web/src/data");
  const transcriptDir = join(tempRoot, "web/public/transcripts");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(transcriptDir, { recursive: true });
  const entries = videoIds.map((videoId, index) => ({
    video_id: videoId,
    title: `Episode ${index + 1}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    duration: 100,
  }));
  writeFileSync(join(dataDir, "episodes.json"), `${JSON.stringify({ entries })}\n`);
  for (const videoId of videoIds) {
    writeFileSync(join(transcriptDir, `${videoId}.txt`), "one two three\n");
  }
  return { dataDir, transcriptDir };
}

test("Wrangler profile is one argument and ambient account tokens are stripped", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-wrangler-test-"));
  try {
    const capturePath = join(tempRoot, "capture.json");
    const binaryPath = join(tempRoot, "fake-wrangler");
    writeFileSync(binaryPath, `#!/usr/bin/env node\nconst fs=require("fs");fs.writeFileSync(process.env.CAPTURE_PATH,JSON.stringify({args:process.argv.slice(2),env:process.env}));\n`);
    chmodSync(binaryPath, 0o755);

    const result = runNode(wrapperPath, ["wtfmedia", "kv", "key", "list"], {
      env: {
        ...process.env,
        WTFMEDIA_WRANGLER_BIN: binaryPath,
        CAPTURE_PATH: capturePath,
        CF_API_TOKEN: "must-not-pass",
        CLOUDFLARE_API_TOKEN: "must-not-pass",
        CF_ACCOUNT_ID: "must-not-pass",
        CLOUDFLARE_ACCOUNT_ID: "must-not-pass",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const capture = JSON.parse(readFileSync(capturePath, "utf8"));
    assert.deepEqual(capture.args, ["--profile=wtfmedia", "kv", "key", "list"]);
    for (const key of ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN", "CF_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]) {
      assert.equal(capture.env[key], undefined);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Manifest counts only canonical validated timestamp sidecars", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-manifest-test-"));
  try {
    const ids = ["2q7-cTPwf-g", "FPV5fAkqyBs", "VIlfHB7Jk2s", "0JDsFpU6pGQ"];
    const { transcriptDir } = fixtureRoot(tempRoot, ids);
    writeFileSync(join(transcriptDir, `${ids[0]}.json`), JSON.stringify([
      { t: 0, x: "one" }, { t: 1, x: "two" }, { t: 2, x: "three" },
    ]));
    writeFileSync(join(transcriptDir, `${ids[1]}.json`), JSON.stringify([
      { start: 0, text: "one" }, { start: 1, text: "two" }, { start: 2, text: "three" },
    ]));
    writeFileSync(join(transcriptDir, `${ids[2]}.txt`), "one two three four five six seven eight nine ten\n");
    writeFileSync(join(transcriptDir, `${ids[2]}.json`), JSON.stringify([
      { t: 0, x: "one" }, { t: 1, x: "two" }, { t: 2, x: "three" },
    ]));

    const result = runNode(manifestPath, ["--root", tempRoot]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(tempRoot, "web/src/data/corpus-manifest.json")), true);
    const manifest = JSON.parse(readFileSync(join(tempRoot, "web/src/data/corpus-manifest.json"), "utf8"));
    assert.deepEqual(manifest.corpus, { episodes: 4, timestamped_episodes: 1 });
    assert.equal(manifest.entries[0].timestamps.available, true);
    assert.equal(manifest.entries[0].timestamps.cue_count, 3);
    assert.equal(manifest.entries[0].timestamps.text_coverage_ratio, 1);
    assert.match(manifest.entries[0].timestamps.sha256, /^[a-f0-9]{64}$/);
    assert.equal(manifest.entries[1].timestamps.available, false);
    assert.equal(manifest.entries[1].timestamps.reason, "invalid_schema");
    assert.equal(manifest.entries[2].timestamps.available, false);
    assert.equal(manifest.entries[2].timestamps.reason, "insufficient_text_coverage");
    assert.ok(manifest.entries[2].timestamps.text_coverage_ratio < 0.8);
    assert.equal(manifest.entries[3].timestamps.available, false);
    assert.equal(manifest.entries[3].timestamps.reason, "missing");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Queue dry-run scopes repair to exact approved video IDs", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-queue-test-"));
  try {
    const ids = ["2q7-cTPwf-g", "FPV5fAkqyBs"];
    const { transcriptDir } = fixtureRoot(tempRoot, ids);
    for (const videoId of ids) {
      writeFileSync(join(transcriptDir, `${videoId}.json`), JSON.stringify([
        { t: 0, x: "one" }, { t: 1, x: "two" }, { t: 2, x: "three" },
      ]));
    }

    const result = runNode(queuePath, ["--root", tempRoot, "--dry-run", "--repair-video-id", ids[1]], {
      env: { ...process.env, INGEST_SECRET: "" },
    });
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.mode, "dry_run");
    assert.equal(receipt.jobs.length, 1);
    assert.equal(receipt.jobs[0].videoId, ids[1]);
    assert.equal(receipt.jobs[0].replaceExisting, true);
    assert.equal(receipt.jobs[0].sourceMode, "published");
    assert.equal(receipt.jobs[0].timestampsKey, `timestamps/${ids[1]}.json`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Queue normal dry-run leaves jobs without repair instruction", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-queue-normal-test-"));
  try {
    const ids = ["2q7-cTPwf-g", "FPV5fAkqyBs"];
    const { transcriptDir } = fixtureRoot(tempRoot, ids);
    for (const videoId of ids) {
      writeFileSync(join(transcriptDir, `${videoId}.json`), JSON.stringify([
        { t: 0, x: "one" }, { t: 1, x: "two" }, { t: 2, x: "three" },
      ]));
    }

    const result = runNode(queuePath, ["--root", tempRoot, "--dry-run"], {
      env: { ...process.env, INGEST_SECRET: "" },
    });
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.jobs.length, 2);
    assert.equal(receipt.jobs.every((job) => !("replaceExisting" in job)), true);
    assert.equal(receipt.jobs.every((job) => !("sourceMode" in job)), true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Queue rejects repair IDs outside the fixed recovery allowlist", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-queue-reject-test-"));
  try {
    fixtureRoot(tempRoot, ["RSB58m7Xwhg"]);
    const result = runNode(queuePath, ["--root", tempRoot, "--dry-run", "--repair-video-id", "RSB58m7Xwhg"], {
      env: { ...process.env, INGEST_SECRET: "" },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /repair_video_id_not_approved/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Queue rejects a canonical but sparse repair sidecar", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "wtfmedia-queue-sparse-test-"));
  try {
    const videoId = "FPV5fAkqyBs";
    const { transcriptDir } = fixtureRoot(tempRoot, [videoId]);
    writeFileSync(join(transcriptDir, `${videoId}.txt`), "one two three four five six seven eight nine ten\n");
    writeFileSync(join(transcriptDir, `${videoId}.json`), JSON.stringify([
      { t: 0, x: "one" }, { t: 1, x: "two" }, { t: 2, x: "three" },
    ]));

    const result = runNode(queuePath, ["--root", tempRoot, "--dry-run", "--repair-video-id", videoId], {
      env: { ...process.env, INGEST_SECRET: "" },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /repair_timestamp_sidecar_unavailable:FPV5fAkqyBs:insufficient_text_coverage/);
    assert.equal(result.stdout, "");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

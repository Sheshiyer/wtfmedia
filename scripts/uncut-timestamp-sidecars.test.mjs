import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildUncutTimestampBundle } from "./uncut-timestamp-sidecars.mjs";

test("builds a metadata-refresh job when uncut prose has no explicit intervals", () => {
  const root = mkdtempSync(join(tmpdir(), "wtfmedia-uncut-metadata-refresh-"));
  try {
    const transcriptPath = join(root, "episode.txt");
    writeFileSync(transcriptPath, "Untimed but approved transcript prose.");

    const bundle = buildUncutTimestampBundle({
      map: {
        rows: [{
          key: "episode-key",
          cf_youtube_video_id: "RSB58m7Xwhg",
          local_uncut_txt_path: transcriptPath,
          frame_io_final_ep_url: "https://f.io/0I8LmYs9",
        }],
      },
      jobs: [{
        videoId: "RSB58m7Xwhg",
        title: "Uncut episode",
        transcriptKey: "uncut/transcript.txt",
        contentHash: "old-hash",
        sourceMode: "uncut",
        metadata: { key: "episode-key" },
      }],
    });

    assert.equal(bundle.entries.length, 1);
    assert.equal(bundle.entries[0].job.timestampsKey, undefined);
    assert.deepEqual(bundle.entries[0].job.metadata, { frameIoFinalEpUrl: "https://f.io/0I8LmYs9" });
    assert.notEqual(bundle.entries[0].job.contentHash, "old-hash");
    assert.equal(bundle.entries[0].intervalCount, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

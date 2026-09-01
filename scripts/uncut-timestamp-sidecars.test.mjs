import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildUncutTimestampBundle,
  parseUncutTimestampIntervals,
  validateUncutTimestampIntervals,
} from "./uncut-timestamp-sidecars.mjs";

test("parses speaker-labelled and plain interval headers", () => {
  const intervals = parseUncutTimestampIntervals(`
    Transcript title
    [Speaker 3] (0:00 - 1:23)

    First paragraph.\nwith a page break\fcontinuation.

    (1:25 - 1:29)
    Second paragraph.
  `);

  assert.deepEqual(intervals, [
    { t: 0, x: "First paragraph. with a page break continuation." },
    { t: 85, x: "Second paragraph." },
  ]);
});

test("does not invent records from untimed prose", () => {
  assert.deepEqual(parseUncutTimestampIntervals("Just prose without a clock."), []);
});

test("validates monotonic, non-negative source intervals", () => {
  assert.doesNotThrow(() => validateUncutTimestampIntervals([
    { t: 0, x: "one" },
    { t: 1, x: "two" },
  ]));
  assert.throws(() => validateUncutTimestampIntervals([
    { t: 2, x: "later" },
    { t: 1, x: "earlier" },
  ]), /not_monotonic/);
});

test("carries the approved Frame.io URL into the uncut enqueue job", () => {
  const root = mkdtempSync(join(tmpdir(), "wtfmedia-uncut-job-"));
  try {
    const transcriptPath = join(root, "episode.txt");
    writeFileSync(transcriptPath, "(0:01 - 0:03)\nA source paragraph.");

    const bundle = buildUncutTimestampBundle({
      map: {
        rows: [{
          key: "episode-key",
          cf_youtube_video_id: "abcdefghijk",
          local_uncut_txt_path: transcriptPath,
          local_uncut_pdf_sha256: "pdf-hash",
          frame_io_final_ep_url: "https://f.io/0I8LmYs9",
        }],
      },
      jobs: [{
        videoId: "abcdefghijk",
        title: "Uncut episode",
        transcriptKey: "uncut/transcript.txt",
        contentHash: "old-hash",
        sourceMode: "uncut",
        metadata: { key: "episode-key" },
      }],
    });

    assert.equal(bundle.entries.length, 1);
    assert.deepEqual(bundle.entries[0].job.metadata, { frameIoFinalEpUrl: "https://f.io/0I8LmYs9" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

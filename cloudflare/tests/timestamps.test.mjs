import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { extractTimestampLines } from "../src/catalogue/timestamps.ts";

describe("uncut inline timestamps", () => {
  test("reads bracket clocks and ignores untimed prose", () => {
    const lines = extractTimestampLines(`
[00:01:02] music is the first language
[00:12:40] we recorded the uncut take in the studio
[01:03:05] the published cut drops this hour
plain paragraph with 12:40 mentioned later is not a clock line
`);
    assert.equal(lines.length, 3);
    assert.equal(lines[0].t, 62);
    assert.equal(lines[0].x.includes("music"), true);
    assert.equal(lines[2].t, 3785);
  });

  test("does not invent times from fewer than three clocked lines", () => {
    const lines = extractTimestampLines(`[00:01] only one timed line\nand then ordinary speech`);
    assert.deepEqual(lines, []);
  });

  test("reads srt blocks", () => {
    const lines = extractTimestampLines(`1
00:00:01,000 --> 00:00:04,000
hello from the studio

2
00:00:05,000 --> 00:00:08,000
second line

3
00:01:00,000 --> 00:01:03,000
third line
`);
    assert.equal(lines.length, 3);
    assert.equal(lines[0].t, 1);
    assert.equal(lines[2].t, 60);
  });
});

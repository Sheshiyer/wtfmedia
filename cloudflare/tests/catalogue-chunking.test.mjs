import assert from "node:assert/strict";
import { test } from "node:test";

import * as timestamps from "../src/catalogue/timestamps.ts";

test("splits an oversized timestamp line into bounded pieces", () => {
  assert.equal(typeof timestamps.splitTimestampLine, "function");

  const line = { t: 123, x: Array.from({ length: 12_000 }, () => "word").join(" ") };
  const pieces = timestamps.splitTimestampLine(line, 1_100);

  assert.ok(pieces.length > 1);
  assert.ok(pieces.every((piece) => piece.x.length <= 1_100));
  assert.ok(pieces.every((piece) => piece.t === 123));
  assert.equal(pieces.map((piece) => piece.x).join(" "), line.x);
});

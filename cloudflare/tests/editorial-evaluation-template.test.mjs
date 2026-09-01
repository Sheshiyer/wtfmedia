import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const templatePath = join(root, "..", "docs", "quality", "2026-08-29-editorial-evaluation-template.json");

test("editorial evaluation scaffold is balanced, source-safe, and awaits human-authored answers", () => {
  assert.ok(existsSync(templatePath), "missing editorial evaluation template");
  const evaluation = JSON.parse(readFileSync(templatePath, "utf8"));

  assert.equal(evaluation.status, "authoring_required");
  assert.equal(evaluation.cases.length, 20);
  assert.equal(new Set(evaluation.cases.map((entry) => entry.id)).size, 20);
  assert.deepEqual(
    Object.fromEntries(Object.entries(evaluation.distribution).sort()),
    {
      factual: 4,
      grounding: 8,
      role_scope: 2,
      timeline: 3,
      unavailable_or_conflict: 3,
    },
  );
  assert.equal(evaluation.cases.every((entry) => entry.authoringStatus === "pending"), true);
  assert.equal(evaluation.cases.every((entry) => entry.expectedAnswer === null), true);
  assert.equal(evaluation.cases.every((entry) => entry.sourceReference === null), true);
  assert.equal(evaluation.cases.every((entry) => entry.query === null), true);
  assert.equal(evaluation.rubric.unsupportedClaim, "fail");
  assert.equal(evaluation.rubric.unsafeSourceExposure, "fail");
});

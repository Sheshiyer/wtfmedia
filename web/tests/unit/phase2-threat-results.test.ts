import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const phaseDirectory = path.join(root, ".planning/phases/02-platform-foundation-authenticated-policy-boundary");
const ledgerPath = path.join(phaseDirectory, "02-VALIDATION.md");
const aggregatePath = path.join(root, "web/tests/security/phase2-threat-results.json");

describe("Phase 2 threat definitions", () => {
  it("owns every planned threat exactly once and starts with no result claims", () => {
    const ledger = fs.readFileSync(ledgerPath, "utf8");
    const aggregate = JSON.parse(fs.readFileSync(aggregatePath, "utf8"));
    const ids = [...ledger.matchAll(/\| (T-02-\d{2}) \|/g)].map((match) => match[1]);

    expect(ids).toEqual(Array.from({ length: 35 }, (_, index) => `T-02-${String(index + 1).padStart(2, "0")}`));
    expect(aggregate.schema_version).toBe(1);
    expect(aggregate.phase).toBe("02");
    expect(aggregate.sections).toHaveLength(13);
    expect(aggregate.results).toEqual({});
  });
});

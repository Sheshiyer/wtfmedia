import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  executeTask,
  loadDefinitions,
  validateDefinitionLedger,
  validateFragment,
} from "../../scripts/lib/phase2-threat-results.mjs";

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

  it("hash-binds synthetic pass and failure results without raw output", () => {
    const fragmentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phase2-threat-results-"));
    try {
      const fragment = executeTask({
        plan: "02-01",
        task: 2,
        definitions: loadDefinitions(),
        fragmentRoot,
        completedAt: "2020-01-01T00:00:00.000Z",
        runCommand: (command) => ({
          exitStatus: command.includes("test:privacy") ? 1 : 0,
          output: Buffer.from("bounded synthetic output"),
          errorOutput: Buffer.from("bounded synthetic error"),
        }),
      });

      expect(fragment.results["T-02-01"].status).toBe("passed");
      expect(fragment.results["T-02-02"].status).toBe("failed");
      expect(Object.keys(fragment.results["T-02-01"].evidence).sort()).toEqual([
        "error_output_bytes",
        "error_output_sha256",
        "output_bytes",
        "output_sha256",
      ]);
      expect(JSON.stringify(fragment)).not.toContain("bounded synthetic output");
      expect(fs.existsSync(path.join(fragmentRoot, "02-01.json"))).toBe(true);
    } finally {
      fs.rmSync(fragmentRoot, { recursive: true, force: true });
    }
  });

  it("rejects unknown IDs and raw output fields before a fragment is accepted", () => {
    const definitions = loadDefinitions();
    expect(() => validateDefinitionLedger(definitions)).not.toThrow();
    expect(() => validateFragment({
      schema_version: 1,
      plan: "02-01",
      results: {
        "T-02-99": {
          plan: "02-01",
          task: 2,
          command: "synthetic",
          command_id: "synthetic",
          exit_status: 0,
          completed_at: "2020-01-01T00:00:00.000Z",
          status: "passed",
          evidence: {
            output_sha256: "digest",
            error_output_sha256: "digest",
            output_bytes: 0,
            error_output_bytes: 0,
            stdout: "raw output",
          },
        },
      },
    }, "02-01", definitions)).toThrow(/unknown|prohibited/i);
  });
});

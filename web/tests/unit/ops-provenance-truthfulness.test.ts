import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fromWebRoot = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("operator provenance truthfulness", () => {
  it("does not render a synthetic episode catalogue when the canonical source is unavailable", () => {
    const source = fromWebRoot("components/domain/ops/episodes/EpisodesCatalogWorkspace.tsx");

    expect(source).not.toContain("mockEpisodes");
    expect(source).not.toContain("catalogueEndpoint");
    expect(source).toContain("No episode data is shown.");
    expect(source).toContain("this is a title map, not a live catalogue");
  });

  it("does not invent ingest jobs when the job endpoint is empty or missing", () => {
    const source = fromWebRoot("components/domain/ops/ingest/IngestionJobLedger.tsx");

    expect(source).not.toContain("initialMockJobs");
    expect(source).not.toContain("job_01J6G7M8N9P0Q1R2S3T4U5J001");
    expect(source).toContain("no ingest jobs. none were inferred.");
  });

  it("does not substitute fixture provenance or simulated transcript activation", () => {
    const detailPage = fromWebRoot("app/(operator)/ops/episodes/[id]/page.tsx");
    const transcriptViewer = fromWebRoot("components/domain/ops/episodes/TranscriptStagingViewer.tsx");

    expect(detailPage).toContain("no verified provenance record");
    expect(detailPage).not.toContain("fallbackProvenance");
    expect(transcriptViewer).toContain("No transcript version or vector state changed.");
    expect(transcriptViewer).not.toContain("cutover simulated");
  });

  it("keeps public episode links bounded to explicit catalogue mappings", () => {
    const source = fromWebRoot("components/domain/ops/episodes/EpisodesCatalogWorkspace.tsx");

    expect(source).toContain("publicEpisodeIdForCatalogueTitle");
    expect(source).toContain("not linked");
    expect(source).toContain("/episodes/");
  });
});

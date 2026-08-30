import { describe, expect, it } from "vitest";
import { currentReleaseNavigation, releaseRoadmapNavigation } from "@/lib/public/current-release-nav";

describe("current-release ungated navigation", () => {
  it("lists active build pages as primary clickable destinations", () => {
    expect(currentReleaseNavigation.map((item) => item.href)).toEqual([
      "/",
      "/episodes",
      "/connections",
      "/chat",
      "/ops",
      "/ops/production",
      "/ops/episodes",
      "/ops/settings",
    ]);
  });

  it("keeps public rooms and active ops in workspace with settings as administration", () => {
    expect(
      currentReleaseNavigation.map((item) => [item.href, item.section]),
    ).toEqual([
      ["/", "workspace"],
      ["/episodes", "workspace"],
      ["/connections", "workspace"],
      ["/chat", "workspace"],
      ["/ops", "workspace"],
      ["/ops/production", "workspace"],
      ["/ops/episodes", "workspace"],
      ["/ops/settings", "administration"],
    ]);
  });

  it("keeps held surfaces in the roadmap instead of the primary dock", () => {
    expect(releaseRoadmapNavigation.map((item) => item.href)).toEqual([
      "/ops/ingest",
      "/ops/operators",
      "/ops/audit",
    ]);
  });
});

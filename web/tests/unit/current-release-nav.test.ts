import { describe, expect, it } from "vitest";
import { currentReleaseNavigation, releaseRoadmapNavigation } from "@/lib/public/current-release-nav";

describe("current-release ungated navigation", () => {
  it("lists active build pages as primary clickable destinations", () => {
    expect(currentReleaseNavigation.map((item) => item.href)).toEqual([
      "/",
      "/episodes",
      "/connections",
      "/chat",
      "/beta/ops",
      "/beta/ops/production",
      "/beta/ops/episodes",
      "/beta/ops/settings",
      "/beta/ops/chat",
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
      ["/beta/ops", "workspace"],
      ["/beta/ops/production", "workspace"],
      ["/beta/ops/episodes", "workspace"],
      ["/beta/ops/settings", "administration"],
      ["/beta/ops/chat", "administration"],
    ]);
  });

  it("keeps held surfaces in the roadmap instead of the primary dock", () => {
    expect(releaseRoadmapNavigation.map((item) => item.href)).toEqual([
      "/beta/ops/ingest",
      "/beta/ops/operators",
      "/beta/ops/audit",
    ]);
  });
});

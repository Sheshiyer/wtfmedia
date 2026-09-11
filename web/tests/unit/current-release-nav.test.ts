import { describe, expect, it } from "vitest";
import { currentReleaseNavigation, releaseRoadmapNavigation } from "@/lib/public/current-release-nav";

describe("current-release ungated navigation", () => {
  it("lists active build pages as primary clickable destinations", () => {
    expect(currentReleaseNavigation.map((item) => item.href)).toEqual([
      "/",
      "/episodes",
      "/connections",
      "/chat",
      "/beta/workspace",
      "/beta/workspace/production",
      "/beta/workspace/episodes",
      "/beta/settings",
      "/beta/chat",
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
      ["/beta/workspace", "workspace"],
      ["/beta/workspace/production", "workspace"],
      ["/beta/workspace/episodes", "workspace"],
      ["/beta/settings", "administration"],
      ["/beta/chat", "administration"],
    ]);
  });

  it("keeps held surfaces in the roadmap instead of the primary dock", () => {
    expect(releaseRoadmapNavigation.map((item) => item.href)).toEqual([
      "/beta/workspace/ingest",
      "/beta/admin/users",
      "/beta/admin/audit",
    ]);
  });
});

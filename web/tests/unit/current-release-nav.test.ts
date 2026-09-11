import { describe, expect, it } from "vitest";
import { currentReleaseNavigation, releaseRoadmapNavigation } from "@/lib/public/current-release-nav";

describe("current-release ungated navigation", () => {
  it("lists active build pages as primary clickable destinations", () => {
    expect(currentReleaseNavigation.map((item) => item.href)).toEqual([
      "/",
      "/episodes",
      "/connections",
      "/beta/workspace",
      "/beta/workspace/production",
      "/beta/workspace/episodes",
      "/beta/settings",
      "/beta/chat",
    ]);
  });

  it("leads with ask wtf at the chat home and keeps the room unlinked", () => {
    expect(currentReleaseNavigation[0]).toMatchObject({ href: "/", label: "ask wtf" });
    expect(currentReleaseNavigation.some((item) => item.label === "the room")).toBe(false);
    expect(currentReleaseNavigation.some((item) => item.href === "/chat")).toBe(false);
  });

  it("keeps public rooms and active ops in workspace with settings as administration", () => {
    expect(
      currentReleaseNavigation.map((item) => [item.href, item.section]),
    ).toEqual([
      ["/", "workspace"],
      ["/episodes", "workspace"],
      ["/connections", "workspace"],
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

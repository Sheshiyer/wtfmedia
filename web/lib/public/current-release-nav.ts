import type { AppNavItem } from "@/components/shells/AppRail";

/**
 * Temporary public-link release: only active build surfaces sit in primary nav.
 * Mutation APIs (ingest, roster writes, audit export, delete) stay fail-closed.
 *
 * The home route IS the ask-wtf chat surface, so "ask wtf" leads the nav at
 * "/" and the old "the room" home is no longer linked.
 */
export const currentReleaseNavigation: readonly AppNavItem[] = [
  { href: "/", label: "ask wtf", section: "workspace" },
  { href: "/episodes", label: "episodes", section: "workspace" },
  { href: "/connections", label: "connections", section: "workspace" },
  { href: "/ops", label: "control room", section: "workspace" },
  { href: "/ops/production", label: "production", section: "workspace" },
  { href: "/ops/episodes", label: "episode map", section: "workspace" },
  { href: "/ops/settings", label: "settings", section: "administration" },
];

export const releaseRoadmapNavigation = [
  { href: "/ops/ingest", label: "ingest" },
  { href: "/ops/operators", label: "operators" },
  { href: "/ops/audit", label: "audit" },
] as const;

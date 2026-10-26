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
  { href: "/beta/workspace", label: "control room", section: "workspace" },
  { href: "/beta/workspace/production", label: "production", section: "workspace" },
  { href: "/beta/workspace/episodes", label: "episode map", section: "workspace" },
  { href: "/beta/settings", label: "settings", section: "administration" },
  { href: "/beta/chat", label: "chat history", section: "administration" },
];

export const releaseRoadmapNavigation = [
  { href: "/beta/workspace/ingest", label: "ingest" },
  { href: "/beta/admin/users", label: "operators" },
  { href: "/beta/admin/audit", label: "audit" },
] as const;

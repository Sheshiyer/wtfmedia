import type { AppNavItem } from "@/components/shells/AppRail";

/**
 * Temporary public-link release: only active build surfaces sit in primary nav.
 * Mutation APIs (ingest, roster writes, audit export, delete) stay fail-closed.
 */
export const currentReleaseNavigation: readonly AppNavItem[] = [
  { href: "/", label: "the room", section: "workspace" },
  { href: "/episodes", label: "episodes", section: "workspace" },
  { href: "/connections", label: "connections", section: "workspace" },
  { href: "/chat", label: "ask wtf", section: "workspace" },
  { href: "/beta/ops", label: "control room", section: "workspace" },
  { href: "/beta/ops/production", label: "production", section: "workspace" },
  { href: "/beta/ops/episodes", label: "episode map", section: "workspace" },
  { href: "/beta/ops/settings", label: "settings", section: "administration" },
  { href: "/beta/ops/chat", label: "chat history", section: "administration" },
];

export const releaseRoadmapNavigation = [
  { href: "/beta/ops/ingest", label: "ingest" },
  { href: "/beta/ops/operators", label: "operators" },
  { href: "/beta/ops/audit", label: "audit" },
] as const;

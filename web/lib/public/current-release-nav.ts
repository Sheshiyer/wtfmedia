import type { AppNavItem } from "@/components/shells/AppRail";

/**
 * Ask WTF is the only signed-out workspace. Other destinations are supplied
 * by the admitted Beta principal's capability-filtered navigation.
 */
export const currentReleaseNavigation: readonly AppNavItem[] = [
  { href: "/chat", label: "ask wtf", section: "workspace" },
];

export const releaseRoadmapNavigation = [
  { href: "/beta/workspace/ingest", label: "ingest" },
  { href: "/beta/admin/users", label: "operators" },
  { href: "/beta/admin/audit", label: "audit" },
] as const;

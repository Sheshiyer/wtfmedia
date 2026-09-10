import type { AppNavGroup, AppNavItem } from "@/components/shells/AppShell";

export type MemberDestination = "ask" | "settings" | null;

export const memberBottomNavigation: readonly AppNavItem[] = [
  { href: "/beta", label: "ask wtf", match: ["/beta", "/beta/chat/*"] },
  { href: "/beta/settings", label: "settings", match: ["/beta/settings*"] },
];

export const memberDisclosureGroups: readonly AppNavGroup[] = [
  {
    label: "Beta workspace",
    items: [
      memberBottomNavigation[0],
      memberBottomNavigation[1],
    ],
  },
  {
    label: "Public Alpha",
    items: [
      { href: "/", label: "room", match: ["/"] },
      { href: "/episodes", label: "episodes", match: ["/episodes*"] },
      { href: "/connections", label: "connections", match: ["/connections*"] },
      { href: "/chat", label: "ask wtf", match: ["/chat*"] },
    ],
  },
];

export function memberDestinationForPath(pathname: string): MemberDestination {
  if (pathname === "/beta" || pathname.startsWith("/beta/chat/")) return "ask";
  if (pathname === "/beta/settings" || pathname.startsWith("/beta/settings/")) return "settings";
  return null;
}

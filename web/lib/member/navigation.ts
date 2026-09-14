import type { AppNavGroup, AppNavItem } from "@/components/shells/AppShell";

export type MemberDestination = "ask" | "settings" | null;

export const memberBottomNavigation: readonly AppNavItem[] = [
  { href: "/beta", label: "ask wtf", icon: "chat", match: ["/beta", "/beta/chat/*"] },
  { href: "/beta/settings", label: "settings", icon: "settings", match: ["/beta/settings*"] },
];

export const memberDisclosureGroups: readonly AppNavGroup[] = [
  {
    label: "Beta workspace",
    items: [
      memberBottomNavigation[0],
      memberBottomNavigation[1],
    ],
  },
];

export function memberDestinationForPath(pathname: string): MemberDestination {
  if (pathname === "/beta" || pathname.startsWith("/beta/chat/")) return "ask";
  if (pathname === "/beta/settings" || pathname.startsWith("/beta/settings/")) return "settings";
  return null;
}

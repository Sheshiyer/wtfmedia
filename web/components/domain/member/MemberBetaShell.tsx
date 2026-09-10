import { ClerkLogoutButton } from "@/components/domain/ops/ClerkLogoutButton";
import { AppShell, type AppNavItem } from "@/components/shells/AppShell";

const memberNavigation: readonly AppNavItem[] = [
  { href: "/beta", label: "ask wtf", section: "workspace" },
  { href: "/beta#history", label: "sessions", section: "workspace" },
  { href: "/beta#memory", label: "memory", section: "workspace" },
];

export function MemberBetaShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-member-shell="true">
      <AppShell
        mode="member"
        navigation={memberNavigation}
        utility={<ClerkLogoutButton />}
      >
        {children}
      </AppShell>
    </div>
  );
}

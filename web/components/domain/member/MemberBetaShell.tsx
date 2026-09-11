import { ClerkLogoutButton } from "@/components/domain/ops/ClerkLogoutButton";
import { AppShell, type AppNavItem } from "@/components/shells/AppShell";
import { memberBottomNavigation, memberDisclosureGroups } from "@/lib/member/navigation";

const memberNavigation: readonly AppNavItem[] = memberBottomNavigation;

export function MemberBetaShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-member-shell="true">
      <AppShell
        mode="member"
        navigation={memberNavigation}
        bottomNavigation={memberBottomNavigation}
        disclosureGroups={memberDisclosureGroups}
        utility={<ClerkLogoutButton />}
      >
        {children}
      </AppShell>
    </div>
  );
}

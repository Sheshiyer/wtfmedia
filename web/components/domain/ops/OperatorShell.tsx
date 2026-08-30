import { AppShell, type AppShellProps } from "@/components/shells/AppShell";
import type { OpsDestination } from "@/lib/ops/policy";

export function OperatorShell({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav: Array<{ label: string; href: OpsDestination }>;
}) {
  const navigation: AppShellProps["navigation"] = nav.map((item) => ({
    ...item,
    label: item.label.toLowerCase(),
    section: item.href === "/ops" || item.href === "/ops/production" ? "workspace" : "administration",
  }));
  return (
    <div data-ops-shell="true">
      <AppShell mode="operator" navigation={navigation}>
        {children}
      </AppShell>
    </div>
  );
}

import { AppShell, type AppNavItem, type AppShellProps } from "@/components/shells/AppShell";

export function OperatorShell({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav: readonly AppNavItem[];
}) {
  const workspaceHrefs = new Set([
    "/",
    "/episodes",
    "/connections",
    "/chat",
    "/ops",
    "/ops/production",
    "/ops/episodes",
  ]);
  const navigation: AppShellProps["navigation"] = nav.map((item) => ({
    ...item,
    label: item.label.toLowerCase(),
    section:
      item.section ??
      (workspaceHrefs.has(item.href) ? "workspace" : "administration"),
  }));
  return (
    <div data-ops-shell="true">
      <AppShell mode="operator" navigation={navigation}>
        {children}
      </AppShell>
    </div>
  );
}

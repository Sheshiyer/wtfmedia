import Link from "next/link";
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
    section: item.href === "/ops" ? "workspace" : "administration",
  }));
  const utility = (
    <div className="space-y-1 font-label text-sm font-semibold lowercase">
      <Link
        href="/"
        className="block min-h-11 border-2 border-transparent px-3 py-2 text-canvas hover:border-canvas/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
      >
        public workspaces
      </Link>
      <Link
        href="/ops/recover?mode=signing-out"
        className="block min-h-11 border-2 border-transparent px-3 py-2 text-canvas hover:border-canvas/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
      >
        sign out
      </Link>
    </div>
  );

  return (
    <div data-ops-shell="true">
      <AppShell mode="operator" navigation={navigation} utility={utility}>
        {children}
      </AppShell>
    </div>
  );
}

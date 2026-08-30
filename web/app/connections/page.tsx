import { publicUiVariant } from "@/lib/public/public-ui-variant";
import LegacyConnectionsPage from "@/components/legacy/public/LegacyConnectionsPage";
import MigratedConnectionsPage from "@/components/domain/public/MigratedConnectionsPage";

export const metadata = { title: "connections · wtf os" };

export default function ConnectionsPage() {
  const variant = publicUiVariant();
  return variant === "migrated" ? (
    <MigratedConnectionsPage />
  ) : (
    <LegacyConnectionsPage />
  );
}

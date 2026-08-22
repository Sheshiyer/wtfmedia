import { publicUiVariant } from "@/lib/public/public-ui-variant";
import LegacyEpisodesPage from "@/components/legacy/public/LegacyEpisodesPage";
import MigratedEpisodesPage from "@/components/domain/public/MigratedEpisodesPage";

export const metadata = { title: "Episodes · wtfmedia" };

export default function EpisodesPage() {
  const variant = publicUiVariant();
  if (variant === "migrated") return <MigratedEpisodesPage />;
  return <LegacyEpisodesPage />;
}

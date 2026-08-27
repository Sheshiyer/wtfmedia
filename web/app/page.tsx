import { publicUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyHomePage } from "@/components/legacy/public/LegacyHomePage";
import { MigratedHomePage } from "@/components/domain/public/MigratedHomePage";

/**
 * Home route — dual-variant seam.
 *
 * Reads WTF_PUBLIC_UI_VARIANT server-side.  The selector is never
 * serialized to the client, exposed in the DOM, or included in URLs.
 */
export default function HomePage() {
  const variant = publicUiVariant();

  if (variant === "migrated") {
    return <MigratedHomePage />;
  }

  return <LegacyHomePage />;
}

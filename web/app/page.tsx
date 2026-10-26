import { publicUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyHomePage } from "@/components/legacy/public/LegacyHomePage";
import MigratedChatPage from "@/components/domain/public/MigratedChatPage";

export const metadata = { title: "ask wtf · wtf os" };

/**
 * Home route — dual-variant seam.
 *
 * Reads WTF_PUBLIC_UI_VARIANT server-side.  The selector is never
 * serialized to the client, exposed in the DOM, or included in URLs.
 *
 * The migrated home IS the chat surface: asking is the primary act, so "/"
 * renders the same ask-wtf experience as /chat (which stays live for
 * existing links). The legacy rollback keeps its established home page.
 */
export default function HomePage() {
  const variant = publicUiVariant();

  if (variant === "migrated") {
    return <MigratedChatPage />;
  }

  return <LegacyHomePage />;
}

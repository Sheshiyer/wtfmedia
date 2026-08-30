import { publicUiVariant } from "@/lib/public/public-ui-variant";
import LegacyChatPage from "@/components/legacy/public/LegacyChatPage";
import MigratedChatPage from "@/components/domain/public/MigratedChatPage";

export const metadata = { title: "ask wtf · wtf os" };

export default function ChatPage() {
  const variant = publicUiVariant();
  return variant === "migrated" ? (
    <MigratedChatPage />
  ) : (
    <LegacyChatPage />
  );
}

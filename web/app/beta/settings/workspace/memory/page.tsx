import { redirect } from "next/navigation";

export default function LegacyWorkspaceMemorySettingsPage() {
  redirect("/beta/settings/memory");
}

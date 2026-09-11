import { redirect } from "next/navigation";

export default function LegacyWorkspaceSessionsSettingsPage() {
  redirect("/beta/settings/sessions");
}

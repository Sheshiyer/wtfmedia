import { redirect } from "next/navigation";

// Session audit moved into the settings sections.
export default function BetaAdminSessionsPage() {
  redirect("/beta/settings/user-sessions");
}

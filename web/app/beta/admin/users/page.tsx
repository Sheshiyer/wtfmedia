import { redirect } from "next/navigation";

// Users administration moved into the settings sections.
export default function BetaUsersPage() {
  redirect("/beta/settings/users");
}

import { ClerkSignInPage } from "@/components/domain/ops/ClerkAuthPage";
import { clerkRedirectTarget } from "@/lib/ops/clerk-url";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  return <ClerkSignInPage redirectTo={clerkRedirectTarget(params.redirect_url)} />;
}

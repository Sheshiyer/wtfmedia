import { ClerkSignUpPage } from "@/components/domain/ops/ClerkAuthPage";
import { clerkRedirectTarget } from "@/lib/ops/clerk-url";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  return <ClerkSignUpPage redirectTo={clerkRedirectTarget(params.redirect_url)} />;
}

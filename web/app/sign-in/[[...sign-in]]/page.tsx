import { ClerkSignInPage } from "@/components/domain/ops/ClerkAuthPage";
import { clerkRedirectTarget } from "@/lib/ops/clerk-url";
import { headers } from "next/headers";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const requestOrigin = host ? `${protocol}://${host}` : null;
  return <ClerkSignInPage redirectTo={clerkRedirectTarget(params.redirect_url, requestOrigin)} />;
}

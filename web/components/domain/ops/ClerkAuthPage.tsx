import { SignIn, SignUp } from "@clerk/nextjs";
import { AccessRecovery } from "./AccessRecovery";
import { OperatorAuthFrame } from "./OperatorAuthFrame";
import { MEMBER_BETA_RETURN_TO, OPERATOR_RETURN_TO } from "@/lib/ops/clerk-url";

function AuthUnavailable() {
  return <AccessRecovery mode="unavailable" returnTo="/ops" />;
}

export function ClerkSignInPage({ redirectTo = OPERATOR_RETURN_TO }: { redirectTo?: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AuthUnavailable />;
  return (
    <OperatorAuthFrame mode="sign-in" audience={redirectTo === MEMBER_BETA_RETURN_TO ? "member" : "operator"}>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`}
        forceRedirectUrl={redirectTo}
        signUpForceRedirectUrl={redirectTo}
        fallbackRedirectUrl={OPERATOR_RETURN_TO}
        appearance={clerkAppearance}
      />
    </OperatorAuthFrame>
  );
}

export function ClerkSignUpPage({ redirectTo = OPERATOR_RETURN_TO }: { redirectTo?: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AuthUnavailable />;
  return (
    <OperatorAuthFrame mode="sign-up" audience={redirectTo === MEMBER_BETA_RETURN_TO ? "member" : "operator"}>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`}
        forceRedirectUrl={redirectTo}
        signInForceRedirectUrl={redirectTo}
        fallbackRedirectUrl={OPERATOR_RETURN_TO}
        appearance={clerkAppearance}
      />
    </OperatorAuthFrame>
  );
}

const clerkAppearance = {
  variables: {
    colorPrimary: "var(--wtf-editorial)",
    colorText: "var(--wtf-foreground)",
    colorTextSecondary: "var(--wtf-text-secondary)",
    colorBackground: "var(--wtf-canvas)",
    colorInputBackground: "var(--wtf-canvas)",
    colorInputText: "var(--wtf-foreground)",
    borderRadius: "var(--wtf-radius-control)",
    fontFamily: "var(--wtf-font-body)",
  },
  elements: {
    rootBox: "w-full",
    card: "w-full bg-transparent p-0 shadow-none",
    headerTitle: "font-heading text-2xl font-bold tracking-tight",
    headerSubtitle: "font-body text-sm text-secondary",
    formFieldLabel: "font-label text-xs font-bold uppercase tracking-wide",
    formFieldInput: "min-h-11 border-2 border-foreground bg-canvas font-body shadow-none",
    formButtonPrimary:
      "min-h-11 rounded-control border-2 border-foreground bg-editorial font-label text-sm font-bold text-on-editorial shadow-[4px_4px_0_var(--wtf-foreground)] hover:bg-editorial",
    socialButtonsBlockButton:
      "min-h-11 rounded-control border-2 border-foreground bg-surface-raised font-label text-sm font-bold text-foreground shadow-none",
    footerActionLink: "font-label font-bold text-editorial underline underline-offset-4",
    identityPreviewEditButton: "text-editorial",
  },
};

import { SignIn, SignUp } from "@clerk/nextjs";
import { AccessRecovery } from "./AccessRecovery";
import { OperatorAuthFrame } from "./OperatorAuthFrame";
import { OPERATOR_RETURN_TO } from "@/lib/ops/clerk-url";

function AuthUnavailable() {
  return <AccessRecovery mode="unavailable" returnTo="/ops" />;
}

export function ClerkSignInPage({ redirectTo = OPERATOR_RETURN_TO }: { redirectTo?: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AuthUnavailable />;
  return (
    <OperatorAuthFrame mode="sign-in">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
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
    <OperatorAuthFrame mode="sign-up">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
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
    colorPrimary: "var(--wtf-attention)",
    colorText: "var(--wtf-foreground)",
    colorTextSecondary: "var(--wtf-text-secondary)",
    colorBackground: "var(--wtf-surface-raised)",
    colorInputBackground: "var(--wtf-canvas)",
    colorInputText: "var(--wtf-foreground)",
    borderRadius: "var(--wtf-radius-control)",
    fontFamily: "var(--wtf-font-body)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full gap-4 border-0 bg-transparent p-0 shadow-none",
    header: "gap-1",
    headerTitle: "font-heading text-xl font-bold lowercase tracking-tight text-foreground",
    headerSubtitle: "font-body text-sm text-secondary",
    formFieldLabel: "font-label text-xs font-bold uppercase tracking-wide text-foreground",
    formFieldInput:
      "min-h-11 rounded-control border-2 border-foreground bg-canvas font-body text-foreground shadow-none focus:border-knowledge",
    formButtonPrimary:
      "min-h-11 rounded-control border-2 border-foreground bg-attention font-label text-sm font-bold lowercase tracking-wide text-on-attention shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.18)] hover:bg-attention/85",
    socialButtonsBlockButton:
      "min-h-11 rounded-control border-2 border-foreground bg-canvas font-label text-sm font-bold text-foreground shadow-none hover:bg-surface-subtle",
    footerActionLink: "font-label font-bold text-knowledge underline underline-offset-4",
    identityPreviewEditButton: "text-knowledge",
    otpCodeFieldInput: "border-2 border-foreground bg-canvas shadow-none",
    formFieldInputShowPasswordButton: "text-secondary hover:text-foreground",
    dividerLine: "bg-foreground/20",
    dividerText: "font-label text-xs text-muted",
    footer: "bg-transparent",
  },
};

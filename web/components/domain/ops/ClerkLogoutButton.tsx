"use client";

import { useClerk } from "@clerk/nextjs";

const className = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-foreground bg-surface-subtle px-3 py-2 font-label text-xs font-bold lowercase tracking-wide text-foreground transition-colors hover:bg-attention hover:text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-sm";
const recoveryUrl = "/ops/recover?mode=verification-unavailable&returnTo=/beta/settings/account";
type ClerkSignOut = (options: { redirectUrl: string }) => Promise<unknown>;

function clearProtectedState() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let index = store.length - 1; index >= 0; index -= 1) {
      const key = store.key(index);
      if (key?.startsWith("wtf-ops:") || key?.startsWith("wtfmedia:authenticated-chat:")) store.removeItem(key);
    }
  }
}

function recoverFromUnavailableLogout() {
  window.location.replace(recoveryUrl);
}

function beginLogout(signOut: ClerkSignOut | null) {
  clearProtectedState();
  if (!signOut) {
    recoverFromUnavailableLogout();
    return;
  }
  try {
    void signOut({ redirectUrl: "/" }).catch(recoverFromUnavailableLogout);
  } catch {
    recoverFromUnavailableLogout();
  }
}

function browserClerkSignOut(): ClerkSignOut | null {
  const clerk = (window as unknown as { Clerk?: { signOut?: ClerkSignOut } }).Clerk;
  return typeof clerk?.signOut === "function" ? clerk.signOut.bind(clerk) : null;
}

function ClerkEnabledLogoutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      data-operator-logout
      data-auth-logout
      className={className}
      onClick={() => beginLogout(signOut)}
    >
      log out to public alpha
    </button>
  );
}

export function ClerkLogoutButton() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <button type="button" data-operator-logout data-auth-logout className={className} onClick={() => beginLogout(browserClerkSignOut())}>log out to public alpha</button>;
  }
  return <ClerkEnabledLogoutButton />;
}

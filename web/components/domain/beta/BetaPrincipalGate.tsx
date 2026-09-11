"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";
import { ClerkLogoutButton } from "@/components/domain/ops/ClerkLogoutButton";
import { AppShell, type AppNavItem } from "@/components/shells/AppShell";
import { audienceForRole, betaDestinationForPath, capabilityForBetaPath } from "@/lib/beta/navigation";
import { parsePrincipalContext, principalCanAccess, type PrincipalContext } from "@/lib/beta/principal";
import { memberBottomNavigation, memberDisclosureGroups } from "@/lib/member/navigation";
import { memberInvitationTicket } from "@/lib/ops/clerk-url";

type MemberFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const MemberFetchContext = createContext<MemberFetch | null>(null);
const PrincipalContextValue = createContext<PrincipalContext | null>(null);

export function useMemberFetch(): MemberFetch {
  const value = useContext(MemberFetchContext);
  if (!value) throw new Error("member_api_unavailable");
  return value;
}

export function useBetaPrincipal(): PrincipalContext {
  const value = useContext(PrincipalContextValue);
  if (!value) throw new Error("principal_context_required");
  return value;
}

const memberNavigation: readonly AppNavItem[] = memberBottomNavigation;
const operatorNavigation: readonly AppNavItem[] = [
  { href: "/beta/workspace", label: "control room", section: "workspace" },
  { href: "/beta/workspace/production", label: "production", section: "workspace" },
  { href: "/beta/workspace/episodes", label: "episodes", section: "workspace" },
  { href: "/beta/workspace/ingest", label: "ingest", section: "workspace" },
  { href: "/beta/settings", label: "settings", section: "administration" },
  { href: "/beta/admin/users", label: "users", section: "administration" },
  { href: "/beta/admin/audit", label: "audit", section: "administration" },
];

type OperatorRole = "editor" | "admin" | "super_admin";
function isOperatorRole(role: PrincipalContext["role"]): role is OperatorRole {
  return role === "editor" || role === "admin" || role === "super_admin";
}

function Shell({ context, children }: { context: PrincipalContext; children: React.ReactNode }) {
  const navigation = context.kind === "member" ? memberNavigation : operatorNavigation.filter((item) => {
    const capability = capabilityForBetaPath(item.href);
    return capability ? context.capabilities.includes(capability) : false;
  });
  return <AppShell
    mode={context.kind === "member" ? "member" : "operator"}
    navigation={navigation}
    bottomNavigation={context.kind === "member" ? memberBottomNavigation : undefined}
    disclosureGroups={context.kind === "member" ? memberDisclosureGroups : undefined}
    utility={<ClerkLogoutButton />}
  >{children}</AppShell>;
}

function GateState({ heading, body, retry }: { heading: string; body: string; retry?: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-canvas px-4 py-8"><section className="w-full max-w-xl border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.14)]"><p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">beta access</p><h1 className="mt-2 font-heading text-3xl font-bold lowercase">{heading}</h1><p className="mt-3 text-sm leading-6 text-secondary">{body}</p>{retry ? <button type="button" onClick={retry} className="mt-5 min-h-11 border-2 border-foreground bg-attention px-4 font-label text-sm font-bold text-on-attention">try again</button> : null}</section></main>;
}

export function BetaPrincipalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/beta";
  const invitationTicket = useSearchParams().get("__clerk_ticket");
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [principal, setPrincipal] = useState<PrincipalContext | null>(null);
  const identityKey = isSignedIn && userId && sessionId ? `${userId}:${sessionId}` : "signed-out";
  const admissionKey = `${identityKey}:${pathname}`;
  const [admittedKey, setAdmittedKey] = useState<string | null>(null);

  const fetchWithSession = useCallback<MemberFetch>(async (input, init) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers, cache: "no-store" });
  }, [getToken]);

  const admit = useCallback(async () => {
    // Clear the previous admission before every pathname/session check. This
    // prevents protected content from flashing while a new principal is verified.
    setPrincipal(null);
    setAdmittedKey(null);
    setState("loading");
    if (!isSignedIn) {
      const ticket = memberInvitationTicket(invitationTicket);
      router.replace(ticket ? `/sign-up?redirect_url=${encodeURIComponent(pathname)}&__clerk_ticket=${encodeURIComponent(ticket)}` : `/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }
    setState("loading");
    try {
      const response = await fetchWithSession("/beta/api/principal-context");
      if (response.status === 401) {
        router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
        return;
      }
      if (response.status === 403) { setState("denied"); return; }
      const parsed = response.ok ? parsePrincipalContext(await response.json()) : null;
      if (!parsed) { setState("unavailable"); return; }
      if (!principalCanAccess(parsed, pathname)) { setState("denied"); return; }
      const destination = betaDestinationForPath(pathname);
      if (pathname.startsWith("/beta") && pathname !== "/beta/api/principal-context" && !destination) { setState("denied"); return; }
      if (destination && (!destination.audiences.includes(audienceForRole(parsed.role)) || !parsed.capabilities.includes(destination.capability))) { setState("denied"); return; }
      setPrincipal(parsed);
      setAdmittedKey(admissionKey);
      setState("ready");
    } catch { setState("unavailable"); }
  }, [admissionKey, fetchWithSession, invitationTicket, isSignedIn, pathname, router]);

  useEffect(() => { if (isLoaded) void admit(); }, [admit, isLoaded]);
  const memberFetch = useMemo(() => fetchWithSession, [fetchWithSession]);

  if (!isLoaded || state === "loading" || !principal || admittedKey !== admissionKey) {
    if (state === "denied") return <GateState heading="access is not granted" body="Your verified account is not allowed to open this Beta route. Nothing private was shown." />;
    if (state === "unavailable") return <GateState heading="workspace unavailable" body="The verified principal context could not be loaded. Nothing private was shown." retry={() => void admit()} />;
    return <GateState heading="opening your workspace" body="Your private workspace appears after server verification." />;
  }

  const value = <PrincipalContextValue.Provider value={principal}><MemberFetchContext.Provider value={memberFetch}><Shell context={principal}>{children}</Shell></MemberFetchContext.Provider></PrincipalContextValue.Provider>;
  return principal.kind === "operator" && isOperatorRole(principal.role)
    ? <OperatorContextProvider value={{ role: principal.role, environment: principal.environment, workspace: "operations", organizationScope: "unknown", lastVerifiedAt: new Date().toISOString(), capabilities: principal.capabilities }}>{value}</OperatorContextProvider>
    : value;
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  { href: "/beta/chat", label: "ask wtf", section: "workspace" },
  { href: "/beta/workspace", label: "control room", section: "workspace" },
  { href: "/beta/workspace/production", label: "production", section: "workspace" },
  { href: "/beta/workspace/episodes", label: "episodes", section: "workspace" },
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
  const bottomNavigation = context.kind === "member"
    ? memberBottomNavigation
    : navigation.filter((item) => item.section === "workspace");
  return <AppShell
    mode={context.kind === "member" ? "member" : "operator"}
    navigation={navigation}
    bottomNavigation={bottomNavigation}
    disclosureGroups={context.kind === "member" ? memberDisclosureGroups : undefined}
    utility={<ClerkLogoutButton />}
  >{children}</AppShell>;
}

function GateState({ heading, body, retry, compact = false }: { heading: string; body: string; retry?: () => void; compact?: boolean }) {
  return <main className={compact ? "mx-auto flex min-h-[12rem] w-full max-w-[var(--wtf-content-max)] items-start px-4 py-10 sm:px-8 xl:px-12" : "grid min-h-screen place-items-center bg-canvas px-4 py-8"}><section className="w-full max-w-xl border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.14)]"><p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">beta access</p><h1 className="mt-2 font-heading text-3xl font-bold lowercase">{heading}</h1><p className="mt-3 text-sm leading-6 text-secondary">{body}</p>{retry ? <button type="button" onClick={retry} className="mt-5 min-h-11 border-2 border-foreground bg-attention px-4 font-label text-sm font-bold text-on-attention">try again</button> : null}</section></main>;
}

function principalCanOpenPath(principal: PrincipalContext, pathname: string): boolean {
  if (!principalCanAccess(principal, pathname)) return false;
  const destination = betaDestinationForPath(pathname);
  if (pathname.startsWith("/beta") && pathname !== "/beta/api/principal-context" && !destination) return false;
  return !destination
    || (destination.audiences.includes(audienceForRole(principal.role)) && principal.capabilities.includes(destination.capability));
}

export function BetaPrincipalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/beta";
  const invitationTicket = useSearchParams().get("__clerk_ticket");
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [principal, setPrincipal] = useState<PrincipalContext | null>(null);
  const principalRef = useRef<PrincipalContext | null>(null);
  const verifiedIdentityKeyRef = useRef<string | null>(null);
  const admissionAttemptRef = useRef(0);
  const identityKey = isSignedIn && userId && sessionId ? `${userId}:${sessionId}` : "signed-out";
  const admissionKey = identityKey;
  const [admittedKey, setAdmittedKey] = useState<string | null>(null);

  const fetchWithSession = useCallback<MemberFetch>(async (input, init) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers, cache: "no-store" });
  }, [getToken]);

  const admit = useCallback(async () => {
    if (principalRef.current !== null && verifiedIdentityKeyRef.current === identityKey) return;
    const attempt = ++admissionAttemptRef.current;
    setAdmittedKey(null);
    setState("loading");
    principalRef.current = null;
    verifiedIdentityKeyRef.current = null;
    setPrincipal(null);
    if (!isSignedIn) {
      const ticket = memberInvitationTicket(invitationTicket);
      router.replace(ticket ? `/sign-up?redirect_url=${encodeURIComponent(pathname)}&__clerk_ticket=${encodeURIComponent(ticket)}` : `/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      const response = await fetchWithSession("/beta/api/principal-context");
      if (attempt !== admissionAttemptRef.current) return;
      if (response.status === 401) {
        principalRef.current = null;
        verifiedIdentityKeyRef.current = null;
        setPrincipal(null);
        setAdmittedKey(null);
        setState("loading");
        router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
        return;
      }
      if (response.status === 403) { setState("denied"); return; }
      const parsed = response.ok ? parsePrincipalContext(await response.json()) : null;
      if (!parsed) { setState("unavailable"); return; }
      principalRef.current = parsed;
      verifiedIdentityKeyRef.current = identityKey;
      setPrincipal(parsed);
      setAdmittedKey(admissionKey);
      setState("ready");
    } catch {
      if (attempt === admissionAttemptRef.current) setState("unavailable");
    }
  }, [admissionKey, fetchWithSession, identityKey, invitationTicket, isSignedIn, pathname, router]);

  useEffect(() => { if (isLoaded) void admit(); }, [admit, isLoaded]);
  const memberFetch = useMemo(() => fetchWithSession, [fetchWithSession]);

  if (!isLoaded || !principal || verifiedIdentityKeyRef.current !== identityKey) {
    if (state === "denied") return <GateState heading="access is not granted" body="Your verified account is not allowed to open this Beta route. Nothing private was shown." />;
    if (state === "unavailable") return <GateState heading="workspace unavailable" body="The verified principal context could not be loaded. Nothing private was shown." retry={() => void admit()} />;
    return <GateState compact heading="checking access" body="Your private workspace appears after server verification." />;
  }

  if (state === "denied" || !principalCanOpenPath(principal, pathname)) return <GateState heading="access is not granted" body="Your verified account is not allowed to open this Beta route. Nothing private was shown." />;
  if (state === "unavailable") return <GateState heading="workspace unavailable" body="The verified principal context could not be loaded. Nothing private was shown." retry={() => void admit()} />;

  const renderWithPrincipal = (content: React.ReactNode) => {
    const value = <PrincipalContextValue.Provider value={principal}><MemberFetchContext.Provider value={memberFetch}><Shell context={principal}>{content}</Shell></MemberFetchContext.Provider></PrincipalContextValue.Provider>;
    return principal.kind === "operator" && isOperatorRole(principal.role)
      ? <OperatorContextProvider value={{ role: principal.role, environment: principal.environment, workspace: "operations", organizationScope: "unknown", lastVerifiedAt: new Date().toISOString(), capabilities: principal.capabilities }}>{value}</OperatorContextProvider>
      : value;
  };

  if (state === "loading" || admittedKey !== admissionKey) return <GateState compact heading="checking access" body="Your private workspace appears after server verification." />;
  return renderWithPrincipal(children);
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { OperatorContextProvider } from "@/components/domain/ops/OperatorContextProvider";
import { AppShell, type AppNavItem } from "@/components/shells/AppShell";
import { audienceForRole, betaDestinationForPath, capabilityForBetaPath, isBetaDestinationVisible } from "@/lib/beta/navigation";
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
  { href: "/beta/connections", label: "connections", section: "workspace" },
  { href: "/beta/analytics", label: "youtube analytics", section: "workspace" },
  { href: "/beta/research", label: "research", section: "workspace" },
  { href: "/beta/workspace/production", label: "production", section: "workspace" },
  { href: "/beta/social-analytics", label: "social media analytics", section: "workspace" },
  { href: "/beta/settings", label: "settings", section: "administration" },
];

type OperatorRole = "editor" | "admin" | "super_admin";
function isOperatorRole(role: PrincipalContext["role"]): role is OperatorRole {
  return role === "editor" || role === "admin" || role === "super_admin";
}

function Shell({ context, children }: { context: PrincipalContext; children: React.ReactNode }) {
  const navigation = context.kind === "member" ? memberNavigation : operatorNavigation.filter((item) => {
    if (!isBetaDestinationVisible(item.href, context.environment)) return false;
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
    disclosureGroups={context.kind === "member" ? memberDisclosureGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => isBetaDestinationVisible(item.href, context.environment) && (item.href !== "/beta/research" || context.capabilities.includes("research:read"))),
    })) : undefined}
  >{children}</AppShell>;
}

function GateState({ heading, body, retry }: { heading: string; body: string; retry?: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-canvas px-4 py-8"><section className="w-full max-w-xl border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.14)]"><p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">beta access</p><h1 className="mt-2 font-heading text-3xl font-bold lowercase">{heading}</h1><p className="mt-3 text-sm leading-6 text-secondary">{body}</p>{retry ? <button type="button" onClick={retry} className="mt-5 min-h-11 border-2 border-foreground bg-attention px-4 font-label text-sm font-bold text-on-attention">try again</button> : null}</section></main>;
}

function ShellLoading() {
  return <main aria-busy="true" className="min-h-screen bg-canvas px-4 py-10 text-foreground sm:px-8"><p className="font-label text-sm font-bold">WTF OS</p><p role="status" className="mt-3 text-sm text-secondary">Loading workspace…</p></main>;
}

function principalCanOpenPath(principal: PrincipalContext, pathname: string): boolean {
  if (!principalCanAccess(principal, pathname)) return false;
  const destination = betaDestinationForPath(pathname);
  if (pathname.startsWith("/beta") && pathname !== "/beta/api/principal-context" && !destination) return false;
  return !destination
    || (destination.audiences.includes(audienceForRole(principal.role)) && principal.capabilities.includes(destination.capability));
}

export function BetaPrincipalGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const identityKey = auth.isSignedIn && auth.userId && auth.sessionId ? `${auth.userId}:${auth.sessionId}` : "signed-out";
  // Reset the entire private subtree even if an unknown session returns as the same account.
  return <SessionPrincipalGate key={identityKey} auth={auth} identityKey={identityKey}>{children}</SessionPrincipalGate>;
}

function SessionPrincipalGate({ children, auth, identityKey }: { children: React.ReactNode; auth: ReturnType<typeof useAuth>; identityKey: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/beta";
  const invitationTicket = useSearchParams().get("__clerk_ticket");
  const { isLoaded, isSignedIn, getToken } = auth;
  const [state, setState] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [principal, setPrincipal] = useState<PrincipalContext | null>(null);
  const principalRef = useRef<PrincipalContext | null>(null);
  const verifiedIdentityKeyRef = useRef<string | null>(null);
  const admissionAttemptRef = useRef(0);
  const activeRef = useRef(true);
  const requestContextRef = useRef({ getToken, pathname, router });
  const admissionKey = identityKey;
  const [admittedKey, setAdmittedKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    requestContextRef.current = { getToken, pathname, router };
  }, [getToken, pathname, router]);

  useLayoutEffect(() => {
    const attempts = admissionAttemptRef;
    activeRef.current = true;
    return () => { activeRef.current = false; attempts.current++; };
  }, []);

  const fetchWithSession = useCallback<MemberFetch>(async (input, init) => {
    const attempt = admissionAttemptRef.current;
    const ensureCurrent = () => {
      if (!activeRef.current || attempt !== admissionAttemptRef.current) throw new Error("session_changed");
    };
    const send = async (skipCache: boolean) => {
      ensureCurrent();
      const headers = new Headers(init?.headers);
      const { getToken } = requestContextRef.current;
      const token = skipCache ? await getToken({ skipCache: true }) : await getToken();
      ensureCurrent();
      if (token) headers.set("authorization", `Bearer ${token}`);
      const response = await fetch(input, { ...init, headers, cache: "no-store" });
      ensureCurrent();
      return response;
    };
    const first = await send(false);
    // A momentarily absent or just-rotated session token must not surface as a
    // user-facing failure: force one fresh token and replay the request once.
    return first.status === 401 ? send(true) : first;
  }, []);

  const admit = useCallback(async () => {
    if (!isLoaded || (isSignedIn && identityKey === "signed-out")) return;
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
      if (attempt !== admissionAttemptRef.current) return;
      if (!parsed) { setState("unavailable"); return; }
      principalRef.current = parsed;
      verifiedIdentityKeyRef.current = identityKey;
      setPrincipal(parsed);
      setAdmittedKey(admissionKey);
      setState("ready");
    } catch {
      if (attempt === admissionAttemptRef.current) setState("unavailable");
    }
  }, [admissionKey, fetchWithSession, identityKey, invitationTicket, isLoaded, isSignedIn, pathname, router]);

  useEffect(() => { if (isLoaded) void admit(); }, [admit, isLoaded]);
  const memberFetch = useCallback<MemberFetch>(async (input, init) => {
    const attempt = admissionAttemptRef.current;
    const response = await fetchWithSession(input, init);
    if (!activeRef.current || attempt !== admissionAttemptRef.current) throw new Error("session_changed");
    if (response.status === 401 || response.status === 403) {
      admissionAttemptRef.current++;
      principalRef.current = null;
      verifiedIdentityKeyRef.current = null;
      setPrincipal(null);
      setAdmittedKey(null);
      setState(response.status === 403 ? "denied" : "loading");
      if (response.status === 401) {
        const { pathname, router } = requestContextRef.current;
        router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      }
    }
    return response;
  }, [fetchWithSession]);

  if (!isLoaded || !principal || verifiedIdentityKeyRef.current !== identityKey) {
    if (state === "denied") return <GateState heading="access is not granted" body="Your verified account is not allowed to open this Beta route. Nothing private was shown." />;
    if (state === "unavailable") return <GateState heading="workspace unavailable" body="The verified principal context could not be loaded. Nothing private was shown." retry={() => void admit()} />;
    return <ShellLoading />;
  }

  if (state === "denied" || !principalCanOpenPath(principal, pathname)) return <GateState heading="access is not granted" body="Your verified account is not allowed to open this Beta route. Nothing private was shown." />;
  if (state === "unavailable") return <GateState heading="workspace unavailable" body="The verified principal context could not be loaded. Nothing private was shown." retry={() => void admit()} />;

  const renderWithPrincipal = (content: React.ReactNode) => {
    const value = <PrincipalContextValue.Provider value={principal}><MemberFetchContext.Provider value={memberFetch}><Shell context={principal}>{content}</Shell></MemberFetchContext.Provider></PrincipalContextValue.Provider>;
    return principal.kind === "operator" && isOperatorRole(principal.role)
      ? <OperatorContextProvider value={{ role: principal.role, environment: principal.environment, workspace: "operations", organizationScope: "unknown", lastVerifiedAt: new Date().toISOString(), capabilities: principal.capabilities }}>{value}</OperatorContextProvider>
      : value;
  };

  if (state === "loading" || admittedKey !== admissionKey) return <ShellLoading />;
  return renderWithPrincipal(children);
}

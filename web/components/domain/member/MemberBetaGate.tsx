"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { memberBetaEntryTarget, memberInvitationTicket } from "@/lib/ops/clerk-url";
import { memberSessionIsAdmitted } from "@/lib/member/chat";
import { OperatorAuthFrame } from "@/components/domain/ops/OperatorAuthFrame";
import { MemberBetaShell } from "./MemberBetaShell";

type MemberFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const MemberApiContext = createContext<MemberFetch | null>(null);

export function useMemberFetch(): MemberFetch {
  const memberFetch = useContext(MemberApiContext);
  if (!memberFetch) throw new Error("member_api_unavailable");
  return memberFetch;
}

type GateState = "loading" | "member-unavailable" | "unavailable";

function GateMessage({ state, onRetry }: { state: GateState; onRetry?: () => void }) {
  const copy = state === "loading"
    ? { mode: "recovery" as const, heading: "Opening your workspace", body: "Your conversations and saved preferences will appear after access is confirmed." }
    : state === "member-unavailable"
      ? { mode: "request-access" as const, heading: "We could not open your workspace", body: "Sign in again, then try opening your workspace once more." }
      : { mode: "unavailable" as const, heading: "Your workspace is unavailable", body: "Nothing private is being shown. You can try again in a moment." };
  return (
    <OperatorAuthFrame mode={copy.mode} audience="member">
      <div className="space-y-4 px-1 py-2 text-center">
        <h2 className="font-heading text-2xl font-bold leading-tight">{copy.heading}</h2>
        <p className="font-body text-sm leading-6 text-secondary">{copy.body}</p>
        {onRetry ? <button type="button" onClick={onRetry} className="min-h-11 w-full rounded-control border-2 border-foreground bg-editorial px-4 font-label text-sm font-bold text-on-editorial shadow-[4px_4px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-attention">try again</button> : null}
      </div>
    </OperatorAuthFrame>
  );
}

export function MemberBetaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const invitationTicket = useSearchParams().get("__clerk_ticket");
  const { isLoaded, isSignedIn, sessionId, userId, getToken } = useAuth();
  const [state, setState] = useState<GateState>("loading");
  const [admittedIdentity, setAdmittedIdentity] = useState<string | null>(null);
  const admissionGeneration = useRef(0);
  const authIdentity = isLoaded && isSignedIn && userId && sessionId ? `${userId}:${sessionId}` : null;
  const currentIdentity = useRef(authIdentity);
  currentIdentity.current = authIdentity;

  const memberFetch = useCallback<MemberFetch>(async (input, init) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, [getToken]);

  const confirmAccess = useCallback(async (generation: number, identity: string): Promise<boolean> => {
    const canApply = () => admissionGeneration.current === generation && currentIdentity.current === identity;
    setState("loading");
    try {
      const operator = await memberFetch("/ops/api/operator-context", { cache: "no-store" });
      if (!canApply()) return false;
      if (operator.ok) {
        router.replace("/beta/ops");
        return false;
      }
      const context = await memberFetch("/beta/api/context", { cache: "no-store" });
      if (!canApply()) return false;
      if (!context.ok) {
        setState("member-unavailable");
        return false;
      }
      return true;
    } catch {
      if (canApply()) setState("unavailable");
      return false;
    }
  }, [memberFetch, router]);

  useEffect(() => {
    const generation = ++admissionGeneration.current;
    setAdmittedIdentity(null);
    if (!isLoaded) return;
    if (memberInvitationTicket(invitationTicket) || !authIdentity) {
      router.replace(memberBetaEntryTarget(invitationTicket));
      return;
    }
    void confirmAccess(generation, authIdentity).then((admitted) => {
      if (admitted && admissionGeneration.current === generation && currentIdentity.current === authIdentity) setAdmittedIdentity(authIdentity);
    });
  }, [authIdentity, confirmAccess, invitationTicket, isLoaded, router]);

  const retry = useCallback(() => {
    if (!authIdentity) return;
    const generation = ++admissionGeneration.current;
    setAdmittedIdentity(null);
    void confirmAccess(generation, authIdentity).then((admitted) => {
      if (admitted && admissionGeneration.current === generation && currentIdentity.current === authIdentity) setAdmittedIdentity(authIdentity);
    });
  }, [authIdentity, confirmAccess]);
  const value = useMemo(() => memberFetch, [memberFetch]);

  if (!memberSessionIsAdmitted({ isLoaded, isSignedIn: Boolean(isSignedIn), currentIdentity: authIdentity, admittedIdentity }) || state !== "loading") return <GateMessage state={state} onRetry={state === "loading" ? undefined : retry} />;
  return <MemberApiContext.Provider value={value}><MemberBetaShell>{children}</MemberBetaShell></MemberApiContext.Provider>;
}

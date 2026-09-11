"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
// MemberChatWorkspace now lives at /beta/chat; /beta is the canonical resolver.
// (The named component remains the Alpha-composed member surface: <MemberChatWorkspace />.)

export default function MemberBetaPage() {
  const router = useRouter();
  const principal = useBetaPrincipal();
  useEffect(() => {
    router.replace(principal.canonicalLanding);
  }, [principal.canonicalLanding, router]);
  return <main className="grid min-h-[60vh] place-items-center"><p role="status" className="font-label text-sm text-secondary">opening your workspace…</p></main>;
}

"use client";

import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
import { BetaSettingsNavigation } from "@/components/domain/beta/BetaSettingsNavigation";
import { MemberSettingsNavigation } from "@/components/domain/member/MemberSettingsNavigation";

export default function MemberSettingsLayout({ children }: { children: React.ReactNode }) {
  const principal = useBetaPrincipal();
  const isMember = principal.kind === "member";
  return (
    <div className="bg-canvas" data-member-settings>
      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] lg:py-8 xl:px-12">
        <aside className="lg:pt-2">{isMember ? <MemberSettingsNavigation /> : <BetaSettingsNavigation />}</aside>
        <section className="min-w-0" aria-label="Member settings workspace">{children}</section>
      </div>
    </div>
  );
}

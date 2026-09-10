import Link from "next/link";
import { MemberSettingsNavigation } from "@/components/domain/member/MemberSettingsNavigation";

export default function MemberSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas" data-member-settings>
      <header className="border-b-2 border-foreground bg-canvas px-4 py-5 sm:px-8 xl:px-12">
        <div className="mx-auto flex max-w-[var(--wtf-content-max)] items-center justify-between gap-4">
          <Link href="/beta" className="font-label text-xs font-bold uppercase tracking-[0.12em] text-secondary underline decoration-foreground/40 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information">← ask WTF</Link>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">private workspace</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] xl:px-12">
        <aside className="lg:pt-2"><MemberSettingsNavigation /></aside>
        <section className="min-w-0" aria-label="Member settings workspace">{children}</section>
      </div>
    </div>
  );
}

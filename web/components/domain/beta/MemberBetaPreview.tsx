"use client";

import { useState } from "react";
import { memberBetaPreviewFixtures, type MemberBetaPreviewPersona } from "@/lib/member-beta-preview";

const personas: MemberBetaPreviewPersona[] = ["member-a", "member-b"];

export function MemberBetaPreview() {
  const [persona, setPersona] = useState<MemberBetaPreviewPersona>("member-a");
  const fixture = memberBetaPreviewFixtures[persona];

  return (
    <main className="mx-auto w-full max-w-5xl p-6" data-member-beta-preview>
      <div className="border-2 border-attention bg-attention/15 p-4" role="status">
        <p className="font-label text-xs font-bold uppercase tracking-wider text-muted">staging review fixture</p>
        <p className="mt-1 text-sm text-secondary">Fake, browser-only data for reviewing the member workspace. This page does not sign in, call an API, or expose account data.</p>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wider text-muted">Ask WTF · invite-only company beta</p>
          <h1 className="mt-2 font-heading text-4xl font-bold lowercase">private member chat</h1>
          <p className="mt-3 max-w-2xl text-secondary">Review the exact separation between two member workspaces before the live Clerk-to-D1 acceptance check.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="fixture member selector">
          {personas.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={persona === item}
              onClick={() => setPersona(item)}
              className={`min-h-11 border-2 px-4 py-2 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${persona === item ? "border-foreground bg-attention text-on-attention" : "border-foreground bg-canvas"}`}
            >
              {memberBetaPreviewFixtures[item].label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 grid gap-3 border-2 border-foreground bg-surface-subtle p-4 md:grid-cols-3" aria-label="member session scope">
        <div><p className="font-label text-xs font-bold uppercase tracking-wider text-muted">signed-in fixture</p><p className="mt-1 font-bold">{fixture.email}</p></div>
        <div><p className="font-label text-xs font-bold uppercase tracking-wider text-muted">session scope</p><p className="mt-1 font-bold">{fixture.label} only</p></div>
        <div><p className="font-label text-xs font-bold uppercase tracking-wider text-muted">live requirement</p><p className="mt-1 font-bold">Clerk identity + active D1 member</p></div>
      </section>

      <section className="mt-8 border-2 border-foreground p-4" aria-label="ask composer preview">
        <h2 className="font-heading text-2xl font-bold">new private question</h2>
        <textarea readOnly value="Ask from approved podcast evidence…" rows={4} className="mt-3 w-full border-2 border-foreground bg-canvas p-3 text-secondary" aria-label="preview question" />
        <button type="button" disabled className="mt-3 border-2 border-foreground bg-attention px-4 py-2 font-bold text-on-attention opacity-60">ask WTF · preview only</button>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="preview-history-title">
          <div className="flex items-center justify-between gap-3"><h2 id="preview-history-title" className="font-heading text-2xl font-bold">your history</h2><span className="font-label text-xs font-bold uppercase tracking-wider text-muted">{fixture.conversations.length} private sessions</span></div>
          <ul className="mt-3 grid gap-3">
            {fixture.conversations.map((conversation) => (
              <li key={conversation.id} className="border-2 border-foreground p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-heading text-lg font-bold">{conversation.title}</h3><span className="text-sm text-muted">{conversation.updatedAt}</span></div>
                <p className="mt-2 text-secondary">{conversation.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-2 border-foreground p-4" aria-labelledby="preview-memory-title">
          <h2 id="preview-memory-title" className="font-heading text-2xl font-bold">saved memory</h2>
          <p className="mt-1 text-sm text-secondary">Explicit saves only. A note can support this member’s future Beta chats; it is not transcript evidence.</p>
          <ul className="mt-4 grid gap-2">
            {fixture.memories.map((memory) => <li key={memory.id} className="border border-foreground/30 p-3">{memory.content}</li>)}
          </ul>
          <p className="mt-4 border-t border-foreground/30 pt-3 text-xs text-muted">Switch fixtures: neither the session list nor saved notes carry across the boundary.</p>
        </section>
      </div>
    </main>
  );
}

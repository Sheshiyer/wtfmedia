"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Conversation = { id: string; title: string; source_mode?: string; updated_at?: string; messages?: Array<{ id: string; role: string; content: string }> };
type ConversationResponse = { conversation: Conversation; messages: Array<{ id: string; role: string; content: string }> };
type Memory = { id: string; content: string };

export default function MemberBetaPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<ConversationResponse | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [question, setQuestion] = useState("");
  const [memory, setMemory] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const load = async () => { try { const [context, chats, saved] = await Promise.all([fetch("/beta/api/context", { cache: "no-store" }), fetch("/beta/api/chat", { cache: "no-store" }), fetch("/beta/api/memory", { cache: "no-store" })]); const chatBody = await chats.json(); const memoryBody = await saved.json(); if (!context.ok || !chats.ok || !saved.ok || !Array.isArray(chatBody.conversations) || !Array.isArray(memoryBody.memories)) throw new Error(); setConversations(chatBody.conversations); setMemories(memoryBody.memories); setState("ready"); } catch { setState("unavailable"); } };
  useEffect(() => { void load(); }, []);
  const ask = async (event: FormEvent) => { event.preventDefault(); if (!question.trim()) return; setState("loading"); try { const r = await fetch("/beta/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, sourceMode: "published" }) }); const b = await r.json(); if (!r.ok || !b.conversation) throw new Error(); setActive(b); setQuestion(""); await load(); } catch { setState("unavailable"); } };
  const saveMemory = async (event: FormEvent) => { event.preventDefault(); if (!memory.trim()) return; try { const r = await fetch("/beta/api/memory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: memory }) }); if (!r.ok) throw new Error(); setMemory(""); await load(); } catch { setState("unavailable"); } };
  const archive = async (path: string) => { try { const r = await fetch(path, { method: "POST" }); if (!r.ok) throw new Error(); if (path.includes("/chat/")) setActive(null); await load(); } catch { setState("unavailable"); } };
  return <main className="mx-auto w-full max-w-5xl p-6" data-member-beta>
    <p className="font-label text-xs font-bold uppercase tracking-wider text-muted">Ask WTF · invite-only company beta</p><h1 className="mt-2 font-heading text-4xl font-bold lowercase">private member chat</h1>
    <p className="mt-3 max-w-2xl text-secondary">Your conversation history is private to your account. Public Alpha remains separate and anonymous.</p>
    <form onSubmit={ask} className="mt-6 grid gap-3"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} rows={4} disabled={state !== "ready"} className="border-2 border-foreground bg-canvas p-3" placeholder="Ask from approved podcast evidence…" /><button disabled={state !== "ready"} className="w-fit border-2 border-foreground bg-attention px-4 py-2 font-bold text-on-attention disabled:opacity-50">ask WTF</button></form>
    {state === "unavailable" && <p className="mt-5 border-2 border-foreground p-4">Beta access is unavailable. <Link href="/sign-in?redirect_url=/beta" className="underline">Sign in through your invitation</Link>, then retry.</p>}
    {active && <section className="mt-8 space-y-3" aria-label="active conversation"><div className="flex items-center justify-between gap-3"><h2 className="font-heading text-2xl font-bold">{active.conversation.title}</h2><button onClick={() => void archive(`/beta/api/chat/${active.conversation.id}/archive`)} className="border-2 border-foreground px-3 py-1 text-sm">archive</button></div>{active.messages?.map((m) => <article key={m.id} className="border-2 border-foreground/30 p-4"><b>{m.role}</b><p className="mt-2 whitespace-pre-wrap">{m.content}</p></article>)}</section>}
    {state === "ready" && <section className="mt-8"><h2 className="font-heading text-2xl font-bold">your history</h2><ul className="mt-3 grid gap-2">{conversations.map((c) => <li key={c.id}><button onClick={async () => { const r = await fetch(`/beta/api/chat/${c.id}`); if (r.ok) setActive(await r.json()); }} className="w-full border-2 border-foreground p-3 text-left">{c.title}</button></li>)}</ul></section>}
    {state === "ready" && <section className="mt-8 border-2 border-foreground p-4"><h2 className="font-heading text-2xl font-bold">saved memory</h2><p className="mt-1 text-sm text-secondary">Only notes you explicitly save are available to future Beta chats. You can archive a note at any time.</p><form onSubmit={saveMemory} className="mt-3 flex flex-wrap gap-2"><input value={memory} onChange={(e) => setMemory(e.target.value)} maxLength={2000} className="min-w-64 flex-1 border-2 border-foreground bg-canvas p-2" placeholder="Save a preference or context note" /><button className="border-2 border-foreground px-3 py-1">save memory</button></form><ul className="mt-4 grid gap-2">{memories.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 border border-foreground/30 p-2"><span>{item.content}</span><button onClick={() => void archive(`/beta/api/memory/${item.id}/archive`)} className="shrink-0 text-sm underline">archive</button></li>)}</ul></section>}
  </main>;
}

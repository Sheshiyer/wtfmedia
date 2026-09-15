"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChatAnswerMarkdown } from "@/components/domain/public/ChatAnswerMarkdown";
import { useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";

type AdminSession = {
  id: string;
  title: string;
  source_mode: string;
  lifecycle_state: "active" | "archived";
  created_at: string;
  updated_at: string;
  memberEmail: string;
};

type AdminSessionMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };

function formatWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AdminSessionsWorkspace() {
  const memberFetch = useMemberFetch();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<AdminSession | null>(null);
  const [messages, setMessages] = useState<AdminSessionMessage[] | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error">("idle");

  const load = useCallback(async (cursor?: string) => {
    setState("loading");
    try {
      const response = await memberFetch(`/beta/api/admin/chat-sessions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      if (!response.ok) throw new Error("sessions_unavailable");
      const parsed = await response.json() as { conversations?: AdminSession[]; nextCursor?: string | null };
      setSessions((current) => cursor ? [...current, ...(parsed.conversations ?? [])] : parsed.conversations ?? []);
      setNextCursor(parsed.nextCursor ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [memberFetch]);

  useEffect(() => { void load(); }, [load]);

  const open = useCallback(async (session: AdminSession) => {
    setSelected(session);
    setMessages(null);
    setDetailState("loading");
    try {
      const response = await memberFetch(`/beta/api/admin/chat-sessions/${session.id}`);
      if (!response.ok) throw new Error("session_unavailable");
      const parsed = await response.json() as { messages?: AdminSessionMessage[] };
      setMessages(parsed.messages ?? []);
      setDetailState("idle");
    } catch {
      setDetailState("error");
    }
  }, [memberFetch]);

  if (selected) {
    return <section aria-label="Session detail" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={() => { setSelected(null); setMessages(null); setDetailState("idle"); }}>← all sessions</Button>
        <p className="text-xs text-secondary">{selected.memberEmail} · {formatWhen(selected.updated_at)}</p>
      </div>
      <h2 className="font-display text-2xl font-extrabold lowercase [overflow-wrap:anywhere]">{selected.title}</h2>
      {detailState === "loading" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">loading session…</p> : null}
      {detailState === "error" ? <p role="status" className="border-l-4 border-attention px-4 text-sm text-secondary">This session could not be loaded.</p> : null}
      {messages ? <div className="mx-auto w-full max-w-3xl space-y-6" data-testid="admin-session-messages">
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
            {message.role === "user"
              ? <p className="max-w-[85%] rounded-control border-2 border-foreground bg-attention px-4 py-3 text-sm text-on-attention">{message.content}</p>
              : <div className="prose-chat border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary"><ChatAnswerMarkdown content={message.content} /></div>}
          </article>
        ))}
      </div> : null}
    </section>;
  }

  return <section aria-label="All user sessions" className="grid gap-4">
    {state === "error" ? <p role="status" className="border-l-4 border-attention px-4 text-sm text-secondary">Sessions could not be loaded. <button type="button" className="underline" onClick={() => void load()}>Try again.</button></p> : null}
    {state === "loading" && sessions.length === 0 ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">loading sessions…</p> : null}
    {state === "ready" && sessions.length === 0 ? <p className="border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">No user sessions yet.</p> : null}
    {sessions.length > 0 ? <ul className="grid gap-2" data-testid="admin-session-list">
      {sessions.map((session) => (
        <li key={session.id}>
          <button type="button" onClick={() => void open(session)} className="block w-full border-2 border-foreground/25 bg-surface-subtle px-4 py-3 text-left hover:border-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information">
            <span className="block font-body text-sm font-semibold lowercase [overflow-wrap:anywhere]">{session.title}</span>
            <span className="mt-1 block text-xs text-secondary">{session.memberEmail} · {formatWhen(session.updated_at)}{session.lifecycle_state === "archived" ? " · archived" : ""}</span>
          </button>
        </li>
      ))}
    </ul> : null}
    {nextCursor ? <div><Button type="button" variant="secondary" onClick={() => void load(nextCursor)} loading={state === "loading"}>load more</Button></div> : null}
  </section>;
}

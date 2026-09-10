"use client";

import { useAuth } from "@clerk/nextjs";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OperatorAuthFrame } from "@/components/domain/ops/OperatorAuthFrame";
import { SourcePanel } from "@/components/domain/public/SourcePanel";
import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";
import { memberBetaEntryTarget, memberInvitationTicket } from "@/lib/ops/clerk-url";

type Conversation = {
  id: string;
  title: string;
  source_mode?: string;
  updated_at?: string;
  messages?: Array<{ id: string; role: string; content: string }>;
};
type MemberMessage = { id: string; role: string; content: string; source_metadata_json?: string };
type ConversationResponse = { conversation: Conversation; messages: MemberMessage[] };
type Memory = { id: string; content: string };
type BetaState = "loading" | "ready" | "member-unavailable" | "unavailable";

function sourcesFor(message: MemberMessage) {
  try {
    const metadata = typeof message.source_metadata_json === "string" ? JSON.parse(message.source_metadata_json) : null;
    return parsePublicSourceHeader(JSON.stringify(metadata?.sources ?? []));
  } catch {
    return [];
  }
}

function MemberBetaGate({
  state,
  onRetry,
}: {
  state: Exclude<BetaState, "ready">;
  onRetry?: () => void;
}) {
  const copy = state === "loading"
    ? { mode: "recovery" as const, heading: "Checking your private workspace", body: "Private chat, history, and saved notes stay hidden until this check succeeds." }
    : state === "member-unavailable"
      ? { mode: "request-access" as const, heading: "We could not finish your Beta account", body: "Sign out, sign in again with your verified address, then retry this access check." }
      : { mode: "unavailable" as const, heading: "We could not open the Beta workspace", body: "Nothing private is being displayed. You can safely try the access check again." };

  return (
    <OperatorAuthFrame mode={copy.mode} audience="member">
      <div className="space-y-4 px-1 py-2 text-center">
        <h2 className="font-heading text-2xl font-bold leading-tight">{copy.heading}</h2>
        <p className="font-body text-sm leading-6 text-secondary">{copy.body}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 w-full rounded-control border-2 border-foreground bg-editorial px-4 font-label text-sm font-bold text-on-editorial shadow-[4px_4px_0_var(--wtf-foreground)] hover:bg-editorial"
          >
            check access again
          </button>
        )}
      </div>
    </OperatorAuthFrame>
  );
}

export default function MemberBetaPage() {
  const router = useRouter();
  const invitationTicket = useSearchParams().get("__clerk_ticket");
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<ConversationResponse | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [question, setQuestion] = useState("");
  const [memory, setMemory] = useState("");
  const [state, setState] = useState<BetaState>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, [getToken]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      // A verified operator is sent to the canonical Beta control room before
      // the member-only endpoint is consulted. This avoids treating an admin
      // session as an uninvited member merely because it entered through /beta.
      const operator = await memberFetch("/ops/api/operator-context", { cache: "no-store" });
      if (operator.ok) {
        router.replace("/beta/ops");
        return;
      }
      const context = await memberFetch("/beta/api/context", { cache: "no-store" });
      if (!context.ok) {
        setState("member-unavailable");
        return;
      }

      const [chats, saved] = await Promise.all([
        memberFetch("/beta/api/chat", { cache: "no-store" }),
        memberFetch("/beta/api/memory", { cache: "no-store" }),
      ]);
      const chatBody = await chats.json();
      const memoryBody = await saved.json();
      if (!chats.ok || !saved.ok || !Array.isArray(chatBody.conversations) || !Array.isArray(memoryBody.memories)) {
        throw new Error("member_workspace_unavailable");
      }
      setConversations(chatBody.conversations);
      setMemories(memoryBody.memories);
      setState("ready");
    } catch {
      setState("unavailable");
    }
  }, [memberFetch, router]);

  useEffect(() => {
    if (!isLoaded) return;
    // Clerk may report a prior or partially-created session while an invitation
    // callback is still carrying its one-time ticket. The ticket must win so
    // the SignUp component can consume the invitation before we read Beta data.
    if (memberInvitationTicket(invitationTicket)) {
      router.replace(memberBetaEntryTarget(invitationTicket));
      return;
    }
    if (!isSignedIn) {
      router.replace(memberBetaEntryTarget(invitationTicket));
      return;
    }
    void load();
  }, [invitationTicket, isLoaded, isSignedIn, load, router]);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim() || state !== "ready") return;
    setIsSubmitting(true);
    try {
      const response = await memberFetch("/beta/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, sourceMode: "published" }),
      });
      const body = await response.json();
      if (!response.ok || !body.conversation) {
        setState(response.status === 404 ? "member-unavailable" : "unavailable");
        return;
      }
      setActive(body);
      setQuestion("");
      await load();
    } catch {
      setState("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveMemory = async (event: FormEvent) => {
    event.preventDefault();
    if (!memory.trim() || state !== "ready") return;
    setIsSubmitting(true);
    try {
      const response = await memberFetch("/beta/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: memory }),
      });
      if (!response.ok) {
        setState(response.status === 404 ? "member-unavailable" : "unavailable");
        return;
      }
      setMemory("");
      await load();
    } catch {
      setState("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const archive = async (path: string) => {
    setIsSubmitting(true);
    try {
      const response = await memberFetch(path, { method: "POST" });
      if (!response.ok) {
        setState(response.status === 404 ? "member-unavailable" : "unavailable");
        return;
      }
      if (path.includes("/chat/")) setActive(null);
      await load();
    } catch {
      setState("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state !== "ready") return <MemberBetaGate state={state} onRetry={state === "loading" ? undefined : () => void load()} />;

  return (
    <main className="mx-auto w-full max-w-5xl p-6" data-member-beta>
      <p className="font-label text-xs font-bold uppercase tracking-wider text-muted">Ask WTF · company beta</p>
      <h1 className="mt-2 font-heading text-4xl font-bold lowercase">private member chat</h1>
      <p className="mt-3 max-w-2xl text-secondary">Your conversation history is private to your account. Public Alpha remains separate and anonymous.</p>
      <form onSubmit={ask} className="mt-6 grid gap-3">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} rows={4} disabled={isSubmitting} className="border-2 border-foreground bg-canvas p-3" placeholder="Ask from approved podcast evidence…" />
        <button disabled={isSubmitting} className="w-fit border-2 border-foreground bg-attention px-4 py-2 font-bold text-on-attention disabled:opacity-50">ask WTF</button>
      </form>
      {active && <section className="mt-8 space-y-3" aria-label="active conversation"><div className="flex items-center justify-between gap-3"><h2 className="font-heading text-2xl font-bold">{active.conversation.title}</h2><button disabled={isSubmitting} onClick={() => void archive(`/beta/api/chat/${active.conversation.id}/archive`)} className="border-2 border-foreground px-3 py-1 text-sm">archive</button></div>{active.messages?.map((message) => <article key={message.id} className="border-2 border-foreground/30 p-4"><b>{message.role}</b><p className="mt-2 whitespace-pre-wrap">{message.content}</p>{message.role === "assistant" && <div className="mt-3"><SourcePanel sources={sourcesFor(message)} /></div>}</article>)}</section>}
      <section className="mt-8"><h2 className="font-heading text-2xl font-bold">your history</h2><ul className="mt-3 grid gap-2">{conversations.map((conversation) => <li key={conversation.id}><button disabled={isSubmitting} onClick={async () => { const response = await memberFetch(`/beta/api/chat/${conversation.id}`); if (response.ok) setActive(await response.json()); }} className="w-full border-2 border-foreground p-3 text-left">{conversation.title}</button></li>)}</ul></section>
      <section className="mt-8 border-2 border-foreground p-4"><h2 className="font-heading text-2xl font-bold">saved memory</h2><p className="mt-1 text-sm text-secondary">Only notes you explicitly save are available to future Beta chats. You can archive a note at any time.</p><form onSubmit={saveMemory} className="mt-3 flex flex-wrap gap-2"><input value={memory} onChange={(event) => setMemory(event.target.value)} maxLength={2000} disabled={isSubmitting} className="min-w-64 flex-1 border-2 border-foreground bg-canvas p-2" placeholder="Save a preference or context note" /><button disabled={isSubmitting} className="border-2 border-foreground px-3 py-1">save memory</button></form><ul className="mt-4 grid gap-2">{memories.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 border border-foreground/30 p-2"><span>{item.content}</span><button disabled={isSubmitting} onClick={() => void archive(`/beta/api/memory/${item.id}/archive`)} className="shrink-0 text-sm underline">archive</button></li>)}</ul></section>
    </main>
  );
}

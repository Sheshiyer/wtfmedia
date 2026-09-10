"use client";

import { useAuth } from "@clerk/nextjs";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MemberBetaShell } from "@/components/domain/member/MemberBetaShell";
import { OperatorAuthFrame } from "@/components/domain/ops/OperatorAuthFrame";
import { SourcePanel } from "@/components/domain/public/SourcePanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { Button } from "@/components/ui/Button";
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

  const load = useCallback(async (showGate = true) => {
    if (showGate) setState("loading");
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
      await load(false);
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
      await load(false);
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
      await load(false);
    } catch {
      setState("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state !== "ready") return <MemberBetaGate state={state} onRetry={state === "loading" ? undefined : () => void load()} />;

  return (
    <MemberBetaShell>
      <div className="min-h-screen bg-canvas" data-member-beta data-member-beta-dashboard>
        <WorkspaceHeader
          eyebrow="Ask WTF · company beta"
          title="your private workspace"
          summary="Ask the approved catalogue, return to your account-scoped sessions, and keep only the memory you explicitly save."
          accent="knowledge"
          size="workspace"
          context={
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
              <span>member account</span>
              <span>private sessions</span>
              <span>explicit memory</span>
            </div>
          }
        />

        <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-8 sm:px-8 xl:px-12">
          <section id="ask" aria-labelledby="member-ask-title" className="scroll-mt-32 overflow-hidden border-2 border-foreground bg-surface-raised shadow-[7px_7px_0_rgb(var(--wtf-foreground-rgb)/0.14)]">
            <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.55fr)]">
              <div className="p-5 sm:p-7">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">new private question</p>
                <h2 id="member-ask-title" className="mt-2 font-display text-3xl font-extrabold lowercase tracking-[-0.035em] sm:text-4xl">ask from the evidence</h2>
                <form onSubmit={ask} className="mt-5 grid gap-3">
                  <label htmlFor="member-question" className="sr-only">Ask WTF question</label>
                  <textarea
                    id="member-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    maxLength={2000}
                    rows={5}
                    disabled={isSubmitting}
                    className="w-full resize-y rounded-control border-2 border-foreground bg-canvas p-4 font-body text-base text-foreground outline-none placeholder:text-muted focus-visible:ring-4 focus-visible:ring-knowledge disabled:opacity-60"
                    placeholder="Ask from approved podcast evidence…"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-lg text-xs leading-relaxed text-secondary">Answers remain tied to retrieved sources. Your session is saved only to this member account.</p>
                    <Button type="submit" variant="attention" loading={isSubmitting} disabled={!question.trim()} className="min-w-32">ask WTF</Button>
                  </div>
                </form>
              </div>
              <aside className="border-t-2 border-foreground bg-surface-subtle p-5 lg:border-l-2 lg:border-t-0 sm:p-7" aria-label="Member privacy contract">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">workspace contract</p>
                <dl className="mt-4 divide-y divide-foreground/20 border-y-2 border-foreground font-label text-sm">
                  <div className="py-3"><dt className="text-secondary">identity</dt><dd className="mt-1 font-bold">verified by Clerk</dd></div>
                  <div className="py-3"><dt className="text-secondary">ownership</dt><dd className="mt-1 font-bold">this member only</dd></div>
                  <div className="py-3"><dt className="text-secondary">evidence</dt><dd className="mt-1 font-bold">approved catalogue</dd></div>
                </dl>
              </aside>
            </div>
          </section>

          {active ? (
            <section className="border-2 border-foreground bg-canvas p-5 sm:p-7" aria-label="active conversation" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
                <div>
                  <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">active session</p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold lowercase">{active.conversation.title}</h2>
                </div>
                <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => void archive(`/beta/api/chat/${active.conversation.id}/archive`)}>archive session</Button>
              </div>
              <div className="mx-auto mt-6 max-w-3xl space-y-6" role="log" aria-label="Conversation">
                {active.messages?.map((message) => (
                  <article key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-3"}>
                    {message.role === "user" ? (
                      <p className="max-w-[85%] rounded-control border-2 border-foreground bg-attention px-4 py-3 text-sm text-on-attention">{message.content}</p>
                    ) : (
                      <>
                        <div className="border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary whitespace-pre-wrap">{message.content}</div>
                        <SourcePanel sources={sourcesFor(message)} />
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
            <section id="history" aria-labelledby="member-history-title" className="scroll-mt-32 border-2 border-foreground bg-surface-raised p-5 sm:p-7">
              <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-4">
                <div>
                  <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-information">account-scoped sessions</p>
                  <h2 id="member-history-title" className="mt-1 font-display text-3xl font-extrabold lowercase">your history</h2>
                </div>
                <span className="shrink-0 font-label text-xs font-bold uppercase tracking-wide text-secondary">{conversations.length} saved</span>
              </div>
              {conversations.length ? (
                <ul className="mt-4 divide-y-2 divide-foreground/15 border-y-2 border-foreground">
                  {conversations.map((conversation, index) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={async () => {
                          setIsSubmitting(true);
                          try {
                            const response = await memberFetch(`/beta/api/chat/${conversation.id}`, { cache: "no-store" });
                            if (!response.ok) throw new Error("member_conversation_unavailable");
                            setActive(await response.json());
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          } catch {
                            setState("unavailable");
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="group flex min-h-16 w-full items-center gap-4 px-1 py-4 text-left outline-none transition-colors hover:bg-information/10 focus-visible:ring-4 focus-visible:ring-information disabled:opacity-60"
                      >
                        <span className="font-mono text-xs font-bold text-information">{String(index + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-heading text-base font-bold text-foreground">{conversation.title}</span>
                          <span className="mt-1 block font-label text-[10px] uppercase tracking-wide text-secondary">{conversation.source_mode ?? "published evidence"}{conversation.updated_at ? ` · ${new Date(conversation.updated_at).toLocaleDateString()}` : ""}</span>
                        </span>
                        <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 border-2 border-dashed border-foreground/30 bg-canvas p-6 text-sm leading-relaxed text-secondary">
                  No private sessions yet. Your first source-backed question will begin one here.
                </div>
              )}
            </section>

            <section id="memory" aria-labelledby="member-memory-title" className="scroll-mt-32 border-2 border-foreground bg-surface-subtle p-5 sm:p-7">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-live">member controlled</p>
              <h2 id="member-memory-title" className="mt-1 font-display text-3xl font-extrabold lowercase">saved memory</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">Only notes you explicitly save are available to future Beta chats. Archive any note at any time.</p>
              <form onSubmit={saveMemory} className="mt-5 grid gap-3">
                <label htmlFor="member-memory-note" className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">new note</label>
                <textarea
                  id="member-memory-note"
                  value={memory}
                  onChange={(event) => setMemory(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full resize-y rounded-control border-2 border-foreground bg-canvas p-3 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-4 focus-visible:ring-live disabled:opacity-60"
                  placeholder="Save a preference or context note"
                />
                <Button type="submit" variant="secondary" loading={isSubmitting} disabled={!memory.trim()} className="justify-self-start">save memory</Button>
              </form>
              {memories.length ? (
                <ul className="mt-6 space-y-3">
                  {memories.map((item) => (
                    <li key={item.id} className="border-l-4 border-live bg-canvas p-4">
                      <p className="text-sm leading-relaxed text-foreground">{item.content}</p>
                      <button type="button" disabled={isSubmitting} onClick={() => void archive(`/beta/api/memory/${item.id}/archive`)} className="mt-3 min-h-11 font-label text-xs font-bold lowercase underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-live disabled:opacity-60">archive note</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 border-l-4 border-live bg-canvas p-4 text-sm text-secondary">No saved memory yet. Nothing is inferred or added automatically.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </MemberBetaShell>
  );
}

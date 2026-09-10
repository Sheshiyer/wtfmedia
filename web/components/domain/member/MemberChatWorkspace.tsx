"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AskComposer } from "@/components/domain/public/AskComposer";
import { ConversationEmptyState } from "@/components/domain/public/ConversationThread";
import { SourcePanel } from "@/components/domain/public/SourcePanel";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { memberCommittedRequestForRetry, memberConversationHref, memberGreeting, newMemberRequestKey, parseMemberConversationResponse, retryIntentForMemberResponse, shouldApplyMemberResponse, sourceModeForMemberQuestion, type MemberCommittedRequest, type MemberConversationResponse, type MemberRetryIntent } from "@/lib/member/chat";
import { useMemberFetch } from "./MemberBetaGate";
import { MemberSessionNavigator } from "./MemberSessionNavigator";

type WorkspaceState = "idle" | "loading" | "error" | "unavailable";

function Thread({ view }: { view: MemberConversationResponse }) {
  return <div className="mx-auto max-w-3xl space-y-6" role="log" aria-label="Conversation">{view.messages.map((message) => <article key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-3"}>{message.role === "user" ? <p className="max-w-[85%] rounded-control border-2 border-foreground bg-attention px-4 py-3 text-sm text-on-attention">{message.content}</p> : <><div className="border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary whitespace-pre-wrap">{message.content}</div>{message.sources ? <SourcePanel sources={message.sources as never[]} /> : null}</>}</article>)}</div>;
}

export function MemberChatWorkspace({ conversationId }: { conversationId?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const memberFetch = useMemberFetch();
  const [view, setView] = useState<MemberConversationResponse | null>(null);
  const [state, setState] = useState<WorkspaceState>(conversationId ? "loading" : "idle");
  const [question, setQuestion] = useState("");
  const [retryIntent, setRetryIntent] = useState<MemberRetryIntent | null>(null);
  const [committedRequest, setCommittedRequest] = useState<MemberCommittedRequest | null>(null);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const loadEpoch = useRef(0);
  const submitEpoch = useRef(0);
  const archiveEpoch = useRef(0);
  const currentConversation = useRef(conversationId);
  const currentPath = useRef(pathname);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const committedRequestRef = useRef<MemberCommittedRequest | null>(null);
  const sendingRef = useRef(false);

  const rememberCommittedRequest = useCallback((request: MemberCommittedRequest | null) => {
    committedRequestRef.current = request;
    setCommittedRequest(request);
  }, []);

  useEffect(() => {
    currentConversation.current = conversationId;
    currentPath.current = pathname;
    submitEpoch.current += 1;
    archiveEpoch.current += 1;
    sendingRef.current = false;
    setSending(false);
    setArchiving(false);
  }, [conversationId, pathname]);
  const load = useCallback(async () => {
    if (!conversationId) {
      setView(null);
      setState("idle");
      return;
    }
    const epoch = ++loadEpoch.current;
    setState("loading");
    try {
      const response = await memberFetch(`/beta/api/chat/${encodeURIComponent(conversationId)}`, { cache: "no-store" });
      const parsed = response.ok ? parseMemberConversationResponse(await response.json()) : null;
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: loadEpoch.current, requestPath: `/beta/chat/${conversationId}`, currentPath: currentPath.current }) || currentConversation.current !== conversationId) return;
      if (!parsed) throw new Error("member_conversation_unavailable");
      setView(parsed);
      const recoveredRetry = retryIntentForMemberResponse(parsed);
      setRetryIntent(recoveredRetry);
      if (recoveredRetry) setQuestion(recoveredRetry.question);
      setState(recoveredRetry ? "error" : "idle");
    } catch {
      if (epoch === loadEpoch.current && currentConversation.current === conversationId) setState("unavailable");
    }
  }, [conversationId, memberFetch]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    loadEpoch.current += 1;
    submitEpoch.current += 1;
    archiveEpoch.current += 1;
  }, []);

  const submit = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || sendingRef.current) return;
    const selectedRoute = conversationId;
    const requestPath = pathname;
    const resumeMessageId = retryIntent?.question === trimmed ? retryIntent.resumeMessageId : null;
    const sourceMode = sourceModeForMemberQuestion(view?.conversation ?? null, retryIntent, trimmed);
    const turn = { conversationId: selectedRoute ?? null, question: trimmed, sourceMode, resumeMessageId };
    const request = memberCommittedRequestForRetry(committedRequestRef.current, turn) ?? { ...turn, idempotencyKey: newMemberRequestKey() };
    loadEpoch.current += 1;
    const epoch = ++submitEpoch.current;
    rememberCommittedRequest(request);
    sendingRef.current = true;
    setSending(true);
    try {
      const endpoint = selectedRoute ? `/beta/api/chat/${encodeURIComponent(selectedRoute)}` : "/beta/api/chat";
      const response = await memberFetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": request.idempotencyKey }, body: JSON.stringify({ question: trimmed, sourceMode, ...(resumeMessageId ? { resumeMessageId } : {}) }) });
      const parsed = parseMemberConversationResponse(await response.json());
      if (!parsed) throw new Error("member_chat_unavailable");
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: submitEpoch.current, requestPath, currentPath: currentPath.current })) return;
      const href = memberConversationHref(parsed.conversation.id);
      if (!href) throw new Error("member_chat_route_invalid");
      if (!selectedRoute) {
        setQuestion("");
        setRetryIntent(null);
        rememberCommittedRequest(null);
        router.push(href);
        return;
      }
      if (!response.ok) {
        if (currentConversation.current === selectedRoute) {
          setView(parsed);
          const pendingRetry = retryIntentForMemberResponse(parsed);
          setRetryIntent(pendingRetry);
          rememberCommittedRequest(null);
          if (pendingRetry) setQuestion(pendingRetry.question);
          setState(pendingRetry ? "error" : "unavailable");
        }
        return;
      }
      if (currentConversation.current === selectedRoute) {
        setView(parsed);
        setQuestion("");
        setRetryIntent(null);
        rememberCommittedRequest(null);
        setState("idle");
        setSessionRevision((current) => current + 1);
      }
    } catch {
      if (shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: submitEpoch.current, requestPath, currentPath: currentPath.current }) && currentConversation.current === selectedRoute) setState("error");
    } finally {
      if (epoch === submitEpoch.current) {
        sendingRef.current = false;
        setSending(false);
      }
    }
  }, [conversationId, memberFetch, pathname, question, rememberCommittedRequest, retryIntent, router, view?.conversation]);

  const archive = useCallback(async () => {
    if (!conversationId || archiving) return;
    const epoch = ++archiveEpoch.current;
    const requestPath = pathname;
    setArchiving(true);
    try {
      const response = await memberFetch(`/beta/api/chat/${encodeURIComponent(conversationId)}/archive`, { method: "POST" });
      if (!response.ok) throw new Error("member_archive_unavailable");
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: archiveEpoch.current, requestPath, currentPath: currentPath.current }) || currentConversation.current !== conversationId) return;
      router.push("/beta");
    } catch {
      if (shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: archiveEpoch.current, requestPath, currentPath: currentPath.current }) && currentConversation.current === conversationId) setState("error");
    } finally {
      if (epoch === archiveEpoch.current) setArchiving(false);
    }
  }, [archiving, conversationId, memberFetch, pathname, router]);

  const greeting = memberGreeting(user?.firstName, user?.fullName);
  const navigator = <MemberSessionNavigator activeConversationId={conversationId} refreshKey={sessionRevision} onNavigate={() => setDrawerOpen(false)} />;
  const canRetry = state === "error" && (retryIntent !== null || committedRequest !== null) && question.trim().length > 0;
  const onDrawerChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
  }, []);

  return <div className="min-h-[calc(100vh-5.5rem)] bg-canvas" data-member-chat-workspace>
    <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 pt-5 sm:px-8 xl:px-12">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
        <div className="min-w-0 flex-1">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">company beta · private workspace</p>
          {conversationId && view ? <h1 className="mt-1 line-clamp-2 font-display text-3xl font-extrabold lowercase [overflow-wrap:anywhere]">{view.conversation.title}</h1> : <><h1 className="mt-1 font-display text-lg font-extrabold lowercase">ask wtf</h1><p className="mt-1 text-xs text-secondary">{greeting}. Your history stays with this signed-in workspace.</p></>}
        </div>
        <div className="flex flex-wrap gap-2"><Button ref={drawerTriggerRef} type="button" variant="secondary" onClick={() => setDrawerOpen(true)} className="xl:hidden">conversations</Button>{conversationId ? <Button type="button" variant="secondary" onClick={() => void archive()} loading={archiving} disabled={archiving}>archive</Button> : null}</div>
      </div>
    </div>
    <div className="mx-auto grid min-w-0 max-w-[var(--wtf-content-max)] gap-6 px-4 sm:px-8 xl:grid-cols-[15rem_minmax(0,1fr)] xl:px-12">
      <aside className="hidden min-w-0 self-start pt-6 xl:sticky xl:top-28 xl:block"><div className="max-h-[calc(100dvh-27rem)] min-w-0 overflow-y-auto border-2 border-foreground bg-surface-raised p-3 shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.12)]">{navigator}</div></aside>
      <Drawer open={drawerOpen} onOpenChange={onDrawerChange} triggerRef={drawerTriggerRef} title="Your conversations" description="Open a saved conversation or start a new question." side="left">{navigator}</Drawer>
      <section className="min-w-0 pb-60" aria-live="polite">
        {!conversationId ? <ConversationEmptyState /> : null}
        {state === "loading" ? <p role="status" className="mt-6 border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">loading conversation…</p> : null}
        {state === "unavailable" ? <div role="status" className="mt-6 border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">This conversation is unavailable. Return to your conversations to choose another one.</div> : null}
        {view ? <div className="pt-6"><Thread view={view} /></div> : null}
        {state === "error" ? <p role="status" className="mx-auto mt-4 max-w-3xl border-l-4 border-attention px-4 text-sm text-secondary">We could not finish that answer. {canRetry ? "Retry with the same question." : "Try again."}</p> : null}
      </section>
    </div>
    <AskComposer
      value={question}
      onChange={(value) => { setQuestion(value); if (retryIntent) setRetryIntent(null); if (committedRequest) rememberCommittedRequest(null); }}
      onSubmit={() => void submit()}
      disabled={sending}
      loading={sending}
      variant="compact"
    />
  </div>;
}

"use client";

import { useUser } from "@clerk/nextjs";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskComposer } from "@/components/domain/public/AskComposer";
import { ChatAnswerMarkdown } from "@/components/domain/public/ChatAnswerMarkdown";
import { ConversationEmptyState, ConversationThreadFrame } from "@/components/domain/public/ConversationThread";
import { SourcePanel } from "@/components/domain/public/SourcePanel";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { createMemberChatAdapter, type BetaChatAdapter, type BetaConversationResponse } from "@/components/domain/beta/BetaChatAdapter";
import { appendNewestMemberConversationMessages, canConfirmMemberConversationDeletion, linkedSavedPreferenceDeletionNotice, memberAnswerPresentation, memberCommittedRequestForRetry, memberGreeting, newMemberRequestKey, prependMemberConversationMessages, retryIntentForMemberResponse, shouldApplyMemberResponse, sourceModeForMemberQuestion, type MemberCommittedRequest, type MemberConversation, type MemberRetryIntent } from "@/lib/member/chat";
import { cachedConversation, removeConversation, upsertConversation } from "@/lib/member/conversation-store";
import { useMemberFetch } from "./MemberBetaGate";
import { MemberSessionNavigator } from "./MemberSessionNavigator";

type WorkspaceState = "idle" | "loading" | "error" | "unavailable";
type DeleteTarget = { id: string; title: string; linkedSavedPreferenceCount?: number };

function Thread({ view, sending, canRetry, onRetry, loadingEarlier, onLoadEarlier, renderFooter, pendingQuestion, onFollowUp }: { view: BetaConversationResponse | null; sending: boolean; canRetry: boolean; onRetry: () => void; loadingEarlier: boolean; onLoadEarlier: () => void; renderFooter: () => React.ReactNode; pendingQuestion?: string | null; onFollowUp?: (question: string) => void }) {
  const messages = view?.messages ?? [];
  return <ConversationThreadFrame
    contentVersion={pendingQuestion ? `${messages.length}+pending` : messages}
    layoutVersion={sending}
    composerPlacement="fixed"
    renderFooter={renderFooter}
    renderContent={({ scrollAnchor }) => <div className="mx-auto max-w-5xl space-y-6 pr-1">{view?.previousMessageCursor ? <div className="flex justify-center"><Button type="button" variant="ghost" className="text-xs" onClick={onLoadEarlier} loading={loadingEarlier} disabled={loadingEarlier} data-testid="load-earlier-messages">load earlier messages</Button></div> : null}{messages.map((message, index) => {
      const presentation = memberAnswerPresentation(message);
      const sourceQuestion = messages.slice(0, index).reverse().find((item) => item.role === "user")?.content;
      return <article key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-3"}>{message.role === "user" ? <p className="max-w-[85%] rounded-control border-2 border-foreground bg-attention px-4 py-3 text-sm text-on-attention">{message.content}</p> : <><div className="prose-chat border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary"><ChatAnswerMarkdown content={message.content} sources={presentation.sources} /></div>{presentation.sources.length ? <SourcePanel sources={presentation.sources} citedIndices={presentation.citedIndices} queryScope={{ sourceMode: presentation.requestedSourceMode ?? message.sourceMode ?? "published", episodeId: null }} effectiveSourceMode={presentation.evidenceSourceMode ?? message.sourceMode} moments={presentation.moments} question={sourceQuestion} /> : null}{presentation.abstained ? <p className="text-xs font-medium italic text-secondary" data-testid="abstention-label">the catalogue doesn&apos;t support that claim</p> : null}{presentation.uncutUnavailable ? <p className="text-xs text-secondary">uncut evidence was unavailable; any published evidence remains labelled.</p> : null}{presentation.followUps && presentation.followUps.length > 0 && !sending && index === messages.length - 1 ? <div className="flex flex-wrap gap-2 pt-2" data-testid="follow-up-chips">{presentation.followUps.map((item, chipIndex) => <button key={chipIndex} type="button" onClick={() => onFollowUp?.(item)} className="rounded-full border border-foreground/20 bg-canvas px-3 py-1.5 text-left text-xs text-secondary transition-colors hover:border-knowledge hover:text-foreground">{item}</button>)}</div> : null}</>}</article>;
    })}{pendingQuestion ? <article className="flex justify-end"><p className="max-w-[85%] rounded-control border-2 border-foreground bg-attention px-4 py-3 text-sm text-on-attention">{pendingQuestion}</p></article> : null}{sending ? <p role="status" className="border-l-4 border-knowledge pl-4 text-sm font-semibold text-secondary" data-testid="loading-indicator">looking through the catalogue</p> : null}{canRetry ? <div className="flex justify-center border-t-2 border-foreground/15 px-4 py-3"><Button type="button" variant="ghost" className="text-xs" onClick={onRetry} data-testid="retry-button">retry answer</Button></div> : null}{scrollAnchor}</div>}
  />;
}

function DeleteConversationDialog({ conversationTitle, linkedSavedPreferenceCount, pending, error, onClose, onConfirm }: { conversationTitle: string; linkedSavedPreferenceCount?: number; pending: boolean; error: boolean; onClose: () => void; onConfirm: (confirmation: string) => Promise<boolean> }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const canDelete = canConfirmMemberConversationDeletion(deleteConfirmation);
  const savedPreferenceNotice = linkedSavedPreferenceCount === undefined
    ? "Saved preferences are separate and will not be deleted."
    : linkedSavedPreferenceDeletionNotice(linkedSavedPreferenceCount);

  return <Dialog.Root open={true} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70" />
      <Dialog.Content aria-labelledby="delete-conversation-title" aria-describedby="delete-conversation-description" onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }} className="fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none">
        <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.16)]">
          <Dialog.Title id="delete-conversation-title" className="font-heading text-2xl font-bold lowercase">delete this conversation permanently?</Dialog.Title>
          <Dialog.Description id="delete-conversation-description" className="mt-3 font-body text-sm leading-relaxed text-secondary">“{conversationTitle}”, its messages, and its private context checkpoints will be removed from your workspace and cannot be restored. {savedPreferenceNotice}</Dialog.Description>
          {error ? <p role="status" className="mt-3 border-l-4 border-attention px-3 text-sm text-secondary">We could not delete this conversation. Nothing was changed. Please try again.</p> : null}
          <label className="mt-5 grid gap-2 font-label text-xs font-bold lowercase text-foreground">Type DELETE to confirm<input aria-label="Type DELETE to confirm" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" disabled={pending} className="min-h-11 border-2 border-foreground bg-canvas px-3 font-body text-sm normal-case focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information" /></label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button ref={cancelRef} type="button" variant="secondary" onClick={onClose} disabled={pending}>keep conversation</Button>
            <button type="button" className="min-h-[44px] rounded-control border-2 border-editorial bg-editorial px-4 py-2 font-label text-sm font-bold lowercase text-on-editorial hover:bg-editorial/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information disabled:cursor-not-allowed disabled:border-foreground disabled:bg-surface-raised disabled:text-foreground" onClick={() => void onConfirm(deleteConfirmation)} disabled={pending || !canDelete}>delete permanently</button>
          </div>
        </section>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function MemberChatWorkspace({ conversationId, adapter }: { conversationId?: string; adapter?: BetaChatAdapter }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const memberFetch = useMemberFetch();
  const resolvedAdapter = useMemo(() => adapter ?? createMemberChatAdapter(memberFetch), [adapter, memberFetch]);
  const [view, setView] = useState<BetaConversationResponse | null>(null);
  const [state, setState] = useState<WorkspaceState>(conversationId ? "loading" : "idle");
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [retryIntent, setRetryIntent] = useState<MemberRetryIntent | null>(null);
  const [committedRequest, setCommittedRequest] = useState<MemberCommittedRequest | null>(null);
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loadEpoch = useRef(0);
  const submitEpoch = useRef(0);
  const archiveEpoch = useRef(0);
  const messagePageEpoch = useRef(0);
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
    messagePageEpoch.current += 1;
    sendingRef.current = false;
    setSending(false);
    setPendingQuestion(null);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteError(false);
    setLoadingEarlier(false);
  }, [conversationId, pathname]);
  const load = useCallback(async () => {
    if (!conversationId) {
      setView(null);
      setState("idle");
      return;
    }
    const epoch = ++loadEpoch.current;
    // Cache-first: a cached conversation renders instantly; the network copy
    // revalidates in the background. Cold cache keeps the loading state.
    const cached = cachedConversation(conversationId);
    if (cached) {
      setView(cached);
      setState("idle");
    } else {
      setState("loading");
    }
    try {
      const parsed = await resolvedAdapter.get(conversationId);
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: loadEpoch.current, requestPath: `/beta/chat/${conversationId}`, currentPath: currentPath.current }) || currentConversation.current !== conversationId) return;
      if (!parsed) throw new Error("member_conversation_unavailable");
      upsertConversation(parsed);
      setView(parsed);
      const recoveredRetry = retryIntentForMemberResponse(parsed);
      setRetryIntent(recoveredRetry);
      if (recoveredRetry) setQuestion(recoveredRetry.question);
      setState(recoveredRetry ? "error" : "idle");
    } catch {
      if (epoch === loadEpoch.current && currentConversation.current === conversationId && !cached) setState("unavailable");
    }
  }, [conversationId, resolvedAdapter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    loadEpoch.current += 1;
    submitEpoch.current += 1;
    archiveEpoch.current += 1;
    messagePageEpoch.current += 1;
  }, []);

  const submit = useCallback(async (override?: string) => {
    const trimmed = (override ?? question).trim();
    if (!trimmed || sendingRef.current) return;
    const selectedRoute = conversationId;
    const requestPath = pathname;
    const resumeMessageId = retryIntent?.question === trimmed ? retryIntent.resumeMessageId : null;
    const sourceMode = sourceModeForMemberQuestion(view?.conversation ?? null, retryIntent, trimmed, resolvedAdapter.defaultSourceMode);
    const turn = { conversationId: selectedRoute ?? null, question: trimmed, sourceMode, resumeMessageId };
    const request = memberCommittedRequestForRetry(committedRequestRef.current, turn) ?? { ...turn, idempotencyKey: newMemberRequestKey() };
    loadEpoch.current += 1;
    const epoch = ++submitEpoch.current;
    rememberCommittedRequest(request);
    sendingRef.current = true;
    setSending(true);
    // Optimistic: the question renders immediately, like the public chat.
    setPendingQuestion(trimmed);
    if (override !== undefined) setQuestion("");
    try {
      const result = await resolvedAdapter.send(selectedRoute ?? null, trimmed, sourceMode, request.idempotencyKey, resumeMessageId);
      const parsed = result.value;
      if (!parsed) throw new Error("member_chat_unavailable");
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: submitEpoch.current, requestPath, currentPath: currentPath.current })) return;
      const href = resolvedAdapter.href(parsed.conversation.id);
      if (!href) throw new Error("member_chat_route_invalid");
      if (!selectedRoute) {
        // Pre-warm the store with the full response so the route change below
        // renders instantly from cache — no refetch on navigation.
        upsertConversation(parsed);
        setQuestion("");
        setPendingQuestion(null);
        setRetryIntent(null);
        rememberCommittedRequest(null);
        router.push(href);
        return;
      }
      if (!result.ok) {
        if (currentConversation.current === selectedRoute) {
          upsertConversation(parsed);
          setView(parsed);
          setPendingQuestion(null);
          const pendingRetry = retryIntentForMemberResponse(parsed);
          setRetryIntent(pendingRetry);
          rememberCommittedRequest(null);
          if (pendingRetry) setQuestion(pendingRetry.question);
          setState(pendingRetry ? "error" : "unavailable");
        }
        return;
      }
      if (currentConversation.current === selectedRoute) {
        const merged = appendNewestMemberConversationMessages(view, parsed);
        upsertConversation(merged);
        setView(merged);
        setQuestion("");
        setPendingQuestion(null);
        setRetryIntent(null);
        rememberCommittedRequest(null);
        setState("idle");
      }
    } catch {
      setPendingQuestion(null);
      if (shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: submitEpoch.current, requestPath, currentPath: currentPath.current }) && currentConversation.current === selectedRoute) setState("error");
    } finally {
      if (epoch === submitEpoch.current) {
        sendingRef.current = false;
        setSending(false);
      }
    }
  }, [conversationId, pathname, question, rememberCommittedRequest, resolvedAdapter, retryIntent, router, view]);

  const loadEarlier = useCallback(async () => {
    const cursor = view?.previousMessageCursor;
    if (!conversationId || !cursor || loadingEarlier) return;
    const epoch = ++messagePageEpoch.current;
    const requestPath = pathname;
    setLoadingEarlier(true);
    try {
      const parsed = await resolvedAdapter.get(conversationId, cursor);
      if (!parsed || parsed.conversation.id !== conversationId || !shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: messagePageEpoch.current, requestPath, currentPath: currentPath.current }) || currentConversation.current !== conversationId) return;
      setView((current) => current ? prependMemberConversationMessages(current, parsed) : current);
    } finally {
      if (epoch === messagePageEpoch.current) setLoadingEarlier(false);
    }
  }, [conversationId, loadingEarlier, pathname, resolvedAdapter, view?.previousMessageCursor]);

  const deleteConversation = useCallback(async (confirmation: string): Promise<boolean> => {
    const targetId = deleteTarget?.id ?? conversationId;
    if (!targetId || deleting || !resolvedAdapter.delete || !canConfirmMemberConversationDeletion(confirmation)) return false;
    const epoch = ++archiveEpoch.current;
    const requestPath = pathname;
    setDeleting(true);
    setDeleteError(false);
    try {
      if (!await resolvedAdapter.delete(targetId)) throw new Error("member_delete_unavailable");
      if (!shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: archiveEpoch.current, requestPath, currentPath: currentPath.current }) || (deleteTarget === null && currentConversation.current !== targetId)) return false;
      removeConversation(targetId);
      setDeleteDialogOpen(false);
      router.push("/beta/chat");
      return true;
    } catch {
      if (shouldApplyMemberResponse({ requestEpoch: epoch, currentEpoch: archiveEpoch.current, requestPath, currentPath: currentPath.current }) && (deleteTarget !== null || currentConversation.current === targetId)) setDeleteError(true);
      return false;
    } finally {
      if (epoch === archiveEpoch.current) setDeleting(false);
    }
  }, [conversationId, deleteTarget, deleting, pathname, resolvedAdapter, router]);

  const requestDeleteFromNavigator = useCallback((selectedConversation: MemberConversation) => {
    setDeleteTarget({ id: selectedConversation.id, title: selectedConversation.title, linkedSavedPreferenceCount: selectedConversation.linkedSavedPreferenceCount });
    setDeleteError(false);
    setDeleteDialogOpen(true);
  }, []);

  const greeting = memberGreeting(user?.firstName, user?.fullName);
  const navigator = <MemberSessionNavigator activeConversationId={conversationId} onNavigate={() => setDrawerOpen(false)} onRequestDelete={resolvedAdapter.canDelete ? requestDeleteFromNavigator : undefined} adapter={resolvedAdapter} />;
  const canRetry = state === "error" && (retryIntent !== null || committedRequest !== null) && question.trim().length > 0;
  const onDrawerChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
  }, []);
  const renderComposer = () => <AskComposer
    value={question}
    onChange={(value) => { setQuestion(value); if (retryIntent) setRetryIntent(null); if (committedRequest) rememberCommittedRequest(null); }}
    onSubmit={() => void submit()}
    disabled={sending}
    loading={sending}
    variant="compact"
    placement="inline"
  />;

  return <div className="flex h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] min-h-0 bg-canvas" data-member-chat-workspace>
    <aside className="hidden w-72 shrink-0 border-r-2 border-foreground bg-surface-raised lg:-mt-[calc(4.5rem+env(safe-area-inset-top))] lg:block lg:h-[100dvh]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link href="/beta/chat" aria-label="WTF OS" className="inline-block rounded-xl border-2 border-foreground bg-canvas px-2 py-1 shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">
            <MigratedWordmarkMini plate />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">{navigator}</div>
      </div>
    </aside>
    <Drawer open={drawerOpen} onOpenChange={onDrawerChange} triggerRef={drawerTriggerRef} title="Your conversations" description="Open a saved conversation or start a new question." side="left">{navigator}</Drawer>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button ref={drawerTriggerRef} type="button" variant="secondary" onClick={() => setDrawerOpen(true)} className="min-h-9 px-3 py-1 text-xs lg:hidden">conversations</Button>
          {conversationId && view ? <h1 title={view.conversation.title} className="truncate font-display text-lg font-extrabold lowercase [overflow-wrap:anywhere]">{view.conversation.title}</h1> : <h1 className="font-display text-lg font-extrabold lowercase">ask wtf</h1>}
        </div>
      </div>
      <section className="min-h-0 min-w-0 flex-1" aria-live="polite" data-selected-conversation-viewport>
        {!conversationId && !pendingQuestion ? <ConversationEmptyState /> : null}
        {state === "loading" ? <p role="status" className="mx-auto mt-6 max-w-3xl border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">loading conversation…</p> : null}
        {state === "unavailable" ? <div role="status" className="mx-auto mt-6 grid max-w-3xl gap-4 border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary" data-conversation-unavailable><p>This conversation is unavailable. It may have been archived, deleted, or opened from an expired link.</p><div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1 text-xs">retry loading conversation</Button><Button type="button" variant="ghost" onClick={() => router.push("/beta/chat#new-chat")} className="min-h-9 px-3 py-1 text-xs">start a new question</Button></div></div> : null}
        {view || pendingQuestion ? <div className="flex h-full min-h-0 flex-col"><Thread view={view} sending={sending} canRetry={canRetry} onRetry={() => void submit()} loadingEarlier={loadingEarlier} onLoadEarlier={() => void loadEarlier()} renderFooter={() => renderComposer()} pendingQuestion={pendingQuestion} onFollowUp={(followUp) => void submit(followUp)} /></div> : null}
        {state === "error" ? <p role="status" className="mx-auto mt-4 max-w-3xl border-l-4 border-attention px-4 text-sm text-secondary">We could not finish that answer. {canRetry ? "Retry with the same question." : "Try again."}</p> : null}
      </section>
      {!view && !pendingQuestion ? <div className="shrink-0 px-4 pb-4 sm:px-6"><div className="mx-auto max-w-3xl"><p className="mb-2 text-center text-xs text-secondary">{greeting}. Your history stays with this signed-in workspace.</p><AskComposer
        value={question}
        onChange={(value) => { setQuestion(value); if (retryIntent) setRetryIntent(null); if (committedRequest) rememberCommittedRequest(null); }}
        onSubmit={() => void submit()}
        disabled={sending}
        loading={sending}
        variant="compact"
      /></div></div> : null}
    </div>
    {deleteDialogOpen && (deleteTarget || (conversationId && view)) ? <DeleteConversationDialog conversationTitle={deleteTarget?.title ?? view?.conversation.title ?? "this conversation"} linkedSavedPreferenceCount={deleteTarget?.linkedSavedPreferenceCount ?? view?.conversation.linkedSavedPreferenceCount} pending={deleting} error={deleteError} onClose={() => { if (!deleting) { setDeleteDialogOpen(false); setDeleteTarget(null); } }} onConfirm={deleteConversation} /> : null}
  </div>;
}

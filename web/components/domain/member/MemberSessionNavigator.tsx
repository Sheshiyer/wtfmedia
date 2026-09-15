"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { shouldFinishMemberPaginationRequest, type MemberConversation } from "@/lib/member/chat";
import { cacheHistory, cachedHistory, subscribeConversationStore } from "@/lib/member/conversation-store";
import { createMemberChatAdapter, type BetaChatAdapter, type BetaReadFailure } from "@/components/domain/beta/BetaChatAdapter";
import { useMemberFetch } from "./MemberBetaGate";

type NavigatorState = "loading" | "ready" | "empty" | "error";
type ReadFailureKind = BetaReadFailure["kind"];

export function MemberSessionNavigator({ activeConversationId, onNavigate, onRequestDelete, adapter }: { activeConversationId?: string; onNavigate?: () => void; onRequestDelete?: (conversation: MemberConversation) => void; adapter?: BetaChatAdapter }) {
  const memberFetch = useMemberFetch();
  const resolvedAdapter = useMemo(() => adapter ?? createMemberChatAdapter(memberFetch), [adapter, memberFetch]);
  const [state, setState] = useState<NavigatorState>(() => cachedHistory() ? (cachedHistory()!.conversations.length ? "ready" : "empty") : "loading");
  // The store is the list source of truth; local state only tracks load failures.
  const history = useSyncExternalStore(subscribeConversationStore, cachedHistory, cachedHistory);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [failureKind, setFailureKind] = useState<ReadFailureKind | null>(null);
  const [paginationFailureKind, setPaginationFailureKind] = useState<ReadFailureKind | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const historyEpoch = useRef(0);
  const paginationGeneration = useRef(0);
  const paginationInFlight = useRef(false);

  const load = useCallback(async (force = false) => {
    const epoch = ++historyEpoch.current;
    paginationGeneration.current += 1;
    paginationInFlight.current = false;
    // Cache-first: render the stored list immediately and only fetch when cold
    // or explicitly retried. Sends/archives already upsert the store.
    if (!force && cachedHistory()) {
      const cached = cachedHistory()!;
      setState(cached.conversations.length ? "ready" : "empty");
      setLoadingMore(false);
      setPaginationError(false);
      setFailureKind(null);
      return;
    }
    setState("loading");
    setLoadingMore(false);
    setPaginationError(false);
    setFailureKind(null);
    try {
      const parsed = await resolvedAdapter.list();
      if (!parsed) throw new Error("member_history_unavailable");
      if (epoch !== historyEpoch.current) return;
      cacheHistory(parsed);
      setState(parsed.conversations.length ? "ready" : "empty");
    } catch {
      if (epoch === historyEpoch.current) {
        setFailureKind(resolvedAdapter.readFailure?.()?.kind ?? "temporary");
        setState("error");
      }
    }
  }, [resolvedAdapter]);

  const requestDelete = useCallback((conversation: MemberConversation) => {
    if (!onRequestDelete || action) return;
    setAction(`delete:${conversation.id}`);
    setActionMessage(null);
    onRequestDelete(conversation);
    setAction(null);
  }, [action, onRequestDelete]);

  useEffect(() => { void load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (!history?.nextCursor || loadingMore || paginationInFlight.current) return;
    const cursor = history.nextCursor;
    const epoch = historyEpoch.current;
    const generation = ++paginationGeneration.current;
    paginationInFlight.current = true;
    setLoadingMore(true);
    setPaginationError(false);
    setPaginationFailureKind(null);
    try {
      const parsed = await resolvedAdapter.list(cursor);
      if (!parsed) throw new Error("member_history_page_unavailable");
      if (epoch !== historyEpoch.current || !shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) return;
      cacheHistory(parsed, true);
    } catch {
      if (epoch === historyEpoch.current && shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) {
        setPaginationFailureKind(resolvedAdapter.readFailure?.()?.kind ?? "temporary");
        setPaginationError(true);
      }
    } finally {
      if (shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) {
        paginationInFlight.current = false;
        setLoadingMore(false);
      }
    }
  }, [history?.nextCursor, loadingMore, resolvedAdapter]);

  return (
    <nav aria-label="Your conversations" className="grid min-w-0 grid-cols-1 gap-3" data-member-session-navigator>
      <Link href="/beta/chat#new-chat" onClick={onNavigate} className="inline-flex min-h-11 items-center justify-center gap-1.5 border-2 border-foreground bg-attention px-3 py-2 font-label text-xs font-bold lowercase text-on-attention shadow-[3px_3px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"><span aria-hidden="true" className="text-sm leading-none">+</span>new chat</Link>
      {state === "loading" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">loading conversations…</p> : null}
      {state === "empty" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">Start a question to save your first conversation.</p> : null}
      {state === "error" ? <div role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary" data-session-read-error={failureKind ?? "temporary"}><p>{failureKind === "verification" ? "account verification is required to load conversations. sign in again, then retry." : "the staging service is temporarily unavailable while loading conversations. retry when the service recovers."}</p><Button type="button" variant="secondary" onClick={() => void load()} className="mt-3 min-h-9 px-3 py-1 text-xs">retry</Button></div> : null}
      {actionMessage ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-2 text-xs text-secondary">{actionMessage}</p> : null}
      {state === "ready" && history ? <div className="grid min-w-0 grid-cols-1 gap-2">{history.conversations.map((conversation) => {
        const href = resolvedAdapter.href(conversation.id);
        return href ? <div key={conversation.id} className={`min-w-0 overflow-hidden border-2 p-3 ${conversation.id === activeConversationId ? "border-information bg-information/15" : "border-foreground/20 bg-canvas"}`} data-member-session-card><div className="flex min-w-0 items-center justify-between gap-2"><Link href={href} onClick={onNavigate} aria-current={conversation.id === activeConversationId ? "page" : undefined} className="block min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"><p className="truncate font-body text-sm font-semibold text-foreground">{conversation.title}</p></Link>{onRequestDelete ? <button type="button" aria-label={`delete ${conversation.title}`} title="delete conversation" onClick={() => requestDelete(conversation)} disabled={action !== null} className="grid h-8 w-8 shrink-0 place-items-center rounded-control border-2 border-transparent text-editorial hover:border-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:opacity-50"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button> : null}</div></div> : null;
      })}{history.nextCursor ? <><Button type="button" variant="secondary" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore} className="min-h-10 px-3 py-2 text-xs">load more</Button>{paginationError ? <div role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary" data-session-read-error={paginationFailureKind ?? "temporary"}>{paginationFailureKind === "verification" ? "account verification is required to load older conversations." : "the staging service is temporarily unavailable while loading older conversations."}<Button type="button" variant="secondary" onClick={() => void loadMore()} className="mt-3 min-h-9 px-3 py-1 text-xs">retry loading more</Button></div> : null}</> : null}</div> : null}
    </nav>
  );
}

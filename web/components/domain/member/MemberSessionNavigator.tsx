"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { appendMemberHistoryPage, memberConversationHref, parseMemberHistoryResponse, shouldFinishMemberPaginationRequest, type MemberHistoryResponse } from "@/lib/member/chat";
import { useMemberFetch } from "./MemberBetaGate";

type NavigatorState = "loading" | "ready" | "empty" | "error";

export function MemberSessionNavigator({ activeConversationId, onNavigate, refreshKey = 0 }: { activeConversationId?: string; onNavigate?: () => void; refreshKey?: number }) {
  const memberFetch = useMemberFetch();
  const [state, setState] = useState<NavigatorState>("loading");
  const [history, setHistory] = useState<MemberHistoryResponse | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const historyEpoch = useRef(0);
  const paginationGeneration = useRef(0);
  const paginationInFlight = useRef(false);

  const load = useCallback(async () => {
    const epoch = ++historyEpoch.current;
    paginationGeneration.current += 1;
    paginationInFlight.current = false;
    setState("loading");
    setLoadingMore(false);
    setPaginationError(false);
    try {
      const response = await memberFetch("/beta/api/chat", { cache: "no-store" });
      const parsed = response.ok ? parseMemberHistoryResponse(await response.json()) : null;
      if (!parsed) throw new Error("member_history_unavailable");
      if (epoch !== historyEpoch.current) return;
      setHistory(parsed);
      setState(parsed.conversations.length ? "ready" : "empty");
    } catch {
      if (epoch === historyEpoch.current) setState("error");
    }
  }, [memberFetch]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!history?.nextCursor || loadingMore || paginationInFlight.current) return;
    const cursor = history.nextCursor;
    const epoch = historyEpoch.current;
    const generation = ++paginationGeneration.current;
    paginationInFlight.current = true;
    setLoadingMore(true);
    setPaginationError(false);
    try {
      const response = await memberFetch(`/beta/api/chat?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const parsed = response.ok ? parseMemberHistoryResponse(await response.json()) : null;
      if (!parsed) throw new Error("member_history_page_unavailable");
      if (epoch !== historyEpoch.current || !shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) return;
      setHistory((current) => current && current.nextCursor === cursor ? appendMemberHistoryPage(current, parsed) : current);
    } catch {
      if (epoch === historyEpoch.current && shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) setPaginationError(true);
    } finally {
      if (shouldFinishMemberPaginationRequest({ requestGeneration: generation, currentGeneration: paginationGeneration.current })) {
        paginationInFlight.current = false;
        setLoadingMore(false);
      }
    }
  }, [history?.nextCursor, loadingMore, memberFetch]);

  return (
    <nav aria-label="Your conversations" className="grid min-w-0 grid-cols-1 gap-3" data-member-session-navigator>
      <Link href="/beta" onClick={onNavigate} className="inline-flex min-h-11 items-center justify-center border-2 border-foreground bg-attention px-3 py-2 font-label text-xs font-bold lowercase text-on-attention shadow-[3px_3px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information">new chat</Link>
      {state === "loading" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">loading conversations…</p> : null}
      {state === "empty" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">Start a question to save your first conversation.</p> : null}
      {state === "error" ? <div role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">Conversations are unavailable right now.<Button type="button" variant="secondary" onClick={() => void load()} className="mt-3 min-h-9 px-3 py-1 text-xs">retry</Button></div> : null}
      {state === "ready" && history ? <div className="grid min-w-0 grid-cols-1 gap-2">{history.conversations.map((conversation) => {
        const href = memberConversationHref(conversation.id);
        return href ? <Link key={conversation.id} href={href} onClick={onNavigate} aria-current={conversation.id === activeConversationId ? "page" : undefined} className={`block min-w-0 overflow-hidden border-2 p-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information ${conversation.id === activeConversationId ? "border-information bg-information/15" : "border-foreground/20 bg-canvas hover:border-foreground"}`}><p className="line-clamp-2 font-body text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{conversation.title}</p><p className="mt-1 truncate font-label text-[10px] uppercase tracking-wide text-muted">{conversation.sourceMode} evidence</p></Link> : null;
      })}{history.nextCursor ? <><Button type="button" variant="secondary" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore} className="min-h-10 px-3 py-2 text-xs">load more</Button>{paginationError ? <div role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">We could not load older conversations.<Button type="button" variant="secondary" onClick={() => void loadMore()} className="mt-3 min-h-9 px-3 py-1 text-xs">retry loading more</Button></div> : null}</> : null}</div> : null}
    </nav>
  );
}

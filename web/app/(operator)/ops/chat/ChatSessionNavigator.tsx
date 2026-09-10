"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  CHAT_ACTIVITY_EVENT,
  CHAT_API_ROOT,
  parseChatHistoryResponse,
  type ChatConversation,
  type ChatHistoryResponse,
} from "@/lib/ops/chat";

type NavigatorState = "loading" | "ready" | "empty" | "error" | "unavailable";

function formatDate(value: string): string {
  const date = Date.parse(value);
  return Number.isNaN(date)
    ? "date not observed"
    : new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stateForStatus(status: number): Exclude<NavigatorState, "loading" | "ready" | "empty"> {
  return status === 401 || status === 419 || status === 440
    ? "unavailable"
    : status === 404 || status === 503
      ? "unavailable"
      : "error";
}

function SessionRow({ item, active }: { item: ChatConversation; active: boolean }) {
  return (
    <Link
      href={`/chat/${encodeURIComponent(item.id)}-operator`}
      aria-current={active ? "page" : undefined}
      data-chat-session-link
      data-chat-session-active={active ? "true" : undefined}
      className={`block border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-attention ${active ? "border-information bg-information/15" : "border-foreground/20 bg-canvas hover:border-foreground hover:bg-surface-subtle"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-body text-sm font-semibold lowercase text-foreground" title={item.title}>
          {item.title}
        </p>
        {active ? <span className="shrink-0 font-label text-[9px] font-bold uppercase tracking-[0.1em] text-information">open</span> : null}
      </div>
      <p className="mt-2 font-label text-[10px] uppercase tracking-[0.08em] text-muted">
        {item.sourceMode} · {item.messageCount} {item.messageCount === 1 ? "message" : "messages"}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-secondary">
        <span className="uppercase tracking-[0.08em]">{item.state}</span>
        <span>{formatDate(item.updatedAt)}</span>
      </div>
      {item.operatorDisplayName || item.operatorEmail ? (
        <p data-chat-session-owner className="mt-2 truncate text-[10px] text-secondary" title={item.operatorDisplayName ?? item.operatorEmail}>
          {item.operatorDisplayName ?? item.operatorEmail}
        </p>
      ) : null}
    </Link>
  );
}

export function ChatSessionNavigator({ activeConversationId }: { activeConversationId: string }) {
  const [state, setState] = useState<NavigatorState>("loading");
  const [history, setHistory] = useState<ChatHistoryResponse | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`${CHAT_API_ROOT}/conversations`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setState(stateForStatus(response.status));
        return;
      }
      const parsed = parseChatHistoryResponse(await response.json());
      if (!parsed) {
        setState("error");
        return;
      }
      setHistory(parsed);
      setState(parsed.conversations.length ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }, []);

  const loadMore = useCallback(async () => {
    const cursor = history?.nextCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`${CHAT_API_ROOT}/conversations?cursor=${encodeURIComponent(cursor)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("session_page_failed");
      const parsed = parseChatHistoryResponse(await response.json());
      if (!parsed) throw new Error("session_page_invalid");
      setHistory((current) => current ? { ...parsed, conversations: [...current.conversations, ...parsed.conversations] } : parsed);
    } catch {
      // Keep the already-authoritative page visible if a later page fails.
    } finally {
      setLoadingMore(false);
    }
  }, [history?.nextCursor, loadingMore]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => void load();
    window.addEventListener(CHAT_ACTIVITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHAT_ACTIVITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [load]);

  return (
    <aside className="min-w-0 self-start lg:sticky lg:top-24" aria-label="Ask WTF sessions" data-chat-session-navigator>
      <div className="rounded-panel border-2 border-foreground bg-surface-raised p-3 shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.12)]">
        <div className="border-b-2 border-foreground px-3 pb-3">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">account sessions</p>
          <h2 className="mt-1 font-heading text-xl font-bold lowercase text-foreground">ask wtf</h2>
          <p className="mt-2 text-xs leading-relaxed text-secondary">Authorized sessions stay attached to their verified account.</p>
        </div>

        <div className="mt-3 grid gap-2">
          <Link
            href="/beta/ops/chat#new-chat"
            data-chat-new-session
            className="inline-flex min-h-11 items-center justify-center border-2 border-foreground bg-attention px-3 py-2 font-label text-xs font-bold lowercase text-on-attention shadow-[3px_3px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
          >
            new session
          </Link>
          <Link
            href="/beta/ops/chat"
            data-chat-all-sessions
            className="inline-flex min-h-11 items-center justify-center border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
          >
            all sessions
          </Link>
        </div>

        <div className="mt-4" data-chat-session-list>
          {state === "loading" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs text-secondary">loading sessions…</p> : null}
          {state === "empty" ? <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3 text-xs leading-relaxed text-secondary">No saved sessions yet. Start a new one above.</p> : null}
          {state === "error" || state === "unavailable" ? (
            <div role="status" className="border-2 border-foreground/20 bg-surface-subtle p-3">
              <p className="text-xs leading-relaxed text-secondary">Session navigation is unavailable right now.</p>
              <Button type="button" variant="secondary" onClick={() => void load()} className="mt-3 min-h-9 px-3 py-1 text-xs">retry</Button>
            </div>
          ) : null}
          {state === "ready" && history ? (
            <nav className="grid gap-2" aria-label="Saved Ask WTF sessions">
              {history.conversations.map((item) => (
                <SessionRow key={item.id} item={item} active={item.id === activeConversationId} />
              ))}
              {history.nextCursor ? (
                <Button type="button" variant="secondary" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore} className="mt-1 min-h-10 px-3 py-2 text-xs">
                  load more
                </Button>
              ) : null}
            </nav>
          ) : null}
        </div>

        <p className="mt-4 border-t border-foreground/20 px-3 pt-3 text-[10px] leading-relaxed text-muted">
          The server decides which sessions this operator can open. Public Alpha remains separate and anonymous.
        </p>
      </div>
    </aside>
  );
}

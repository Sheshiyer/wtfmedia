"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CHAT_ACTIVITY_EVENT,
  CHAT_API_ROOT,
  chatCacheKey,
  bumpChatActivityEpoch,
  parseChatConversationResponse,
  parseChatHistoryResponse,
  readChatCache,
  writeChatCache,
  type ChatConversation,
  type ChatConversationResponse,
  type ChatHistoryResponse,
  type ChatPolicy,
  type ChatView,
} from "@/lib/ops/chat";

type ViewState = "loading" | "ready" | "empty" | "error" | "expired" | "unavailable";

function formatDate(value: string): string {
  const date = Date.parse(value);
  return Number.isNaN(date) ? "date not observed" : new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function responseState(status: number): Exclude<ViewState, "loading" | "ready" | "empty"> {
  if (status === 401 || status === 419 || status === 440) return "expired";
  if (status === 404 || status === 503) return "unavailable";
  return "error";
}

function StateMessage({ state, onRetry }: { state: ViewState; onRetry: () => void }) {
  const copy: Record<Exclude<ViewState, "loading" | "ready">, { title: string; body: string }> = {
    empty: { title: "no conversations yet", body: "start an authenticated Ask WTF conversation and it will appear here." },
    error: { title: "history could not load", body: "the server did not return a valid history response. nothing from browser storage was treated as authority." },
    expired: { title: "operator session expired", body: "reauthenticate through Cloudflare Access, then return to this conversation." },
    unavailable: { title: "authenticated chat is unavailable", body: "the server release gate or history endpoint is not active." },
  };
  if (state === "loading") return <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-6 font-label text-sm text-secondary">loading authenticated history…</p>;
  if (state === "ready") return null;
  const stateCopy = copy[state];
  return (
    <section role="status" data-chat-state={state} className="border-2 border-foreground/20 bg-surface-subtle p-6">
      <h2 className="font-heading text-xl font-bold lowercase text-foreground">{stateCopy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">{stateCopy.body}</p>
      {state !== "empty" && (
        <Button type="button" variant="secondary" onClick={onRetry} className="mt-5">
          retry
        </Button>
      )}
    </section>
  );
}

function PolicyActions({ policy, conversationId, onChanged }: { policy: ChatPolicy; conversationId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<"archive" | "export" | null>(null);

  async function archive() {
    if (!policy.archive || busy) return;
    setBusy("archive");
    try {
      const response = await fetch(`${CHAT_API_ROOT}/conversations/${encodeURIComponent(conversationId)}/archive`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("archive_failed");
      bumpChatActivityEpoch();
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function exportConversation() {
    if (!policy.export || busy) return;
    setBusy("export");
    try {
      const response = await fetch(`${CHAT_API_ROOT}/conversations/${encodeURIComponent(conversationId)}/export`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("export_failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${conversationId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      bumpChatActivityEpoch();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="conversation actions">
      <Button type="button" variant="secondary" disabled={!policy.archive || busy !== null} loading={busy === "archive"} onClick={archive}>
        archive
      </Button>
      <Button type="button" variant="secondary" disabled={!policy.export || busy !== null} loading={busy === "export"} onClick={exportConversation}>
        export
      </Button>
    </div>
  );
}

export function ChatWorkspace({ view, conversationId }: { view: ChatView; conversationId?: string }) {
  const cacheKey = useMemo(() => chatCacheKey(view, conversationId), [view, conversationId]);
  const [state, setState] = useState<ViewState>("loading");
  const [history, setHistory] = useState<ChatHistoryResponse | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [policy, setPolicy] = useState<ChatPolicy>({ archive: false, export: false });

  const load = useCallback(async () => {
    if (view === "conversation" && !conversationId) {
      setState("unavailable");
      return;
    }
    setState("loading");
    const endpoint = view === "history"
      ? `${CHAT_API_ROOT}/conversations`
      : `${CHAT_API_ROOT}/conversations/${encodeURIComponent(conversationId ?? "")}`;
    try {
      const response = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        setState(responseState(response.status));
        return;
      }
      const body: unknown = await response.json();
      if (view === "history") {
        const parsed = parseChatHistoryResponse(body);
        if (!parsed) {
          setState("error");
          return;
        }
        setHistory(parsed);
        setPolicy(parsed.policy);
        writeChatCache(cacheKey, parsed);
        setState(parsed.conversations.length ? "ready" : "empty");
      } else {
        const parsed = parseChatConversationResponse(body);
        if (!parsed) {
          setState("error");
          return;
        }
        setConversation(parsed.conversation);
        setPolicy(parsed.policy);
        writeChatCache(cacheKey, parsed);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, [cacheKey, conversationId, view]);

  useEffect(() => {
    // Reading the cache is intentionally non-authoritative: the server fetch
    // above must succeed before any cached response is rendered.
    void readChatCache<ChatHistoryResponse | ChatConversationResponse>(cacheKey);
    void load();
  }, [cacheKey, load]);

  useEffect(() => {
    const sync = () => void load();
    const onStorage = (event: StorageEvent) => {
      if (event.key?.endsWith("activity-epoch")) sync();
    };
    window.addEventListener(CHAT_ACTIVITY_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHAT_ACTIVITY_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  if (view === "history") {
    return (
      <div data-chat-history className="space-y-4">
        <StateMessage state={state} onRetry={load} />
        {state === "ready" && history ? (
          <div className="grid gap-3" aria-label="conversation history">
            {history.conversations.map((item) => (
              <a key={item.id} data-conversation-row href={`/chat/${encodeURIComponent(item.id)}-operator`} className="block border-2 border-foreground bg-surface-raised p-5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-attention">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-bold lowercase text-foreground">{item.title}</h2>
                    <p className="mt-1 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{item.sourceMode} · {item.messageCount} messages</p>
                  </div>
                  <span className="font-label text-[11px] uppercase tracking-[0.1em] text-secondary">{formatDate(item.updatedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="authenticated-chat-thread" className="space-y-5">
      <StateMessage state={state} onRetry={load} />
      {state === "ready" && conversation ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{conversation.sourceMode} · {conversation.state}</p>
              <h2 className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">{conversation.title}</h2>
            </div>
            <PolicyActions policy={policy} conversationId={conversation.id} onChanged={load} />
          </div>
          <div className="space-y-4" aria-label="conversation messages">
            {(conversation.messages ?? []).map((message) => (
              <article key={message.id} className="border-2 border-foreground/20 bg-surface-raised p-5" data-message-role={message.role}>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{message.role}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

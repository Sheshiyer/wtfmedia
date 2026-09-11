"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AskComposer } from "@/components/domain/public/AskComposer";
import { ConversationThreadFrame } from "@/components/domain/public/ConversationThread";
import { Button } from "@/components/ui/Button";
import { ChatSessionNavigator } from "./ChatSessionNavigator";
import {
  CHAT_ACTIVITY_EVENT,
  CHAT_API_ROOT,
  bumpChatActivityEpoch,
  parseChatConversationResponse,
  parseChatHistoryResponse,
  type ChatConversation,
  type ChatConversationResponse,
  type ChatMessage,
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
    expired: { title: "operator session expired", body: "reauthenticate through Clerk, then return to this conversation." },
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

function sourceText(source: unknown, key: string): string {
  if (!source || typeof source !== "object" || Array.isArray(source)) return "";
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function MessageMetadata({ message }: { message: ChatMessage }) {
  if (message.role !== "assistant") return null;
  const sources = message.sources ?? [];
  return (
    <aside data-chat-metadata className="mt-4 border-t border-foreground/20 pt-3 text-xs text-secondary">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-label uppercase tracking-[0.08em]" data-chat-grounding>
        <span>grounding: {message.groundingState ?? "not recorded"}</span>
        {message.sourceMode ? <span>evidence: {message.sourceMode}</span> : null}
        {message.model ? <span>model: {message.model}{message.modelFallback ? " · fallback" : ""}</span> : null}
        {message.requestId ? <span>request: {message.requestId}</span> : null}
      </div>
      {message.uncutUnavailable ? <p className="mt-2" data-uncut-unavailable>uncut was requested, but no approved uncut evidence was available; published evidence is labelled as such.</p> : null}
      {sources.length > 0 ? (
        <ol className="mt-3 space-y-2" aria-label="answer sources">
          {sources.map((source, index) => {
            const url = sourceText(source, "url");
            const title = sourceText(source, "title") || `source ${index + 1}`;
            return (
              <li key={`${title}-${index}`}>
                <a href={url || undefined} target={url ? "_blank" : undefined} rel={url ? "noreferrer" : undefined} className="underline decoration-foreground/40 underline-offset-2">
                  [{sourceText(source, "n") || index + 1}] {title}
                </a>
                {sourceText(source, "sourceMode") ? <span> · {sourceText(source, "sourceMode")}</span> : null}
                {sourceText(source, "start") ? <span> · {sourceText(source, "start")}s</span> : null}
                {sourceText(source, "mappingStatus") ? <span> · {sourceText(source, "mappingStatus")}</span> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </aside>
  );
}

function ChatComposer({ conversationId, onSent }: { conversationId?: string; onSent: () => void }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    const value = question.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(false);
    try {
      const endpoint = conversationId
        ? `${CHAT_API_ROOT}/conversations/${encodeURIComponent(conversationId)}`
        : CHAT_API_ROOT;
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ question: value, sourceMode: "both" }),
      });
      if (!response.ok) throw new Error("chat_send_failed");
      const parsed = parseChatConversationResponse(await response.json());
      if (!parsed) throw new Error("chat_response_invalid");
      setQuestion("");
      bumpChatActivityEpoch();
      if (!conversationId) {
        window.location.assign(`/beta/chat/${encodeURIComponent(parsed.conversation.id)}`);
      } else {
        onSent();
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <div id="new-chat" data-chat-composer data-chat-source-mode="both" className="grid gap-2"><p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">evidence: both timelines</p><AskComposer value={question} onChange={setQuestion} onSubmit={() => void submit()} disabled={busy} loading={busy} variant="compact" placement="inline" />{error ? <span role="alert" className="text-xs text-attention">the answer could not be saved. retry this turn.</span> : null}</div>;
}

export function ChatWorkspace({ view, conversationId }: { view: ChatView; conversationId?: string }) {
  const [state, setState] = useState<ViewState>("loading");
  const [history, setHistory] = useState<ChatHistoryResponse | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [policy, setPolicy] = useState<ChatPolicy>({ archive: false, export: false });
  const [loadingMore, setLoadingMore] = useState(false);

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
        setState(parsed.conversations.length ? "ready" : "empty");
      } else {
        const parsed = parseChatConversationResponse(body);
        if (!parsed) {
          setState("error");
          return;
        }
        setConversation(parsed.conversation);
        setPolicy(parsed.policy);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, [conversationId, view]);

  const loadMore = useCallback(async () => {
    const cursor = history?.nextCursor;
    if (view !== "history" || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`${CHAT_API_ROOT}/conversations?cursor=${encodeURIComponent(cursor)}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("history_page_failed");
      const parsed = parseChatHistoryResponse(await response.json());
      if (!parsed) throw new Error("history_page_invalid");
      setHistory((current) => current ? { ...parsed, conversations: [...current.conversations, ...parsed.conversations] } : parsed);
      setPolicy(parsed.policy);
    } catch {
      // Keep the already-authoritative page visible when a later page fails.
    } finally {
      setLoadingMore(false);
    }
  }, [history?.nextCursor, loadingMore, view]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <div data-chat-history data-chat-frame="alpha" className="min-h-[calc(100vh-5.5rem)] bg-canvas">
        <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 pt-5 sm:px-8 xl:px-12">
          <div className="border-b-2 border-foreground pb-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">company beta · private workspace</p>
            <h1 className="mt-1 font-display text-lg font-extrabold lowercase">ask wtf</h1>
          </div>
        </div>
        <div className="mx-auto max-w-[var(--wtf-content-max)] space-y-4 px-4 py-6 sm:px-8 xl:px-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">account conversation ledger</p>
            <Link
              href="/beta/chat#new-chat"
              data-new-chat
              className="inline-flex min-h-11 items-center border-2 border-foreground bg-attention px-4 py-2 font-label text-sm font-bold lowercase text-on-attention shadow-[4px_4px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
            >
              new chat
            </Link>
          </div>
          <ChatComposer onSent={load} />
          <StateMessage state={state} onRetry={load} />
          {state === "ready" && history ? (
            <div className="grid gap-3" aria-label="conversation history">
              {history.conversations.map((item) => (
                <a key={item.id} data-conversation-row href={`/beta/chat/${encodeURIComponent(item.id)}`} className="block border-2 border-foreground bg-surface-raised p-5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-attention">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-xl font-bold lowercase text-foreground">{item.title}</h2>
                      <p className="mt-1 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{item.sourceMode} · {item.messageCount} messages · {item.state}</p>
                      {item.operatorDisplayName || item.operatorEmail ? <p data-chat-owner className="mt-2 text-xs text-secondary">owner: {item.operatorDisplayName ?? item.operatorEmail}{item.operatorDisplayName && item.operatorEmail ? ` · ${item.operatorEmail}` : ""}</p> : null}
                    </div>
                    <span className="font-label text-[11px] uppercase tracking-[0.1em] text-secondary">{formatDate(item.updatedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
          {state === "ready" && history?.nextCursor ? (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="secondary" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore}>
                load more conversations
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]" data-chat-conversation-layout>
      <ChatSessionNavigator activeConversationId={conversationId ?? ""} />
      <div data-testid="authenticated-chat-thread" className="min-w-0 space-y-5">
        <StateMessage state={state} onRetry={load} />
        {state === "ready" && conversation ? (
          <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{conversation.sourceMode} · {conversation.state}</p>
              <h2 className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">{conversation.title}</h2>
              {conversation.operatorDisplayName || conversation.operatorEmail ? <p data-chat-owner className="mt-2 text-xs text-secondary">owner: {conversation.operatorDisplayName ?? conversation.operatorEmail}{conversation.operatorDisplayName && conversation.operatorEmail ? ` · ${conversation.operatorEmail}` : ""}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/beta/chat"
                data-history-back
                className="inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
              >
                back to history
              </Link>
              <PolicyActions policy={policy} conversationId={conversation.id} onChanged={load} />
            </div>
          </div>
          <ConversationThreadFrame
            contentVersion={conversation.messages ?? []}
            layoutVersion={conversation.id}
            renderFooter={() => <ChatComposer conversationId={conversation.id} onSent={load} />}
            renderContent={({ scrollAnchor }) => <div className="mx-auto max-w-3xl space-y-4" aria-label="conversation messages">{(conversation.messages ?? []).map((message) => <article key={message.id} className="border-2 border-foreground/20 bg-surface-raised p-5" data-message-role={message.role}><p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{message.role}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p><MessageMetadata message={message} /></article>)}{scrollAnchor}</div>}
          />
          </>
        ) : null}
      </div>
    </div>
  );
}

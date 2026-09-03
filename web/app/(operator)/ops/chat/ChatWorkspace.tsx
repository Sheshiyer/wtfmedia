"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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

function ChatComposer({ conversationId, sourceMode = "both", onSent }: { conversationId?: string; sourceMode?: ChatConversation["sourceMode"]; onSent: () => void }) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<ChatConversation["sourceMode"]>(sourceMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        body: JSON.stringify({ question: value, sourceMode: mode }),
      });
      if (!response.ok) throw new Error("chat_send_failed");
      const parsed = parseChatConversationResponse(await response.json());
      if (!parsed) throw new Error("chat_response_invalid");
      setQuestion("");
      bumpChatActivityEpoch();
      if (!conversationId) {
        window.location.assign(`/chat/${encodeURIComponent(parsed.conversation.id)}-operator`);
      } else {
        onSent();
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form data-chat-composer onSubmit={submit} className="border-2 border-foreground bg-surface-subtle p-4">
      <label htmlFor="authenticated-chat-question" className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">ask WTF with account history</label>
      <textarea id="authenticated-chat-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} rows={3} placeholder="Ask about the published YouTube or approved uncut evidence…" className="mt-2 block w-full border-2 border-foreground bg-surface-raised p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-attention" disabled={busy} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          evidence
          <select value={mode} onChange={(event) => setMode(event.target.value as ChatConversation["sourceMode"])} className="ml-2 border border-foreground bg-surface-raised px-2 py-1 text-xs text-foreground" disabled={busy}>
            <option value="published">published YouTube</option>
            <option value="uncut">approved uncut</option>
            <option value="both">both</option>
          </select>
        </label>
        <Button type="submit" disabled={!question.trim() || busy} loading={busy}>send</Button>
        {error ? <span role="alert" className="text-xs text-attention">the answer could not be saved. retry this turn.</span> : null}
      </div>
    </form>
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
        <ChatComposer onSent={load} />
        <StateMessage state={state} onRetry={load} />
        {state === "ready" && history ? (
          <div className="grid gap-3" aria-label="conversation history">
            {history.conversations.map((item) => (
              <a key={item.id} data-conversation-row href={`/chat/${encodeURIComponent(item.id)}-operator`} className="block border-2 border-foreground bg-surface-raised p-5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-attention">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-bold lowercase text-foreground">{item.title}</h2>
                    <p className="mt-1 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{item.sourceMode} · {item.messageCount} messages</p>
                    {item.operatorDisplayName || item.operatorEmail ? <p data-chat-owner className="mt-2 text-xs text-secondary">owner: {item.operatorDisplayName ?? item.operatorEmail}{item.operatorDisplayName && item.operatorEmail ? ` · ${item.operatorEmail}` : ""}</p> : null}
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
              {conversation.operatorDisplayName || conversation.operatorEmail ? <p data-chat-owner className="mt-2 text-xs text-secondary">owner: {conversation.operatorDisplayName ?? conversation.operatorEmail}{conversation.operatorDisplayName && conversation.operatorEmail ? ` · ${conversation.operatorEmail}` : ""}</p> : null}
            </div>
            <PolicyActions policy={policy} conversationId={conversation.id} onChanged={load} />
          </div>
          <ChatComposer conversationId={conversation.id} sourceMode={conversation.sourceMode} onSent={load} />
          <div className="space-y-4" aria-label="conversation messages">
            {(conversation.messages ?? []).map((message) => (
              <article key={message.id} className="border-2 border-foreground/20 bg-surface-raised p-5" data-message-role={message.role}>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{message.role}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
                <MessageMetadata message={message} />
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

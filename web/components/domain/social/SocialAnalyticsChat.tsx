"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";
import { Button } from "@/components/ui/Button";
import type { SocialChatAnswer, SocialChatMessage, SocialScope } from "@/lib/social-analytics/contracts";
import {
  candidateQuestion, createSocialRequestGate, formatSocialValue, parseSocialMessages, readSocialAnswerResponse,
  safeSocialUrl, socialAnswerText, socialDifferenceCells, socialRequestBody, socialScopeLabel, socialResponseError,
  type SocialViewContext,
} from "@/lib/social-analytics/chat-view";

const baseUrl = "/beta/api/social-analytics";
type SavedChat = { id: string; title: string; updatedAt: string };
type Operation = "answer" | "save" | "list" | "load" | "delete";
type Retry = { request: ReturnType<typeof socialRequestBody>; messages: SocialChatMessage[] };
const validId = (id: unknown): id is string => typeof id === "string" && /^sinv_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function SocialAnswerView({ answer }: { answer: SocialChatAnswer }) {
  const comparisons = answer.rows.some((row) => row.difference !== undefined || row.percentChange !== undefined);
  return <div className="min-w-0 space-y-4">
    <p className="font-label text-xs font-bold uppercase text-muted">{answer.status.replaceAll("_", " ")}</p>
    <p className="text-xs text-secondary">{socialScopeLabel(answer.scope)}</p>
    <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.summary}</p>
    {answer.entities.length > 0 && <ul className="space-y-1 text-xs text-secondary" aria-label="Resolved entities">
      {answer.entities.map((entity, index) => {
        const url = safeSocialUrl(entity.url);
        return <li key={`${entity.platform}:${entity.id}:${index}`}>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{entity.label}</a> : entity.label}
          {` · ${entity.platform} · ${entity.id}${entity.accountId ? ` · account ${entity.accountId}` : ""}`}
        </li>;
      })}
    </ul>}
    {answer.rows.length > 0 && <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-control border border-foreground/20" role="region" aria-label="Answer metrics; scroll horizontally for more columns" tabIndex={0}>
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Social analytics metrics for {socialScopeLabel(answer.scope)}</caption>
        <thead className="bg-surface-subtle"><tr>
          {["Metric", ...answer.columns, ...(comparisons ? ["Difference", "% change"] : [])].map((column, index) => <th key={index} scope="col" className="min-w-24 px-3 py-2 font-label font-bold">{column}</th>)}
        </tr></thead>
        <tbody>{answer.rows.map((row, index) => <tr key={index} className="border-t border-foreground/10">
          <th scope="row" className="px-3 py-3 font-medium">{row.label}</th>
          {[...row.values.map((value) => formatSocialValue(value, row.unit)), ...(comparisons ? socialDifferenceCells(row) : [])].map((value, cell) => <td key={cell} className="px-3 py-3 tabular-nums">{value}</td>)}
        </tr>)}</tbody>
      </table>
    </div>}
    {answer.limitations.length > 0 && <ul aria-label="Limitations" className="list-disc space-y-1 pl-5 text-xs text-secondary">
      {answer.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}
    </ul>}
    {answer.evidence.length > 0 ? <details className="rounded-control border border-foreground/20 p-3 text-xs">
      <summary className="cursor-pointer py-1 font-label font-bold">Sources &amp; freshness ({answer.evidence.length})</summary>
      <ul className="mt-3 space-y-4">{answer.evidence.map((item, index) => {
        const url = safeSocialUrl(item.sourceUrl);
        return <li key={index} className="space-y-1 border-t border-foreground/10 pt-3">
          <p className="font-bold">{item.entity.label} · {item.entity.platform} · {item.entity.id}</p>
          <p>{item.metric}: {formatSocialValue(item.value, item.unit)}</p>
          <p>Basis: {item.basis} · {item.fromDate} – {item.toDate} (UTC)</p>
          <p>Fetched: <time dateTime={item.fetchedAt}>{item.fetchedAt}</time></p>
          <p>Data as of: {item.dataAsOf ? <time dateTime={item.dataAsOf}>{item.dataAsOf}</time> : "unavailable"}</p>
          {item.reason && <p>{item.reason}</p>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block py-2 underline underline-offset-2">Open source</a>}
        </li>;
      })}</ul>
    </details> : <p className="text-xs text-muted">No metric evidence returned.</p>}
  </div>;
}

export function SocialAnalyticsChat({ scope }: { scope: SocialScope }) {
  const memberFetch = useMemberFetch();
  const id = useId();
  const [gate] = useState(createSocialRequestGate);
  const [messages, setMessages] = useState<SocialChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Operation | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [retry, setRetry] = useState<Retry | null>(null);
  const retryRef = useRef<Retry | null>(null);
  const context = useRef<SocialViewContext | null>(null);
  const savedId = useRef<string | null>(null);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState<SavedChat[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedChat | null>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const scopeKey = `${scope.platform}:${scope.fromDate}:${scope.toDate}`;
  const previousScope = useRef(scopeKey);

  useLayoutEffect(() => {
    if (previousScope.current === scopeKey) return;
    previousScope.current = scopeKey;
    gate.cancel();
    context.current = null;
    retryRef.current = null;
    setRetry(null);
    setPending(null);
    setDeleteTarget(null);
    setNotice({ text: "Dashboard filters changed. Your next question uses these filters; previous answers keep their original scope." });
  }, [gate, scopeKey]);

  useLayoutEffect(() => () => gate.cancel(), [gate]);
  useEffect(() => {
    const area = scrollArea.current;
    if (area && !showSaved) area.scrollTop = area.scrollHeight;
  }, [messages, pending, showSaved]);

  async function run(operation: Operation, task: (signal: AbortSignal) => Promise<() => void>, failed?: () => void) {
    const ticket = gate.start();
    if (!ticket) return;
    setPending(operation);
    setNotice(null);
    try {
      const apply = await task(ticket.controller.signal);
      if (gate.current(ticket)) apply();
    } catch (error) {
      if (gate.current(ticket)) {
        setNotice({ text: error instanceof Error ? error.message : "The request failed. Please retry.", error: true });
        failed?.();
      }
    } finally {
      if (gate.current(ticket)) { gate.finish(ticket); setPending(null); }
    }
  }

  function ask(question: string, retryTurn?: Retry) {
    if (!question.trim() || question.trim().length > 2000) return;
    const previous = retryTurn?.messages ?? messages;
    if (previous.length > 98) { setNotice({ text: "This chat has reached 100 messages. Save it and start a new chat.", error: true }); return; }
    const turn: Retry = retryTurn ?? { request: socialRequestBody(question, scope, previous, context.current), messages: previous };
    void run("answer", async (signal) => {
      retryRef.current = turn;
      setRetry(null);
      setShowSaved(false);
      setDraft("");
      const next: SocialChatMessage[] = [...previous, { role: "user", content: turn.request.question }];
      setMessages(next);
      const response = await memberFetch(`${baseUrl}/assistant`, {
        method: "POST", headers: { "content-type": "application/json" }, signal, body: JSON.stringify(turn.request),
      });
      const answer = await readSocialAnswerResponse(response);
      return () => {
        setMessages([...next, { role: "assistant", content: answer.summary, answer }]);
        context.current = { visibleScope: turn.request.scope, scope: answer.scope, entities: answer.entities };
        retryRef.current = answer.retryable ? turn : null;
        setRetry(answer.retryable ? turn : null);
      };
    }, () => setRetry(turn));
  }

  function newChat() {
    gate.cancel();
    context.current = null;
    savedId.current = null;
    retryRef.current = null;
    setMessages([]); setDraft(""); setRetry(null); setPending(null); setHistoricalCount(0);
    setDeleteTarget(null); setShowSaved(false); setNotice({ text: "New chat ready." });
    composer.current?.focus();
  }

  function stopWaiting() {
    gate.cancel();
    setPending(null);
    setRetry(retryRef.current);
    setNotice({ text: "Stopped waiting. The provider may still be processing the request." });
  }

  function listSaved() {
    setShowSaved(true);
    void run("list", async (signal) => {
      const response = await memberFetch(`${baseUrl}/investigations`, { signal });
      if (!response.ok) throw socialResponseError(response);
      const payload = await response.json();
      if (!Array.isArray(payload?.investigations) || !payload.investigations.every((item: SavedChat) => item && validId(item.id) && typeof item.title === "string" && typeof item.updatedAt === "string")) {
        throw new Error("The saved-chat list could not be read. Please refresh it.");
      }
      return () => setSaved(payload.investigations);
    });
  }

  function saveChat() {
    if (!messages.length) return;
    void run("save", async (signal) => {
      const snapshot = parseSocialMessages(messages);
      const investigationId = savedId.current ?? `sinv_${crypto.randomUUID()}`;
      savedId.current = investigationId;
      const response = await memberFetch(`${baseUrl}/investigations`, {
        method: "POST", headers: { "content-type": "application/json" }, signal,
        body: JSON.stringify({ id: investigationId, schemaVersion: 1, messages: snapshot }),
      });
      if (!response.ok) throw socialResponseError(response);
      const receipt = await response.json();
      if (receipt?.id !== investigationId) throw new Error("The server did not confirm this chat was saved. Please retry.");
      return () => { setSaved(null); setNotice({ text: "Chat saved to your account." }); };
    });
  }

  function openChat(item: SavedChat) {
    void run("load", async (signal) => {
      const response = await memberFetch(`${baseUrl}/investigations/${encodeURIComponent(item.id)}`, { signal });
      if (!response.ok) throw socialResponseError(response);
      const payload = await response.json();
      if (payload?.schemaVersion !== 1) throw new Error("This saved chat uses an unsupported format.");
      const snapshot = parseSocialMessages(payload.messages);
      return () => {
        setMessages(snapshot); setHistoricalCount(snapshot.length); setDraft(""); setRetry(null);
        retryRef.current = null;
        savedId.current = item.id;
        const last = snapshot.findLast((message) => message.role === "assistant" && message.answer)?.answer;
        context.current = last ? { visibleScope: scope, scope: last.scope, entities: last.entities } : null;
        setShowSaved(false);
        setNotice({ text: "Opened a historical chat. Follow-up questions fetch metrics again." });
        composer.current?.focus();
      };
    });
  }

  function deleteChat(item: SavedChat) {
    void run("delete", async (signal) => {
      const response = await memberFetch(`${baseUrl}/investigations/${encodeURIComponent(item.id)}`, { method: "DELETE", signal });
      if (!response.ok) throw socialResponseError(response);
      const receipt = await response.json();
      if (receipt?.deleted !== true) throw new Error("The server did not confirm deletion. Please retry.");
      return () => {
        setSaved((items) => items?.filter((saved) => saved.id !== item.id) ?? null);
        if (savedId.current === item.id) {
          savedId.current = null; context.current = null; retryRef.current = null;
          setMessages([]); setDraft(""); setRetry(null); setHistoricalCount(0);
        }
        setDeleteTarget(null);
        setNotice({ text: "Saved chat permanently deleted." });
      };
    });
  }

  async function copyAnswer(answer: SocialChatAnswer) {
    const revision = gate.revision();
    try {
      await navigator.clipboard.writeText(socialAnswerText(answer));
      if (revision === gate.revision()) setNotice({ text: "Answer copied." });
    } catch {
      if (revision === gate.revision()) setNotice({ text: "Copy was unavailable. Use Download answer instead.", error: true });
    }
  }

  function downloadAnswer(answer: SocialChatAnswer) {
    try {
      const url = URL.createObjectURL(new Blob([socialAnswerText(answer)], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = "social-analytics-answer.txt";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ text: "Answer download started." });
    } catch { setNotice({ text: "The answer could not be downloaded. Try Copy answer.", error: true }); }
  }

  const busy = pending !== null;
  return <section aria-labelledby={`${id}-heading`} className="flex h-[min(52rem,85dvh)] min-h-[30rem] w-full min-w-0 max-w-full flex-col overflow-hidden border-2 border-foreground bg-surface-raised text-foreground">
    <header className="shrink-0 space-y-2 border-b-2 border-foreground p-3 sm:p-4">
      <div><p className="font-label text-[11px] font-bold uppercase tracking-wide text-muted">Social analytics</p>
        <h2 id={`${id}-heading`} className="font-display text-2xl font-bold lowercase">ask the numbers.</h2></div>
      <p className="break-words text-xs text-secondary">Next question: {socialScopeLabel(context.current?.scope ?? scope)}</p>
      <div className="flex flex-wrap gap-1">
        <Button variant="secondary" className="px-2 text-xs" onClick={newChat}>New chat</Button>
        <Button variant="secondary" className="px-2 text-xs" disabled={busy || !messages.length} onClick={saveChat}>Save chat</Button>
        <Button variant="ghost" className="px-2 text-xs" disabled={busy} aria-expanded={showSaved} aria-controls={`${id}-saved`} onClick={() => showSaved ? setShowSaved(false) : listSaved()}>{showSaved ? "Hide saved chats" : "Saved chats"}</Button>
      </div>
    </header>

    <div ref={scrollArea} className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 [overflow-wrap:anywhere]" aria-label="Social analytics conversation" tabIndex={0}>
      {showSaved && <section id={`${id}-saved`} aria-label="Saved chats" className="space-y-3 rounded-control border border-foreground/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-label font-bold">Your saved chats</h3><Button variant="ghost" disabled={busy} onClick={listSaved}>Refresh list</Button></div>
        <p className="text-xs text-secondary">Saved answers are historical snapshots, not current evidence.</p>
        {saved?.length === 0 && <p className="text-sm">No saved chats yet.</p>}
        {saved === null && pending !== "list" && <p className="text-sm">Refresh the list to load your saved chats.</p>}
        <ul className="space-y-3">{saved?.map((item) => <li key={item.id} className="space-y-2 border-t border-foreground/20 pt-3">
          <p className="text-sm font-bold">{item.title}</p><p className="text-xs text-muted">Saved: <time dateTime={item.updatedAt}>{item.updatedAt}</time></p>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => openChat(item)} aria-label={`Open saved chat: ${item.title}`}>Open</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDeleteTarget(item)} aria-label={`Delete saved chat: ${item.title}`}>Delete</Button></div>
        </li>)}</ul>
      </section>}

      <div>
        <Button variant="ghost" aria-expanded={showSuggestions} aria-controls={`${id}-suggestions`} onClick={() => setShowSuggestions((shown) => !shown)}>{showSuggestions ? "Hide suggestions" : "Show suggestions"}</Button>
        {showSuggestions && <div id={`${id}-suggestions`} className="mt-2 flex flex-wrap gap-2">
          {["Summarize the available metrics for this scope.", "Which metrics are unavailable in this scope?"].map((question) => <Button key={question} variant="secondary" className="max-w-full text-left text-xs" disabled={busy} onClick={() => ask(question)}>{question}</Button>)}
        </div>}
      </div>

      {messages.length === 0 && <p className="text-sm leading-relaxed text-secondary">Ask about your connected platforms, compare supported metrics, or investigate a post. Each answer shows its dates, metric basis and available sources.</p>}
      {messages.map((message, index) => <article key={index} aria-label={message.role === "user" ? "Your question" : "Analytics answer"} className={`min-w-0 space-y-3 rounded-control border border-foreground/20 p-3 ${message.role === "user" ? "bg-surface-subtle" : "bg-canvas"}`}>
        <p className="font-label text-xs font-bold uppercase text-muted">{message.role === "user" ? "You" : "Analytics"}</p>
        {message.role === "assistant" && index < historicalCount && <p className="text-xs font-bold text-secondary">Historical saved answer · original evidence timestamps below · follow-ups fetch again</p>}
        {message.role === "assistant" && message.answer ? <>
          <SocialAnswerView answer={message.answer} />
          {!!message.answer.candidates?.length && <div className="space-y-2"><p className="text-sm font-bold">Choose the intended result:</p>
            <div className="flex flex-wrap gap-2">{message.answer.candidates.map((candidate, candidateIndex) => <Button variant="secondary" key={`${candidate.id}:${candidateIndex}`} className="max-w-full text-left text-xs" disabled={busy} onClick={() => ask(candidateQuestion(candidate))}>{candidate.label} · {candidate.platform} · {candidate.id}{candidate.accountId ? ` · account ${candidate.accountId}` : ""}</Button>)}</div>
          </div>}
          <div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={busy} onClick={() => void copyAnswer(message.answer!)}>Copy answer</Button><Button variant="ghost" disabled={busy} onClick={() => downloadAnswer(message.answer!)}>Download answer</Button></div>
        </> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>}
      </article>)}
    </div>

    <footer className="min-w-0 shrink-0 space-y-2 border-t-2 border-foreground bg-surface-raised p-3 sm:p-4">
      <div role="status" aria-live="polite" className="text-xs text-secondary">
        {pending === "answer" ? "Fetching metrics…" : pending === "save" ? "Saving chat…" : pending === "list" ? "Loading saved chats…" : pending === "load" ? "Opening saved chat…" : pending === "delete" ? "Deleting saved chat…" : !notice?.error ? notice?.text : null}
      </div>
      {notice?.error && <p role="alert" className="text-xs text-editorial">{notice.text}</p>}
      <form onSubmit={(event) => { event.preventDefault(); ask(draft); }} className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1"><label htmlFor={`${id}-question`} className="block font-label text-xs font-bold">Ask about social analytics</label><span className="text-xs text-muted">{draft.length}/2,000</span></div>
        <textarea ref={composer} id={`${id}-question`} rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a question about the selected scope…" className="block w-full min-w-0 resize-none rounded-control border-2 border-foreground bg-canvas p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {retry && !busy && <Button variant="secondary" className="px-2 text-xs" aria-label="Retry last question" onClick={() => ask(retry.request.question, retry)}>Retry</Button>}
          {pending === "answer" ? <Button variant="secondary" onClick={stopWaiting}>Stop waiting</Button> : <Button type="submit" disabled={busy || !draft.trim()}>Send question</Button>}
        </div>
      </form>
    </footer>

    <Dialog.Root open={deleteTarget !== null} onOpenChange={(open) => { if (!open && pending !== "delete") setDeleteTarget(null); }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70" />
        <Dialog.Content onOpenAutoFocus={(event) => { event.preventDefault(); cancelDelete.current?.focus(); }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel border-2 border-foreground bg-surface-raised p-5">
          <Dialog.Title className="font-heading text-xl font-bold">Permanently delete this saved chat?</Dialog.Title>
          <Dialog.Description className="mt-3 break-words text-sm">“{deleteTarget?.title}” will be removed from your account. This cannot be undone.</Dialog.Description>
          {pending === "delete" && <p role="status" className="mt-3 text-sm">Deleting saved chat…</p>}
          {notice?.error && <p role="alert" className="mt-3 text-sm text-editorial">{notice.text}</p>}
          <div className="mt-5 flex flex-wrap gap-3"><Button ref={cancelDelete} variant="secondary" disabled={pending === "delete"} onClick={() => setDeleteTarget(null)}>Keep chat</Button>
            <Button variant="attention" disabled={busy} onClick={() => { if (deleteTarget) deleteChat(deleteTarget); }}>Permanently delete</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}

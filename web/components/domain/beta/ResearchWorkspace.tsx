"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";
import { Button } from "@/components/ui/Button";
import { ResearchContent, ResearchMarkdown } from "./ResearchContent";
import {
  parseResearchBrief, parseResearchInput, researchFailureSummary,
  researchIsRunning, researchRequest, ResearchRequestError, RESEARCH_NOTES_LIMIT,
  RESEARCH_SECTIONS, type ResearchBrief, type ResearchSummary, type ResearchInputV2,
} from "@/lib/research";

const control = "min-h-11 w-full min-w-0 rounded-control border-2 border-foreground bg-canvas px-3 py-2 text-sm";
const unavailable = "We can’t connect to Research right now. Your saved briefs are still available. We’ll check again shortly.";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Research could not complete that request. Please try again.";

async function download(brief: ResearchBrief) {
  const { buildResearchDocx } = await import("@/lib/research-docx");
  const url = URL.createObjectURL(await buildResearchDocx(brief));
  const link = document.createElement("a"); link.href = url;
  link.download = `${brief.title.replace(/[^a-z0-9_-]+/giu, "-").slice(0, 80) || "research"}.docx`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResearchWorkspace() {
  const fetcher = useMemberFetch();
  const principal = useBetaPrincipal();
  const canWrite = principal.capabilities.includes("research:write");
  const [list, setList] = useState<ResearchSummary[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResearchSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteInFlight = useRef<string | null>(null);
  const deletedIds = useRef(new Set<string>());
  const [researchInput, setResearchInput] = useState<ResearchInputV2>({ guestName: "", companyName: "", industry: "", audienceCountry: "IN" });
  const createInFlight = useRef(false);
  const validInput = validResearchInput(researchInput);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setNotice("");
    void researchRequest<{ configured: boolean; briefs: ResearchSummary[] }>(fetcher, "", { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        if (typeof data.configured !== "boolean" || !Array.isArray(data.briefs)) throw new Error("Saved research could not be loaded.");
        setConfigured(data.configured); setList(data.briefs.filter(row => !deletedIds.current.has(row.id)));
      }).catch(error => { if (!controller.signal.aborted) setNotice(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [fetcher, reload]);
  useEffect(() => {
    if (configured || loading) return;
    const timer = setTimeout(() => setReload(value => value + 1), 30000);
    return () => clearTimeout(timer);
  }, [configured, loading]);
  const updateSummary = useCallback((brief: ResearchBrief) => {
    if (deletedIds.current.has(brief.id) || deleteInFlight.current === brief.id) return;
    const { id, title, status, updatedAt, revision, shared, canEdit } = brief;
    setList(rows => [{ id, title, status, updatedAt, revision, shared, canEdit }, ...rows.filter(row => row.id !== id)]);
  }, []);
  function select(id: string) {
    if (creating || selected === id) return;
    setSelected(id);
  }
  async function create() {
    if (!canWrite || !configured || createInFlight.current || !validInput) return;
    const signal = lifetime.current!.signal; createInFlight.current = true; setCreating(true); setNotice("");
    try {
      const data = await researchRequest<{ brief: unknown }>(fetcher, "", { method: "POST", body: { schemaVersion: 2, researchInput: parseResearchInput(researchInput), notes, notesApproved: !!notes.trim() }, signal });
      if (signal.aborted) return;
      const brief = parseResearchBrief(data.brief); updateSummary(brief); setSelected(brief.id); setResearchInput({ guestName: "", companyName: "", industry: "", audienceCountry: "IN" }); setNotes("");
    } catch (error) { if (!signal.aborted) { setNotice(errorMessage(error)); if (error instanceof ResearchRequestError && error.status === 503) setConfigured(false); } }
    finally { createInFlight.current = false; if (!signal.aborted) setCreating(false); }
  }
  async function removeBrief() {
    if (!deleteTarget || deleteInFlight.current || !canWrite || !deleteTarget.canEdit) return;
    const target = deleteTarget;
    deleteInFlight.current = target.id; setDeletingId(target.id); setNotice(""); setDeleteTarget(null);
    const signal = lifetime.current!.signal;
    try {
      const result = await researchRequest<{ deleted: boolean }>(fetcher, `/${encodeURIComponent(target.id)}`, { method: "DELETE", signal });
      if (signal.aborted) return;
      if (result.deleted !== true) throw new Error("Deletion could not be confirmed.");
      deletedIds.current.add(target.id);
      setList(rows => rows.filter(row => row.id !== target.id));
      setSelected(current => current === target.id ? null : current);
    } catch (error) {
      if (!signal.aborted) {
        setNotice(`${errorMessage(error)} Use the bin beside the brief to retry deletion.`);
        setList(rows => rows.map(row => row.id === target.id ? { ...row, status: "deleting" } : row));
      }
    } finally {
      deleteInFlight.current = null;
      if (!signal.aborted) setDeletingId(null);
    }
  }
  return <section aria-label="Research workspace" className="space-y-6">
    <header className="shrink-0"><p className="font-label text-xs font-bold uppercase tracking-widest text-secondary">WTF OS · Research</p><h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Research</h1><p className="mt-3 max-w-2xl text-secondary">Build a source-backed brief, shape the questions, and keep the evidence close.</p></header>
    {!loading && !configured && <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-2 border-foreground bg-surface-subtle p-4 text-sm"><p className="max-w-3xl">{unavailable}</p><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Retry connection</Button></div>}
    {notice && <p role="alert">{notice}</p>}
        {canWrite && <form aria-label="New research" className="shrink-0 border-2 border-foreground bg-surface-raised p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void create(); }}><fieldset disabled={creating} className="min-w-0 space-y-4"><legend className="mb-2 font-heading text-xl font-bold">Start a new brief</legend><p className="text-sm text-secondary">Research a guest, company or industry around the world, with context for an Indian audience. Enter any one field to start.</p>
          <ResearchInputFields value={researchInput} onChange={setResearchInput} />
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Additional info (optional)</summary><div className="grid items-start gap-6 border-t border-foreground/15 pt-5 ">
            <div className="min-w-0 space-y-4"><label className="grid gap-2 text-sm font-bold">Additional info<textarea placeholder="Guide the research: topics to prioritize, comparisons, exclusions, interview angle, or an optional time period." className={`${control} min-h-40 resize-y font-normal`} maxLength={RESEARCH_NOTES_LIMIT} value={notes} onChange={event => setNotes(event.target.value)} /></label>
            <p className="text-xs text-secondary">Used to guide research and writing. The AI receives this information; public searches use derived topics and any requested date constraints.</p></div>
          </div></details>
          <Button type="submit" className="w-full sm:w-auto" variant="attention" disabled={loading || !configured || !validInput || creating} loading={creating}>{creating ? "Starting…" : "Start new research"}</Button>
          </fieldset>
        </form>}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4 border-2 border-foreground bg-surface-raised p-5 lg:sticky lg:top-[calc(7rem+env(safe-area-inset-top))] lg:flex lg:max-h-[calc(100dvh-8rem-env(safe-area-inset-top))] lg:min-h-0 lg:flex-col" aria-label="Saved research briefs">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-lg font-bold">Saved briefs</h2><Button variant="ghost" disabled={loading || creating} onClick={() => setReload(value => value + 1)}>Refresh</Button></div>
        {loading && <p role="status">Loading saved briefs…</p>}
        {!loading && !list.length && <p className="text-sm text-secondary">Your briefs will appear here after you start research.</p>}
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1">{list.map(row => <li key={row.id} className={`flex min-w-0 items-start border-2 border-foreground ${selected === row.id ? "bg-attention" : "bg-surface-raised"}`}>
          <button type="button" aria-current={selected === row.id ? "true" : undefined} onClick={() => select(row.id)} className="min-w-0 flex-1 p-3 text-left focus-visible:outline focus-visible:outline-2"><span className="block break-words font-bold">{row.title}</span><span className="mt-1 block text-xs" role={deletingId === row.id ? "status" : undefined}>{deletingId === row.id ? "Deleting research…" : row.status}{row.shared ? " · Shared" : ""}</span><span className="mt-1 block break-words text-xs text-secondary">{new Date(row.updatedAt).toLocaleString()}</span></button>
          {canWrite && row.canEdit && <button type="button" aria-label={`Delete ${row.title}`} title="Delete research" disabled={deletingId !== null} onClick={() => setDeleteTarget(row)} className="m-1 grid min-h-11 min-w-11 shrink-0 place-items-center rounded-control text-editorial hover:bg-editorial/10 focus-visible:outline focus-visible:outline-2 disabled:opacity-50"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>}
        </li>)}</ul>
      </aside>
      {selected ? <fieldset aria-label="Research report" tabIndex={0} className="min-w-0" disabled={creating || deletingId === selected}><ResearchEditor key={selected} id={selected} configured={configured} canWrite={canWrite} blocked={deletingId === selected || list.some(row => row.id === selected && row.status === "deleting")} onChange={updateSummary} /></fieldset>
        : <div className="min-w-0 border-2 border-foreground bg-surface-raised p-6 sm:p-8"><h2 className="font-heading text-2xl font-bold">Your research brief</h2><p className="mt-2 max-w-2xl text-secondary">{list.length ? "Select a saved brief to read its findings, explore sources, or ask a follow-up question." : canWrite ? "Start with any guest, company or industry above. Your findings and sources will appear here as the research progresses." : "Saved briefs shared with you will appear here."}</p><ul className="mt-6 grid gap-x-6 gap-y-4 border-t border-foreground/20 pt-6 sm:grid-cols-2">{RESEARCH_SECTIONS.map(section => <li key={section.key} className="min-w-0"><h3 className="font-bold">{section.description}</h3></li>)}</ul></div>}
    </div>
    <Dialog.Root open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 border-2 border-foreground bg-canvas p-6"><Dialog.Title className="font-heading text-xl font-bold">Permanently delete this brief?</Dialog.Title><Dialog.Description>This permanently deletes {deleteTarget?.title}, its saved versions, sources and follow-up chat. Any running research will be stopped. This cannot be undone.</Dialog.Description><div className="flex flex-wrap gap-2"><Button autoFocus variant="secondary" onClick={() => setDeleteTarget(null)}>Keep brief</Button><Button onClick={() => void removeBrief()}>Delete permanently</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

function ResearchEditor({ id, configured, canWrite, blocked, onChange }: {
  id: string; configured: boolean; canWrite: boolean; blocked: boolean;
  onChange: (brief: ResearchBrief) => void;
}) {
  const fetcher = useMemberFetch();
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [clarification, setClarification] = useState("");
  const [cancelPending, setCancelPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const lifetime = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const path = `/${encodeURIComponent(id)}`;
  const owner = !!brief?.canEdit && canWrite;
  const deleting = blocked || brief?.status === "deleting";
  const cancellationPending = cancelPending || brief?.status === "cancel_pending";
  const editable = owner && !deleting && !cancellationPending;
  const running = !!brief && researchIsRunning(brief.status);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setNotice(""); setBrief(null);
    void researchRequest<{ brief: unknown }>(fetcher, path, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const next = parseResearchBrief(data.brief);
      if (next.id !== id) throw new Error("This brief could not be loaded.");
      setBrief(next); setCancelPending(next.status === "cancel_pending"); onChange(next);
    }).catch(error => { if (!controller.signal.aborted) setNotice(errorMessage(error)); });
    return () => controller.abort();
  }, [fetcher, id, onChange, path, reload]);
  useEffect(() => {
    if (!running || busy || blocked) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await researchRequest<{ brief: unknown }>(fetcher, path, { signal: controller.signal });
        if (controller.signal.aborted || mutation.current) return;
        const next = parseResearchBrief(data.brief);
        if (next.id !== id) throw new Error("This brief could not be refreshed.");
        setNotice(""); setBrief(current => current && next.revision >= current.revision ? next : current);
        setCancelPending(next.status === "cancel_pending"); onChange(next);
        if (!researchIsRunning(next.status)) return;
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice(errorMessage(error));
        if (error instanceof ResearchRequestError && [401, 403, 404].includes(error.status)) { setBrief(null); return; }
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 3000);
    }
    timer = setTimeout(() => void poll(), 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [busy, blocked, fetcher, id, onChange, path, running]);

  async function mutate(suffix: string, body?: unknown) {
    if (!(editable || (owner && !deleting && suffix === "/cancel")) || mutation.current || !brief) return false;
    if (suffix === "/chat" && brief.needsResearch) return false;
    mutation.current = true; setBusy(true); setNotice("");
    setPendingAction(suffix === "/run" ? "Starting research…" : suffix === "/cancel" ? "Stopping research…" : "Preparing your answer…");
    const signal = lifetime.current!.signal;
    try {
      const data = await researchRequest<{ brief: unknown }>(fetcher, path + suffix, { method: "POST", body, signal });
      if (signal.aborted) return false;
      const next = parseResearchBrief(data.brief);
      if (next.id !== id) throw new Error("This brief could not be updated.");
      setBrief(current => current && next.revision >= current.revision ? next : current);
      onChange(next); if (suffix === "/cancel") setCancelPending(false); return true;
    } catch (error) {
      if (!signal.aborted) {
        setNotice(errorMessage(error));
        if (error instanceof ResearchRequestError && error.code === "research_cancel_pending") setCancelPending(true);
        if (error instanceof ResearchRequestError && [401, 403, 404].includes(error.status)) setBrief(null);
        else if (error instanceof ResearchRequestError && error.code === "research_deletion_pending") setBrief(current => current ? { ...current, status: "deleting" } : current);
        else if (error instanceof ResearchRequestError && error.code === "research_running") setBrief(current => current ? { ...current, status: "running" } : current);
        else if (error instanceof ResearchRequestError && error.code === "research_conflict") setReload(value => value + 1);
      }
      return false;
    } finally { mutation.current = false; if (!signal.aborted) { setBusy(false); setPendingAction(""); } }
  }
  async function exportWord() {
    if (!brief || exporting) return;
    setExporting(true); setNotice("");
    try { await download(brief); }
    catch { if (!lifetime.current?.signal.aborted) setNotice("The Word file could not be prepared. Please try again."); }
    finally { if (!lifetime.current?.signal.aborted) setExporting(false); }
  }
  if (!brief) return <div className="min-w-0 border-2 border-foreground p-5"><p role={notice ? "alert" : "status"}>{notice || "Loading brief…"}</p>{notice && <Button onClick={() => setReload(value => value + 1)}>Try again</Button>}</div>;
  const modelDisabled = busy || !configured || !editable || (!!brief.notes.trim() && !brief.notesApproved);
  const sourcePrefix = "research-current-source-";
  const failure = brief.failure ?? brief.sections.find(section => section.failure)?.failure;
  const needsClarification = brief.status === "clarification";
  const hasReport = brief.sections.some(section => section.status !== "skipped" && section.content.trim());
  return <article className="min-w-0 space-y-5" aria-label="Research brief" aria-busy={busy}>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-2"><span className="border-2 border-foreground bg-surface-subtle px-2 py-1 font-label text-xs">{brief.needsResearch ? "Needs research" : brief.status}</span>{!owner && <span className="text-sm">Read only</span>}</div>
      <h2 className="break-words font-heading text-3xl font-bold [overflow-wrap:anywhere]">{brief.title}</h2>
      {brief.researchInput && <p className="text-sm">Audience context: India</p>}
      <div className="flex flex-wrap gap-2">
        {editable && brief.status === "draft" && <Button variant="attention" disabled={modelDisabled} onClick={() => void mutate("/run", { revision: brief.revision })}>Start research</Button>}
        {hasReport && <Button variant="secondary" disabled={exporting || deleting} onClick={() => void exportWord()}>{exporting ? "Preparing Word file…" : "Download Word"}</Button>}
      </div>
    </header>
    {pendingAction && <p role="status" aria-live="polite" className="border-2 border-foreground bg-surface-subtle p-3">{pendingAction}</p>}
    {notice && <p role="alert" className="border-2 border-foreground bg-surface-subtle p-3 text-sm">{notice}</p>}
    {needsClarification && <section aria-label="Clarification needed" className="space-y-3 border-2 border-foreground bg-attention p-4"><h3 className="font-heading text-xl font-bold">Clarification needed</h3><p>{brief.clarification || "Clarify the subject to continue, or skip to research only what is clear from your input."}</p>{editable && <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (clarification.trim()) void mutate("/run", { revision: brief.revision, clarification: clarification.trim() }).then(ok => { if (ok) setClarification(""); }); }}><label className="grid gap-1">Your clarification<textarea className={control} maxLength={2000} value={clarification} onChange={event => setClarification(event.target.value)} disabled={busy} /></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={modelDisabled || !clarification.trim()}>Continue research</Button><Button type="button" variant="secondary" disabled={modelDisabled} onClick={() => void mutate("/run", { revision: brief.revision, skipClarification: true })}>Skip and continue</Button></div></form>}</section>}
    {(running || cancellationPending) && <ResearchRunProgress brief={brief} cancellationPending={cancellationPending}>
      {owner && <Button variant="secondary" disabled={busy || deleting} onClick={() => void mutate("/cancel")}>{cancellationPending ? "Retry cancellation" : "Cancel research"}</Button>}
    </ResearchRunProgress>}
    {brief.status === "partial" && <div role="status" className="space-y-2 border-2 border-foreground bg-attention p-4"><h3 className="font-bold">This report is incomplete</h3><p>{brief.sections.filter(s => s.status === "completed").length} of {RESEARCH_SECTIONS.length - brief.sections.filter(s => s.status === "skipped").length} sections complete. Available findings are retained below.</p><p className="text-sm">{researchFailureSummary(failure)}</p></div>}
    {brief.status === "failed" && <div role="status" className="space-y-2 border-2 border-foreground p-4"><h3 className="font-bold">Research failed</h3><p>{researchFailureSummary(failure)}</p>{hasReport && <p>Available findings remain below; they are not a completed report.</p>}</div>}
    {brief.status === "cancelled" && <p role="status">Research was cancelled. Any returned findings remain below.</p>}
    {deleting && <p role="status">Deletion is pending. Use the bin beside this saved brief to retry if needed.</p>}
    {brief.status === "completed" && brief.warnings.some(warning => warning.endsWith("Some diagrams could not be generated within the remaining allowance.")) && <p role="status" className="border-2 border-foreground p-4">The written report is complete. Some diagrams could not be generated within the remaining allowance.</p>}
    {brief.status === "completed" && !hasReport && <p role="status">No report content was returned. Start a new brief to try again.</p>}
    <ResearchContent brief={brief} sourcePrefix={sourcePrefix} />
    {editable && hasReport && !needsClarification && <section className="space-y-3 border-2 border-foreground p-4" aria-label="Private research follow-up"><h3 className="font-heading text-xl font-bold">Follow-up</h3><p className="text-sm text-secondary">Ask about this report and its saved sources. Follow-ups do not search for new information.</p>
      <div className="space-y-3">{brief.messages.map((message, index) => <div key={index} className="min-w-0 border-l-2 border-foreground pl-3"><p className="mb-1 font-label text-xs font-bold">{message.role === "user" ? "You" : "Research"}</p><ResearchMarkdown content={message.content} sources={brief.sources} sourcePrefix={sourcePrefix} /></div>)}</div>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (question.trim()) void mutate("/chat", { question: question.trim() }).then(ok => { if (ok) setQuestion(""); }); }}><label className="grid gap-1 text-sm font-bold">Question<textarea className={control} maxLength={2000} value={question} disabled={busy || brief.needsResearch} onChange={event => setQuestion(event.target.value)} required /></label><Button type="submit" disabled={modelDisabled || running || brief.needsResearch || !question.trim()}>Ask follow-up</Button></form>
    </section>}
  </article>;
}

function validResearchInput(value: ResearchInputV2): boolean {
  try { parseResearchInput(value); return true; } catch { return false; }
}

function ResearchInputFields({ value, onChange }: { value: ResearchInputV2; onChange: (input: ResearchInputV2) => void }) {
  return <div className="min-w-0 space-y-3">
    <p className="text-sm font-bold">Audience context: India</p><p className="text-sm text-secondary">Enter a guest, company or industry. Other fields are optional.</p>
    <div className="grid min-w-0 gap-3 xl:grid-cols-3">
      {([{ key: "guestName", label: "Guest name", example: "Elon Musk" }, { key: "companyName", label: "Company name", example: "Tesla" }, { key: "industry", label: "Industry", example: "Electric vehicles" }] as const).map(field =>
        <label key={field.key} className="grid min-w-0 gap-1 text-sm font-bold">{field.label}<input className={control} minLength={2} maxLength={120} placeholder={`e.g. ${field.example}`} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })} /></label>)}
    </div>
  </div>;
}

function ResearchRunProgress({ brief, cancellationPending, children }: { brief: ResearchBrief; cancellationPending: boolean; children: ReactNode }) {
  const [started] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [started]);
  return <section aria-label="Research in progress" className="min-w-0 space-y-4 border-2 border-foreground bg-surface-raised p-5">
    <div role="status" aria-live="polite"><h3 className="font-heading text-2xl font-bold">{cancellationPending ? "Stopping your research…" : "Your report is cooking"}</h3>
      <p className="mt-2 break-words text-sm">{cancellationPending ? "Cancellation is not yet confirmed. Editing and new research are paused." : brief.progress.at(-1) || (brief.status === "queued" ? "Waiting to start" : "Research in progress")}</p></div>
    <p className="text-sm text-secondary">Elapsed in this view: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</p>
    <p className="text-sm text-secondary">Your report will update automatically. You can return to it from Saved briefs.</p>
    {children}
  </section>;
}

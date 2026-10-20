"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";
import { Button } from "@/components/ui/Button";
import { ResearchContent, ResearchMarkdown } from "./ResearchContent";
import {
  applyResearchReceipt, parseResearchBrief, parseResearchInput, researchTitle, researchFailureSummary, researchModelSummary, researchDraft, researchDraftChanged,
  researchIsRunning, researchMarkdown, researchRequest, ResearchRequestError, RESEARCH_NOTES_LIMIT,
  RESEARCH_SECTIONS, type ResearchBrief, type ResearchDraft, type ResearchSummary, type ResearchVersion, type ResearchInputV2,
} from "@/lib/research";

const control = "min-h-11 w-full min-w-0 rounded-control border-2 border-foreground bg-canvas px-3 py-2 text-sm";
const unavailable = "We can’t connect to Research right now. Your saved briefs are still available. We’ll check again shortly.";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Research could not complete that request. Please try again.";

function download(brief: ResearchBrief) {
  const url = URL.createObjectURL(new Blob([researchMarkdown(brief)], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url;
  link.download = `${brief.title.replace(/[^a-z0-9_-]+/giu, "-").slice(0, 80) || "research"}.md`;
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
  const [dirty, setDirty] = useState(false);
  const [researchInput, setResearchInput] = useState<ResearchInputV2>({ guestName: "", companyName: "", industry: "", audienceCountry: "IN" });
  const createInFlight = useRef(false);
  const validInput = validResearchInput(researchInput);
  const [notes, setNotes] = useState("");
  const [notesApproved, setNotesApproved] = useState(false);
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
        setConfigured(data.configured); setList(data.briefs);
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
    const { id, title, status, updatedAt, revision, shared } = brief;
    setList(rows => [{ id, title, status, updatedAt, revision, shared }, ...rows.filter(row => row.id !== id)]);
  }, []);
  function select(id: string) {
    if (creating || selected === id || (dirty && !window.confirm("Leave this brief and discard unsaved edits?"))) return;
    setDirty(false); setSelected(id);
  }
  async function create() {
    if (!canWrite || !configured || createInFlight.current || !validInput || (!!notes.trim() && !notesApproved) || (dirty && !window.confirm("Create a new brief and discard unsaved edits?"))) return;
    const signal = lifetime.current!.signal; createInFlight.current = true; setCreating(true); setNotice("");
    try {
      const data = await researchRequest<{ brief: unknown }>(fetcher, "", { method: "POST", body: { schemaVersion: 2, researchInput: parseResearchInput(researchInput), notes, notesApproved }, signal });
      if (signal.aborted) return;
      const brief = parseResearchBrief(data.brief); updateSummary(brief); setDirty(false); setSelected(brief.id); setResearchInput({ guestName: "", companyName: "", industry: "", audienceCountry: "IN" }); setNotes(""); setNotesApproved(false);
    } catch (error) { if (!signal.aborted) { setNotice(errorMessage(error)); if (error instanceof ResearchRequestError && error.status === 503) setConfigured(false); } }
    finally { createInFlight.current = false; if (!signal.aborted) setCreating(false); }
  }
  return <section aria-label="Research workspace" className="space-y-6">
    <header className="shrink-0"><p className="font-label text-xs font-bold uppercase tracking-widest text-secondary">WTF OS · Research</p><h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Research</h1><p className="mt-3 max-w-2xl text-secondary">Build a source-backed brief, shape the questions, and keep the evidence close.</p></header>
    {!loading && !configured && <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-2 border-foreground bg-surface-subtle p-4 text-sm"><p className="max-w-3xl">{unavailable}</p><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Retry connection</Button></div>}
    {notice && <p role="alert">{notice}</p>}
        {canWrite && <form aria-label="New research" className="shrink-0 border-2 border-foreground bg-surface-raised p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void create(); }}><fieldset disabled={creating} className="min-w-0 space-y-4"><legend className="mb-2 font-heading text-xl font-bold">Start a new brief</legend><p className="text-sm text-secondary">Research a guest, their company and industry around the world, with context for an Indian audience.</p>
          <ResearchInputFields value={researchInput} onChange={setResearchInput} />
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Private notes (optional)</summary><div className="grid items-start gap-6 border-t border-foreground/15 pt-5 ">
            <div className="min-w-0 space-y-4"><label className="grid gap-2 text-sm font-bold">Private notes<textarea placeholder="Add background, topics to explore, or questions you want answered…" className={`${control} min-h-40 resize-y font-normal`} maxLength={RESEARCH_NOTES_LIMIT} value={notes} onChange={event => { setNotes(event.target.value); setNotesApproved(false); }} /></label>
            <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={notesApproved} onChange={event => setNotesApproved(event.target.checked)} /><span>I approve sending these notes to the research model. Your notes stay out of public search queries.</span></label></div>
          </div></details>
          <Button type="submit" className="w-full sm:w-auto" variant="attention" disabled={loading || !configured || !validInput || creating || (!!notes.trim() && !notesApproved)} loading={creating}>{creating ? "Starting…" : "Start new research"}</Button>
          {!!notes.trim() && !notesApproved && <p className="text-xs text-secondary">Approve use of your notes before starting research.</p>}
          </fieldset>
        </form>}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4 border-2 border-foreground bg-surface-raised p-5 lg:sticky lg:top-[calc(7rem+env(safe-area-inset-top))] lg:flex lg:max-h-[calc(100dvh-8rem-env(safe-area-inset-top))] lg:min-h-0 lg:flex-col" aria-label="Saved research briefs">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-lg font-bold">Saved briefs</h2><Button variant="ghost" disabled={loading || creating} onClick={() => setReload(value => value + 1)}>Refresh</Button></div>
        {loading && <p role="status">Loading saved briefs…</p>}
        {!loading && !list.length && <p className="text-sm text-secondary">Your briefs will appear here after you start research.</p>}
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1">{list.map(row => <li key={row.id}><button type="button" aria-current={selected === row.id ? "true" : undefined} onClick={() => select(row.id)} className={`w-full min-w-0 border-2 border-foreground p-3 text-left ${selected === row.id ? "bg-attention" : "bg-surface-raised"}`}><span className="block break-words font-bold">{row.title}</span><span className="mt-1 block text-xs">{row.status}{row.shared ? " · Shared" : ""}</span><span className="mt-1 block break-words text-xs text-secondary">{row.updatedAt}</span></button></li>)}</ul>
      </aside>
      {selected ? <fieldset aria-label="Research report" tabIndex={0} className="min-w-0" disabled={creating}><ResearchEditor key={selected} id={selected} configured={configured} canWrite={canWrite} onChange={updateSummary} onDirty={setDirty} onDeleted={() => { setList(rows => rows.filter(row => row.id !== selected)); setSelected(null); setDirty(false); }} /></fieldset>
        : <div className="min-w-0 border-2 border-foreground bg-surface-raised p-6 sm:p-8"><h2 className="font-heading text-2xl font-bold">Your research brief</h2><p className="mt-2 max-w-2xl text-secondary">{list.length ? "Select a saved brief to read its findings, explore sources, or ask a follow-up question." : canWrite ? "Start with the guest, company and industry above. Your findings and sources will appear here as the research progresses." : "Saved briefs shared with you will appear here."}</p><ul className="mt-6 grid gap-x-6 gap-y-4 border-t border-foreground/20 pt-6 sm:grid-cols-2">{RESEARCH_SECTIONS.map(section => <li key={section.key} className="min-w-0"><h3 className="font-bold">{section.description}</h3></li>)}</ul></div>}
    </div>
  </section>;
}

function ResearchEditor({ id, configured, canWrite, onChange, onDirty, onDeleted }: {
  id: string; configured: boolean; canWrite: boolean;
  onChange: (brief: ResearchBrief) => void; onDirty: (dirty: boolean) => void; onDeleted: () => void;
}) {
  const fetcher = useMemberFetch();
  const [state, setState] = useState<{ brief: ResearchBrief; draft: ResearchDraft } | null>(null);
  const [versions, setVersions] = useState<ResearchVersion[]>([]);
  const [preview, setPreview] = useState<ResearchBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [clarification, setClarification] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [reload, setReload] = useState(0);
  const lifetime = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const path = `/${encodeURIComponent(id)}`;
  const dirty = !!state && researchDraftChanged(state.draft, state.brief);
  const owner = !!state?.brief.canEdit && canWrite;
  const deleting = state?.brief.status === "deleting";
  const cancellationPending = cancelPending || state?.brief.status === "cancel_pending";
  const editable = owner && !deleting && !cancellationPending;
  const running = !!state && researchIsRunning(state.brief.status);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setNotice(""); setState(null);
    void researchRequest<{ brief: unknown; versions: ResearchVersion[] }>(fetcher, path, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const brief = parseResearchBrief(data.brief);
      if (brief.id !== id) throw new Error("This brief could not be loaded.");
      setState({ brief, draft: researchDraft(brief) }); setCancelPending(brief.status === "cancel_pending"); setVersions(data.versions ?? []); setPreview(null); onChange(brief);
    }).catch(error => { if (!controller.signal.aborted) { setState(null); setNotice(errorMessage(error)); } });
    return () => controller.abort();
  }, [fetcher, id, onChange, path, reload]);
  useEffect(() => {
    if (!running || busy) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await researchRequest<{ brief: unknown; versions: ResearchVersion[] }>(fetcher, path, { signal: controller.signal });
        if (controller.signal.aborted || mutation.current) return;
        const brief = parseResearchBrief(data.brief);
        if (brief.id !== id) throw new Error("This brief could not be refreshed.");
        setState(current => current ? applyResearchReceipt(current, brief) : current); setCancelPending(brief.status === "cancel_pending"); setVersions(data.versions ?? []); onChange(brief);
        if (!researchIsRunning(brief.status)) return;
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice(errorMessage(error));
        if (error instanceof ResearchRequestError && [401, 403, 404].includes(error.status)) { setState(null); return; }
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 3000);
    }
    timer = setTimeout(() => void poll(), 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [busy, fetcher, id, onChange, path, running]);

  function edit(patch: Partial<ResearchDraft>) { setState(current => current ? { ...current, draft: { ...current.draft, ...patch } } : current); }
  async function mutate(suffix: string, body?: unknown, method = "POST") {
    if (!(editable || (owner && (method === "DELETE" || suffix === "/cancel"))) || mutation.current || !state) return false;
    if (suffix === "/chat" && state.brief.needsResearch) return false;
    mutation.current = true; setBusy(true); setNotice("");
    setPendingAction(method === "DELETE" ? "Deleting research…" : suffix === "/run" ? "Starting research…" : suffix === "/cancel" ? "Stopping research…" : suffix === "/chat" ? "Preparing your answer…" : suffix === "/restore" ? "Restoring saved version…" : "Saving changes…");
    if (method === "DELETE") setConfirmDelete(false);
    const signal = lifetime.current!.signal;
    try {
      const data = await researchRequest<{ brief?: unknown; deleted?: boolean }>(fetcher, path + suffix, { method, body, signal });
      if (signal.aborted) return false;
      if (method === "DELETE") { if (!data.deleted) throw new Error("Deletion could not be confirmed."); onDeleted(); return true; }
      const brief = parseResearchBrief(data.brief);
      if (brief.id !== id) throw new Error("This brief could not be updated.");
      setState(current => current ? (method === "PATCH" || suffix === "/restore" ? { brief, draft: researchDraft(brief) } : applyResearchReceipt(current, brief)) : current);
      void researchRequest<{ versions: ResearchVersion[] }>(fetcher, path, { signal }).then(receipt => {
        if (!signal.aborted && Array.isArray(receipt.versions)) setVersions(receipt.versions);
      }).catch(() => { /* A later reload can recover history without discarding the saved report. */ });
      onChange(brief); setPreview(null); if (suffix === "/cancel") setCancelPending(false); setNotice(method === "PATCH" ? "Brief saved." : "Research updated."); return true;
    } catch (error) {
      if (!signal.aborted) {
        setNotice(errorMessage(error));
        if (error instanceof ResearchRequestError && error.code === "research_cancel_pending") setCancelPending(true);
        if (error instanceof ResearchRequestError && [401, 403, 404].includes(error.status)) setState(null);
        else if (error instanceof ResearchRequestError && error.code === "research_deletion_pending") {
          setState(current => current ? { ...current, brief: { ...current.brief, status: "deleting" } } : current);
        }
        else if (error instanceof ResearchRequestError && error.code === "research_running") {
          setState(current => current ? { ...current, brief: { ...current.brief, status: "running" } } : current);
        }
        else if (method === "DELETE") {
          setConfirmDelete(false);
          setState(current => current ? { ...current, brief: { ...current.brief, status: "deleting" } } : current);
          setNotice("Deletion could not be confirmed. Editing is paused; retry deletion or reload the saved brief to check its status.");
        }
      }
      return false;
    } finally { mutation.current = false; if (!signal.aborted) { setBusy(false); setPendingAction(""); } }
  }
  async function viewVersion(revision: number) {
    if (mutation.current) return;
    const signal = lifetime.current!.signal; mutation.current = true; setBusy(true); setNotice("");
    try {
      const data = await researchRequest<{ brief: unknown }>(fetcher, `${path}/versions/${revision}`, { signal });
      if (signal.aborted) return;
      const brief = parseResearchBrief(data.brief);
      if (brief.id !== id || brief.revision !== revision) throw new Error("This version could not be loaded.");
      setPreview(brief);
    } catch (error) { if (!signal.aborted) { setNotice(errorMessage(error)); if (error instanceof ResearchRequestError && [401, 403, 404].includes(error.status)) { setState(null); setPreview(null); } } }
    finally { mutation.current = false; if (!signal.aborted) setBusy(false); }
  }
  if (!state) return <div className="min-w-0 border-2 border-foreground p-5"><p role={notice ? "alert" : "status"}>{notice || "Loading brief…"}</p>{notice && <Button onClick={() => setReload(value => value + 1)}>Try again</Button>}</div>;
  const { brief, draft } = state;
  const approved = draft.notesApproved;
  const conflict = draft.revision !== brief.revision;
  const modelDisabled = busy || !configured || dirty || !editable || cancelPending || (!!draft.notes.trim() && !approved);
  const sourcePrefix = "research-current-source-";
  const failure = brief.failure ?? brief.sections.find(section => section.failure)?.failure;
  const needsClarification = brief.status === "clarification";
  const hasReport = brief.sections.some(section => section.content.trim());
  const blankCompletedSection = draft.sections.some(section => section.status === "completed" && !section.content.trim());
  const validDraft = draft.researchInput ? validResearchInput(draft.researchInput) : draft.title.trim().length >= 2;
  return <article className="min-w-0 space-y-5" aria-label="Research brief" aria-busy={busy}>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-2"><span className="border-2 border-foreground bg-surface-subtle px-2 py-1 font-label text-xs">{brief.needsResearch ? "Needs research" : brief.status}</span>{dirty && <span className="text-sm text-secondary">Unsaved edits</span>}{!owner && <span className="text-sm">Read only</span>}</div>
      <h2 className="break-words font-heading text-3xl font-bold [overflow-wrap:anywhere]">{brief.title}</h2>
      {brief.researchInput && <p className="text-sm">Audience context: India</p>}
      <div className="flex flex-wrap gap-2">
        {editable && !running && !needsClarification && <Button variant="attention" disabled={modelDisabled} onClick={() => void mutate("/run", { revision: brief.revision })}>{brief.status === "draft" ? "Start research" : "Research again"}</Button>}
        {hasReport && <Button variant="secondary" onClick={() => download(brief)}>Download Markdown</Button>}
        <Button variant="ghost" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved edits and load the latest saved brief?")) setReload(value => value + 1); }}>Reload saved brief</Button>
        {owner && !deleting && <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete research</Button>}
      </div>
      {dirty && <p className="text-sm text-secondary">Save your edits before researching again. The report below shows the latest saved content.</p>}
    </header>
    {pendingAction && <p role="status" aria-live="polite" className="border-2 border-foreground bg-surface-subtle p-3">{pendingAction}</p>}
    {notice && <p role="alert" className="border-2 border-foreground bg-surface-subtle p-3 text-sm">{notice}</p>}
    {conflict && <p role="alert">A newer revision is available. Download your edits before reloading the saved brief to resolve the conflict.</p>}
    {needsClarification && <section aria-label="Clarification needed" className="space-y-3 border-2 border-foreground bg-attention p-4"><h3 className="font-heading text-xl font-bold">Clarification needed</h3><p>{brief.clarification || "Clarify the guest, company or industry to continue."}</p>{editable && <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (clarification.trim()) void mutate("/run", { revision: brief.revision, clarification: clarification.trim() }).then(ok => { if (ok) setClarification(""); }); }}><label className="grid gap-1">Your clarification<textarea className={control} maxLength={2000} value={clarification} onChange={event => setClarification(event.target.value)} required disabled={busy} /></label><Button type="submit" disabled={modelDisabled || !clarification.trim()}>Continue research</Button></form>}</section>}
    {(running || cancellationPending) && <ResearchRunProgress brief={brief} cancellationPending={cancellationPending}>
      {owner && <Button variant="secondary" disabled={busy} onClick={() => void mutate("/cancel")}>{cancellationPending ? "Retry cancellation" : "Cancel research"}</Button>}
    </ResearchRunProgress>}
    {brief.status === "partial" && <div role="status" className="space-y-2 border-2 border-foreground bg-attention p-4"><h3 className="font-bold">This report is incomplete</h3><p>Completed findings are retained below.</p><p className="text-sm">{researchFailureSummary(failure)}</p></div>}
    {brief.status === "failed" && <div role="status" className="space-y-2 border-2 border-foreground p-4"><h3 className="font-bold">Research failed</h3><p>{researchFailureSummary(failure)}</p>{hasReport && <p>Available findings remain below; they are not a completed report.</p>}</div>}
    {brief.status === "cancelled" && <p role="status">Research was cancelled. Any returned findings remain below. Review run details for pending remote work.</p>}
    {deleting && <div className="space-y-2"><p role="status">Deletion is pending while remote research data is removed. Editing and research are disabled until deletion finishes.</p>{owner && <Button disabled={busy} onClick={() => void mutate("", undefined, "DELETE")}>Retry deletion</Button>}</div>}
    {brief.status === "completed" && !hasReport && <p role="status">No report content was returned. Reload the saved brief or research again.</p>}
    <ResearchContent brief={brief} sourcePrefix={sourcePrefix} />
    {editable && <details className="min-w-0 border-2 border-foreground bg-surface-raised p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-bold">Edit brief</summary>
      <fieldset disabled={busy} className="mt-3 min-w-0 space-y-4">
        <legend className="sr-only">Brief details</legend>
        {draft.researchInput ? <ResearchInputFields value={draft.researchInput} onChange={researchInput => edit({ researchInput, title: researchTitle(researchInput) })} />
          : <label className="grid gap-1 text-sm font-bold">Title<input className={control} minLength={2} maxLength={200} value={draft.title} onChange={event => edit({ title: event.target.value })} /></label>}
        <label className="grid gap-1 text-sm font-bold">Private notes<textarea className={`${control} min-h-32`} maxLength={RESEARCH_NOTES_LIMIT} value={draft.notes} onChange={event => edit({ notes: event.target.value, notesApproved: false })} /></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={approved} onChange={event => edit({ notesApproved: event.target.checked })} /><span>I approve sending these notes to the research model. Your notes stay out of public search queries.</span></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={draft.shared} onChange={event => edit({ shared: event.target.checked })} /><span>Share with everyone who has access to this workspace. Sections may include content derived from private notes. Notes and chat themselves stay private; others can only read the shared brief.</span></label>
        {RESEARCH_SECTIONS.filter(({ key }) => draft.sections.some(section => section.key === key)).map(({ key, title }) => {
          const section = draft.sections.find(item => item.key === key)!;
          return <details key={key}><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Edit {title}</summary><label className="grid gap-1 text-sm">{title} content<textarea className={`${control} min-h-48`} maxLength={24000} value={section.content} onChange={event => edit({ sections: draft.sections.map(item => item.key === key ? { ...item, content: event.target.value } : item) })} /></label></details>;
        })}
        <div className="flex flex-wrap gap-2"><Button disabled={busy || running || !dirty || conflict || !validDraft || blankCompletedSection || (!!draft.notes.trim() && !approved)} onClick={() => void mutate("", { ...draft, ...(draft.researchInput ? { researchInput: parseResearchInput(draft.researchInput), title: researchTitle(parseResearchInput(draft.researchInput)) } : { title: draft.title.trim() }) }, "PATCH")}>Save changes</Button>
          {dirty && <Button variant="secondary" onClick={() => download({ ...brief, ...draft })}>Download edited Markdown</Button>}
        </div>
        {blankCompletedSection && <p role="status" className="text-sm">Completed sections cannot be blank. Add content before saving.</p>}
        {!!draft.notes.trim() && !approved && <p className="text-xs text-secondary">Approve use of these notes, or remove them, before saving and using the research model.</p>}
        {running && <p className="text-xs text-secondary">Research is running. Local edits are kept; saving is available after the run finishes.</p>}
      </fieldset>
    </details>}
    <details className="min-w-0 space-y-3 border border-foreground/20 p-4"><summary className="min-h-11 cursor-pointer py-2 font-bold">Run details and limitations</summary>
      <p className="break-words text-sm [overflow-wrap:anywhere]">{researchModelSummary(brief.modelInfo)}</p>
      {running || cancellationPending ? <p className="text-sm">Costs will be shown after the run stops.</p> : <>
        <p className="text-sm">{brief.cost.modelUsd === null ? "Cost not reported by provider" : `Model cost: $${brief.cost.modelUsd.toFixed(4)}`}</p>
        <p className="text-sm">Tool cost (recorded or reserved): ${(brief.cost.toolMicro / 1_000_000).toFixed(4)}</p>
      </>}
      {failure && <p className="text-sm">{researchFailureSummary(failure)}</p>}
      {brief.sections.filter(section => section.failure && section.failure !== failure).map(section => <p key={section.key} className="text-sm">{section.title}: {researchFailureSummary(section.failure)}</p>)}
      {!!brief.warnings.length && <section aria-label="Research limitations"><h3 className="font-bold">Limitations</h3><ul className="list-disc space-y-1 break-words pl-5 text-sm">{brief.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
      {!!brief.progress.length && <section aria-label="Research progress"><h3 className="font-bold">Research progress</h3><ol className="list-decimal space-y-1 break-words pl-5 text-sm">{brief.progress.map((step, index) => <li key={index}>{step}</li>)}</ol></section>}
    </details>
    {versions.length > 0 && <details className="min-w-0 space-y-3 border-2 border-foreground p-4" aria-label="Research versions"><summary className="min-h-11 cursor-pointer py-2 font-bold">Version history · {versions.length} {versions.length === 1 ? "report" : "reports"}</summary><div className="flex flex-wrap gap-2">{versions.map(version => <Button key={version.revision} variant="ghost" disabled={busy} onClick={() => void viewVersion(version.revision)}>Saved {new Date(version.createdAt).toLocaleString()}</Button>)}</div>
      {preview && <div className="min-w-0 space-y-4"><div className="flex flex-wrap gap-2"><h4 className="font-bold">Saved brief · {new Date(preview.updatedAt).toLocaleString()}</h4><Button variant="ghost" onClick={() => setPreview(null)}>Close version</Button><Button variant="secondary" onClick={() => download(preview)}>Download version</Button>{editable && preview.revision !== brief.revision && <Button disabled={busy || dirty || running} onClick={() => { if (window.confirm("Restore this saved brief? Your current brief will remain in history.")) void mutate("/restore", { revision: brief.revision, version: preview.revision }); }}>Restore version</Button>}</div><ResearchContent brief={preview} sourcePrefix={`research-preview-${preview.revision}-source-`} /></div>}
    </details>}
    {editable && hasReport && !needsClarification && <section className="space-y-3 border-2 border-foreground p-4" aria-label="Private research follow-up"><h3 className="font-heading text-xl font-bold">Follow-up</h3><p className="text-sm text-secondary">Ask about the saved evidence. Start a new research run when fresh information is needed.</p>
      <div className="space-y-3">{brief.messages.map((message, index) => <div key={index} className="min-w-0 border-l-2 border-foreground pl-3"><p className="mb-1 font-label text-xs font-bold">{message.role === "user" ? "You" : "Research"}</p><ResearchMarkdown content={message.content} sources={brief.sources} sourcePrefix={sourcePrefix} /></div>)}</div>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (question.trim()) void mutate("/chat", { question: question.trim() }).then(ok => { if (ok) setQuestion(""); }); }}><label className="grid gap-1 text-sm font-bold">Question<textarea className={control} maxLength={2000} value={question} disabled={busy || brief.needsResearch} onChange={event => setQuestion(event.target.value)} required /></label><Button type="submit" disabled={modelDisabled || running || brief.needsResearch || !question.trim()}>Ask follow-up</Button></form>
    </section>}
    <Dialog.Root open={confirmDelete} onOpenChange={open => { if (!busy) setConfirmDelete(open); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 border-2 border-foreground bg-canvas p-6"><Dialog.Title className="font-heading text-xl font-bold">Permanently delete this brief?</Dialog.Title><Dialog.Description>This permanently deletes the brief, saved versions, sources and follow-up chat. Any running research will be stopped. This cannot be undone.</Dialog.Description><div className="flex flex-wrap gap-2"><Button autoFocus variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep brief</Button><Button disabled={busy} onClick={() => void mutate("", undefined, "DELETE")}>Delete permanently</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </article>;
}

function validResearchInput(value: ResearchInputV2): boolean {
  try { parseResearchInput(value); return true; } catch { return false; }
}

function ResearchInputFields({ value, onChange }: { value: ResearchInputV2; onChange: (input: ResearchInputV2) => void }) {
  return <div className="min-w-0 space-y-3">
    <p className="text-sm font-bold">Audience context: India</p>
    <div className="grid min-w-0 gap-3 xl:grid-cols-3">
      {([{ key: "guestName", label: "Guest name", example: "Elon Musk" }, { key: "companyName", label: "Company name", example: "Tesla" }, { key: "industry", label: "Industry", example: "Electric vehicles" }] as const).map(field =>
        <label key={field.key} className="grid min-w-0 gap-1 text-sm font-bold">{field.label}<input className={control} minLength={2} maxLength={120} placeholder={`e.g. ${field.example}`} required value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })} /></label>)}
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

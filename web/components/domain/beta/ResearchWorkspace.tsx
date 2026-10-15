"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";
import { Button } from "@/components/ui/Button";
import { ResearchContent, ResearchMarkdown, ResearchSources } from "./ResearchContent";
import {
  applyResearchReceipt, parseResearchBrief, researchDraft, researchDraftChanged,
  researchIsRunning, researchMarkdown, researchRequest, ResearchRequestError, RESEARCH_NOTES_LIMIT,
  RESEARCH_SECTIONS, type ResearchBrief, type ResearchDraft, type ResearchSummary, type ResearchVersion,
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
  const [title, setTitle] = useState("");
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
    if (!canWrite || !configured || creating || title.trim().length < 2 || (!!notes.trim() && !notesApproved) || (dirty && !window.confirm("Create a new brief and discard unsaved edits?"))) return;
    const signal = lifetime.current!.signal; setCreating(true); setNotice("");
    try {
      const data = await researchRequest<{ brief: unknown }>(fetcher, "", { method: "POST", body: { title: title.trim(), notes, notesApproved }, signal });
      if (signal.aborted) return;
      const brief = parseResearchBrief(data.brief); updateSummary(brief); setDirty(false); setSelected(brief.id); setTitle(""); setNotes(""); setNotesApproved(false);
    } catch (error) { if (!signal.aborted) { setNotice(errorMessage(error)); if (error instanceof ResearchRequestError && error.status === 503) setConfigured(false); } }
    finally { if (!signal.aborted) setCreating(false); }
  }
  return <section aria-label="Research workspace" className="space-y-6">
    <header><p className="font-label text-xs font-bold uppercase tracking-widest text-secondary">WTF OS · Research</p><h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Research</h1><p className="mt-3 max-w-2xl text-secondary">Build a source-backed brief, shape the questions, and keep the evidence close.</p></header>
    {!loading && !configured && <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-2 border-foreground bg-surface-subtle p-4 text-sm"><p className="max-w-3xl">{unavailable}</p><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Retry connection</Button></div>}
    {notice && <p role="alert">{notice}</p>}
        {canWrite && <form aria-label="New research" className="border-2 border-foreground bg-surface-raised p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void create(); }}><fieldset disabled={creating} className="min-w-0 space-y-4"><legend className="mb-2 font-heading text-xl font-bold">Start a new brief</legend><p className="text-sm text-secondary">Choose a guest, company or industry. Add notes if you have a particular angle in mind.</p>
          <label className="grid gap-1 text-sm font-bold">Research request<input className={control} minLength={2} maxLength={200} placeholder="e.g. Research Elon Musk, Tesla and its competitor BYD" required value={title} onChange={event => setTitle(event.target.value)} /></label>
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Private notes (optional)</summary><div className="grid items-start gap-6 border-t border-foreground/15 pt-5 ">
            <div className="min-w-0 space-y-4"><label className="grid gap-2 text-sm font-bold">Private notes<textarea placeholder="Add background, topics to explore, or questions you want answered…" className={`${control} min-h-40 resize-y font-normal`} maxLength={RESEARCH_NOTES_LIMIT} value={notes} onChange={event => { setNotes(event.target.value); setNotesApproved(false); }} /></label>
            <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={notesApproved} onChange={event => setNotesApproved(event.target.checked)} /><span>I approve sending these notes to the research model. Your notes stay out of public search queries.</span></label></div>
          </div></details>
          <Button type="submit" className="w-full sm:w-auto" variant="attention" disabled={loading || !configured || title.trim().length < 2 || creating || (!!notes.trim() && !notesApproved)} loading={creating}>Start new research</Button>
          {!!notes.trim() && !notesApproved && <p className="text-xs text-secondary">Approve use of your notes before starting research.</p>}
          </fieldset>
        </form>}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4 border-2 border-foreground bg-surface-raised p-5" aria-label="Saved research briefs">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-lg font-bold">Saved briefs</h2><Button variant="ghost" disabled={loading || creating} onClick={() => setReload(value => value + 1)}>Refresh</Button></div>
        {loading && <p role="status">Loading saved briefs…</p>}
        {!loading && !list.length && <p className="text-sm text-secondary">Your briefs will appear here after you start research.</p>}
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto">{list.map(row => <li key={row.id}><button type="button" aria-current={selected === row.id ? "true" : undefined} onClick={() => select(row.id)} className={`w-full min-w-0 border-2 border-foreground p-3 text-left ${selected === row.id ? "bg-attention" : "bg-surface-raised"}`}><span className="block break-words font-bold">{row.title}</span><span className="mt-1 block text-xs">{row.status}{row.shared ? " · Shared" : ""}</span><span className="mt-1 block break-words text-xs text-secondary">{row.updatedAt}</span></button></li>)}</ul>
      </aside>
      {selected ? <fieldset className="min-w-0" disabled={creating}><ResearchEditor key={selected} id={selected} configured={configured} canWrite={canWrite} onChange={updateSummary} onDirty={setDirty} onDeleted={() => { setList(rows => rows.filter(row => row.id !== selected)); setSelected(null); setDirty(false); }} /></fieldset>
        : <div className="min-w-0 border-2 border-foreground bg-surface-raised p-6 sm:p-8"><h2 className="font-heading text-2xl font-bold">Your research brief</h2><p className="mt-2 max-w-2xl text-secondary">{list.length ? "Select a saved brief to read its findings, explore sources, or ask a follow-up question." : canWrite ? "Start with a subject above. Your findings and sources will appear here as the research progresses." : "Saved briefs shared with you will appear here."}</p><ul className="mt-6 grid gap-x-6 gap-y-4 border-t border-foreground/20 pt-6 sm:grid-cols-2">{RESEARCH_SECTIONS.map(section => <li key={section.key} className="min-w-0"><h3 className="font-bold">{section.description}</h3></li>)}</ul></div>}
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
    mutation.current = true; setBusy(true); setNotice("");
    const signal = lifetime.current!.signal;
    try {
      const data = await researchRequest<{ brief?: unknown; deleted?: boolean }>(fetcher, path + suffix, { method, body, signal });
      if (signal.aborted) return false;
      if (method === "DELETE") { if (!data.deleted) throw new Error("Deletion could not be confirmed."); onDeleted(); return true; }
      const brief = parseResearchBrief(data.brief);
      if (brief.id !== id) throw new Error("This brief could not be updated.");
      setState(current => current ? (method === "PATCH" || suffix === "/restore" ? { brief, draft: researchDraft(brief) } : applyResearchReceipt(current, brief)) : current);
      if (["completed", "partial"].includes(brief.status) && brief.sections.some(section => section.content.trim())) {
        setVersions(rows => [{ revision: brief.revision, createdAt: brief.updatedAt }, ...rows.filter(row => row.revision !== brief.revision)]);
      }
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
    } finally { mutation.current = false; if (!signal.aborted) setBusy(false); }
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
  if (running || cancellationPending) return <article aria-label="Research in progress" className="min-w-0 border-2 border-foreground bg-surface-raised p-6 sm:p-10">
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-8 text-center">
      <span aria-hidden="true" className="h-10 w-10 rounded-full border-4 border-foreground/15 border-t-foreground motion-safe:animate-spin" />
      <div role="status" aria-live="polite"><h2 className="font-heading text-2xl font-bold sm:text-3xl">{cancellationPending ? "Stopping your research…" : "Your report is cooking"}</h2>
        <p className="mt-3 text-sm leading-relaxed text-secondary">{cancellationPending ? "We’re waiting for the research to stop safely." : brief.status === "queued" ? "Your request is queued. Research will begin shortly." : "We’re finding sources, checking the evidence and putting your report together. This can take a few minutes."}</p></div>
      <p className="w-full break-words border-y border-foreground/15 py-4 font-bold">{brief.title}</p>
      <p className="text-sm text-secondary">Your report will appear here automatically. You can also return to it from Saved briefs.</p>
      {notice && <p role="alert" className="text-sm">{notice}</p>}
      {owner && <Button variant="secondary" disabled={busy} onClick={() => void mutate("/cancel")}>{cancellationPending ? "Retry cancellation" : "Cancel research"}</Button>}
    </div>
  </article>;
  const approved = draft.notesApproved;
  const conflict = draft.revision !== brief.revision;
  const modelDisabled = busy || !configured || dirty || !editable || cancelPending || (!!draft.notes.trim() && !approved);
  return <article className="min-w-0 space-y-5" aria-label="Research brief" aria-busy={busy}>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-2"><span className="border-2 border-foreground bg-surface-subtle px-2 py-1 font-label text-xs">{brief.status}</span>{dirty && <span className="text-sm text-secondary">Unsaved edits</span>}{!owner && <span className="text-sm">Read only</span>}</div>
      <h2 className="break-words font-heading text-3xl font-bold">{brief.title}</h2>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => download({ ...brief, ...draft })}>{dirty ? "Download edited Markdown" : "Download Markdown"}</Button><Button variant="ghost" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved edits and load the latest saved brief?")) setReload(value => value + 1); }}>Reload saved brief</Button>{owner && !deleting && <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete research</Button>}</div>
    </header>
    {notice && <p role="alert" className="border-2 border-foreground bg-surface-subtle p-3 text-sm">{notice}</p>}
    {conflict && <p role="alert">A newer revision is available. Download your edits before reloading the saved brief to resolve the conflict.</p>}
    {brief.status === "partial" && <p role="status" className="border-2 border-foreground bg-attention p-3">This brief is incomplete. Completed findings are retained; review the limitations before using it.</p>}
    {brief.status === "failed" && <p role="status">Research failed. Any available findings remain below; they are not a completed brief.</p>}
    {brief.status === "cancelled" && <p role="status">This research run is marked cancelled. Any returned findings remain available; review warnings for pending remote work.</p>}
    {cancellationPending && <div className="space-y-2"><p role="status">Cancellation is pending. The remote job may still be running. Editing and new research are paused until cancellation is confirmed.</p>{owner && <Button disabled={busy} onClick={() => void mutate("/cancel")}>Retry cancellation</Button>}</div>}
    {deleting && <div className="space-y-2"><p role="status">Deletion is pending while remote research data is removed. Editing and research are disabled until deletion finishes.</p>{owner && <Button disabled={busy} onClick={() => void mutate("", undefined, "DELETE")}>Retry deletion</Button>}</div>}
    {!!brief.warnings.length && <section aria-label="Research limitations"><h3 className="font-bold">Limitations</h3><ul className="list-disc space-y-1 pl-5 text-sm">{brief.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
    {!!brief.progress.length && <details open={running}><summary className="cursor-pointer font-bold">Research progress</summary><ol className="list-decimal space-y-1 pl-5 text-sm">{brief.progress.map((step, index) => <li key={index}>{step}</li>)}</ol></details>}
    <p className="text-xs text-secondary">Tool cost (recorded or reserved): ${(brief.cost.toolMicro / 1_000_000).toFixed(4)} · Model cost: {brief.cost.modelUsd === null ? "Unavailable" : `$${brief.cost.modelUsd.toFixed(4)}`}</p>
    {editable && <fieldset disabled={busy} className="min-w-0 space-y-4 border-2 border-foreground bg-surface-raised p-4">
      <legend className="px-2 font-bold">Brief details</legend>
      <label className="grid gap-1 text-sm font-bold">Title<input className={control} minLength={2} maxLength={200} value={draft.title} onChange={event => edit({ title: event.target.value })} /></label>
      <label className="grid gap-1 text-sm font-bold">Private notes<textarea className={`${control} min-h-32`} maxLength={RESEARCH_NOTES_LIMIT} value={draft.notes} onChange={event => { edit({ notes: event.target.value, notesApproved: false }); }} /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={approved} onChange={event => edit({ notesApproved: event.target.checked })} /><span>I approve sending these notes to the research model. Notes must never be sent as external search queries.</span></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={draft.shared} onChange={event => edit({ shared: event.target.checked })} /><span>Share with everyone who has access to this workspace. Sections may include content derived from private notes. Notes and chat themselves stay private; others can only read the shared brief.</span></label>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || running || !dirty || conflict || draft.title.trim().length < 2 || (!!draft.notes.trim() && !approved)} onClick={() => void mutate("", { ...draft, title: draft.title.trim(), notesApproved: draft.notesApproved }, "PATCH")}>Save changes</Button>
        {!running && <Button variant="attention" disabled={modelDisabled} onClick={() => void mutate("/run", { revision: brief.revision })}>{brief.status === "draft" ? "Start research" : "Research again"}</Button>}
        {running && <Button variant="secondary" disabled={busy} onClick={() => void mutate("/cancel")}>Cancel research</Button>}
        </div>
      {!!draft.notes.trim() && !approved && <p className="text-xs text-secondary">Approve use of these notes, or remove them, before saving and using the research model.</p>}
      {dirty && <p className="text-xs text-secondary">Save your changes before starting research or asking a follow-up.</p>}
      {running && <p className="text-xs text-secondary">Research is running. Local edits are kept; saving is available after the run finishes. Cancellation may not reverse already incurred costs.</p>}
    </fieldset>}
    {brief.clarification && <section className="space-y-3 border-2 border-foreground bg-attention p-4"><h3 className="font-bold">Clarification needed</h3><p>{brief.clarification}</p>{editable && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void mutate("/run", { revision: brief.revision, clarification: clarification.trim() }).then(ok => { if (ok) setClarification(""); }); }}><label className="grid gap-1">Your clarification<textarea className={control} maxLength={2000} value={clarification} onChange={event => setClarification(event.target.value)} required /></label><Button type="submit" disabled={modelDisabled || running || !clarification.trim()}>Continue research</Button></form>}</section>}
    {RESEARCH_SECTIONS.map(({ key, title, description }) => {
      const section = draft.sections.find(s => s.key === key);
      return <section key={key} className="min-w-0 space-y-3 border-2 border-foreground bg-surface-raised p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-label text-xs uppercase text-secondary">{description}</p><h3 className="font-heading text-2xl font-bold">{title}</h3><p className="text-sm">{brief.sections.find(s => s.key === key)?.status ?? "Not started"}</p></div>{editable && <Button variant="ghost" disabled={modelDisabled || running} onClick={() => void mutate("/run", { revision: brief.revision, section: key })}>Regenerate {title}</Button>}</div>
        {section?.content ? <ResearchMarkdown content={section.content} sources={brief.sources} /> : <p className="text-sm text-secondary">No findings yet.</p>}
        {editable && <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Edit {title}</summary><label className="grid gap-1 text-sm">{title} content<textarea disabled={busy} className={`${control} min-h-48`} maxLength={24000} value={section?.content ?? ""} onChange={event => edit({ sections: [...draft.sections.filter(s => s.key !== key), { key, title: section?.title ?? title, content: event.target.value, status: section?.status ?? "partial" }] })} /></label></details>}
      </section>;
    })}
    {versions.length > 0 && <section className="space-y-3 border-2 border-foreground p-4" aria-label="Research versions"><h3 className="font-heading text-xl font-bold">Version history</h3><div className="flex flex-wrap gap-2">{versions.map(version => <Button key={version.revision} variant="ghost" disabled={busy} onClick={() => void viewVersion(version.revision)}>Saved {new Date(version.createdAt).toLocaleString()}</Button>)}</div>
      {preview && <div className="space-y-4"><div className="flex flex-wrap gap-2"><h4 className="font-bold">Saved brief · {new Date(preview.updatedAt).toLocaleString()}</h4><Button variant="ghost" onClick={() => setPreview(null)}>Close version</Button><Button variant="secondary" onClick={() => download(preview)}>Download version</Button>{editable && preview.revision !== brief.revision && <Button disabled={busy || dirty || running} onClick={() => { if (window.confirm("Restore this saved brief? Your current brief will remain in history.")) void mutate("/restore", { revision: brief.revision, version: preview.revision }); }}>Restore version</Button>}</div><ResearchContent brief={preview} /></div>}
    </section>}
    {editable && <section className="space-y-3 border-2 border-foreground p-4" aria-label="Private research follow-up"><h3 className="font-heading text-xl font-bold">Follow-up</h3><p className="text-sm text-secondary">Ask about the saved evidence below. Start a new research run when fresh information is needed.</p>
      <div className="space-y-3">{brief.messages.map((message, index) => <div key={index} className="min-w-0 border-l-2 border-foreground pl-3"><p className="mb-1 font-label text-xs font-bold">{message.role === "user" ? "You" : "Research"}</p><ResearchMarkdown content={message.content} sources={brief.sources} /></div>)}</div>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); void mutate("/chat", { question: question.trim() }).then(ok => { if (ok) setQuestion(""); }); }}><label className="grid gap-1 text-sm font-bold">Question<textarea className={control} maxLength={2000} value={question} disabled={busy} onChange={event => setQuestion(event.target.value)} required /></label><Button type="submit" disabled={modelDisabled || running || !question.trim()}>Ask follow-up</Button></form>
    </section>}
    <ResearchSources sources={brief.sources} />
    <Dialog.Root open={confirmDelete} onOpenChange={open => { if (!busy) setConfirmDelete(open); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 border-2 border-foreground bg-canvas p-6"><Dialog.Title className="font-heading text-xl font-bold">Permanently delete this brief?</Dialog.Title><Dialog.Description>This permanently deletes the brief, saved versions, sources and follow-up chat. Any running research will be stopped. This cannot be undone.</Dialog.Description><div className="flex flex-wrap gap-2"><Button autoFocus variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep brief</Button><Button disabled={busy} onClick={() => void mutate("", undefined, "DELETE")}>Delete permanently</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </article>;
}

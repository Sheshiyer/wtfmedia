"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { parseMemoryResponse, type MemoryPolicy, type MemoryRecord } from "@/lib/ops/memory";

const endpoint = "/ops/api/memory";
const preferenceControls = ["explicit save", "custom instructions", "owner scope", "immutable entries", "replacement", "archive", "audit"] as const;
type ViewState = "loading" | "ready" | "empty" | "unavailable";

function formatDate(value: string): string {
  const date = Date.parse(value);
  return Number.isNaN(date) ? "date not observed" : new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function MemoryGovernancePanel() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [policy, setPolicy] = useState<MemoryPolicy>({ archive: false, create: false });
  const [state, setState] = useState<ViewState>("loading");
  const [draft, setDraft] = useState("");
  const [sourceConversationId, setSourceConversationId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`${endpoint}?includeArchived=1`, { credentials: "same-origin", cache: "no-store" });
      const parsed = parseMemoryResponse(await response.json());
      if (!response.ok || !parsed) throw new Error("memory_unavailable");
      setMemories(parsed.memories);
      setPolicy(parsed.policy);
      setState(parsed.memories.length ? "ready" : "empty");
    } catch {
      setMemories([]);
      setState("unavailable");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || busy || !policy.create) return;
    setBusy("save");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draft, sourceConversationId: sourceConversationId.trim() || undefined }),
      });
      const parsed = parseMemoryResponse(await response.json());
      if (!response.ok || !parsed) throw new Error("memory_save_failed");
      setDraft("");
      setSourceConversationId("");
      setNotice("saved preference added to this workspace.");
      await refresh();
    } catch {
      setNotice("preference could not be saved. check the source conversation ID and retry.");
    } finally {
      setBusy(null);
    }
  }

  async function archive(memory: MemoryRecord) {
    if (busy || !policy.archive || memory.state === "archived") return;
    setBusy(memory.id);
    setNotice("");
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(memory.id)}/archive`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "archive", memoryId: memory.id }),
      });
      const parsed = parseMemoryResponse(await response.json());
      if (!response.ok || !parsed) throw new Error("memory_archive_failed");
      setNotice("preference archived. it remains in the reversible account ledger.");
      await refresh();
    } catch {
      setNotice("preference could not be archived. retry this action.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6" aria-labelledby="custom-instructions-title" id="custom-instructions" data-preferences-panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">your choices</p>
          <h2 id="custom-instructions-title" className="mt-1 font-heading text-2xl font-bold lowercase">preferences &amp; custom instructions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">Save the explicit choices that should guide your own workspace. They are owner-scoped context, not conversation history or transcript evidence.</p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-live bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em]">explicit · immutable</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">custom instructions</p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">guidance you control</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">A saved preference can guide conversational context. It never becomes transcript evidence, and automatic extraction is disabled.</p>
        </article>
        <article className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">lifecycle</p>
          <h3 className="mt-2 font-heading text-xl font-bold lowercase">replace, then archive</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">Each saved preference is immutable. To change one, add a replacement and archive the older entry; there is no in-place editor.</p>
          <span className="mt-4 inline-flex border-2 border-live bg-canvas px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em]">archive is reversible</span>
        </article>
      </div>

      <div className="mt-5 border-2 border-foreground bg-canvas p-4" data-preferences-workspace>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">your saved preferences</p>
            <h3 className="mt-1 font-heading text-xl font-bold lowercase">custom instructions ledger</h3>
          </div>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">{memories.filter((memory) => memory.state === "active").length} active</span>
        </div>
        <form onSubmit={save} className="mt-4 grid gap-3" aria-label="save a preference">
          <label className="grid gap-1">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">new preference or custom instruction</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="e.g. I prefer concise answers with the source trail visible." className="border-2 border-foreground bg-surface-raised p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-attention" disabled={!policy.create || busy !== null} />
          </label>
          <label className="grid gap-1">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">source conversation · optional</span>
            <input value={sourceConversationId} onChange={(event) => setSourceConversationId(event.target.value)} placeholder="cnv_…" className="min-h-11 border-2 border-foreground bg-surface-raised px-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-attention" disabled={!policy.create || busy !== null} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!policy.create || !draft.trim() || busy !== null} loading={busy === "save"}>save preference</Button>
            <span className="text-xs leading-relaxed text-secondary">Save a replacement before archiving an older preference.</span>
          </div>
        </form>
        <div aria-live="polite" className="sr-only">{notice}</div>
        <div className="mt-5 border-t-2 border-foreground pt-4">
          {state === "loading" ? <p role="status" className="text-sm text-secondary">checking saved preferences…</p> : null}
          {state === "unavailable" ? <p role="status" className="text-sm text-attention">saved preferences are unavailable in this environment. nothing was changed.</p> : null}
          {state === "empty" ? <p className="text-sm text-secondary">no saved preferences yet. add one above when you want it to guide future chats.</p> : null}
          {state === "ready" ? (
            <ul className="grid gap-3" aria-label="saved preferences">
              {memories.map((memory) => (
                <li key={memory.id} className={`border-2 p-4 ${memory.state === "archived" ? "border-foreground/30 bg-surface-subtle" : "border-foreground bg-surface-raised"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground">{memory.content}</p>
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">{memory.state}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-secondary">
                    <span>saved {formatDate(memory.createdAt)}{memory.sourceConversationId ? ` · source ${memory.sourceConversationId}` : ""}</span>
                    {memory.state === "active" ? <Button type="button" variant="secondary" onClick={() => void archive(memory)} loading={busy === memory.id} disabled={busy !== null}>archive</Button> : <span>archived preference</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-5 border-l-4 border-information bg-canvas px-4 py-3">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">preference boundary</p>
        <p className="mt-2 text-sm leading-relaxed text-secondary">Saved preferences are bounded before they reach the answer model and are not citation evidence. Every lifecycle write is server-audited; archive is reversible, there is no destructive delete, and changes require a replacement rather than an in-place edit.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="preference controls">
          {preferenceControls.map((control) => <li key={control} className="border-2 border-foreground/20 px-3 py-2 font-label text-xs font-bold lowercase text-foreground">{control}</li>)}
        </ul>
      </div>
    </section>
  );
}

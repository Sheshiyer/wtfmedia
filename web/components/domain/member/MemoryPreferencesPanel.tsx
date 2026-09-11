"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { parseMemberMemoryResponse, saveMemberMemory, type MemberMemory, type MemberMemoryRequest } from "@/lib/member/memory";
import { PreferenceImportPrompt } from "./PreferenceImportPrompt";

type ViewState = "loading" | "ready" | "empty" | "unavailable";

export function MemoryPreferencesPanel({ request: injectedRequest }: { request?: MemberMemoryRequest } = {}) {
  const { getToken } = useAuth();
  const [memories, setMemories] = useState<MemberMemory[]>([]);
  const [state, setState] = useState<ViewState>("loading");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const authenticatedRequest = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  }, [getToken]);
  const request = injectedRequest ?? authenticatedRequest;

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const response = await request("/beta/api/memory");
      const parsed = parseMemberMemoryResponse(await response.json());
      if (!response.ok) throw new Error("memory_unavailable");
      setMemories(parsed);
      setState(parsed.length ? "ready" : "empty");
    } catch {
      setMemories([]);
      setState("unavailable");
    }
  }, [request]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(content: string): Promise<boolean> {
    if (busy) return false;
    setBusy("save");
    setNotice("");
    try {
      const memory = await saveMemberMemory(request, content);
      if (!memory) throw new Error("memory_save_failed");
      setDraft("");
      setNotice("saved to your preferences.");
      await refresh();
      return true;
    } catch {
      setNotice("could not save that preference. please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function archive(memory: MemberMemory) {
    if (busy) return;
    setBusy(memory.id);
    setNotice("");
    try {
      const response = await request(`/beta/api/memory/${encodeURIComponent(memory.id)}/archive`, { method: "POST" });
      if (!response.ok) throw new Error("memory_archive_failed");
      setNotice("preference archived. it can no longer guide new chats.");
      await refresh();
    } catch {
      setNotice("could not archive that preference. please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="memory-preferences-title" data-memory-preferences-panel>
      <div className="border-2 border-foreground bg-surface-raised p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-live">your choices</p>
            <h2 id="memory-preferences-title" className="mt-1 font-display text-3xl font-extrabold lowercase">saved preferences</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">Only preferences you explicitly save appear here. They are separate from your session history and can be archived at any time.</p>
          </div>
          <span className="shrink-0 border-2 border-live bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em]">explicit only</span>
        </div>
        <form className="mt-6 grid gap-3" onSubmit={(event) => { event.preventDefault(); void save(draft); }} aria-label="save a preference">
          <label htmlFor="member-preference-note" className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">new preference</label>
          <textarea id="member-preference-note" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={3} disabled={busy !== null} className="w-full resize-y border-2 border-foreground bg-canvas p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-live disabled:opacity-60" placeholder="Save a preference for future conversations" />
          <Button type="submit" variant="secondary" loading={busy === "save"} disabled={!draft.trim() || busy !== null} className="justify-self-start">save preference</Button>
        </form>
        <div aria-live="polite" className="sr-only">{notice}</div>
        <div className="mt-6 border-t-2 border-foreground pt-5">
          {state === "loading" ? <p role="status" className="text-sm text-secondary">checking your saved preferences…</p> : null}
          {state === "unavailable" ? <p role="status" className="text-sm text-attention">your saved preferences are unavailable right now. nothing was changed.</p> : null}
          {state === "empty" ? <p className="text-sm text-secondary">no saved preferences yet.</p> : null}
          {state === "ready" ? (
            <ul className="grid gap-3" aria-label="Saved preferences">
              {memories.map((memory) => (
                <li key={memory.id} className="flex flex-wrap items-start justify-between gap-3 border-l-4 border-live bg-canvas p-4">
                  <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground">{memory.content}</p>
                  <Button type="button" variant="secondary" onClick={() => void archive(memory)} loading={busy === memory.id} disabled={busy !== null}>archive</Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="mt-5">
        <PreferenceImportPrompt onSave={save} />
      </div>
    </section>
  );
}

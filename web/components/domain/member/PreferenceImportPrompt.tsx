"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { parsePreferenceCandidates } from "@/lib/member/memory";

export function PreferenceImportPrompt({ onSave }: { onSave: (content: string) => Promise<boolean> | boolean }) {
  const [pasted, setPasted] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const prompt = "Review these preferences and return a short bullet list of only the preferences you want this workspace to remember.";

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function parse() {
    setCandidates(parsePreferenceCandidates(pasted));
    setSaved(new Set());
  }

  function updateCandidate(index: number, value: string) {
    setCandidates((current) => current.map((candidate, itemIndex) => itemIndex === index ? value : candidate));
  }

  async function saveCandidate(candidate: string) {
    const normalized = candidate.trim();
    if (!normalized || saved.has(candidate)) return;
    const didSave = await onSave(normalized);
    if (!didSave) return;
    setSaved((current) => new Set(current).add(candidate));
  }

  return (
    <section className="border-2 border-foreground bg-canvas p-4 sm:p-5" data-preference-import>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">optional import</p>
          <h3 className="mt-1 font-heading text-xl font-bold lowercase">bring in a preference</h3>
        </div>
        <Button type="button" variant="secondary" onClick={() => void copyPrompt()}>{copied ? "copied" : "copy prompt"}</Button>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">Copy the prompt into another assistant, paste its bullet-list response below, then review each candidate before saving it. Nothing is sent until you choose a save action.</p>
      <label className="mt-4 grid gap-1">
        <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">prompt text</span>
        <textarea value={prompt} readOnly rows={3} className="w-full resize-y border-2 border-foreground/30 bg-surface-subtle p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-information" aria-label="Copyable preference prompt" />
      </label>
      <label className="mt-4 grid gap-1">
        <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">paste response</span>
        <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={5} className="w-full resize-y border-2 border-foreground bg-surface-raised p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-information" placeholder="- I prefer concise answers\n- Keep the source trail visible" />
      </label>
      <Button type="button" variant="secondary" className="mt-3" onClick={parse} disabled={!pasted.trim()}>review candidates</Button>
      {candidates.length > 0 ? (
        <ul className="mt-5 grid gap-3" aria-label="Preference candidates">
          {candidates.map((candidate, index) => {
            const isSaved = saved.has(candidate);
            return (
              <li key={index} className="border-2 border-foreground/25 bg-surface-subtle p-3">
                <label className="grid gap-2">
                  <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">candidate {index + 1}</span>
                  <textarea value={candidate} onChange={(event) => updateCandidate(index, event.target.value)} rows={2} maxLength={2000} disabled={isSaved} className="w-full resize-y border-2 border-foreground bg-canvas p-3 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-live disabled:opacity-60" />
                </label>
                <Button type="button" variant="secondary" className="mt-3" onClick={() => void saveCandidate(candidate)} disabled={isSaved || !candidate.trim()}>{isSaved ? "saved" : "save candidate"}</Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

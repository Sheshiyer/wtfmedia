"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ResearchBrief, ResearchSummary } from "@/lib/research";

export function ResearchProblems({ brief, reports, disabled, onSelect, onStart }: {
  brief: ResearchBrief; reports: ResearchSummary[]; disabled: boolean;
  onSelect: (id: string) => void;
  onStart: (selection: { selectedProblemId: string } | { problemQuestion: string }) => Promise<boolean>;
}) {
  const [choice, setChoice] = useState("");
  const [question, setQuestion] = useState("");
  const group = brief.researchGroupId ?? brief.id;
  const related = reports.filter(r => r.canEdit && (r.id === group || r.researchGroupId === group));
  const problem = brief.researchProblems?.find(p => p.id === choice);
  const existing = problem && related.find(r => r.problemQuestion === problem.question);
  return <section className="space-y-4 rounded-control border-2 border-foreground bg-surface-raised p-4 sm:p-6" aria-label="Research problems">
    <h3 className="font-heading text-xl font-bold">Explore another problem</h3>
    <p className="text-sm text-secondary">Each problem gets its own full report, fresh research and visuals. Your existing reports stay available.</p>
    <div className="flex flex-wrap gap-2" aria-label="Saved problem reports">{related.map(r => <button type="button" key={r.id} disabled={disabled} aria-current={r.id === brief.id ? "page" : undefined} onClick={() => onSelect(r.id)} className={`max-w-full rounded-control border px-3 py-2 text-left text-sm disabled:opacity-50 ${r.id === brief.id ? "border-foreground bg-attention" : "border-foreground/30"}`}><span className="block break-words">{r.problemQuestion || "Original brief"}</span><span className="text-xs">{r.status}</span></button>)}</div>
    <label className="grid gap-2 text-sm font-bold">Problem statement<select aria-label="Problem statement" value={choice} disabled={disabled} onChange={e => setChoice(e.target.value)} className="min-h-11 w-full min-w-0 rounded-control border-2 border-foreground bg-canvas p-3"><option value="">Write a new problem statement</option>{brief.researchProblems?.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.title}</option>)}</select></label>
    {problem ? <p className="break-words text-sm leading-6">{problem.question}</p> : <label className="grid gap-2 text-sm font-bold">What should this research investigate?<textarea rows={3} maxLength={400} value={question} disabled={disabled} onChange={e => setQuestion(e.target.value)} className="w-full min-w-0 rounded-control border-2 border-foreground bg-canvas p-3 font-normal" /></label>}
    <Button disabled={disabled || (!problem && question.trim().length < 10)} onClick={() => { if (existing) onSelect(existing.id); else void onStart(problem ? {selectedProblemId: problem.id} : {problemQuestion: question.trim()}); }}>{existing ? "Open this report" : "Start in-depth research"}</Button>
  </section>;
}

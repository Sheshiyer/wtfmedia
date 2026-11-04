"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { deepResearchCommand, researchSelection } from "@/lib/research-followup";
import type { ResearchBrief } from "@/lib/research";
import { ResearchMarkdown } from "./ResearchContent";

const prompts = [
  "Show me the other problem statements offered earlier.",
  "Suggest sensitive topics worth exploring, with fair interview questions.",
  "What important angles are missing from this research?",
  "Explain the strongest connection in more detail.",
];

export function ResearchFollowup({ brief, disabled, sourcePrefix, onAsk, onResearch }: {
  brief: ResearchBrief; disabled: boolean; sourcePrefix: string;
  onAsk: (question: string) => Promise<boolean>;
  onResearch: (selection: { selectedProblemId: string } | { problemQuestion: string }) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"chat" | "research">("chat");
  const [validation, setValidation] = useState("");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [brief.messages.length, sending]);
  async function submit() {
    const value = question.trim();
    if (!value || disabled || sending) return;
    const deep = mode === "research" || deepResearchCommand(value);
    const selection = researchSelection(value, brief.researchProblems);
    if (deep && "problemQuestion" in selection && (selection.problemQuestion.length < 10 || selection.problemQuestion.length > 400 || /^(?:this|that|it|another|the other)(?:\s+problem)?[.!]?$/i.test(selection.problemQuestion))) {
      setValidation("Choose a problem above, or write the full problem statement (10–400 characters)."); return;
    }
    setValidation("");
    submitted.current = true;
    setSending(true); setPendingQuestion(value);
    try {
      if (await (deep ? onResearch(selection) : onAsk(value))) setQuestion("");
    } finally {
      setSending(false); setPendingQuestion("");
      input.current?.focus();
    }
  }
  return <section className="min-w-0 overflow-hidden rounded-control border-2 border-foreground bg-surface-raised" aria-label="Research conversation">
    <header className="border-b border-foreground/20 p-4 sm:p-6">
      <h3 className="font-heading text-2xl font-bold">Explore the research</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">Revisit other problems, explore sensitive topics, or develop your interview questions. Questions use your brief, earlier options and saved sources. Choose in-depth research, or type “Research option 2”, to start a separate full report with fresh searches and visuals.</p>
      {brief.selectedProblem && <p className="mt-3 text-sm"><span className="font-bold">Current focus:</span> {brief.selectedProblem.title}</p>}
    </header>
    <div className="space-y-5 p-4 sm:p-6" aria-busy={sending}>
      {!brief.messages.length && <p className="text-secondary">Where would you like to take this conversation?</p>}
      {brief.messages.map((message, index) => <div key={index} className={`min-w-0 break-words rounded-control p-4 ${message.role === "user" ? "ml-auto max-w-[90%] border border-foreground/20 bg-attention/20" : "border-l-4 border-foreground/30 bg-canvas"}`}>
        <p className="mb-2 font-label text-xs font-bold">{message.role === "user" ? "You" : "Research partner"}</p>
        <ResearchMarkdown content={message.content} sources={brief.sources} sourcePrefix={sourcePrefix} />
      </div>)}
      {sending && <><p className="ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-control border border-foreground/20 bg-attention/20 p-4">{pendingQuestion}</p><p role="status" className="flex items-center gap-2 text-sm text-secondary"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />{mode === "research" || deepResearchCommand(pendingQuestion) ? "Starting in-depth research…" : "Preparing your research briefing…"}</p></>}
      <div ref={end} />
    </div>
    <div className="border-t border-foreground/20 bg-canvas p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-2">{prompts.map(prompt => <button key={prompt} type="button" disabled={disabled || sending} onClick={() => { setQuestion(prompt); input.current?.focus(); }} className="min-h-11 max-w-full rounded-control border border-foreground/30 px-3 py-2 text-left text-sm disabled:opacity-50">{prompt}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-3">
        <label className="grid gap-2 text-sm font-bold">Action<select aria-label="Action" value={mode} disabled={disabled || sending} onChange={e => setMode(e.target.value as "chat" | "research")} className="min-h-11 rounded-control border-2 border-foreground bg-surface-raised p-2"><option value="chat">Ask a follow-up question</option><option value="research">Start in-depth research</option></select></label>
        {validation && <p role="alert" className="text-sm">{validation}</p>}
        <label className="grid gap-2 text-sm font-bold">{mode === "research" ? "Problem statement" : "Your question"}
          <textarea ref={input} rows={3} maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} disabled={disabled || sending} placeholder="Ask for another angle, a deeper explanation, or questions to explore…" required className="min-h-24 w-full min-w-0 resize-y rounded-control border-2 border-foreground bg-surface-raised px-3 py-3 font-normal" />
        </label>
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-secondary">{question.length}/2,000</span><Button type="submit" loading={sending} disabled={disabled || sending || !question.trim()}>{sending ? "Working…" : mode === "research" || deepResearchCommand(question) ? "Start in-depth research" : "Send question"}</Button></div>
      </form>
    </div>
  </section>;
}

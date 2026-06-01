"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wordmark } from "@/components/Wordmark";
import { Sparkle } from "@/components/Sparkle";
import { ModelPicker } from "@/components/ModelPicker";
import { DEFAULT_MODEL, MODELS } from "@/lib/models";

type Source = {
  n: number;
  video_id: string;
  title: string;
  score: number;
  t?: number | null;
  time?: string;
  url: string;
};
type Step = { role: string; summary?: string };
type Mode = "fast" | "crew";
type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
  steps?: Step[];
  mode?: Mode;
  pending?: boolean; // crew is thinking (blocking)
};

const CREW_STEPS = ["Query Planner", "Catalogue Researcher", "Answer Synthesizer"];

const SUGGESTIONS = [
  "Which topics connect the most episodes across the catalogue?",
  "Where do AI and India overlap, and in which conversations?",
  "What links the Sam Altman and Dario Amodei episodes?",
  "Which companies or people recur across 20+ episodes?",
];

const modelLabel = (id?: string) =>
  MODELS.find((m) => m.id === id)?.label || id || "";

function linkifyCitations(content: string, sources?: Source[]): string {
  if (!sources || !sources.length) return content;
  return content.replace(/\[(\d{1,2})\]/g, (m, d) => {
    const n = parseInt(d, 10);
    const s = sources.find((x) => x.n === n);
    return s ? `[[${n}]](${s.url})` : m;
  });
}

function CrewThinking() {
  return (
    <div className="space-y-2.5 py-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wtf-purple opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-wtf-purple" />
        </span>
        <span className="font-semibold">the crew is working…</span>
      </div>
      <ol className="text-xs text-ink/65 space-y-1.5">
        {CREW_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-ink flex items-center justify-center text-[10px] font-semibold">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-ink/40">
        agentic retrieval on NVIDIA NIM · this takes ~30-60s
      </p>
    </div>
  );
}

function ChatInner() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [mode, setMode] = useState<Mode>("fast");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const setLast = (msg: Msg) =>
    setMessages((m) => {
      const c = [...m];
      c[c.length - 1] = msg;
      return c;
    });

  // FAST: stream a single-shot RAG answer (TS route)
  const runFast = async (history: Msg[], useModel: string) => {
    setMessages([...history, { role: "assistant", content: "", model: useModel, mode: "fast" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: useModel,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        setLast({ role: "assistant", content: `⚠️ ${(await res.text()) || "request failed"}`, model: useModel, mode: "fast" });
        return;
      }
      let sources: Source[] = [];
      const hdr = res.headers.get("X-Sources");
      if (hdr) try { sources = JSON.parse(decodeURIComponent(hdr)); } catch {}
      const usedModel = res.headers.get("X-Model") || useModel;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setLast({ role: "assistant", content: acc, sources, model: usedModel, mode: "fast" });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      setLast({ role: "assistant", content: `⚠️ ${(e as Error).message}`, model: useModel, mode: "fast" });
    } finally {
      setLoading(false);
    }
  };

  // CREW: blocking call to the CrewAI + NeMo Agent Toolkit service
  const runCrew = async (history: Msg[], useModel: string) => {
    setMessages([...history, { role: "assistant", content: "", model: useModel, mode: "crew", pending: true }]);
    setLoading(true);
    try {
      const res = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: useModel,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setLast({ role: "assistant", content: `⚠️ ${data.error || "crew failed"}`, model: useModel, mode: "crew" });
        return;
      }
      const sources: Source[] = (data.sources || []).map((s: { n: number; video_id: string; title: string; score: number; start?: number; time?: string; url: string }) => ({
        n: s.n, video_id: s.video_id, title: s.title, score: s.score,
        t: s.start ?? null, time: s.time, url: s.url,
      }));
      setLast({
        role: "assistant",
        content: data.answer || "(no answer)",
        sources,
        steps: data.steps || [],
        model: data.model || useModel,
        mode: "crew",
      });
    } catch (e) {
      setLast({ role: "assistant", content: `⚠️ ${(e as Error).message}`, model: useModel, mode: "crew" });
    } finally {
      setLoading(false);
    }
  };

  const run = (history: Msg[], useModel: string, useMode: Mode) =>
    useMode === "crew" ? runCrew(history, useModel) : runFast(history, useModel);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    run([...messages, { role: "user", content: q }], model, mode);
  };

  // re-answer the last question with the current model + mode
  const retry = () => {
    if (loading) return;
    let lastUser = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUser = i; break; }
    }
    if (lastUser === -1) return;
    run(messages.slice(0, lastUser + 1), model, mode);
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      run([{ role: "user", content: q }], model, mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const empty = messages.length === 0;
  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <div className="halftone min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="display text-3xl flex items-center gap-2">
              ask <span className="text-wtf-red">wtf</span> anything
              <Sparkle size={20} className="animate-twinkle" />
            </h1>
            <p className="text-xs text-ink/55 mt-1">
              retrieval{" "}
              <code className="bg-white border border-ink/20 px-1 rounded">nv-embedqa-e5-v5</code>{" "}
              · 1,422 chunks · answer model:
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border-2 border-ink overflow-hidden text-xs">
                <button
                  onClick={() => setMode("fast")}
                  data-cursor="fast"
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    mode === "fast" ? "bg-ink text-cream" : "bg-white hover:bg-cream"
                  }`}
                >
                  ⚡ Fast
                </button>
                <button
                  onClick={() => setMode("crew")}
                  data-cursor="crew"
                  className={`px-3 py-1.5 font-semibold border-l-2 border-ink transition-colors ${
                    mode === "crew" ? "bg-wtf-purple text-cream" : "bg-white hover:bg-cream"
                  }`}
                >
                  🧠 Crew
                </button>
              </div>
              <ModelPicker value={model} onChange={setModel} />
            </div>
            <span className="text-[10px] text-ink/40">
              {mode === "crew"
                ? "agentic · CrewAI + NeMo Agent Toolkit · slower, grounded"
                : "single-shot RAG · fast · ranked by context · speed · media"}
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto card-flat bg-cream p-5 space-y-5">
          {empty && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <Wordmark size="text-5xl sm:text-6xl" />
              <p className="serif text-xl text-ink/70 max-w-lg">
                The curation desk for the catalogue. Find what recurs, what
                connects, and where shows overlap across 53 conversations, every
                answer cited to the moment it was said.
              </p>
              <Link
                href="/connections"
                data-cursor="open"
                className="pill px-5 py-2 bg-white text-sm hover:bg-ink hover:text-cream inline-flex items-center gap-1.5"
              >
                See the connection map →
              </Link>
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    data-cursor="ask"
                    className="text-left text-sm p-4 card hover:bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] bg-ink text-cream rounded-2xl rounded-br-md px-4 py-3 text-sm"
                    : "max-w-[92%] bg-white border-2 border-ink rounded-2xl rounded-bl-md px-4 py-3 shadow-[4px_4px_0_#1A1A1A]"
                }
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                ) : m.content ? (
                  <div className="prose-chat text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer" data-cursor="watch" className="cite">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {linkifyCitations(m.content, m.sources)}
                    </ReactMarkdown>
                  </div>
                ) : m.mode === "crew" && m.pending ? (
                  <CrewThinking />
                ) : (
                  <p className="text-sm">{loading && i === messages.length - 1 ? "▍" : ""}</p>
                )}

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t-2 border-ink/10 flex flex-wrap gap-2">
                    {m.sources.map((s) => (
                      <a
                        key={s.n}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        data-cursor="watch"
                        title={`${s.title} · score ${s.score}`}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-wtf-yellow/70 hover:bg-wtf-yellow border border-ink transition-colors max-w-[260px] truncate inline-flex items-center gap-1.5"
                      >
                        <span className="truncate">[{s.n}] {s.title}</span>
                        {s.time && (
                          <span className="shrink-0 font-semibold bg-ink text-cream rounded px-1">
                            ▶ {s.time}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {m.role === "assistant" && m.mode === "crew" && m.steps && m.steps.length > 0 && (
                  <div className="mt-3 pt-3 border-t-2 border-ink/10">
                    <div className="text-[10px] text-wtf-purple font-semibold uppercase tracking-wider mb-1.5">
                      how the crew answered
                    </div>
                    <ol className="space-y-1">
                      {m.steps.map((s, si) => (
                        <li key={si} className="flex items-start gap-2 text-[11px] text-ink/60">
                          <span className="w-4 h-4 shrink-0 rounded-full bg-wtf-purple/15 text-wtf-purple flex items-center justify-center text-[9px] font-bold">
                            {si + 1}
                          </span>
                          <span><b className="text-ink/75">{s.role}</b>{s.summary ? ` · ${s.summary}` : ""}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {m.role === "assistant" && m.model && m.content && (
                  <div className="mt-2 text-[10px] text-ink/40">
                    answered by {m.mode === "crew" ? "Crew · " : ""}{modelLabel(m.model)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* retry bar */}
        {lastIsAssistant && !loading && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={retry}
              data-cursor="retry"
              className="pill px-4 py-2 bg-white text-xs hover:bg-ink hover:text-cream inline-flex items-center gap-1.5"
            >
              ↻ Retry with {modelLabel(model)}
            </button>
            <span className="text-[11px] text-ink/45">
              switch the model above, then retry to compare answers
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the WTF catalogue…"
            className="flex-1 border-2 border-ink rounded-full px-5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-wtf-purple"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            data-cursor="send"
            className="pill pill-solid px-7 py-3 disabled:opacity-40"
          >
            {loading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="halftone min-h-[calc(100vh-64px)]" />}>
      <ChatInner />
    </Suspense>
  );
}

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
type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
};

const modelLabel = (id?: string) =>
  id === "grounding guard"
    ? "grounding guard"
    : MODELS.find((m) => m.id === id)?.label || id || "";

function linkifyCitations(content: string, sources?: Source[]): string {
  if (!sources || !sources.length) return content;
  return content.replace(/\[(\d{1,2})\]/g, (m, d) => {
    const n = parseInt(d, 10);
    const s = sources.find((x) => x.n === n);
    return s ? `[[${n}]](${s.url})` : m;
  });
}

function ChatInner() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const setLast = (msg: Msg) =>
    setMessages((m) => {
      const c = [...m];
      c[c.length - 1] = msg;
      return c;
    });

  const runFast = async (history: Msg[], useModel: string) => {
    setMessages([...history, { role: "assistant", content: "", model: useModel }]);
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
        const failure = await res.text();
        let message = failure || "request failed";
        try {
          const parsed = JSON.parse(failure) as { error?: string };
          message = parsed.error || message;
        } catch {}
        setLast({ role: "assistant", content: `⚠️ ${message}`, model: useModel });
        return;
      }
      let sources: Source[] = [];
      const hdr = res.headers.get("X-Sources");
      if (hdr) try { sources = JSON.parse(decodeURIComponent(hdr)); } catch {}
      const usedModel = res.headers.get("X-Model") || useModel;
      const didFallback = res.headers.get("X-Fallback") === "true";
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setLast({
          role: "assistant",
          content: acc,
          sources,
          model: didFallback ? `${usedModel} (fallback)` : usedModel,
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      setLast({ role: "assistant", content: `⚠️ ${(e as Error).message}`, model: useModel });
    } finally {
      setLoading(false);
    }
  };

  const send = (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    runFast([...messages, { role: "user", content: q }], model);
  };

  // Re-answer the last question with the selected model.
  const retry = () => {
    if (loading) return;
    let lastUser = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUser = i; break; }
    }
    if (lastUser === -1) return;
    runFast(messages.slice(0, lastUser + 1), model);
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      runFast([{ role: "user", content: q }], model);
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
              · 1,933 chunks · answer model:
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ModelPicker value={model} onChange={setModel} />
            <span className="text-[10px] text-ink/40">
              single-shot RAG · grounded in 55 episodes · cited sources
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto card-flat bg-cream p-5 space-y-5">
          {empty && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <Wordmark size="text-5xl sm:text-6xl" />
              <p className="serif text-xl text-ink/70 max-w-lg">
                Ask for a specific idea, guest viewpoint, or episode topic. Each
                answer is grounded in retrieved passages and links to the source
                moment when verified captions are available.
              </p>
              <Link
                href="/connections"
                data-cursor="open"
                className="pill px-5 py-2 bg-white text-sm hover:bg-ink hover:text-cream inline-flex items-center gap-1.5"
              >
                See the connection map →
              </Link>
              <p className="text-sm text-ink/55 max-w-xl">
                For example: “What does Nikos Christodoulides say India should lead?”
              </p>
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

                {m.role === "assistant" && m.model && m.content && (
                  <div className="mt-2 text-[10px] text-ink/40">
                    answered by {modelLabel(m.model)}
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

export default function LegacyChatPage() {
  return (
    <Suspense fallback={<div className="halftone min-h-[calc(100vh-64px)]" />}>
      <ChatInner />
    </Suspense>
  );
}

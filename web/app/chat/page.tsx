"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wordmark } from "@/components/Wordmark";
import { Sparkle } from "@/components/Sparkle";

type Source = {
  n: number;
  video_id: string;
  title: string;
  score: number;
  t?: number | null;
  time?: string;
  url: string;
};
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

const SUGGESTIONS = [
  "What does Sam Altman say about winning when AI changes everything?",
  "How do these founders think about raising capital in India?",
  "What did guests say about longevity and health?",
  "Summarize the boldest predictions across the catalogue.",
];

// Turn [1]/[2] into markdown links to the matching source.
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const history = [...messages, { role: "user" as const, content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: `⚠️ ${err || "request failed"}` };
          return c;
        });
        setLoading(false);
        return;
      }
      let sources: Source[] = [];
      const hdr = res.headers.get("X-Sources");
      if (hdr) {
        try {
          sources = JSON.parse(decodeURIComponent(hdr));
        } catch {}
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc, sources };
          return c;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: `⚠️ ${(e as Error).message}` };
        return c;
      });
    } finally {
      setLoading(false);
    }
  };

  // auto-ask from ?q= (used by the episode drawer)
  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const empty = messages.length === 0;

  return (
    <div className="halftone min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="display text-3xl flex items-center gap-2">
              ask <span className="text-wtf-red">wtf</span> anything
              <Sparkle size={20} className="animate-twinkle" />
            </h1>
            <p className="text-xs text-ink/55 mt-1">
              retrieval{" "}
              <code className="bg-white border border-ink/20 px-1 rounded">nv-embedqa-e5-v5</code>{" "}
              · answers{" "}
              <code className="bg-white border border-ink/20 px-1 rounded">llama-3.3-70b</code>{" "}
              · NVIDIA NIM
            </p>
          </div>
          <span className="chip bg-wtf-green text-cream hidden sm:inline">
            1,422 chunks live
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto card-flat bg-cream p-5 space-y-5">
          {empty && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <Wordmark size="text-5xl sm:text-6xl" />
              <p className="serif text-xl text-ink/70 max-w-md">
                Every WTF conversation, searchable and cited. Ask across 53
                episodes and get answers grounded in what guests actually said.
              </p>
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
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            data-cursor="watch"
                            className="cite"
                          >
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
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2"
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

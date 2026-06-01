"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews } from "@/lib/episodes";
import { DragRow } from "./DragRow";
import { Sparkle } from "./Sparkle";

const swatch = [
  "bg-wtf-yellow",
  "bg-wtf-orange",
  "bg-wtf-red text-cream",
  "bg-wtf-green text-cream",
  "bg-wtf-purple text-cream",
];

export function EpisodesBrowser({
  groups,
}: {
  groups: [string, Episode[]][];
}) {
  const [active, setActive] = useState<Episode | null>(null);

  return (
    <>
      {groups.map(([show, eps], gi) => (
        <section key={show} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className={`chip ${swatch[gi % swatch.length]}`}>{show}</span>
            <span className="text-xs text-ink/45">{eps.length} episodes</span>
            <span className="ml-auto hidden sm:block text-xs text-ink/30 italic">
              drag to explore →
            </span>
          </div>

          <DragRow>
            {eps.map((e) => (
              <button
                key={e.video_id}
                onClick={() => setActive(e)}
                data-cursor="open"
                className="card overflow-hidden flex flex-col shrink-0 w-[300px] text-left"
              >
                <div className="relative aspect-video bg-ink/10">
                  <Image
                    src={thumbnailUrl(e.video_id)}
                    alt={e.title}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 chip bg-ink text-cream">
                    {fmtDuration(e.duration)}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium text-sm leading-snug line-clamp-3 flex-1">
                    {e.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-ink/50">
                    <span>{fmtViews(e.view_count)} views</span>
                    <span className="eyebrow text-wtf-purple">open ↗</span>
                  </div>
                </div>
              </button>
            ))}
          </DragRow>
        </section>
      ))}

      {active && <EpisodeDrawer ep={active} onClose={() => setActive(null)} />}
    </>
  );
}

type Block = { t: number; text: string };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function EpisodeDrawer({ ep, onClose }: { ep: Episode; onClose: () => void }) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setBlocks(null);
    setText(null);
    setErr(false);
    // prefer timestamped JSON → clickable blocks; fall back to plain text
    fetch(`/transcripts/${ep.video_id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((snips: { t: number; x: string }[]) => {
        const out: Block[] = [];
        let cur: string[] = [];
        let start = snips[0]?.t ?? 0;
        let len = 0;
        for (const s of snips) {
          if (!cur.length) start = s.t;
          cur.push(s.x);
          len += s.x.length + 1;
          if (len >= 360) {
            out.push({ t: start, text: cur.join(" ") });
            cur = [];
            len = 0;
          }
        }
        if (cur.length) out.push({ t: start, text: cur.join(" ") });
        setBlocks(out);
      })
      .catch(() => {
        fetch(`/transcripts/${ep.video_id}.txt`)
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then(setText)
          .catch(() => setErr(true));
      });
  }, [ep.video_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const askHref = `/chat?q=${encodeURIComponent(
    `About the episode "${ep.title}": give me the key takeaways and the most surprising thing said.`
  )}`;

  return (
    <div className="fixed inset-0 z-[8000] flex justify-end">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-lg h-full bg-cream border-l-2 border-ink flex flex-col animate-popin">
        {/* header */}
        <div className="p-5 border-b-2 border-ink">
          <div className="flex items-start justify-between gap-3">
            <span className="chip bg-wtf-yellow">
              {ep.playlist_title || "Episode"}
            </span>
            <button
              onClick={onClose}
              data-cursor="close"
              className="chip bg-wtf-red text-cream"
            >
              Close ✕
            </button>
          </div>
          <h2 className="serif text-xl font-semibold mt-3 leading-snug">
            {ep.title}
          </h2>
          <div className="flex items-center gap-3 mt-3 text-xs text-ink/55">
            <span>{fmtDuration(ep.duration)}</span>
            <span>·</span>
            <span>{fmtViews(ep.view_count)} views</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={ep.url}
              target="_blank"
              rel="noreferrer"
              data-cursor="watch"
              className="pill px-4 py-2 bg-white text-sm hover:bg-ink hover:text-cream"
            >
              ▶ Watch on YouTube
            </a>
            <Link
              href={askHref}
              data-cursor="ask!"
              className="pill pill-solid px-4 py-2 text-sm inline-flex items-center gap-1.5"
            >
              <Sparkle size={14} color="#F1B333" /> Ask about this episode
            </Link>
          </div>
        </div>

        {/* transcript */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow text-ink/45">transcript</span>
            {blocks && (
              <span className="text-[11px] text-ink/40">
                · click any line to jump to that moment
              </span>
            )}
          </div>
          {blocks === null && text === null && !err && (
            <p className="text-sm text-ink/50">Loading transcript…</p>
          )}
          {err && (
            <p className="text-sm text-ink/50">
              No transcript available for this episode.
            </p>
          )}
          {blocks && (
            <div className="space-y-2.5">
              {blocks.map((b, i) => (
                <a
                  key={i}
                  href={`${ep.url}&t=${Math.floor(b.t)}s`}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="jump"
                  className="group flex gap-3 rounded-lg p-2 -mx-2 hover:bg-white transition-colors"
                >
                  <span className="shrink-0 text-[11px] font-semibold bg-wtf-yellow border border-ink rounded px-1.5 h-fit py-0.5 group-hover:bg-wtf-red group-hover:text-cream transition-colors">
                    ▶ {fmtTime(b.t)}
                  </span>
                  <span className="text-sm leading-relaxed text-ink/80">
                    {b.text}
                  </span>
                </a>
              ))}
            </div>
          )}
          {text && !blocks && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink/80">
              {text}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

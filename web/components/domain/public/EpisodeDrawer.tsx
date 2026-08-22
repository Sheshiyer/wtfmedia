"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { fmtDuration, fmtViews } from "@/lib/episodes";
import { Drawer } from "@/components/ui/Drawer";
import { Sparkle } from "@/components/Sparkle";

type Block = { t: number; text: string };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export interface EpisodeDrawerProps {
  /** The episode to display, or null to close */
  episode: Episode | null;
  /** Callback when the drawer should close */
  onClose: () => void;
}

/**
 * Accessible public episode detail drawer.
 *
 * Displays compatibility-safe public detail only (D-04):
 * - Title, show, duration, views
 * - Transcript (JSON blocks with timestamps, or plain text fallback)
 * - YouTube watch link with timestamp deep links
 * - Ask WTF entry point
 *
 * Uses the WTF Drawer primitive (Radix Dialog backing).
 * Selection is URL-backed via url-state helpers.
 */
export function EpisodeDrawer({ episode, onClose }: EpisodeDrawerProps) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!episode) return;
    setBlocks(null);
    setText(null);
    setErr(false);
    fetch(`/transcripts/${episode.video_id}.json`)
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
        fetch(`/transcripts/${episode.video_id}.txt`)
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then(setText)
          .catch(() => setErr(true));
      });
  }, [episode?.video_id]);

  if (!episode) return null;

  const askHref = `/chat?q=${encodeURIComponent(
    `About the episode "${episode.title}": give me the key takeaways and the most surprising thing said.`,
  )}`;

  return (
    <Drawer
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={episode.title}
      description={`${episode.playlist_title || "Episode"} · ${fmtDuration(episode.duration)} · ${fmtViews(episode.view_count)} views`}
      side="right"
    >
      <div className="flex flex-col h-full">
        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href={episode.url}
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

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow text-ink/65">transcript</span>
            {blocks && (
              <span className="text-[11px] text-ink/55">
                · click any line to jump to that moment
              </span>
            )}
          </div>
          {blocks === null && text === null && !err && (
            <p className="text-sm text-ink/65">Loading transcript…</p>
          )}
          {err && (
            <p className="text-sm text-ink/65">
              No public transcript is available for this episode.
            </p>
          )}
          {blocks && (
            <div className="space-y-2.5">
              {blocks.map((b, i) => (
                <a
                  key={i}
                  href={`${episode.url}&t=${Math.floor(b.t)}s`}
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
      </div>
    </Drawer>
  );
}

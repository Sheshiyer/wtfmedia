"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { fmtDuration, fmtViews, thumbnailUrl } from "@/lib/episodes";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export type EpisodeIdea = {
  id: string;
  label: string;
  category: string;
  episodeCount: number;
};

type TranscriptBlock = { t: number; text: string };

type TranscriptState = {
  blocks: TranscriptBlock[] | null;
  text: string | null;
  loadError: boolean;
};

interface EpisodeDetailPageProps {
  episode: Episode;
  ideas: EpisodeIdea[];
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function youtubeEmbedUrl(videoId: string, seconds: number): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?start=${Math.max(0, Math.floor(seconds))}&rel=0`;
}

function youtubeWatchUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.max(0, Math.floor(seconds))}s`;
}

function useTranscript(episode: Episode): TranscriptState {
  const [blocks, setBlocks] = useState<TranscriptBlock[] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setBlocks(null);
    setText(null);
    setLoadError(false);

    const loadTranscript = async () => {
      try {
        const transcriptId = encodeURIComponent(episode.video_id);
        const jsonResponse = await fetch(`/transcripts/${transcriptId}.json`);
        if (jsonResponse.ok) {
          const snips = (await jsonResponse.json()) as Array<{ t?: unknown; x?: unknown }>;
          if (!Array.isArray(snips)) throw new Error("invalid_transcript_json");

          const nextBlocks: TranscriptBlock[] = [];
          let current: string[] = [];
          let start = 0;
          let length = 0;

          for (const snip of snips) {
            const timestamp = Number(snip.t);
            const content = typeof snip.x === "string" ? snip.x.trim() : "";
            if (!Number.isFinite(timestamp) || timestamp < 0 || !content) continue;
            if (current.length === 0) start = timestamp;
            current.push(content);
            length += content.length + 1;
            if (length >= 420) {
              nextBlocks.push({ t: start, text: current.join(" ") });
              current = [];
              length = 0;
            }
          }
          if (current.length > 0) nextBlocks.push({ t: start, text: current.join(" ") });
          if (active) setBlocks(nextBlocks);
          return;
        }

        const textResponse = await fetch(`/transcripts/${transcriptId}.txt`);
        if (!textResponse.ok) throw new Error("transcript_not_found");
        if (active) setText(await textResponse.text());
      } catch {
        if (active) setLoadError(true);
      }
    };

    void loadTranscript();
    return () => {
      active = false;
    };
  }, [episode]);

  return { blocks, text, loadError };
}

export function EpisodeDetailPage({ episode, ideas }: EpisodeDetailPageProps) {
  const transcript = useTranscript(episode);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const askDefault = `About the episode "${episode.title}": map the transcript, key moments, and WTF OS connections.`;
  const transcriptBlocks = transcript.blocks ?? [];
  const visibleTranscriptBlocks = transcriptBlocks.slice(0, 3);
  const hiddenTranscriptBlocks = transcriptBlocks.slice(3);
  const visibleIdeas = ideas.slice(0, 3);
  const hiddenIdeas = ideas.slice(3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas">
      <WorkspaceHeader
        eyebrow={episode.playlist_title || "published episode"}
        title={episode.title}
        summary="one episode, one workspace: published source, transcript, Ask WTF, and mapped ideas."
        accent="information"
        size="page"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>{fmtDuration(episode.duration)}</span>
            <span>{fmtViews(episode.view_count)} views</span>
            <span>{ideas.length} mapped ideas</span>
          </div>
        }
        primaryAction={
          <Link href="/episodes" className="pill inline-flex min-h-11 items-center px-4 py-2 text-sm">
            all episodes
          </Link>
        }
      />

      <main className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        <section className="max-w-3xl" aria-label="episode source embeds">
          <SourceCard
            title="youtube published version"
            detail="play the public YouTube episode here or jump to a transcript timestamp."
            stateLabel="published source"
            available
          >
            {playerOpen ? (
              <iframe
                key={`${episode.video_id}-${seekSeconds}`}
                src={youtubeEmbedUrl(episode.video_id, seekSeconds)}
                title={`Published YouTube video: ${episode.title}`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayerOpen(true)}
                className="group relative block aspect-video w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
              >
                <Image
                  src={thumbnailUrl(episode.video_id)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover grayscale transition-[filter,transform] group-hover:scale-[1.02] group-hover:grayscale-0"
                />
                <span className="absolute left-4 top-4 rounded-control border-2 border-foreground bg-attention px-3 py-2 font-label text-xs font-bold lowercase text-on-attention">
                  play published
                </span>
              </button>
            )}
          </SourceCard>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section className="border-2 border-foreground bg-surface-raised p-4 sm:p-6" aria-labelledby="episode-transcript-heading">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 id="episode-transcript-heading" className="eyebrow text-secondary">
                readable transcript
              </h2>
              {transcript.blocks ? <span className="text-[11px] text-muted">jump to a published moment</span> : null}
            </div>
            {transcript.blocks === null && transcript.text === null && !transcript.loadError ? (
              <p className="text-sm text-secondary">Loading transcript...</p>
            ) : null}
            {transcript.loadError ? (
              <p className="text-sm text-secondary">No public transcript is available for this episode.</p>
            ) : null}
            {transcript.blocks ? (
              <div className="space-y-3">
                {visibleTranscriptBlocks.map((block, index) => (
                  <TranscriptBlockCard
                    key={`${block.t}-${index}`}
                    block={block}
                    onSeek={(seconds) => {
                      setSeekSeconds(seconds);
                      setPlayerOpen(true);
                    }}
                  />
                ))}
                {hiddenTranscriptBlocks.length > 0 ? (
                  <details className="group rounded-control border border-foreground/20 bg-canvas p-3">
                    <summary className="cursor-pointer font-label text-[11px] font-bold uppercase tracking-[0.12em] text-foreground marker:text-attention">
                      show {hiddenTranscriptBlocks.length} more transcript moments
                    </summary>
                    <div className="mt-3 space-y-3">
                      {hiddenTranscriptBlocks.map((block, index) => (
                        <TranscriptBlockCard
                          key={`${block.t}-hidden-${index}`}
                          block={block}
                          onSeek={(seconds) => {
                            setSeekSeconds(seconds);
                            setPlayerOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
            {transcript.text && !transcript.blocks ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">{transcript.text}</p>
            ) : null}
          </section>

          <aside className="space-y-5">
            <section className="border-2 border-foreground bg-surface-raised p-4 sm:p-5" aria-labelledby="episode-chat-heading">
              <h2 id="episode-chat-heading" className="font-heading text-xl font-bold lowercase text-foreground">
                transcript chat
              </h2>
              <form action="/chat" method="get" className="mt-3 space-y-3">
                <textarea
                  name="q"
                  defaultValue={askDefault}
                  className="min-h-32 w-full resize-y rounded-control border-2 border-foreground bg-canvas p-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
                />
                <button type="submit" className="pill pill-solid min-h-11 px-4 py-2 text-sm">
                  ask wtf
                </button>
              </form>
            </section>

            <section className="border-2 border-foreground bg-surface-raised p-4 sm:p-5" aria-labelledby="episode-keywords-heading">
              <h2 id="episode-keywords-heading" className="font-heading text-xl font-bold lowercase text-foreground">
                mapped keywords
              </h2>
              {ideas.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {visibleIdeas.map((idea) => (
                    <IdeaCard key={idea.id} idea={idea} />
                  ))}
                  {hiddenIdeas.length > 0 ? (
                    <li>
                      <details className="rounded-control border border-foreground/20 bg-canvas p-3">
                        <summary className="cursor-pointer font-label text-[11px] font-bold uppercase tracking-[0.12em] text-foreground marker:text-attention">
                          show {hiddenIdeas.length} more keywords
                        </summary>
                        <ul className="mt-3 space-y-2">
                          {hiddenIdeas.map((idea) => (
                            <IdeaCard key={idea.id} idea={idea} />
                          ))}
                        </ul>
                      </details>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  No public connection keywords are mapped to this episode yet.
                </p>
              )}
            </section>

            <a
              href={youtubeWatchUrl(episode.video_id, seekSeconds)}
              target="_blank"
              rel="noreferrer"
              className="pill inline-flex min-h-11 items-center px-4 py-2 text-sm"
            >
              open published moment
            </a>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TranscriptBlockCard({
  block,
  onSeek,
}: {
  block: TranscriptBlock;
  onSeek: (seconds: number) => void;
}) {
  return (
    <article className="grid gap-3 rounded-control border border-foreground/15 bg-canvas p-3 sm:grid-cols-[4.75rem_1fr]">
      <button
        type="button"
        onClick={() => onSeek(block.t)}
        className="h-fit rounded border border-foreground bg-attention px-2 py-1 text-[11px] font-semibold text-on-attention transition-colors hover:bg-editorial hover:text-on-editorial"
        aria-label={`Play published video at ${formatTime(block.t)}`}
      >
        {formatTime(block.t)}
      </button>
      <p className="text-sm leading-relaxed text-secondary">{block.text}</p>
    </article>
  );
}

function IdeaCard({ idea }: { idea: EpisodeIdea }) {
  return (
    <li className="rounded-control border border-foreground/20 bg-canvas p-3">
      <span className="chip border-live bg-canvas text-foreground">{idea.category}</span>
      <p className="mt-2 text-sm font-semibold text-foreground">{idea.label}</p>
      <p className="mt-1 text-xs text-secondary">
        {idea.episodeCount} episode{idea.episodeCount !== 1 ? "s" : ""} in the graph
      </p>
    </li>
  );
}

function SourceCard({
  title,
  detail,
  stateLabel,
  available,
  children,
}: {
  title: string;
  detail: string;
  stateLabel: string;
  available: boolean;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden border-2 border-foreground bg-surface-raised">
      {children}
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={available ? "chip bg-attention text-on-attention" : "chip bg-surface-structure text-on-structure"}>
            {stateLabel}
          </span>
          <h2 className="font-heading text-2xl font-bold lowercase leading-tight text-foreground">
            {title}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-secondary">{detail}</p>
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { data, thumbnailUrl } from "@/lib/episodes";
import { LinkButton } from "@/components/ui/LinkButton";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export function MigratedHomePage() {
  const episodeCount = data.entry_count;
  const showCount = new Set(data.entries.map((entry) => entry.playlist_title)).size;
  const spotlight = data.entries[0];
  const recentEpisodes = data.entries.slice(1, 5);

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        eyebrow="public room"
        title="the room"
        summary="ask the catalogue, get the moment. published conversations, recurring ideas, and source-backed answers live here."
        accent="attention"
        context={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>public room</span>
            <span>{episodeCount} indexed episodes</span>
            <span>{showCount} catalogue shows</span>
            <span>source timing only when verified</span>
          </div>
        }
        primaryAction={
          <LinkButton
            href="/chat"
            variant="secondary"
            data-testid="cta-primary"
            className="border-foreground bg-attention text-on-attention shadow-[4px_4px_0_var(--wtf-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-attention hover:shadow-[6px_6px_0_var(--wtf-foreground)]"
          >
            ask the catalogue ↗
          </LinkButton>
        }
      />

      {spotlight && (
        <section
          data-testid="source-spotlight"
          className="border-b-2 border-foreground bg-surface-structure px-4 py-8 text-on-structure sm:px-8 xl:px-12 xl:py-12"
        >
          <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-0 border-2 border-foreground bg-surface-raised text-foreground shadow-[6px_6px_0_var(--wtf-foreground)] lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
            <div className="relative min-h-72 overflow-hidden border-b-2 border-foreground bg-surface-structure lg:min-h-[30rem] lg:border-b-0 lg:border-r-2">
              <Image
                src={thumbnailUrl(spotlight.video_id)}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 62vw, 100vw"
                className="object-cover grayscale"
                unoptimized
              />
              <span className="absolute left-4 top-4 border-2 border-foreground bg-attention px-2 py-1 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-on-attention">
                source spotlight
              </span>
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
              <div>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">from the catalogue</p>
                <h2 className="mt-3 font-display text-4xl font-extrabold lowercase leading-[0.9] tracking-[-0.04em] sm:text-5xl">
                  {spotlight.title}
                </h2>
                <p className="mt-5 max-w-[46ch] font-body text-base leading-relaxed text-secondary">
                  Start from a public episode record, follow the source material, then ask the catalogue without losing the evidence trail.
                </p>
              </div>
              <div className="border-t-2 border-foreground/20 pt-5">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  published source · {spotlight.playlist_title ?? "catalogue"}
                </p>
                <Link
                  href={`/episodes?episode=${encodeURIComponent(spotlight.video_id)}`}
                  className="mt-4 inline-flex min-h-11 items-center border-b-2 border-attention font-label text-sm font-bold lowercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
                >
                  open source receipt ↗
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-y-2 border-foreground bg-surface-subtle px-4 py-10 sm:px-8 xl:px-12">
        <div className="mx-auto max-w-[var(--wtf-content-max)]">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                source material
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold lowercase sm:text-4xl">
                source rail
              </h2>
            </div>
            <Link
              href="/episodes"
              className="inline-flex min-h-11 items-center font-label text-sm font-bold lowercase underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
            >
              open episode workspace ↗
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {recentEpisodes.map((episode, index) => (
              <Link
                key={episode.video_id}
                href={`/episodes?episode=${encodeURIComponent(episode.video_id)}`}
                className="group grid min-h-full grid-rows-[auto_1fr] border-2 border-foreground bg-surface-raised shadow-[4px_4px_0_var(--wtf-foreground)] transition-[transform,box-shadow] duration-fast hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
              >
                <div className="relative aspect-video overflow-hidden border-b-2 border-foreground bg-surface-structure">
                  <Image
                    src={thumbnailUrl(episode.video_id)}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className="object-cover grayscale transition-[filter,transform] duration-default group-hover:scale-[1.02] group-hover:grayscale-0"
                    unoptimized
                  />
                  <span className="absolute left-3 top-3 border-2 border-foreground bg-attention px-2 py-1 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-on-attention">
                    source {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col justify-between gap-5 p-5">
                  <h3 className="font-heading text-xl font-bold leading-tight lowercase">
                    {episode.title}
                  </h3>
                  <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    open episode receipt ↗
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

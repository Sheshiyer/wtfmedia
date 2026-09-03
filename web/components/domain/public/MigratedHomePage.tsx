import Image from "next/image";
import Link from "next/link";
import { data, thumbnailUrl } from "@/lib/episodes";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusLedger } from "@/components/patterns/StatusLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { ReleaseStatusWidget } from "@/components/patterns/ReleaseStatusWidget";

const workspaceItems = [
  {
    label: "episodes",
    state: "active" as const,
    detail: "browse published conversations and open the transcript.",
    href: "/episodes",
  },
  {
    label: "connections",
    state: "active" as const,
    detail: "see which ideas keep showing up, with shared-episode receipts.",
    href: "/connections",
  },
  {
    label: "ask wtf",
    state: "active" as const,
    detail: "ask the catalogue and keep quoted evidence beside the answer.",
    href: "/chat",
  },
  {
    label: "production",
    state: "active" as const,
    detail: "list, create, and update records. delete is unavailable.",
    href: "/ops/production",
  },
  {
    label: "episode map",
    state: "active" as const,
    detail: "title map from the catalogue snapshot. not a live source.",
    href: "/ops/episodes",
  },
  {
    label: "control room",
    state: "active" as const,
    detail: "production records are live. ingest, seats, and access gates are not.",
    href: "/ops",
  },
  {
    label: "settings",
    state: "active" as const,
    detail: "release context, role, verification state, and roadmap.",
    href: "/ops/settings",
  },
];

export function MigratedHomePage() {
  const episodeCount = data.entry_count;
  const showCount = new Set(data.entries.map((entry) => entry.playlist_title)).size;
  const recentEpisodes = data.entries.slice(0, 3);

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        eyebrow="ask the catalogue and get the moment"
        title="the room"
        summary="published conversations, recurring ideas, and answers with receipts. a timestamp only when verified."
        accent="attention"
        context={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>public workspace</span>
            <span>{episodeCount} indexed episodes</span>
            <span>{showCount} catalogue shows</span>
            <span>published and uncut stay distinct</span>
          </div>
        }
        primaryAction={
          <LinkButton
            href="/chat"
            variant="attention"
            data-testid="cta-primary"
            className="border-foreground shadow-[4px_4px_0_var(--wtf-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--wtf-foreground)]"
          >
            ask the catalogue ↗
          </LinkButton>
        }
      />

      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-8 px-4 py-8 sm:px-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)] xl:px-12 xl:py-12">
        <StatusLedger
          title="what's open"
          eyebrow="now / next"
          items={workspaceItems}
        />

        <aside className="border-2 border-foreground bg-canvas p-6 shadow-[6px_6px_0_var(--wtf-foreground)] xl:sticky xl:top-8 xl:self-start">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
            room rule
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold lowercase leading-none text-foreground">
            evidence stays readable.
          </h2>
          <p className="mt-5 font-body text-sm leading-relaxed text-secondary">
            ask wtf keeps the episode beside the answer. published and uncut
            are named. unmapped time stays unmapped.
          </p>
          <dl className="mt-8 divide-y divide-foreground/20 border-y-2 border-foreground font-label text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-secondary">catalogue scope</dt>
              <dd className="font-bold">{episodeCount} episodes</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-secondary">answer mode</dt>
              <dd className="font-bold">source-backed</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-secondary">missing evidence</dt>
              <dd className="font-bold">shown plainly</dd>
            </div>
          </dl>
          <Link
            href="/connections"
            className="mt-6 inline-flex min-h-11 items-center border-b-2 border-attention font-label text-sm font-bold lowercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
          >
            inspect recurring ideas ↗
          </Link>
        </aside>
      </div>

      <section className="border-y-2 border-foreground bg-surface-subtle px-4 py-10 sm:px-8 xl:px-12">
        <div className="mx-auto max-w-[var(--wtf-content-max)]">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                source material
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold lowercase sm:text-4xl">
                conversations in the room
              </h2>
            </div>
            <Link
              href="/episodes"
              className="inline-flex min-h-11 items-center font-label text-sm font-bold lowercase underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
            >
              open episodes ↗
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {recentEpisodes.map((episode, index) => (
              <Link
                key={episode.video_id}
                href={`/episodes/${encodeURIComponent(episode.video_id)}`}
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
                    open episode
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-8 xl:px-12">
        <div className="mx-auto max-w-[var(--wtf-content-max)]">
          <div className="mb-6">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              operating map
            </p>
          <h2 className="mt-1 font-display text-3xl font-extrabold lowercase sm:text-4xl">
              active build surfaces
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReleaseStatusWidget
              title="episode map"
              status="visible"
              tone="active"
              detail="The 2026-08-27 title map is visible in public view. It is a snapshot, not a live catalogue."
              next="Uncut pointers can be candidate or absent. Activation remains held until verified media and alignment exist."
              href="/ops/episodes"
            />
            <ReleaseStatusWidget
              title="production"
              status="live"
              tone="active"
              detail="Production records are open for the current release. Delete remains unavailable."
              href="/ops/production"
            />
            <ReleaseStatusWidget
              title="settings"
              status="roadmap"
              tone="active"
              detail="Environment, workspace, organization scope, role, verification state, and held-feature roadmap live here."
              href="/ops/settings"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

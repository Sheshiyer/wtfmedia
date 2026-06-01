import Link from "next/link";
import {
  connections as C,
  catClass,
  labelOf,
  ytUrl,
  type CNode,
} from "@/lib/connections";
import { Sparkle } from "@/components/Sparkle";

export const metadata = { title: "Connections · wtfmedia" };

const maxEps = C.established[0]?.episodeCount || C.totalEpisodes;

function NodeRow({ n }: { n: CNode }) {
  return (
    <details className="group border-b-2 border-ink/10 py-3">
      <summary className="flex items-center gap-3 cursor-pointer list-none" data-cursor="open">
        <span className={`chip ${catClass(n.category)} shrink-0`}>{n.category}</span>
        <span className="font-semibold flex-1 min-w-0 truncate">{n.label}</span>
        <span className="hidden sm:flex items-center gap-2 w-48 shrink-0">
          <span className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
            <span
              className="block h-full rounded-full bg-wtf-red"
              style={{ width: `${Math.round((n.episodeCount / maxEps) * 100)}%` }}
            />
          </span>
        </span>
        <span className="text-sm tabular-nums shrink-0 w-20 text-right">
          <b>{n.episodeCount}</b> <span className="text-ink/45">eps</span>
        </span>
        <span className="text-ink/30 shrink-0 group-open:rotate-90 transition-transform" aria-hidden>›</span>
      </summary>
      <div className="mt-3 pl-1 flex flex-wrap gap-1.5">
        {n.episodes.map((vid) => (
          <a
            key={vid}
            href={ytUrl(vid)}
            target="_blank"
            rel="noreferrer"
            data-cursor="watch"
            title={C.titles[vid]}
            className="text-[11px] px-2 py-1 rounded-full bg-cream border border-ink/30 hover:bg-wtf-yellow transition-colors max-w-[260px] truncate"
          >
            {C.titles[vid] || vid}
          </a>
        ))}
      </div>
    </details>
  );
}

export default function ConnectionsPage() {
  return (
    <div className="halftone min-h-screen">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <h1 className="display text-5xl sm:text-6xl flex items-center gap-3">
          connections <Sparkle size={28} className="animate-twinkle" />
        </h1>
        <p className="serif text-xl text-ink/70 mt-3 max-w-[58ch]">
          What recurs across the catalogue. A node is a topic, person, company or
          place that shows up in {C.threshold}+ of {C.totalEpisodes} episodes. As
          the catalogue grows, new nodes cross the line and the graph keeps
          building.
        </p>

        {/* category overlaps */}
        <section className="mt-12">
          <h2 className="display text-2xl mb-4">category overlaps</h2>
          <div className="flex flex-wrap gap-2">
            {C.overlaps.slice(0, 12).map((o) => (
              <span
                key={`${o.a}-${o.b}`}
                className="card-flat bg-white px-3 py-2 text-sm inline-flex items-center gap-2"
              >
                <span className={`chip ${catClass(o.a)}`}>{o.a}</span>
                <span className="text-ink/40">×</span>
                <span className={`chip ${catClass(o.b)}`}>{o.b}</span>
                <b className="ml-1 tabular-nums">{o.shared}</b>
                <span className="text-ink/45 text-xs">eps</span>
              </span>
            ))}
          </div>
        </section>

        {/* established nodes */}
        <section className="mt-12">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="display text-2xl">established nodes</h2>
            <span className="text-sm text-ink/50">{C.established.length} crossed {C.threshold}+ episodes</span>
          </div>
          <div className="card-flat bg-white px-5">
            {C.established.map((n) => <NodeRow key={n.id} n={n} />)}
          </div>
        </section>

        {/* strongest connections */}
        <section className="mt-12">
          <h2 className="display text-2xl mb-4">strongest connections</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {C.edges.slice(0, 12).map((e) => (
              <div
                key={`${e.a}-${e.b}`}
                className="card-flat bg-white px-4 py-3 flex items-center gap-2 text-sm"
              >
                <span className="font-semibold truncate">{labelOf(e.a)}</span>
                <span className="text-wtf-red shrink-0">↔</span>
                <span className="font-semibold truncate">{labelOf(e.b)}</span>
                <span className="ml-auto shrink-0 text-ink/55">
                  <b className="tabular-nums">{e.shared}</b> shared
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* emerging */}
        <section className="mt-12">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="display text-2xl">emerging</h2>
            <span className="text-sm text-ink/50">climbing toward {C.threshold} ({C.emergingMin}+ eps)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {C.emerging.map((n) => (
              <span key={n.id} className="card-flat bg-white px-3 py-1.5 text-sm inline-flex items-center gap-2">
                <span className={`chip ${catClass(n.category)}`}>{n.category}</span>
                {n.label}
                <b className="tabular-nums text-ink/60">{n.episodeCount}</b>
              </span>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/chat" data-cursor="ask!" className="pill pill-solid px-6 py-3 inline-flex items-center gap-2">
            <Sparkle size={15} color="#F1B333" /> Ask how these connect
          </Link>
          <Link href="/episodes" data-cursor="browse" className="pill px-6 py-3 bg-cream hover:bg-ink hover:text-cream">
            Browse episodes
          </Link>
        </div>
      </div>
    </div>
  );
}

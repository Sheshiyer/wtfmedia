import { connections } from "@/lib/connections";
import { normalizeConnectionsData } from "@/lib/public/connections";
import { MigratedConnectionGraph } from "./MigratedConnectionGraph";

/**
 * Migrated Connections page (Plan 01-13).
 *
 * Consumes the public projection only — no operator vocabulary, no raw data.
 * Uses semantic tokens from tokens.css via Tailwind var() references.
 */

export default function MigratedConnectionsPage() {
  const data = normalizeConnectionsData(connections);

  const established = data.nodes.filter((n) => n.episodeCount >= 3);
  const emerging = data.nodes.filter((n) => n.episodeCount < 3);

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-12 space-y-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-ink">
          Connection Graph
        </h1>
        <p className="text-ink/60 max-w-2xl">
          How ideas link across {data.nodes.length} nodes and{" "}
          {data.edges.length} edges. Hover to isolate, drag to rearrange,
          click a node for its episodes.
        </p>
      </div>

      {/* Graph */}
      <MigratedConnectionGraph data={data} />

      {/* Category overlaps */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-ink">Category overlaps</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.overlaps.map((o, i) => (
            <div
              key={i}
              className="rounded-lg border-2 border-ink bg-cream p-4"
            >
              <div className="text-sm font-semibold text-ink">
                {o.a} + {o.b}
              </div>
              <div className="text-xs text-ink/55 mt-1">
                {o.shared} shared episodes
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Established nodes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-ink">
          Established nodes{" "}
          <span className="text-base font-normal text-ink/45">
            ({established.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {established.map((n) => (
            <PublicNodeRow key={n.id} node={n} />
          ))}
        </div>
      </section>

      {/* Strongest connections */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-ink">Strongest connections</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.edges
            .slice()
            .sort((a, b) => b.shared - a.shared)
            .slice(0, 12)
            .map((e, i) => {
              const la = data.nodes.find((n) => n.id === e.a)?.label || e.a;
              const lb = data.nodes.find((n) => n.id === e.b)?.label || e.b;
              return (
                <div
                  key={i}
                  className="rounded-lg border-2 border-ink bg-cream p-4"
                >
                  <div className="text-sm font-semibold text-ink">
                    {la} <span className="text-ink/40">+</span> {lb}
                  </div>
                  <div className="text-xs text-ink/55 mt-1">
                    {e.shared} shared episodes
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Emerging nodes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-ink">
          Emerging nodes{" "}
          <span className="text-base font-normal text-ink/45">
            ({emerging.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emerging.map((n) => (
            <PublicNodeRow key={n.id} node={n} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PublicNodeRow({
  node,
}: {
  node: {
    id: string;
    label: string;
    category: string;
    episodeCount: number;
    episodes: string[];
  };
}) {
  const catClass = (c: string) => {
    const k = c.toLowerCase();
    if (k.includes("ai") || k.includes("tech")) return "bg-[#6758A5]";
    if (k.includes("start") || k.includes("business")) return "bg-[#F07633]";
    if (k.includes("money") || k.includes("finance") || k.includes("market"))
      return "bg-[#0C9367]";
    if (k.includes("geo") || k.includes("society")) return "bg-[#C53B3A]";
    if (k.includes("health")) return "bg-[#1FA88A]";
    if (k.includes("media") || k.includes("culture")) return "bg-[#2D6BE0]";
    if (k.includes("india")) return "bg-[#F1B333]";
    if (k.includes("mind") || k.includes("philos")) return "bg-[#1A1A1A]";
    if (k.includes("science")) return "bg-[#0E7C86]";
    return "bg-[#1A1A1A]";
  };

  return (
    <div className="rounded-lg border-2 border-ink bg-cream p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-cream text-[10px] font-semibold ${catClass(node.category)}`}
        >
          {node.category}
        </span>
        <span className="text-sm font-semibold text-ink">{node.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink/60 rounded-full"
            style={{
              width: `${Math.min(100, (node.episodeCount / 10) * 100)}%`,
            }}
          />
        </div>
        <span className="text-[11px] text-ink/50 shrink-0">
          {node.episodeCount} ep{node.episodeCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {node.episodes.slice(0, 6).map((vid) => (
          <a
            key={vid}
            href={`https://www.youtube.com/watch?v=${vid}`}
            target="_blank"
            rel="noreferrer"
            data-cursor="watch"
            className="text-[10px] px-1.5 py-0.5 rounded bg-ink/5 hover:bg-wtf-yellow transition-colors truncate max-w-[140px]"
          >
            {vid}
          </a>
        ))}
        {node.episodes.length > 6 && (
          <span className="text-[10px] text-ink/40">
            +{node.episodes.length - 6}
          </span>
        )}
      </div>
    </div>
  );
}

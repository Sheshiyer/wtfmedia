import { connections } from "@/lib/connections";
import { Sparkle } from "@/components/Sparkle";
import { LegacyConnectionGraph } from "./LegacyConnectionGraph";

export default function LegacyConnectionsPage() {
  const titles = connections.titles;
  const allNodes = [...connections.established, ...connections.emerging];

  const nodes = allNodes.map((n) => ({
    id: n.id,
    label: n.label,
    category: n.category,
    episodeCount: n.episodeCount,
    episodes: n.episodes,
  }));
  const edges = connections.edges.map((e) => ({
    a: e.a,
    b: e.b,
    shared: e.shared,
  }));

  const established = allNodes.filter((n) => n.episodeCount >= 3);
  const emerging = allNodes.filter((n) => n.episodeCount < 3);

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-12 space-y-12">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Sparkle />
          <h1 className="text-4xl font-bold tracking-tight">Connection Graph</h1>
        </div>
        <p className="text-ink/60 max-w-2xl">
          How ideas link across {allNodes.length} nodes and{" "}
          {connections.edges.length} edges. Hover to isolate, drag to rearrange,
          click a node for its episodes.
        </p>
      </div>

      {/* Graph */}
      <LegacyConnectionGraph nodes={nodes} edges={edges} titles={titles} />

      {/* Category overlaps */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Category overlaps</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {connections.overlaps.map((o, i) => (
            <div key={i} className="card-flat bg-cream p-4">
              <div className="text-sm font-semibold">
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
        <h2 className="text-2xl font-bold">
          Established nodes{" "}
          <span className="text-base font-normal text-ink/45">
            ({established.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {established.map((n) => (
            <NodeRow key={n.id} node={n} titles={titles} />
          ))}
        </div>
      </section>

      {/* Strongest connections */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Strongest connections</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {connections.edges
            .slice()
            .sort((a, b) => b.shared - a.shared)
            .slice(0, 12)
            .map((e, i) => {
              const la = allNodes.find((n) => n.id === e.a)?.label || e.a;
              const lb = allNodes.find((n) => n.id === e.b)?.label || e.b;
              return (
                <div key={i} className="card-flat bg-cream p-4">
                  <div className="text-sm font-semibold">
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
        <h2 className="text-2xl font-bold">
          Emerging nodes{" "}
          <span className="text-base font-normal text-ink/45">
            ({emerging.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emerging.map((n) => (
            <NodeRow key={n.id} node={n} titles={titles} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NodeRow({
  node,
  titles,
}: {
  node: { id: string; label: string; category: string; episodeCount: number; episodes: string[] };
  titles: Record<string, string>;
}) {
  const catClass = (c: string) => {
    const k = c.toLowerCase();
    if (k.includes("ai") || k.includes("tech")) return "bg-[#6758A5]";
    if (k.includes("start") || k.includes("business")) return "bg-[#F07633]";
    if (k.includes("money") || k.includes("finance") || k.includes("market")) return "bg-[#0C9367]";
    if (k.includes("geo") || k.includes("society")) return "bg-[#C53B3A]";
    if (k.includes("health")) return "bg-[#1FA88A]";
    if (k.includes("media") || k.includes("culture")) return "bg-[#2D6BE0]";
    if (k.includes("india")) return "bg-[#F1B333]";
    if (k.includes("mind") || k.includes("philos")) return "bg-[#1A1A1A]";
    if (k.includes("science")) return "bg-[#0E7C86]";
    return "bg-[#1A1A1A]";
  };

  return (
    <div className="card-flat bg-cream p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`chip text-cream text-[10px] ${catClass(node.category)}`}>
          {node.category}
        </span>
        <span className="text-sm font-semibold">{node.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink/60 rounded-full"
            style={{ width: `${Math.min(100, (node.episodeCount / 10) * 100)}%` }}
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
            className="text-[10px] px-1.5 py-0.5 rounded bg-ink/5 hover:bg-wtf-yellow transition-colors truncate max-w-[140px]"
            title={titles[vid]}
          >
            {titles[vid]?.slice(0, 30) || vid}
          </a>
        ))}
        {node.episodes.length > 6 && (
          <span className="text-[10px] text-ink/40">+{node.episodes.length - 6}</span>
        )}
      </div>
    </div>
  );
}

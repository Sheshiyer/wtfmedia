import raw from "@/src/data/connections.json";

export type CNode = {
  id: string;
  label: string;
  category: string;
  episodes: string[];
  episodeCount: number;
  mentions: number;
};
export type Edge = { a: string; b: string; shared: number; episodes: string[] };
export type Overlap = { a: string; b: string; shared: number };

export type ConnectionsData = {
  threshold: number;
  emergingMin: number;
  totalEpisodes: number;
  categories: { name: string; episodeCount: number }[];
  established: CNode[];
  emerging: CNode[];
  edges: Edge[];
  overlaps: Overlap[];
  titles: Record<string, string>;
};

export const connections = raw as ConnectionsData;

export const CAT_CLASS: Record<string, string> = {
  AI: "bg-wtf-purple text-cream",
  Startups: "bg-wtf-orange text-ink",
  Finance: "bg-wtf-green text-cream",
  Geopolitics: "bg-wtf-red text-cream",
  Health: "bg-wtf-green text-cream",
  Media: "bg-wtf-blue text-cream",
  India: "bg-wtf-yellow text-ink",
  Science: "bg-ink text-cream",
  Crypto: "bg-wtf-orange text-ink",
  People: "bg-ink text-cream",
};

export const catClass = (c: string) => CAT_CLASS[c] || "bg-ink text-cream";

export const labelOf = (id: string): string => {
  const n =
    connections.established.find((x) => x.id === id) ||
    connections.emerging.find((x) => x.id === id);
  return n?.label || id;
};

export const ytUrl = (vid: string) => `https://www.youtube.com/watch?v=${vid}`;

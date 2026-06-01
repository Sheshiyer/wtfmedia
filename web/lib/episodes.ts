import raw from "@/src/data/episodes.json";

export type Episode = {
  video_id: string;
  title: string;
  url: string;
  duration: number | null;
  view_count: number | null;
  uploader: string | null;
  channel_id: string | null;
  live_status: string | null;
  playlist_id?: string;
  playlist_title?: string;
  manually_added?: boolean;
};

export type EpisodesPayload = {
  source_url: string;
  channel_slug: string;
  channel_title: string;
  channel_id: string;
  uploader: string;
  entry_count: number;
  entries: Episode[];
};

export const data = raw as EpisodesPayload;

export const thumbnailUrl = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export const fmtDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const fmtViews = (n: number | null): string => {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
};

export const groupByPlaylist = (entries: Episode[]): [string, Episode[]][] => {
  const groups = new Map<string, Episode[]>();
  for (const e of entries) {
    const key = e.playlist_title || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries());
};

import { notFound } from "next/navigation";
import { data } from "@/lib/episodes";
import { connections } from "@/lib/connections";
import { publicUiVariant } from "@/lib/public/public-ui-variant";
import { EpisodeDetailPage, type EpisodeIdea } from "@/components/domain/public/EpisodeDetailPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

function decodeEpisodeId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function ideasForEpisode(videoId: string): EpisodeIdea[] {
  return [...connections.established, ...connections.emerging]
    .filter((node) => node.episodes.includes(videoId))
    .sort((a, b) => b.episodeCount - a.episodeCount || a.label.localeCompare(b.label))
    .map((node) => ({
      id: node.id,
      label: node.label,
      category: node.category,
      episodeCount: node.episodeCount,
    }));
}

export function generateStaticParams() {
  return data.entries.map((episode) => ({ id: episode.video_id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const episodeId = decodeEpisodeId(id);
  const episode = data.entries.find((entry) => entry.video_id === episodeId);
  return {
    title: episode ? `${episode.title} · wtf os` : "episode · wtf os",
  };
}

export default async function PublicEpisodePage({ params }: PageProps) {
  const { id } = await params;
  const episodeId = decodeEpisodeId(id);
  const episode = data.entries.find((entry) => entry.video_id === episodeId);
  if (!episode) notFound();

  const variant = publicUiVariant();
  if (variant !== "migrated") notFound();

  return <EpisodeDetailPage episode={episode} ideas={ideasForEpisode(episode.video_id)} />;
}

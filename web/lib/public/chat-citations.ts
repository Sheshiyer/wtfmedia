import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";

const PUBLIC_EPISODE_ID = /^[A-Za-z0-9_-]{11}$/;

type CitationSource = Pick<PublicSourceCitation, "episodeId" | "videoId">;

export function publicEpisodeHref(source: CitationSource | undefined): string | null {
  const id = source?.episodeId ?? source?.videoId;
  return id && PUBLIC_EPISODE_ID.test(id)
    ? `/episodes/${encodeURIComponent(id)}`
    : null;
}

/**
 * Convert numeric Ask WTF citations into safe Markdown links.
 *
 * The source array is the server-owned citation order, so [1,2] becomes two
 * links to the corresponding episode workspaces. Unknown bracketed text and
 * citations without a public episode key remain plain text.
 */
export function toCitedMarkdown(
  content: string,
  sources: readonly CitationSource[],
): string {
  return content.replace(/\[((?:\d+\s*,\s*)*\d+)\]/g, (whole, group: string) => {
    const references = group.split(",").map((value) => Number(value.trim()));
    const rendered = references.map((reference) => {
      const href = Number.isSafeInteger(reference) && reference > 0
        ? publicEpisodeHref(sources[reference - 1])
        : null;
      return href ? `[${reference}](${href})` : `[${reference}]`;
    });
    return rendered.some((part, index) => part !== `[${references[index]}]`)
      ? rendered.join(", ")
      : whole;
  });
}

import {
  buildVectorQueryOptions,
  type SourceMode,
  type StoredSourceMode,
  type VectorMatchLike,
} from "./source-mode.ts";
import {
  resolveCatalogueEpisodeId,
  type CatalogueEpisodeDbLike,
} from "./catalogue-episode-anchor.ts";

type VectorIndexLike<T extends VectorMatchLike> = {
  query(
    vector: readonly number[] | Float32Array | Float64Array,
    options: ReturnType<typeof buildVectorQueryOptions>,
  ): Promise<{ matches?: T[] }>;
};

function queryModes(requested: SourceMode): StoredSourceMode[] {
  if (requested === "published") return ["published"];
  if (requested === "uncut") return ["uncut", "published"];
  return ["published", "uncut"];
}

/**
 * Query each evidence corpus before top-K selection. The caller supplies one
 * embedding and the same value is reused for every enabled source skill.
 */
export async function queryEvidenceSources<T extends VectorMatchLike>(
  index: VectorIndexLike<T>,
  vector: readonly number[] | Float32Array | Float64Array,
  requested: SourceMode,
  episodeId: string | null,
): Promise<T[]> {
  const resultSets = await Promise.all(queryModes(requested).map(async (mode) => {
    const result = await index.query(vector, buildVectorQueryOptions(episodeId, mode));
    return Array.isArray(result?.matches) ? result.matches : [];
  }));
  return resultSets.flat();
}

/** Resolve a catalogue episode before issuing any top-K vector query. */
export async function queryEvidenceSourcesForQuestion<T extends VectorMatchLike>(
  db: CatalogueEpisodeDbLike,
  index: VectorIndexLike<T>,
  vector: readonly number[] | Float32Array | Float64Array,
  question: string,
  requested: SourceMode,
  explicitEpisodeId: string | null,
): Promise<{ matches: T[]; episodeId: string | null; catalogueAnchored: boolean }> {
  const catalogueEpisodeId = explicitEpisodeId == null
    ? await resolveCatalogueEpisodeId(db, question)
    : null;
  const episodeId = explicitEpisodeId ?? catalogueEpisodeId;
  return {
    matches: await queryEvidenceSources(index, vector, requested, episodeId),
    episodeId,
    catalogueAnchored: explicitEpisodeId == null && catalogueEpisodeId != null,
  };
}

type CatalogueEpisodeRow = {
  title?: unknown;
  video_id?: unknown;
};

export type CatalogueEpisodeDbLike = {
  prepare(query: string): {
    all<T = CatalogueEpisodeRow>(): Promise<{ results?: T[] }>;
  };
};

const TOKEN = /[a-z0-9]+/g;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function words(value: unknown): string[] {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .match(TOKEN) ?? [];
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let differences = 0;
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return differences + (left.length - leftIndex) + (right.length - rightIndex) <= 1;
}

function containsFuzzyBigram(titleWords: readonly string[], left: string, right: string): boolean {
  for (let index = 0; index < titleWords.length - 1; index += 1) {
    if (
      editDistanceAtMostOne(left, titleWords[index])
      && editDistanceAtMostOne(right, titleWords[index + 1])
    ) return true;
  }
  return false;
}

/**
 * Resolve only a unique, catalogue-distinctive adjacent phrase. Common host
 * names such as Nikhil Kamath cannot silently collapse a broad question onto
 * an arbitrary episode.
 */
export async function resolveCatalogueEpisodeId(
  db: CatalogueEpisodeDbLike,
  question: string,
): Promise<string | null> {
  const result = await db.prepare(`
    SELECT e.title, external.external_id AS video_id
    FROM episodes AS e
    JOIN episode_external_identities AS external ON external.episode_id = e.id
    WHERE e.production_status = 'published'
      AND external.platform = 'youtube'
      AND external.is_primary = 1
    ORDER BY e.id ASC
    LIMIT 100
  `).all<CatalogueEpisodeRow>();
  const episodes = (Array.isArray(result?.results) ? result.results : [])
    .map((row) => ({
      titleWords: words(row.title),
      videoId: typeof row.video_id === "string" ? row.video_id.trim() : "",
    }))
    .filter((row) => YOUTUBE_VIDEO_ID.test(row.videoId) && row.titleWords.length >= 2);
  if (episodes.length === 0) return null;

  const questionWords = words(question);
  const scores = new Map<string, number>();
  for (let index = 0; index < questionWords.length - 1; index += 1) {
    const left = questionWords[index];
    const right = questionWords[index + 1];
    if (left.length < 3 || right.length < 3) continue;
    const matchingVideos = new Set(episodes
      .filter((episode) => containsFuzzyBigram(episode.titleWords, left, right))
      .map((episode) => episode.videoId));
    if (matchingVideos.size !== 1) continue;
    const [videoId] = matchingVideos;
    scores.set(videoId, (scores.get(videoId) ?? 0) + 1);
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  if (ranked.length === 0 || (ranked[1] && ranked[1][1] === ranked[0][1])) return null;
  return ranked[0][0];
}

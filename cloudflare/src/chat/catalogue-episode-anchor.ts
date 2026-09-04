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
const CONNECTOR_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "between", "by",
  "did", "do", "does", "for", "from", "had", "has", "have", "how", "in",
  "into", "is", "it", "of", "on", "or", "the", "to", "was", "were",
  "what", "when", "where", "which", "who", "with",
]);
const WORD_EQUIVALENTS = new Map([
  ["suniel", "sunil"],
]);
const EPISODE_ALIASES = [
  {
    videoId: "LcWoP6KtZKw",
    phrases: [
      ["bangalore", "cops"],
      ["bangalore", "police"],
      ["bengaluru", "cops"],
      ["bengaluru", "police"],
    ],
  },
] as const;

function canonicalWord(value: string): string {
  return WORD_EQUIVALENTS.get(value) ?? value;
}

function words(value: unknown): string[] {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .match(TOKEN)?.map(canonicalWord) ?? [];
}

function containsBigram(titleWords: readonly string[], left: string, right: string): boolean {
  for (let index = 0; index < titleWords.length - 1; index += 1) {
    if (left === titleWords[index] && right === titleWords[index + 1]) return true;
  }
  return false;
}

function containsPhrase(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((word, offset) => word === haystack[index + offset])) return true;
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
    if (CONNECTOR_WORDS.has(left) || CONNECTOR_WORDS.has(right)) continue;
    const matchingVideos = new Set(episodes
      .filter((episode) => containsBigram(episode.titleWords, left, right))
      .map((episode) => episode.videoId));
    if (matchingVideos.size !== 1) continue;
    const [videoId] = matchingVideos;
    scores.set(videoId, (scores.get(videoId) ?? 0) + 1);
  }

  const availableVideos = new Set(episodes.map((episode) => episode.videoId));
  const aliasTargets = new Set(EPISODE_ALIASES
    .filter((entry) => availableVideos.has(entry.videoId))
    .filter((entry) => entry.phrases.some((phrase) => containsPhrase(questionWords, phrase)))
    .map((entry) => entry.videoId));
  if (aliasTargets.size > 1) return null;
  if (aliasTargets.size === 1) {
    const [aliasTarget] = aliasTargets;
    if ([...scores.keys()].some((videoId) => videoId !== aliasTarget)) return null;
    return aliasTarget;
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  if (ranked.length === 0 || (ranked[1] && ranked[1][1] === ranked[0][1])) return null;
  return ranked[0][0];
}

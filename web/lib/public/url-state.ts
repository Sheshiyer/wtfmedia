"use client";

/**
 * Typed URL-state helpers for public routes.
 *
 * Selection is stored as `?episode=<public-video-id>` on `/episodes`.
 * Unrelated query parameters are preserved.
 *
 * History semantics:
 * - In-page open: push (user can Back to close)
 * - Direct load with ?episode=: replace (closing does not create a new entry)
 */

const EPISODE_PARAM = "episode";

/**
 * Read the selected episode video ID from the current URL.
 * Returns `null` when no episode is selected.
 */
export function readEpisodeParam(
  searchParams: string | URLSearchParams,
): string | null {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams;
  const value = params.get(EPISODE_PARAM);
  return value && value.trim() ? value.trim() : null;
}

/**
 * Build a new search string with the episode parameter set or removed.
 * All other parameters are preserved.
 */
export function buildEpisodeSearch(
  currentSearch: string | URLSearchParams,
  videoId: string | null,
): string {
  const params =
    typeof currentSearch === "string"
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams(currentSearch.toString());

  if (videoId) {
    params.set(EPISODE_PARAM, videoId);
  } else {
    params.delete(EPISODE_PARAM);
  }

  const result = params.toString();
  return result ? `?${result}` : "";
}

/**
 * Push a new history entry with the episode selected.
 * Use for in-page open (Back will close the drawer).
 */
export function pushEpisode(videoId: string): void {
  const search = buildEpisodeSearch(window.location.search, videoId);
  window.history.pushState(null, "", `${window.location.pathname}${search}`);
}

/**
 * Replace the current history entry to remove the episode.
 * Use for drawer close (no new history entry).
 */
export function replaceClearEpisode(): void {
  const search = buildEpisodeSearch(window.location.search, null);
  window.history.replaceState(null, "", `${window.location.pathname}${search}`);
}

/**
 * Replace the current history entry with an episode selected.
 * Use on initial mount when the URL already has ?episode= (direct load).
 */
export function replaceEpisode(videoId: string): void {
  const search = buildEpisodeSearch(window.location.search, videoId);
  window.history.replaceState(null, "", `${window.location.pathname}${search}`);
}

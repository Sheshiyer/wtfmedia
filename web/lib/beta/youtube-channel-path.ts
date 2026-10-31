/** Only canonical YouTube channel pages belong to the analytics destination. */
export function isYouTubeAnalyticsChannelPath(pathname: string): boolean {
  return /^\/beta\/analytics\/channels\/UC[A-Za-z0-9_-]{22}$/u.test(pathname);
}

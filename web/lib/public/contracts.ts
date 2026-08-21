/**
 * Public projection contracts for Phase 1.
 *
 * These types/constants describe what the current, already-shipped public
 * surfaces expose. They freeze the existing shape as a proof baseline; they
 * do not introduce new server secrets, new fields, or new behavior.
 */

export type PublicChatSource = {
  n: number;
  video_id: string;
  title: string;
  score: number;
  t: number | null;
  time: string;
  url: string;
};

export const PUBLIC_CHAT_SOURCE_FIELDS = ["n", "video_id", "title", "score", "t", "time", "url"] as const;

export const PROTECTED_PUBLIC_ROUTES = ["/", "/episodes", "/connections", "/chat", "/api/chat"] as const;

export const CHAT_QUERY_AUTOSUBMIT_EXAMPLES = [
  "/chat?q=What%20did%20they%20say%20about%20founders%3F",
  "/chat?q=Summarize%20the%20episode",
] as const;

export const PUBLIC_EPISODES_PAYLOAD_FIELDS = [
  "source_url",
  "channel_slug",
  "channel_title",
  "channel_id",
  "uploader",
  "entry_count",
  "entries",
] as const;

export const PUBLIC_EPISODE_FIELDS = [
  "video_id",
  "title",
  "url",
  "duration",
  "view_count",
  "uploader",
  "channel_id",
  "live_status",
  "playlist_id",
  "playlist_title",
  "manually_added",
] as const;

export const PUBLIC_CONNECTIONS_DATA_FIELDS = [
  "threshold",
  "emergingMin",
  "totalEpisodes",
  "categories",
  "established",
  "emerging",
  "edges",
  "overlaps",
  "titles",
] as const;

export const PUBLIC_CONNECTION_NODE_FIELDS = ["id", "label", "category", "episodes", "episodeCount", "mentions"] as const;

export const PUBLIC_CONNECTION_EDGE_FIELDS = ["a", "b", "shared", "episodes"] as const;

export const PUBLIC_CONNECTION_OVERLAP_FIELDS = ["a", "b", "shared"] as const;

/**
 * Forbidden operator/private vocabulary (ISC-119..127, 01-05-PLAN task 2).
 * A field NAME in this list must never appear in a public-facing payload,
 * regardless of value.
 */
export const FORBIDDEN_PUBLIC_FIELDS = [
  "tasks",
  "owners",
  "leads",
  "budgets",
  "briefs",
  "health",
  "production",
  "permissions",
  "credentials",
  "credential",
  "secret",
  "secrets",
  "token",
  "apiKey",
  "api_key",
  "password",
  "sessionId",
  "session_id",
  "internalNotes",
  "dossier",
  "ownerEmail",
  "assignee",
  "assignees",
  "guests",
  "guestLeads",
  "meetingNotes",
  "driveLink",
  "calendarInvite",
  "prompt",
  "systemPrompt",
  "rawPayload",
  "internalId",
] as const;

const FORBIDDEN_FIELD_SET = new Set<string>(FORBIDDEN_PUBLIC_FIELDS as readonly string[]);

/**
 * Returns the keys present on `value` (shallow) that are absent from
 * `allowed`. Used to prove a payload exposes only its documented field set.
 */
export function findDisallowedFields(value: Record<string, unknown>, allowed: readonly string[]): string[] {
  const allowedSet = new Set<string>(allowed);
  return Object.keys(value).filter((key) => !allowedSet.has(key));
}

/**
 * Recursively walks `value` and reports every path whose key matches the
 * forbidden operator/private vocabulary. Reports named leak classes only;
 * this is not a general-purpose secret scanner.
 */
export function findForbiddenFields(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenFields(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const hits: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (FORBIDDEN_FIELD_SET.has(key)) hits.push(childPath);
      hits.push(...findForbiddenFields(child, childPath));
    }
    return hits;
  }
  return [];
}

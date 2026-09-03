export const AUTHENTICATED_CHAT_RELEASE_ENDPOINT =
  "/ops/api/release/authenticated-chat";

export const authenticatedChatReleaseStates = [
  "paused",
  "preview",
  "stable",
  "rolled_back",
] as const;
export const authenticatedChatReleaseTracks = ["alpha", "beta"] as const;

export type AuthenticatedChatReleaseState =
  (typeof authenticatedChatReleaseStates)[number];
export type AuthenticatedChatReleaseTrack =
  (typeof authenticatedChatReleaseTracks)[number];
export type ReleaseEnvironment = "local" | "staging" | "production";
export type ReleaseControlRole = "super_admin" | "admin" | "editor" | "public_link";

export type AuthenticatedChatRelease = {
  state: AuthenticatedChatReleaseState;
  track: AuthenticatedChatReleaseTrack;
  environment?: ReleaseEnvironment;
  updatedAt?: string;
};

export type ReleaseControlAccess = "mutate" | "read-only" | "unavailable";
export type ReleaseRequestErrorKind =
  | "permission"
  | "unavailable"
  | "invalid"
  | "server";

export class ReleaseRequestError extends Error {
  readonly kind: ReleaseRequestErrorKind;
  readonly status: number;

  constructor(kind: ReleaseRequestErrorKind, status: number) {
    super(`authenticated_chat_release_${kind}`);
    this.name = "ReleaseRequestError";
    this.kind = kind;
    this.status = status;
  }
}

function isReleaseState(value: unknown): value is AuthenticatedChatReleaseState {
  return (
    typeof value === "string" &&
    (authenticatedChatReleaseStates as readonly string[]).includes(value)
  );
}

function isReleaseEnvironment(value: unknown): value is ReleaseEnvironment {
  return value === "local" || value === "staging" || value === "production";
}

function isReleaseTrack(value: unknown): value is AuthenticatedChatReleaseTrack {
  return (
    typeof value === "string" &&
    (authenticatedChatReleaseTracks as readonly string[]).includes(value)
  );
}

/**
 * Parse the small server DTO without allowing an arbitrary response to become
 * a rollout decision. The nested `release` form is accepted for compatibility
 * with an envelope that may also carry audit metadata.
 */
export function parseAuthenticatedChatRelease(
  value: unknown,
): AuthenticatedChatRelease | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const envelope = value as Record<string, unknown>;
  const candidate =
    envelope.release && typeof envelope.release === "object" && !Array.isArray(envelope.release)
      ? envelope.release as Record<string, unknown>
      : envelope;
  const state = candidate.state ?? candidate.status;
  if (!isReleaseState(state)) return null;

  const environment = candidate.environment;
  if (environment !== undefined && !isReleaseEnvironment(environment)) return null;

  const updatedAt = candidate.updatedAt ?? candidate.updated_at;
  if (updatedAt !== undefined && typeof updatedAt !== "string") return null;

  const track = candidate.track ?? candidate.releaseTrack ?? candidate.release_track ?? "alpha";
  if (!isReleaseTrack(track)) return null;

  return {
    state,
    track,
    ...(environment === undefined ? {} : { environment }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
  };
}

export function releaseControlAccess(
  environment: ReleaseEnvironment,
  role: ReleaseControlRole,
): ReleaseControlAccess {
  if (environment !== "local" && environment !== "staging") return "unavailable";
  if (role === "super_admin") return "mutate";
  if (role === "admin" || role === "editor") return "read-only";
  return "unavailable";
}

function requestError(status: number): ReleaseRequestError {
  if (status === 401 || status === 403) {
    return new ReleaseRequestError("permission", status);
  }
  if (status === 404 || status === 405 || status === 501 || status === 503) {
    return new ReleaseRequestError("unavailable", status);
  }
  return new ReleaseRequestError(status >= 500 ? "server" : "invalid", status);
}

async function readReleaseResponse(response: Response): Promise<AuthenticatedChatRelease> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The status below remains the authoritative error when the server did not
    // return JSON. A successful non-JSON response is an invalid DTO.
  }

  if (!response.ok) throw requestError(response.status);
  const release = parseAuthenticatedChatRelease(body);
  if (!release) throw new ReleaseRequestError("invalid", response.status);
  return release;
}

export async function getAuthenticatedChatRelease(): Promise<AuthenticatedChatRelease> {
  const response = await fetch(AUTHENTICATED_CHAT_RELEASE_ENDPOINT, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  return readReleaseResponse(response);
}

async function postAuthenticatedChatRelease(
  body: Record<string, AuthenticatedChatReleaseState | AuthenticatedChatReleaseTrack>,
): Promise<AuthenticatedChatRelease> {
  const response = await fetch(AUTHENTICATED_CHAT_RELEASE_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readReleaseResponse(response);
}

export async function setAuthenticatedChatRelease(
  state: AuthenticatedChatReleaseState,
): Promise<AuthenticatedChatRelease> {
  return postAuthenticatedChatRelease({ state });
}

export async function setAuthenticatedChatReleaseTrack(
  track: AuthenticatedChatReleaseTrack,
): Promise<AuthenticatedChatRelease> {
  return postAuthenticatedChatRelease({ track });
}

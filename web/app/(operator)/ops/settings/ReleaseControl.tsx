"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { accessLoginUrl } from "@/lib/ops/access-url";
import {
  authenticatedChatReleaseStates,
  authenticatedChatReleaseTracks,
  getAuthenticatedChatRelease,
  releaseControlAccess,
  ReleaseRequestError,
  setAuthenticatedChatRelease,
  setAuthenticatedChatReleaseTrack,
  type AuthenticatedChatRelease,
  type AuthenticatedChatReleaseState,
  type AuthenticatedChatReleaseTrack,
} from "@/lib/ops/release";

type ReleaseViewState = "loading" | "ready" | "saving" | "error" | "permission" | "unavailable";

const stateLabels: Record<AuthenticatedChatReleaseState, string> = {
  paused: "paused",
  preview: "preview",
  stable: "stable",
  rolled_back: "rolled back",
};
const trackLabels: Record<AuthenticatedChatReleaseTrack, string> = {
  alpha: "alpha · public baseline",
  beta: "beta · authenticated Ask WTF",
};

function requestMessage(error: unknown): string {
  if (error instanceof ReleaseRequestError) {
    if (error.kind === "permission") {
      return "the server denied release-control access for this operator.";
    }
    if (error.kind === "unavailable") {
      return "the server release-control endpoint is not active in this environment.";
    }
    if (error.kind === "invalid") {
      return "the server returned an invalid release state.";
    }
  }
  return "the release state could not be read. retry without changing public chat.";
}

function releaseStateLabel(state: AuthenticatedChatReleaseState): string {
  return stateLabels[state];
}

function releaseTrackLabel(track: AuthenticatedChatReleaseTrack): string {
  return trackLabels[track];
}

function clearReleaseTrackIntent() {
  const url = new URL(window.location.href);
  url.searchParams.delete("releaseTrack");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function StateBadge({ release }: { release: AuthenticatedChatRelease }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-release-state={release.state} data-release-track={release.track}>
      <div className="border-2 border-foreground bg-canvas p-4">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          server release state
        </p>
        <p className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">
          {releaseStateLabel(release.state)}
        </p>
      </div>
      <div className="border-2 border-foreground bg-canvas p-4">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          selected release track
        </p>
        <p className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">
          {releaseTrackLabel(release.track)}
        </p>
      </div>
      <div className="border-2 border-foreground bg-canvas p-4">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          server environment
        </p>
        <p className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">
          {release.environment ?? "not returned"}
        </p>
      </div>
    </div>
  );
}

export function ReleaseControl() {
  const context = useOperatorContext();
  const access = releaseControlAccess(context.environment, context.role);
  const [viewState, setViewState] = useState<ReleaseViewState>(
    context.role === "public_link" ? "permission" : "loading",
  );
  const [release, setRelease] = useState<AuthenticatedChatRelease | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingState, setPendingState] = useState<AuthenticatedChatReleaseState | null>(null);
  const [pendingTrack, setPendingTrack] = useState<AuthenticatedChatReleaseTrack | null>(null);
  const autoAppliedTrack = useRef(false);

  const load = useCallback(async () => {
    if (context.role === "public_link") {
      setViewState("permission");
      return;
    }
    setViewState("loading");
    setError("");
    try {
      const current = await getAuthenticatedChatRelease();
      setRelease(current);
      setViewState("ready");
    } catch (requestFailure) {
      setError(requestMessage(requestFailure));
      setViewState(
        requestFailure instanceof ReleaseRequestError && requestFailure.kind === "permission"
          ? "permission"
          : requestFailure instanceof ReleaseRequestError && requestFailure.kind === "unavailable"
            ? "unavailable"
            : "error",
      );
    }
  }, [context.role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeState(nextState: AuthenticatedChatReleaseState) {
    if (access !== "mutate" || pendingState || pendingTrack || release?.state === nextState) return;
    setPendingState(nextState);
    setViewState("saving");
    setError("");
    setNotice("");
    try {
      const updated = await setAuthenticatedChatRelease(nextState);
      setRelease(updated);
      setViewState("ready");
      setNotice(`server release state is now ${releaseStateLabel(updated.state)}.`);
    } catch (requestFailure) {
      setError(requestMessage(requestFailure));
      setViewState(
        requestFailure instanceof ReleaseRequestError && requestFailure.kind === "permission"
          ? "permission"
          : requestFailure instanceof ReleaseRequestError && requestFailure.kind === "unavailable"
            ? "unavailable"
            : "error",
      );
    } finally {
      setPendingState(null);
    }
  }

  const changeTrack = useCallback(async (nextTrack: AuthenticatedChatReleaseTrack) => {
    if (access !== "mutate" || pendingState || pendingTrack || release?.track === nextTrack) return;
    setPendingTrack(nextTrack);
    setViewState("saving");
    setError("");
    setNotice("");
    try {
      const updated = await setAuthenticatedChatReleaseTrack(nextTrack);
      setRelease(updated);
      setViewState("ready");
      setNotice(`server release track is now ${releaseTrackLabel(updated.track)}.`);
      if (typeof window !== "undefined" && new URL(window.location.href).searchParams.get("releaseTrack") === nextTrack) {
        clearReleaseTrackIntent();
      }
    } catch (requestFailure) {
      setError(requestMessage(requestFailure));
      setViewState(
        requestFailure instanceof ReleaseRequestError && requestFailure.kind === "permission"
          ? "permission"
          : requestFailure instanceof ReleaseRequestError && requestFailure.kind === "unavailable"
            ? "unavailable"
            : "error",
      );
    } finally {
      setPendingTrack(null);
    }
  }, [access, pendingState, pendingTrack, release?.track]);

  useEffect(() => {
    if (autoAppliedTrack.current || access !== "mutate" || !release || typeof window === "undefined") return;
    if (new URL(window.location.href).searchParams.get("releaseTrack") !== "beta") return;
    autoAppliedTrack.current = true;
    if (release.track === "beta") {
      clearReleaseTrackIntent();
      return;
    }
    void changeTrack("beta");
  }, [access, changeTrack, release]);

  const stateDescription =
    access === "mutate"
      ? "choose a staging or local release state. the server validates and records every transition."
      : access === "read-only"
        ? "your role can inspect the server state but cannot change the release."
        : context.environment === "production"
          ? "release controls are unavailable in production; this surface never changes public chat."
          : "release controls require a verified operator context.";

  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="authenticated-chat-release-title"
      data-release-control
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            staging / local control plane
          </p>
          <h2 id="authenticated-chat-release-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            authenticated chat release
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            {stateDescription} browser state, URLs, and environment flags are never rollout authority.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-foreground/40 bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
          server governed
        </span>
      </div>

      <div className="mt-5" aria-live="polite" aria-atomic="true">
        {viewState === "loading" && (
          <p role="status" className="border-2 border-foreground/20 bg-surface-subtle p-4 font-label text-sm text-secondary">
            loading server release state…
          </p>
        )}
        {viewState === "saving" && (
          <p role="status" className="border-2 border-information bg-information/10 p-4 font-label text-sm text-secondary">
            saving {pendingTrack ? releaseTrackLabel(pendingTrack) : pendingState ? releaseStateLabel(pendingState) : "release"} to the server…
          </p>
        )}
        {viewState === "permission" && (
          <p role="status" data-release-permission className="border-2 border-foreground/40 bg-surface-subtle p-4 text-sm leading-relaxed text-secondary">
            {error || "release state is unavailable without verified operator permission."}
          </p>
        )}
        {viewState === "unavailable" && (
          <p role="status" data-release-unavailable className="border-2 border-foreground/40 bg-surface-subtle p-4 text-sm leading-relaxed text-secondary">
            {error || "server release control is unavailable."}
          </p>
        )}
        {viewState === "error" && (
          <p role="alert" data-release-error className="border-2 border-attention bg-attention/10 p-4 text-sm leading-relaxed text-foreground">
            {error}
          </p>
        )}
      </div>

      {context.role === "public_link" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" data-release-public-gate>
          <div className="border-2 border-foreground bg-canvas p-4" data-release-track="alpha">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              current public version
            </p>
            <p className="mt-2 font-heading text-2xl font-bold lowercase text-foreground">
              alpha · public baseline
            </p>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              beta adds authenticated sessions, account history, memory boundaries, and RAG metadata.
            </p>
          </div>
          <Button
            type="button"
            variant="attention"
            onClick={() => window.location.assign(accessLoginUrl())}
            data-release-beta-login
          >
            sign in for beta
          </Button>
        </div>
      )}

      {release && (
        <div className="mt-5 space-y-5">
          <StateBadge release={release} />
          {access === "mutate" && (
            <div className="space-y-5">
              <fieldset disabled={viewState === "saving"} aria-describedby="release-track-help">
                <legend className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  release version
                </legend>
                <div className="mt-3 max-w-xl">
                  <label htmlFor="release-track-select" className="sr-only">
                    select release version
                  </label>
                  <select
                    id="release-track-select"
                    value={release.track}
                    disabled={viewState === "saving"}
                    onChange={(event) => void changeTrack(event.target.value as AuthenticatedChatReleaseTrack)}
                    className="min-h-11 w-full rounded-[var(--wtf-radius-control)] border-2 border-foreground bg-surface-raised px-3 py-2 font-label text-sm font-bold lowercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    data-release-track-controls
                    data-release-track-select
                  >
                    {authenticatedChatReleaseTracks.map((track) => (
                      <option key={track} value={track} data-release-track-option={track}>
                        {releaseTrackLabel(track)}
                      </option>
                    ))}
                  </select>
                  {pendingTrack && (
                    <p className="mt-2 text-xs text-secondary" role="status">
                      saving {releaseTrackLabel(pendingTrack)} to the server…
                    </p>
                  )}
                </div>
                <p id="release-track-help" className="mt-3 text-xs leading-relaxed text-secondary">
                  alpha is the public baseline. beta selects the authenticated Ask WTF work. The server records this choice; it does not delete history, alter public /chat or /api/chat, or change lifecycle state.
                </p>
              </fieldset>
              <fieldset disabled={viewState === "saving"} aria-describedby="release-control-help">
                <legend className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  set server release state
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {authenticatedChatReleaseStates.map((state) => (
                    <Button
                      key={state}
                      type="button"
                      variant={release.state === state ? "attention" : "secondary"}
                      pressed={release.state === state}
                      loading={pendingState === state}
                      onClick={() => void changeState(state)}
                      className="justify-start lowercase"
                    >
                      {releaseStateLabel(state)}
                    </Button>
                  ))}
                </div>
                <p id="release-control-help" className="mt-3 text-xs leading-relaxed text-secondary">
                  paused and rolled back are safe server-side stops. preview and stable remain staging/local projections until separately approved.
                </p>
              </fieldset>
            </div>
          )}
          {access === "read-only" && (
            <p className="border-l-4 border-information bg-canvas px-3 py-2 text-xs leading-relaxed text-secondary">
              read-only for {context.role}; ask a super admin to change this server track or release state.
            </p>
          )}
          {access === "unavailable" && context.environment === "production" && (
            <p className="border-l-4 border-attention bg-canvas px-3 py-2 text-xs leading-relaxed text-secondary">
              controls are intentionally unavailable outside local/staging.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {context.role !== "public_link" && (
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={viewState === "loading" || viewState === "saving"}>
            refresh server state
          </Button>
        )}
        <span className="sr-only" role="status">{notice}</span>
      </div>
    </section>
  );
}

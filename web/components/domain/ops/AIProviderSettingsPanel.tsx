"use client";

import { useMemo, useState } from "react";
import {
  modelForId,
  OPENROUTER_LOCAL_POLICY,
  OPENROUTER_MODEL_OPTIONS,
  type IntegrationConnectionState,
  type OperatorSettingsRole,
} from "@/lib/ops/integration-contract";

const control =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-55";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";
const command =
  "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-attention px-4 py-2 font-label text-xs font-bold lowercase text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";

function statusLabel(state: IntegrationConnectionState) {
  return {
    not_configured: "not configured",
    verifying: "verifying",
    connected: "connected",
    degraded: "degraded",
    revoked: "revoked",
    unavailable: "unavailable",
  }[state];
}

function StatusBadge({ state }: { state: IntegrationConnectionState }) {
  const connected = state === "connected";
  return (
    <span
      className={`shrink-0 rounded-control border-2 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${
        connected
          ? "border-live bg-canvas text-foreground"
          : "border-foreground/40 bg-surface-subtle text-secondary"
      }`}
    >
      {statusLabel(state)} · local fixture
    </span>
  );
}

export function AIProviderSettingsPanel({ role, previewOnly = false }: { role: OperatorSettingsRole; previewOnly?: boolean }) {
  const canManage = !previewOnly && (role === "admin" || role === "super_admin");
  const [primaryModel, setPrimaryModel] = useState(OPENROUTER_LOCAL_POLICY.primaryModel);
  const [fallbacks, setFallbacks] = useState<string[]>([
    ...OPENROUTER_LOCAL_POLICY.fallbacks,
  ]);
  const [keyDraft, setKeyDraft] = useState("");
  const [connection, setConnection] = useState<IntegrationConnectionState>(
    OPENROUTER_LOCAL_POLICY.connection,
  );
  const [notice, setNotice] = useState("local fixture receipt · provider call held");
  const [saving, setSaving] = useState(false);

  const availableFallbacks = useMemo(
    () =>
      OPENROUTER_MODEL_OPTIONS.filter(
        (model) => model.id !== primaryModel && !fallbacks.includes(model.id),
      ),
    [fallbacks, primaryModel],
  );

  const addFallback = () => {
    const next = availableFallbacks[0];
    if (next) setFallbacks((current) => [...current, next.id]);
  };

  const moveFallback = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fallbacks.length) return;
    setFallbacks((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFallback = (id: string) =>
    setFallbacks((current) => current.filter((value) => value !== id));

  const savePolicy = () => {
    if (!canManage) return;
    setSaving(true);
    setConnection("verifying");
    setNotice("saving local policy draft · no provider request made");
    window.setTimeout(() => {
      setSaving(false);
      setConnection("connected");
      setKeyDraft("");
      setNotice("saved locally · KV projection would contain policy and redacted health only");
    }, 350);
  };

  const testConnection = () => {
    if (!canManage) return;
    setConnection("verifying");
    setNotice("testing local fixture · live OpenRouter verification is held");
    window.setTimeout(() => {
      setConnection("connected");
      setNotice("local fixture connected · no provider response was loaded");
    }, 350);
  };

  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="ai-provider-settings-title"
      id="ai-provider-settings"
      data-ai-provider-settings
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            provider policy
          </p>
          <h2
            id="ai-provider-settings-title"
            className="mt-1 font-heading text-2xl font-bold lowercase"
          >
            AI route settings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            One global answer route with an explicit fallback order. This screen is a local, non-persisted preview and never changes provider or inference state.
          </p>
        </div>
        <StatusBadge state={connection} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <label className="grid gap-1">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              global primary model
            </span>
            <select
              value={primaryModel}
              onChange={(event) => setPrimaryModel(event.target.value)}
              disabled={!canManage}
              className={control}
            >
              {OPENROUTER_MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} · {model.provider} · {model.lane}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">{modelForId(primaryModel)?.id} · allowlisted UI fixture</span>
          </label>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                  fallback order
                </p>
                <p className="mt-1 text-xs text-secondary">
                  The first available route wins. Duplicates are prevented.
                </p>
              </div>
              {!previewOnly ? <button
                type="button"
                className={button}
                onClick={addFallback}
                disabled={!canManage || !availableFallbacks.length}
              >
                add fallback
              </button> : null}
            </div>
            <ol className="mt-3 grid gap-2" aria-label="OpenRouter fallback order">
              {fallbacks.map((id, index) => {
                const model = modelForId(id);
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-2 border-2 border-foreground bg-canvas p-3"
                  >
                    <span className="inline-flex h-7 min-w-7 items-center justify-center border-2 border-foreground font-label text-xs font-bold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="mr-auto min-w-[12rem]">
                      <span className="block font-body text-sm font-semibold">
                        {model?.label ?? "unknown model"}
                      </span>
                      <span className="block text-xs text-muted">
                        {model?.provider ?? id} · {id}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={button}
                      aria-label={`move fallback ${index + 1} up`}
                      onClick={() => moveFallback(index, -1)}
                      disabled={!canManage || index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={button}
                      aria-label={`move fallback ${index + 1} down`}
                      onClick={() => moveFallback(index, 1)}
                      disabled={!canManage || index === fallbacks.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={button}
                      onClick={() => removeFallback(id)}
                      disabled={!canManage}
                    >
                      remove
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-foreground bg-canvas p-4">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              credential handoff
            </p>
            {!previewOnly ? <label className="mt-3 grid gap-1">
              <span className="font-label text-xs font-bold uppercase tracking-[0.08em] text-secondary">
                OpenRouter API key · write-only
              </span>
              <input
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="enter only for an approved local test"
                autoComplete="new-password"
                disabled={!canManage}
                className={control}
              />
            </label> : null}
            <p className="mt-2 text-xs leading-relaxed text-secondary">
              Stored credentials are never rendered back. This local pass clears the field after staging and does not call OpenRouter.
            </p>
          </div>

          <dl className="grid gap-2 border-2 border-foreground bg-canvas p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">provider</dt>
              <dd className="mt-1 font-semibold">OpenRouter</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">KV projection</dt>
              <dd className="mt-1 font-semibold">policy + redacted health</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">audit</dt>
              <dd className="mt-1 font-semibold">required on save</dd>
            </div>
          </dl>
        </div>
      </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
        {!previewOnly ? <button type="button" className={command} onClick={savePolicy} disabled={!canManage || saving}>
          {saving ? "saving…" : "save local policy"}
        </button> : null}
        {!previewOnly ? <button type="button" className={button} onClick={testConnection} disabled={!canManage || connection === "verifying"}>
          test local connection
        </button> : null}
        <span className="text-xs text-secondary" aria-live="polite">{notice}</span>
      </div>
      {previewOnly ? <p className="mt-4 border-l-4 border-information bg-canvas px-4 py-3 text-xs leading-relaxed text-secondary">local preview only · no save or provider request is available.</p> : null}
      {!canManage ? (
        <p className="mt-4 border-l-4 border-information bg-canvas px-4 py-3 text-xs leading-relaxed text-secondary">
          Editor view is read-only. An admin or super-admin must own provider policy changes.
        </p>
      ) : null}
    </section>
  );
}

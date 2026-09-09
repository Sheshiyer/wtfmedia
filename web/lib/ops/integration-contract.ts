export type IntegrationConnectionState =
  | "not_configured"
  | "verifying"
  | "connected"
  | "degraded"
  | "revoked"
  | "unavailable";

export type OperatorSettingsRole = "super_admin" | "admin" | "editor" | "public_link";

export type ModelPolicyOption = {
  id: string;
  label: string;
  provider: string;
  lane: string;
};

/** A bounded UI fixture, not a live provider catalogue or route decision. */
export const OPENROUTER_MODEL_OPTIONS: readonly ModelPolicyOption[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "OpenAI", lane: "fast" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic", lane: "balanced" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", provider: "Google", lane: "fast" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "Meta", lane: "balanced" },
] as const;

export const OPENROUTER_LOCAL_POLICY = {
  primaryModel: "openai/gpt-4o-mini",
  fallbacks: ["anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"],
  connection: "connected" as const,
};

export const YOUTUBE_ANALYTICS_FIXTURE = {
  source: "local fixture",
  channel: "WTF sample channel",
  window: "fixture window · last 28 days",
  refreshed: "not observed",
  metrics: [
    { label: "views", value: "12,480", detail: "sample observation" },
    { label: "watch time", value: "842h", detail: "sample observation" },
    { label: "subscribers", value: "+318", detail: "sample observation" },
    { label: "top episode", value: "sample only", detail: "no provider record" },
  ],
} as const;

export function modelForId(id: string): ModelPolicyOption | undefined {
  return OPENROUTER_MODEL_OPTIONS.find((model) => model.id === id);
}

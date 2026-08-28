// Catalog of NVIDIA NIM chat models offered in the Ask WTF model picker.
// Each is verified to serve via /chat/completions. Latency is a measured probe
// (relative, single short completion); context + modalities from model specs.
// Ranked by three factors: context length, latency, media capability.

export type Modality = "text" | "image" | "audio" | "video" | "pdf";

export type ChatModel = {
  id: string;
  label: string;
  vendor: string;
  context: number; // tokens
  latencyMs: number; // measured probe (lower = faster)
  modalities: Modality[];
  note?: string;
};

// Keep fallbacks explicit and short. The UI may expose any catalog model, but
// an API request must always have a known, text-capable recovery path.
const FAST_FALLBACK_MODEL = "meta/llama-3.1-8b-instruct";
const BALANCED_FALLBACK_MODEL = "meta/llama-3.3-70b-instruct";

export const MODELS: ChatModel[] = [
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    vendor: "Meta",
    context: 128_000,
    latencyMs: 680,
    modalities: ["text"],
    note: "Balanced default",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    label: "Qwen 3.5 122B",
    vendor: "Qwen",
    context: 262_144,
    latencyMs: 430,
    modalities: ["text"],
    note: "Longest context",
  },
  {
    id: "deepseek-ai/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    vendor: "DeepSeek",
    context: 131_072,
    latencyMs: 520,
    modalities: ["text"],
    note: "Strong reasoning",
  },
  {
    id: "deepseek-ai/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    vendor: "DeepSeek",
    context: 131_072,
    latencyMs: 1480,
    modalities: ["text"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl",
    label: "Nemotron Nano 12B VL",
    vendor: "NVIDIA",
    context: 128_000,
    latencyMs: 330,
    modalities: ["text", "image"],
    note: "Reads images",
  },
  {
    id: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    label: "Nemotron Nano VL 8B",
    vendor: "NVIDIA",
    context: 128_000,
    latencyMs: 430,
    modalities: ["text", "image"],
    note: "Fast + image",
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    vendor: "Meta",
    context: 128_000,
    latencyMs: 270,
    modalities: ["text"],
    note: "Fastest",
  },
  {
    id: "nvidia/llama-3.1-nemotron-nano-8b-v1",
    label: "Nemotron Nano 8B",
    vendor: "NVIDIA",
    context: 128_000,
    latencyMs: 280,
    modalities: ["text"],
  },
  {
    id: "mistralai/mistral-medium-3.5-128b",
    label: "Mistral Medium 3.5",
    vendor: "Mistral",
    context: 131_072,
    latencyMs: 15_320,
    modalities: ["text"],
    note: "Cold-start variable",
  },
];

export const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export const isValidModel = (id: string) => MODELS.some((m) => m.id === id);

/**
 * Return the requested model followed by two distinct recovery models.
 * The final 8B model is deliberately small: it is the latency escape hatch
 * when a larger model is unavailable or slow to emit its first token.
 */
export function modelAttempts(requested: string): string[] {
  return [...new Set([requested, BALANCED_FALLBACK_MODEL, FAST_FALLBACK_MODEL])];
}

// modality weights — richer media support scores higher
const MOD_WEIGHT: Record<Modality, number> = {
  text: 1,
  image: 1.5,
  audio: 2,
  video: 2,
  pdf: 1.5,
};
const mediaWeight = (m: ChatModel) =>
  m.modalities.reduce((s, x) => s + MOD_WEIGHT[x], 0);

export type Scored = ChatModel & {
  scores: { context: number; latency: number; media: number; total: number };
  rank: number;
};

// Rank by three factors, each normalized 0..1 within the catalog.
export function rankedModels(
  weights = { context: 0.34, latency: 0.33, media: 0.33 }
): Scored[] {
  const maxCtx = Math.max(...MODELS.map((m) => m.context));
  const minLat = Math.min(...MODELS.map((m) => m.latencyMs));
  const maxMedia = Math.max(...MODELS.map(mediaWeight));

  const scored = MODELS.map((m) => {
    const context = m.context / maxCtx;
    const latency = minLat / m.latencyMs; // fastest = 1
    const media = mediaWeight(m) / maxMedia;
    const total =
      weights.context * context + weights.latency * latency + weights.media * media;
    return { ...m, scores: { context, latency, media, total }, rank: 0 };
  });

  scored.sort((a, b) => b.scores.total - a.scores.total);
  scored.forEach((m, i) => (m.rank = i + 1));
  return scored;
}

// human-readable helpers
export const fmtContext = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
export const fmtLatency = (ms: number) =>
  ms >= 1000 ? `~${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s` : `~${ms}ms`;
export const fmtModalities = (mods: Modality[]) => mods.join(" · ");

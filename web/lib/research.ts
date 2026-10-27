import { validateFigureSlots, type FigureSlot } from "../../shared/research-figures";
import { researchVisualText } from "./research-report";

export type ResearchStatus = "draft" | "queued" | "running" | "completed" | "partial" | "failed" | "cancelled" | "clarification" | "deleting" | "cancel_pending";
export type ResearchSectionKey = "snacks" | "appetizers" | "main" | "desserts";
export const RESEARCH_CHANNELS = ["web", "linkedin", "youtube", "instagram", "reddit", "x"] as const;
export type ResearchChannel = typeof RESEARCH_CHANNELS[number];
export const RESEARCH_TOOLS = ["perplexity.web.search", "exa.web.contents.get", "anyapi.linkedin.search.posts", "youtube.youtube.search.videos", "anyapi.instagram.hashtag.posts", "scrapecreators.reddit.search.posts", "anyapi.x.search.posts"] as const;
export type ResearchInputV2 = { guestName: string; companyName: string; industry: string; audienceCountry: "IN" };
export type ResearchCoverage = { channel: ResearchChannel; status: "pending" | "searching" | "found" | "no_results" | "unavailable" | "failed" | "budget_limited"; sourceCount: number; method: "dedicated_tool" | "web_search" };
export type ResearchModelInfo = { service: "omniroute" | "openrouter" | "anthropic"; requestedModel: string; reportedModel?: string };
export const RESEARCH_BUDGET_PHASES = ["runner", "resolve", "dossier", "channels", "preparation", "extraction", "summaries", "visuals",
  "write_snacks", "write_appetizers", "write_main", "write_desserts",
  "numeric_snacks", "numeric_appetizers", "numeric_main", "numeric_desserts",
  "visual_snacks", "visual_appetizers", "visual_main", "visual_desserts"] as const;
export type ResearchLimit = { kind: "stage_calls" | "job_reservation" | "call_retries" | "provider_cost_overrun";
  phase: typeof RESEARCH_BUDGET_PHASES[number]; used?: number; maximum?: number };
export function researchLimitValid(value: unknown): value is ResearchLimit {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).every(k => ["kind", "phase", "used", "maximum"].includes(k))
    && ["stage_calls", "job_reservation", "call_retries", "provider_cost_overrun"].includes(v.kind as string)
    && (RESEARCH_BUDGET_PHASES as readonly unknown[]).includes(v.phase)
    && [v.used, v.maximum].every(n => n === undefined || typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000);
}
export type ResearchFailure = {
  limit?: ResearchLimit;
  stage: "resolve" | "discovery" | "snacks" | "appetizers" | "main" | "desserts" | "storage" | "runner";
  code: "timeout" | "rate_limit" | "authentication" | "budget_exhausted" | "output_truncated" | "empty_output" | "invalid_output" | "storage_failure" | "provider_unavailable" | "internal_error";
  retryable: boolean;
    reason?: 'http_error' | 'transport_error' | 'connect_timeout' | 'read_timeout' | 'deadline' | 'stream_error' | 'stream_incomplete' | 'stream_invalid' | 'response_too_large' | 'context_limit' | 'no_matching_sources' | 'invalid_json' | 'invalid_schema' | 'output_truncated' | 'empty_output';
    provider?: 'treg' | 'omniroute' | 'openrouter' | 'anthropic' | 'runner';
    operation?: 'catalog' | 'search' | 'social_search' | 'extract' | 'model';
    httpStatus?: number;
};
export type ResearchSection = { key: ResearchSectionKey; title: string; content: string; status: string; failure?: ResearchFailure };
export type ResearchSummary = { id: string; title: string; status: ResearchStatus; updatedAt: string; revision: number; shared: boolean; canEdit?: boolean };
export type ResearchSource = { id: string; title: string; url: string; excerpt: string; publisher?: string; publishedAt?: string; retrievedAt: string; kind?: string; timestampSeconds?: number;
  platform?: ResearchChannel; retrievedVia?: typeof RESEARCH_TOOLS[number]; evidenceType?: "page_extract" | "search_snippet" | "post" | "transcript" | "video_metadata";
};
export type ResearchBrief = ResearchSummary & {
  visualPolicyVersion?: 2; figures?: FigureSlot[];
  notes: string; notesApproved?: boolean; episodeId: string | null; canEdit: boolean; needsResearch?: boolean; skipClarification?: boolean;
  sections: ResearchSection[]; sources: ResearchSource[];
  messages: Array<{ role: string; content: string }>; progress: string[]; warnings: string[];
  clarification: string | null; cost: { toolMicro: number; modelUsd: number | null };
  schemaVersion?: 2; researchInput?: ResearchInputV2; coverage?: ResearchCoverage[]; modelInfo?: ResearchModelInfo; failure?: ResearchFailure;
};
export type ResearchVersion = { revision: number; createdAt: string };
export type ResearchDraft = Pick<ResearchBrief, "revision" | "title" | "notes" | "episodeId" | "shared" | "sections" | "researchInput"> & { notesApproved: boolean };
export const RESEARCH_SECTIONS: ReadonlyArray<{ key: ResearchSectionKey; title: string; description: string }> = [
  { key: "snacks", title: "Guest profile", description: "Snacks" },
  { key: "appetizers", title: "Company and industry", description: "Appetizers" },
  { key: "main", title: "Industry positioning and opportunities", description: "Main course" },
  { key: "desserts", title: "Takeaways and interview preparation", description: "Desserts" },
];
export const RESEARCH_NOTES_LIMIT = 12_000;
export function parseResearchInput(value: unknown): ResearchInputV2 {
  const input = value as Partial<ResearchInputV2> | null;
  const fields = [input?.guestName, input?.companyName, input?.industry];
  if (!input || input.audienceCountry !== "IN" || fields.some(v => v !== undefined && typeof v !== "string")) {
    throw new Error("Enter a guest, company or industry, each between 2 and 120 characters.");
  }
  const normalized = fields.map(v => v?.trim() ?? "");
  if (!normalized.some(Boolean) || normalized.some(v => v.length > 120 || v.length > 0 && v.length < 2)) {
    throw new Error("Enter a guest, company or industry, each between 2 and 120 characters.");
  }
  return { guestName: normalized[0], companyName: normalized[1], industry: normalized[2], audienceCountry: "IN" };
}
export function researchTitle(input: ResearchInputV2): string {
  return [input.guestName, input.companyName, input.industry].filter(Boolean).join(" · ").slice(0, 200).replace(/[\uD800-\uDBFF]$/u, "");
}
export function researchIsRunning(status: ResearchStatus) { return status === "queued" || status === "running"; }
export function researchDraft(brief: ResearchBrief): ResearchDraft {
  const { revision, title, notes, episodeId, shared, sections } = brief;
  return { revision, title, notes, notesApproved: brief.notesApproved === true, episodeId, shared, sections, ...(brief.researchInput ? { researchInput: { ...brief.researchInput } } : {}) };
}
export function researchDraftChanged(draft: ResearchDraft, brief: ResearchBrief): boolean {
  return JSON.stringify(draft) !== JSON.stringify(researchDraft(brief));
}
export function applyResearchReceipt(state: { brief: ResearchBrief; draft: ResearchDraft }, receipt: ResearchBrief) {
  if (receipt.id !== state.brief.id || receipt.revision < state.brief.revision) return state;
  return { brief: receipt, draft: researchDraftChanged(state.draft, state.brief) ? state.draft : researchDraft(receipt) };
}
export function safeResearchUrl(value: string): string | null {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export const RESEARCH_CHANNEL_LABELS: Record<ResearchChannel, string> = { web: "Web", linkedin: "LinkedIn", youtube: "YouTube", instagram: "Instagram", reddit: "Reddit", x: "X / Twitter" };
export function researchSourcePlatform(source: ResearchSource): ResearchChannel {
  if (source.platform) return source.platform;
  const safe = safeResearchUrl(source.url);
  const host = safe ? new URL(safe).hostname.toLowerCase().replace(/\.$/u, "") : "";
  const domains: Array<[ResearchChannel, string[]]> = [
    ["linkedin", ["linkedin.com"]], ["youtube", ["youtube.com", "youtu.be", "youtube-nocookie.com"]],
    ["instagram", ["instagram.com"]], ["reddit", ["reddit.com", "redd.it"]], ["x", ["x.com", "twitter.com"]],
  ];
  return domains.find(([, names]) => names.some(name => host === name || host.endsWith(`.${name}`)))?.[0] ?? "web";
}
export function researchSourceLabel(source: ResearchSource): string {
  return source.publisher?.trim() || source.title.trim() || (safeResearchUrl(source.url) ? new URL(source.url).hostname : "Source");
}
export const RESEARCH_EVIDENCE_LABELS = { page_extract: "Page extract", search_snippet: "Search snippet", post: "Post", transcript: "Transcript", video_metadata: "Video metadata" } as const;
export function researchModelSummary(info?: ResearchModelInfo): string {
  if (!info) return "Model identity was not retained for this run.";
  return `Model service: ${info.service === "anthropic" ? "Anthropic" : info.service === "omniroute" ? "OmniRoute" : "OpenRouter"} · Requested route: ${info.requestedModel}${info.reportedModel ? ` · Reported model: ${info.reportedModel}` : " · Upstream model not reported"}`;
}
export function researchFailureSummary(failure?: ResearchFailure): string {
  if (!failure) return "Failure cause was not retained for this run.";
  if (failure.code === "budget_exhausted") {
    if (!failure.limit) return "A research limit was reached. This older run did not record which limit.";
    const phase = failure.limit.phase;
    const section = RESEARCH_SECTIONS.find(s => phase.endsWith(`_${s.key}`));
    const affected = section ? `${phase.startsWith("numeric_") ? "Numeric review for " : phase.startsWith("visual_") ? "Diagram for " : ""}${section.title.toLowerCase()}`
      : ({ runner: "Research", resolve: "Subject resolution", dossier: "Topic discovery", channels: "Source discovery", preparation: "Research preparation", extraction: "Evidence extraction", summaries: "Evidence summaries", visuals: "Report diagrams" } as Record<string, string>)[phase];
    if (failure.limit.kind === "stage_calls") return `${affected} reached its request limit. Available findings have been retained.`;
    if (failure.limit.kind === "job_reservation") return "This run reached its configured research allowance. Available findings have been retained.";
    if (failure.limit.kind === "call_retries") return `A provider request reached its retry limit during ${affected.toLowerCase()}.`;
    return "A provider request exceeded its reserved allowance, so further work was stopped.";
  }
  if (failure.code === "authentication" && failure.provider === "treg") {
    return "Research search could not authenticate. Update the search provider configuration before starting another brief.";
  }
  const reasons: Record<ResearchFailure["code"], string> = {
    timeout: "The request timed out", rate_limit: "The provider rate limit was reached", authentication: "Provider authentication failed",
    budget_exhausted: "The research budget was exhausted", output_truncated: "The model output was truncated", empty_output: "The model returned no content",
    invalid_output: "The model output could not be validated", storage_failure: "The result could not be saved", provider_unavailable: "The provider was unavailable", internal_error: "The runner encountered an internal error",
  };
  const detail = failure.reason ? ({
    http_error: `Upstream returned HTTP ${failure.httpStatus ?? "error"}`,
    transport_error: "The provider connection failed", connect_timeout: "Connecting to the provider timed out",
    read_timeout: "Waiting for provider data timed out", deadline: "The provider request exceeded its time limit",
    stream_error: `The provider reported an error in its response stream${failure.httpStatus ? ` (HTTP ${failure.httpStatus})` : ""}`, stream_incomplete: "The provider response stream ended before completion",
    stream_invalid: "The provider response stream was malformed", response_too_large: "The provider response exceeded the safe size limit",
    context_limit: "The evidence exceeded the model request size limit", no_matching_sources: "No supporting sources matched the requested research scope", invalid_json: "The provider returned invalid JSON",
    invalid_schema: "The provider response did not match the expected format", output_truncated: "The model output was truncated",
    empty_output: "The model returned no content",
  } satisfies Record<NonNullable<ResearchFailure["reason"]>, string>)[failure.reason] : reasons[failure.code];
  const stage = RESEARCH_SECTIONS.find(s => s.key === failure.stage)?.title.toLowerCase()
    ?? ({ resolve: "subject resolution", discovery: "research preparation", storage: "saving findings", runner: "research" } as Record<string, string>)[failure.stage];
  return `${detail}${failure.provider ? ` (${failure.provider}${failure.operation ? ` / ${failure.operation}` : ""})` : ""} during ${stage}. ${failure.retryable ? "Start a new brief to try again." : "Start a new brief after the issue is resolved."}`;
}
/** Only known evidence IDs become citations; unknown references remain visible. */
export function replaceResearchCitations(content: string, sources: ResearchSource[], render: (source: ResearchSource) => string): string {
  return content.replace(/\[([A-Za-z0-9_-]{1,100})\](?:\([^)]*\))?|\b(src_[A-Za-z0-9_-]+)\b/gu, (match, bracket: string, bare: string) => {
    const source = sources.find(s => s.id === (bracket || bare));
    return source ? render(source) : match;
  });
}
export async function readResearchImport(file: { name: string; size: number; text(): Promise<string> }): Promise<string> {
  if (!/\.(txt|md)$/iu.test(file.name)) throw new Error("Choose a .txt or .md file.");
  if (file.size > 65_536) throw new Error("Choose a file smaller than 64 KB.");
  const text = await file.text();
  if (text.length > RESEARCH_NOTES_LIMIT) throw new Error("Notes must be 12,000 characters or fewer.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u.test(text)) throw new Error("Choose a UTF-8 plain text file.");
  return text;
}
export function researchMarkdown(brief: ResearchBrief): string {
  const quoteLabel = (label: string) => label.replace(/[[\]\\]/gu, "\\$&");
  return [
    `# ${brief.title}`, `Status: ${brief.status} · Revision ${brief.revision}`, `Updated: ${brief.updatedAt}`,
    ...(brief.needsResearch ? ["Previous report no longer matches the edited inputs. Retained findings and sources belong to the previous scope; run research again before using them for the new inputs."] : []),
    ...(brief.researchInput ? [`Guest: ${brief.researchInput.guestName}\n\nCompany: ${brief.researchInput.companyName}\n\nIndustry: ${brief.researchInput.industry}\n\nAudience context: India`] : []),
    ...brief.sections.map(section => `## ${section.title}\n\nStatus: ${section.status}\n\n${replaceResearchCitations(researchVisualText(section.content, brief.sources), brief.sources, source => {
      const url = safeResearchUrl(source.url);
      return url ? `[${quoteLabel(researchSourceLabel(source))}](${url.replace(/\(/gu, "%28").replace(/\)/gu, "%29")})` : researchSourceLabel(source);
    })}${section.failure ? `\n\n${researchFailureSummary(section.failure)}` : ""}`),
    ...(brief.warnings.length ? [`## Limitations\n\n${brief.warnings.map(w => `- ${w}`).join("\n")}`] : []),
    "## Sources", ...brief.sources.map(source => `### ${source.title}\n\n${researchSourceLabel(source)} · ${RESEARCH_CHANNEL_LABELS[researchSourcePlatform(source)]}\n\n${safeResearchUrl(source.url) ?? "Link unavailable"}\n\n${source.excerpt}\n\nRetrieved: ${source.retrievedAt}${source.publishedAt ? ` · Published: ${source.publishedAt}` : ""}${source.evidenceType ? `\n\nEvidence: ${RESEARCH_EVIDENCE_LABELS[source.evidenceType]}` : ""}${source.retrievedVia ? `\n\nRetrieved via: ${source.retrievedVia}` : ""}`),
    "## Run details", researchModelSummary(brief.modelInfo),
    ...(researchIsRunning(brief.status) || brief.status === "cancel_pending"
      ? ["Costs will be shown after the run stops."]
      : [brief.cost.modelUsd === null ? "Cost not reported by provider" : `Model cost: $${brief.cost.modelUsd.toFixed(4)}`,
        `Tool cost (recorded or reserved): $${(brief.cost.toolMicro / 1_000_000).toFixed(4)}`]),
    ...(brief.coverage ? brief.coverage.map(c => `${RESEARCH_CHANNEL_LABELS[c.channel]}: ${c.status.replace(/_/gu, " ")} · ${c.sourceCount} retained ${c.sourceCount === 1 ? "source" : "sources"} · ${c.method.replace(/_/gu, " ")}`) : []),
    ...(brief.failure ? [researchFailureSummary(brief.failure)] : []),
  ].join("\n\n");
}

type ResearchFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export class ResearchRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export async function researchRequest<T>(fetcher: ResearchFetch, path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const mutation = !["GET", "HEAD"].includes(method);
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let response: Response;
  let data: unknown;
  try {
    const request = async () => {
      const result = await fetcher(`/beta/api/research${path}`, {
        method, signal: controller.signal,
        ...(mutation ? { headers: { "content-type": "application/json" }, body: JSON.stringify(options.body ?? {}) } : {}),
      });
      return { response: result, data: await result.json().catch(() => null) };
    };
    const result = mutation ? await request() : await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ResearchRequestError("Loading research took too long. Please try again. Your saved research has not been deleted.", 504, "research_load_timeout"));
          controller.abort();
        }, 30000);
      }),
    ]);
    response = result.response;
    data = result.data;
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
  const errorData = data as { error?: string } | null;
  if (!response.ok) {
    const message = errorData?.error === "research_not_configured" ? "Research is currently unavailable. Please try again later."
      : errorData?.error === "research_cancel_pending" ? "Cancellation is not confirmed yet. Retry cancellation to stop remote work."
      : errorData?.error === "notes_consent_required" ? "Approve use of your notes before saving or starting research."
      : errorData?.error === "research_chat_limit" ? "This brief has reached its follow-up limit."
      : errorData?.error === "research_deletion_pending" ? "Deletion is pending. Use the bin beside this saved brief to retry."
      : errorData?.error === "research_running" ? "Research is already running. Wait for it to finish or cancel the run before making changes."
      : errorData?.error === "research_not_ready" ? "This brief is not ready for follow-up questions. Wait for research to finish and return findings."
      : errorData?.error === "research_conflict" || errorData?.error === "revision_conflict" ? "This brief changed since you opened it. Your edits have been kept. Review the latest saved version before saving again."
      : response.status === 401 || response.status === 403 ? "You no longer have access to this research."
      : response.status === 404 ? "This brief is no longer available."
      : response.status === 429 ? "Research is busy. Please try again shortly."
      : "Research could not complete that request. Please try again.";
    throw new ResearchRequestError(message, response.status, typeof errorData?.error === "string" ? errorData.error : undefined);
  }
  if (!data || typeof data !== "object") throw new Error("Research returned an incomplete response. Please try again.");
  return data as T;
}

/** Validate the display contract before replacing a user's working draft. */
export function parseResearchBrief(value: unknown): ResearchBrief {
  const b = value as ResearchBrief | null;
  if (!b || typeof b.id !== "string" || typeof b.title !== "string" || !Number.isInteger(b.revision)
    || !["draft", "queued", "running", "completed", "partial", "failed", "cancelled", "clarification", "deleting", "cancel_pending"].includes(b.status)
    || typeof b.updatedAt !== "string" || typeof b.notes !== "string" || !(b.episodeId === null || typeof b.episodeId === "string")
    || typeof b.shared !== "boolean" || typeof b.canEdit !== "boolean"
    || (b.skipClarification !== undefined && typeof b.skipClarification !== "boolean")
    || (b.needsResearch !== undefined && typeof b.needsResearch !== "boolean")
    || !Array.isArray(b.sections) || !b.sections.every(s => s && RESEARCH_SECTIONS.some(k => k.key === s.key) && typeof s.title === "string" && typeof s.content === "string" && typeof s.status === "string")
    || !Array.isArray(b.sources) || !b.sources.every(s => s && [s.id, s.title, s.url, s.excerpt, s.retrievedAt].every(v => typeof v === "string"))
    || !Array.isArray(b.messages) || !b.messages.every(m => m && typeof m.role === "string" && typeof m.content === "string")
    || !Array.isArray(b.progress) || !b.progress.every(p => typeof p === "string")
    || !Array.isArray(b.warnings) || !b.warnings.every(w => typeof w === "string")
    || !(b.clarification === null || typeof b.clarification === "string")
    || !b.cost || !Number.isFinite(b.cost.toolMicro) || !(b.cost.modelUsd === null || Number.isFinite(b.cost.modelUsd))) {
    throw new Error("Research returned an incomplete brief. Your edits have been kept.");
  }
  const validFailure = (f: ResearchFailure | undefined) => f === undefined || !!f
    && ["resolve", "discovery", "snacks", "appetizers", "main", "desserts", "storage", "runner"].includes(f.stage)
    && ["timeout", "rate_limit", "authentication", "budget_exhausted", "output_truncated", "empty_output", "invalid_output", "storage_failure", "provider_unavailable", "internal_error"].includes(f.code)
    && typeof f.retryable === "boolean"
    && (f.limit == null || f.code === "budget_exhausted" && researchLimitValid(f.limit))
        && (f.reason == null || ['http_error', 'transport_error', 'connect_timeout', 'read_timeout', 'deadline', 'stream_error', 'stream_incomplete', 'stream_invalid', 'response_too_large', 'context_limit', 'no_matching_sources', 'invalid_json', 'invalid_schema', 'output_truncated', 'empty_output'].includes(f.reason))
        && (f.provider == null || ['treg', 'omniroute', 'openrouter', 'anthropic', 'runner'].includes(f.provider))
        && (f.operation == null || ['catalog', 'search', 'social_search', 'extract', 'model'].includes(f.operation))
        && (f.httpStatus == null || (typeof f.httpStatus === "number" && Number.isInteger(f.httpStatus) && f.httpStatus >= 100 && f.httpStatus <= 599));
  const boundedModel = (v: unknown) => typeof v === "string" && v.length <= 120;
  if ((b.visualPolicyVersion !== undefined && b.visualPolicyVersion !== 2)
    || (b.figures !== undefined && !validateFigureSlots(b.figures, b.sources))
    || (b.schemaVersion !== undefined && b.schemaVersion !== 2)
    || (b.coverage !== undefined && (!Array.isArray(b.coverage) || b.coverage.length > 6 || !b.coverage.every(c => c && RESEARCH_CHANNELS.includes(c.channel)
      && ["pending", "searching", "found", "no_results", "unavailable", "failed", "budget_limited"].includes(c.status)
      && Number.isSafeInteger(c.sourceCount) && c.sourceCount >= 0 && ["dedicated_tool", "web_search"].includes(c.method))
      || new Set(b.coverage.map(c => c.channel)).size !== b.coverage.length))
    || (b.modelInfo !== undefined && (!b.modelInfo || !["omniroute", "openrouter", "anthropic"].includes(b.modelInfo.service) || !boundedModel(b.modelInfo.requestedModel) || (b.modelInfo.reportedModel !== undefined && !boundedModel(b.modelInfo.reportedModel))))
    || !validFailure(b.failure) || !b.sections.every(s => validFailure(s.failure))
    || !b.sources.every(s => (s.publisher === undefined || typeof s.publisher === "string")
      && (s.publishedAt === undefined || typeof s.publishedAt === "string")
      && (s.platform === undefined || RESEARCH_CHANNELS.includes(s.platform))
      && (s.retrievedVia === undefined || RESEARCH_TOOLS.includes(s.retrievedVia))
      && (s.evidenceType === undefined || (typeof s.evidenceType === "string" && Object.hasOwn(RESEARCH_EVIDENCE_LABELS, s.evidenceType))))) {
    throw new Error("Research returned an incomplete brief. Your edits have been kept.");
  }
  if (b.researchInput !== undefined) {
    try { return { ...b, researchInput: parseResearchInput(b.researchInput) }; }
    catch { throw new Error("Research returned an incomplete brief. Your edits have been kept."); }
  }
  return b;
}

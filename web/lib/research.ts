export type ResearchStatus = "draft" | "queued" | "running" | "completed" | "partial" | "failed" | "cancelled" | "clarification" | "deleting" | "cancel_pending";
export type ResearchSectionKey = "snacks" | "appetizers" | "main" | "desserts";
export type ResearchSection = { key: ResearchSectionKey; title: string; content: string; status: string };
export type ResearchSummary = { id: string; title: string; status: ResearchStatus; updatedAt: string; revision: number; shared: boolean };
export type ResearchSource = { id: string; title: string; url: string; excerpt: string; publisher?: string; publishedAt?: string; retrievedAt: string; kind?: string; timestampSeconds?: number };
export type ResearchBrief = ResearchSummary & {
  notes: string; notesApproved?: boolean; episodeId: string | null; canEdit: boolean;
  sections: ResearchSection[]; sources: ResearchSource[];
  messages: Array<{ role: string; content: string }>; progress: string[]; warnings: string[];
  clarification: string | null; cost: { toolMicro: number; modelUsd: number | null };
};
export type ResearchVersion = { revision: number; createdAt: string };
export type ResearchDraft = Pick<ResearchBrief, "revision" | "title" | "notes" | "episodeId" | "shared" | "sections"> & { notesApproved: boolean };
export const RESEARCH_SECTIONS: ReadonlyArray<{ key: ResearchSectionKey; title: string; description: string }> = [
  { key: "snacks", title: "Snacks", description: "Background and the story so far" },
  { key: "appetizers", title: "Appetizers", description: "Industry context and the bigger picture" },
  { key: "main", title: "Main course", description: "Opportunities for young Indians" },
  { key: "desserts", title: "Desserts", description: "Takeaways and what comes next" },
];
export const RESEARCH_NOTES_LIMIT = 12_000;
export function researchIsRunning(status: ResearchStatus) { return status === "queued" || status === "running"; }
export function researchDraft(brief: ResearchBrief): ResearchDraft {
  const { revision, title, notes, episodeId, shared, sections } = brief;
  return { revision, title, notes, notesApproved: brief.notesApproved === true, episodeId, shared, sections };
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
export async function readResearchImport(file: { name: string; size: number; text(): Promise<string> }): Promise<string> {
  if (!/\.(txt|md)$/iu.test(file.name)) throw new Error("Choose a .txt or .md file.");
  if (file.size > 65_536) throw new Error("Choose a file smaller than 64 KB.");
  const text = await file.text();
  if (text.length > RESEARCH_NOTES_LIMIT) throw new Error("Notes must be 12,000 characters or fewer.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u.test(text)) throw new Error("Choose a UTF-8 plain text file.");
  return text;
}
export function researchMarkdown(brief: ResearchBrief): string {
  return [
    `# ${brief.title}`, `Status: ${brief.status} · Revision ${brief.revision}`, `Updated: ${brief.updatedAt}`,
    ...brief.sections.map(section => `## ${section.title}\n\nStatus: ${section.status}\n\n${section.content}`),
    ...(brief.warnings.length ? [`## Limitations\n\n${brief.warnings.map(w => `- ${w}`).join("\n")}`] : []),
    "## Sources", ...brief.sources.map(source => `### ${source.id}: ${source.title}\n\n${safeResearchUrl(source.url) ?? "Link unavailable"}\n\n${source.excerpt}\n\nRetrieved: ${source.retrievedAt}${source.publishedAt ? ` · Published: ${source.publishedAt}` : ""}`),
  ].join("\n\n");
}

type ResearchFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export class ResearchRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export async function researchRequest<T>(fetcher: ResearchFetch, path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const mutation = !["GET", "HEAD"].includes(method);
  const response = await fetcher(`/beta/api/research${path}`, {
    method, signal: options.signal,
    ...(mutation ? { headers: { "content-type": "application/json" }, body: JSON.stringify(options.body ?? {}) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error === "research_not_configured" ? "Research is currently unavailable. Please try again later."
      : data?.error === "research_cancel_pending" ? "Cancellation is not confirmed yet. Retry cancellation to stop remote work."
      : data?.error === "notes_consent_required" ? "Approve use of your notes before saving or starting research."
      : data?.error === "research_chat_limit" ? "This brief has reached its follow-up limit."
      : data?.error === "research_deletion_pending" ? "Deletion is pending. Editing and research are disabled; retry deletion to finish removing this brief."
      : data?.error === "research_running" ? "Research is already running. Wait for it to finish or cancel the run before making changes."
      : data?.error === "research_not_ready" ? "This brief is not ready for follow-up questions. Wait for research to finish and return findings."
      : data?.error === "research_conflict" || data?.error === "revision_conflict" ? "This brief changed since you opened it. Your edits have been kept. Review the latest saved version before saving again."
      : response.status === 401 || response.status === 403 ? "You no longer have access to this research."
      : response.status === 404 ? "This brief is no longer available."
      : response.status === 429 ? "Research is busy. Please try again shortly."
      : "Research could not complete that request. Please try again.";
    throw new ResearchRequestError(message, response.status, typeof data?.error === "string" ? data.error : undefined);
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
    || !Array.isArray(b.sections) || !b.sections.every(s => s && RESEARCH_SECTIONS.some(k => k.key === s.key) && typeof s.title === "string" && typeof s.content === "string" && typeof s.status === "string")
    || !Array.isArray(b.sources) || !b.sources.every(s => s && [s.id, s.title, s.url, s.excerpt, s.retrievedAt].every(v => typeof v === "string"))
    || !Array.isArray(b.messages) || !b.messages.every(m => m && typeof m.role === "string" && typeof m.content === "string")
    || !Array.isArray(b.progress) || !b.progress.every(p => typeof p === "string")
    || !Array.isArray(b.warnings) || !b.warnings.every(w => typeof w === "string")
    || !(b.clarification === null || typeof b.clarification === "string")
    || !b.cost || !Number.isFinite(b.cost.toolMicro) || !(b.cost.modelUsd === null || Number.isFinite(b.cost.modelUsd))) {
    throw new Error("Research returned an incomplete brief. Your edits have been kept.");
  }
  return b;
}

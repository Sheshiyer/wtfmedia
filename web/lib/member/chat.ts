import { parsePublicSourceRecords, type PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { parsePublicMomentsHeader, type PublicMomentsPayload } from "@/lib/provenance/public-moment-header";
import { projectPublicMoments, projectPublicSources } from "@/lib/provenance/public-answer-projection";

export type MemberSourceMode = "published" | "uncut" | "both";
export type MemberResponseState = "answered_grounded" | "retrieval_weak" | "synthesis_invalid" | "abstained";
export type MemberMessageRole = "user" | "assistant";

export type MemberMessage = {
  id: string;
  role: MemberMessageRole;
  content: string;
  createdAt: string;
  sources?: PublicSourceCitation[];
  sourceMode?: MemberSourceMode;
  groundingState?: "grounded" | "ungrounded" | "unavailable";
  uncutUnavailable?: boolean;
  /** Public-pipeline answer state, stored raw in turn metadata. */
  responseState?: MemberResponseState;
  citedIndices?: number[];
  followUps?: string[];
  moments?: PublicMomentsPayload;
  requestedSourceMode?: MemberSourceMode | null;
  evidenceSourceMode?: MemberSourceMode | null;
};

export type MemberConversation = {
  id: string;
  title: string;
  sourceMode: MemberSourceMode;
  state: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  /** Safe optional server count; preferences remain independently retained. */
  linkedSavedPreferenceCount?: number;
  messages?: MemberMessage[];
};

export type MemberConversationResponse = {
  conversation: MemberConversation;
  messages: MemberMessage[];
  previousMessageCursor: string | null;
  retryable: boolean;
  retrySourceMode: MemberSourceMode | null;
  resumeMessageId: string | null;
};

export type MemberRetryIntent = { question: string; sourceMode: MemberSourceMode; resumeMessageId: string | null };
export type MemberCommittedRequest = MemberRetryIntent & {
  idempotencyKey: string;
  conversationId: string | null;
};

export type MemberHistoryResponse = {
  conversations: MemberConversation[];
  nextCursor: string | null;
};

const conversationIdPattern = /^mcnv_[A-Za-z0-9-]{8,88}$/u;
const messageIdPattern = /^mmsg_[A-Za-z0-9-]{8,88}$/u;
const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const asString = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;

function sourceMode(value: unknown): MemberSourceMode {
  return value === "uncut" || value === "both" || value === "published" ? value : "published";
}

function retrySourceMode(value: unknown): MemberSourceMode | null {
  return value === "uncut" || value === "both" || value === "published" ? value : null;
}

function safeCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

const MEMBER_RESPONSE_STATES = new Set<MemberResponseState>([
  "answered_grounded",
  "retrieval_weak",
  "synthesis_invalid",
  "abstained",
]);

function responseState(value: unknown): MemberResponseState | undefined {
  return typeof value === "string" && MEMBER_RESPONSE_STATES.has(value as MemberResponseState)
    ? value as MemberResponseState
    : undefined;
}

function citedIndices(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const indices = value.filter((item): item is number => Number.isSafeInteger(item) && (item as number) > 0);
  return indices.length ? indices : undefined;
}

function followUps(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 6)
    .map((item) => item.trim().slice(0, 200));
  return items.length ? items : undefined;
}

/** Member moments render through the exact public projection + header parser. */
function momentsPayload(metadata: Record<string, unknown>): PublicMomentsPayload | undefined {
  if (!Array.isArray(metadata.moments)) return undefined;
  const payload = parsePublicMomentsHeader(JSON.stringify(projectPublicMoments({
    moments: metadata.moments,
    totalMomentDurationSec: metadata.totalMomentDurationSec,
    durationBudgetSec: metadata.durationBudgetSec,
  })));
  return payload && payload.moments.length > 0 ? payload : undefined;
}

function previousMessageCursor(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,512}$/u.test(value) ? value : null;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) return {};
  const raw = record.source_metadata_json;
  if (typeof raw !== "string") return record;
  try {
    return asRecord(JSON.parse(raw)) ?? {};
  } catch {
    return {};
  }
}

function parseMessage(value: unknown): MemberMessage | null {
  const record = asRecord(value);
  const role = record?.role;
  const content = asString(record?.content).trim();
  if (!record || (role !== "user" && role !== "assistant") || !content) return null;
  const metadata = parseMetadata(record);
  const source = sourceMode(record.sourceMode ?? record.source_mode ?? metadata.sourceMode ?? metadata.source_mode);
  // Stored metadata keeps the raw pipeline answer; project it through the
  // same provenance module the public headers use, then parse fail-closed.
  const rawSources = Array.isArray(record.sources) ? record.sources : metadata.sources;
  const sources = parsePublicSourceRecords(projectPublicSources(rawSources, source));
  const grounding = record.groundingState ?? record.grounding_state;
  const state = responseState(metadata.responseState);
  const cited = citedIndices(metadata.citedIndices);
  const ups = followUps(metadata.followUps);
  const moments = momentsPayload(metadata);
  const requestedMode = retrySourceMode(metadata.requestedSourceMode);
  const evidenceMode = retrySourceMode(metadata.evidenceSourceMode);
  return {
    id: asString(record.id, `${role}-${content.slice(0, 16)}`),
    role,
    content,
    createdAt: asString(record.created_at, asString(record.createdAt)),
    ...(sources.length ? { sources } : {}),
    ...(role === "assistant" ? { sourceMode: source } : {}),
    ...(grounding === "grounded" || grounding === "ungrounded" || grounding === "unavailable" ? { groundingState: grounding } : {}),
    ...(record.uncutUnavailable === true || metadata.uncutUnavailable === true ? { uncutUnavailable: true } : {}),
    ...(state ? { responseState: state } : {}),
    ...(cited ? { citedIndices: cited } : {}),
    ...(ups ? { followUps: ups } : {}),
    ...(moments ? { moments } : {}),
    ...(requestedMode ? { requestedSourceMode: requestedMode } : {}),
    ...(evidenceMode ? { evidenceSourceMode: evidenceMode } : {}),
  };
}

function parseConversation(value: unknown): MemberConversation | null {
  const record = asRecord(value);
  const id = asString(record?.id, asString(record?.conversationId));
  if (!record || !conversationIdPattern.test(id)) return null;
  const linkedSavedPreferenceCount = safeCount(record.linkedSavedPreferenceCount ?? record.linked_saved_preference_count);
  return {
    id,
    title: asString(record.title, "New conversation"),
    sourceMode: sourceMode(record.source_mode ?? record.sourceMode),
    state: record.lifecycle_state === "archived" || record.state === "archived" ? "archived" : "active",
    createdAt: asString(record.created_at, asString(record.createdAt)),
    updatedAt: asString(record.updated_at, asString(record.updatedAt)),
    ...(linkedSavedPreferenceCount === undefined ? {} : { linkedSavedPreferenceCount }),
    messages: Array.isArray(record.messages) ? record.messages.map(parseMessage).filter((item): item is MemberMessage => item !== null) : undefined,
  };
}

export function canConfirmMemberConversationDeletion(value: string): boolean {
  return value === "DELETE";
}

export function linkedSavedPreferenceDeletionNotice(linkedSavedPreferenceCount?: number): string {
  if (linkedSavedPreferenceCount === undefined) return "Saved preferences are separate and will not be deleted.";
  if (linkedSavedPreferenceCount === 0) return "No saved preferences are linked to this conversation; any saved preferences remain separate.";
  return `${linkedSavedPreferenceCount} saved preference${linkedSavedPreferenceCount === 1 ? "" : "s"} stay separate and will not be deleted.`;
}

export function memberConversationHref(conversationId: string): string | null {
  return conversationIdPattern.test(conversationId) ? `/beta/chat/${encodeURIComponent(conversationId)}` : null;
}

export function parseMemberConversationResponse(value: unknown): MemberConversationResponse | null {
  const record = asRecord(value);
  const conversation = parseConversation(record?.conversation ?? record);
  if (!record || !conversation) return null;
  const messages = (Array.isArray(record.messages) ? record.messages : conversation.messages ?? []).map(parseMessage).filter((item): item is MemberMessage => item !== null);
  return {
    conversation: { ...conversation, messages },
    messages,
    previousMessageCursor: previousMessageCursor(record.previousMessageCursor),
    retryable: record.retryable === true,
    retrySourceMode: retrySourceMode(record.retrySourceMode),
    resumeMessageId: typeof record.resumeMessageId === "string" && messageIdPattern.test(record.resumeMessageId) ? record.resumeMessageId : null,
  };
}

/** Prepends the chronologically ordered older page without duplicating a boundary message. */
export function prependMemberConversationMessages(current: MemberConversationResponse, older: MemberConversationResponse): MemberConversationResponse {
  if (current.conversation.id !== older.conversation.id) return current;
  const currentIds = new Set(current.messages.map((message) => message.id));
  const messages = [...older.messages.filter((message) => !currentIds.has(message.id)), ...current.messages];
  return {
    ...current,
    conversation: { ...current.conversation, messages },
    messages,
    previousMessageCursor: older.previousMessageCursor,
  };
}

/** Retains already loaded older pages when a newest-page POST response arrives. */
export function appendNewestMemberConversationMessages(current: MemberConversationResponse | null, newest: MemberConversationResponse): MemberConversationResponse {
  if (!current || current.conversation.id !== newest.conversation.id) return newest;
  const seen = new Set(current.messages.map((message) => message.id));
  const messages = [...current.messages, ...newest.messages.filter((message) => !seen.has(message.id))];
  return { ...newest, conversation: { ...newest.conversation, messages }, messages };
}

export function parseMemberHistoryResponse(value: unknown): MemberHistoryResponse | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.conversations)) return null;
  return {
    conversations: record.conversations.map(parseConversation).filter((item): item is MemberConversation => item !== null),
    nextCursor: typeof record.nextCursor === "string" ? record.nextCursor : null,
  };
}

export function appendMemberHistoryPage(current: MemberHistoryResponse, page: MemberHistoryResponse): MemberHistoryResponse {
  const seen = new Set(current.conversations.map((conversation) => conversation.id));
  return {
    conversations: [...current.conversations, ...page.conversations.filter((conversation) => !seen.has(conversation.id))],
    nextCursor: page.nextCursor,
  };
}

export function newMemberRequestKey(): string {
  return crypto.randomUUID();
}

export function memberCommittedRequestForRetry(
  committed: MemberCommittedRequest | null,
  turn: Pick<MemberCommittedRequest, "conversationId" | "question" | "sourceMode" | "resumeMessageId">,
): MemberCommittedRequest | null {
  if (!committed) return null;
  return committed.conversationId === turn.conversationId
    && committed.question === turn.question
    && committed.sourceMode === turn.sourceMode
    && committed.resumeMessageId === turn.resumeMessageId
    ? committed
    : null;
}

export function shouldFinishMemberPaginationRequest({ requestGeneration, currentGeneration }: { requestGeneration: number; currentGeneration: number }): boolean {
  return requestGeneration === currentGeneration;
}

export function shouldApplyMemberResponse({ requestEpoch, currentEpoch, requestPath, currentPath }: { requestEpoch: number; currentEpoch: number; requestPath: string; currentPath: string }): boolean {
  return requestEpoch === currentEpoch && requestPath === currentPath;
}

export type MemberAnswerPresentation = {
  abstained: boolean;
  uncutUnavailable: boolean;
  sources: PublicSourceCitation[];
  responseState?: MemberResponseState;
  citedIndices?: number[];
  followUps?: string[];
  moments?: PublicMomentsPayload;
  requestedSourceMode?: MemberSourceMode | null;
  evidenceSourceMode?: MemberSourceMode | null;
};

export function memberAnswerPresentation(message: MemberMessage): MemberAnswerPresentation {
  return {
    abstained: message.role === "assistant" && (message.groundingState === "ungrounded" || message.responseState === "abstained"),
    uncutUnavailable: message.uncutUnavailable === true,
    sources: message.sources ?? [],
    ...(message.responseState ? { responseState: message.responseState } : {}),
    ...(message.citedIndices ? { citedIndices: message.citedIndices } : {}),
    ...(message.followUps ? { followUps: message.followUps } : {}),
    ...(message.moments ? { moments: message.moments } : {}),
    ...(message.requestedSourceMode ? { requestedSourceMode: message.requestedSourceMode } : {}),
    ...(message.evidenceSourceMode ? { evidenceSourceMode: message.evidenceSourceMode } : {}),
  };
}

export function shouldKeepMemberScrollPinned({ scrollTop, scrollHeight, clientHeight }: { scrollTop: number; scrollHeight: number; clientHeight: number }): boolean {
  return scrollHeight - scrollTop - clientHeight < 50;
}

export function retryIntentForMemberResponse(response: MemberConversationResponse): MemberRetryIntent | null {
  const lastMessage = response.messages.at(-1);
  if (!response.retryable || !response.retrySourceMode || !lastMessage || lastMessage.role !== "user") return null;
  const resumeMessageId = response.resumeMessageId ?? (messageIdPattern.test(lastMessage.id) ? lastMessage.id : null);
  if (!resumeMessageId) return null;
  return {
    question: lastMessage.content,
    sourceMode: response.retrySourceMode,
    resumeMessageId,
  };
}

export function sourceModeForMemberQuestion(
  conversation: Pick<MemberConversation, "sourceMode"> | null,
  retryIntent: MemberRetryIntent | null,
  question: string,
  selectedMode: MemberSourceMode = "published",
): MemberSourceMode {
  return retryIntent?.question === question ? retryIntent.sourceMode : conversation?.sourceMode ?? selectedMode;
}

export function memberSessionIsAdmitted({
  isLoaded,
  isSignedIn,
  currentIdentity,
  admittedIdentity,
}: {
  isLoaded: boolean;
  isSignedIn: boolean;
  currentIdentity: string | null;
  admittedIdentity: string | null;
}): boolean {
  return isLoaded && isSignedIn && currentIdentity !== null && currentIdentity === admittedIdentity;
}

export function memberGreeting(firstName?: string | null, fullName?: string | null): string {
  const candidate = (firstName || fullName || "").trim().split(/\s+/u)[0];
  return candidate ? `Welcome back, ${candidate}` : "Welcome to your workspace";
}

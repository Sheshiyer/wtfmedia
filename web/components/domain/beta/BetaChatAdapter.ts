import { parsePublicSourceRecords } from "@/lib/provenance/public-source-header";
import {
  parseChatConversationResponse,
  parseChatHistoryResponse,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/ops/chat";
import {
  memberConversationHref,
  parseMemberConversationResponse,
  parseMemberHistoryResponse,
  type MemberConversation,
  type MemberConversationResponse,
  type MemberHistoryResponse,
  type MemberMessage,
  type MemberSourceMode,
} from "@/lib/member/chat";

export type BetaConversation = MemberConversation & {
  /** Operator history carries a count and owner metadata; members may omit it. */
  messageCount?: number;
  operatorEmail?: string;
  operatorDisplayName?: string;
};

export type BetaConversationResponse = Omit<MemberConversationResponse, "conversation" | "messages"> & {
  conversation: BetaConversation;
  messages: MemberMessage[];
};

export type BetaHistoryResponse = Omit<MemberHistoryResponse, "conversations"> & {
  conversations: BetaConversation[];
};

export type BetaChatFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type BetaHistoryOptions = {
  includeArchived?: boolean;
};

export type BetaReadFailure = {
  kind: "verification" | "temporary";
  status: number | null;
};

export type BetaChatAdapter = {
  kind: "member" | "operator";
  defaultSourceMode: MemberSourceMode;
  canDelete: boolean;
  list: (cursor?: string | null, options?: BetaHistoryOptions) => Promise<BetaHistoryResponse | null>;
  get: (conversationId: string, before?: string | null) => Promise<BetaConversationResponse | null>;
  readFailure?: () => BetaReadFailure | null;
  send: (conversationId: string | null, question: string, sourceMode: MemberSourceMode, idempotencyKey: string, resumeMessageId?: string | null) => Promise<{ ok: boolean; value: BetaConversationResponse | null }>;
  archive: (conversationId: string) => Promise<boolean>;
  delete?: (conversationId: string) => Promise<boolean>;
  href: (conversationId: string) => string | null;
};

const RETRYABLE_READ_STATUSES = new Set([401, 502, 503, 504]);

function failureForStatus(status: number): BetaReadFailure {
  return { kind: status === 401 || status === 403 ? "verification" : "temporary", status };
}

function queryString(values: Array<[string, string | null | undefined]>): string {
  const encoded = values
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
    .join("&");
  return encoded ? `?${encoded}` : "";
}

function historyQuery(cursor?: string | null, options?: BetaHistoryOptions): string {
  return queryString([
    ["cursor", cursor],
    ["includeArchived", options?.includeArchived ? "1" : null],
  ]);
}

async function readJsonWithRetry<T>(
  fetcher: BetaChatFetch,
  input: RequestInfo | URL,
  init: RequestInit,
  parse: (value: unknown) => T | null,
  setFailure: (failure: BetaReadFailure | null) => void,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(input, init);
    } catch {
      if (attempt === 0) continue;
      setFailure({ kind: "temporary", status: null });
      return null;
    }

    if (response.ok) {
      try {
        const parsed = parse(await response.json());
        if (parsed) {
          setFailure(null);
          return parsed;
        }
      } catch {
        // Treat a malformed successful response as an unavailable service.
      }
      setFailure({ kind: "temporary", status: response.status });
      return null;
    }

    if (attempt === 0 && RETRYABLE_READ_STATUSES.has(response.status)) continue;
    setFailure(failureForStatus(response.status));
    return null;
  }

  setFailure({ kind: "temporary", status: null });
  return null;
}

function memberAdapter(fetcher: BetaChatFetch): BetaChatAdapter {
  let lastReadFailure: BetaReadFailure | null = null;
  return {
    kind: "member",
    defaultSourceMode: "published",
    canDelete: true,
    readFailure: () => lastReadFailure,
    list: async (cursor, options) => {
      const parsed = await readJsonWithRetry(
        fetcher,
        `/beta/api/chat${historyQuery(cursor, options)}`,
        { cache: "no-store" },
        parseMemberHistoryResponse,
        (failure) => { lastReadFailure = failure; },
      );
      return parsed;
    },
    get: async (conversationId, before) => {
      const parsed = await readJsonWithRetry(
        fetcher,
        `/beta/api/chat/${encodeURIComponent(conversationId)}${queryString([["before", before]])}`,
        { cache: "no-store" },
        parseMemberConversationResponse,
        (failure) => { lastReadFailure = failure; },
      );
      return parsed;
    },
    send: async (conversationId, question, sourceMode, idempotencyKey, resumeMessageId) => {
      const endpoint = conversationId ? `/beta/api/chat/${encodeURIComponent(conversationId)}` : "/beta/api/chat";
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify({ question, sourceMode, ...(resumeMessageId ? { resumeMessageId } : {}) }),
      });
      return { ok: response.ok, value: parseMemberConversationResponse(await response.json()) };
    },
    archive: async (conversationId) => {
      const response = await fetcher(`/beta/api/chat/${encodeURIComponent(conversationId)}/archive`, { method: "POST" });
      return response.ok;
    },
    delete: async (conversationId) => {
      const response = await fetcher(`/beta/api/chat/${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      return response.ok;
    },
    href: memberConversationHref,
  };
}

function mapMessage(message: ChatMessage): MemberMessage {
  const sourceMode = message.sourceMode;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    ...(message.sources?.length ? { sources: parsePublicSourceRecords(message.sources) } : {}),
    ...(message.moments ? { moments: message.moments } : {}),
    ...(message.citedIndices?.length ? { citedIndices: message.citedIndices } : {}),
    ...(sourceMode ? { sourceMode } : {}),
    ...(message.groundingState ? { groundingState: message.groundingState } : {}),
    ...(message.uncutUnavailable ? { uncutUnavailable: true } : {}),
  };
}

function mapConversation(conversation: ChatConversation): BetaConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    sourceMode: conversation.sourceMode,
    state: conversation.state,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messageCount,
    ...(conversation.operatorEmail ? { operatorEmail: conversation.operatorEmail } : {}),
    ...(conversation.operatorDisplayName ? { operatorDisplayName: conversation.operatorDisplayName } : {}),
    ...(conversation.messages ? { messages: conversation.messages.map(mapMessage) } : {}),
  };
}

function operatorResponse(value: unknown): BetaConversationResponse | null {
  const parsed = parseChatConversationResponse(value);
  if (!parsed) return null;
  const conversation = mapConversation(parsed.conversation);
  const messages = conversation.messages ?? [];
  return {
    conversation: { ...conversation, messages },
    messages,
    previousMessageCursor: null,
    retryable: false,
    retrySourceMode: null,
    resumeMessageId: null,
  };
}

function operatorAdapter(fetcher: BetaChatFetch): BetaChatAdapter {
  let lastReadFailure: BetaReadFailure | null = null;
  const href = (conversationId: string): string | null => /^cnv_[A-Za-z0-9-]{8,88}$/u.test(conversationId)
    ? `/beta/chat/${encodeURIComponent(conversationId)}`
    : null;
  return {
    kind: "operator",
    defaultSourceMode: "both",
    canDelete: false,
    readFailure: () => lastReadFailure,
    list: async (cursor, options) => {
      const parsed = await readJsonWithRetry(
        fetcher,
        `/ops/api/chat/conversations${historyQuery(cursor, options)}`,
        { credentials: "same-origin", cache: "no-store" },
        parseChatHistoryResponse,
        (failure) => { lastReadFailure = failure; },
      );
      if (!parsed) return null;
      return { conversations: parsed.conversations.map(mapConversation), nextCursor: parsed.nextCursor ?? null };
    },
    get: async (conversationId) => {
      const parsed = await readJsonWithRetry(
        fetcher,
        `/ops/api/chat/conversations/${encodeURIComponent(conversationId)}`,
        { credentials: "same-origin", cache: "no-store" },
        operatorResponse,
        (failure) => { lastReadFailure = failure; },
      );
      return parsed;
    },
    send: async (conversationId, question, sourceMode, idempotencyKey) => {
      const endpoint = conversationId
        ? `/ops/api/chat/conversations/${encodeURIComponent(conversationId)}`
        : "/ops/api/chat";
      const response = await fetcher(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify({ question, sourceMode }),
      });
      return { ok: response.ok, value: operatorResponse(await response.json()) };
    },
    archive: async (conversationId) => {
      const response = await fetcher(`/ops/api/chat/conversations/${encodeURIComponent(conversationId)}/archive`, { method: "POST", credentials: "same-origin", cache: "no-store" });
      return response.ok;
    },
    href,
  };
}

export function createMemberChatAdapter(fetcher: BetaChatFetch): BetaChatAdapter {
  return memberAdapter(fetcher);
}

export function createOperatorChatAdapter(fetcher: BetaChatFetch): BetaChatAdapter {
  return operatorAdapter(fetcher);
}

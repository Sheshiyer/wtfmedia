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

export type BetaChatAdapter = {
  kind: "member" | "operator";
  defaultSourceMode: MemberSourceMode;
  canDelete: boolean;
  list: (cursor?: string | null) => Promise<BetaHistoryResponse | null>;
  get: (conversationId: string, before?: string | null) => Promise<BetaConversationResponse | null>;
  send: (conversationId: string | null, question: string, sourceMode: MemberSourceMode, idempotencyKey: string, resumeMessageId?: string | null) => Promise<{ ok: boolean; value: BetaConversationResponse | null }>;
  archive: (conversationId: string) => Promise<boolean>;
  delete?: (conversationId: string) => Promise<boolean>;
  href: (conversationId: string) => string | null;
};

function memberAdapter(fetcher: BetaChatFetch): BetaChatAdapter {
  return {
    kind: "member",
    defaultSourceMode: "published",
    canDelete: true,
    list: async (cursor) => {
      const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetcher(`/beta/api/chat${suffix}`, { cache: "no-store" });
      return response.ok ? parseMemberHistoryResponse(await response.json()) : null;
    },
    get: async (conversationId, before) => {
      const suffix = before ? `?before=${encodeURIComponent(before)}` : "";
      const response = await fetcher(`/beta/api/chat/${encodeURIComponent(conversationId)}${suffix}`, { cache: "no-store" });
      return response.ok ? parseMemberConversationResponse(await response.json()) : null;
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
  const href = (conversationId: string): string | null => /^cnv_[A-Za-z0-9-]{8,88}$/u.test(conversationId)
    ? `/beta/chat/${encodeURIComponent(conversationId)}`
    : null;
  return {
    kind: "operator",
    defaultSourceMode: "both",
    canDelete: false,
    list: async (cursor) => {
      const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetcher(`/ops/api/chat/conversations${suffix}`, { credentials: "same-origin", cache: "no-store" });
      const parsed = response.ok ? parseChatHistoryResponse(await response.json()) : null;
      if (!parsed) return null;
      return { conversations: parsed.conversations.map(mapConversation), nextCursor: parsed.nextCursor ?? null };
    },
    get: async (conversationId) => {
      const response = await fetcher(`/ops/api/chat/conversations/${encodeURIComponent(conversationId)}`, { credentials: "same-origin", cache: "no-store" });
      return response.ok ? operatorResponse(await response.json()) : null;
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

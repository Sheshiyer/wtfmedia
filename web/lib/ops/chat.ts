export type ChatView = "history" | "conversation";
export type ChatMessageRole = "user" | "assistant";

export type ChatPolicy = {
  archive: boolean;
  export: boolean;
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  sources?: unknown[];
  fallback?: boolean;
};

export type ChatConversation = {
  id: string;
  title: string;
  sourceMode: "published" | "uncut" | "both";
  state: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: ChatMessage[];
};

export type ChatHistoryResponse = {
  conversations: ChatConversation[];
  nextCursor?: string | null;
  policy: ChatPolicy;
};

export type ChatConversationResponse = {
  conversation: ChatConversation;
  policy: ChatPolicy;
};

export const CHAT_API_ROOT = "/ops/api/chat";
export const CHAT_ACTIVITY_EVENT = "wtfmedia:authenticated-chat-activity";

const CACHE_PREFIX = "wtfmedia:authenticated-chat:v1:";
const EPOCH_KEY = `${CACHE_PREFIX}activity-epoch`;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parsePolicy(value: unknown): ChatPolicy {
  if (!value || typeof value !== "object") return { archive: false, export: false };
  const policy = value as Record<string, unknown>;
  return {
    archive: policy.archive === true || policy.canArchive === true,
    export: policy.export === true || policy.canExport === true,
  };
}

function parseMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  const role = message.role === "user" || message.role === "assistant" ? message.role : null;
  const content = asString(message.content);
  if (!role || !content) return null;
  return {
    id: asString(message.id, `${role}-${content.slice(0, 16)}`),
    role,
    content,
    createdAt: asString(message.createdAt, asString(message.created_at, "")),
    sources: Array.isArray(message.sources) ? message.sources : undefined,
    fallback: message.fallback === true,
  };
}

function parseConversation(value: unknown): ChatConversation | null {
  if (!value || typeof value !== "object") return null;
  const conversation = value as Record<string, unknown>;
  const id = asString(conversation.id, asString(conversation.conversationId));
  if (!id) return null;
  const rawMessages = Array.isArray(conversation.messages) ? conversation.messages : undefined;
  return {
    id,
    title: asString(conversation.title, "untitled conversation"),
    sourceMode: conversation.sourceMode === "uncut" || conversation.sourceMode === "both"
      ? conversation.sourceMode
      : conversation.source_mode === "uncut" || conversation.source_mode === "both" ? conversation.source_mode : "published",
    state: conversation.state === "archived" || conversation.lifecycle_state === "archived" ? "archived" : "active",
    createdAt: asString(conversation.createdAt, asString(conversation.created_at, "")),
    updatedAt: asString(conversation.updatedAt, asString(conversation.updated_at, "")),
    messageCount: typeof conversation.messageCount === "number" ? conversation.messageCount : typeof conversation.message_count === "number" ? conversation.message_count : rawMessages?.length ?? 0,
    messages: rawMessages?.map(parseMessage).filter((message): message is ChatMessage => message !== null),
  };
}

export function parseChatHistoryResponse(value: unknown): ChatHistoryResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.conversations)) return null;
  const conversations = body.conversations.map(parseConversation).filter((item): item is ChatConversation => item !== null);
  return {
    conversations,
    nextCursor: typeof body.nextCursor === "string" ? body.nextCursor : null,
    policy: parsePolicy(body.policy),
  };
}

export function parseChatConversationResponse(value: unknown): ChatConversationResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const rawConversation = body.conversation && typeof body.conversation === "object" && !Array.isArray(body.conversation)
    ? body.conversation as Record<string, unknown>
    : body;
  const messages = Array.isArray(body.messages) ? body.messages : rawConversation.messages;
  const conversation = parseConversation({ ...rawConversation, ...(messages ? { messages } : {}) });
  if (!conversation) return null;
  return { conversation, policy: parsePolicy(body.policy) };
}

export function chatCacheKey(view: ChatView, conversationId?: string): string {
  return `${view}:${conversationId ?? "history"}`;
}

export function readChatCache<T>(key: string): T | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: T };
    return parsed && Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value ?? null : null;
  } catch {
    return null;
  }
}

export function writeChatCache<T>(key: string, value: T): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ epoch: readChatActivityEpoch(), value }));
  } catch {
    // A full or disabled browser cache must never make the server projection fail.
  }
}

export function readChatActivityEpoch(): number {
  const storage = browserStorage();
  if (!storage) return 0;
  const parsed = Number(storage.getItem(EPOCH_KEY));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function bumpChatActivityEpoch(): number {
  const next = readChatActivityEpoch() + 1;
  const storage = browserStorage();
  try {
    storage?.setItem(EPOCH_KEY, String(next));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHAT_ACTIVITY_EVENT, { detail: { epoch: next } }));
    }
  } catch {
    // Storage and event delivery are best effort; they do not grant access.
  }
  return next;
}

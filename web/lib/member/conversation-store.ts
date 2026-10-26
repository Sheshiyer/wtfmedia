import type { BetaConversation, BetaConversationResponse, BetaHistoryResponse } from "@/components/domain/beta/BetaChatAdapter";

/**
 * Client-side conversation store. The chat workspace and the session navigator
 * share it so a send pre-warms the route it navigates to, conversation switches
 * render from cache instantly, and archive/delete update the list without a
 * full history refetch. Module-level so it survives route remounts.
 */

type Listener = () => void;

const conversations = new Map<string, BetaConversationResponse>();
let history: BetaHistoryResponse | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeConversationStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function cachedConversation(id: string): BetaConversationResponse | null {
  return conversations.get(id) ?? null;
}

export function cachedHistory(): BetaHistoryResponse | null {
  return history;
}

function summary(conversation: BetaConversation): BetaConversation {
  const { messages: _messages, ...rest } = conversation;
  return rest;
}

/** Upsert a full conversation view: thread cache + the history list entry. */
export function upsertConversation(view: BetaConversationResponse): void {
  conversations.set(view.conversation.id, view);
  if (history) {
    const entry = summary(view.conversation);
    const rest = history.conversations.filter((item) => item.id !== entry.id);
    history = { conversations: [entry, ...rest], nextCursor: history.nextCursor };
  }
  emit();
}

/** Cache one history page; append merges a "load more" page. */
export function cacheHistory(page: BetaHistoryResponse, append = false): void {
  if (append && history) {
    const seen = new Set(history.conversations.map((item) => item.id));
    history = {
      conversations: [...history.conversations, ...page.conversations.filter((item) => !seen.has(item.id))],
      nextCursor: page.nextCursor,
    };
  } else {
    history = page;
  }
  emit();
}

export function markConversationArchived(id: string): void {
  conversations.delete(id);
  if (history) {
    history = { conversations: history.conversations.filter((item) => item.id !== id), nextCursor: history.nextCursor };
  }
  emit();
}

export function removeConversation(id: string): void {
  markConversationArchived(id);
}

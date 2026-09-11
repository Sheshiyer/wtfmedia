import type { ChatConversation, ChatConversationView, ChatMessage, ChatPage } from "./history.ts";
import type { MemberConversation, MemberConversationView, MemberMessage } from "./member-history.ts";

type BrowserChatConversation = Omit<ChatConversation, "operator_id" | "create_idempotency_key" | "operator_email" | "operator_display_name">;
type BrowserChatMessage = Omit<ChatMessage, "idempotency_key" | "request_id">;
type BrowserMemberConversation = Omit<MemberConversation, "member_id">;
type BrowserMemberMessage = Omit<MemberMessage, "idempotency_key" | "request_id">;

function operatorConversationDto({ operator_id: _operatorId, create_idempotency_key: _createKey, operator_email: _operatorEmail, operator_display_name: _operatorName, ...conversation }: ChatConversation): BrowserChatConversation {
  return conversation;
}

function operatorMessageDto({ idempotency_key: _idempotencyKey, request_id: _requestId, ...message }: ChatMessage): BrowserChatMessage {
  return message;
}

function memberConversationDto({ member_id: _memberId, ...conversation }: MemberConversation): BrowserMemberConversation {
  return conversation;
}

function memberMessageDto({ idempotency_key: _idempotencyKey, request_id: _requestId, ...message }: MemberMessage): BrowserMemberMessage {
  return message;
}

export function operatorChatViewDto(view: ChatConversationView) {
  return { conversation: operatorConversationDto(view.conversation), messages: view.messages.map(operatorMessageDto) };
}

export function operatorChatPageDto(page: ChatPage) {
  return { conversations: page.conversations.map(operatorConversationDto), nextCursor: page.nextCursor };
}

export function operatorChatConversationDto(conversation: ChatConversation) {
  return operatorConversationDto(conversation);
}

export function memberChatViewDto(view: MemberConversationView) {
  return {
    ...view,
    conversation: memberConversationDto(view.conversation),
    messages: view.messages.map(memberMessageDto),
  };
}

export function memberChatPageDto(page: { conversations: MemberConversation[]; nextCursor: string | null }) {
  return { conversations: page.conversations.map(memberConversationDto), nextCursor: page.nextCursor };
}

export function memberChatConversationDto(conversation: MemberConversation) {
  return memberConversationDto(conversation);
}

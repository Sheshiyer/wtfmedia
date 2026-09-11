const legacyAuthenticatedChatPath = "/chat/";

/**
 * Returns the opaque operator conversation id encoded in a legacy public URL.
 * Member conversation ids intentionally do not match this compatibility seam.
 */
export function legacyAuthenticatedChatConversationId(pathname: string): string | null {
  if (!pathname.startsWith(legacyAuthenticatedChatPath)) return null;

  const value = pathname.slice(legacyAuthenticatedChatPath.length);
  const separator = value.lastIndexOf("-");
  if (separator <= 0 || separator === value.length - 1) return null;

  const conversationId = value.slice(0, separator);
  const slug = value.slice(separator + 1);
  if (!/^cnv_[A-Za-z0-9_-]{8,88}$/u.test(conversationId)) return null;
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(slug)) return null;
  return conversationId;
}

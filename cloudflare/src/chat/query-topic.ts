import type { VectorMatchLike } from "./source-mode.ts";

const CONTEXT_REFERENCE = /\b(?:this|that|these|those|it|its|they|their|them|he|him|his|she|her|hers|same|previous|earlier|above|else|another|you said|you mentioned)\b/i;
const GENERIC_TOPIC = /^(?:more|everything|anything|something|nothing|all|timestamps?|examples?|the (?:discussion|topic|example|company|guest|episode|speaker|business))$/i;

/**
 * A concrete "about X" request supplies its own search subject. A relative
 * clause such as "that was discussed" describes X; it does not refer back to
 * the previous conversation. Leave genuinely referential turns to the model.
 */
export function standaloneTopic(question: string): string | null {
  const current = question.trim()
    .replace(/\s+(?:that|which)\s+(?:(?:is|was|are|were|has been|have been)\s+)?(?:discussed|mentioned|covered)\b/i, "")
    .replace(/\s+(?:on|in|from)\s+(?:the\s+)?(?:show|podcast|catalogue)[?.!]*$/i, "");
  if (CONTEXT_REFERENCE.test(current)) return null;
  const match = current.match(/\babout\s+(.+?)[?.!]*$/i);
  const topic = match?.[1].trim().replace(/[?.!]+$/, "").trim();
  if (!topic || topic.length > 160 || topic.split(/\s+/).length > 12
    || GENERIC_TOPIC.test(topic) || !/[\p{L}\p{N}]/u.test(topic)) return null;
  return topic;
}

function words(text: string): string[] {
  return text.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Promote actual passage mentions before the citation cap, without discarding
 * semantic matches or weakening episode/person scoping performed by the caller.
 * This must not depend on whether the query happens to contain "tell" or "say".
 */
export function prioritizeTopicPassages<T extends VectorMatchLike>(
  matches: readonly T[], topic: string | null, minScore: number,
): { matches: T[]; anchored: boolean } {
  const needle = topic ? words(topic) : [];
  if (!needle.length) return { matches: [...matches], anchored: false };
  const ranked = matches.map((match, index) => {
    const haystack = words(typeof match.metadata?.text === "string" ? match.metadata.text : "");
    const mentioned = typeof match.score === "number" && Number.isFinite(match.score) && match.score >= minScore
      && haystack.some((_, start) => needle.every((word, offset) => haystack[start + offset] === word));
    return { match, index, mentioned };
  });
  return {
    anchored: ranked.some((item) => item.mentioned),
    matches: ranked.sort((a, b) => Number(b.mentioned) - Number(a.mentioned) || a.index - b.index).map((item) => item.match),
  };
}

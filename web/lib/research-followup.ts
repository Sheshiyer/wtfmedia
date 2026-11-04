import type { ResearchProblem } from "../../shared/research-problems";

/** Only explicit research commands launch paid work. Ordinary follow-up questions remain chat. */
export function deepResearchCommand(text: string): boolean {
  text = text.replace(/^(?:can|could|would) you\s+/i, "");
  return /^(?:please\s+)?(?:start|run|do|conduct|perform)\s+(?:(?:an?|the)\s+)?(?:(?:full|deep|in[ -]depth|detailed)\s+)?research\b/i.test(text.trim())
    || /^(?:please\s+)?research\s+(?:problem|option|statement|this|that|the|first|second|third|fourth|fifth|sixth|about|on|into|how|why|whether)\b/i.test(text.trim());
}
export function researchSelection(text: string, problems: ResearchProblem[] = []): { selectedProblemId: string } | { problemQuestion: string } {
  text = text.replace(/^(?:can|could|would) you\s+/i, "");
  const words = ["first", "second", "third", "fourth", "fifth", "sixth"];
  const word = text.match(/\b(first|second|third|fourth|fifth|sixth)\s+(?:problem|option|statement)\b/i);
  const ordinal = text.match(/\b(?:problem|option|statement)\s*(?:number\s*|#)?([1-6])\b/i);
  const named = problems.find(p => text.toLowerCase().includes(p.title.toLowerCase()) || text.toLowerCase().includes(p.question.toLowerCase()));
  const selected = ordinal ? problems[Number(ordinal[1]) - 1] : word ? problems[words.indexOf(word[1].toLowerCase())] : named;
  if (selected) return {selectedProblemId: selected.id};
  return {problemQuestion: text.replace(/^(?:please\s+)?(?:(?:start|run|do|conduct|perform)\s+)?(?:(?:an?|the)\s+)?(?:(?:full|deep|in[ -]depth|detailed)\s+)?research\s*(?:on|about|into)?\s*[:—-]?\s*/i, "").trim()};
}

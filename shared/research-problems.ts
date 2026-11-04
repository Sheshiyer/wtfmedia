export type ResearchProblem = { id: string; title: string; question: string; why: string; domain: string; sourceIds: string[] };
export function validResearchProblem(value: unknown): value is ResearchProblem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return Object.keys(p).every(k => ['id', 'title', 'question', 'why', 'domain', 'sourceIds'].includes(k))
    && typeof p.id === 'string' && /^(?:p[1-6]|p_custom)$/.test(p.id)
    && ([['title', 100], ['question', 400], ['why', 400], ['domain', 100]] as const).every(([key, max]) => typeof p[key] === 'string' && (p[key] as string).trim().length > 0 && (p[key] as string).length <= max)
    && Array.isArray(p.sourceIds) && p.sourceIds.length >= (p.id === "p_custom" ? 0 : 1) && p.sourceIds.length <= 4
    && p.sourceIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100)
    && new Set(p.sourceIds).size === p.sourceIds.length;
}
export function validResearchProblems(value: unknown): value is ResearchProblem[] {
  return Array.isArray(value) && value.length >= 2 && value.length <= 6 && value.every(p => validResearchProblem(p) && p.id !== "p_custom")
    && new Set(value.map(p => p.id)).size === value.length;
}

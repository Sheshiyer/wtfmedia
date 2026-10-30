/** Schema v2 remains readable: each field is a newline-separated list, never comma-split. */
export const RESEARCH_INPUT_KEYS = ["guestName", "companyName", "industry"] as const;
export const MAX_RESEARCH_NAMES = 10;
export const MAX_NAMES_PER_FIELD = 5;
export function researchNames(value: string): string[] {
  const seen = new Set<string>();
  return value.split(/\r?\n/u).map(name => name.trim().normalize("NFC")).filter(name => {
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function normalizeResearchInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid research input");
  const input = value as Record<string, unknown>;
  if (input.audienceCountry !== "IN") throw new Error("Invalid audience");
  const lists = RESEARCH_INPUT_KEYS.map(key => {
    const raw = input[key] === undefined ? "" : input[key];
    if (typeof raw !== "string" || raw.length > 604) throw new Error("Invalid research names");
    const names = researchNames(raw);
    if (names.length > MAX_NAMES_PER_FIELD || names.some(name => name.length < 2 || name.length > 120)) throw new Error("Invalid research names");
    return names;
  });
  const count = lists.reduce((n, names) => n + names.length, 0);
  if (count < 1 || count > MAX_RESEARCH_NAMES) throw new Error("Invalid research name count");
  return { guestName: lists[0].join("\n"), companyName: lists[1].join("\n"), industry: lists[2].join("\n"), audienceCountry: "IN" as const };
}
export function researchInputLabel(input: {guestName: string; companyName: string; industry: string}, separator = " — ") {
  return RESEARCH_INPUT_KEYS.map(key => researchNames(input[key]).join(", ")).filter(Boolean).join(separator);
}

export const MAX_MEMORY_CONTENT_LENGTH = 2000;
export const MAX_PREFERENCE_CANDIDATES = 24;

export type MemberMemory = {
  id: string;
  content: string;
  state: "active";
  createdAt?: string;
  updatedAt?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asString = (value: unknown): string => typeof value === "string" ? value : "";

function memoryRecord(value: unknown): MemberMemory | null {
  const item = asRecord(value);
  const id = asString(item?.id).trim();
  const content = asString(item?.content).trim();
  const state = item?.state ?? item?.lifecycle_state;
  if (!id || !content || content.length > MAX_MEMORY_CONTENT_LENGTH || state === "archived") return null;
  return {
    id,
    content,
    state: "active",
    createdAt: asString(item?.createdAt ?? item?.created_at) || undefined,
    updatedAt: asString(item?.updatedAt ?? item?.updated_at) || undefined,
  };
}

/** Parse the member memory response without exposing archived entries to this view. */
export function parseMemberMemoryResponse(value: unknown): MemberMemory[] {
  const body = asRecord(value);
  if (!body) return [];
  const raw = Array.isArray(body.memories)
    ? body.memories
    : body.memory
      ? [body.memory]
      : [];
  return raw.map(memoryRecord).filter((item): item is MemberMemory => item !== null);
}

/**
 * Parse pasted preference output locally. This is deliberately presentation-only:
 * callers must decide which candidate to save and when to send it to the server.
 */
export function parsePreferenceCandidates(input: unknown): string[] {
  if (typeof input !== "string") return [];
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of input.split(/\r?\n/u)) {
    const line = rawLine
      .trim()
      .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/u, "")
      .trim();
    if (!line || line.length > MAX_MEMORY_CONTENT_LENGTH || seen.has(line)) continue;
    seen.add(line);
    candidates.push(line);
    if (candidates.length >= MAX_PREFERENCE_CANDIDATES) break;
  }
  return candidates;
}

export type MemberMemoryRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function saveMemberMemory(request: MemberMemoryRequest, content: string): Promise<MemberMemory | null> {
  const normalized = content.trim();
  if (!normalized || normalized.length > MAX_MEMORY_CONTENT_LENGTH) return null;
  const response = await request("/beta/api/memory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: normalized }),
  });
  if (!response.ok) return null;
  try {
    return memoryRecord((await response.json() as Record<string, unknown>)?.memory);
  } catch {
    return null;
  }
}

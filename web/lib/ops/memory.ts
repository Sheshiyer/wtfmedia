export type MemoryRecord = {
  id: string;
  content: string;
  sourceConversationId: string | null;
  state: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type MemoryPolicy = { archive: boolean; create: boolean };
export type MemoryResponse = { memories: MemoryRecord[]; policy: MemoryPolicy };

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function record(value: unknown): MemoryRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const id = stringValue(item.id);
  const content = stringValue(item.content);
  if (!id || !content) return null;
  return {
    id,
    content,
    sourceConversationId: stringValue(item.sourceConversationId ?? item.source_conversation_id) || null,
    state: item.state === "archived" || item.lifecycle_state === "archived" ? "archived" : "active",
    createdAt: stringValue(item.createdAt ?? item.created_at),
    updatedAt: stringValue(item.updatedAt ?? item.updated_at),
    archivedAt: stringValue(item.archivedAt ?? item.archived_at) || null,
  };
}

export function parseMemoryResponse(value: unknown): MemoryResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const rawMemories = Array.isArray(body.memories) ? body.memories : body.memory ? [body.memory] : null;
  if (!rawMemories) return null;
  const policy = body.policy && typeof body.policy === "object" ? body.policy as Record<string, unknown> : {};
  return {
    memories: rawMemories.map(record).filter((item): item is MemoryRecord => item !== null),
    policy: { archive: policy.archive === true, create: policy.create === true },
  };
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_MEMORY_CONTENT_LENGTH,
  parsePreferenceCandidates,
  parseMemberMemoryResponse,
} from "@/lib/member/memory";

const importPrompt = readFileSync(new URL("../../components/domain/member/PreferenceImportPrompt.tsx", import.meta.url), "utf8");

describe("member memory preference import", () => {
  it("parses pasted list output locally into bounded, editable candidates", () => {
    expect(parsePreferenceCandidates("- Prefer concise answers\n2. Show the source trail\n\n- Prefer concise answers")).toEqual([
      "Prefer concise answers",
      "Show the source trail",
    ]);
    expect(parsePreferenceCandidates("   ")).toEqual([]);
    expect(parsePreferenceCandidates("x".repeat(MAX_MEMORY_CONTENT_LENGTH + 1))).toEqual([]);
  });

  it("accepts only active, valid member memory records from the response", () => {
    expect(parseMemberMemoryResponse({ memories: [
      { id: "mmem_1", content: "active", state: "active" },
      { id: "mmem_2", content: "archived", state: "archived" },
      { id: "", content: "invalid" },
    ] })).toEqual([
      { id: "mmem_1", content: "active", state: "active" },
    ]);
  });

  it("only sends a bounded preference when the caller explicitly saves it", async () => {
    const requests: Request[] = [];
    const request = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(new URL(String(input), "https://example.test"), init));
      return Response.json({ memory: { id: "mmem_saved", content: "short", state: "active" } }, { status: 201 });
    };
    const { saveMemberMemory } = await import("@/lib/member/memory");
    expect(await saveMemberMemory(request, "  short  ")).toMatchObject({ id: "mmem_saved" });
    expect(await saveMemberMemory(request, "x".repeat(MAX_MEMORY_CONTENT_LENGTH + 1))).toBeNull();
    expect(requests).toHaveLength(1);
    expect(await requests[0].clone().json()).toEqual({ content: "short" });
  });

  it("does not auto-save pasted candidates and exposes a per-candidate action", () => {
    expect(importPrompt).toContain("parsePreferenceCandidates");
    expect(importPrompt).toContain("save candidate");
    expect(importPrompt).toContain("onSave");
    expect(importPrompt).not.toMatch(/useEffect\([\s\S]*fetch\(/);
    expect(importPrompt).toContain("key={index}");
    expect(importPrompt).not.toContain('key={`${index}-${candidate}`}');
  });
});

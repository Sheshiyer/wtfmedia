import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePrincipalContext, principalCanAccess } from "@/lib/beta/principal";

const workspace = readFileSync(resolve(process.cwd(), "app/(operator)/ops/chat/ChatWorkspace.tsx"), "utf8");
const askComposer = readFileSync(resolve(process.cwd(), "components/domain/public/AskComposer.tsx"), "utf8");

const operator = parsePrincipalContext({
  kind: "operator",
  role: "admin",
  email: "operator@example.com",
  landingRoute: "/beta/workspace",
  capabilities: ["beta:read", "chat:read", "chat:write"],
  environment: "staging",
});

describe("canonical Beta operator chat", () => {
  it("admits operators to canonical history and conversation routes", () => {
    expect(operator).not.toBeNull();
    if (!operator) return;

    expect(principalCanAccess(operator, "/beta/chat")).toBe(true);
    expect(principalCanAccess(operator, "/beta/chat/cnv_12345678")).toBe(true);
    expect(principalCanAccess(operator, "/beta/chat/not-a-conversation")).toBe(false);
    expect(principalCanAccess(operator, "/beta/private-unknown")).toBe(false);
  });

  it("keeps the Alpha composer lock and removes operator evidence selection", () => {
    expect(workspace).toContain('body: JSON.stringify({ question: value, sourceMode: "both" })');
    expect(workspace).toContain('data-chat-source-mode="both"');
    expect(workspace).toContain("evidence: both timelines");
    expect(workspace).not.toContain("<select");
    expect(workspace).not.toContain("setMode");
    expect(workspace).toContain("company beta · private workspace");
    expect(workspace).toContain('data-chat-frame="alpha"');
    expect(workspace).toContain('<h1 className="mt-1 font-display text-lg font-extrabold lowercase">ask wtf</h1>');
    expect(workspace).toContain('max-w-[var(--wtf-content-max)]');
    expect(askComposer).toContain("disabled={disabled || loading}");
  });
});

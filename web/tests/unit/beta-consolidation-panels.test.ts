import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Beta consolidation admin panels", () => {
  it("projects memory as disabled and separate from durable history", () => {
    const panel = source("components/domain/ops/MemoryGovernancePanel.tsx");

    expect(panel).toMatch(/automatic extraction/i);
    expect(panel).toContain("not activated");
    expect(panel).toContain("durable account history");
    expect(panel).toContain("saved memory");
    for (const control of ["explicit save", "source provenance", "owner scope", "retention", "archive", "export", "audit"]) {
      expect(panel).toContain(control);
    }
    for (const sensitiveField of ["prompt", "answer", "token", "secret", "private payload"]) {
      expect(panel).not.toContain(`{${sensitiveField}`);
    }
  });

  it("keeps the RAG panel read-only and receipt-bound", () => {
    const panel = source("components/domain/ops/RagSourceHealthPanel.tsx");

    for (const receipt of ["55 / 55", "49 / 49", "11,948", "not observed", "published-only safe default", "timeline alignment unverified"]) {
      expect(panel).toContain(receipt);
    }
    for (const mode of ["published", "uncut", "both"]) expect(panel).toContain(mode);
    for (const exception of ["WTF is a Battery?", "WEF - Economics", "The Foundery", "Brain Armstrong transcript-row mismatch"]) {
      expect(panel).toContain(exception);
    }
    expect(panel).toContain("read-only");
    expect(panel).not.toContain("useState");
    expect(panel).not.toContain("fetch(");
  });

  it("shows sessions, protected admin links, and pending Access verification", () => {
    const panel = source("components/domain/ops/SessionHistoryPolicyPanel.tsx");
    const administration = source("components/domain/ops/OperatorAdministrationPanel.tsx");
    const settings = source("app/(operator)/ops/settings/page.tsx");

    for (const value of ["Cloudflare Access JWT", "server / D1 operator record", "720 hours", "MFA precedence", "archive-only", "admin export", "verification pending"]) {
      expect(panel).toContain(value);
    }
    for (const href of ["/ops/chat", "/ops/operators", "/ops/audit"]) expect(panel).toContain(href);
    for (const value of ["operator access", "roster read", "seat mutations", "super-admin transfer", "server-authorized"]) {
      expect(administration).toContain(value);
    }
    for (const component of ["SessionHistoryPolicyPanel", "MemoryGovernancePanel", "RagSourceHealthPanel", "OperatorAdministrationPanel"]) {
      expect(settings).toContain(component);
    }
  });
});

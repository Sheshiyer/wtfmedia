import { describe, expect, it } from "vitest";
import { parseAuditFilters } from "@/lib/ops/audit-filters";

describe("audit-filters", () => {
  it("accepts only closed allowlisted filter values", () => {
    expect(parseAuditFilters(new URLSearchParams("action=operator_invite&outcome=succeeded&role=admin&environment=local"))).toEqual({ action: "operator_invite", outcome: "succeeded", role: "admin", environment: "local", before: undefined, after: undefined });
  });

  it("rejects raw-query keys, unknown values, and malformed timestamps", () => {
    for (const query of ["sql=SELECT+1", "action=drop_table", "role=owner", "before=tomorrow"]) expect(parseAuditFilters(new URLSearchParams(query))).toBeNull();
  });
});

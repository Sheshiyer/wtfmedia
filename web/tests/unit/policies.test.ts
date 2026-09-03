import { describe, expect, it } from "vitest";
import { checkPolicy } from "../../lib/auth/policies";

describe("protected policy projection", () => {
  it("denies unknown protected paths and keeps editor navigation privileges bounded", () => {
    expect(checkPolicy("editor", "/ops")).toBe(true);
    expect(checkPolicy("editor", "/ops/production")).toBe(true);
    expect(checkPolicy("editor", "/ops/chat")).toBe(true);
    expect(checkPolicy("editor", "/ops/operators")).toBe(false);
    expect(checkPolicy("editor", "/ops/audit")).toBe(false);
    expect(checkPolicy("editor", "/ops/unknown")).toBe(false);
    expect(checkPolicy(null, "/ops")).toBe(false);
  });

  it("allows public paths explicitly and recognizes super-admin administrative access", () => {
    expect(checkPolicy(null, "/chat")).toBe(true);
    expect(checkPolicy("super_admin", "/ops/operators")).toBe(true);
    expect(checkPolicy("super_admin", "/ops/audit")).toBe(true);
    expect(checkPolicy("super_admin", "/ops/production")).toBe(true);
  });
});

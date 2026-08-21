/**
 * Public route/query manifest contract.
 *
 * Proves the compatibility manifest's protected_routes list matches the
 * PROTECTED_PUBLIC_ROUTES allowlist in web/lib/public/contracts.ts, and that
 * the documented /chat?q= autosubmit examples (and unrelated query params
 * alongside them) parse and survive as expected.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHAT_QUERY_AUTOSUBMIT_EXAMPLES, PROTECTED_PUBLIC_ROUTES } from "@/lib/public/contracts";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(here, "../..");

function readJson(relPath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(WEB_ROOT, relPath), "utf8"));
}

describe("public-routes contract — protected routes manifest", () => {
  it("matches PROTECTED_PUBLIC_ROUTES exactly", () => {
    const manifest = readJson("tests/contracts/phase1-compatibility-manifest.json") as {
      protected_routes: string[];
    };
    expect(manifest.protected_routes).toEqual(Array.from(PROTECTED_PUBLIC_ROUTES));
  });
});

describe("public-routes contract — chat autosubmit examples", () => {
  it("each example URL targets /chat with a non-empty q parameter", () => {
    for (const example of CHAT_QUERY_AUTOSUBMIT_EXAMPLES) {
      const url = new URL(example, "http://localhost:3000");
      expect(url.pathname).toBe("/chat");
      const q = url.searchParams.get("q");
      expect(q).toBeTruthy();
      expect((q ?? "").length).toBeGreaterThan(0);
    }
  });

  it("preserves unrelated query parameters alongside q", () => {
    const url = new URL("/chat?q=hello&utm_source=x&ref=y", "http://localhost:3000");
    expect(url.pathname).toBe("/chat");
    expect(url.searchParams.get("q")).toBe("hello");
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("ref")).toBe("y");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { originAllowed } from "../src/http/cors.ts";

describe("cors origin allowlist", () => {
  test("accepts exact origins from a comma separated list", () => {
    const allowed = "https://wtfhq.in, https://wtfmedia-web.connect2nikhai.workers.dev";
    assert.equal(originAllowed("https://wtfhq.in", allowed), true);
    assert.equal(originAllowed("https://wtfmedia-web.connect2nikhai.workers.dev", allowed), true);
    assert.equal(originAllowed("https://evil.example", allowed), false);
  });
});

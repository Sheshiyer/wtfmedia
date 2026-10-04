import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

class Element {
  className = "";
  textContent = "";
  children: Element[] = [];
  scrollTop = 0;
  scrollHeight = 1;
  append(...nodes: Element[]) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
}

describe("production analytics assistant", () => {
  it("replaces fixture responses with the protected API and renders data as text", async () => {
    const conversation = new Element();
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      status: "answered", answer: "Verified API answer", scope: { videoId: "video_test1" },
      metrics: [{ label: "Net subscriber growth", value: 75 }],
      sources: [{ label: "<script>untrusted title</script>", url: "https://www.youtube.com/watch?v=video_test1" }],
    }) });
    const context = vm.createContext({
      document: { querySelector: () => conversation, createElement: () => new Element() },
      fetch, URL, AbortSignal, Date, console,
      range: () => ({ from: "2026-09-01", to: "2026-09-30" }),
      state: { episode: "all" }, answer: vi.fn(),
    });
    vm.runInContext(readFileSync("public/analytics-demo/analytics-assistant.js", "utf8"), context);
    await context.answer('Subscriber growth for "Example"?');
    expect(fetch.mock.calls[0][0]).toBe("/beta/api/analytics/assistant");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(conversation.children.at(-1)?.textContent).toBe("Verified API answer");
    const list = conversation.children.at(-1)?.children[0];
    expect(list?.children[1].textContent).toBe("75");
    expect(conversation.children.at(-1)?.children[1].children[0].textContent).toBe("<script>untrusted title</script>");
  });
});

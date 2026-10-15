import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const hooks = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)>, reload: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useState: (initial: unknown) => [initial === true ? false : initial, initial === 0 ? hooks.reload : vi.fn()],
}));
vi.mock("@/components/domain/beta/BetaPrincipalGate", () => ({
  useMemberFetch: () => vi.fn(),
  useBetaPrincipal: () => ({ capabilities: ["research:read", "research:write"] }),
}));
import { ResearchWorkspace } from "@/components/domain/beta/ResearchWorkspace";

afterEach(() => { vi.useRealTimers(); hooks.effects.length = 0; hooks.reload.mockClear(); });
it("offers retry and separates new research from saved briefs during an outage", () => {
  const html = renderToStaticMarkup(createElement(ResearchWorkspace));
  expect(html).toContain("Retry connection");
  expect(html).toContain('aria-label="New research"');
  expect(html.indexOf("</form>")).toBeLessThan(html.indexOf("<aside"));
  expect(html).toContain("Your research brief");
  expect(html).not.toContain('type="file"');
  expect(html).not.toContain("YouTube video ID");
});
it("rechecks an unavailable connection and clears its timer on unmount", () => {
  vi.useFakeTimers();
  renderToStaticMarkup(createElement(ResearchWorkspace));
  // SSR suppresses effects; exercise the connection recovery effect with an offline state.
  const cleanup = hooks.effects.at(-1)!();
  vi.advanceTimersByTime(30000);
  expect(hooks.reload).toHaveBeenCalledOnce();
  if (cleanup) cleanup();
  hooks.reload.mockClear();
  const cancelled = hooks.effects.at(-1)!();
  if (cancelled) cancelled();
  vi.advanceTimersByTime(30000);
  expect(hooks.reload).not.toHaveBeenCalled();
});

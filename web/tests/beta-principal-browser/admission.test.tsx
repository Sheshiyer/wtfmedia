import { act, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  auth: { isLoaded: true, isSignedIn: true as boolean | undefined, userId: "fixture-a" as string | undefined, sessionId: "fixture-session-a" as string | undefined, getToken: vi.fn() },
  pathname: "/beta/research",
  router: { replace: vi.fn() },
  navigate: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => runtime.auth }));
vi.mock("next/navigation", () => ({
  usePathname: () => runtime.pathname,
  useRouter: () => runtime.router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    <a {...props} href={href} onClick={event => { event.preventDefault(); runtime.navigate(href); }}>{children}</a>,
}));

import { BetaPrincipalGate, useBetaPrincipal, useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";

const principal = (email = "a@example.test") => ({
  kind: "operator", role: "admin", email, canonicalLanding: "/beta/workspace", environment: "local",
  capabilities: ["beta:read", "chat:read", "research:read", "analytics:read"],
});
const jsonResponse = (value: unknown, status = 200) => Object.assign(Response.json(value, { status }), { json: async () => value });
const response = (email?: string) => jsonResponse(principal(email));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
let root: Root;
let container: HTMLDivElement;
let mounts: number;
let api: ReturnType<typeof useMemberFetch>;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let originalUrl: string;
const onPopState = () => { runtime.navigate(location.pathname, false); };

function PrivatePage() {
  const context = useBetaPrincipal();
  api = useMemberFetch();
  const [draft, setDraft] = useState("");
  useEffect(() => { mounts++; }, []);
  return <section data-private><p>{context.email}</p><button onClick={() => setDraft("private draft")}>Edit draft</button><p>{draft}</p></section>;
}
async function render() {
  await act(async () => { root.render(<BetaPrincipalGate><PrivatePage /></BetaPrincipalGate>); });
}
const privatePage = () => container.querySelector("[data-private]");

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  runtime.auth = { isLoaded: true, isSignedIn: true, userId: "fixture-a", sessionId: "fixture-session-a", getToken: vi.fn().mockResolvedValue("fixture-token") };
  runtime.pathname = "/beta/research";
  runtime.router.replace.mockReset();
  originalUrl = location.href;
  window.addEventListener("popstate", onPopState);
  runtime.navigate.mockImplementation((path: string, push = true) => {
    if (push) history.pushState(null, "", path);
    runtime.pathname = path;
    root.render(<BetaPrincipalGate><PrivatePage /></BetaPrincipalGate>);
  });
  fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => response());
  vi.stubGlobal("fetch", fetchMock);
  mounts = 0;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.removeEventListener("popstate", onPopState);
  history.replaceState(null, "", originalUrl);
  vi.unstubAllGlobals();
});

it("shows public page placeholders without an access screen until admission, including hard refresh", async () => {
  const pending = deferred<Response>();
  fetchMock.mockReturnValue(pending.promise);
  await render();
  expect(privatePage()).toBeNull();
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(container.querySelector('[role="status"]')?.classList.contains("sr-only")).toBe(true);
  expect(container.querySelector('[data-workspace-loading] [data-wtfos-wordmark-mini]')).not.toBeNull();
  expect(container.querySelector('[data-navigation-toggle]')).toBeNull();
  expect(container.querySelector("h1")).toBeNull();
  expect(container.textContent).not.toContain("checking access");
  expect(container.textContent).not.toContain("Loading workspace");
  expect(container.textContent).not.toContain("beta access");
  await act(async () => pending.resolve(response()));
  expect(privatePage()).not.toBeNull();
  await act(async () => root.unmount());
  root = createRoot(container);
  const refreshed = deferred<Response>();
  fetchMock.mockReturnValue(refreshed.promise);
  await render();
  expect(privatePage()).toBeNull();
  expect(container.querySelector("[data-workspace-loading]")).not.toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => refreshed.resolve(response()));
});

it("does not restart pending admission when the route changes", async () => {
  const pending = deferred<Response>();
  fetchMock.mockReturnValue(pending.promise);
  await render();
  runtime.pathname = "/beta/analytics";
  await render();
  runtime.pathname = "/beta/social-analytics";
  await render();
  expect(privatePage()).toBeNull();
  expect(fetchMock).toHaveBeenCalledOnce();
  await act(async () => pending.resolve(response()));
  expect(privatePage()).not.toBeNull();
  expect(container.querySelector("[data-workspace-loading]")).toBeNull();
});

it("uses the latest destination when a pending admission loses authentication", async () => {
  const pending = deferred<Response>();
  fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValue(new Response(null, { status: 401 }));
  await render();
  runtime.pathname = "/beta/social-analytics";
  await render();
  await act(async () => pending.resolve(new Response(null, { status: 401 })));
  expect(privatePage()).toBeNull();
  expect(runtime.router.replace).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fbeta%2Fsocial-analytics");
});

it("keeps the admitted subtree and one admission through navigation, back/forward and token-hook changes", async () => {
  await render();
  const firstPage = privatePage();
  const firstFetch = api;
  for (const path of ["/beta/chat", "/beta/analytics", "/beta/settings", "/beta/research"]) {
    await act(async () => { container.querySelector<HTMLButtonElement>("[data-navigation-toggle]")!.click(); });
    await act(async () => { container.querySelector<HTMLAnchorElement>(`[data-navigation-disclosure] a[href="${path}"]`)!.click(); });
    expect(privatePage()).toBe(firstPage);
    expect(api).toBe(firstFetch);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain("checking access");
  }
  for (const direction of ["back", "forward"] as const) {
    await act(async () => {
      const popped = new Promise<void>(resolve => window.addEventListener("popstate", () => resolve(), { once: true }));
      history[direction]();
      await popped;
    });
    expect(privatePage()).toBe(firstPage);
  }
  runtime.auth = { ...runtime.auth, getToken: vi.fn().mockResolvedValue("fixture-refreshed-token") };
  await render();
  expect(privatePage()).toBe(firstPage);
  expect(api).toBe(firstFetch);
  expect(mounts).toBe(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps the fetch callback through a loaded-flag transition without bypassing the loading guard", async () => {
  await render();
  const firstFetch = api;
  runtime.auth = { ...runtime.auth, isLoaded: false };
  await render();
  expect(privatePage()).toBeNull();
  runtime.auth = { ...runtime.auth, isLoaded: true };
  await render();
  expect(privatePage()).not.toBeNull();
  expect(api).toBe(firstFetch);
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("uses the current token hook and redirect destination through a retained fetch callback", async () => {
  await render();
  const retainedFetch = api;
  runtime.pathname = "/beta/settings";
  runtime.auth = { ...runtime.auth, getToken: vi.fn().mockResolvedValue("fixture-refreshed-token") };
  await render();
  await act(async () => { await retainedFetch("/beta/api/conversations"); });
  const headers = new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);
  expect(headers.get("authorization")).toBe("Bearer fixture-refreshed-token");
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
  await act(async () => { await retainedFetch("/beta/api/conversations"); });
  expect(runtime.router.replace).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fbeta%2Fsettings");
});

it("checks destination capabilities synchronously without another admission request", async () => {
  await render();
  runtime.pathname = "/beta/admin/users";
  await render();
  expect(privatePage()).toBeNull();
  expect(container.textContent).toContain("access is not granted");
  expect(fetchMock).toHaveBeenCalledOnce();
});

it.each(["account", "session", "unknown"])("clears private state on %s change and re-admits", async change => {
  await render();
  await act(async () => container.querySelector<HTMLButtonElement>("[data-private] button")!.click());
  const pending = deferred<Response>();
  fetchMock.mockReturnValue(pending.promise);
  runtime.auth = { ...runtime.auth, ...(change === "account" ? { userId: "fixture-b", sessionId: "fixture-session-b" } : change === "session" ? { sessionId: "fixture-session-new" } : { isLoaded: false, isSignedIn: undefined, userId: undefined, sessionId: undefined }) };
  await render();
  expect(privatePage()).toBeNull();
  expect(container.textContent).not.toContain("private draft");
  if (change === "unknown") {
    runtime.auth = { ...runtime.auth, isLoaded: true, isSignedIn: true, userId: "fixture-a", sessionId: "fixture-session-a" };
    await render();
    expect(privatePage()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }
  await act(async () => pending.resolve(response("b@example.test")));
  expect(container.textContent).toContain("b@example.test");
  expect(container.textContent).not.toContain("private draft");
});

it("redirects a signed-out deep link without mounting private content or fetching admission", async () => {
  runtime.auth = { ...runtime.auth, isSignedIn: false, userId: undefined, sessionId: undefined };
  runtime.pathname = "/beta/settings/sessions";
  await render();
  expect(privatePage()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(runtime.router.replace).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fbeta%2Fsettings%2Fsessions");
});

it("never admits an incomplete identity or an initially unloaded Clerk session", async () => {
  runtime.auth = { ...runtime.auth, sessionId: undefined };
  await render();
  expect(privatePage()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  runtime.auth = { ...runtime.auth, sessionId: "fixture-session-a", isLoaded: false };
  await render();
  expect(privatePage()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("removes an admitted account on sign-out and never shows it to a denied second user", async () => {
  await render();
  runtime.auth = { ...runtime.auth, isSignedIn: false, userId: undefined, sessionId: undefined };
  await render();
  expect(privatePage()).toBeNull();
  fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
  runtime.auth = { ...runtime.auth, isSignedIn: true, userId: "fixture-b", sessionId: "fixture-session-b" };
  await render();
  expect(privatePage()).toBeNull();
  expect(container.textContent).not.toContain("a@example.test");
  expect(container.textContent).toContain("access is not granted");
});

it("does not send a request whose token resolves after a session switch", async () => {
  await render();
  const token = deferred<string>();
  runtime.auth.getToken.mockReturnValueOnce(token.promise);
  const request = api("/beta/api/conversations").catch(error => error);
  runtime.auth = { ...runtime.auth, userId: "fixture-b", sessionId: "fixture-session-b" };
  await render();
  await act(async () => token.resolve("fixture-old-token"));
  expect(await request).toBeInstanceOf(Error);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([401, 403])("removes private content after protected API denial %s and cannot reuse it on navigation", async status => {
  await render();
  fetchMock.mockResolvedValue(new Response(null, { status }));
  await act(async () => { expect((await api("/beta/api/conversations")).status).toBe(status); });
  expect(privatePage()).toBeNull();
  runtime.pathname = "/beta/settings";
  await render();
  expect(privatePage()).toBeNull();
  if (status === 401) expect(runtime.router.replace).toHaveBeenCalled();
  else expect(container.textContent).toContain("access is not granted");
});

it("retains the workspace when one fresh token recovers a 401", async () => {
  await render();
  const firstPage = privatePage();
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 200 }));
  await act(async () => { expect((await api("/beta/api/conversations")).status).toBe(200); });
  expect(privatePage()).toBe(firstPage);
  expect(runtime.auth.getToken).toHaveBeenLastCalledWith({ skipCache: true });
});

it("does not replay an old request with the new session or let its denial revoke the new account", async () => {
  await render();
  const old = deferred<Response>();
  fetchMock.mockReturnValueOnce(old.promise);
  const request = api("/beta/api/conversations").catch(error => error);
  await act(async () => { await Promise.resolve(); });
  runtime.auth = { ...runtime.auth, userId: "fixture-b", sessionId: "fixture-session-b" };
  fetchMock.mockResolvedValue(response("b@example.test"));
  await render();
  await act(async () => old.resolve(new Response(null, { status: 401 })));
  expect(await request).toBeInstanceOf(Error);
  expect(container.textContent).toContain("b@example.test");
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("ignores an admission body that finishes after sign-out", async () => {
  const body = deferred<ReturnType<typeof principal>>();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => body.promise } as Response);
  await render();
  runtime.auth = { ...runtime.auth, isSignedIn: false, userId: undefined, sessionId: undefined };
  await render();
  await act(async () => body.resolve(principal()));
  runtime.auth = { ...runtime.auth, isSignedIn: true, userId: "fixture-a", sessionId: "fixture-session-a" };
  const next = deferred<Response>();
  fetchMock.mockReturnValue(next.promise);
  await render();
  expect(privatePage()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => next.resolve(response()));
});

it.each([403, 503, 200])("fails closed for initial denial, outage or malformed admission (%s)", async status => {
  fetchMock.mockResolvedValue(jsonResponse({}, status));
  await render();
  expect(privatePage()).toBeNull();
  expect(container.textContent).toContain(status === 403 ? "access is not granted" : "workspace unavailable");
  if (status !== 403) {
    fetchMock.mockResolvedValue(response());
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(privatePage()).not.toBeNull();
  }
});

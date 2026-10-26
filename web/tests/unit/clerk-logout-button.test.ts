import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadLogoutButton(signOut = vi.fn()) {
  const filename = new URL("../../components/domain/ops/ClerkLogoutButton.tsx", import.meta.url);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename.pathname,
  }).outputText;
  const loaded: { exports: Record<string, unknown> } = { exports: {} };
  const scopedRequire = (id: string) => {
    if (id === "@clerk/nextjs") return { useClerk: () => ({ signOut }) };
    if (id === "next/link") return { __esModule: true, default: function Link() {} };
    return require(id);
  };
  Function("require", "module", "exports", compiled)(scopedRequire, loaded, loaded.exports);
  return loaded.exports.ClerkLogoutButton as () => ReactElement<{ onClick?: () => void }>;
}

function memoryStorage(entries: Record<string, string>): Storage {
  const values = new Map(Object.entries(entries));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("Clerk logout fallback", () => {
  const originalPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  afterEach(() => {
    if (originalPublishableKey === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublishableKey;
    vi.unstubAllGlobals();
  });

  it("clears protected caches and leaves private history through fail-closed recovery when Clerk is unavailable", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const localStorage = memoryStorage({ "wtf-ops:context": "private", unrelated: "keep" });
    const sessionStorage = memoryStorage({ "wtfmedia:authenticated-chat:history": "private" });
    const replace = vi.fn();
    vi.stubGlobal("window", { localStorage, sessionStorage, location: { replace } });

    const control = loadLogoutButton()();
    expect(control.type).toBe("button");
    expect(control.props.onClick).toBeTypeOf("function");
    control.props.onClick?.();

    expect(localStorage.getItem("wtf-ops:context")).toBeNull();
    expect(sessionStorage.getItem("wtfmedia:authenticated-chat:history")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(replace).toHaveBeenCalledWith("/ops/recover?mode=verification-unavailable&returnTo=/beta/settings/account");
  });

  it("uses the browser Clerk session when the public key was unavailable at bundle time", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const signOut = vi.fn().mockResolvedValue(undefined);
    const replace = vi.fn();
    vi.stubGlobal("window", {
      Clerk: { signOut },
      localStorage: memoryStorage({ "wtf-ops:context": "private" }),
      sessionStorage: memoryStorage({ "wtfmedia:authenticated-chat:history": "private" }),
      location: { replace },
    });

    const control = loadLogoutButton()();
    control.props.onClick?.();

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("invokes configured Clerk sign-out and sends provider failures to truthful recovery", async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_configured";
    const signOut = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const replace = vi.fn();
    vi.stubGlobal("window", {
      localStorage: memoryStorage({}),
      sessionStorage: memoryStorage({}),
      location: { replace },
    });

    const wrapper = loadLogoutButton(signOut)();
    if (typeof wrapper.type !== "function") throw new Error("configured_logout_wrapper_missing");
    const Wrapper = wrapper.type as (props: typeof wrapper.props) => ReactElement<{ onClick?: () => void }>;
    const control = Wrapper(wrapper.props);
    control.props.onClick?.();
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/ops/recover?mode=verification-unavailable&returnTo=/beta/settings/account"));
  });
});

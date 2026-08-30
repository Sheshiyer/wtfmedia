"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import type { AppNavItem } from "./AppRail";

type GlobalCommandSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: readonly AppNavItem[];
  mode: "public" | "operator";
};

type Command = {
  id: string;
  label: string;
  detail: string;
  run: () => void;
};

/**
 * A global command layer, not a second privileged chat endpoint.
 *
 * It intentionally stays narrow: navigation and source questions belong here;
 * browser preferences live in the dedicated settings route.
 */
export function GlobalCommandSurface({
  open,
  onOpenChange,
  navigation,
  mode,
}: GlobalCommandSurfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const routeCommands = navigation.map((item) => ({
      id: `route-${item.href}`,
      label: `open ${item.label}`,
      detail: `navigate to ${item.label}`,
      run: () => {
        router.push(item.href);
        onOpenChange(false);
      },
    }));

    const sourceChat: Command = {
      id: "source-chat",
      label: "ask the catalogue",
      detail: "open source-backed public answers",
      run: () => {
        router.push("/chat");
        onOpenChange(false);
      },
    };

    const operatorCommands: Command[] = mode === "operator"
      ? [
          {
            id: "public-workspaces",
            label: "open public workspaces",
            detail: "navigate to the public WTF OS workspaces",
            run: () => {
              router.push("/");
              onOpenChange(false);
            },
          },
          {
            id: "sign-out",
            label: "sign out",
            detail: "open the verified sign-out recovery path",
            run: () => {
              router.push("/ops/recover?mode=signing-out");
              onOpenChange(false);
            },
          },
        ]
      : [];

    return [...routeCommands, ...operatorCommands, sourceChat];
  }, [mode, navigation, onOpenChange, router]);

  const visibleCommands = commands.filter((command) => {
    const haystack = `${command.label} ${command.detail}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const submitSourceQuestion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = query.trim();
    if (!question) return;
    router.push(`/chat?q=${encodeURIComponent(question)}`);
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="workspace controls"
      description={
        mode === "operator"
          ? "navigate the workspace or use an operator-safe route"
          : "navigate the workspace or ask the public catalogue"
      }
      side="right"
    >
      <div className="space-y-7" data-testid="global-command-surface">
        <form onSubmit={submitSourceQuestion} className="space-y-2">
          <label htmlFor="global-command-search" className="font-label text-sm font-bold lowercase text-foreground">
            ask or find a command
          </label>
          <input
            ref={inputRef}
            id="global-command-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ask the catalogue or open a workspace"
            className="min-h-11 w-full border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-knowledge focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
            data-testid="global-command-search"
          />
          <p className="font-label text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-secondary">
            enter sends a source question · ⌘/ctrl k toggles controls
          </p>
        </form>

        <section aria-label="safe commands" className="space-y-2">
          <h2 className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-secondary">
            workspace navigation
          </h2>
          <div className="space-y-2">
            {visibleCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                aria-label={command.label}
                onClick={command.run}
                className="w-full border-2 border-foreground bg-surface-subtle p-3 text-left transition-colors hover:bg-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-knowledge focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
              >
                <span className="block font-label text-sm font-bold lowercase text-foreground">{command.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-secondary">{command.detail}</span>
              </button>
            ))}
            {visibleCommands.length === 0 && (
              <p className="border-2 border-dashed border-foreground/35 p-3 text-sm text-secondary">
                No safe in-app command matches. Press enter to ask the public catalogue instead.
              </p>
            )}
          </div>
        </section>

      </div>
    </Drawer>
  );
}

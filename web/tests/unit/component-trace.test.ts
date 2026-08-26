import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import trace from "../component-trace.json";

const root = path.resolve(import.meta.dirname, "../..");
const layers = { primitive: 1, pattern: 2, domain: 3 } as const;
type Layer = keyof typeof layers;

function resolveImport(from: string, specifier: string) {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function componentImports(file: string) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => resolveImport(file, match[1]))
    .filter((candidate): candidate is string => Boolean(candidate?.includes(`${path.sep}components${path.sep}`)));
}

function reachable(entry: string) {
  const seen = new Set<string>();
  const pending = [path.join(root, entry)];
  while (pending.length) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    pending.push(...componentImports(file));
  }
  return seen;
}

describe("Phase 1 component trace", () => {
  it("resolves exact route-reachable files, exports, stories, states, and tokens", () => {
    const files = new Set(trace.components.map((component) => component.file));
    const discovered = new Set<string>();
    for (const [route, entry] of Object.entries(trace.protected_routes)) {
      expect(["/", "/episodes", "/connections", "/chat"]).toContain(route);
      for (const file of reachable(entry)) discovered.add(path.relative(root, file));
    }
    expect([...files].sort()).toEqual([...discovered].sort());
    for (const tokenFile of trace.tokens) expect(fs.existsSync(path.join(root, tokenFile))).toBe(true);

    for (const component of trace.components) {
      const file = path.join(root, component.file);
      const source = fs.readFileSync(file, "utf8");
      expect(source, `${component.id} export`).toMatch(
        component.export === "default"
          ? /export\s+default\s+/
          : new RegExp(`export\\s+(?:const|function|class)\\s+${component.export}\\b`),
      );
      expect(component.tokens.length).toBeGreaterThan(0);
      expect(component.consumers.length).toBeGreaterThan(0);
      const story = fs.readFileSync(path.join(root, component.story.file), "utf8");
      for (const state of component.story.states) {
        expect(story, `${component.id} story state ${state}`).toMatch(new RegExp(`export\\s+const\\s+${state}\\b`));
      }
    }
  });

  it("enforces dependency direction and rejects cycles", () => {
    const byFile = new Map(trace.components.map((component) => [path.join(root, component.file), component]));
    const graph = new Map<string, string[]>();
    for (const component of trace.components) {
      const imports = componentImports(path.join(root, component.file)).filter((file) => byFile.has(file));
      graph.set(component.file, imports.map((file) => path.relative(root, file)));
      for (const imported of imports) {
        const dependency = byFile.get(imported)!;
        expect(layers[dependency.layer as Layer], `${component.id} cannot import upward from ${dependency.id}`).toBeLessThanOrEqual(layers[component.layer as Layer]);
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (file: string) => {
      expect(visiting.has(file), `cycle includes ${file}`).toBe(false);
      if (visited.has(file)) return;
      visiting.add(file);
      for (const dependency of graph.get(file) ?? []) visit(dependency);
      visiting.delete(file);
      visited.add(file);
    };
    for (const file of graph.keys()) visit(file);
  });

  it("keeps every requirement mapping concrete after Phase 1 acceptance", () => {
    const validation = fs.readFileSync(
      path.resolve(root, "../.planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md"),
      "utf8",
    );
    expect(validation).not.toMatch(/^\| TBD \|/m);
    expect(validation).toMatch(/^status: complete$/m);
    expect(validation).toMatch(/^nyquist_compliant: true$/m);
    expect(validation).toMatch(/^wave_0_complete: true$/m);
  });
});

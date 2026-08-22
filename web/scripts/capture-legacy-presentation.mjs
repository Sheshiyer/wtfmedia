#!/usr/bin/env node
/**
 * Plan 01-21 Task 1 — read-only legacy presentation dependency capture (D-12).
 *
 * Resolves every repository-owned presentation dependency transitively from
 * the protected public roots:
 *   web/app/globals.css
 *   web/tailwind.config.ts
 *   web/app/layout.tsx
 *   web/app/page.tsx, web/app/episodes/page.tsx,
 *   web/app/connections/page.tsx, web/app/chat/page.tsx
 *
 * For each node it records repository-relative path, role, dependencies,
 * dependents, and SHA-256 of current bytes. The graph is bound to the
 * approved compatibility manifest hash. The artifact records structure and
 * digests only — no source bodies, absolute paths, environment values, or
 * private payloads.
 *
 * Modes:
 *   --write  create the dependency artifact (fails if it already exists)
 *   --check  recompute and compare against the artifact on disk (exit 1 on drift)
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const WEB_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const ARTIFACT = path.join(WEB_ROOT, "tests/contracts/legacy-presentation-dependencies.json");
const COMPAT_MANIFEST = path.join(WEB_ROOT, "tests/contracts/phase1-compatibility-manifest.json");

const ROOTS = [
  { path: "web/app/globals.css", kind: "css" },
  { path: "web/tailwind.config.ts", kind: "ts" },
  { path: "web/app/layout.tsx", kind: "ts" },
  { path: "web/app/page.tsx", kind: "ts" },
  { path: "web/app/episodes/page.tsx", kind: "ts" },
  { path: "web/app/connections/page.tsx", kind: "ts" },
  { path: "web/app/chat/page.tsx", kind: "ts" },
];

const sha256 = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");

/** Classify a repository-relative presentation path. */
function classify(rel) {
  if (rel === "web/app/globals.css") return "global-style";
  if (rel.startsWith("web/styles/")) return "semantic-token-layer";
  if (rel === "web/tailwind.config.ts") return "theme-config";
  if (rel === "web/app/layout.tsx") return "shell-layout";
  if (/^web\/app\/[^/]+\/page\.tsx$/.test(rel) || rel === "web/app/page.tsx") return "protected-route";
  if (rel.startsWith("web/components/")) return "shared-component";
  if (rel.startsWith("web/lib/")) return "presentation-data-module";
  throw new Error(`unclassifiable presentation dependency: ${rel}`);
}

/** Extract repository-relative @/ imports from a TS/TSX file's text. */
function tsxDeps(rel, text) {
  const deps = [];
  const re = /from\s+["']@\/([^"']+)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const spec = m[1];
    for (const ext of [".tsx", ".ts"]) {
      const candidate = `web/${spec}${ext}`;
      if (fs.existsSync(path.join(REPO_ROOT, candidate))) {
        deps.push(candidate);
        break;
      }
    }
  }
  // Relative component imports (e.g. "./DragRow") within components/.
  const relRe = /from\s+["'](\.[^"']+)["']/g;
  while ((m = relRe.exec(text)) !== null) {
    const base = path.join(path.dirname(rel), m[1]);
    for (const ext of [".tsx", ".ts"]) {
      const candidate = `${base}${ext}`;
      if (fs.existsSync(path.join(REPO_ROOT, candidate))) {
        deps.push(candidate);
        break;
      }
    }
  }
  // CSS side-effect imports in TS files.
  const cssRe = /import\s+["'](\.[^"']*\.css)["'];?/g;
  while ((m = cssRe.exec(text)) !== null) {
    deps.push(path.join(path.dirname(rel), m[1]));
  }
  return [...new Set(deps)].sort();
}

/** CSS @import resolution (repository-local only; url() imports are external). */
function cssDeps(rel, text) {
  const deps = [];
  const re = /@import\s+(?:url\()?["']([^"')]+)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (/^https?:/.test(m[1])) continue; // external font import — not a repo node
    deps.push(path.join(path.dirname(rel), m[1]));
  }
  return [...new Set(deps)].sort();
}

function buildGraph() {
  const nodes = new Map(); // rel -> {deps}
  const queue = ROOTS.map((r) => ({ ...r }));
  const seenRoots = new Set(ROOTS.map((r) => r.path));

  while (queue.length) {
    const root = queue.shift();
    if (nodes.has(root.path)) continue;
    const abs = path.join(REPO_ROOT, root.path);
    if (!fs.existsSync(abs)) throw new Error(`missing presentation root: ${root.path}`);
    const text = fs.readFileSync(abs, "utf8");
    const deps = root.kind === "css" ? cssDeps(root.path, text) : tsxDeps(root.path, text);
    for (const dep of deps) {
      if (!fs.existsSync(path.join(REPO_ROOT, dep))) {
        throw new Error(`unresolved local import ${JSON.stringify(dep)} in ${root.path}`);
      }
      if (!seenRoots.has(dep)) {
        seenRoots.add(dep);
        queue.push({ path: dep, kind: dep.endsWith(".css") ? "css" : "ts" });
      }
    }
    nodes.set(root.path, { deps });
  }

  // Dependents index.
  const dependents = {};
  for (const [rel, { deps }] of nodes) {
    for (const d of deps) (dependents[d] ??= []).push(rel);
  }

  const compatManifestSha = sha256(COMPAT_MANIFEST);

  const nodeList = [...nodes.keys()].sort().map((rel) => ({
    path: rel,
    role: classify(rel),
    dependencies: nodes.get(rel).deps,
    dependents: [...(dependents[rel] ?? [])].sort(),
    sha256: sha256(path.join(REPO_ROOT, rel)),
  }));

  return {
    schema_version: 1,
    plan: "01-21",
    generated_at_mode: "deterministic-recompute",
    description:
      "Complete repository-owned legacy presentation dependency boundary (D-12): global style, theme config, shell layout, protected route entries, and all transitive shared components/data modules, hash-bound to the approved compatibility manifest.",
    compatibility_manifest_sha256: compatManifestSha,
    protected_roots: ROOTS.map((r) => r.path),
    node_count: nodeList.length,
    nodes: nodeList,
  };
}

const serialized = () => JSON.stringify(buildGraph(), null, 2) + "\n";

const mode = process.argv[2] ?? "--check";
if (mode === "--write") {
  if (fs.existsSync(ARTIFACT)) throw new Error("dependency artifact already exists");
  fs.writeFileSync(ARTIFACT, serialized());
  console.log(`wrote ${path.relative(REPO_ROOT, ARTIFACT)} (${buildGraph().node_count} nodes)`);
} else if (mode === "--check") {
  const current = serialized();
  if (!fs.existsSync(ARTIFACT)) throw new Error("dependency artifact absent");
  const onDisk = fs.readFileSync(ARTIFACT, "utf8");
  if (onDisk !== current) throw new Error("legacy presentation dependency graph has drifted");
  console.log("legacy presentation dependency graph verified: no drift");
} else {
  throw new Error(`unknown mode: ${mode}`);
}

#!/usr/bin/env node

/**
 * Deterministically renders the evidence-led architecture artifacts.
 * It deliberately reads repository metadata only: no network, credentials,
 * account APIs, deployments, or provider calls are part of this command.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "docs/architecture/architecture-ledger.source.json");
const outputDir = join(root, "docs/architecture");
const outputPaths = {
  html: join(outputDir, "architecture.html"),
  services: join(outputDir, "SERVICES.md"),
  graph: join(outputDir, "DEPENDENCY-GRAPH.md"),
};
const mode = process.argv[2] ?? "--update";

if (!new Set(["--update", "--check"]).has(mode)) {
  throw new Error("Usage: node scripts/generate-architecture-ledger.mjs --update|--check");
}

const allowedStatuses = new Set([
  "implemented_source",
  "locally_verified",
  "declared_config",
  "historical_record",
  "planned",
  "unconfigured",
  "held",
]);
const graphIds = new Set(["system-context", "worker-execution", "provenance-lifecycle", "trust-boundary", "release-lifecycle", "documentation-flow"]);
const ignoredDirectories = new Set(["node_modules", ".next", ".wrangler", ".git", "storybook-static", "coverage"]);
const trackedFiles = new Set(
  execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "buffer" })
    .toString("utf8")
    .split("\0")
    .filter(Boolean),
);

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function collectFiles(relativePath) {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) return [];
  const entries = readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  return entries.flatMap((entry) => {
    const child = `${relativePath}/${entry.name}`;
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : collectFiles(child);
    return entry.isFile() && trackedFiles.has(child) ? [child] : [];
  });
}

function fingerprint(source) {
  const files = [...new Set([
    "docs/architecture/architecture-ledger.source.json",
    ...source.sourceFiles,
    ...source.sourceRoots.flatMap(collectFiles),
    "scripts/generate-architecture-ledger.mjs",
  ])].sort();
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    digest.update(read(file));
    digest.update("\0");
  }
  return { hash: digest.digest("hex"), files };
}

function validate(source) {
  if (source.schemaVersion !== 1) throw new Error("Architecture ledger source must use schemaVersion 1");
  if (!Array.isArray(source.sections) || source.sections.length < 15) throw new Error("Architecture ledger needs at least 15 sections");
  const ids = new Set();
  for (const section of source.sections) {
    if (!section.id || ids.has(section.id)) throw new Error(`Section id must be unique: ${section.id}`);
    ids.add(section.id);
    if (!allowedStatuses.has(section.status)) throw new Error(`Unknown section status for ${section.id}: ${section.status}`);
    if (!Array.isArray(section.facts) || section.facts.length === 0) throw new Error(`Section ${section.id} needs evidence-linked facts`);
    for (const fact of section.facts) {
      if (!Array.isArray(fact.evidence) || fact.evidence.length === 0) throw new Error(`Fact ${fact.label} in ${section.id} lacks evidence`);
    }
    if (section.graph && !graphIds.has(section.graph)) throw new Error(`Unknown graph ${section.graph}`);
  }
  for (const item of source.releaseEvents) {
    if (!allowedStatuses.has(item.status)) throw new Error(`Unknown release status: ${item.status}`);
  }
}

function safeRelativeLink(value) {
  const pathOnly = String(value).replace(/:\d+(?:-\d+)?$/u, "");
  if (!pathOnly.includes("/") && !pathOnly.endsWith(".md") && !pathOnly.endsWith(".json") && !pathOnly.endsWith(".ts") && !pathOnly.endsWith(".mjs") && !pathOnly.endsWith(".yml") && !pathOnly.endsWith(".sql")) return null;
  const absolute = join(root, pathOnly);
  const rel = relative(outputDir, absolute).split(sep).join("/");
  return rel.startsWith("../") || rel === ".." ? rel : `./${rel}`;
}

function evidence(value) {
  const href = safeRelativeLink(value);
  const label = escapeHtml(value);
  return href ? `<a href="${escapeHtml(href)}">${label}</a>` : `<span>${label}</span>`;
}

function pill(status, label = status.replaceAll("_", " ")) {
  return `<span class="status status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function node(x, y, width, height, title, detail, status = "implemented_source") {
  return `<g class="graph-node ${escapeHtml(status)}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12"/><text x="${x + width / 2}" y="${y + 27}" text-anchor="middle" class="node-title">${escapeHtml(title)}</text><text x="${x + width / 2}" y="${y + 48}" text-anchor="middle" class="node-detail">${escapeHtml(detail)}</text></g>`;
}

function arrow(x1, y1, x2, y2, label = "", dashed = false) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" class="graph-arrow${dashed ? " dashed" : ""}" marker-end="url(#arrowhead)"/>${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 7}" class="edge-label" text-anchor="middle">${escapeHtml(label)}</text>` : ""}`;
}

function graphFrame(title, content, caption) {
  const markerId = `arrowhead-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "")}`;
  const scopedContent = content.replaceAll("url(#arrowhead)", `url(#${markerId})`);
  return `<figure class="diagram"><p class="scroll-hint diagram-scroll-hint">Scroll horizontally to inspect the full diagram.</p><svg viewBox="0 0 1120 540" role="img" aria-label="${escapeHtml(title)}"><defs><marker id="${markerId}" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7"/></marker></defs><text x="32" y="38" class="graph-title">${escapeHtml(title)}</text>${scopedContent}</svg><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function renderGraph(id) {
  if (id === "system-context") {
    const content = [
      node(42, 200, 150, 64, "Browser", "public client"),
      node(260, 200, 180, 64, "Next.js / Vercel", "public app boundary"),
      node(518, 200, 190, 64, "Cloudflare Worker", "declared config", "declared_config"),
      node(810, 72, 140, 64, "Workers AI", "inference", "declared_config"),
      node(810, 164, 140, 64, "Vectorize", "retrieval", "declared_config"),
      node(810, 256, 140, 64, "R2", "source assets", "declared_config"),
      node(810, 348, 140, 64, "KV", "state/cache", "declared_config"),
      node(982, 256, 110, 64, "Queue", "ingest", "held"),
      node(982, 348, 110, 64, "D1", "provenance", "held"),
      arrow(192, 232, 260, 232, "HTTPS"),
      arrow(440, 232, 518, 232, "server-only edge call"),
      arrow(708, 214, 810, 104, "embed/answer"),
      arrow(708, 224, 810, 196, "search"),
      arrow(708, 242, 810, 288, "sources"),
      arrow(708, 252, 810, 380, "rate / state"),
      arrow(708, 254, 982, 288, "jobs", true),
      arrow(708, 264, 982, 380, "records", true),
    ].join("");
    return graphFrame("System context — declared components versus runtime proof", content, "Solid lines describe tracked source relationships. Dashed lines are held runtime integrations; no live binding is asserted.");
  }
  if (id === "worker-execution") {
    const content = [
      node(70, 190, 180, 64, "Worker fetch", "active entrypoint"),
      node(340, 110, 180, 64, "Public RAG", "active source path"),
      node(340, 270, 180, 64, "Legacy queue", "active consumer"),
      node(650, 110, 190, 64, "Ops router", "requires runtime config", "held"),
      node(650, 270, 190, 64, "Transcript consumer", "not wired", "held"),
      node(650, 370, 190, 64, "Scheduled helpers", "no cron/export", "held"),
      node(920, 270, 140, 64, "Queue / DLQ", "needs binding", "planned"),
      arrow(250, 214, 340, 142, "chat"),
      arrow(250, 236, 340, 302, "queue"),
      arrow(520, 142, 650, 142, "future ops routing", true),
      arrow(520, 302, 650, 302, "missing dispatch", true),
      arrow(745, 174, 745, 370, "missing scheduled export", true),
      arrow(840, 302, 920, 302, "future delivery", true),
    ].join("");
    return graphFrame("Worker execution map", content, "Phase 3 helper modules are visible in source but intentionally marked held until entrypoint, binding, and schedule proof exist.");
  }
  if (id === "provenance-lifecycle") {
    const content = [
      node(35, 210, 160, 64, "External identity", "YouTube / source"),
      node(245, 210, 160, 64, "Source asset", "R2 + D1 record"),
      node(455, 210, 160, 64, "Transcript version", "segments / hash"),
      node(665, 210, 160, 64, "Alignment", "dual timeline"),
      node(875, 120, 180, 64, "Public citation", "allowlisted DTO"),
      node(875, 300, 180, 64, "Operator provenance", "held Access gate", "held"),
      arrow(195, 242, 245, 242, "stable key"),
      arrow(405, 242, 455, 242, "source mapping"),
      arrow(615, 242, 665, 242, "verified intervals"),
      arrow(825, 222, 875, 152, "public projection"),
      arrow(825, 264, 875, 332, "protected DTO", true),
    ].join("");
    return graphFrame("Provenance lifecycle", content, "A citation or playback control must travel through evidence-bearing records. Private asset paths and untrusted timelines are not public output.");
  }
  if (id === "trust-boundary") {
    const content = [
      node(38, 120, 175, 64, "Public routes", "Phase 1 scope"),
      node(38, 340, 175, 64, "/ops shell", "modeled UI", "implemented_source"),
      node(315, 340, 185, 64, "Loopback HMAC", "dev/test only", "locally_verified"),
      node(600, 210, 190, 64, "Cloudflare Access", "unconfigured", "unconfigured"),
      node(875, 210, 170, 64, "D1 role lookup", "future live proof", "planned"),
      arrow(213, 152, 600, 242, "not required", true),
      arrow(213, 372, 315, 372, "development only"),
      arrow(500, 372, 600, 274, "does not substitute", true),
      arrow(790, 242, 875, 242, "future verified identity", true),
    ].join("");
    return graphFrame("Phase 1 public boundary and future operator trust boundary", content, "Public Phase 1 is intentionally independent of Access. The local signed context is never a production Access substitute.");
  }
  if (id === "release-lifecycle") {
    const content = [
      node(38, 225, 150, 64, "Source change", "code/config/docs"),
      node(230, 225, 150, 64, "Local checks", "evidence only"),
      node(422, 225, 150, 64, "Reviewed PR", "CI freshness"),
      node(614, 225, 170, 64, "Owner approval", "separate authority", "planned"),
      node(826, 140, 170, 64, "Canary / stable", "future release", "planned"),
      node(826, 340, 170, 64, "Rollback target", "future proof", "planned"),
      arrow(188, 257, 230, 257),
      arrow(380, 257, 422, 257),
      arrow(572, 257, 614, 257),
      arrow(784, 238, 826, 172, "approved release", true),
      arrow(911, 204, 911, 340, "rollback relationship", true),
    ].join("");
    return graphFrame("Release lifecycle", content, "Versions are metadata until reviewed evidence and owner approval create a release event. OTA remains unsupported until a signed native-app channel exists.");
  }
  const content = [
    node(36, 225, 165, 64, "Architecture sources", "code / configs / plans"),
    node(255, 225, 165, 64, "Source ledger", "claims + evidence"),
    node(474, 225, 165, 64, "Generator", "offline only"),
    node(693, 145, 165, 64, "HTML ledger", "offline-readable"),
    node(693, 335, 165, 64, "CI freshness", "deterministic check"),
    node(912, 225, 165, 64, "Reviewed commit", "future runtime receipt"),
    arrow(201, 257, 255, 257),
    arrow(420, 257, 474, 257),
    arrow(639, 240, 693, 177),
    arrow(639, 274, 693, 367),
    arrow(858, 177, 912, 257),
    arrow(858, 367, 912, 257),
  ].join("");
  return graphFrame("Continuous documentation lifecycle", content, "The generator is deterministic and does not call remote services. A human adds semantic evidence and owner-attested runtime receipts only after separate authorization.");
}

function renderFacts(facts) {
  return `<dl class="facts">${facts.map((fact) => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}<small>${fact.evidence.map(evidence).join(" · ")}</small></dd></div>`).join("")}</dl>`;
}

function renderSection(section) {
  return `<section id="${escapeHtml(section.id)}" class="ledger-section"><header><span class="section-number">${escapeHtml(section.number)}</span><div><p class="eyebrow">${pill(section.status)}</p><h2>${escapeHtml(section.title)}</h2><p class="summary">${escapeHtml(section.summary)}</p></div></header>${section.graph ? renderGraph(section.graph) : ""}${renderFacts(section.facts)}<div class="section-body">${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div></section>`;
}

function htmlDocument(source, metadata) {
  const toc = source.sections.map((section) => `<li><a href="#${escapeHtml(section.id)}"><span>${escapeHtml(section.number)}</span>${escapeHtml(section.title)}</a></li>`).join("");
  const legend = source.statusLegend.map((item) => `<li>${pill(item.id, item.label)}<span>${escapeHtml(item.description)}</span></li>`).join("");
  const releaseRows = source.releaseEvents.map((event) => `<tr><td>${escapeHtml(event.surface)}</td><td><code>${escapeHtml(event.version)}</code></td><td>${escapeHtml(event.channel)}</td><td>${pill(event.status)}</td><td>${escapeHtml(event.meaning)}</td></tr>`).join("");
  const drift = source.drift.map((item) => `<article class="drift"><div>${pill(item.status)}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p><p><strong>Evidence:</strong> ${item.evidence.map(evidence).join(" · ")}</p><p><strong>Next gate:</strong> ${escapeHtml(item.nextGate)}</p></article>`).join("");
  const handoffs = source.handoffs.map((item) => `<li><strong>${escapeHtml(item.id)} — ${escapeHtml(item.title)}</strong><span>${escapeHtml(item.scope)}</span></li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2211%22 y=%2247%22 fill=%22%23fff6ea%22 font-size=%2234%22%3EW%3C/text%3E%3C/svg%3E">
  <meta name="architecture-ledger-schema" content="${source.schemaVersion}">
  <meta name="architecture-ledger-source-hash" content="${metadata.hash}">
  <title>${escapeHtml(source.title)}</title>
  <style>
    :root { color-scheme: light; --cream:#fff6ea; --paper:#fffdf8; --ink:#1a1a1a; --muted:#625d56; --rule:#d9cec0; --red:#c53b3a; --green:#0c9367; --yellow:#f1b333; --purple:#6758a5; --blue:#2d6be0; --shadow:6px 6px 0 rgba(26,26,26,.1); }
    * { box-sizing:border-box; } body { margin:0; background:var(--cream); color:var(--ink); font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; } a { color:inherit; text-underline-offset:3px; } code { font:600 .88em ui-monospace,SFMono-Regular,Menlo,monospace; background:#f4eadc; padding:.1rem .25rem; border-radius:.2rem; } .shell { display:grid; grid-template-columns:minmax(220px,280px) minmax(0,1fr); max-width:1440px; margin:0 auto; } aside { position:sticky; top:0; height:100vh; padding:2rem 1.25rem; border-right:1px solid var(--rule); overflow:auto; } .mark { display:inline-block; padding:.15rem .42rem; font:800 1.15rem/1 Georgia,serif; color:var(--cream); background:var(--ink); transform:rotate(-2deg); } aside h2 { font-size:.8rem; letter-spacing:.08em; text-transform:uppercase; margin:2rem 0 .65rem; } nav ol { list-style:none; padding:0; margin:0; } nav a { display:flex; gap:.65rem; padding:.38rem 0; text-decoration:none; font-size:.82rem; } nav a:hover { text-decoration:underline; } nav a span { color:var(--red); font-weight:800; width:1.5rem; } main { min-width:0; padding:2rem clamp(1rem,4vw,4rem) 5rem; } .hero { border-bottom:3px solid var(--ink); padding-bottom:2rem; } .hero h1 { max-width:920px; margin:.85rem 0 .5rem; font:800 clamp(2.2rem,5vw,5.2rem)/.9 Georgia,serif; letter-spacing:-.045em; } .hero .lede { max-width:780px; font-size:1.12rem; } .snapshot { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.8rem; margin:1.5rem 0 0; } .snapshot div { background:var(--paper); border:1px solid var(--rule); padding:.8rem; box-shadow:var(--shadow); } .snapshot span,.eyebrow { display:block; margin:0 0 .35rem; color:var(--muted); font-size:.75rem; letter-spacing:.06em; text-transform:uppercase; } .snapshot strong { display:block; font-size:.95rem; overflow-wrap:anywhere; } .legend { margin:2.5rem 0; padding:1rem; border:1px dashed var(--rule); background:rgba(255,253,248,.55); } .legend h2 { margin:0 0 .8rem; font-size:1rem; } .legend ul { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:.65rem 1rem; padding:0; margin:0; list-style:none; } .legend li { display:flex; gap:.55rem; align-items:flex-start; font-size:.85rem; } .status { display:inline-block; width:max-content; padding:.15rem .43rem; border:1px solid currentColor; border-radius:999px; font:700 .68rem/1.25 ui-sans-serif,system-ui,sans-serif; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; } .status-implemented_source { color:#0a6e4f; background:#e5f6ed; } .status-locally_verified { color:#234d9a; background:#e9f0ff; } .status-declared_config { color:#765210; background:#fff0c8; } .status-historical_record { color:#5a536e; background:#eeeaf7; } .status-planned { color:#6a4b9a; background:#f0eafb; } .status-unconfigured { color:#8d3f3e; background:#fae8e6; } .status-held { color:#8a5810; background:#faebd2; } .ledger-section { padding:3rem 0; border-top:1px solid var(--rule); scroll-margin-top:1rem; } .ledger-section header { display:grid; grid-template-columns:4rem minmax(0,1fr); gap:1rem; max-width:960px; } .section-number { color:var(--red); font:800 2.1rem/.9 Georgia,serif; } .ledger-section h2 { margin:.1rem 0 .45rem; font:800 clamp(1.55rem,3vw,2.7rem)/1 Georgia,serif; letter-spacing:-.03em; } .summary { margin:0; font-size:1.08rem; } .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(255px,1fr)); gap:.8rem; margin:1.5rem 0; } .facts div { background:var(--paper); padding:.9rem 1rem; border-left:4px solid var(--ink); box-shadow:var(--shadow); } .facts dt { font-weight:800; } .facts dd { margin:.25rem 0 0; font-size:.91rem; } .facts small { display:block; margin-top:.55rem; color:var(--muted); font-size:.76rem; overflow-wrap:anywhere; } .section-body { max-width:900px; } .section-body p { margin:.75rem 0; } figure.diagram { margin:1.75rem 0; padding:1rem; border:1px solid var(--ink); background:var(--paper); box-shadow:var(--shadow); } figure svg { width:100%; height:auto; display:block; } figcaption { margin:.75rem .2rem .1rem; color:var(--muted); font-size:.84rem; } .graph-title { font:800 23px Georgia,serif; fill:var(--ink); } .graph-node rect { fill:#fffdf8; stroke:var(--ink); stroke-width:2; } .graph-node.declared_config rect { fill:#fff3d4; stroke:#765210; } .graph-node.held rect { fill:#faebd2; stroke:#8a5810; stroke-dasharray:7 5; } .graph-node.unconfigured rect,.graph-node.planned rect { fill:#f0eafb; stroke:#6a4b9a; stroke-dasharray:7 5; } .node-title { font:800 14px ui-sans-serif,system-ui,sans-serif; fill:var(--ink); } .node-detail,.edge-label { font:12px ui-sans-serif,system-ui,sans-serif; fill:var(--muted); } .graph-arrow { fill:none; stroke:var(--ink); stroke-width:2.2; } .graph-arrow.dashed { stroke:#8a5810; stroke-dasharray:7 5; } marker polygon { fill:var(--ink); } .release-table { width:100%; border-collapse:collapse; margin:1rem 0; font-size:.9rem; } .release-table th,.release-table td { padding:.7rem; text-align:left; vertical-align:top; border-bottom:1px solid var(--rule); } .release-table th { font-size:.75rem; letter-spacing:.06em; text-transform:uppercase; } .drift-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:1rem; } .drift { padding:1rem; background:var(--paper); border:1px solid var(--rule); box-shadow:var(--shadow); } .drift h3 { margin:.65rem 0 .4rem; font:800 1.2rem/1.05 Georgia,serif; } .drift p { margin:.55rem 0; font-size:.9rem; } .handoffs { list-style:none; padding:0; margin:1rem 0; display:grid; gap:.65rem; } .handoffs li { display:grid; grid-template-columns:minmax(160px,270px) minmax(0,1fr); gap:.85rem; padding:.75rem; border-bottom:1px solid var(--rule); } footer { margin-top:3rem; padding-top:1.5rem; border-top:3px solid var(--ink); font-size:.86rem; color:var(--muted); } @media (max-width:900px) { .shell { display:block; } aside { position:static; height:auto; border-right:0; border-bottom:1px solid var(--rule); } nav ol { columns:2; } main { padding-top:1.5rem; } } @media (max-width:620px) { .snapshot { grid-template-columns:1fr; } nav ol { columns:1; } .ledger-section header { grid-template-columns:1fr; gap:.35rem; } .section-number { font-size:1.5rem; } .handoffs li { grid-template-columns:1fr; gap:.3rem; } figure.diagram { overflow:auto; } figure svg { min-width:720px; } }
    .scroll-hint { display:none; }
    figure.diagram { max-width:100%; }
    .release-table-wrap { width:100%; overflow-x:auto; border:1px solid var(--rule); -webkit-overflow-scrolling:touch; }
    .release-table { min-width:720px; margin:0; }
    @media (max-width:620px) { .scroll-hint { display:block; margin:0 0 .55rem; color:var(--muted); font-size:.76rem; font-style:italic; } figure.diagram { overflow-x:auto; overscroll-behavior-inline:contain; } figure svg { min-width:720px; } .release-table-wrap { overscroll-behavior-inline:contain; } }
  </style>
</head>
<body>
  <div class="shell">
    <aside aria-label="Ledger navigation"><a class="mark" href="#top">WTF</a><h2>Sections</h2><nav><ol>${toc}</ol></nav></aside>
    <main id="top">
      <header class="hero"><p class="eyebrow">${escapeHtml(source.inventoryDate)} inventory · ${escapeHtml(source.reviewOwner)}</p><h1>${escapeHtml(source.title)}</h1><p class="lede">${escapeHtml(source.subtitle)} This ledger reflects repository evidence only and deliberately separates local source truth from external runtime proof.</p><div class="snapshot"><div><span>Source fingerprint</span><strong><code>${metadata.hash}</code></strong></div><div><span>Architecture inputs</span><strong>${metadata.files.length} tracked source paths</strong></div><div><span>Current decision</span><strong>Phase 1 public proof is not Cloudflare Access-gated</strong></div></div></header>
      <section class="legend" aria-labelledby="legend-title"><h2 id="legend-title">Evidence-status legend</h2><ul>${legend}</ul></section>
      <section class="ledger-section" id="versions"><header><span class="section-number">V</span><div><p class="eyebrow">${pill("implemented_source", "metadata only")}</p><h2>Version and release matrix</h2><p class="summary">These values are source metadata. They do not prove a hosted release, a connected account, or an OTA artifact.</p></div></header><p class="scroll-hint matrix-scroll-hint">Scroll horizontally to view every release field.</p><div class="release-table-wrap" tabindex="0" aria-label="Release matrix; scroll horizontally on small screens"><table class="release-table"><thead><tr><th>Surface</th><th>Version</th><th>Channel</th><th>Status</th><th>Meaning</th></tr></thead><tbody>${releaseRows}</tbody></table></div></section>
      ${source.sections.map(renderSection).join("\n")}
      <section class="ledger-section" id="drift"><header><span class="section-number">D</span><div><p class="eyebrow">${pill("historical_record", "reconciliation")}</p><h2>Drift register and held decisions</h2><p class="summary">Contradictions are visible here rather than silently normalized into a release claim.</p></div></header><div class="drift-grid">${drift}</div></section>
      <section class="ledger-section" id="handoffs"><header><span class="section-number">H</span><div><p class="eyebrow">${pill("planned", "separate ownership")}</p><h2>Independent handoffs</h2><p class="summary">Each workstream remains separable from Phase 3 provenance recovery and from any unapproved Cloudflare action.</p></div></header><ul class="handoffs">${handoffs}</ul></section>
      <footer><p><strong>Update contract:</strong> edit <code>docs/architecture/architecture-ledger.source.json</code> when a semantic claim changes, then run <code>npm run docs:architecture:update</code>. CI runs the matching check on architecture-affecting paths. Runtime, deployment, Access, OAuth, calendar, MCP, and OTA changes need separately approved, redacted evidence before their status may move beyond planned or unconfigured.</p><p>Generated deterministically by <code>scripts/generate-architecture-ledger.mjs</code>. This command has no network calls and is not a Cloudflare deployment command.</p></footer>
    </main>
  </div>
</body>
</html>
`;
}

function servicesDocument(source, metadata, runtime) {
  const rows = [
    ["Public application", `${runtime.versions.web} Next.js web package`, "implemented source", "web/package.json; web/app"],
    ["Edge retrieval", `${runtime.workerName} Worker with Workers AI and Vectorize`, "declared config; live-unverified", "cloudflare/wrangler.jsonc; cloudflare/src/index.ts"],
    ["Storage and state", runtime.bindingSummary, "declared config", "cloudflare/wrangler.jsonc"],
    ["Operator access", "JWT verifier, D1 role model, RBAC, and local dev seam", "implemented source; Access unconfigured", "cloudflare/src/auth; cloudflare/src/ops-router.ts; web/lib/ops"],
    ["Agentic surface", `${runtime.versions.plugin} local STDIO MCP scaffold`, "held", "plugins/wtf-os"],
  ].map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `# WTF Media services inventory\n\n> Generated by \`scripts/generate-architecture-ledger.mjs\`.\n> Source fingerprint: \`${metadata.hash}\` across ${metadata.files.length} architecture inputs.\n> This is repository evidence, not a runtime inventory.\n\n| Layer | Repository evidence | Status | Sources |\n| --- | --- | --- | --- |\n${rows}\n\nSee [architecture.html](architecture.html) for the evidence legend, topology diagrams, Phase 1 Access exemption, drift register, and release/update contract.\n`;
}

function graphDocument(metadata, runtime) {
  return `# WTF Media high-level dependency graph\n\n> Generated by \`scripts/generate-architecture-ledger.mjs\`.\n> Source fingerprint: \`${metadata.hash}\`.\n\n\`\`\`mermaid\nflowchart LR\n  Browser[Public browser] --> Web[Next.js public application]\n  Web -->|server-only edge request| Worker[${runtime.workerName} Worker]\n  Worker --> AI[Workers AI]\n  Worker --> Vec[Vectorize]\n  Worker --> R2[R2 source assets]\n  Worker --> KV[KV state]\n  Worker -. held runtime wiring .-> Queue[Queue / DLQ]\n  Worker -. held runtime wiring .-> D1[D1 provenance]\n  Ops[WTF OS /ops UI] -. future Access + D1 proof .-> Worker\n  MCP[wtf-os-local STDIO MCP] -. planned hosted projection .-> Worker\n\`\`\`\n\n## Interpretation\n\n- Solid edges are repository source relationships or declared bindings.\n- Dashed edges are held or owner-gated integrations, not runtime proof.\n- The public Phase 1 route contract is independent of Cloudflare Access provisioning.\n- See [architecture.html](architecture.html) for evidence, statuses, and update gates.\n`;
}

function loadRuntimeMetadata() {
  const rootPackage = readJson("package.json");
  const webPackage = readJson("web/package.json");
  const workerPackage = readJson("cloudflare/package.json");
  const pluginPackage = readJson("plugins/wtf-os/package.json");
  const workerConfig = readJson("cloudflare/wrangler.jsonc");
  const bindingSummary = [
    workerConfig.ai?.binding,
    ...(workerConfig.vectorize ?? []).map((item) => item.binding),
    ...(workerConfig.kv_namespaces ?? []).map((item) => item.binding),
    ...(workerConfig.r2_buckets ?? []).map((item) => item.binding),
    ...(workerConfig.queues?.producers ?? []).map((item) => item.binding),
    ...(workerConfig.d1_databases ?? []).map((item) => item.binding),
  ].filter(Boolean).join(", ");
  return {
    versions: { root: rootPackage.version, web: webPackage.version, worker: workerPackage.version, plugin: pluginPackage.version },
    workerName: workerConfig.name,
    bindingSummary,
  };
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
validate(source);
const metadata = fingerprint(source);
const runtime = loadRuntimeMetadata();
const outputs = {
  [outputPaths.html]: htmlDocument(source, metadata),
  [outputPaths.services]: servicesDocument(source, metadata, runtime),
  [outputPaths.graph]: graphDocument(metadata, runtime),
};

function verifyOrWrite(path, content) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (mode === "--check") {
    if (current !== content) throw new Error(`Architecture artifact is stale: ${relative(root, path)}. Run npm run docs:architecture:update`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

for (const [path, content] of Object.entries(outputs)) verifyOrWrite(path, content);
process.stdout.write(`Architecture ledger ${mode === "--check" ? "is current" : "updated"}: ${metadata.files.length} inputs, ${metadata.hash}\n`);

#!/usr/bin/env node
/**
 * Plan 01-06 Task 1 — bounded performance baseline capture (D-15).
 *
 * Measures the owner-approved current application before any visual migration:
 *   1. Verifies the approved protected-file hashes and compatibility-manifest
 *      hash from tests/contracts/phase1-baseline-approval.json (preflight).
 *   2. Removes only the generated web/.next output and produces a fresh
 *      production build (stale-build reuse is impossible by construction).
 *   3. Serves the fresh build with the local production server on 127.0.0.1
 *      and runs Lighthouse five times for each protected UI route using the
 *      pinned Playwright Chromium.
 *   4. Measures route-ready plus key interaction timings (episode drawer,
 *      connections node expand, chat safe-error round trip) with the same
 *      pinned browser.
 *   5. Writes normalized statistics + environment identity to
 *      tests/performance/phase1-baseline.json (atomic tmp rename). Raw
 *      Lighthouse reports stay in gitignored lighthouse-reports/ only.
 *
 * External isolation (no Vercel/Cloudflare/fonts/thumbnails/analytics/report
 * service is ever contacted):
 *   - Lighthouse runs with blockedUrlPatterns for thumbnail/font/analytics
 *     hosts and /_next/image (the Next image optimizer would otherwise fetch
 *     thumbnails server-side).
 *   - The Playwright interaction pass aborts every non-loopback request and
 *     /_next/image at the browser level.
 *   - The server is started with CLOUDFLARE_EDGE_SHARED_SECRET forced empty so
 *     /api/chat returns its local safe 503 before any upstream fetch, and
 *     CLOUDFLARE_RAG_URL pointed at loopback as defense in depth.
 *
 * Usage:
 *   node scripts/capture-phase1-performance.mjs           # full capture
 *   node scripts/capture-phase1-performance.mjs --check   # validate the
 *     existing baseline: schema, five samples per route, environment and
 *     bundle identity, and hash agreement with the approval receipt and the
 *     current on-disk protected files. Exits nonzero on any mismatch or
 *     missing/partial route data.
 *
 * The artifact contains no absolute paths, secret/env values, raw page
 * bodies, source payloads, or external report URLs.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

const APPROVAL_PATH = path.join(WEB_ROOT, "tests/contracts/phase1-baseline-approval.json");
const MANIFEST_PATH = path.join(WEB_ROOT, "tests/contracts/phase1-compatibility-manifest.json");
const BASELINE_PATH = path.join(WEB_ROOT, "tests/performance/phase1-baseline.json");
const REPORTS_DIR = path.join(WEB_ROOT, "lighthouse-reports");
const BUILD_DIR = path.join(WEB_ROOT, ".next");

// Bind an ephemeral port so unrelated local servers (e.g. another
// project's vite preview on 4173) can never be mistaken for the app.
const PORT = 0;
let BASE_URL = "";
const RUNS = 5;
const ROUTES = ["/", "/episodes", "/connections", "/chat"];
const ROUTE_SLUGS = { "/": "home", "/episodes": "episodes", "/connections": "connections", "/chat": "chat" };

// Hosts/patterns blocked during Lighthouse collection. /_next/image is the
// server-side optimizer for i.ytimg.com thumbnails; blocking it keeps the
// whole measurement offline-deterministic.
const BLOCKED_URL_PATTERNS = [
  "*_next/image*",
  "*i.ytimg.com*",
  "*img.youtube.com*",
  "*youtube.com*",
  "*youtu.be*",
  "*googleapis.com*",
  "*gstatic.com*",
  "*google-analytics*",
  "*googletagmanager*",
  "*vercel*",
  "*workers.dev*",
];

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fail(message) {
  console.error(`capture-phase1-performance: ${message}`);
  process.exit(1);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function round1(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function preflight() {
  const approval = JSON.parse(fs.readFileSync(APPROVAL_PATH, "utf8"));
  if (approval.status !== "approved") fail("baseline approval receipt is not approved");

  const manifestHash = sha256File(MANIFEST_PATH);
  if (manifestHash !== approval.manifest_sha256) {
    fail("compatibility manifest hash drifted from the approved receipt");
  }

  for (const entry of approval.approved_protected_hashes) {
    const abs = path.join(REPO_ROOT, entry.path);
    if (!fs.existsSync(abs)) fail(`protected file missing on disk: ${entry.path}`);
    const actual = sha256File(abs);
    if (actual !== entry.sha256) fail(`protected file hash drifted: ${entry.path}`);
  }

  return {
    base_sha: approval.base_sha,
    manifest_sha256: manifestHash,
    approval_ref: approval.owner_approval_ref,
    protected_hashes: approval.approved_protected_hashes.map(({ path, sha256 }) => ({ path, sha256 })),
  };
}

function freshBuild() {
  // Remove only the generated build output, then rebuild from scratch —
  // stale .next reuse is impossible by construction.
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  const result = spawnSync("npm", ["run", "build"], {
    cwd: WEB_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.status !== 0 || !fs.existsSync(path.join(BUILD_DIR, "BUILD_ID"))) {
    console.error(result.stdout?.slice(-4000));
    console.error(result.stderr?.slice(-4000));
    fail("production build failed");
  }
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * Normalized bundle summary from the fresh build: aggregate static asset
 * sizes (KB, transfer-equivalent file sizes on disk) plus per-route First
 * Load JS parsed from the build output when the table format is recognized.
 */
function bundleSummary(buildStdout) {
  const unit = "KB";
  const toKb = (bytes) => Math.round((bytes / 1024) * 10) / 10;
  const totals = { js: 0, css: 0, media: 0, other: 0 };
  const staticDir = path.join(BUILD_DIR, "static");
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const kb = toKb(fs.statSync(full).size);
        if (entry.name.endsWith(".js")) totals.js += kb;
        else if (entry.name.endsWith(".css")) totals.css += kb;
        else if (/\.(png|jpg|jpeg|svg|woff2?|mp3|webp|ico)$/.test(entry.name)) totals.media += kb;
        else totals.other += kb;
      }
    }
  };
  walk(staticDir);

  // Per-route First Load JS from the build table (best effort; aggregate
  // summary above remains authoritative if the format changes).
  const routes = {};
  for (const line of buildStdout.split("\n")) {
    const match = line.match(/(?:^|[│┌├└┬─\s])((?:\/[\w-]*)?)\s+(?:[○●ƒ◆]+\s+)?([\d.]+)\s*(kB|B)\s+([\d.]+)\s*(kB|B)\s*$/);
    if (!match) continue;
    const [, route, firstSize, firstUnit, , ] = match;
    const loadSize = line.match(/([\d.]+)\s*(kB|B)\s*$/);
    if (!route.startsWith("/") || !loadSize) continue;
    const kb = loadSize[2] === "B" ? toKb(Number(loadSize[1])) : Number(loadSize[1]);
    routes[route] = Math.round(kb * 10) / 10;
  }

  return {
    unit,
    measured_from: "fresh production build output and .next/static file sizes",
    static_js_kb: Math.round(totals.js * 10) / 10,
    static_css_kb: Math.round(totals.css * 10) / 10,
    static_media_kb: Math.round(totals.media * 10) / 10,
    static_other_kb: Math.round(totals.other * 10) / 10,
    routes_first_load_js_kb: routes,
    routes_parse_status: Object.keys(routes).length > 0 ? "parsed-from-build-output" : "aggregate-only",
  };
}

async function startServer() {
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      cwd: WEB_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      // Secret forced empty: /api/chat returns its local safe 503 before any
      // upstream fetch. RAG URL pinned to loopback as defense in depth.
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", CLOUDFLARE_EDGE_SHARED_SECRET: "", CLOUDFLARE_RAG_URL: "http://127.0.0.1:9" },
    }
  );
  // Resolve the actual bound port from the server's stdout ("Ready" line or
  // "-p 0" makes Next print the chosen ephemeral port).
  BASE_URL = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server never reported its port")), 30_000);
    server.stdout.on("data", (chunk) => {
      const m = String(chunk).match(/Local:\s*http:\/\/[^\s]+/);
      if (m) {
        clearTimeout(timer);
        resolve(m[0].match(/http:\/\/[^\s]+/)[0].replace(/\/$/, ""));
      }
    });
    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`local production server exited during startup (code ${code})`));
    });
  });
  console.log(`server ready at ${BASE_URL}`);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return server;
    } catch {
      /* not ready yet */
    }
    if (server.exitCode !== null) fail("local production server exited during startup");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  server.kill("SIGKILL");
  fail("local production server did not become ready within 120s");
}

async function withLighthouseChrome(fn) {
  const { launch } = require("chrome-launcher");
  const { chromium } = require("playwright-core");
  const chromePath = chromium.executablePath();
  const launcher = await launch({
    chromePath,
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions"],
  });
  try {
    return await fn(launcher.port, chromePath);
  } finally {
    await launcher.kill();
  }
}

function lighthouseConfig() {
  return {
    extends: "lighthouse:default",
    settings: {
      onlyCategories: ["performance"],
      blockedUrlPatterns: BLOCKED_URL_PATTERNS,
      maxWaitForLoad: 60_000,
    },
  };
}

function lhMetrics(lhr) {
  const audit = (id) => lhr.audits[id]?.numericValue ?? null;
  return {
    fcp_ms: round1(audit("first-contentful-paint")),
    lcp_ms: round1(audit("largest-contentful-paint")),
    tbt_ms: round1(audit("total-blocking-time")),
    cls: round1(audit("cumulative-layout-shift")),
    speed_index_ms: round1(audit("speed-index")),
    performance_score: lhr.categories?.performance?.score != null ? Math.round(lhr.categories.performance.score * 100) : null,
  };
}

function resourceSummary(lhr) {
  const items = lhr.audits?.["resource-summary"]?.details?.items ?? [];
  const unit = "KB";
  const pick = {};
  for (const item of items) {
    pick[item.resourceType] = {
      transfer_kb: Math.round(((item.transferSize ?? 0) / 1024) * 10) / 10,
      request_count: item.requestCount ?? 0,
    };
  }
  return { unit, from: "lighthouse resource-summary audit", categories: pick };
}

/**
 * One interaction pass for a route with the pinned browser, external
 * requests aborted at the browser level. Returns route-ready plus the
 * route's key interaction timing in ms.
 */
async function interactionPass(chromium, route) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route("**/*", (route2) => {
      const url = new URL(route2.request().url());
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route2.abort();
      if (url.pathname.startsWith("/_next/image")) return route2.abort();
      return route2.continue();
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 60_000 });
    const nav = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0];
      return {
        dom_content_loaded_ms: Math.round(entry?.domContentLoadedEventEnd ?? 0),
        load_ms: Math.round(entry?.loadEventEnd ?? 0),
      };
    });
    const result = { route_ready_ms: nav.dom_content_loaded_ms, load_event_ms: nav.load_ms };

    if (route === "/episodes") {
      const started = Date.now();
      await page.locator('button[data-cursor="open"]').first().click();
      await page.locator("aside").first().waitFor({ state: "visible", timeout: 15_000 });
      result.drawer_open_ms = Date.now() - started;
    } else if (route === "/connections") {
      const started = Date.now();
      await page.locator("details > summary").first().click();
      await page
        .locator("details[open]")
        .first()
        .waitFor({ state: "attached", timeout: 15_000 });
      result.node_expand_ms = Date.now() - started;
    } else if (route === "/chat") {
      // Safe local 503 path: the server runs without the edge secret, so the
      // round trip never leaves 127.0.0.1 and always ends in the safe error.
      const started = Date.now();
      await page.locator("form input").first().fill("baseline interaction probe");
      await page.locator('button[type="submit"]').click();
      await page
        .locator(":text('⚠️')")
        .first()
        .waitFor({ state: "visible", timeout: 35_000 });
      result.chat_safe_error_ms = Date.now() - started;
    }
    return result;
  } finally {
    await browser.close();
  }
}

function computeStats(runs) {
  const metricNames = new Set();
  for (const run of runs) {
    for (const group of ["lighthouse", "interaction"]) {
      for (const [key, value] of Object.entries(run[group] ?? {})) {
        if (typeof value === "number") metricNames.add(`${group}.${key}`);
      }
    }
  }
  const stats = {};
  for (const name of metricNames) {
    const [group, key] = name.split(".");
    const values = runs.map((run) => run[group]?.[key]).filter((v) => typeof v === "number");
    if (!values.length) continue;
    stats[name] = {
      median: round1(median(values)),
      p75: round1(percentile(values, 75)),
      max: round1(Math.max(...values)),
      unit: key.endsWith("_ms") ? "ms" : key === "cls" ? "score" : key.includes("score") ? "score" : "value",
    };
  }
  return stats;
}

function writeBaseline(baseline) {
  // Completeness gate: every route must have exactly RUNS complete samples
  // before the artifact is written (atomic tmp rename).
  for (const route of ROUTES) {
    const entry = baseline.routes[route];
    if (!entry || entry.runs.length !== RUNS) {
      fail(`missing/partial route data for ${route}: ${entry?.runs.length ?? 0}/${RUNS} samples`);
    }
    for (const run of entry.runs) {
      if (!run.lighthouse || !run.interaction) fail(`incomplete sample ${run.sample_id}`);
    }
  }
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  const tmp = `${BASELINE_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(baseline, null, 2)}\n`);
  fs.renameSync(tmp, BASELINE_PATH);
}

async function capture() {
  const source = preflight();
  console.log("preflight: approved hashes verified");

  const build = freshBuild();
  const bundle = bundleSummary(build.stdout);
  console.log("build: fresh production build complete");

  const server = await startServer();
  let lighthousePort;
  let chromiumIdentity;
  try {
    await withLighthouseChrome(async (port, chromePath) => {
      lighthousePort = port;
      const lighthouse = (await import("lighthouse")).default;
      const { chromium } = require("playwright-core");
      const { version: playwrightVersion } = require("playwright-core/package.json");
      const cacheSegment = chromePath.match(/(chromium[_-]?\d+)/)?.[1] ?? "chromium";
      chromiumIdentity = `${cacheSegment} (playwright-core ${playwrightVersion})`;

      const config = lighthouseConfig();
      const routesData = Object.fromEntries(ROUTES.map((route) => [route, { runs: [] }]));
      // Keep the median-LCP run's resource summary per route.
      const resourceByRoute = Object.fromEntries(ROUTES.map((route) => [route, []]));

      // Lighthouse 12's trace engine can throw a spurious LanternError:NO_LCP
      // on headless traces; retry the sample before failing the capture.
      const runLighthouse = async (url) => {
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return await lighthouse(url, { port, output: "json", logLevel: "error" }, config);
          } catch (error) {
            lastError = error;
            if (!String(error?.message ?? error).includes("NO_LCP")) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        throw lastError;
      };

      for (let runIndex = 1; runIndex <= RUNS; runIndex++) {
        for (const route of ROUTES) {
          const result = await runLighthouse(`${BASE_URL}${route}`);
          const lhr = result.lhr;
          fs.mkdirSync(REPORTS_DIR, { recursive: true });
          fs.writeFileSync(
            path.join(REPORTS_DIR, `01-06-${ROUTE_SLUGS[route]}-run-${runIndex}.json`),
            JSON.stringify(lhr)
          );
          const lighthouseMetrics = lhMetrics(lhr);
          resourceByRoute[route].push({ run: runIndex, lcp_ms: lighthouseMetrics.lcp_ms, summary: resourceSummary(lhr) });

          const interaction = await interactionPass(chromium, route);
          routesData[route].runs.push({
            sample_id: `01-06-${ROUTE_SLUGS[route]}-run-${runIndex}`,
            lighthouse: lighthouseMetrics,
            interaction,
          });
          console.log(`sampled ${route} run ${runIndex}/${RUNS}`);
        }
      }

      const routes = {};
      for (const route of ROUTES) {
        const runs = routesData[route].runs;
        const sorted = [...resourceByRoute[route]].sort((a, b) => (a.lcp_ms ?? 0) - (b.lcp_ms ?? 0));
        routes[route] = {
          runs,
          stats: computeStats(runs),
          resources: sorted[Math.floor(sorted.length / 2)]?.summary ?? null,
        };
      }

      const { version: nextVersion } = require("next/package.json");
      const lighthousePkg = require("lighthouse/package.json");
      const baseline = {
        schema_version: 1,
        plan: "01-06",
        generated_at: new Date().toISOString(),
        source,
        environment: {
          node: process.version,
          npm: spawnSync("npm", ["--version"], { encoding: "utf8" }).stdout?.trim() ?? null,
          chromium: chromiumIdentity,
          lighthouse: lighthousePkg.version,
          next: nextVersion,
          os: { platform: process.platform, arch: process.arch },
          viewport: { width: 1440, height: 900 },
          server: `next start (local production server at ${BASE_URL}, ephemeral port)`,
          external_assets: "blocked at browser and Lighthouse level (/_next/image, thumbnail/font/analytics hosts); edge secret forced empty so /api/chat stays local",
          runs_per_route: RUNS,
        },
        bundle,
        routes,
      };
      writeBaseline(baseline);
      console.log(`baseline written: ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
    });
  } finally {
    server.kill("SIGTERM");
    setTimeout(() => server.kill("SIGKILL"), 3000).unref();
  }
}

function check() {
  if (!fs.existsSync(BASELINE_PATH)) fail("baseline artifact missing — run a capture first");
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  if (baseline.schema_version !== 1 || baseline.plan !== "01-06") fail("baseline schema/plan drift");
  if (!baseline.environment?.chromium || !baseline.bundle) fail("baseline missing environment or bundle identity");

  const approval = JSON.parse(fs.readFileSync(APPROVAL_PATH, "utf8"));
  if (baseline.source?.manifest_sha256 !== approval.manifest_sha256) {
    fail("baseline manifest hash does not match the approved receipt");
  }
  if (baseline.source?.base_sha !== approval.base_sha) fail("baseline base_sha does not match the approved receipt");
  if (sha256File(MANIFEST_PATH) !== approval.manifest_sha256) fail("compatibility manifest drifted from the approved receipt");
  for (const entry of approval.approved_protected_hashes) {
    if (sha256File(path.join(REPO_ROOT, entry.path)) !== entry.sha256) {
      fail(`protected file drifted since capture: ${entry.path}`);
    }
  }

  const generatedAt = new Date(baseline.generated_at);
  if (Number.isNaN(generatedAt.getTime())) fail("baseline generated_at is not ISO-8601");
  if (generatedAt.getTime() > Date.now() + 5 * 60_000) fail("baseline generated_at is in the future");

  for (const route of ROUTES) {
    const entry = baseline.routes?.[route];
    if (!entry || !Array.isArray(entry.runs) || entry.runs.length !== RUNS) {
      fail(`route ${route} does not have exactly ${RUNS} samples`);
    }
    for (const run of entry.runs) {
      if (!run.sample_id || !run.lighthouse?.lcp_ms || !run.interaction?.route_ready_ms) {
        fail(`incomplete sample in ${route}`);
      }
    }
    if (!entry.stats || !entry.resources) fail(`route ${route} missing stats/resources summary`);
  }

  console.log(`check: baseline valid — ${ROUTES.length} routes x ${RUNS} runs, environment and hashes verified`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) await capture();
  else if (args.length === 1 && args[0] === "--check") check();
  else fail("usage: node scripts/capture-phase1-performance.mjs [--check]");
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});

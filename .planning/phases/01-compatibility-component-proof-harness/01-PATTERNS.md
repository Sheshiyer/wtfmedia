# Phase 1: Compatibility + Component Proof Harness - Pattern Map

**Mapped:** 2026-08-19
**Files analyzed:** 62 explicit or structurally implied targets
**Analogs found:** 39 / 62

This map treats the accepted working tree as the compatibility source. Existing route and component files are exact self-analogs for behavior-preserving edits. Proposed new filenames below follow the structure in `01-RESEARCH.md`; the planner may refine a new filename while preserving its listed responsibility. No existing web test, Storybook, Playwright, Vitest, Lighthouse, or CI harness exists.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `web/package.json` | config | batch | `web/package.json` | exact |
| `web/package-lock.json` | config | batch | `web/package-lock.json` | exact |
| `web/.gitignore` | config | file-I/O | `web/.gitignore` | exact |
| `web/app/globals.css` | config | transform | `web/app/globals.css` | exact |
| `web/tailwind.config.ts` | config | transform | `web/tailwind.config.ts` | exact |
| `web/styles/tokens.css` | config | transform | `web/app/globals.css` | role-match |
| `web/styles/themes.css` | config | transform | `web/app/globals.css` | role-match |
| `web/styles/motion.css` | config | event-driven | `web/app/globals.css` | role-match |
| `web/app/layout.tsx` | component | request-response | `web/app/layout.tsx` | exact |
| `web/components/patterns/PublicShell.tsx` | component | request-response | `web/app/layout.tsx` | role-match |
| `web/app/page.tsx` | route | request-response | `web/app/page.tsx` | exact |
| `web/app/episodes/page.tsx` | route | request-response | `web/app/episodes/page.tsx` | exact |
| `web/app/connections/page.tsx` | route | request-response | `web/app/connections/page.tsx` | exact |
| `web/app/chat/page.tsx` | component | streaming | `web/app/chat/page.tsx` | exact |
| `web/app/api/chat/route.ts` | route | request-response | `web/app/api/chat/route.ts` | exact |
| `web/components/EpisodesBrowser.tsx` | component | request-response | `web/components/EpisodesBrowser.tsx` | exact |
| `web/components/patterns/ScrollRail.tsx` | component | event-driven | `web/components/DragRow.tsx` | role-match |
| `web/components/DragRow.tsx` | component | event-driven | `web/components/DragRow.tsx` | exact |
| `web/components/GuestStrip.tsx` | component | event-driven | `web/components/GuestStrip.tsx` | exact |
| `web/components/ConnectionGraph.tsx` | component | event-driven | `web/components/ConnectionGraph.tsx` | exact |
| `web/components/patterns/GraphWithList.tsx` | component | transform | `web/app/connections/page.tsx` | role-match |
| `web/components/patterns/SourcePanel.tsx` | component | transform | `web/app/chat/page.tsx` | role-match |
| `web/components/Wordmark.tsx` | component | transform | `web/components/Wordmark.tsx` | exact |
| `web/components/Sparkle.tsx` | component | transform | `web/components/Sparkle.tsx` | exact |
| `web/components/Marquee.tsx` | component | event-driven | `web/components/Marquee.tsx` | exact |
| `web/components/CustomCursor.tsx` | component | event-driven | `web/components/CustomCursor.tsx` | exact |
| `web/components/ModelPicker.tsx` | component | event-driven | `web/app/chat/page.tsx` | exact public-usage analog |
| `web/components/ui/Button.tsx` | component | event-driven | `web/app/chat/page.tsx` | role-match |
| `web/components/ui/IconButton.tsx` | component | event-driven | `web/components/EpisodesBrowser.tsx` | role-match |
| `web/components/ui/Drawer.tsx` | component | event-driven | `web/components/EpisodesBrowser.tsx` | role-match; behavior must be replaced |
| `web/components/ui/AvailabilityState.tsx` | component | transform | `web/components/EpisodesBrowser.tsx` | role-match |
| `web/lib/public/contracts.ts` | utility | transform | `web/app/api/chat/route.ts` | role-match |
| `web/lib/public/url-state.ts` | hook | event-driven | `web/app/chat/page.tsx` | role-match |
| `web/lib/public/public-ui-variant.ts` | utility | request-response | `web/app/api/chat/route.ts` | role-match |
| `web/components/legacy/public/*` | component | request-response | protected route/component source being retained | exact |
| `web/stories/fixtures/*` | model | file-I/O | `web/lib/episodes.ts`, `web/lib/connections.ts` | data-shape match |
| `web/eslint.config.mjs` | config | transform | `video/eslint.config.mjs` | role-match |
| `web/.storybook/main.ts` | config | transform | — | none |
| `web/.storybook/preview.ts` | config | transform | — | none |
| `web/vitest.config.ts` | config | batch | — | none |
| `web/playwright.config.ts` | config | batch | — | none |
| `web/lighthouserc.cjs` | config | batch | — | none |
| `web/scripts/verify-phase1.mjs` | utility | batch | `scripts/evaluate_production_rag.mjs` | role-match |
| `.github/workflows/phase1.yml` | config | batch | — | none |
| `web/tests/support/rag-stub.mjs` | service | request-response | — | none |
| `web/tests/contracts/api-chat.contract.test.ts` | test | request-response | — | none |
| `web/tests/contracts/public-projection.contract.test.ts` | test | transform | — | none |
| `web/tests/contracts/connections-parity.test.ts` | test | transform | — | none |
| `web/tests/contracts/rag-latency.test.ts` | test | request-response | `scripts/evaluate_production_rag.mjs` | partial |
| `web/tests/journeys/public-routes.spec.ts` | test | request-response | — | none |
| `web/tests/journeys/url-state.spec.ts` | test | event-driven | — | none |
| `web/tests/journeys/connections.spec.ts` | test | event-driven | — | none |
| `web/tests/journeys/focus.spec.ts` | test | event-driven | — | none |
| `web/tests/journeys/motion.spec.ts` | test | event-driven | — | none |
| `web/tests/journeys/viewports.spec.ts` | test | request-response | — | none |
| `web/tests/unit/tokens.test.ts` | test | transform | — | none |
| `web/tests/unit/component-trace.test.ts` | test | file-I/O | — | none |
| `web/tests/privacy/scan.mjs` | utility | file-I/O | — | none |
| `web/tests/rollback/verify.mjs` | utility | batch | — | none |
| `web/tests/performance/phase1-budgets.json` | config | transform | — | none |
| `web/tests/visual/phase1-approval.json` | config | file-I/O | — | none |
| `web/components/**/*.stories.tsx` | test | event-driven | — | none |

## Pattern Assignments

### Shared tokens, shell, and route composition

**Apply to:** `web/styles/tokens.css`, `web/styles/themes.css`, `web/styles/motion.css`, `web/app/globals.css`, `web/tailwind.config.ts`, `web/app/layout.tsx`, `web/components/patterns/PublicShell.tsx`, and all four public page files.

**Analog:** `web/app/globals.css`

**CSS entry and current token pattern** (lines 1-11):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Poppins:wght@300;400;500;600;700&display=swap");

:root {
  color-scheme: light;
  --cream: #fff6ea;
  --ink: #1a1a1a;
}
```

Preserve the font/brand source while expanding `:root` into semantic roles. Replace, rather than duplicate, raw hex usage. The current pitfalls to eliminate are smooth scrolling with no reduced-motion override (lines 17-19), native-cursor suppression (lines 29-35), `transition: all` (lines 109-123), and perpetual motion defined in `web/tailwind.config.ts` lines 26-50.

**App Router shell pattern** — `web/app/layout.tsx` (lines 1-6, 39-65):

```tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { CustomCursor } from "@/components/CustomCursor";
import { WordmarkMini } from "@/components/Wordmark";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <CustomCursor />
        <header>{/* shared public navigation */}</header>
        <main className="flex-1">{children}</main>
        <footer>{/* shared public footer */}</footer>
      </body>
    </html>
  );
}
```

Keep metadata server-owned and route URLs unchanged. A new `PublicShell` should extract presentation from this structure without changing the `RootLayout` boundary.

**Server page to client-island pattern** — `web/app/episodes/page.tsx` (lines 1-9, 31-34):

```tsx
import { data, groupByPlaylist } from "@/lib/episodes";
import { EpisodesBrowser } from "@/components/EpisodesBrowser";

export default function EpisodesPage() {
  const groups = groupByPlaylist(data.entries);
  return (
    <div>
      {/* server-rendered editorial framing */}
      <EpisodesBrowser groups={groups} />
    </div>
  );
}
```

Use this boundary on Episodes and Connections: server-import public repository data, then pass only public typed props to client interaction islands.

---

### Episodes browser, ScrollRail, drawer, controls, and availability states

**Apply to:** `web/components/EpisodesBrowser.tsx`, `web/components/patterns/ScrollRail.tsx`, `web/components/DragRow.tsx`, `web/components/GuestStrip.tsx`, `web/components/ui/Drawer.tsx`, `web/components/ui/Button.tsx`, `web/components/ui/IconButton.tsx`, `web/components/ui/AvailabilityState.tsx`, and `web/lib/public/url-state.ts`.

**Analog:** `web/components/EpisodesBrowser.tsx`

**Imports and public data pattern** (lines 1-9):

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews } from "@/lib/episodes";
import { DragRow } from "./DragRow";
import { Sparkle } from "./Sparkle";
```

Keep the `@/` alias for cross-directory imports and relative imports only for siblings. New browser-only interaction modules start with `"use client"`.

**Card activation and public field pattern** (lines 38-69):

```tsx
<DragRow>
  {eps.map((e) => (
    <button key={e.video_id} onClick={() => setActive(e)}>
      <Image src={thumbnailUrl(e.video_id)} alt={e.title} fill sizes="300px" />
      <span>{fmtDuration(e.duration)}</span>
      <h3>{e.title}</h3>
      <span>{fmtViews(e.view_count)} views</span>
    </button>
  ))}
</DragRow>
```

Copy the public fields and button semantics, but replace local `active` state with URL-derived selection. The selected ID must resolve only through the supplied public episode map.

**Transcript state and fallback pattern** (lines 94-125, 197-230):

```tsx
fetch(`/transcripts/${ep.video_id}.json`)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then(/* map timestamped snippets */)
  .catch(() => {
    fetch(`/transcripts/${ep.video_id}.txt`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setText)
      .catch(() => setErr(true));
  });

{blocks === null && text === null && !err && <p>Loading transcript…</p>}
{err && <p>No transcript available for this episode.</p>}
{blocks && /* timestamped links */}
{text && !blocks && /* plain transcript */}
```

Preserve JSON-first/plain-text fallback and explicit loading/unavailable states. Convert those states to the shared availability vocabulary; do not broaden the public detail payload.

**Ask/source-link pattern** (lines 137-139, 167-183, 205-223): preserve `encodeURIComponent`, `target="_blank"`, `rel="noreferrer"`, source URL, and timestamp suffix behavior.

**Scroll analog:** `web/components/DragRow.tsx` (lines 1-8, 34-47)

```tsx
"use client";
import { useRef } from "react";

export function DragRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="drag-row flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
      {children}
    </div>
  );
}
```

Retain the native `overflow-x-auto` baseline. `ScrollRail` adds labelled previous/next buttons, snap, position state, reduced-motion-aware `scrollBy`, keyboard-operable contents, and touch/trackpad behavior. The pointer handlers at lines 10-31 are optional enhancement only and must not remain the sole interaction.

**Do not copy the bespoke drawer shell:** `EpisodesBrowser.tsx` lines 127-157 manually owns Escape, body locking, backdrop, and `<aside>` but has no complete dialog/focus contract. Use the researched Radix-controlled Dialog pattern; this analog supplies data flow and public content only.

---

### Connections projection and equivalent list

**Apply to:** `web/app/connections/page.tsx`, `web/components/ConnectionGraph.tsx`, `web/components/patterns/GraphWithList.tsx`, `web/lib/public/contracts.ts`, and `web/tests/contracts/connections-parity.test.ts`.

**Analog:** `web/lib/connections.ts`

**Typed public projection pattern** (lines 1-26):

```ts
import raw from "@/src/data/connections.json";

export type CNode = {
  id: string;
  label: string;
  category: string;
  episodes: string[];
  episodeCount: number;
  mentions: number;
};
export type Edge = { a: string; b: string; shared: number; episodes: string[] };

export const connections = raw as ConnectionsData;
```

Normalize one allowlisted projection before rendering. Both canvas and semantic list consume identical node IDs, labels, categories, episode IDs/counts, edges, and source links.

**Existing dual presentation seam** — `web/app/connections/page.tsx` (lines 16-24, 40-55, 73-76, 97-105):

```tsx
const graphNodes = [...C.established, ...C.emerging].slice(0, 40);
const graphIds = new Set(graphNodes.map((n) => n.id));
const graphEdges = C.edges.filter((e) => graphIds.has(e.a) && graphIds.has(e.b));

<ConnectionGraph nodes={graphNodes} edges={graphEdges} titles={C.titles} />

{C.established.map((n) => <NodeRow key={n.id} n={n} />)}
```

Refactor this seam so `GraphWithList` passes the same normalized collection to both renderers; do not leave the list as a separately filtered summary.

**Canvas lifecycle pattern** — `web/components/ConnectionGraph.tsx` (lines 49-68, 226-236):

```tsx
useEffect(() => {
  const canvas = canvasRef.current!;
  const ctx = canvas.getContext("2d")!;
  const resize = () => { /* size and DPR transform */ };
  resize();
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("resize", resize);
  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", resize);
  };
}, [nodes, edges, titles]);
```

Keep effect cleanup. Replace raw category hex and perpetual `requestAnimationFrame` with semantic tokens and a stable reduced-motion layout. Canvas selection remains an enhancement; the semantic list must independently expose all meaning and links.

---

### Ask WTF client and `/api/chat` compatibility

**Apply to:** `web/app/chat/page.tsx`, `web/components/patterns/SourcePanel.tsx`, `web/components/ModelPicker.tsx` public removal, `web/app/api/chat/route.ts`, `web/lib/public/contracts.ts`, and all chat contract/journey tests.

**Analog:** `web/app/chat/page.tsx`

**Suspense and query autosubmit pattern** (lines 1-11, 126-133, 290-296):

```tsx
"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const params = useSearchParams();
useEffect(() => {
  const q = params.get("q");
  if (q && !sentInitial.current) {
    sentInitial.current = true;
    runFast([{ role: "user", content: q }], model);
  }
}, [params]);

export default function ChatPage() {
  return <Suspense fallback={<div className="halftone min-h-[calc(100vh-64px)]" />}><ChatInner /></Suspense>;
}
```

Preserve `/chat?q=` autosubmit and the Suspense boundary. Remove the `ModelPicker` import/render and retry-by-model public controls; retain one stable Ask WTF identity.

**Streaming/body-reader and header pattern** (lines 59-105):

```tsx
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: useModel,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  }),
});
if (!res.ok || !res.body) { /* safe text/JSON error consumption */ }
const hdr = res.headers.get("X-Sources");
if (hdr) try { sources = JSON.parse(decodeURIComponent(hdr)); } catch {}
const usedModel = res.headers.get("X-Model") || useModel;
const didFallback = res.headers.get("X-Fallback") === "true";
const reader = res.body.getReader();
const dec = new TextDecoder();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  acc += dec.decode(value, { stream: true });
  setLast({ role: "assistant", content: acc, sources, model: usedModel });
}
```

This is frozen client behavior: preserve request shape until the baseline fixture says otherwise, safe failure consumption, encoded source decoding, model/fallback headers, incremental reader loop, loading state, citations, and source links.

**Safe markdown/source rendering pattern** (lines 193-235): keep `react-markdown` + `remark-gfm`, do not add raw HTML, and render links with `target="_blank"` plus `rel="noreferrer"`.

**Route Handler validation and error pattern** — `web/app/api/chat/route.ts` (lines 41-75):

```ts
export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last?.content?.trim()) return new Response("no user message", { status: 400 });
  if (last.content.length > MAX_QUESTION_CHARS) return new Response("question too long", { status: 400 });
  if (!EDGE_SHARED_SECRET) return Response.json({ error: "The answer service is not configured." }, { status: 503 });
  // fetch edge service; map every network/upstream parse failure to the same safe 503
}
```

Do not “improve” validation/status/error strings during baseline capture.

**Server-only boundary and success response** — `web/app/api/chat/route.ts` (lines 54-67, 76-86):

```ts
edge = await fetch(`${EDGE_RAG_URL}/v1/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Edge-Secret": EDGE_SHARED_SECRET,
    "X-Client-IP": req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    "X-Request-ID": crypto.randomUUID(),
  },
  body: JSON.stringify({ question: last.content }),
  cache: "no-store",
  signal: AbortSignal.timeout(25_000),
});

return new Response(result.answer, {
  status: edge.status,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Sources": encodeURIComponent(sourceHeader(sources)),
    "X-Model": "cloudflare/llama-3.3-70b-instruct",
    "X-Fallback": result.grounded ? "false" : "true",
    "Cache-Control": "no-store",
  },
});
```

No auth is added for public users. The only guard is the existing server-to-server secret; it must never enter fixtures, client bundles, DOM, snapshots, logs, or planning artifacts.

---

### Brand, selective motion, and shared controls

**Apply to:** `web/components/Wordmark.tsx`, `web/components/Sparkle.tsx`, `web/components/Marquee.tsx`, `web/components/CustomCursor.tsx`, and shared UI controls.

**Wordmark API pattern** — `web/components/Wordmark.tsx` (lines 4-12, 38-47): retain small prop surfaces with defaults and keep both full and mini lockups exported from the same module.

```tsx
export function Wordmark({
  className = "",
  size = "text-7xl sm:text-8xl",
  withSparkles = true,
}: {
  className?: string;
  size?: string;
  withSparkles?: boolean;
}) { /* ... */ }
```

Replace inline hex with semantic tokens without altering the visible letter sequence or public component API.

**Decorative SVG pattern** — `web/components/Sparkle.tsx` (lines 1-18): retain `aria-hidden`, explicit size, and a decorative-only contract. Use semantic color values rather than new raw hex.

**Marquee content pattern** — `web/components/Marquee.tsx` (lines 3-27): the doubled row is the current seamless-loop method. Add a pause control and static reduced-motion rendering; do not make the loop unavoidable.

**Fine-pointer feature detection and cleanup** — `web/components/CustomCursor.tsx` (lines 10-13, 45-51):

```tsx
useEffect(() => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.body.classList.add("has-custom-cursor");
  window.addEventListener("mousemove", move);
  return () => {
    window.removeEventListener("mousemove", move);
    cancelAnimationFrame(raf);
    document.body.classList.remove("has-custom-cursor");
  };
}, []);
```

Keep the fine-pointer gate and cleanup. The native cursor must remain visible; the optional effect cannot be the only affordance and must respect reduced motion.

---

### Public DTOs, fixtures, URL state, and rollback selection

**Apply to:** `web/lib/public/contracts.ts`, `web/lib/public/url-state.ts`, `web/lib/public/public-ui-variant.ts`, `web/stories/fixtures/*`, and `web/components/legacy/public/*`.

**Repository JSON typing pattern** — `web/lib/episodes.ts` (lines 1-27) and `web/lib/connections.ts` (lines 1-26): import repository JSON once, define an explicit type, then export the typed projection. New fixtures must use synthetic values with the same public keys, never copy transcript bodies, secrets, private links, or operator fields.

**URL search state analog** — `web/app/chat/page.tsx` (lines 43-50, 126-133): `useSearchParams` is already the project convention. For the episode drawer, clone `URLSearchParams`, mutate only the namespaced episode key, retain every unrelated parameter, and keep the client subtree under Suspense.

**Server environment analog** — `web/app/api/chat/route.ts` (lines 4-10): module-level server-only constants read `process.env`; the rollback selector should return a narrow `"legacy" | "migrated"` value. Never expose it as a public query parameter or mutate deployment configuration in this phase.

**Legacy retention pattern:** copy the accepted route/component implementation verbatim into `web/components/legacy/public/*` before changing presentation. The retained code is its own analog; compatibility tests, not cleanup/refactoring, define whether the copy is faithful.

---

### Harness configuration and aggregate runner

**Apply to:** `web/package.json`, `web/package-lock.json`, `web/eslint.config.mjs`, all harness configs, `web/scripts/verify-phase1.mjs`, `.github/workflows/phase1.yml`, and generated-output ignores.

**Package script convention** — `web/package.json` (lines 1-9): scripts are flat, direct commands with no workspace indirection.

```json
{
  "name": "wtfmedia-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

Add the researched named child scripts and make `verify:phase1` the single aggregate entry. Let npm generate `package-lock.json`; do not hand-edit it.

**Flat ESLint config analog** — `video/eslint.config.mjs` (lines 1-3):

```js
import { config } from "@remotion/eslint-config-flat";

export default config;
```

Use the same ESM default-export shape with the web’s Next flat configuration; do not import the Remotion package.

**Small ESM runner and failure propagation analog** — `scripts/evaluate_production_rag.mjs` (lines 1-3, 21-31):

```js
#!/usr/bin/env node
const cases = [/* static ordered cases */];
const results = [];
for (const test of cases) {
  // run one bounded check and record pass/fail
  results.push(result);
}
console.log(JSON.stringify({ pass: results.every((result) => result.pass), results }, null, 2));
if (results.some((result) => !result.pass)) process.exit(1);
```

`verify-phase1.mjs` should likewise use a static ordered command list, readable section labels, inherited stdio, immediate non-zero propagation, and repository-relative artifact paths. It must not call live external services or swallow failures.

**Ignore-file pattern** — `web/.gitignore` (lines 103-114): coverage, Playwright reports/results, logs, and Lighthouse reports are already ignored. Verify and add only missing generated outputs (not approved screenshots/manifests), keeping re-includes at the end because last match wins.

## Shared Patterns

### Authentication and privacy boundary

**Source:** `web/app/api/chat/route.ts` lines 7-10, 52-67  
**Apply to:** `/api/chat`, RAG stub/contracts, privacy scanner, client bundle assertions

- Phase 1 is anonymous/public; do not add user auth, sessions, permissions, or operator fields.
- Keep `CLOUDFLARE_EDGE_SHARED_SECRET` server-only and forward it only as `X-Edge-Secret` to the Worker boundary.
- Fixtures use dummy values. No prompt/response bodies, real secrets, provider details, or machine-local paths enter snapshots or artifacts.

### Error handling

**Sources:** `web/app/api/chat/route.ts` lines 41-75; `web/app/chat/page.tsx` lines 71-105  
**Apply to:** route contracts, chat client, drawer transcript load, verifier child commands

- Validate before external calls.
- Preserve exact 400 branches and generic safe 503 JSON branches.
- Client handles non-OK text or JSON without exposing provider internals.
- Transcript loading falls back JSON → text → explicit unavailable state.
- Batch verifiers propagate the first non-zero exit; they do not convert failures into warnings.

### Public response formatting

**Source:** `web/app/api/chat/route.ts` lines 29-39, 76-86  
**Apply to:** API contracts, SourcePanel, public projection fixtures

- Public sources remain `{ n, video_id, title, score, t, time, url }`.
- `X-Sources` remains URI-encoded JSON; `X-Model`, `X-Fallback`, `Cache-Control`, content type, and upstream status are frozen.
- Episode/connection DTOs use explicit allowlists. Internal task, owner, lead, budget, brief, health, production, workflow, permission, or private-asset fields are forbidden.

### Accessibility and motion

**Sources:** `web/components/DragRow.tsx` lines 34-47; `web/components/CustomCursor.tsx` lines 10-13, 45-51; research patterns for Radix Dialog  
**Apply to:** all controls, ScrollRail, Drawer, Marquee, CustomCursor, ConnectionGraph, stories, and journeys

- Native semantic controls and scrolling are the baseline.
- Visible focus, dialog naming/trap/close/focus return, keyboard journeys, and a same-data semantic graph list are required.
- Reduced motion must gate both CSS animation and JavaScript `requestAnimationFrame`/smooth scroll immediately.

### Import and component conventions

**Sources:** `web/app/page.tsx` lines 1-8; `web/components/EpisodesBrowser.tsx` lines 1-9

- Use `@/` aliases across directories and relative paths for sibling components.
- Keep server pages free of `"use client"`; isolate effects, browser APIs, URL state, canvas, and streaming UI in client components.
- Use named exports for reusable components and default exports for App Router pages/layouts.

## No Analog Found

The repository has no existing web harness. The planner must use the concrete patterns in `01-RESEARCH.md` and official framework conventions for these targets rather than imitate application code.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `web/.storybook/main.ts` | config | transform | No Storybook configuration exists |
| `web/.storybook/preview.ts` | config | transform | No global story decorator/a11y configuration exists |
| `web/vitest.config.ts` | config | batch | No unit/component test runner exists |
| `web/playwright.config.ts` | config | batch | No browser server/project/snapshot configuration exists |
| `web/lighthouserc.cjs` | config | batch | No repeated performance collector exists |
| `.github/workflows/phase1.yml` | config | batch | No repository CI workflow exists |
| `web/tests/support/rag-stub.mjs` | service | request-response | Existing scripts call real services; blocking proof requires a local Worker-shaped stub |
| `web/tests/contracts/*.test.ts` | test | request-response/transform | No Vitest contract suite exists |
| `web/tests/journeys/*.spec.ts` | test | event-driven/request-response | No Playwright journey suite exists |
| `web/tests/unit/*.test.ts` | test | transform/file-I/O | No unit suite exists |
| `web/components/**/*.stories.tsx` | test | event-driven | No deterministic component stories exist |
| `web/tests/privacy/scan.mjs` | utility | file-I/O | No bounded multi-artifact privacy scanner exists |
| `web/tests/rollback/verify.mjs` | utility | batch | No dual-variant build/smoke rehearsal exists |
| `web/tests/performance/phase1-budgets.json` | config | transform | Thresholds must be measured and owner-approved, not copied |
| `web/tests/visual/phase1-approval.json` | config | file-I/O | No snapshot approval/hash manifest exists |

## Planner Guardrails

1. Freeze the accepted dirty-working-tree contract before visual migration; never substitute `HEAD`, stage, clean, revert, or silently bless unrelated edits.
2. Bootstrap packages/config plus one smoke story/browser test before editing `EpisodesBrowser`.
3. Migrate route-by-route, beginning with Episodes + ScrollRail + URL drawer, while retaining exact legacy variants.
4. Do not modify `/api/chat` behavior to make tests easier. Tests capture current accepted branches first.
5. Do not invent performance budgets. Measure the accepted legacy build, then pause for owner approval.
6. Keep deterministic blocking tests local and synthetic; the existing live RAG evaluator remains an explicit separate smoke.

## Metadata

**Analog search scope:** `web/app`, `web/components`, `web/lib`, `web/styles` (planned), `web/tests` (planned), `scripts`, `video`, repository config  
**Files scanned:** 25 focused source/config analogs plus repository inventory  
**Pattern extraction date:** 2026-08-19  
**Working-tree policy:** read-only analysis; only this pattern artifact was created

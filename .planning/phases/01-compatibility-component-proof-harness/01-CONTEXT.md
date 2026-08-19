# Phase 1: Compatibility + Component Proof Harness - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 establishes the executable public compatibility and component proof harness, then visibly migrates `/`, `/episodes`, `/connections`, and `/chat` to the repository-owned WTF design system. The work must preserve each route's URL, navigation meaning, data semantics, accessibility, and behavior while preserving the complete `/api/chat` contract. The first proof slice is `EpisodesBrowser` plus `ScrollRail` and a URL-backed accessible public-detail drawer, but the phase boundary now includes every protected public UI route.

This phase does not build the authenticated operator shell, expose operator-only fields, add new evidence capabilities, change production data, alter external services, or implement Phases 2–8.

**Authority note:** the amended Phase 1 goal and success criteria in `.planning/ROADMAP.md`, together with this context, supersede older one-component-only phrasing that remains in `.planning/PROJECT.md` and `docs/design/COMPONENT-INVENTORY.md`. Those older documents remain useful for milestone and component guidance but do not narrow the confirmed Phase 1 boundary.

</domain>

<decisions>
## Implementation Decisions

### First proof slice

- **D-01:** Build `EpisodesBrowser` plus `ScrollRail` as the first vertical proof slice.
- **D-02:** Activating an episode opens an accessible URL-backed drawer or dialog. Browser back, refresh, sharing, and focus return must behave predictably.
- **D-03:** `ScrollRail` uses native horizontal scrolling, visible previous/next controls, scroll snap, keyboard navigation, and touch/trackpad input. Pointer dragging is an optional enhancement, not the only interaction. Reduced motion makes scrolling immediate.
- **D-04:** The episode drawer contains compatibility-safe public detail only: existing public title, show, thumbnail, duration, and views when available; transcript availability, context, or excerpt; verified source and timestamp links; and existing Ask WTF entry points. It excludes workflow, ownership, private assets, operator permissions, and dossier features.

### Visual migration depth

- **D-05:** Use controlled hybrid adoption: preserve route function, data meaning, and recognizable WTF identity while applying semantic tokens, stronger hierarchy, tactile surfaces, explicit focus, responsive behavior, and reduced-motion policy.
- **D-06:** Visibly redesign all protected public UI routes in Phase 1: `/`, `/episodes`, `/connections`, and `/chat`. Preserve the complete `/api/chat` contract.
- **D-07:** Use one shared shell, token, typography, control, and state language while giving Home, Episodes, Connections, and Ask WTF distinct editorial compositions suited to their jobs.
- **D-08:** Use playful WTF motion selectively as signature effects. Sparkles, marquees, tactile hover, and an optional desktop cursor appear only where purposeful; the native cursor is the baseline; looping effects can pause; reduced-motion preferences take effect immediately.

### Compatibility policy

- **D-09:** Freeze URLs, bookmarks, query strings, navigation meaning, data semantics, episode selections, deep links, streaming, citations, source fields, required headers, status codes, and safe error shapes. Only approved visual and layout changes are allowed without a new explicit contract decision.
- **D-10:** `/chat` remains the canonical public Ask WTF URL and retains its complete streaming behavior. Remove `ModelPicker` from the public experience and present one consistent Ask WTF identity; any diagnostic model control remains internal and feature-gated.
- **D-11:** `/connections` presents the redesigned public graph and an equivalent accessible list on the same page. Both projections use the same public evidence and expose no operator permissions, tasks, owners, leads, budgets, briefs, health, or production state.
- **D-12:** Migrate and verify routes one at a time while retaining the previous versions for rollback. Cut over Phase 1 only after every public route and `/api/chat` pass together.

### Acceptance evidence

- **D-13:** Provide one blocking `npm run verify:phase1` command used locally and in CI. It aggregates lint, types, build, component, browser, accessibility, privacy, visual, performance, API/RAG compatibility, and rollback checks.
- **D-14:** Capture reviewed evidence for every redesigned route and changed shared component at 320px, 768px, and 1440px, including applicable loading, empty, error, focus, and open-overlay states. Visual baseline replacements require owner approval.
- **D-15:** Measure current route, bundle, and browser-performance baselines before implementation. Planning derives explicit numeric budgets from that repository evidence, and the proof command blocks material regressions.
- **D-16:** Phase 1 is accepted only when every protected public route and `/api/chat` pass the automated gate, the owner approves the visual evidence, and a documented rollback restores the prior public experience without data changes.

### The agent's Discretion

- Select exact testing packages, versions, and harness wiring during planning, within the selective Radix, headless TanStack, repository-owned styling, and Storybook direction in `DESIGN.md`. Dependency installation happens only inside an approved implementation plan.
- Set exact performance thresholds after measuring the current repository baseline; thresholds may not be invented without evidence.
- Choose internal component/module boundaries and deterministic privacy-safe fixture structure as long as the locked public contracts and acceptance evidence remain intact.
- Choose the implementation order among public routes after the Episodes proof slice, provided migration stays route-by-route and release remains phase-wide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning and acceptance authority

- `.planning/ROADMAP.md` — amended Phase 1 boundary, requirements, authorization, and success criteria; newest GSD scope authority.
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-05, DSYS-01 through DSYS-10, and QUAL-01 through QUAL-06 owned by Phase 1.
- `.planning/PROJECT.md` — milestone value, constraints, public compatibility promises, and later-phase boundaries; older one-component language is superseded for Phase 1 scope.
- `ISA.md` — project acceptance authority and durable ideal-state criteria.

### Design and narrative authority

- `DESIGN.md` — reference lock, route continuity, public/operator projection split, semantic tokens, typography, motion, component foundation, migration map, screen contracts, and verification matrix.
- `PRODUCT.md` — committed WTF product voice, wordmark, typography, palette, and public narrative foundation.
- `docs/design/APP-FLOW.md` — public projection flow, protected route chain, phase sequence, and non-negotiable flow states.
- `docs/design/COMPONENT-INVENTORY.md` — component dependency rule, foundations, accessible primitives, proof patterns, current migration targets, and required states; its older build-only-one-component scope note is superseded by the amended roadmap.
- `docs/design/visuals/IMAGEGEN-PROMPTS.md` — source prompts and constraints for the approved visual direction.
- `docs/design/visuals/wtf-one-brain-moodboard-v1.png` — approved moodboard reference.
- `docs/design/visuals/wtf-one-brain-app-flow-v1.png` — approved application-flow reference.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `web/components/Wordmark.tsx`: preserve as the canonical public brand mark.
- `web/components/Sparkle.tsx`: retain only under the selective signature-effect and reduced-motion policy.
- `web/components/Marquee.tsx`: migrate to a pausable effect with a static reduced-motion fallback.
- `web/components/CustomCursor.tsx`: make optional on fine-pointer desktop devices; never suppress the native cursor baseline.
- `web/components/DragRow.tsx`: evolve into `ScrollRail` with native scroll, visible controls, keyboard, snap, and touch/trackpad behavior.
- `web/components/GuestStrip.tsx`: reuse real guest imagery through the new rail behavior.
- `web/components/EpisodesBrowser.tsx`: first proof slice and current source of real episode/transcript browsing behavior.
- `web/components/ConnectionGraph.tsx`: preserve the public evidence visualization while adding an equivalent semantic list.
- `web/components/ModelPicker.tsx`: remove from public Ask WTF; retain only if an internal feature-gated diagnostic still needs it.

### Established Patterns

- `web/package.json` currently uses Next.js 15, React 19, TypeScript 5.7, and Tailwind 3. It exposes only `dev`, `build`, and `start`; the Phase 1 plan must establish the missing lint, type, component, browser, accessibility, visual, privacy, performance, and aggregate proof scripts.
- `web/app/globals.css` and `web/tailwind.config.ts` contain the recognizable cream/ink and WTF accent language, but globals still use raw hex values, perpetual animation, pointer-only drag affordances, and custom-cursor suppression. Migrate these into semantic tokens and explicit motion/focus policies.
- The public app uses Next App Router routes and repository-owned components. Route groups or component moves may organize code but may not change public URLs.
- Public episode and connection views already consume repository data. Phase 1 changes presentation and interaction evidence, not the truth model or source corpus.
- `web/app/api/chat/route.ts` proxies to the existing edge RAG service and returns text plus encoded `X-Sources`, `X-Model`, `X-Fallback`, `Cache-Control`, status, and safe error behavior. Treat those response semantics as frozen compatibility evidence.

### Integration Points

- `web/app/layout.tsx` and `web/app/globals.css`: shared public shell, tokens, typography, focus, motion, and responsive policy.
- `web/app/page.tsx`: Home's distinct editorial composition over the shared system.
- `web/app/episodes/page.tsx`, `web/components/EpisodesBrowser.tsx`, and `web/components/DragRow.tsx`: first proof slice, URL-backed drawer, rail behavior, and public episode-detail compatibility.
- `web/app/connections/page.tsx` and `web/components/ConnectionGraph.tsx`: public graph plus equivalent semantic list without operator projection leakage.
- `web/app/chat/page.tsx` and `web/app/api/chat/route.ts`: one Ask WTF experience while preserving streaming, citations, source links, errors, and headers.
- `web/components/Wordmark.tsx`, `Sparkle.tsx`, `Marquee.tsx`, `CustomCursor.tsx`, `GuestStrip.tsx`, and `ModelPicker.tsx`: current shared-component migration surface.

</code_context>

<specifics>
## Specific Ideas

- The experience should feel like one WTF publication with four purposeful editorial rooms, not one repeated dashboard template.
- Cream and ink remain dominant; committed accents remain semantic and sparing. The provisional orange is comp-derived and requires token/contrast approval before use.
- Tactile print/craft character should come from typography, borders, depth, texture, composition, and selective motion without sacrificing keyboard clarity or responsive restraint.
- Episode activation should feel fast and contextual while remaining URL-addressable and reversible through browser navigation.
- Connections should remain visually expressive without making the graph the only way to access or understand its public evidence.
- Ask WTF should foreground grounded questions, cited answers, transparent states, and source navigation—not infrastructure selection.

</specifics>

<deferred>
## Deferred Ideas

- Authenticated `/ops`, organization identity, server-enforced capability policy, and the truthful operator shell belong to Phase 2 after Phase 1 acceptance.
- Canonical episode provenance, dual timelines, Knowledge/dossiers, Production, Control Room, Analytics, People, integrations, and migration closure remain in Phases 3–8 under their recorded authorization gates.
- No external-service change, deployment, corpus mutation, registry mutation, provider change, or new private-data surface is part of Phase 1 planning.

</deferred>

---

*Phase: 1-compatibility-component-proof-harness*
*Context gathered: 2026-08-19*

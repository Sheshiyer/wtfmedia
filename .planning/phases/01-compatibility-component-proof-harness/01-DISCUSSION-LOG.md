# Phase 1: Compatibility + Component Proof Harness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 1-compatibility-component-proof-harness
**Areas discussed:** First proof slice, Visual migration depth, Compatibility policy, Acceptance evidence

---

## First proof slice

### Initial vertical slice

| Option | Description | Selected |
|--------|-------------|----------|
| EpisodesBrowser + ScrollRail | Exercises responsive layout, keyboard behavior, motion, tokens, fixtures, navigation, and real public data. | ✓ |
| ScrollRail + GuestStrip only | Proves the rail behavior with a smaller surface but less route and state coverage. | |
| Connections GraphWithList | Proves graph/list accessibility but carries greater semantic and visualization risk. | |

**User's choice:** EpisodesBrowser + ScrollRail vertical slice.

### Episode activation

| Option | Description | Selected |
|--------|-------------|----------|
| Accessible URL-backed drawer/dialog | Preserves context while making selection shareable, refresh-safe, reversible, and focus-managed. | ✓ |
| Inline expansion | Keeps content in flow but weakens deep-link and browser-navigation behavior. | |
| Dedicated episode page | Maximizes addressability but expands the route surface beyond the preferred first interaction. | |

**User's choice:** Accessible URL-backed drawer/dialog.

### Rail behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Native scroll with complete controls | Combines native scrolling, visible controls, snap, keyboard, touch/trackpad, optional drag, and reduced-motion behavior. | ✓ |
| Responsive grid | Simplifies interaction but does not prove the required horizontal-discovery pattern. | |
| Paged carousel | Provides explicit paging but replaces native scroll behavior with a more restrictive widget. | |

**User's choice:** Native scroll with complete controls.

### Drawer content

| Option | Description | Selected |
|--------|-------------|----------|
| Compatibility-focused public detail | Uses only existing public episode/transcript/source truth and Ask WTF entry points. | ✓ |
| Minimal preview | Reduces risk but supplies too little evidence for the proof slice. | |
| Expanded public dossier | Adds richer concepts that belong to later evidence and operator phases. | |

**User's choice:** Compatibility-focused public detail.

---

## Visual migration depth

### Adoption depth

| Option | Description | Selected |
|--------|-------------|----------|
| Controlled hybrid adoption | Preserves function and meaning while applying the new semantic visual, interaction, focus, responsive, and motion system. | ✓ |
| Full visual replacement | Maximizes immediate change but increases contract and migration risk. | |
| Proof-slice styling only | Limits risk but does not meet the later-amended all-public-route boundary. | |

**User's choice:** Controlled hybrid adoption.

### Visible redesign boundary

| Option | Description | Selected |
|--------|-------------|----------|
| First proof slice only | Restricts visible change to EpisodesBrowser and ScrollRail. | |
| Shared public foundation | Updates shell and foundations while leaving some route compositions unchanged. | |
| Every public UI route | Visibly redesigns `/`, `/episodes`, `/connections`, and `/chat` while preserving the API contract. | ✓ |

**User's choice:** Every public UI route. The user explicitly approved amending the Phase 1 roadmap goal and success criteria to this boundary.

### Route relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Shared system with distinct route personalities | Uses one system while giving each route a purposeful editorial composition. | ✓ |
| One uniform composition | Maximizes consistency but flattens route purpose and narrative. | |
| Route-by-route visual independence | Maximizes expression but weakens system cohesion and reuse. | |

**User's choice:** Shared system with distinct route personalities.

### Playful effects

| Option | Description | Selected |
|--------|-------------|----------|
| Selective signature effects | Uses purposeful effects, native cursor baseline, pause behavior, and immediate reduced-motion fallback. | ✓ |
| Preserve every current effect everywhere | Retains current energy but also perpetual motion and cursor/accessibility risks. | |
| Remove nearly all motion | Minimizes motion risk but discards useful brand character and feedback. | |

**User's choice:** Selective signature effects.

---

## Compatibility policy

### Frozen behavior boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Strict compatibility across every behavior boundary | Freezes URLs, bookmarks, queries, navigation, data meaning, streaming, citations, headers, statuses, and safe errors. | ✓ |
| Preserve routes and API only | Allows client behavior and data meaning to drift despite stable URLs. | |
| Permit behavior changes during redesign | Speeds redesign but removes the central migration safety contract. | |

**User's choice:** Strict compatibility across every behavior boundary.

### Public chat model control

| Option | Description | Selected |
|--------|-------------|----------|
| One Ask WTF experience without public ModelPicker | Keeps `/chat` and streaming while removing public infrastructure selection. | ✓ |
| Retain ModelPicker unchanged | Preserves the current diagnostic UI and retry language. | |
| Move Ask WTF to a new canonical route | Breaks established route continuity unless an alias/redirect is separately proven. | |

**User's choice:** One Ask WTF experience without public ModelPicker.

### Connections accessibility

| Option | Description | Selected |
|--------|-------------|----------|
| Graph and equivalent list on the same page | Makes the same public evidence available visually and semantically without mode switching. | ✓ |
| Graph and list in separate tabs | Reduces page density but adds coupled state and discoverability risk. | |
| List-only public route | Maximizes semantic simplicity but removes the established visual projection. | |

**User's choice:** Graph and equivalent list on the same page.

### Migration and rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Route-by-route migration with coordinated cutover and rollback | Allows isolated verification while keeping a phase-wide release gate and prior versions recoverable. | ✓ |
| Immediate all-at-once replacement | Delivers faster visual change but concentrates regression and rollback risk. | |
| Independent route releases without a phase-wide gate | Reduces coordination but can leave a mixed, unverified public experience. | |

**User's choice:** Route-by-route migration with coordinated cutover and rollback.

---

## Acceptance evidence

### Aggregate proof command

| Option | Description | Selected |
|--------|-------------|----------|
| One blocking local and CI verification command | Makes the full Phase 1 acceptance surface reproducible through `npm run verify:phase1`. | ✓ |
| Separate optional verification commands | Provides flexibility but permits partial or skipped acceptance. | |
| Manual acceptance only | Avoids harness work but cannot reliably prevent regressions. | |

**User's choice:** One blocking local and CI verification command.

### Visual evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Three viewports plus critical states and owner-approved baselines | Covers responsive behavior, state completeness, focus, overlays, and intentional visual change. | ✓ |
| Desktop route screenshots only | Misses mobile/tablet behavior and state-level regressions. | |
| Component screenshots without route review | Misses integration, navigation, composition, and route-level behavior. | |

**User's choice:** Three viewports plus critical states and owner-approved baselines.

### Performance budgets

| Option | Description | Selected |
|--------|-------------|----------|
| Measured baseline with planner-derived numeric budgets | Uses current route, bundle, and browser evidence to define blocking thresholds. | ✓ |
| Generic framework defaults | Supplies numbers quickly but may be irrelevant to the actual application. | |
| Performance review after release | Defers evidence until regressions may already affect users. | |

**User's choice:** Measured baseline with planner-derived numeric budgets.

### Final release gate

| Option | Description | Selected |
|--------|-------------|----------|
| Automated pass, owner visual approval, and documented rollback | Requires technical proof, experiential approval, and recoverability before acceptance. | ✓ |
| Automated pass without owner review | Misses the principal's visual/narrative acceptance test. | |
| Owner review without rollback proof | Approves appearance without proving safe recovery. | |

**User's choice:** Automated pass, owner visual approval, and documented rollback.

---

## The agent's Discretion

- Exact testing packages, versions, and harness wiring within the approved design architecture.
- Exact numeric performance budgets after measuring the current baseline.
- Internal component boundaries, deterministic privacy-safe fixture structure, and post-Episodes route order.

## Deferred Ideas

- Phase 2: authenticated operator shell, organization identity, deny-by-default capability policy, and truthful operator states.
- Phases 3–8: provenance workspace, Knowledge/dossiers, Production, Control Room, Analytics, People, read-only integrations, and migration closure.
- External-service changes, deployments, corpus mutations, registry/provider changes, and private-data surfaces are outside this discussion.

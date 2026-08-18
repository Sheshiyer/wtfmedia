# WTF Media

## What This Is

WTF Media is an evidence-native podcast operating system for the internal team
that plans, produces, publishes, understands, and grows the show. Its existing
public catalogue remains a read-only projection where audiences can discover
episodes, explore recurring ideas, and ask grounded questions with citations.

## Core Value

An operator can move from any episode, question, or decision to its source
asset, exact evidence, current owner, workflow state, and next action without
losing provenance.

## Current Milestone: v1.0 One Brain Re-foundation

**Goal:** Re-found the existing catalogue as a governed internal podcast
operating system with a shared provenance spine and a repository-owned,
accessible WTF design system, while preserving public routes, retrieval
behavior, and brand identity.

**Target features:**

- Separate public and authenticated operator shells over shared evidence.
- A canonical episode workspace joining assets, dual timelines, transcripts,
  citations, owners, stages, and downstream actions.
- A tokenized component system preserving the WTF wordmark, palette,
  typography, print texture, playful motion, and editorial voice.
- Control Room, Knowledge, Production, Analytics, and People workspaces with
  explicit evidence, permissions, empty/error/offline states, and provenance.
- Incremental migration tests protecting `/`, `/episodes`, `/connections`,
  `/chat`, and `/api/chat` throughout the overhaul.

## Requirements

### Validated

- ✓ Public visitors can browse a 55-episode catalogue and episode detail data
  from the repository-owned corpus.
- ✓ Public visitors can read available transcript material and receive cited,
  streaming Ask WTF answers from the existing retrieval path.
- ✓ Public visitors can explore real episode/theme connections through the
  existing graph projection.
- ✓ The shipping product expresses the WTF identity through its multicolor
  wordmark, warm cream/ink foundation, committed accent colors, editorial
  typography, tactile depth, and playful discovery interactions.
- ✓ Existing public URL and API contracts are known and protected as migration
  constraints.

### Active

- [ ] Operators have an authenticated shell whose workspaces expose current
  context, accountable ownership, system health, and the dominant next action.
- [ ] Each episode has one canonical provenance record joining clean-cut and
  published-video timelines, transcript evidence, clips, workflow state, and
  reconciliation status.
- [ ] Public discovery and internal operations use separate permission and
  narrative projections over shared evidence-domain services.
- [ ] The UI uses repository-owned semantic tokens and accessible primitives
  without replacing the existing WTF brand language with generic kit styling.
- [ ] Existing components and routes migrate incrementally with keyboard,
  accessibility, responsive, reduced-motion, state, and visual regression
  coverage.
- [ ] Operational insights always resolve to a source, reporting window,
  accountable owner, or explicit unavailable/unknown state.

### Out of Scope

- Autonomous writes to production, finance, CRM, messaging, scheduling,
  publishing, contract, or storage systems — integrations begin read-only and
  require separate permission and rollback approval.
- Payment execution, e-signatures, government-ID storage, and credential
  management — high-risk responsibilities require separately owned phases.
- Replacing or breaking the working public catalogue during the internal-OS
  build — compatibility is a milestone invariant.
- Copying private transcripts, meeting text, source links, or seed corpora into
  planning artifacts — sources inform synthesized requirements only.
- Provider, OmniRoute, deployment, vault registry, checkout relocation, or
  native session changes — those systems are outside repository authority.
- Installing a full pre-styled component kit before a vertical workflow proves
  the selected headless primitives and migration tests.

## Context

- The current repository is a Next.js 15 / React 19 / Tailwind 3 application
  with public home, episode, connections, and streaming chat surfaces.
- Repository data currently represents 55 published episodes and 1,933 indexed
  retrieval chunks; bounded editorial review identified 62 episode records in
  the supplied planning material without copying private links or payloads.
- The source brief describes a wider internal “one brain” spanning episode
  assets, transcripts, clips, schedules, performance, people, budgets,
  contracts, integrations, and research workflows.
- `DESIGN.md` is the design authority and migration input. `ISA.md` is the
  acceptance and goal authority. This file, `REQUIREMENTS.md`, and `ROADMAP.md`
  form the GSD execution-planning spine.
- The worktree contains owner changes unrelated to this milestone
  initialization; planning commits must remain path-scoped and never revert or
  absorb those changes.

## Constraints

- **Brand:** Preserve the shipping wordmark, committed palette, Bricolage
  Grotesque, Fraunces, Poppins, cream/ink dominance, tactile print depth, and
  curious/irreverent/exact voice.
- **Compatibility:** Preserve `/`, `/episodes`, `/connections`, `/chat`, and
  `/api/chat` until tested replacements or redirects explicitly supersede them.
- **Evidence:** Every generated insight resolves to a source, owner, reporting
  window, or explicit unknown; unavailable data never silently becomes zero.
- **Privacy:** Never commit source filenames, private document links, raw
  meeting/transcript material, credentials, or machine-local checkout paths.
- **Accessibility:** Keyboard operation, visible focus, semantic markup,
  reduced motion, responsive behavior, and serious axe findings are release
  gates rather than polish work.
- **Architecture:** Prefer selective accessible headless primitives beneath
  repository-owned WTF components; package installation belongs to the phase
  that owns compatibility and migration tests.
- **Operations:** External adapters begin read-only, expose health and
  provenance, and require explicit approval before write capability.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| ISA owns acceptance; GSD owns execution planning | Keeps the goal and proof criteria stable while phases evolve | ✓ Good |
| Internal control room is primary; catalogue remains public projection | Operational state and public discovery need different permissions and narratives | — Pending |
| Episode is the canonical join point | It connects assets, evidence, workflow, people, performance, and decisions | — Pending |
| Preserve public routes and response contracts during migration | Protects bookmarks, clients, retrieval behavior, and current value | ✓ Good |
| Use semantic tokens and selective headless primitives | Preserves visual authorship while gaining accessible interaction behavior | — Pending |
| Treat orange as a provisional comp-derived semantic extension | It appears in committed implementation material but not the authoritative product palette | — Pending |
| Keep external integrations read-only first | Evidence and reconciliation must precede consequential automation | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**

1. Move invalidated requirements to Out of Scope with a reason.
2. Move shipped and verified requirements to Validated with a phase reference.
3. Add genuinely emergent requirements to Active.
4. Record decisions that constrain later phases.
5. Recheck whether “What This Is” still matches reality.

**After each milestone:**

1. Review every section against shipped behavior.
2. Recheck the Core Value.
3. Audit Out of Scope and its reasons.
4. Update Context with current users, evidence, and metrics.

---
*Last updated: 2026-08-18 after owner approval of milestone v1.0.*

# DEEP PASS — WTF Media Review for Temperance Parallel Dispatch

**Date:** 2026-08-21  
**Context:** User review session before `/temperance-parallel-dispatch`. Comprehensive understanding of repo state, GSD progress, visual planning, CF assets (9d9d account), transcript POC with Vectorize/embeddings, and the dual-source (internal/uncut + public/YouTube) requirement from the provided Excel sheet.  
**Status:** Turn 1 of multi-turn PAI contract. Macro map + deep pass + task graph produced. No implementation.

## A. MACRO MAP

### Surfaces
- **Public projection (anonymous, read-only):** `/` (home), `/episodes`, `/episodes/:id`, `/connections`, `/chat` (Ask WTF), `/api/chat` (cited streaming contract).
- **Operator projection (authenticated):** `/ops` (Control Room) and sub-routes for episodes, knowledge, production, analytics, people, integrations. Currently truthful-empty / unavailable states only (Phases 1-2).
- **Evidence domain (shared):** Episode as primary join point. Provenance spine: source asset → transcript segment → owner → state → next action.
- **GSD planning surfaces:** `.planning/STATE.md`, `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `ORCHESTRATION.json`, `NEXT-WAVE.json`, 23 plans under `phases/01-compatibility-component-proof-harness/`.
- **Design authority surfaces:** `DESIGN.md`, `docs/design/APP-FLOW.md`, `COMPONENT-INVENTORY.md`, moodboard (`wtf-one-brain-moodboard-v1.png`), app-flow board (`wtf-one-brain-app-flow-v1.png`).
- **CF shadow infrastructure (9d9d account):** `wtfmedia-edge` Worker, `wtfmedia-catalogue-v1` (Vectorize 1024-d cosine), `wtfmedia-catalogue` (R2), `WTFMEDIA_STATE` (KV), `wtfmedia-ingest` (Queue), `wtfmedia-ingest-dlq` (DLQ). Vercel proxies server-to-server via `EDGE_SHARED_SECRET`; no CF creds to browser.
- **Data artifacts:** `episodes.json` (55), `corpus-manifest.json` (55 episodes, 43 timestamped), `vectors.json` (15MB embeddings), `connections.json`.

### Components
- **Public UI (Next.js 15 / React 19 / TS / Tailwind 3 on Vercel):** Preserved contracts for home, episodes browser, episode detail, connections (graph + accessible list), chat with citations. ModelPicker removed from public.
- **Shadow RAG edge:** BGE Large embeddings, Llama 3.3 70B answers, score floor 0.45, top-12 retrieval, max 6 distinct episodes, ownership abstention. 1,500-2,000 char question cap (code vs docs discrepancy noted).
- **GSD execution:** 23-plan Phase 1 sequence (preserved from 0f80677). Plans 01-01/02/03 complete (13%). Plan 01-04 (harness config: ESLint, Vitest, Storybook, Playwright, LHCI, privacy scanner) is next.
- **Design system foundation (not yet installed):** Radix primitives, TanStack Table, Phosphor icons, Storybook. Semantic tokens: cream (#FFF6EA), ink (#1A1A1A), committed red/green/yellow/purple/blue; orange provisional.
- **Provenance / dual-source (planned, Phases 3-4):** Uncut/internal ("clean cut") vs published-video/YouTube as separate coordinate systems. Alignment within 2s for 10 owner-approved episodes. Toggle for user-facing index/transcript on both versions. Maps to PROV-05, PROV-10, PROV-12, PROV-13, PROV-14.

### Data / Control Flow
1. Public visitor → preserved routes → `/api/chat` (Vercel) → server-to-server proxy (EDGE_SECRET) → `wtfmedia-edge` (RAG over 55-episode Vectorize corpus) → cited streaming response.
2. Ingestion (shadow): R2 transcript → Queue → Workers AI (embed) → Vectorize. Idempotent; 43/55 have timestamped segments.
3. GSD flow: STATE.md (current position) → ORCHESTRATION/NEXT-WAVE (awaiting approval, expired) → Plan execution (te-build / te-dispatch-paid) → verification → update STATE / handoff.
4. Dual-source (future): Separate transcripts for uncut + published; alignment map; UI toggle in episode workspace (Phase 3+); provenance records keep both coordinate systems.
5. Design → GSD: DESIGN.md + APP-FLOW + COMPONENT-INVENTORY → Phase 1 plans (compatibility harness + public migration) → Phase 2 (auth shell + truthful empty ops) → later phases.

### Key Invariants (from ISA / REQUIREMENTS)
- Public contracts frozen (URLs, bookmarks, queries, streaming, citations, headers, errors).
- Public and operator projections share evidence domain but never policy, cache namespace, DTOs, or interaction state.
- Phases 3-10 inactive until Phase 1-2 acceptance + explicit owner gate.
- 140 ISC; 24 proven. Phase 1/2 work proves ISC-10-12 + 129-140 range.
- No autonomous writes, payments, private transcript copying, or pre-styled kit installation in v1.0.
- Excel dual-video requirement is already captured in PROV family (Phases 3-4); not yet execution-authorized.

## B. DEEP PASS (≥3 Layers)

### Layer 1: UI / Settings / Public-Operator Split
- **Public surface:** Exact preservation of `/`, `/episodes/*`, `/connections` (graph + list parity), `/chat`, `/api/chat`. No public model picker. Synthetic fixtures for proof.
- **Operator surface (Phase 2+):** `/ops` shell with truthful empty/unavailable states until canonical records exist. Capability guards, separate DTOs, no mixing of public/internal search projections.
- **Design tokens & components:** Semantic palette locked in DESIGN.md. Foundations (WtfTokens, Typography, Focus/MotionPolicy, AvailabilityState) before primitives. Current-component migration targets identified (Wordmark, EpisodesBrowser → ScrollRail + EvidenceCard, ConnectionGraph → GraphWithList, etc.).
- **Visual planning artifacts:** Moodboard and app-flow PNGs exist as references; DESIGN.md is the deterministic source. APP-FLOW.md defines the EVIDENCE → OWNER → STATE → NEXT ACTION loop and the public/shared/ops projection split.
- **Dual-source UI contract (Phase 3):** Episode workspace tabs include "Timelines" for separate clean-cut vs published-video coordinates. Toggle to switch sources while preserving reconciled moment (within 2s). Copy either timestamp. Honest "unavailable" when a source is missing.

### Layer 2: Routing / Combos / GSD Orchestration
- **Route contracts:** Public paths protected; `/ops/*` gated behind Phase 2 auth. `/api/chat` contract unchanged (sources with `n`, `score`, `videoId`, `start`, `timestamped`).
- **GSD orchestration:** `.planning/` is the execution authority. STATE.md is live position (Phase 01, Plan 3/23, stopped at 01-04). ORCHESTRATION.json / NEXT-WAVE.json carry source fingerprints (23 plans + supporting docs) and current "awaiting_approval" with expired timestamp (2026-08-20T17:14:22.305Z). Wave 0 Gaps proposes L1 (dirty-worktree baseline), L2 (package legitimacy checkpoint) under "te-build", concurrency 2.
- **Combo routing (OmniRoute/Temperance):** Observe/Think/Learn → te-reason; Plan → te-plan / te-plan-max; Build → te-build; Execute → te-dispatch-paid; Verify → te-validate. Default S-session `te-algorithm`. Gateway at localhost:20128.
- **Approval & readiness:** Human approval, source freshness, quota snapshot, dispatch receipt all currently failing. Reporting requires dispatch/task/verification receipts.
- **Phase boundaries:** Phase 1 = harness + public migration (23 plans preserved). Phase 2 = auth + operator shell + truthful empty Control Room. Phases 3-4 (provenance spine + dual timelines + knowledge) queued behind acceptance + explicit gate. Client Phase 1 maps to repo Phases 2-4; Client Phase 2 to 5-9; migration closure Phase 10.

### Layer 3: PAI / Agent Workflow + CF Infra + Dual-Source Provenance
- **PAI workflow (this session):** Review (current) → deep pass + task graph (Turn 1) → materialize artifacts (Turn 2) → execute waves (Turn 3+). Never claim "done" after one narrow round on macro work. Use te-plan-max for planning only; te-swarm-s for cheap parallel slices; te-dispatch-paid for paid implement workers.
- **CF shadow RAG (9d9d):** Full 55-episode corpus uploaded. 1,933 chunks. 43 timestamped. Vercel proxy preserves browser contract while hiding CF account details. Guardrails: score ≥0.45, top 12, ≤6 episodes, ownership abstention. Fallback transcripts are video-level (not exact-moment) for 12 episodes.
- **Transcript POC:** Vectorize + embeddings proven at scale via shadow Worker. Idempotent queue ingestion resolved throttling. Evaluation coverage for citation grounding, ownership abstention, timestamp honesty.
- **Dual-source provenance (Excel sheet requirement):** Internal/private ("clean cut"/uncut) and public/YouTube versions of the same video. Index + YT transcript for both. User-facing toggle. Already modeled in REQUIREMENTS:
  - PROV-05: separate coordinate systems, no universal offset assumption.
  - PROV-10: idempotent ingestion from both YouTube channels (extend to uncut).
  - PROV-12: source-bound segments; uncut ASR primary; published-video timing separately represented.
  - PROV-13: per-episode alignment within 2s for 10 approved episodes.
  - PROV-14: open both players at reconciled moment, switch without losing it, copy either timestamp, honest unavailable.
- **Current execution position:** Plan 01-04 (harness configuration) is the resume point. 01-03 LHCI correction completed via allowlisted CLI probe + correction ledger (no plan rewrite). Privacy scanner ownership moved into 01-04 (minimal) vs 01-05 (full scope).
- **Blockers for later phases:** Deployment architecture, identity/session/capability decisions (Phase 2), YouTube access, episode inventory, uncut mapping, Hindi behavior, editorial query set (Phases 3-4), research inputs, vendor decisions (Phase 5+).

### Layer 4: Acceptance & Safety (ISA / QUAL)
- 140 ISC; 24 proven. Phase 1 work adds evidence for compatibility contracts, design authority, component proof harness.
- QUAL family (Phase 1): lint, node contracts, browser stories, route journeys, screenshots, performance budgets, privacy-safe fixtures, deterministic harness (no watch mode).
- Threat model: immutable definitions + allowlisted corrections only. Correction ledger retains original failed evidence.
- No external writes, high-risk workflows, or real-time collab in v1.0.

## C. TASK GRAPH (5–20 Independent Tasks)

1. **T-REV-01** — Re-approve NEXT-WAVE / ORCHESTRATION for current Wave 0 Gaps (L1/L2).  
   Acceptance: `ORCHESTRATION.json` shows approval status "approved" with fresh timestamp; human confirmation recorded.  
   Combo hint: human (pre-dispatch gate).

2. **T-REV-02** — Confirm dirty-worktree baseline (L1) without mutating unrelated changes.  
   Acceptance: Exact source authority recorded; git diff --check clean for planning surface.  
   Combo hint: te-build (cheap).

3. **T-REV-03** — Package legitimacy checkpoint (L2): install exact dev deps + Chromium only after approval; record receipts.  
   Acceptance: `npm ls --depth=0` matches approved pins; Playwright Chromium present; no lifecycle-script approvals.  
   Combo hint: te-build.

4. **T-REV-04** — Execute Plan 01-04 harness configuration (ESLint, Vitest, Storybook, Playwright, LHCI, privacy scanner).  
   Acceptance: All non-watch configs present; smoke story passes; LHCI and privacy scanner produce digest evidence; 320/768/1440 viewports covered.  
   Combo hint: te-dispatch-paid (or te-build if local).

5. **T-REV-05** — Map Excel dual-video requirement explicitly into planning artifacts (cross-ref to PROV-05/10/12/13/14).  
   Acceptance: `.planning/REQUIREMENTS.md` or a dedicated `PROV-DUAL-SOURCE.md` note records the toggle, separate transcripts, alignment contract, and UI surface. No new requirements invented.  
   Combo hint: te-plan (documentation only).

6. **T-REV-06** — Verify CF 9d9d account resource inventory and shadow RAG health.  
   Acceptance: Worker, Vectorize, R2, KV, Queue, DLQ all listed and responding; 55-episode corpus present; proxy path verified (no browser CF creds).  
   Combo hint: te-build (verification script).

7. **T-REV-07** — Confirm visual planning artifacts are referenced and stable.  
   Acceptance: DESIGN.md, APP-FLOW.md, COMPONENT-INVENTORY.md committed; moodboard and app-flow PNGs listed (binary ok); no drift from GSD plans.  
   Combo hint: te-build (audit).

8. **T-REV-08** — Update STATE.md to reflect review completion and next executable (Plan 01-04 or Wave 0).  
   Acceptance: `stopped_at` advanced; progress percent accurate; blockers list current.  
   Combo hint: te-plan.

9. **T-REV-09** — Produce Turn 2 artifacts: `.planning/DEEP-PASS.md`, `tasks.md`, `NEXT-WAVE.json` (updated), `tasks.json`.  
   Acceptance: Files exist with required sections; fingerprints updated if sources changed.  
   Combo hint: te-build.

10. **T-REV-10** — Skill gap scan for dual-source alignment work (future Phases 3-4).  
    Acceptance: Local skill-clusters searched for "transcript alignment", "timestamp reconciliation", "multi-source provenance"; gaps recorded with resolve path (local | skillsmp | install).  
    Combo hint: te-plan.

11. **T-REV-11** — Confirm no Phase 2+ implementation has leaked into working tree.  
    Acceptance: Git diff against Phase 1 boundary shows only Phase 1 files or approved corrections; no auth, no `/ops` real data, no canonical episode records.  
    Combo hint: te-build.

12. **T-REV-12** — Reconcile any question-mark items from HANDOFF.md review (e.g., logo asset source, deployment architecture decision).  
    Acceptance: Flagged items either resolved with owner note or explicitly deferred with owner.  
    Combo hint: human.

13. **T-REV-13** — Prepare dispatch receipt template for first te-dispatch-paid wave after Plan 01-04.  
    Acceptance: Template exists under `.planning/dispatch/` with required fields (plan, combo, concurrency, source fingerprints, approval id).  
    Combo hint: te-build.

14. **T-REV-14** — Document the 1,500 vs 2,000 char cap discrepancy for later resolution (Phase 1 research item).  
    Acceptance: Note added to `.planning/RESEARCH.md` or `01-RESEARCH.md` with source references.  
    Combo hint: te-plan.

15. **T-REV-15** — Verify 43/55 timestamp coverage claim against corpus-manifest and vectors.  
    Acceptance: Manifest reports 43 timestamped; at least one sample episode has per-segment `start` in vectors or R2 payload.  
    Combo hint: te-build.

## D. HANDOFF

**Current handoff target:** te-swarm-s for cheap parallel verification slices (T-REV-02, T-REV-06, T-REV-07, T-REV-11, T-REV-15); te-dispatch-paid for Plan 01-04 execution (T-REV-04) and artifact production (T-REV-09); human for approval gates (T-REV-01, T-REV-12) and dual-source planning alignment sign-off (T-REV-05).

**Next immediate actions (before any paid dispatch):**
1. Human re-approves NEXT-WAVE (T-REV-01).
2. Run L1/L2 under te-build (T-REV-02/03).
3. Execute Plan 01-04 (T-REV-04).
4. Materialize Turn 2 artifacts (T-REV-09).
5. Confirm dual-source mapping note (T-REV-05) — no implementation.

**Blockers to surface:**
- Deployment architecture, identity, team roster, capability matrix (Phase 2 readiness).
- YouTube access, uncut inventory, editorial query set (Phases 3-4).
- Research inputs, vendor decisions (Phase 5+).

**Do not:**
- Install component libraries beyond Phase 1 proof harness.
- Create real `/ops` data or canonical episode records before Phase 2 acceptance.
- Mutate CF resources or move beyond shadow RAG.
- Rewrite preserved 01-*-PLAN.md files.

**Resume command (after approval):**  
`node ~/.codex/get-shit-done/bin/gsd-tools.cjs execute-phase 1 --plan 01-04`  
or the Temperance equivalent once artifacts are materialized.

**Skill gaps noted for later:**
- Transcript alignment / timestamp reconciliation (Phases 3-4) — search local skill-clusters first.
- Multi-source provenance adapters — may require skillsmp discovery if not in index.

---

**End of Turn 1 deep pass.** Ready for Turn 2 artifact materialization on explicit user signal. No code changes performed. All review findings are captured above and in the referenced planning/design files.

---
project: wtfmedia
task: "Re-found WTF Media as an evidence-native podcast operating system"
effort: deep
effort_source: classifier
phase: plan
progress: 50/166
mode: interactive
started: 2026-08-18T11:39:10Z
updated: 2026-09-01T00:00:00+05:30
---

## Problem

The repository proves a public, catalogue-first RAG experience across 55 episodes and now has a governed ten-phase operating-system roadmap plus 23 committed Phase 1 proof-harness plans. The client build specification uses “Phase 1” and “Phase 2” for broader delivery tracks spanning authentication, ingestion, dual timelines, retrieval, research, production, analytics, and clip intelligence. Treating those labels as equivalent to repository Phase 1 and Phase 2 would discard dependency and acceptance gates; the remaining planning problem is to preserve the proven foundation while mapping every client outcome, blocker, and unknown to the correct execution slice.

## Vision

WTF Media becomes one evidence-native control room in which the team can move from an episode or question to its source asset, transcript, exact moment, clip, workflow state, owner, schedule, performance, and downstream decision without changing systems. The public catalogue remains a valuable read-only projection, while the authenticated internal shell makes production work legible and actionable. The visual experience should feel unmistakably WTF: warm cream, ink-heavy, loud editorial typography, purposeful color, physical texture, and playful motion, now disciplined into a dense, dependable operator interface.

## Out of Scope

- This initialization does not implement or deploy the redesigned application.
- This milestone does not purchase domains, licenses, APIs, storage, or third-party services.
- This milestone does not write to Asana, WhatsApp, Frame.io, YouTube, ZTV, NAS, finance, CRM, or contract systems.
- This milestone does not ingest raw private meeting text, spreadsheet links, credentials, prompt bodies, or native session identifiers into the repository.
- This milestone does not relocate the checkout, mutate vault registries, migrate client sessions, alter OmniRoute providers, or change production infrastructure.
- The public catalogue and internal operating shell will not be collapsed into one undifferentiated navigation model.
- Payment rails, e-signature execution, government-ID storage, and outbound publishing remain separately gated work.

## Principles

- Evidence precedes automation: every generated insight must resolve to a source, owner, or explicit unknown.
- The provenance spine is the product: episode, asset, transcript, timestamp, clip, task, and outcome remain traceable.
- One brain does not mean one screen; shared entities and navigation unify specialized workspaces.
- Brand continuity lives in recognizable rules, not repeated decoration.
- Color communicates state and domain before it decorates surfaces.
- Operator density must not sacrifice first-use clarity, keyboard access, or readable hierarchy.
- Public discovery and internal operations may share primitives while preserving separate permissions and narratives.
- Existing deployed retrieval behavior remains protected while the internal operating shell is built around it.
- The workbook and kickoff minutes are evidence sources, never runtime dependencies.
- Every phase ends with behavior-level proof, not confidence inferred from implementation shape.

## Constraints

- Preserve the committed palette: cream `#FFF6EA`, ink `#1A1A1A`, red `#C53B3A`, green `#0C9367`, yellow `#F1B333`, purple `#6758A5`, and blue `#2D6BE0`.
- Preserve the extruded lowercase WTF Media wordmark and the curious, irreverent, exact voice.
- Retain Next.js App Router, React, TypeScript strictness, Tailwind, Vercel browser boundary, and Cloudflare edge RAG until an approved architecture phase changes them.
- Keep provider credentials, server secrets, and environment material outside the repository.
- Keep the Thoughtseed Labs vault referential; do not copy private notes, transcripts, or seed corpora into this repository.
- Direct Worker chat remains server-protected; browser clients do not receive the shared secret.
- Timestamp links appear only where timing provenance is verified.
- WhatsApp integration remains read-only unless a later owner-approved security design changes that boundary.
- PII-heavy credential workflows require a separate DPDPA/security decision before implementation.
- GSD owns execution planning under `.planning/`; this ISA owns acceptance and done.
- No registry, relocation, provider, session, or deployment mutation occurs without its own approved task.
- Generated outputs and machine-local dependencies remain ignored.
- Client delivery labels do not override repository phase identity, requirement ownership, or implementation authorization.
- The owner-approved client build specification informs synthesized requirements and blockers without copying its confidential body or machine-local source path into the repository.
- No dependent runtime phase begins before its named client input or open architecture decision resolves.

## Goal

Establish WTF Media as a governed, evidence-native podcast operating system: ISA is the acceptance and goal authority, GSD is the execution plan, and the public catalogue remains a protected projection. The approved plan preserves the brand while defining the provenance spine, operator-first information architecture, accessible components, phased workflows, integrations, and verification gates.

## Criteria

### Governance and planning spine

- [x] ISC-1: Repository root resolves through Git to the `wtfmedia` checkout (probe: `git rev-parse --show-toplevel`).
- [x] ISC-2: Local `main` references the declared GitHub repository history (probe: `git remote -v`).
- [x] ISC-3: Temperance project doctor reports `ISA.md` present (probe: `temperance-project-init --cwd . --check`).
- [x] ISC-4: Temperance project doctor reports `.planning` present (probe: project doctor output).
- [x] ISC-5: `.temperance/project.json` declares schema `temperance.project.v1` (probe: JSON query).
- [x] ISC-6: `.temperance/project.json` declares `active_planner` as `isa` (probe: JSON query).
- [x] ISC-7: `.temperance/project.json` reports `has_isa: true` (probe: JSON query).
- [x] ISC-8: `.temperance/project.json` reports `has_planning: true` (probe: JSON query).
- [x] ISC-9: `.temperance/goal.json` sources its text from `## Goal` (probe: `temperance-goal --cwd . --json`).
- [x] ISC-10: `.planning/PROJECT.md` states the current WTF operating-system milestone (probe: heading grep).
- [x] ISC-11: `.planning/REQUIREMENTS.md` gives every milestone requirement a stable ID (probe: requirements parser).
- [x] ISC-12: `.planning/ROADMAP.md` maps every requirement ID exactly once (probe: GSD roadmap analysis).

### Narrative and information architecture

- [ ] ISC-13: Product framing names the public catalogue as a read-only projection (probe: copy snapshot test).
- [ ] ISC-14: Product framing names the internal control room as the primary operator surface (probe: copy snapshot test).
- [ ] ISC-15: Primary navigation exposes a Control Room destination (probe: DOM role query).
- [ ] ISC-16: Primary navigation exposes an Episodes destination (probe: DOM role query).
- [ ] ISC-17: Primary navigation exposes a Knowledge destination (probe: DOM role query).
- [ ] ISC-18: Primary navigation exposes a Production destination (probe: DOM role query).
- [ ] ISC-19: Primary navigation exposes an Analytics destination (probe: DOM role query).
- [ ] ISC-20: Primary navigation exposes a People destination (probe: DOM role query).
- [ ] ISC-21: Public routes omit internal operational modules (probe: anonymous route map).
- [ ] ISC-22: Internal routes display the active workspace context (probe: DOM role query).
- [ ] ISC-23: Every workspace provides one dominant next action (probe: page rubric).
- [ ] ISC-24: Empty states explain the next valid operator action (probe: component story assertion).

### Brand foundations and tokens

- [ ] ISC-25: Cream is defined once as a semantic canvas token (probe: token file query).
- [ ] ISC-26: Ink is defined once as a semantic foreground token (probe: token file query).
- [ ] ISC-27: Red is defined once as a semantic critical/editorial token (probe: token file query).
- [ ] ISC-28: Green is defined once as a semantic success/live token (probe: token file query).
- [ ] ISC-29: Yellow is defined once as a semantic attention/action token (probe: token file query).
- [ ] ISC-30: Purple is defined once as a semantic knowledge/AI token (probe: token file query).
- [ ] ISC-31: Blue is defined once as a semantic information token (probe: token file query).
- [ ] ISC-32: Orange is defined once as a semantic warning token (probe: token file query).
- [ ] ISC-33: Text contrast on cream meets WCAG AA for body copy (probe: contrast test).
- [ ] ISC-34: Text contrast on colored fills meets WCAG AA (probe: contrast test).
- [ ] ISC-35: Display typography resolves through a single token (probe: computed-style test).
- [ ] ISC-36: Editorial serif typography resolves through a single token (probe: computed-style test).
- [ ] ISC-37: Body typography resolves through a single token (probe: computed-style test).
- [ ] ISC-38: Spacing tokens cover the documented compact-to-display scale (probe: token schema test).
- [ ] ISC-39: Radius tokens distinguish controls, cards, and overlays (probe: token schema test).
- [ ] ISC-40: Shadow tokens reproduce the committed offset-print depth language (probe: visual snapshot).

### Component library and interaction contracts

- [ ] ISC-41: A documented Button primitive supports primary appearance (probe: component story).
- [ ] ISC-42: A documented Button primitive supports secondary appearance (probe: component story).
- [ ] ISC-43: A documented Button primitive supports destructive appearance (probe: component story).
- [ ] ISC-44: A documented IconButton primitive exposes an accessible name (probe: axe test).
- [ ] ISC-45: A documented Input primitive renders error state (probe: component story).
- [ ] ISC-46: A documented Select primitive is keyboard operable (probe: browser test).
- [ ] ISC-47: A documented SearchField primitive exposes clear behavior (probe: browser test).
- [ ] ISC-48: A documented StatusChip maps statuses to semantic tokens (probe: story assertions).
- [ ] ISC-49: A documented Card primitive supports interactive state (probe: component story).
- [ ] ISC-50: A documented DataTable primitive supports sortable headers (probe: browser test).
- [ ] ISC-51: A documented Drawer primitive traps focus while open (probe: browser test).
- [ ] ISC-52: A documented Dialog primitive restores focus on close (probe: browser test).
- [ ] ISC-53: A documented Toast primitive announces through a live region (probe: axe test).
- [ ] ISC-54: A documented Tabs primitive supports arrow-key navigation (probe: browser test).
- [ ] ISC-55: A documented CommandPalette primitive supports keyboard invocation (probe: browser test).
- [ ] ISC-56: A documented Timeline primitive renders episode workflow events (probe: component story).
- [ ] ISC-57: A documented MetricCard primitive distinguishes value from trend (probe: visual snapshot).
- [ ] ISC-58: All animated primitives respect reduced-motion preference (probe: media-query browser test).

### Control room and workflow shell

- [ ] ISC-59: Control Room displays active episode count from real data (probe: fixture browser test).
- [ ] ISC-60: Control Room displays production-stage counts from real data (probe: fixture browser test).
- [ ] ISC-61: Control Room displays upcoming shoot dates from real data (probe: fixture browser test).
- [ ] ISC-62: Control Room displays upcoming publish dates from real data (probe: fixture browser test).
- [ ] ISC-63: Control Room displays unresolved blockers from real data (probe: fixture browser test).
- [ ] ISC-64: Control Room displays assigned work for the signed-in operator (probe: role fixture test).
- [ ] ISC-65: Control Room links each summary card to its filtered workspace (probe: navigation test).
- [ ] ISC-66: Global command search returns episodes by title (probe: browser fixture test).
- [ ] ISC-67: Global command search returns people by name (probe: browser fixture test).
- [ ] ISC-68: Global command search returns tasks by identifier (probe: browser fixture test).
- [ ] ISC-69: Workspace shell exposes loading state without layout shift (probe: visual regression).
- [ ] ISC-70: Workspace shell exposes recoverable error state (probe: component story).

### Episodes, assets, transcripts, and provenance

- [ ] ISC-71: Canonical episode records retain a stable internal ID (probe: schema test).
- [ ] ISC-72: Canonical episode records retain their public video ID when available (probe: schema test).
- [ ] ISC-73: Canonical episode records identify their show/IP (probe: schema test).
- [ ] ISC-74: Canonical episode records store shoot date separately from publish date (probe: schema test).
- [ ] ISC-75: Asset records distinguish clean-cut from published-video sources (probe: schema test).
- [ ] ISC-76: Asset records preserve an evidence-source reference without embedded credentials (probe: secret scan).
- [ ] ISC-77: Transcript records identify their source asset (probe: referential-integrity test).
- [ ] ISC-78: Timestamp maps identify both source timelines (probe: schema test).
- [ ] ISC-79: Repeated ingestion preserves the same content hash (probe: idempotency test).
- [ ] ISC-80: Every timed citation resolves to a verified timestamp sidecar (probe: citation integration test).
- [ ] ISC-81: Untimed sources omit timestamp query parameters (probe: citation integration test).
- [ ] ISC-82: Catalogue reconciliation reports workbook rows missing from the app corpus (probe: reconciliation command).

### Ask WTF and knowledge workflows

- [ ] ISC-83: Ask WTF answers include at least one source for grounded claims (probe: golden RAG eval).
- [ ] ISC-84: Ask WTF abstains from unsupported ownership claims (probe: golden RAG eval).
- [ ] ISC-85: Ask WTF abstains from unsupported role claims (probe: golden RAG eval).
- [ ] ISC-86: Ask WTF distinguishes source quotes from model synthesis (probe: response schema test).
- [ ] ISC-87: Ask WTF exposes the active search scope (probe: DOM assertion).
- [ ] ISC-88: Ask WTF can scope retrieval to one episode (probe: API integration test).
- [ ] ISC-89: Ask WTF can scope retrieval to one show/IP (probe: API integration test).
- [ ] ISC-90: Ask WTF can open a cited source in context (probe: browser navigation test).
- [ ] ISC-91: Knowledge search returns abstract-topic matches above an approved precision threshold (probe: labelled eval set).
- [ ] ISC-92: Sentiment search returns emotional-moment matches above an approved precision threshold (probe: labelled eval set).

### Production, analytics, people, and integrations

- [ ] ISC-93: Production board represents each episode as one workflow record (probe: fixture browser test).
- [ ] ISC-94: Production board records one accountable owner per active stage (probe: schema validation).
- [ ] ISC-95: Shared calendar distinguishes shoot events by semantic state (probe: calendar fixture test).
- [ ] ISC-96: Shared calendar distinguishes publish events by semantic state (probe: calendar fixture test).
- [ ] ISC-97: Analytics records retain platform provenance (probe: schema test).
- [ ] ISC-98: Analytics records retain reporting-window provenance (probe: schema test).
- [ ] ISC-99: Budget records link spend to an episode or IP (probe: referential-integrity test).
- [ ] ISC-100: People records distinguish guests from leads (probe: schema test).
- [ ] ISC-101: Lead records expose a single current pipeline stage (probe: schema validation).
- [ ] ISC-102: Research dossiers preserve Snacks/Appetizers/Main Course/Desserts sections (probe: document schema test).
- [ ] ISC-103: Asana synchronization is read-only during its first production phase (probe: integration contract test).
- [ ] ISC-104: WhatsApp ingestion rejects outbound-message operations (probe: integration contract test).
- [ ] ISC-105: Frame.io ingestion records transcription readiness per asset (probe: adapter fixture test).
- [ ] ISC-106: YouTube ingestion records caption timing coverage per source (probe: adapter fixture test).
- [ ] ISC-107: TikTok analytics exposes an explicit unavailable state without fabricated metrics (probe: adapter failure test).
- [ ] ISC-108: ZTV integration uses server-side credentials only (probe: secret-boundary test).
- [ ] ISC-109: NAS integration exposes connectivity health without path disclosure (probe: API response test).
- [ ] ISC-110: Integration failures create operator-visible retry state (probe: adapter failure test).

### Quality, accessibility, performance, and operations

- [ ] ISC-111: Web TypeScript strict build emits zero errors (probe: `npm run build --prefix web`).
- [ ] ISC-112: Cloudflare Worker type generation exits zero (probe: package script).
- [ ] ISC-113: Repository-owned UI tests execute outside dependency directories (probe: test runner).
- [ ] ISC-114: Core internal routes have zero serious axe violations (probe: axe browser suite).
- [ ] ISC-115: Core internal routes are usable at 320 CSS pixels (probe: viewport browser suite).
- [ ] ISC-116: Core internal routes are usable at 1440 CSS pixels (probe: viewport browser suite).
- [ ] ISC-117: Primary-route LCP stays within the approved internal budget (probe: Lighthouse CI).
- [ ] ISC-118: Direct Worker chat without the shared secret returns HTTP 401 (probe: HTTP integration test).

### Anti-criteria

- [ ] ISC-119: Anti: repository history contains no `.env` material (probe: secret scan).
- [ ] ISC-120: Anti: browser bundles contain no server credential values (probe: bundle scan).
- [ ] ISC-121: Anti: private meeting text is absent from committed artifacts (probe: bounded phrase scan).
- [ ] ISC-122: Anti: spreadsheet drive links are absent from committed planning artifacts (probe: URL scan).
- [ ] ISC-123: Anti: public users cannot enumerate internal tasks (probe: anonymous authorization test).
- [ ] ISC-124: Anti: public users cannot enumerate budgets (probe: anonymous authorization test).
- [ ] ISC-125: Anti: public users cannot enumerate guest leads (probe: anonymous authorization test).
- [ ] ISC-126: Anti: citations never guess timestamps for untimed sources (probe: golden RAG eval).
- [ ] ISC-127: Anti: component code introduces a second competing color palette (probe: token lint).
- [ ] ISC-128: Antecedent: an operator can identify current context and next action within five seconds (probe: moderated first-click test).

### Design authority packet

- [x] ISC-129: `DESIGN.md` locks the committed repository brand assets as its primary reference set (probe: reference-lock grep).
- [x] ISC-130: `DESIGN.md` maps the committed shipping palette to stable semantic roles and labels orange as a provisional comp-derived extension (probe: palette table parser).
- [x] ISC-131: `DESIGN.md` specifies separate public and internal route groups while preserving every shipping public route contract (probe: route-tree and compatibility-contract grep).
- [x] ISC-132: `DESIGN.md` maps every current reusable web component to a target responsibility (probe: migration-table parser).
- [x] ISC-133: `DESIGN.md` names the recommended accessible component foundation and defers installation to an owned GSD phase (probe: foundation-section grep).
- [x] ISC-134: Anti: `DESIGN.md` contains no private source filename, download path, embedded drive link, or raw meeting text (probe: bounded privacy scan).

### Client scope reconciliation

- [x] ISC-135: `.planning/ROADMAP.md` states that client Phase 1 and Phase 2 are delivery tracks rather than repository phase aliases (probe: delivery-track table parser).
- [x] ISC-136: Client Phase 1 acceptance maps to repository Phases 2–4 after the preserved Phase 1 harness (probe: roadmap mapping assertion).
- [x] ISC-137: Client Phase 2 acceptance maps to repository Phases 5–9 while migration closure remains Phase 10 (probe: roadmap mapping assertion).
- [x] ISC-138: Every unresolved client input names an owner and blocked repository phase (probe: blocker-table schema test).
- [x] ISC-139: All 102 approved v1.0 requirements have unique stable IDs and exactly one roadmap owner (probe: requirements/roadmap coverage script).
- [x] ISC-140: The 23 committed Phase 1 plan files remain byte-identical to commit `0f80677` after reconciliation (probe: Git object hash comparison).

### Architecture evidence ledger

- [x] ISC-141: `docs/architecture/architecture.html` renders at least 20 evidence-linked architecture sections and six inline SVG relationship diagrams (probe: generator check plus section/diagram count).
- [x] ISC-142: The current architecture ledger explicitly records that repository Phase 1 public proof is independent of Cloudflare Zero Trust, Access Applications, policies, and D1 operator provisioning (probe: ledger decision text and Phase 1 verifier source).
- [x] ISC-143: Architecture code/config/version inputs have a deterministic documentation regeneration command and a CI freshness check (probe: generator check plus workflow source).
- [x] ISC-144: Anti: the architecture ledger never represents a local HMAC fixture, modeled seat, package version, historic deployment note, or declared Worker binding as live Cloudflare Access or runtime proof (probe: ledger status and drift assertions).

### Cloudflare estate inventory and migration boundary

- [x] ISC-145: The inventory maps `9d9d` as source, repository-bound `wtfmedia` as target, and `default` as an unrelated control account (probe: Wrangler auth/profile and account readback).
- [x] ISC-146: The account-wide `default` pass records service-family counts and finds no WTF-named resource, binding, route, domain, or zone (probe: redacted cross-service list/search receipts).
- [x] ISC-147: Both source Workers expose readable settings and deployment history, superseding the earlier unresolved edge-administration claim (probe: `9d9d` Worker settings/deployment list).
- [x] ISC-148: Source R2 pagination is handled explicitly and `wtfmedia-catalogue` is reconciled at 99 objects and 13.2 MB (probe: cursor-capable bucket list plus direct bucket info).
- [x] ISC-149: Source `WTFMEDIA_STATE` is reconciled at 55 persistent `ingest`-prefix keys without reading values (probe: metadata-only KV key listing and aggregate count).
- [x] ISC-150: Source Vectorize and queue contracts record 5,742 vectors at 1,024 dimensions/cosine plus the observed producer, consumer, retry, concurrency, wait, and DLQ settings (probe: read-only Vectorize and queue info).
- [x] ISC-151: The target owns active zone `wtfhq.in`, has no WTF data-plane resources, returns R2-disabled code `10042`, and lacks DNS-record read authority (probe: target lists, R2 response, zone read, and public DNS).
- [x] ISC-152: The action matrix explicitly holds Pages, Access/RBAC, NVIDIA provider activation, source deletion, and every `default` resource outside this migration (probe: inventory matrix assertion).
- [x] ISC-153: Anti: the inventory pass performs no Cloudflare create, update, deploy, secret write, data copy, DNS/domain mutation, or deletion (probe: command ledger classification and unchanged-state receipts).
- [x] ISC-154: The cutover plan uses an initial bulk copy followed by owner-authorized source quiesce, queue settlement, and a final R2/KV/Vectorize delta from a recorded high-water state (probe: ordered migration-step assertion).
- [x] ISC-155: Rollback names the verified source Worker emergency URL, restores any quiesced source settings, and explicitly states that current no-apex recovery is not same-host continuity (probe: HTTP read plus rollback-contract assertion).

### Ask WTF named-guest relevance and source presentation

- [x] ISC-156: Named-person questions widen candidate retrieval before relevance selection (probe: source-mode contract).
- [x] ISC-157: Explicit multi-token person names become retrieval anchors against title/text evidence (probe: named-guest source-mode contract).
- [x] ISC-158: The relevance anchor tolerates the observed one-character Sunil/Suniel spelling difference without creating a new identity (probe: spelling-variant contract).
- [x] ISC-159: Anchored questions retain multiple evidence chunks from the matching episode when needed for synthesis (probe: multi-chunk source-mode contract).
- [x] ISC-160: Named-person questions with no matching evidence fail closed instead of returning a semantically similar guest (probe: no-anchor contract).
- [x] ISC-161: The synthesis prompt forbids substituting another guest or episode when an explicit person is named (probe: Worker system-prompt assertion).
- [x] ISC-162: Mixed citations default the public source panel to `both` (probe: browser journey).
- [x] ISC-163: Selecting `published` shows only published citations and updates count/list/links (probe: browser journey).
- [x] ISC-164: Selecting `uncut` shows only uncut citations and preserves truthful timestamp states (probe: browser journey).
- [x] ISC-165: Selecting `both` restores the complete returned citation set (probe: browser journey).
- [x] ISC-166: The source panel never relabels or leaks a citation across modes (probe: unit and browser contracts).

## Test Strategy

| ISC range | Type | Check | Threshold | Tool |
|---|---|---|---|---|
| ISC-1..12 | governance | Git, Manifest, ISA, GSD, and goal authority resolve coherently | all probes pass | Git, Temperance doctor, GSD parser |
| ISC-13..24 | narrative/IA | route map and page copy express public projection versus internal OS | 100% assertions | browser DOM suite + copy snapshots |
| ISC-25..40 | design tokens | semantic tokens reproduce the committed brand with accessible contrast | 100% schema checks; WCAG AA | token tests + contrast audit + visual snapshots |
| ISC-41..58 | component library | primitives cover documented states, keyboard behavior, focus, and motion | 100% component stories pass | component harness + browser + axe |
| ISC-59..70 | control room | dashboard data, navigation, search, loading, and errors work from fixtures | 100% fixture flows | browser integration suite |
| ISC-71..82 | provenance | canonical entities and dual timelines reconcile without secret leakage | 100% integrity checks | schema tests + ingestion fixtures + secret scan |
| ISC-83..92 | knowledge | responses stay grounded while abstract and sentiment retrieval meet labels | grounded ≥95%; abstention 100% | golden RAG eval suite |
| ISC-93..110 | operations | workflow modules and adapters preserve provenance and safe failure states | 100% contract checks | schema + adapter fixtures + authorization tests |
| ISC-111..118 | quality | builds, accessibility, responsive behavior, performance, and security pass | zero blocking failures | build, browser, Lighthouse, HTTP tests |
| ISC-119..128 | anti/experience | secrets, private sources, false timestamps, palette drift, and lost context do not occur | zero violations | scans, authorization tests, token lint, first-click study |
| ISC-129..134 | design authority | reference lock, semantic palette, route split, migration map, foundation, and privacy boundary are explicit | 100% document probes | Markdown parser + bounded scans |
| ISC-135..140 | client scope reconciliation | delivery tracks, blockers, stable requirement ownership, and preserved Phase 1 plans remain explicit | 100% document and Git probes | Markdown parser + coverage script + Git hashes |
| ISC-141..144 | architecture evidence | current topology, Phase 1 Access exemption, deterministic regeneration, and no false live claim remain explicit | all source/check probes pass | generator + static HTML assertions + CI workflow parse |
| ISC-145..155 | Cloudflare estate | profile topology, paginated source resources, target gaps, action boundaries, final-delta consistency, exact rollback, and no-mutation posture are explicit | all live read-only and document probes pass | Wrangler/API lists + public DNS/HTTP + bounded scans |
| ISC-156..161 | named-guest relevance | explicit named-person questions stay anchored to matching evidence and abstain when no anchor exists | all source-mode contract assertions pass | Worker unit tests + prompt inspection |
| ISC-162..166 | source-panel filtering | `published`, `uncut`, and `both` visibly filter response-backed citations without relabeling or leakage | all unit and browser assertions pass | web unit + Playwright journey |

## Features

```yaml
- name: ProjectGovernanceSpine
  description: Git identity, Temperance manifest, ISA goal authority, and GSD planning contract
  satisfies: [ISC-1, ISC-2, ISC-3, ISC-4, ISC-5, ISC-6, ISC-7, ISC-8, ISC-9, ISC-10, ISC-11, ISC-12]
  depends_on: []
  parallelizable: false

- name: DesignAuthority
  description: Repository-grounded product narrative, visual system, component contracts, route architecture, and migration seams
  satisfies: [ISC-129, ISC-130, ISC-131, ISC-132, ISC-133, ISC-134]
  depends_on: [ProjectGovernanceSpine]
  parallelizable: false

- name: ClientScopeReconciliation
  description: Stable mapping from client delivery tracks and blockers to repository requirements, phases, and preserved plans
  satisfies: [ISC-135, ISC-136, ISC-137, ISC-138, ISC-139, ISC-140]
  depends_on: [ProjectGovernanceSpine]
  parallelizable: false

- name: NarrativeAndInformationArchitecture
  description: Separate public catalogue projection from authenticated operator control room
  satisfies: [ISC-13, ISC-14, ISC-15, ISC-16, ISC-17, ISC-18, ISC-19, ISC-20, ISC-21, ISC-22, ISC-23, ISC-24]
  depends_on: [ProjectGovernanceSpine, DesignAuthority, ClientScopeReconciliation]
  parallelizable: false

- name: BrandTokenFoundation
  description: Semantic color, typography, spacing, radius, and depth tokens preserving WTF identity
  satisfies: [ISC-25, ISC-26, ISC-27, ISC-28, ISC-29, ISC-30, ISC-31, ISC-32, ISC-33, ISC-34, ISC-35, ISC-36, ISC-37, ISC-38, ISC-39, ISC-40]
  depends_on: [NarrativeAndInformationArchitecture, DesignAuthority]
  parallelizable: false

- name: OperatorComponentLibrary
  description: Accessible documented primitives for dense editorial operations interfaces
  satisfies: [ISC-41, ISC-42, ISC-43, ISC-44, ISC-45, ISC-46, ISC-47, ISC-48, ISC-49, ISC-50, ISC-51, ISC-52, ISC-53, ISC-54, ISC-55, ISC-56, ISC-57, ISC-58]
  depends_on: [BrandTokenFoundation]
  parallelizable: false

- name: ControlRoomShell
  description: Context-aware dashboard, global command search, and reliable application states
  satisfies: [ISC-59, ISC-60, ISC-61, ISC-62, ISC-63, ISC-64, ISC-65, ISC-66, ISC-67, ISC-68, ISC-69, ISC-70]
  depends_on: [OperatorComponentLibrary]
  parallelizable: false

- name: ProvenanceSpine
  description: Canonical episode, asset, transcript, passage, timestamp-map, and reconciliation contracts
  satisfies: [ISC-71, ISC-72, ISC-73, ISC-74, ISC-75, ISC-76, ISC-77, ISC-78, ISC-79, ISC-80, ISC-81, ISC-82]
  depends_on: [ProjectGovernanceSpine]
  parallelizable: true

- name: EvidenceNativeKnowledge
  description: Scoped, cited Ask WTF plus evaluated abstract-topic and sentiment discovery
  satisfies: [ISC-83, ISC-84, ISC-85, ISC-86, ISC-87, ISC-88, ISC-89, ISC-90, ISC-91, ISC-92]
  depends_on: [ProvenanceSpine, OperatorComponentLibrary]
  parallelizable: false

- name: SourceModeCitationFilter
  description: Named-guest retrieval anchoring and response-backed published/uncut/both citation visibility
  satisfies: [ISC-156, ISC-157, ISC-158, ISC-159, ISC-160, ISC-161, ISC-162, ISC-163, ISC-164, ISC-165, ISC-166]
  depends_on: [EvidenceNativeKnowledge]
  parallelizable: false

- name: ProductionOperations
  description: Episode workflow, calendar, analytics, budgets, people, research, and safe adapters
  satisfies: [ISC-93, ISC-94, ISC-95, ISC-96, ISC-97, ISC-98, ISC-99, ISC-100, ISC-101, ISC-102, ISC-103, ISC-104, ISC-105, ISC-106, ISC-107, ISC-108, ISC-109, ISC-110]
  depends_on: [ProvenanceSpine, ControlRoomShell]
  parallelizable: true

- name: QualityAndSafetyGates
  description: Build, test, accessibility, performance, security, privacy, and experiential verification
  satisfies: [ISC-111, ISC-112, ISC-113, ISC-114, ISC-115, ISC-116, ISC-117, ISC-118, ISC-119, ISC-120, ISC-121, ISC-122, ISC-123, ISC-124, ISC-125, ISC-126, ISC-127, ISC-128]
  depends_on: [ControlRoomShell, ProvenanceSpine, EvidenceNativeKnowledge, ProductionOperations]
  parallelizable: false

- name: ArchitectureEvidenceLedger
  description: Evidence-linked architecture, Access-boundary, release, and update documentation generated deterministically from reviewed repository facts
  satisfies: [ISC-141, ISC-142, ISC-143, ISC-144]
  depends_on: [ProjectGovernanceSpine, ClientScopeReconciliation, QualityAndSafetyGates]
  parallelizable: false

- name: CloudflareEstateMigrationBoundary
  description: Live three-account inventory, source-to-target action matrix, capability gates, and no-mutation evidence
  satisfies: [ISC-145, ISC-146, ISC-147, ISC-148, ISC-149, ISC-150, ISC-151, ISC-152, ISC-153, ISC-154, ISC-155]
  depends_on: [ProjectGovernanceSpine, ArchitectureEvidenceLedger]
  parallelizable: false
```

## Architecture

<!-- arch-assets:start -->

_Auto-maintained by `ArchitectureAssetsSync.hook.ts` on release events._  
_Last refreshed: 2026-09-03T22:07:43.946Z_

| Asset | Status | How it's generated |
|---|---|---|
| [`docs/architecture/SERVICES.md`](docs/architecture/SERVICES.md) | ✓ current | auto (file scan) |
| [`docs/architecture/DEPENDENCY-GRAPH.md`](docs/architecture/DEPENDENCY-GRAPH.md) | ✓ current | auto (file scan) |
| [`docs/architecture/architecture.html`](docs/architecture/architecture.html) | ⚠ STALE — run `/refresh-architecture` | manual (LLM skill) |
| [`docs/architecture/notebooklm-prompt.md`](docs/architecture/notebooklm-prompt.md) | ✗ not yet generated | manual (LLM skill) |

**To refresh LLM-generated assets:** invoke `/refresh-architecture` in any Claude Code session.

<!-- arch-assets:end -->

## Decisions

- 2026-08-18 17:09 IST: The project ISA is the acceptance and goal authority; GSD remains the execution-planning spine under `.planning/`.
- 2026-08-18 17:09 IST: The current public catalogue is preserved as a projection of shared evidence data, not treated as the complete internal operating system.
- 2026-08-18 17:09 IST: The workbook and kickoff minutes may shape requirements, but raw source content and embedded file links will not be copied into repository artifacts.
- 2026-08-18 17:09 IST: The highest-leverage product foundation is the provenance spine connecting episode, clean cut, published video, transcript, timestamps, clips, and workflow outcomes.
- 2026-08-18 17:09 IST: The component-library choice is deferred until implementation planning compares existing bespoke primitives against accessible headless foundations; semantic tokens and interaction contracts are mandatory either way.
- 2026-08-18 17:09 IST: GSD milestone artifacts remain gated on owner confirmation of the synthesized milestone summary, as required by the GSD workflow.
- 2026-08-18 17:18 IST: The mandatory pre-build Advisor call was attempted but could not authenticate because its local OAuth session had expired; credentials were not repaired inside this project task, and the resolved `te-plan` rail plus direct repository evidence remain the bounded planning review.
- 2026-08-18 17:20 IST: refined: The Goal was compressed below Manifest's 400-character extraction limit after the first generated receipt ended mid-word; acceptance authority, planning authority, public-projection boundary, brand continuity, and implementation gates remain explicit.
- 2026-08-18 17:22 IST: Root-cause-at-ingestion: Manifest rejected the checkout at repository identity discovery because `.git` was absent. The declared `origin/main` history was rehydrated without replacing working files; no bridge, provider, deployment, or credential state was patched.
- 2026-08-18 17:30 IST: The independent Cato audit initially rejected handoff because machine-local receipts were commit-visible, inherited next-wave state targeted an unrelated historical promo, and the goal measured 404 characters. Runtime receipts are now ignored, bootstrap next-wave resolves to no executable proposal while preserving the historical task, and the goal round-trips at 397 characters.
- 2026-08-18 17:42 IST: Live Refero research was attempted but its configured subscription is inactive; no account state was changed. The committed control-room, contact-sheet, flow, shipping UI, and bundled craft references therefore form the bounded reference set recorded in `DESIGN.md`.
- 2026-08-18 17:42 IST: refined: The component-foundation recommendation is selective Radix primitives beneath repository-owned WTF components, TanStack Table as a headless table-state layer, Phosphor icons, and Storybook's Next/Vite framework. Nothing is installed until an approved GSD phase owns dependency and migration tests.
- 2026-08-18 17:42 IST: `DESIGN.md` is a design authority and GSD input, not an alternate roadmap or acceptance source; `ISA.md` remains acceptance and the required owner confirmation still gates populated milestone artifacts.
- 2026-08-18 17:51 IST: refined: Route groups may reorganize source files but cannot break `/`, `/episodes`, `/connections`, `/chat`, or `/api/chat`; public and operator connection graphs are separate policy-bound projections over shared evidence. Orange is a provisional comp-derived semantic extension, not part of the committed `PRODUCT.md` palette.
- 2026-08-19 11:30 IST: Owner approval finalized the v1.0 roadmap. All ten requirement families remain in milestone scope, but only Phase 1 and Phase 2 are implementation-authorized first; Phases 3 through 8 remain planned and inactive until the recorded owner gate is satisfied.
- 2026-08-20 17:45 IST: refined: The owner approved preserving all 23 repository Phase 1 plans while reconciling the client build specification above them. Client Phase 1 now maps across repository Phases 2–4; client Phase 2 maps across Phases 5–9; Phase 10 owns migration closure. Only repository Phases 1–2 remain implementation-authorized, and every unresolved client input remains a named blocker rather than guessed architecture.
- 2026-08-20 18:10 IST: The required post-deliverable Advisor call was attempted but the local OAuth session was expired and could not refresh. Credentials were not repaired in this repository task; deterministic probes and the read-only planning audit remain the bounded verification authority.
- 2026-08-20 18:12 IST: The requested Cato agent role was unavailable in the local agent registry, so the independent audit ran through an ephemeral read-only GPT-5.4 Codex process. Its two noncritical STATE metadata concerns were corrected, and its focused re-audit returned `VERDICT pass` without modifying files.
- 2026-08-20 17:26 IST: Phase 1 execution preflight found Plan 01-01 Tasks 1–2 already present as uncommitted, passing artifacts over a substantial dirty production checkout. Execution is paused at the plan's blocking Task 3 owner gate; no clean-HEAD worker, package install, or task commit may proceed until the recorded dirty-worktree contract and streaming interpretation are explicitly approved.
- 2026-08-20 17:26 IST: The pre-build Advisor call was attempted and failed because the local OAuth session remains expired. Credentials were not repaired; the explicit Plan 01-01 human gate and deterministic manifest evidence govern the current stop.
- 2026-08-20 22:06 IST: The owner approved the exact pre-existing `@types/node@22.12.0` amendment required by Vite 8.2.1. The approved twelve-package receipt remains unchanged, no peer-dependency bypass was used, and Plan 01-03 Task 1 passed its immutable exact-pin proof.
- 2026-08-20 22:06 IST: Plan 01-03 Task 2 failed closed because the immutable proof tries to resolve CLI-only `@lhci/cli` as a Node module. The preserved plan will not be rewritten in place; a bounded correction plan must replace that probe with executable verification before Phase 1 resumes.
- 2026-08-20 22:24 IST: Owner-approved issue #6 is implemented as a narrow effective-command correction ledger, not a PLAN rewrite. It binds only T-01-07 and T-01-08 to their original command IDs, SHA-256 digests, and failed privacy-safe evidence; the runner permits only the approved LHCI executable probe and rejects unapproved or drifted corrections.
- 2026-08-25 23:00 IST: Phase 2 uses Cloudflare Zero Trust Access for operator authentication and Cloudflare D1 for operator and audit persistence. A Cloudflare-controlled operator endpoint routes to the existing Vercel application. The personal `9d9d` Wrangler account may temporarily own those resources, but repository-owned schema, migrations, bindings, policy, and verification must remain portable; credentials and numeric account identifiers stay outside source control, and the eventual account move requires separate owner approval.
- 2026-08-25 23:08 IST: Phase 2 separates authentication from authorization: Cloudflare Access authenticates a normalized email, while D1 must contain a matching active operator with a recognized `admin` or `editor` role before any `/ops` capability is granted. Missing records, inactive operators, and unknown roles fail closed.
- 2026-08-25 23:43 IST: Phase 2 expiry, revocation, and operator deactivation fail closed immediately: protected client state is discarded, the recovery surface reveals no protected data, only a validated intended `/ops` destination may survive, and restored access requires fresh Cloudflare Access authentication plus fresh D1 authorization.
- 2026-08-26 00:03 IST: The verified Cloudflare Access token is Phase 2's sole authentication session. WTF issues no separate authentication cookie, every protected server request rechecks the active D1 operator role, and sign-out clears protected client state before Cloudflare Access logout. The existing unsigned JSON `wtf_session` draft is superseded and is not approved implementation authority.
- 2026-08-26 00:08 IST: Phase 2 uses one shared deny-by-default server policy across pages, APIs, queries, exports, record/field projection, safe errors, and cache boundaries; UI visibility mirrors policy but never grants authority. The authorization model now has a single transferable `super_admin` seat plus `admin` and `editor`. The temporary `super_admin` is `sheshnarayan.iyer@gmail.com`; transfer must be atomic and audited so the system never has zero or multiple active super administrators. Owner-supplied roster job titles remain evidence, not automatic application-role assignments.
- 2026-08-26 00:14 IST: The owner approved the initial visible-roster access mapping: `sheshnarayan.iyer@gmail.com` is `super_admin`; Aditi Raj is `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia are `editor`. Yash's job title and the completeness of the cropped source screenshot remain explicit metadata unknowns and do not silently acquire inferred values.
- 2026-08-26 00:30 IST: Phase 2 uses an append-only D1 audit ledger covering authentication outcomes, expiry/logout, protected searches/views/exports, operator/role/settings changes, and super-admin handoffs. Entries use allowlisted metadata and correlation IDs; tokens, raw queries, prompts, responses, and private payloads are prohibited. The draft unrestricted JSON metadata and hard-coded 90-day retention are not approved authority; retention remains a separate decision.
- 2026-08-26 00:32 IST: Audit retention is 365 days in production, 30 days in staging, and ephemeral locally. Only `super_admin` and `admin` may view or export audit records. Every export and automated purge is itself audited, and expired records are deleted without silent archival. This supersedes the draft 90-day setting.
- 2026-08-26 00:49 IST: Phase 2 strictly isolates local, staging, and production D1 databases, Cloudflare Access applications and policies, secrets, and cache namespaces. Production data is never copied to a lower environment; repository-owned migrations promote forward through environments; and preview deployments receive no protected backend unless explicitly bound. The bounded decision was recorded inline because concurrent writers would risk inconsistent policy text and unrequested subagents are prohibited.
- 2026-08-26 00:54 IST: The first authenticated `/ops` release is a truthful empty Control Room shell. It shows the current environment, workspace, effective operator role, authorized navigation, live-derived service status, and one dominant setup action. Missing systems render explicit unknown, offline, unavailable, or permission-denied states; fabricated health claims and misleading zero values are prohibited.
- 2026-08-26 00:58 IST: Phase 2 production release is fail-closed. Staging must deterministically prove the complete anonymous/expired/inactive/`editor`/`admin`/`super_admin` authorization matrix; Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and responsive behavior; and rollback plus runbook rehearsal. The checks block CI, owner approval of the staging evidence packet is mandatory, the production smoke test is read-only, and every failed or unknown gate blocks release.
- 2026-08-26 13:57 IST: Phase 2 planning replaces the superseded umbrella draft with twelve dependency-ordered executable plans. The final staging and read-only production-smoke plan is non-autonomous; planning completion does not authorize deployment, migrations, live writes, or cutover.
- 2026-08-26 13:59 IST: ❌ DEAD END: Tried the mandatory post-plan Advisor review — failed because the local OAuth session expired and could not refresh (don't retry inside this repository task).
- 2026-08-29 15:12 IST: The owner clarified that repository Phase 1 public proof must not be gated on Cloudflare Zero Trust or Access Applications because neither is currently configured. The modeled operator UI, seats, RBAC, JWT verifier, and loopback-only local context remain a separate activation workstream; no local fixture, historic closure note, binding declaration, or package version counts as live Access evidence.
- 2026-08-29 15:12 IST: The pre-build Advisor call for the architecture ledger was attempted and failed because the local OAuth session is expired. Credentials were not repaired. Repository evidence, a separate read-only inventory, and the user’s explicit authority govern the documentation decision.
- 2026-08-30 15:17 IST: refined: The owner temporarily authorizes the current WTF OS release on an ungated public URL: anonymous visitors who know the URL may list, create, and edit production-calendar records. Cloudflare Access and fine-grained RBAC move to the next release; this exception does not expose ingestion, transcript activation, provider settings, secrets, destructive operations, or release approval.
- 2026-08-30 16:22 IST: refined: Live read-only evidence resolves `9d9d` as source, repository-bound `wtfmedia` as the target owning `wtfhq.in`, and `default` as unrelated. Both source Workers are administrable; R2 remains 99 objects/13.2 MB; KV now has 55 persistent keys; Vectorize remains 5,742/1,024/cosine; ingest/DLQ queues are present; source D1 and WTF Pages are absent. The target OAuth profile is fresh, while R2 is disabled and DNS-record authority is unproven.
- 2026-08-30 16:22 IST: The migration is capability-gated rather than generically token-gated. Target R2 enablement/authority, DNS/domain authority, fresh secrets, reviewed source, and a bounded owner-authorized execution window precede any create, copy, deployment, or cutover; `default` remains untouched and source data is retained, while source runtime settings may change only inside the separately authorized quiesce.
- 2026-08-30 16:30 IST: Independent audit tightened cutover consistency: bulk copy is followed by a separately authorized source ingress/producer quiesce, queue settlement, and final R2/KV/Vectorize delta. Rollback uses the verified source Workers.dev endpoint while restoring quiesced settings; absent a separately rehearsed route, removing the target Custom Domain returns `wtfhq.in` to its pre-cutover no-apex state and is not same-host continuity.
- 2026-08-30 16:22 IST: ❌ DEAD END: The required Advisor review was attempted after live reconciliation but the local Advisor OAuth session remains expired. It was not repaired or substituted with a false success; direct Cloudflare receipts and the ISA completeness/independent audit govern this checkpoint.
- 2026-09-01 00:00 IST: refined: The owner-approved episode-scoped production receipt is now the latest runtime evidence. Published, approved mapped uncut, and combined Ask WTF retrieval are live with `episodeId`/`video_id` scope; 55/55 published and 49/49 mapped uncut receipts reconcile across KV and Vectorize reports 11,948 vectors. This is a bounded release slice, not completion of the full provenance/search phases; trusted timeline alignment, synchronized uncut playback, and evaluation gates remain open.

## Changelog

- 2026-08-18 | conjectured: The existing catalogue-first product framing could simply expand by adding more navigation cards
  refuted by: repository inspection, committed internal-OS brand comps, the 62-row editorial workbook, and the kickoff’s cross-functional workflow requirements show two distinct permission and narrative surfaces
  learned: the public catalogue must become a projection of a shared provenance spine while the authenticated control room becomes the primary operational product
  criterion now: ISC-13 through ISC-24 explicitly separate public projection, internal navigation, workspace context, and operator action hierarchy
- 2026-08-18 | conjectured: A pre-styled component kit could provide both accessibility and the future visual system
  refuted by: the committed offset-print brand, current bespoke interaction gaps, official headless-library guidance, and the need to migrate a working public projection incrementally
  learned: accessible behavior should come from selective unstyled primitives while visual authorship, tokens, domain patterns, and migration evidence stay inside the repository
  criterion now: ISC-129 through ISC-134 make the reference lock, semantic system, route split, component map, foundation decision, and privacy boundary directly probeable
- 2026-08-19 | conjectured: The full internal operating system could begin as one broad implementation wave after design approval
  refuted by: the dependency analysis and owner-approved execution cut require compatibility proof and the policy boundary before provenance, Knowledge, production, analytics, people, integrations, or legacy retirement can activate
  learned: the eight-phase roadmap is milestone scope, while implementation authority is deliberately limited to Phase 1 followed by Phase 2 acceptance
  criterion now: ISC-10 through ISC-12 make the approved GSD milestone spine directly probeable before implementation planning begins
- 2026-08-20 | conjectured: The client build specification's Phase 1 and Phase 2 labels should replace repository Phase 1 and Phase 2
  refuted by: scope comparison shows each client label combines several dependency layers, while repository Phase 1 already owns 23 accepted compatibility, component, evidence, and rollback plans
  learned: client phases are delivery tracks over dependency-safe repository phases; preserving both vocabularies makes commitments legible without weakening acceptance or guessing open architecture
  criterion now: ISC-135 through ISC-140 bind delivery-track mapping, blockers, requirement ownership, and Phase 1 plan preservation to executable probes
- 2026-08-20 | conjectured: every approved direct development package can be verified through Node module resolution
  refuted by: the approved `@lhci/cli@0.15.1` executable reports its CLI version but has no resolvable Node module entry, causing the immutable Plan 01-03 Task 2 probe to fail
  learned: package proof must test the consumption interface actually provided, and an immutable failed probe requires a bounded correction plan rather than a silent rewrite
  criterion now: the existing Phase 1 proof-gate requirement remains fail-closed until its correction plan replaces the invalid LHCI assertion
- 2026-08-20 | conjectured: an immutable failed threat probe can resume merely by rerunning a different command
  refuted by: the runner enforces plan/result command parity and the final ledger requires a fixed 72 threat IDs, so an unbound replacement would either conceal failure or break aggregation
  learned: a correction must retain immutable definition provenance and prior evidence while separately binding a single approved effective command
  criterion now: only the #6 allowlisted ledger can supersede the two LHCI results; all other correction files, IDs, commands, approval references, and evidence drift fail closed
- 2026-08-29 | conjectured: the presence of Access-aware source code and historic Phase 2 closure language could safely gate public Phase 1 or demonstrate a live operator boundary
  refuted by: the Phase 1 verifier is local-only, the Worker configuration omits Access/Application environment values, and the operations runbook still requires owner-supplied staging inputs
  learned: public Phase 1 remains independent while operator Access activation requires separate configuration and redacted runtime evidence
  criterion now: ISC-141 through ISC-144 bind the generated ledger, Phase 1 exemption, deterministic freshness check, and anti-false-live status boundary to probes
- 2026-08-30 | conjectured: the source KV was empty, edge administration was unresolved, and a generic target management token was the only infrastructure blocker
  refuted by: fresh profile-scoped lists show 55 persistent KV keys and readable edge settings/deployments; target OAuth reauthentication succeeds while R2 returns disabled code `10042` and DNS-record reads remain unauthorized
  learned: this is a three-account, capability-gated clone-and-cutover; Pages and `default` are non-actions, while R2/KV/Vectorize/queues/D1/Workers and the final domain each need explicit evidence gates
  criterion now: ISC-145 through ISC-155 bind the profile topology, paginated source truth, target gaps, action matrix, final-delta consistency, exact rollback, and no-mutation boundary to probes
- 2026-09-01 | conjectured: episode integration would require replacing the public chat contract or collapsing published and uncut evidence into one timeline
  refuted by: the production receipt and focused source-mode proofs show an optional public `episodeId` scope, pre-`topK` `video_id` filtering, source-aware citations, truthful unmapped behavior, and separate published/uncut locators
  learned: the completed slice can be carried as additive evidence over the existing public route and API while the full provenance, alignment, playback, search-evaluation, and analytics criteria remain pending
  criterion now: ISC-88 has release evidence for episode-scoped retrieval, while no broader ISC is marked complete without its own acceptance probe

## Verification

- Baseline repository probe: current checkout contains `web`, `cloudflare`, `video`, `agent`, 14 product modules in `PRD.md`, and a deployed 55-episode catalogue surface.
- Baseline source probe: workbook parsing found five sheets and 62 non-empty episode rows; raw links were inspected in memory and were not written into this artifact.
- Baseline kickoff probe: the 16-page PDF establishes phased analytics, dual-mode transcript, finance, CRM, WhatsApp, contract, calendar, infrastructure, and research-method requirements.
- Baseline UI probe: the live production home page preserves the committed palette and wordmark but presents a catalogue-first narrative rather than the internal one-brain workflow.
- Baseline component probe: the repository has no `web/components/ui` primitive layer, no Storybook surface, no repository-owned UI tests, 101 hard-coded hex usages, and no reduced-motion rule.
- Baseline governance probe: Temperance doctor reports planning present, ISA absent before this file, no active planner, and a rejected Manifest run because Git metadata is absent.
- ISC-1 evidence: `git rev-parse --show-toplevel` resolves the current `wtfmedia` repository root after history was rehydrated from the declared origin without checking out over user-owned files.
- ISC-2 evidence: local `main` points to fetched `origin/main` at `e109e70`, and `origin` is `https://github.com/Sheshiyer/wtfmedia.git`.
- ISC-3 and ISC-4 evidence: `temperance-project-init --cwd . --check --json` reports both `ISA.md` and `.planning` present.
- ISC-5 through ISC-8 evidence: `.temperance/project.json` declares `temperance.project.v1`, `active_planner: isa`, `has_isa: true`, and `has_planning: true`.
- ISC-9 evidence: `.temperance/goal.json` stores the complete 397-character `## Goal` text, planner `isa`, status `active`, and GSD command `plan-phase`.
- ISC-10 evidence: `.planning/PROJECT.md` names `v1.0 One Brain Re-foundation` as the current milestone and records the evidence-native operating-system goal.
- ISC-11 evidence: the requirements parser found 102 v1.0 requirement definitions and 102 unique stable IDs across all twelve accepted families after client-scope reconciliation.
- ISC-12 evidence: `.planning/ROADMAP.md` defines ten dependency-ordered phases; `.planning/REQUIREMENTS.md` maps all 102 IDs exactly once, with zero unmapped or duplicate entries and implementation authorization limited to repository Phases 1 and 2.
- Runtime evidence: the Manifest bridge health endpoint reports `ok: true`, service `temperance-manifest-bridge`, and freshness `fresh`; project doctor reports `high_gaps: 0`.
- Portability evidence: Git ignore probes match `.temperance/project.json`, `.temperance/manifest.json`, `.planning/NEXT-WAVE.json`, and `.planning/ORCHESTRATION.json`, keeping generated checkout and host paths out of commit-visible artifacts.
- Next-wave evidence: bootstrap state is complete, `temperance-next-wave --cwd . --json` returns `action: complete`, an empty task list, no executable option, and reports the 12 historical promo checkboxes as ignored rather than dispatchable.
- Independent audit evidence: the Cato-style remediation re-audit returned PASS after checking ignore rules, empty routing, exact 397-character goal equality, doctor health, privacy boundaries, and the ISA/GSD authority split; it changed no files.
- ISC-129 evidence: `DESIGN.md` identifies the committed contact sheet, control room, and flow diagram as the primary reference direction and bounds every secondary source to a narrow role.
- ISC-130 evidence: the design palette table assigns the committed cream, ink, red, green, yellow, purple, and blue values to explicit roles, while identifying orange as a comp-derived extension that remains subject to token, contrast, and design approval.
- ISC-131 evidence: the product architecture section defines separate `(public)` and `(ops)` Next.js route groups, preserves `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat`, and separates public and operator graph projections over shared evidence.
- ISC-132 evidence: the current-to-target migration table covers the existing layout and all nine reusable components plus the chat and connections surfaces, naming the retained behavior, target responsibility, and primary risk.
- ISC-133 evidence: the foundation section recommends selective Radix, TanStack Table, Phosphor, and Storybook Next/Vite, cites current primary documentation, and forbids installation before a GSD implementation phase owns the tests.
- ISC-134 evidence: a bounded scan of `DESIGN.md` found no supplied source filename, Downloads path, embedded drive/document link, secret assignment, or raw meeting passage.
- Design remediation audit evidence: the independent read-only re-audit returned PASS after verifying public URL and API continuity, canonical `/chat` ownership, policy-separated connection projections, provisional orange provenance, criteria integrity, privacy, and the owner-confirmation gate.
- ISC-135: roadmap parser — the GSD analyzer parsed the client delivery-track section and all ten phase sections without a missing phase detail.
- ISC-136: mapping assertion — the delivery-track row names repository Phases 2–4 as the complete Client Phase 1 execution span after the preserved proof harness.
- ISC-137: mapping assertion — the delivery-track row names repository Phases 5–9 as Client Phase 2 and the phase list names Phase 10 as migration closure.
- ISC-138: blocker schema — the roadmap contains thirteen owner-attributed input or decision rows with explicit blocked phases or launch boundaries.
- ISC-139: coverage script — the bounded Node probe returned 102 definitions, 102 unique definitions, 102 trace rows, 102 roadmap assignments, zero duplicates, zero missing IDs, and zero extras.
- ISC-140: Git hash comparison — `git diff --exit-code 0f80677 -- '.planning/phases/01-compatibility-component-proof-harness/01-*-PLAN.md'` exited zero with no changed plan path.
- Client-scope audit evidence: the independent read-only audit found no critical issue; after normalizing the PROJECT reference date and both STATE stop markers, a focused re-audit returned `VERDICT pass` with matching line evidence.
- ISC-12: static plan-contract probe — `passed: true`, `plans: 12`, `tasks: 24`, `requirements: 15/15`, `decisions: 26/26`, and `threat_definitions: 35/35`; `gsd-sdk query phase-plan-index 2` parsed eight ordered waves and confirmed Plan 02-12 is non-autonomous.
- ISC-141: generated ledger static probe — `npm run docs:architecture:check` is deterministic; the rendered artifact contains 24 sections and six inline SVG diagrams.
- ISC-142: boundary probe — the ledger decision and `web/scripts/verify-phase1.mjs` record public Phase 1 as independent of Cloudflare Zero Trust, Access Applications, policies, and D1 provisioning.
- ISC-143: lifecycle probe — `npm run docs:architecture:update` regenerates the HTML, services inventory, and dependency graph; `.github/workflows/architecture-ledger.yml` checks freshness across reviewed architecture code, configuration, tests, plans, documentation, and release metadata.
- ISC-144: anti-false-live probe — the ledger labels source/config/history/plans separately, excludes untracked operator drafts from its fingerprint, and contains the current Access, OAuth, calendar, hosted MCP, and OTA holds.
- Architecture audit and rendering evidence: independent read-only audit found and corrected untracked-source, evidence-coverage, duplicate-SVG-ID, and responsive-overflow defects; final static rendering confirmed no desktop or 390px root overflow, six contained diagrams, an accessible release-matrix scroller, offline rendering, and no external assets.
- ISC-145 evidence: Wrangler auth lists three named profiles; `wtfmedia` is bound to this repository, while explicit account readbacks distinguish source, target, and control account roles without recording account identifiers in project artifacts.
- ISC-146 evidence: the `default` sweep enumerated Workers, Pages, R2, KV, D1, Vectorize, queues, Durable Objects, Workflows, Hyperdrives, custom domains, zones, and adjacent services, with zero WTF match in names or exposed bindings.
- ISC-147 evidence: source settings and deployment-history reads succeeded for both `wtfmedia-web` and `wtfmedia-edge`; edge health alone is no longer used as the administration claim.
- ISC-148 evidence: the first Wrangler R2 page omitted the WTF bucket; a cursor-capable list returned 25 total buckets and direct bucket info reconciled `wtfmedia-catalogue` at 99 objects and 13.2 MB.
- ISC-149 evidence: a metadata-only source KV list returned 55 keys, all persistent and sharing the safe aggregate prefix `ingest`; no value was requested or recorded.
- ISC-150 evidence: fresh source reads report `wtfmedia-catalogue-v1` at 5,742 vectors, 1,024 dimensions, cosine, and record the ingest queue's producer/consumer, batch, retry, wait, concurrency, delay, and DLQ contract.
- ISC-151 evidence: target zone read confirms `wtfhq.in` active; target service lists contain no WTF resources; R2 returns code `10042`; DNS-record API read returns permission denied; public DNS has no apex or `www` address answer.
- ISC-152 evidence: the migration inventory's CREATE/COPY/UPDATE/HOLD matrix identifies Pages, Access/RBAC, NVIDIA activation, source deletion, and all `default` resources as held or out of scope.
- ISC-153 evidence: every Cloudflare operation in the pass was an auth, list, info, settings, deployment-history, health, or public-DNS read. No create, put, deploy, secret write, copy, route/domain update, or delete command was issued.
- ISC-154 evidence: the ordered migration contract separates an initial bulk R2/KV/Vectorize baseline from an owner-authorized source pause, queue settlement, recorded high-water state, final data delta, and abort/restore rule before domain attachment.
- ISC-155 evidence: direct HTTP reads returned 200 for the source web Worker emergency URL and edge health. The rollback contract names the web URL, restores quiesced source settings, removes the target Custom Domain to recover the pre-cutover no-apex state, and blocks cutover unless that outage model is accepted or a same-host route is rehearsed.
- Episode-scoped production receipt (2026-08-31): final web version `90099f42-13b6-4a4e-8d97-bd93b9f953fa` and edge version `75b96e1f-6fa6-4182-bbdd-99047399de64` passed live home, episodes, mapped-detail, and mapped `published`/`uncut`/`both` chat probes. KV membership was 55/55 published plus 49/49 mapped uncut; Vectorize reported 11,948 vectors with `source_mode` and `video_id` indexes; queue backlog was 0 and DLQ returned to baseline 18. The first web bundle's HTTP 500 was rolled back, the corrected preview passed, and no auth, DNS, secret, or unrelated UI boundary changed.
- Episode-scope contract proof: focused Cloudflare source-mode tests pass for public YouTube ID validation, pre-`topK` `video_id` filtering, stale-match rejection, unmapped-episode truthfulness, mixed-source citation identity, and the rule that uncut citations never inherit YouTube timestamps. Trusted cross-timeline alignment and synchronized playback remain unverified by design.
- Named-guest relevance proof (local, not deployed): the focused Worker contract anchors `Sunil Shetty` to the `Suniel Shetty` episode title, preserves generic semantic ordering, retains multiple matching chunks, and returns no candidates when an explicit name has no evidence anchor.
- Source-panel filtering proof (local, not deployed): the focused web unit and Playwright journey cover `published`, `uncut`, and `both` projections, count/list updates, restoration, and zero cross-mode leakage.

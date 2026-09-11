---
project: wtfmedia
task: "Re-found WTF Media as an evidence-native podcast operating system"
effort: deep
effort_source: classifier
phase: verify
progress: 120/286
mode: interactive
started: 2026-08-18T11:39:10Z
updated: 2026-09-11T19:17:05+05:30
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

### Member Beta conversation workspace

- [x] ISC-167: An active member can append a question and source mode to an owned active conversation (probe: Edge integration test).
- [x] ISC-168: Retrying a member continuation with the same idempotency key stores exactly one user turn and one assistant turn (probe: SQLite integration test).
- [x] ISC-169: Reusing a continuation idempotency key with a different payload fails closed (probe: Edge integration test).
- [x] ISC-170: Unknown, archived, and cross-member conversation identifiers return the same non-enumerating denial (probe: router matrix test).
- [x] ISC-171: Conversation continuation supplies bounded prior turns as context without treating them as transcript evidence (probe: answer-runner contract test).
- [x] ISC-172: Member conversation pagination returns at most 25 active owner-scoped rows per page (probe: SQLite integration test).
- [x] ISC-173: Member conversation pagination returns an opaque cursor only when another owned row exists (probe: SQLite integration test).
- [x] ISC-174: Equal-timestamp conversation rows paginate deterministically without duplicates (probe: SQLite integration test).
- [x] ISC-175: `/beta/chat/[conversationId]` is the canonical selected-conversation route across reload and navigation (probe: route contract and authenticated browser test).
- [x] ISC-176: Switching routes cannot attach a late answer to a different conversation (probe: out-of-order response unit test).
- [x] ISC-177: Member chat, conversation loading, archiving, pagination, and memory writes use independent request states (probe: component unit test).
- [x] ISC-178: The member navigation registry exposes Ask WTF and Settings but no operator route (probe: registry unit test).
- [x] ISC-179: The member disclosure groups Beta workspace destinations separately from explicit Public Alpha exits (probe: shell unit test).
- [x] ISC-180: A signed-in member sees a safe client-side display-name greeting or the neutral fallback (probe: component unit test).
- [x] ISC-181: Member-facing workspace copy contains no Clerk, D1, subject, role, issuer, RBAC, or member identifier language (probe: bounded source scan).
- [x] ISC-182: `/beta/settings` provides member-only account, memory, sessions, and appearance destinations (probe: route contract test).
- [x] ISC-183: Member Settings contains no release, access, users, provider, analytics, source-health, audit, or roster controls (probe: registry unit test).
- [x] ISC-184: Preference import parses pasted text locally into editable candidate notes (probe: parser unit test).
- [x] ISC-185: Preference candidates are never persisted until the member explicitly saves each selected item (probe: component request-spy test).
- [x] ISC-186: Member memory retains the existing 2,000-character bound and archive-only lifecycle (probe: Edge integration test).
- [DEFERRED-VERIFY] ISC-187: The mobile conversation drawer closes on Escape and restores focus while the desktop rail remains persistent (probe: authenticated browser accessibility test; follow-up `WTF-BETA-UX-01`).
- [DEFERRED-VERIFY] ISC-188: The sticky composer, session navigation, and bottom pill do not overlap at 320px width or 710px height (probe: authenticated browser viewport test; follow-up `WTF-BETA-UX-01`).
- [x] ISC-189: Anti: member routes and registries expose no `/beta/ops` navigation or operator-only affordance (probe: route and source scan).
- [x] ISC-190: Anti: this slice performs no production, DNS, Clerk, D1, or migration mutation; any staging deployment uses the named profile, reviewed commit, and recorded version receipt (probe: Git diff and command ledger review).
- [DEFERRED-VERIFY] ISC-191: One active super-admin and two ordinary members pass staging routing, persistence, reauthentication, and cross-member isolation (probe: authenticated staging matrix and metadata-only D1 readback; follow-up `WTF-BETA-LIVE-01`).
- [x] ISC-192: Anti: the temporary browser-only `/beta/preview` fixture is absent, returns `404`, and cannot be used as a member experience or acceptance fallback (probe: source guard, clean build route table, and HTTP checks).
- [DEFERRED-VERIFY] ISC-193: Authenticated Member Beta extends Public Alpha's actual WTF OS implementation without replacing its wordmark, presentation primitives, interaction model, or navigation grammar (probe: branch/symbol ledger plus side-by-side authenticated IAB review; excluded from the Beta 0.1 exit decision; follow-up `WTF-BETA-FULL-ALIGNMENT-01`).
- [x] ISC-194: The ordinary-member empty Ask surface directly reuses Public Alpha's `ConversationEmptyState` rather than a welcome dashboard or feature-summary grid (probe: component source contract).
- [ ] ISC-195: The ordinary-member Ask input reuses the accepted Alpha `AskComposer` behavior, including unpositioned capsule composition and overflow-aware parent placement (probe: historical source map, component contract, and browser test).
- [x] ISC-196: Member Settings adds no second global header, Ask link, private-workspace strip, utility rail, or bottom pill beneath the shared shell (probe: layout source contract).
- [x] ISC-197: The ordinary-member sign-in/recovery frame uses the Alpha cream/ink evidence-card composition while the dark operator gateway remains operator-only (probe: audience branch and render contract).
- [x] ISC-198: The owner-approved anti-drift contract is identical in the handoff, GSD state, Phase 2 member UI addendum, ISA, and durable memory note (probe: bounded document comparison).
- [x] ISC-199: Member Beta uses the live production Alpha compact composer capsule with one line and one Ask WTF button, without the expanded source-mode/type rail or full-width panel band (probe: source contract plus authenticated 1382x887 IAB comparison).
- [x] ISC-200: Desktop session navigation uses zero-min-width tracks, two-line long-word clamping, and bounded scrolling without intruding into the evidence card or composer (probe: source contract plus authenticated 1382x887 IAB comparison).
- [ ] ISC-201: Superseded acceptance language; the two-button icon-labelled Ask WTF/Settings pill is rejected and replaced by ISC-222 (probe: 2026-09-11 owner annotation).

### Alpha-aligned chat inference and retrieval refinement

- [x] ISC-202: Public Alpha and authenticated Beta execute the same reviewed retrieval and answer runner while retaining separate transport and authorization routes (probe: Edge source contract test).
- [x] ISC-203: Episode-scoped retrieval can retain at least two relevant chunks from the requested episode instead of deduplicating the episode to one source (probe: answer-runner unit test).
- [x] ISC-204: A pronoun follow-up inherits a named-person anchor from the most recent user question when the current question names nobody (probe: answer-runner unit test).
- [x] ISC-205: A current question naming a different person supersedes any named-person anchor in prior conversation context (probe: answer-runner unit test).
- [x] ISC-206: Retrieval candidates without non-empty transcript text are excluded before the evidence-count and synthesis gates (probe: answer-runner unit test).
- [x] ISC-207: Every accepted synthesized factual sentence contains only in-range citation markers; otherwise the runner returns cited excerpts (probe: citation-validator unit test).
- [x] ISC-208: Citation numbers remain stable when the source panel filters a mixed response to published or uncut sources (probe: web source-panel unit contract).
- [x] ISC-209: Persisted member citations are normalized through the same public-safe projection used by Alpha and malformed metadata fails closed (probe: member parser unit test).
- [x] ISC-210: Persisted member messages retain truthful grounding and uncut-availability state without exposing model, request, idempotency, or infrastructure identifiers (probe: member parser and source scan tests).
- [x] ISC-211: A member conversation load failure exposes an explicit retry action that can recover the selected route without creating a new turn (probe: component source and browser test).
- [x] ISC-212: Sending a member question exposes the Alpha loading phrase in the conversation log and prevents a duplicate submit (probe: component unit/browser test).
- [x] ISC-213: A persisted ungrounded member answer renders the Alpha abstention label from stored grounding state rather than text heuristics (probe: member render contract).
- [ ] ISC-214: Long member threads own a bounded scroll region and do not force a reader who scrolled upward back to the newest answer (probe: component/browser scroll test).
- [ ] ISC-215: Expanded source details and the final message remain reachable above the compact composer and member navigation pill (probe: 320x710, 768px, and 1382x887 browser viewports).
- [x] ISC-216: Wrangler configuration keeps production web bound only to production edge and staging web bound only to staging edge and staging data resources (probe: config contract test).
- [x] ISC-217: Beta’s buffered JSON answer transport is named and tested; no UI claims token streaming before a separately reviewed persistence-safe streaming contract exists (probe: Edge and web contract assertions).
- [x] ISC-218: Anti: this refinement performs no production deployment, corpus copy, ingest, binding mutation, secret change, D1 mutation, or Public Alpha cutover (probe: Git diff and command ledger review).

### Alpha-bedrock / Beta modular convergence

- [x] ISC-219: A committed branch-and-symbol ledger maps `origin/release/alpha`, `origin/rag/alpha-answer-accuracy`, `origin/release/beta`, and checkpoint `3e4c887` without treating any branch name or deployment receipt as automatic adoption authority (probe: Git ancestry and path ledger).
- [x] ISC-220: Every later Alpha Ask WTF capability is classified bedrock, adapt, defer, or reject before code integration (probe: capability ledger completeness check).
- [DEFERRED-VERIFY] ISC-221: Public Alpha and Member Beta render one shared conversation/composer/source presentation primitive; member persistence is supplied through a typed adapter rather than a forked thread implementation (probe: import graph and component contract; excluded from the Beta 0.1 exit decision; follow-up `WTF-BETA-FULL-ALIGNMENT-01`).
- [ ] ISC-222: Member Ask routes preserve the live Alpha `/chat` frame: no bottom navigation dock, the top-right hamburger retains Ask WTF/Episodes/Connections/theme, and one member Settings gear is added inside that disclosure; the rejected two-button Ask WTF/Settings pill is absent (probe: navigation source and authenticated IAB comparison).
- [ ] ISC-223: Loading, unavailable, retry, empty, answer, and long-history states occupy one bounded selected-conversation viewport without a large dead canvas (probe: component and 1382x1180 browser tests).
- [ ] ISC-224: Session-card titles clamp and wrap inside the bounded rail while the active conversation heading remains readable without truncation (probe: component and browser layout tests).
- [ ] ISC-225: A selected session exposes a direct Archive action that retains storage and never acts as navigation to the Sessions settings page (probe: member action and API tests).
- [ ] ISC-226: Permanent Delete is separately labelled and opens a focus-managed confirmation dialog that states the selected conversation and messages cannot be restored (probe: component accessibility/browser tests).
- [ ] ISC-227: Permanent Delete is owner-scoped, race-safe, audited without private content, and removes the conversation, messages, and internal context checkpoints without resurrection from continuation retries or replayed original create idempotency keys (probe: D1/router concurrency tests).
- [ ] ISC-228: Deleting a member conversation never deletes or mutates transcript corpus objects, vectors, ingest receipts, queues, or unrelated saved preferences (probe: binding spies, D1 fixtures, and command ledger).
- [ ] ISC-229: Any explicit saved preference linked through the current immutable `ON DELETE RESTRICT` source-conversation reference is disclosed separately and uses a reviewed detach/tombstone design; deleting that memory remains a separate explicit choice (probe: schema/API/UI tests).
- [ ] ISC-230: Selected-conversation messages use stable keyset pagination and bounded response size while preserving chronological display and reader scroll position (probe: D1 and browser long-history tests).
- [DEFERRED-VERIFY] ISC-231: Versioned owner-scoped context checkpoints preserve evaluated older-turn continuity beyond the recent eight-turn/8,000-character window (probe: long-session context evaluation; excluded from the Beta 0.1 exit decision; follow-up `WTF-BETA-LONG-CONTEXT-01`).
- [DEFERRED-VERIFY] ISC-232: Context checkpoints are labelled untrusted conversational context, never cited as transcript evidence, and never become explicit saved memory without a member save action (probe: prompt inspection and negative evidence tests; follow-up `WTF-BETA-LONG-CONTEXT-01`).
- [DEFERRED-VERIFY] ISC-233: Compaction failure falls back to recent bounded turns without blocking the conversation or reporting false full-session continuity (probe: failure-injection tests; follow-up `WTF-BETA-LONG-CONTEXT-01`).
- [ ] ISC-234: Member answer transport remains explicitly buffered JSON until a separately reviewed streaming contract proves partial persistence, cancellation, idempotency, and retry (probe: transport contract).
- [ ] ISC-235: An editor's live navigation, screens, actions, and server capabilities contain no admin or super-admin authority (probe: deterministic policy and authenticated staging UI/API matrix).
- [ ] ISC-236: An admin's live navigation, screens, actions, and server capabilities match the admin policy and exclude super-admin-only transfer/release authority (probe: authenticated staging UI/API matrix).
- [ ] ISC-237: A super-admin entering `/beta` routes to `/beta/workspace` without member-row creation, can open the shared `/beta/chat` role-safe history view, and receives the complete super-admin-only screen/action set while preserving the one-seat invariant (probe: authenticated staging UI/API plus metadata-only D1 readback).
- [DEFERRED-VERIFY] ISC-238: Signed-out, Member A, Member B, editor, admin, super-admin, and suspended/revoked personas pass the complete staging route/screen/action/isolation matrix for the exact committed Beta candidate (probe: owner-authorized authenticated IAB matrix plus metadata-only D1 readback; follow-up `WTF-BETA-CONVERGENCE-LIVE-01`).
- [DEFERRED-VERIFY] ISC-239: The converged member chat passes authenticated 1382x887, 1382x1180, and 320x710 layout, focus, drawer, composer, source-sheet, and long-thread acceptance for the exact committed Beta candidate (probe: owner-authorized authenticated IAB; follow-up `WTF-BETA-CONVERGENCE-UX-01`).
- [x] ISC-240: Anti: this planning and source-checkpoint pass performs no deployment, remote data mutation, corpus copy, queue work, secret or Clerk change, DNS change, or production cutover (probe: Git diff and command ledger).

### Beta single-shell RBAC convergence

- [x] ISC-241: `/beta` resolves one edge-authoritative principal projection, with any operator record preceding member admission and an inactive operator denied without member binding (probe: edge principal-context and lifecycle tests).
- [x] ISC-242: The shared authenticated `/beta/chat`, operator control-room, Settings, and administration routes are all classified by the edge policy; unknown Beta routes and `public_link` fallbacks deny (probe: edge policy matrix).
- [x] ISC-243: Every protected browser navigation destination imports or resolves against the edge policy, and no role-visible navigation target is denied by that authority (probe: browser-navigation policy contract).
- [x] ISC-244: `/beta/ops/*` is redirect compatibility only while `/ops/*` and public `/chat` remain distinct Alpha surfaces (probe: middleware, route, and public-route contracts).
- [x] ISC-245: Nested Settings navigation is capability-projected for member, operator, admin, and super-admin personas and each destination independently rechecks its edge authorization (probe: route and policy contracts).
- [x] ISC-246: Member and operator conversation stores remain separately owner-scoped; browser routes expose only prefixed conversation UUIDs and never project Clerk subjects, user hashes, or D1 owner identifiers (probe: DTO, route, and privacy tests).
- [x] ISC-247: Session cards expose Archive and separately confirmed permanent Delete; local lifecycle contracts preserve saved preferences and prevent idempotency-key resurrection (probe: Edge lifecycle and browser unit tests).
- [x] ISC-248: AI Route and YouTube Analytics are labelled non-persisted local previews and cannot configure provider, inference, or analytics state (probe: Settings source and contract tests).
- [x] ISC-249: The single-shell source checkpoint passes Cloudflare 267/267, web unit 162/162, web contracts 92/92, typecheck, lint, production build, architecture check, and privacy scan with zero violations (probe: recorded local command receipts).
- [DEFERRED-VERIFY] ISC-250: An owner-authorized staging deployment/migration of one exact committed Beta candidate and a real Clerk/D1 Codex IAB persona matrix prove principal landing, route/screen/action isolation, and desktop/mobile acceptance before Beta is accepted (probe: staging receipt plus authenticated IAB matrix and Beta 0.1 checklist).
- [x] ISC-251: Anti: the single-shell source checkpoint makes no production deployment, provider configuration, Clerk mutation, D1 migration, corpus mutation, or DNS change (probe: Git diff and command ledger).

### Beta 0.1 Cloudflare placement and PR gate

- [ ] ISC-252: [DROPPED — pre-merge branch-target claim superseded by the locally verifiable `d3b4590` integration; see Decision 2026-09-11 and ISC-262.]
- [x] ISC-253: Production and staging web, edge, D1, R2, Vectorize, KV, ingest queue, and DLQ names are mapped without recording account, database, namespace, queue, deployment, or secret identifiers (probe: sanitized source/live inventory).
- [x] ISC-254: Web `ASSETS`, Cloudflare Images, catalogue R2 objects, D1 authority, derived Vectorize/KV state, and queue transport have distinct documented ownership (probe: source binding and consumer map).
- [x] ISC-255: Published, uncut, manifest, and structured `episodes/...` R2 key families are mapped without claiming timeline alignment or renaming live objects (probe: asset-key source contracts).
- [x] ISC-256: Current deployed Worker existence, binding metadata, live reachability, candidate deployment, and custom-domain traffic attribution are reported as separate evidence layers (probe: named-profile read-only inventory plus source comparison).
- [ ] ISC-257: [DROPPED — time-bound unapplied-migration snapshot superseded by a later user report that lacks host-visible environment receipts; see Decision 2026-09-11 and ISC-265.]
- [x] ISC-258: The staging order is backup/recovery inventory, migrations and post-apply readback, edge deploy/health/bindings, web deploy/service binding, then real Clerk/D1 IAB acceptance (probe: promotion map and Beta 0.1 checklist review).
- [x] ISC-259: A production promotion requires a fresh owner authorization, current version/traffic/domain/rollback receipts, production migration review, edge-first deployment, and post-deploy smokes (probe: promotion map review).
- [x] ISC-260: Open conflicting PRs #57 and #59 are treated as superseded inputs rather than stacked or automatically closed (probe: GitHub PR metadata and PR body).
- [ ] ISC-261: [DROPPED — pre-merge no-mutation criterion ended when the local source merge occurred; staging and production mutation holds are now governed by ISC-266 through ISC-278.]
- [x] ISC-262: This host verifies the local Beta integration as `d3b4590` with parents `d4e45b4` and `7ec8298`, while the user-reported `3eebf57` object is unavailable here; neither SHA is called deployed (probe: `git show --pretty=raw d3b4590` and `git cat-file -t 3eebf57`).
- [x] ISC-263: Runtime/UI closure `79a0285` and release/migration guardrails `b7f5bec` are bounded commits contained with `d3b4590` by exact source candidate `2c4007d378148da19f09004e97cfc2aff273267e` (probe: Git ancestry, commit diffs, migration/workflow tests, and clean status).
- [x] ISC-264: Edge 376/376, web unit 188/188, web contracts 96/96, TypeScript, lint, and architecture results are recorded only as local source/build evidence and require a rerun at the exact candidate after ISC-263 (probe: release checklist evidence table).
- [x] ISC-265: User-reported later local runtime behavior and remote D1 migrations/releases are recorded as `REPORTED` without satisfying any staging or production acceptance row (probe: release checklist evidence classification).
- [DEFERRED-VERIFY] ISC-266: Staging has a pre-migration backup/recovery and migration-inventory receipt plus a post-apply migration/readiness receipt for the exact candidate (probe: owner-authorized staging command receipts; follow-up `WTF-BETA-STAGING-01`).
- [DEFERRED-VERIFY] ISC-267: Staging Edge and web deployments identify the exact candidate versions, non-secret Clerk/D1 binding presence, `ASSETS`, and only the paired staging service binding (probe: staging deployment/config receipts; follow-up `WTF-BETA-STAGING-01`).
- [DEFERRED-VERIFY] ISC-268: Real Clerk/D1 staging IAB acceptance proves signed-out, Member A, Member B, editor, admin, super-admin, and suspended/revoked route, screen, action, direct-URL, and isolation behavior (probe: authenticated IAB matrix and metadata-only D1 readback; follow-up `WTF-BETA-STAGING-02`).
- [DEFERRED-VERIFY] ISC-269: Real Clerk/D1 staging IAB acceptance at 1382x887, 1382x1180, and 320x710 proves no protected-content flash and usable drawer, focus, composer, source, title, and session-action behavior (probe: authenticated IAB captures; follow-up `WTF-BETA-STAGING-03`).
- [DEFERRED-VERIFY] ISC-270: A fresh owner authorization names the accepted staging evidence, exact candidate SHA, production target/window, and rollback owner before production action (probe: owner authorization receipt; follow-up `WTF-BETA-PRODUCTION-01`).
- [DEFERRED-VERIFY] ISC-271: Production Clerk configuration is receipted for the intended project, issuer/JWKS/authorized-party, and redirect/domain policy without recording secrets or session material (probe: production configuration receipt; follow-up `WTF-BETA-PRODUCTION-02`).
- [DEFERRED-VERIFY] ISC-272: Production D1 has a pre-migration backup/recovery and migration-inventory receipt for the exact candidate (probe: owner-authorized production receipt; follow-up `WTF-BETA-PRODUCTION-03`).
- [DEFERRED-VERIFY] ISC-273: Production D1 migrations for the exact candidate have a reviewed apply and post-apply readiness receipt distinct from staging (probe: production migration receipts; follow-up `WTF-BETA-PRODUCTION-04`).
- [DEFERRED-VERIFY] ISC-274: Production Edge identifies the exact candidate version, health, and non-secret binding presence before web traffic changes (probe: production deployment/health receipt; follow-up `WTF-BETA-PRODUCTION-05`).
- [DEFERRED-VERIFY] ISC-275: Production web identifies the exact candidate version, `ASSETS`, and only the paired production Edge service binding (probe: production deployment/config receipt; follow-up `WTF-BETA-PRODUCTION-06`).
- [DEFERRED-VERIFY] ISC-276: Custom-domain and traffic evidence attributes the production smoke to the exact web revision rather than reachability alone (probe: production traffic/domain receipt; follow-up `WTF-BETA-PRODUCTION-07`).
- [DEFERRED-VERIFY] ISC-277: The approved production rollback identifies prior web/edge versions, D1 recovery decision, domain/traffic recovery, and post-rollback read-only smoke (probe: rollback receipt; follow-up `WTF-BETA-PRODUCTION-08`).
- [DEFERRED-VERIFY] ISC-278: AI Route and YouTube Analytics remain non-persisted local previews until separately approved provider persistence, source access, data contracts, and lifecycle receipts exist (probe: source scan and Beta 0.1 checklist; follow-up `WTF-BETA-PROVIDER-01`).
- [DEFERRED-VERIFY] ISC-279: Scheduled provider/YouTube refresh, reporting, and other jobs remain outside Beta 0.1 until their approved schedule, failure handling, source access, and operational receipts exist (probe: release checklist and job inventory; follow-up `WTF-BETA-SCHEDULED-JOBS-01`).
- [DEFERRED-VERIFY] ISC-280: Automatic long-context compaction, durable full-session continuity, and context-checkpoint recovery remain unclaimed until ISC-231 through ISC-233 pass (probe: cross-reference scan; follow-up `WTF-BETA-LONG-CONTEXT-01`).
- [DEFERRED-VERIFY] ISC-281: Beta 0.1 does not certify a wholesale Alpha merge, complete visual/interaction parity, or adoption of every later Alpha capability beyond its explicit accepted route and viewport matrix (probe: release checklist and branch ledger; follow-up `WTF-BETA-FULL-ALIGNMENT-01`).
- [DEFERRED-VERIFY] ISC-282: A Beta acceptance claim may not upgrade `VERIFIED-SOURCE` or `REPORTED` evidence to staging or production acceptance without the matching exact-revision receipt (probe: checklist/handoff terminology scan; follow-up `WTF-BETA-EVIDENCE-01`).
- [ ] ISC-283: The owner reconciles the existing remote `v0.3.3-beta.2` tag at `66f434a` with its source-only release note before any `v0.3.3-beta.3` publication; the historical tag is not deleted, moved, reused, or silently reinterpreted (probe: remote tag inventory plus recorded release decision).
- [x] ISC-284: Exact source candidate `2c4007d` passes Edge 379/379, web unit 190/190, web contracts 96/96, TypeScript, lint, production build, privacy with zero violations across 394 files, architecture freshness across 616 inputs, and `git diff --check` (probe: local command receipt at the exact candidate).
- [ ] ISC-285: The owner selects a remote delivery topology before any push because PR #77 remains open from `beta_0.1` into `release/beta`, PR #48 already uses `rag/alpha-answer-accuracy` into `main`, and pushing the local branch would materially repurpose PR #48 (probe: current GitHub PR inventory plus explicit owner decision).
- [x] ISC-286: Surface-specific integration precedence is explicit and tested: current convergence work governs UI, Beta/Ops routing, Clerk/auth landing/return, navigation pill, RBAC, admin, and Settings without old-UI reversion; Pavun57 PR #48/#49 intent governs chat, inference, retrieval/accuracy, and backend chat behavior (probe: precedence map, Git ancestry, focused source contract, and exact-candidate suite).

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
| ISC-167..201 | member Beta workspace | owned continuation, pagination, route state, Settings, explicit memory review, responsive behavior, fixture retirement, live-Alpha composer continuity, clamped session layout, anti-drift state, and authority boundaries | all deterministic local probes pass; live personas separately deferred | Edge SQLite tests + web unit/contracts + authenticated IAB accessibility |
| ISC-202..218 | Alpha-aligned chat refinement | shared inference, multi-turn retrieval, evidence validation, stable citations, truthful member states, resilient thread interaction, and environment isolation | all deterministic probes pass; deployed staging UI remains separately receipted | Edge unit/integration + web unit/contracts + authenticated IAB |
| ISC-219..240 | Alpha-bedrock / Beta modular convergence | branch/symbol admission, shared Alpha presentation, true navigation continuity, selected-session archive/delete, long-session pagination/compaction, role-specific screens, and no remote mutation | all local contracts pass; live personas and viewports separately deferred | Git ledger + Edge/D1 tests + web contracts + authenticated IAB matrix |
| ISC-241..251 | Beta single-shell RBAC convergence | edge principal precedence, canonical routes, policy-derived navigation, scoped Settings, private DTOs, lifecycle, preview holds, and source-only release boundary | all local policy/navigation/privacy contracts pass; staging IAB remains required | Edge tests + web unit/contracts + build/privacy + authenticated IAB matrix |
| ISC-252..286 | Beta 0.1 release evidence and promotion gate | immutable local merge identity, exact-candidate source closure, surface-specific author precedence, remote delivery topology, staging/production receipts, and explicit non-goals | source evidence stays source-only; every remote/staging/production action needs its matching authority and receipt | Git + precedence/checklist review + owner-authorized GitHub/Cloudflare/Clerk/D1/IAB receipts |

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

- name: MemberBetaConversationWorkspace
  description: Owner-scoped conversational continuation, route-backed history, member Settings, explicit preference review, and responsive member navigation
  satisfies: [ISC-167, ISC-168, ISC-169, ISC-170, ISC-171, ISC-172, ISC-173, ISC-174, ISC-175, ISC-176, ISC-177, ISC-178, ISC-179, ISC-180, ISC-181, ISC-182, ISC-183, ISC-184, ISC-185, ISC-186, ISC-187, ISC-188, ISC-189, ISC-190, ISC-191, ISC-192, ISC-193, ISC-194, ISC-195, ISC-196, ISC-197, ISC-198, ISC-199, ISC-200, ISC-201]
  depends_on: [ProjectGovernanceSpine, BrandTokenFoundation, EvidenceNativeKnowledge, QualityAndSafetyGates]
  parallelizable: true

- name: AlphaAlignedChatRefinement
  description: One evidence-safe retrieval and answer core shared by Alpha and Beta, with persisted-thread truthfulness and strict environment isolation
  satisfies: [ISC-202, ISC-203, ISC-204, ISC-205, ISC-206, ISC-207, ISC-208, ISC-209, ISC-210, ISC-211, ISC-212, ISC-213, ISC-214, ISC-215, ISC-216, ISC-217, ISC-218]
  depends_on: [SourceModeCitationFilter, MemberBetaConversationWorkspace, CloudflareEstateMigrationBoundary]
  parallelizable: true

- name: AlphaBedrockBetaModularConvergence
  description: The exact Alpha Ask WTF implementation becomes the shared product bedrock while private lifecycle, long-context, Settings, and RBAC remain modular Beta additions
  satisfies: [ISC-219, ISC-220, ISC-221, ISC-222, ISC-223, ISC-224, ISC-225, ISC-226, ISC-227, ISC-228, ISC-229, ISC-230, ISC-231, ISC-232, ISC-233, ISC-234, ISC-235, ISC-236, ISC-237, ISC-238, ISC-239, ISC-240, ISC-241, ISC-242, ISC-243, ISC-244, ISC-245, ISC-246, ISC-247, ISC-248, ISC-249, ISC-250, ISC-251]
  depends_on: [AlphaAlignedChatRefinement, MemberBetaConversationWorkspace, CloudflareEstateMigrationBoundary]
  parallelizable: false

- name: Beta01CloudflarePromotionGate
  description: Exact-source integration, evidence classification, environment boundaries, staged promotion gates, and explicit Beta 0.1 deferrals
  satisfies: [ISC-252, ISC-253, ISC-254, ISC-255, ISC-256, ISC-257, ISC-258, ISC-259, ISC-260, ISC-261, ISC-262, ISC-263, ISC-264, ISC-265, ISC-266, ISC-267, ISC-268, ISC-269, ISC-270, ISC-271, ISC-272, ISC-273, ISC-274, ISC-275, ISC-276, ISC-277, ISC-278, ISC-279, ISC-280, ISC-281, ISC-282, ISC-283, ISC-284, ISC-285, ISC-286]
  depends_on: [AlphaBedrockBetaModularConvergence, CloudflareEstateMigrationBoundary, QualityAndSafetyGates]
  parallelizable: false
```

## Architecture

<!-- arch-assets:start -->

_Auto-maintained by `ArchitectureAssetsSync.hook.ts` on release events._  
_Last refreshed: 2026-09-09T09:09:45.629Z_

| Asset | Status | How it's generated |
|---|---|---|
| [`docs/architecture/SERVICES.md`](docs/architecture/SERVICES.md) | ✓ current | auto (file scan) |
| [`docs/architecture/DEPENDENCY-GRAPH.md`](docs/architecture/DEPENDENCY-GRAPH.md) | ✓ current | auto (file scan) |
| [`docs/architecture/architecture.html`](docs/architecture/architecture.html) | ⚠ STALE — run `/refresh-architecture` | manual (LLM skill) |
| [`docs/architecture/notebooklm-prompt.md`](docs/architecture/notebooklm-prompt.md) | ✗ not yet generated | manual (LLM skill) |

**To refresh LLM-generated assets:** invoke `/refresh-architecture` in any Claude Code session.

<!-- arch-assets:end -->

## Decisions

- 2026-09-11 19:17 IST: refined: PR #77/Beta 0.1 is tracked as a separately gated release lane. This host verifies local merge `d3b4590` with parents `d4e45b4` and `7ec8298`; reported `3eebf57` is unavailable locally. The pre-merge branch, no-mutation, and pending-migration snapshots are tombstoned rather than silently rewritten. Later runtime and D1 statements are `REPORTED` until exact staging or production receipts exist.
- 2026-09-11 19:17 IST: refined: Beta promotion now requires an exact post-merge-fix candidate, source rerun, backup/migration/binding/deployment receipts, real Clerk/D1 IAB persona/viewports, and distinct production Clerk, D1, domain/traffic, smoke, and rollback gates. Provider/YouTube persistence, scheduled jobs, long-context compaction, and full Alpha alignment remain explicit deferred work.
- 2026-09-11 19:42 IST: the unused source candidate version is `0.3.3-beta.3`. Remote `v0.3.3-beta.2` already exists at `66f434a` although its release note calls it source-only and not a tag; ISC-283 blocks publication until that history is explicitly reconciled without moving or deleting the tag.
- 2026-09-11 19:48 IST: exact source candidate `2c4007d` contains merge `d3b4590`, runtime/UI closure `79a0285`, release/migration guards `b7f5bec`, and the planning/architecture ledger. Source gates BETA-REL-01 through BETA-REL-04 are complete; tag reconciliation and all live staging/production gates remain open.
- 2026-09-11 19:52 IST: GitHub reports PR #77 still open into `release/beta`, while `rag/alpha-answer-accuracy` remains the head of PR #48 into `main`. The 42-commit local advance is not pushed because doing so would materially change PR #48; ISC-285 and BETA-REL-04B require an explicit owner topology decision.
- 2026-09-11 19:58 IST: refined: precedence is surface-specific. Current convergence work wins for UI, canonical Beta/Ops routes, Clerk/auth landing and return, nav pill, RBAC, admin, and Settings. Pavun57 PR #48/#49 intent wins for chat, inference, retrieval/accuracy, and backend chat behavior. Shared files are resolved by symbol; no wholesale old-UI restoration is allowed.
- 2026-09-11 15:49 IST: owner authorized a clean `beta_0.1` source branch and PR into `release/beta`, plus a read-only Cloudflare asset/topology audit before any production work. The branch label is not a semantic version or tag. Staging reports migrations 0012-0015 pending and production reports 0011-0015 pending; no migration, deploy, traffic, secret, DNS, Clerk, queue, ingest, corpus, merge, or production mutation is part of this checkpoint.

- 2026-09-11 03:49 IST: refined: execution resumes from the committed Alpha-bedrock handoff. The current live IAB reproduction shows a selected member route with an unavailable banner, a separate header archive control, and the incorrect member navigation disclosure. Display-down correction starts with shared Alpha shell/composer behavior; private mutation contracts remain owner-scoped behind the existing Beta API.
- 2026-09-11 04:02 IST: verified locally: the convergence slice is committed in four bounded source commits. It restores the shared Alpha frame without a member bottom dock, adds direct Archive plus confirmed owner-scoped Delete, preserves separately saved preferences through minimal provenance tombstones, blocks replay resurrection, and records a retrieval-capability ledger. Long-session paging/checkpoints and live persona acceptance remain open; no remote state changed.
- 2026-09-11 03:48 IST: The required pre-build Advisor call was attempted and failed because the local OAuth session could not refresh. No credentials, provider configuration, deployment, or remote state changed. Three bounded Codex implementation lanes plus local tests and IAB evidence remain the review path.
- 2026-09-11 03:30 IST: The final Codex cross-audit found no critical or high issue. It corrected the two distinct Alpha merge bases, removed Fleet B/C ownership overlap, labelled future UI assertions honestly, and surfaced two Delete preconditions: the saved-memory `ON DELETE RESTRICT` link needs reviewed detach/tombstone semantics, and anti-resurrection must replay original create idempotency keys after deletion.
- 2026-09-11 03:29 IST: The mandatory post-deliverable Advisor audit was attempted against the convergence handoff and failed because the local OAuth session could not refresh. No credential or provider state changed; direct Git evidence, three Codex audits, full local suites, privacy, build, and architecture checks govern this planning checkpoint.
- 2026-09-11 03:22 IST: refined: The owner's latest annotated review supersedes ISC-201's two-button pill acceptance. Alpha's actual product-menu grammar remains the navigation bedrock; Settings is one additive icon utility, not a second labelled destination replacing the Alpha menu.
- 2026-09-11 03:22 IST: refined: Alpha and Beta are a shared product composition across separate runtime pairs, not separate UIs. `release/beta` is not descended from the later Alpha answer-accuracy line, so all convergence begins with a branch-and-symbol capability ledger and bounded forward-ports rather than a wholesale merge.
- 2026-09-11 03:22 IST: The owner added permanent member-session deletion to the product contract. Archive remains retained storage; Delete requires an additive owner-scoped schema/API contract, explicit confirmation, privacy-safe audit semantics, in-flight invalidation, and proof that transcript corpus data and unrelated explicit memories remain untouched.
- 2026-09-11 03:22 IST: There is no automatic long-session compaction in the current source. Message pagination plus versioned owner-scoped context checkpoints are required; checkpoints remain untrusted conversational context and cannot satisfy evidence or explicit-memory criteria.
- 2026-09-11 02:36 IST: The mandatory pre-build Advisor call was attempted for the shared chat refinement and failed because the local OAuth session is expired. Credentials and provider state were not changed; three independent Codex audits plus direct failing probes govern the bounded implementation.
- 2026-09-11 02:32 IST: refined: Public Alpha is a route set on `wtfmedia-web`, while Beta is a staging-only route set on `wtfmedia-web-staging`; each web worker binds to its matching edge and data plane. Chat behavior may share reviewed source code, but runtime assets, authorization, corpus receipts, and deployment actions remain environment-specific.
- 2026-09-11 02:32 IST: Root-cause-at-ingestion: answer-quality drift enters where public and member paths duplicate retrieval/validation logic and where episode-scoped queries override the source resolver's non-deduping default. The correction belongs in the shared answer runner and safe source projection, not in display-only copy or prompt decoration.

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
- 2026-09-08: refined: The operator settings surface is a directory with nested, role-governed workspaces. Release, provider, session, memory, source, readiness, and operator-access concerns remain separate pages; the root route does not render their panels inline, the Settings navigation is directory-only, verified request context is owned by the protected access workspace, and the access route is admin-only at both UI and edge policy layers.
- 2026-09-08: refined: Operator identity is a dedicated `/ops/profile` workspace, not a settings-navigation item. Its edge-backed read route returns only display name, normalized email mapping, active role, scope, provider, and timestamps; the profile maps the same role-filtered settings contract, anonymous public-link mode receives no identity readback, and logout remains only in root Settings.
- 2026-09-11 00:25 IST: refined: The owner-authorized member Beta execution extends the ISA with ISC-167 through ISC-190. Repository implementation is authorized in the clean `codex/beta-e2e-acceptance` worktree using Codex fan-out; Cloudflare deployment, Clerk configuration, remote D1 mutation, production, and human persona acceptance remain separate held gates.
- 2026-09-11 00:25 IST: The E5 ISA Interview used the owner-authored remediation plan as the answer source because it already specifies experience, scope, constraints, routes, copy, privacy, and tests. Review refined continuation to include bounded prior-turn context while transcript retrieval remains the only evidence authority.
- 2026-09-11 00:25 IST: ❌ DEAD END: The mandatory pre-build Advisor review was attempted but the local OAuth session remains expired and the Advisor could not authenticate. Credentials were not repaired; three independent Codex plan audits and deterministic probes form the bounded substitute for this repository pass.
- 2026-09-11 01:05 IST: refined: The owner permanently retires the temporary browser-only `/beta/preview` fixture. It must remain absent and return `404`; it cannot be restored as a demo, fallback, or substitute for real Clerk-authenticated, D1-authorized multi-member acceptance. This durable decision was also submitted as a bounded Codex memory update.
- 2026-09-11 01:16 IST: refined: Public Alpha is the binding visual baseline for Member Beta. Beta may add authenticated routing, private history, explicit memory, and member Settings only by extending the existing WTF OS shell and brand grammar; authenticated IAB review of the real staging lane replaces fixture-based visual review.
- 2026-09-11 01:30 IST: refined: The owner rejected token-only similarity as insufficient. Ordinary-member Beta must literally reuse Public Alpha's evidence-first empty state and composer, keep personalization subordinate, use the Alpha light composition for member entry/recovery, omit dashboard summary cards and nested Settings chrome, and keep utilities hamburger-only. Handoff, GSD state, UI addendum, ISA, and durable memory now form one anti-drift lock.

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
- 2026-09-08 | conjectured: operator identity could remain a utility affordance inside the Settings directory
  refuted by: the requested profile/settings separation and local browser review show that identity, scope, mapping, and account navigation need a dedicated operator workspace
  learned: `/ops/profile` owns safe Clerk-to-active-D1 readback and role-filtered settings links, while Settings owns configuration routes and the sole logout action
  criterion now: the profile route, profile edge DTO, RBAC policy, local fallback state, and Settings logout boundary have separate probes
- 2026-09-09 | conjectured: Profile, display theme, and Settings actions belonged in the fixed bottom pill
  refuted by: the visual review requires the pill to stay focused on workspace destinations and moves utility actions into the hamburger disclosure
  learned: the disclosure owns account/display actions while the bottom pill remains primary workspace navigation, with profile and Settings active states preserved
  criterion now: disclosure-only utility placement has dedicated selectors and a browser assertion covering the closed and open states
- 2026-09-11 | conjectured: a browser-only member fixture could remain as harmless historical review scaffolding after real authentication existed
  refuted by: the owner rejected the fixture screen, the source had already withdrawn its page while an empty route directory still produced a local 500, and cached browser history could still misrepresent it as current product
  learned: temporary identity fixtures must be removed at the route boundary and may never substitute for real member-session acceptance
  criterion now: ISC-192 requires source absence plus local, staging, and production 404 evidence, while ISC-191 retains the real-persona gate
- 2026-09-11 | conjectured: sharing the WTF OS shell, semantic tokens, and typography was enough to preserve the Public Alpha UI
  refuted by: the owner reiterated the prior annotated review after authenticated staging still opened with a separate welcome/dashboard composition
  learned: Beta must reuse Alpha's actual Ask WTF components and page grammar; private capability is additive context, not a replacement presentation
  criterion now: ISC-193 through ISC-198 bind live visual comparison, direct Alpha component reuse, no nested Settings chrome, the light member-entry frame, and synchronized anti-drift records
- 2026-09-11 | conjectured: direct reuse of a few current Beta copies of Alpha components was enough to prevent future chat drift
  refuted by: Git ancestry proves `release/beta` is not descended from the later Alpha answer-accuracy work, and the 1382x1180 owner annotation rejects the resulting navigation, selected-session, and conversation-viewport behavior
  learned: Alpha is a versioned implementation bedrock, not a styling reference; convergence requires an exact branch/symbol capability ledger followed by bounded forward-ports into shared primitives
  criterion now: ISC-219 through ISC-240 bind ancestry, shared composition, lifecycle, long context, role screens, live personas, and environment safety to separate probes
- 2026-09-11 | conjectured: permanent conversation deletion could remove messages then the conversation while leaving saved preferences untouched
  refuted by: migration `0010_member_beta.sql` makes the saved-memory source-conversation link immutable and `ON DELETE RESTRICT`, while conversation-create idempotency identity currently lives on the conversation row itself
  learned: deletion needs explicit detach/tombstone semantics and replayed-create anti-resurrection coverage before any additive migration can be accepted
  criterion now: ISC-227 and ISC-229 require both safeguards rather than a blanket cascade or archive rename
- 2026-09-11 | conjectured: a source-integration PR state, local test result, or reported runtime result could stand in for a Beta promotion receipt
  refuted by: this host verifies a different local merge identity (`d3b4590`) than the reported `3eebf57`, while the reported D1/runtime activity has no host-visible environment receipt
  learned: source, reported, staging, and production evidence are distinct layers and must be bound to one exact candidate revision
  criterion now: ISC-252, ISC-257, and ISC-261 are tombstoned; ISC-262 through ISC-282 define the exact-source, staging, production, and deferred-work gates

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
- Nested settings route evidence (2026-09-08): the Next build enumerates `/ops/settings` plus eight child routes; web unit tests pass 92/92, contract tests pass 86/86, Cloudflare tests pass 177/177, and the privacy scan reports zero violations across 329 bounded files.
- Dedicated profile evidence (2026-09-08): the Next build enumerates `/ops/profile`; the safe profile DTO and policy tests pass, web unit tests pass 93/93, contract tests pass 86/86, Cloudflare tests pass 178/178, typecheck/lint/privacy/diff checks pass, and the in-app browser shows the role-filtered profile/settings map with no logout in the bottom pill. Playwright launch remains unavailable because the local Chromium executable is not installed.
- Utility placement evidence (2026-09-09): AppRail source and the focused browser assertion place profile, theme, and Settings in the hamburger disclosure while the bottom pill contains workspace navigation only; web unit tests pass 93/93, typecheck/lint/diff checks pass, and the in-app browser confirms the closed state. Playwright open-state launch remains deferred because the local Chromium executable is not installed.
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
- ISC-167 evidence: Edge SQLite continuation tests append only to an active conversation owned by the authenticated member and preserve the requested source scope.
- ISC-168 evidence: original-key replay and exact-message fresh recovery converge on one durable user/assistant pair; ambiguous fresh recovery is denied without a write.
- ISC-169 evidence: payload, owner, lifecycle, pending-message, and source-scope mismatches fail closed before generation.
- ISC-170 evidence: the protected router uses the same non-enumerating denial for malformed, missing, archived, and foreign conversation identifiers.
- ISC-171 evidence: the answer runner bounds prior turns to eight messages and 8 KB, labels them untrusted conversational context, and keeps retrieved transcript chunks as the only evidence authority.
- ISC-172 evidence: keyset history queries fetch 26 owner-scoped active rows and expose at most 25 per response.
- ISC-173 evidence: the cursor is URL-safe and emitted only when a 26th owned active row proves another page exists.
- ISC-174 evidence: equal timestamps order and paginate by conversation ID without duplicates in the SQLite regression suite.
- ISC-175 deferred verification: route/build contracts exist, but authenticated reload and back/forward behavior require `WTF-BETA-LIVE-01`.
- ISC-176 evidence: route and operation generations reject late load, answer, archive, and pagination responses; direct Codex probes cover unmount and delayed-GET ordering.
- ISC-177 evidence: load, submit, archive, pagination, and memory states have independent generations; regression probes cover archive failure, history refresh, and lost-response retries.
- ISC-178 evidence: the member registry exposes Ask WTF and Settings only; it contains no operator route.
- ISC-179 evidence: the shell registry groups Beta workspace destinations separately from explicit Public Alpha exits.
- ISC-180 evidence: the greeting helper accepts only a safe Clerk client display name and otherwise renders a neutral member greeting.
- ISC-181 evidence: bounded member-route/component scans and privacy scanning find no member-facing Clerk, D1, subject, issuer, RBAC, or raw identifier language.
- ISC-182 evidence: the clean Next build enumerates `/beta/settings`, `/beta/settings/memory`, `/beta/settings/sessions`, and `/beta/settings/appearance`.
- ISC-183 evidence: member Settings registries and pages contain no release, access, user administration, provider, analytics, source-health, audit, or roster controls.
- ISC-184 evidence: local preference parsing produces editable candidates with stable keys and performs no network request.
- ISC-185 evidence: the direct component request-spy records zero saves before explicit confirmation and one bounded save after the selected action.
- ISC-186 evidence: Edge memory tests retain the 2,000-character limit, current-member ownership predicate, and archive-only lifecycle.
- ISC-187 deferred verification: Drawer trigger wiring and focus callback pass source/direct probes; authenticated keyboard acceptance remains `WTF-BETA-UX-01`.
- ISC-188 deferred verification: responsive contracts are implemented, but authenticated 320x710 overlap acceptance remains `WTF-BETA-UX-01`.
- ISC-189 evidence: member route/source scans and the signed-out boundary expose no `/beta/ops` link or operator-only affordance.
- ISC-190 evidence: the repository diff contains no migration, deployment configuration, credential, or external-state mutation; staging and production were read only.
- ISC-191 deferred verification: no authorized super-admin plus two-member staging session matrix was available; complete `WTF-BETA-LIVE-01` after an approved deployment.
- ISC-192 evidence: the preview page and empty route residue are absent; the clean build route table omits `/beta/preview`; local, staging, and production HTTP checks each return `404`; a unit guard prevents route recreation.
- ISC-175 evidence: authenticated staging created a private conversation at `/beta/chat/mcnv_de758418-defc-4d13-9d82-4d7dbafe7986`; two turns survived reload, and browser back/forward preserved the root/new-chat and selected-conversation states.
- ISC-193 evidence: corrected authenticated staging preserves the floating wordmark, warm Alpha canvas, exact shared evidence card, compact composer, hamburger, and primary pill while adding bounded private session navigation.
- ISC-194 evidence: `MemberChatWorkspace` imports and renders the same exported `ConversationEmptyState` used by Public Alpha; the rejected `Your workspace` feature grid is absent.
- ISC-195 evidence: `MemberChatWorkspace` renders `AskComposer` directly in its live-production compact variant, while continuation retains the conversation's locked evidence scope and idempotency contract.
- ISC-196 evidence: the member Settings layout contains only the settings navigation/content grid beneath `MemberBetaShell`; the duplicated header, Ask link, and private-workspace strip are absent.
- ISC-197 evidence: `OperatorAuthFrame` branches ordinary members into the cream/ink Alpha evidence-card composition with the floating compact wordmark; the existing dark structure remains only in the operator branch.
- ISC-198 evidence: `.project/HANDOFF.md`, `.planning/STATE.md`, `02-MEMBER-BETA-UI-ADDENDUM.md`, this ISA, and the ad-hoc memory note all state the same literal-component, navigation, fixture, and live-IAB rules.
- ISC-199 evidence: authenticated staging web version `e298b69c-d0a0-49a4-b528-5f3914703e0e` rendered the compact single-line Alpha capsule with one Ask WTF button and no expanded panel band, mode strip, or type rail; it successfully continued a real conversation.
- ISC-200 evidence: at the owner's 1382x887 IAB viewport, two long real session titles clamped to two lines wholly inside the bounded 240px rail and did not obscure the Alpha evidence card or compact composer.
- ISC-201 supersession evidence: the 2026-09-11 1382x1180 owner annotation rejected the two-button icon-labelled Ask WTF/Settings pill and requires Alpha's actual menu with Settings as one additive icon utility; ISC-222 owns the replacement acceptance contract.
- ISC-202 through ISC-207 evidence: checkpoint `3e4c887` routes public and member generation through `runChat`; the full 251-test Cloudflare run proves multi-chunk episode retrieval, prior-name follow-up anchoring, current-name supersession, invalid score/text exclusion, and conservative in-range citation coverage with excerpt fallback.
- ISC-208 through ISC-213 evidence: the 142-test web unit run proves stable citation numbers, safe persisted-source projection, truthful persisted grounding/uncut state, same-route load retry, Alpha loading copy, and stored abstention presentation without exposing private model/request/idempotency fields.
- ISC-216 evidence: the 90-test web contract run includes explicit production web to production edge and staging web to staging edge/data-plane pairing assertions plus the production member deny guard.
- ISC-217 evidence: member proxy tests preserve the buffered JSON response contract and no component claims token streaming; public `/api/chat` remains the streamed transport adapter.
- ISC-218 and ISC-240 evidence: the command ledger contains only local source, test, Git, documentation, and read-only IAB operations; no deploy, remote D1/data write, corpus/queue operation, binding, secret, Clerk, DNS, or production action occurred.
- ISC-219 and ISC-220 evidence: `.planning/inputs/2026-09-11-alpha-beta-inference-retrieval-capability-ledger.md` records the exact Alpha, later-Alpha, Beta, and checkpoint references plus an explicit bedrock/adapt/defer/reject admission for every examined later Ask WTF capability; it rejects branch-name and deployment-receipt adoption by default.
- Convergence execution evidence (local only): `53ef445`, `6811564`, `66d79b6`, and `0df461f` pass the full 253-test Cloudflare suite, 144 web unit tests, 90 web contract tests, web typecheck/lint/build, a 360-file zero-violation privacy scan, architecture freshness, and `git diff --check`. This proves source and deterministic contracts, not a staging deployment or the authenticated persona/viewport matrix.
- Final convergence audit evidence: the independent Codex cross-audit reported no critical/high finding; architecture freshness passed for 551 inputs, privacy passed with 0 violations across 359 bounded files, and `git diff --check` passed after all ancestry, ownership, future-assertion, and Delete-safety corrections.
- ISC-262 verification: `git show --no-patch --pretty=raw d3b4590` identifies parents `d4e45b4` and `7ec8298`; `git cat-file -t 3eebf57` returns `fatal: Not a valid object name 3eebf57` in this checkout.
- ISC-264 verification: the Beta 0.1 checklist records Edge 376/376, web unit 188/188, web contracts 96/96, TypeScript, lint, and architecture as local source/build evidence, with a mandatory exact-candidate rerun after the post-merge source-closure commits.
- ISC-265 verification: the Beta 0.1 checklist labels the later local runtime/D1-migration statement `REPORTED` and explicitly bars it from satisfying staging or production rows.
- ISC-263 verification: `git merge-base --is-ancestor` confirms `d3b4590`, `79a0285`, and `b7f5bec` are ancestors of exact source candidate `2c4007d378148da19f09004e97cfc2aff273267e`; the source closure remains split into bounded runtime, release, and documentation commits.
- ISC-284 verification: at `2c4007d`, Cloudflare `npm test` passed 379/379; web unit passed 190/190; web contracts passed 96/96; typecheck, lint, `next build`, privacy `--check`, architecture check, and `git diff --check` all exited zero.
- ISC-285 evidence: `gh pr list` reports PR #77 head/base `beta_0.1`/`release/beta` and PR #48 head/base `rag/alpha-answer-accuracy`/`main`; `git rev-list --left-right --count origin/rag/alpha-answer-accuracy...HEAD` reports `0 42` before any push.
- ISC-286 verification: GitHub identifies `Pavun57` as author of PR #48 at `d4e45b4` and PR #49 at `1e40ef2`; `d4e45b4` is an ancestor of candidate `a3e5cc0`. The candidate preserves PR #49's prior-message forwarding, 90/75-second budgets, secret ignore, and visible match confidence while existing route/navigation/RBAC suites and the 193-test web unit suite remain green.

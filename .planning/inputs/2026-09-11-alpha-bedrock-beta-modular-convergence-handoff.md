# Alpha-bedrock / Beta modular convergence handoff

## Status

**PLANNING AUTHORITY — READY FOR A FRESH CODEX EXECUTION SESSION.** This
handoff supersedes the assumption that Member Beta may reproduce Alpha's look
while retaining an independently composed chat surface. Alpha's actual Ask WTF
interaction, presentation primitives, inference behavior, retrieval behavior,
and preference/navigation grammar are the bedrock. Beta adds authentication,
private conversations, history, explicit memory, member Settings, and role
routing as modules around that bedrock.

This document authorizes repository implementation and local verification in
an isolated worktree. It does not authorize deployment, remote D1 mutation,
corpus copy, queue work, secret or Clerk changes, DNS changes, or any production
mutation.

## Non-negotiable product model

```text
Alpha Ask WTF bedrock
├── shell and responsive navigation
├── conversation composition and compact composer
├── loading, answer, abstention, retry, follow-up, and source states
├── source-mode and evidence presentation
└── retrieval / inference behavior

Beta additive modules
├── Clerk identity, then D1 member/operator authority
├── owner-scoped persisted conversations and messages
├── session rail / mobile drawer and canonical conversation routes
├── explicit saved preferences under member Settings
├── archive and confirmed permanent deletion lifecycle
├── long-session pagination and context compaction
└── operator, admin, and super-admin routing and screens
```

An implementation fails even if it uses the same colors and typography when it
creates a second chat composition, a second composer-placement algorithm, a
Beta-only answer/source grammar, or a two-button substitute for Alpha's actual
navigation.

## Git and runtime truth

The prior plan did not make the branch split explicit enough.

| Evidence | Current ref | Meaning |
|---|---|---|
| Official Alpha release line | `origin/release/alpha` at `e86923b` | Latest named Alpha release branch; contains the evidence-coherence and published-timing repair |
| Later Alpha chat/refinement line | `origin/rag/alpha-answer-accuracy` at `d4e45b4` | Contains later Ask WTF chat, source-sheet, model, and retrieval work plus an earlier Beta merge; reference carefully, never merge wholesale |
| Exact accepted composer geometry reference | commit `887699e` | Compact composer focus/placement behavior matched to the Alpha chat reviewed in the browser |
| Current Beta release line | `origin/release/beta` at `498c0e0` | Authenticated member workspace baseline after PR #60 |
| Current source-only refinement checkpoint | `codex/beta-chat-refinement` at `3e4c887` | Shared answer runner hardening, safe persisted citation projection, retry/loading/thread containment, and environment-pair tests; not pushed or deployed |

`release/beta` is not descended from the later Alpha work. Its merge base with
`release/alpha` is `ee00c28`; its merge base with the later
`rag/alpha-answer-accuracy` line is `a0bf034` because that line already absorbed
an earlier Beta integration before advancing again. The current Beta tip still
does not contain those later Alpha refinements. This explains the recurring
drift: Beta copied selected Alpha visuals instead of inheriting the evolving
Alpha chat implementation.

### Branch integration rule

Start from the reviewed Beta release successor because it carries the current
staging Clerk/D1/member integration. Forward-port Alpha behavior in bounded
slices from exact commits. Do not cherry-pick or merge
`origin/rag/alpha-answer-accuracy` wholesale: it contains earlier Beta merges,
model/provider experiments, source-sheet work, and production-specific changes
that require separate admission.

Before implementation, generate a path-and-symbol ledger for each Alpha-only
commit under consideration. Every item must be classified as:

- **bedrock:** must become the shared public/member implementation;
- **adapt:** behavior is retained behind the existing staging contracts;
- **defer:** not required for the member Beta release;
- **reject:** conflicts with current privacy, evidence, environment, or release
  boundaries.

## UI-linked owner annotation ledger

These annotations supersede older acceptance language where they conflict.
They refer to the authenticated staging route `/beta/chat/[conversationId]` at
1382x1180. The private route identifier is intentionally not repeated here.

| Annotation | Selected UI | Required correction | Primary source seam |
|---|---|---|---|
| A1 | Session card in the left rail | Keep the 240px bounded rail, two-line card clamp, long-word wrapping, and independent scroll. Add a row action for the selected/hovered session; do not let actions or badges overlap titles. | `web/components/domain/member/MemberSessionNavigator.tsx` |
| A2 | Navigation chrome | On live Alpha Ask WTF the bottom dock is absent. Preserve the floating wordmark and top-right Alpha hamburger; its disclosure carries Ask WTF, Episodes, Connections, and display utility. Add member Settings as one gear utility inside that disclosure. Do not render separate bottom icon-labelled `ask wtf` and `settings` buttons. Conversations remain in the rail/drawer. | `web/components/shells/AppRail.tsx`, `web/lib/member/navigation.ts`, historical `887699e` |
| A3 | Unavailable conversation canvas | A selected route always owns a bounded conversation viewport. Loading, unavailable, retry, empty, answer, and long-history states occupy that same surface. No giant dead page. | `web/components/domain/member/MemberChatWorkspace.tsx`, shared `ConversationThread` primitive |
| A4 | Header `archive` button | The current control is ambiguous and behaves as navigation. Replace it with a selected-session action. Archive and permanent delete are different operations and must not share a label or backend contract. | `MemberChatWorkspace.tsx`, `cloudflare/src/member-router.ts`, `cloudflare/src/chat/member-history.ts` |

Earlier 1382x887 annotations remain active: session cards may not overlap the
evidence card; the composer is the compact Alpha capsule; fixed UI must clear
the rail, viewport, safe area, and navigation; `/beta/preview` and browser-only
fixtures remain forbidden.

## Alpha chat bedrock to forward-port

### Presentation and interaction

Use the historical Alpha implementation at `887699e` as the first concrete
geometry reference, then reconcile later accepted source behavior rather than
copying files blindly.

- `web/components/domain/public/AskComposer.tsx`
  - one-line capsule;
  - owns input behavior, not viewport positioning;
  - current source mode remains explicit and truthful where available.
- `web/components/domain/public/ConversationThread.tsx`
  - owns answer/abstention/retry/follow-up presentation;
  - uses measured overflow to choose fixed versus inline footer placement;
  - follows new content only while the reader is near the end.
- `web/components/domain/public/MigratedChatPage.tsx`
  - composes the full-height Ask surface and streamed public transport;
  - does not introduce a second workspace header above the chat.
- `web/components/domain/public/SourcePanel.tsx`
  - preserves cited moment numbers, source modes, timestamps, candidate
    disclosure, and safe outbound links;
  - consumes only the allowlisted public projection.
- `web/components/shells/AppRail.tsx`
  - floating wordmark and hamburger remain global;
  - public and member Ask routes hide the bottom dock;
  - the disclosure preserves Alpha's Ask WTF, Episodes, Connections, and theme
    grammar;
  - member account/logout and one Settings gear extend that disclosure without
    replacing it.

### Inference and retrieval

Do not call the refinement complete after matching the UI. Map the later Alpha
answer-accuracy line into a capability ledger covering at least:

- multi-turn interpretation and bounded follow-up prompts;
- named-person/episode anchoring and speaker attribution;
- per-factual-sentence citation coverage and truthful abstention;
- requested versus effective `published` / `uncut` / `both` state;
- paired timelines and honest timing/confidence presentation;
- candidate overflow, moment ordering, and source-sheet behavior;
- model selection/fallback/timeouts as environment-owned capabilities.

Checkpoint `3e4c887` already closes a narrow shared-runner subset: public and
member paths share the same `runChat`, same-episode retrieval keeps multiple
chunks, malformed vector evidence is rejected, prior named entities anchor
follow-ups, citation coverage is conservative, and persisted member citations
use the public-safe projection. It does **not** prove parity with the later
Alpha answer-accuracy branch, semantic entailment, streaming member transport,
or staging corpus completeness.

## Target member chat composition

The member workspace composes, rather than forks, the Alpha thread:

```text
MemberBetaShell
├── Alpha AppRail/navigation grammar + member-safe utilities
└── MemberChatWorkspace
    ├── MemberSessionNavigator (desktop rail / mobile drawer)
    └── shared Alpha conversation viewport
        ├── ConversationThread presentation
        ├── SourcePanel
        ├── member persistence/retry state adapter
        └── compact AskComposer footer
```

The public path keeps streamed plain text and response headers. The member path
may remain buffered JSON during this convergence only if the UI labels loading
truthfully; do not fake token streaming. Streaming member responses is a
separate transport design because partial persistence, cancellation,
idempotency, and retry must be solved together.

## Session lifecycle: archive and permanent delete

The current implementation is archive-only. D1 retains archived conversations,
messages, and saved memories, and migration `0010_member_beta.sql` explicitly
blocks deletion. The new owner annotation adds permanent deletion; it cannot be
implemented as a renamed archive request.

### Required UI

- Each selected conversation exposes a clear session action menu.
- **Archive conversation** removes it from active history while retaining the
  existing server record. Confirmation may be lightweight and must say it is
  retained.
- **Delete conversation permanently** opens a focus-managed confirmation dialog
  that names the consequence: the conversation, messages, and internal context
  checkpoints are removed from private storage and cannot be restored.
- Explicit saved preferences are separate from conversation history. They are
  not silently deleted. If a saved preference is linked to the conversation,
  show the count and require a separate explicit selection to delete it.
- Success removes the route from the rail and navigates to `/beta`; failure
  leaves the selected route and content intact with retry.

### Required backend/data design

Create an additive migration and owner-scoped `DELETE` contract. It must:

1. reject unsigned, malformed, archived/unknown, and cross-member identifiers
   through the same non-enumerating boundary;
2. stop or invalidate any in-flight generation before deletion;
3. delete dependent context checkpoints and messages before the conversation,
   or use a reviewed cascade with equivalent tests;
4. resolve the existing immutable `member_saved_memories.source_conversation_id`
   `ON DELETE RESTRICT` link with a reviewed detach/tombstone design; never
   blanket-cascade explicit saved preferences;
5. retain only a privacy-safe audit receipt with no prompt, answer, memory
   content, or raw identity;
6. prove continuation retries and replay of the original conversation-create
   idempotency key cannot resurrect deleted content after the conversation row
   that currently owns that key is removed;
7. never delete transcript corpus data from Vectorize, R2, or KV.

The exact retention/audit receipt and backup-restoration posture must be written
into the migration plan before a remote D1 apply.

## Long-session behavior and auto-compaction

There is no auto-compaction today.

- D1 returns the entire selected conversation to the browser.
- Inference receives only the latest eight prior turns within 8,000 characters.
- Up to eight explicit saved memories are added separately.
- Older turns remain stored but silently fall out of model context.

The next implementation must make that visible behavior safe:

1. Add reverse/keyset message pagination. Load the newest bounded page first and
   fetch older messages on explicit upward scroll/action.
2. Add owner-scoped, versioned conversation context checkpoints after a tested
   turn/token threshold.
3. Treat a generated checkpoint as untrusted conversational context, never as
   transcript evidence and never as an explicit saved preference.
4. Build inference context from the latest valid checkpoint plus recent turns
   inside a declared budget.
5. Keep conversation generation available if compaction fails; fall back to the
   current bounded recent-turn window and expose no false success.
6. Delete checkpoints with a permanently deleted conversation.
7. Test long sessions for stable scroll position, message ordering, retry,
   reload, context continuity, and bounded payload size.

Do not claim “full-session memory” unless older-turn continuity is proven with
a checkpoint evaluation. Storage retention alone is not inference memory.

## Audience and RBAC acceptance

Existing policy tests are necessary but the live screens have not completed the
required persona matrix.

| Persona | Required `/beta` behavior | Required UI proof | Required API proof |
|---|---|---|---|
| Signed out | Enter the member sign-in/recovery boundary | No private rail, title, message, memory, or admin link flashes | Member and operator endpoints deny without enumeration |
| Ordinary Member A | Open Alpha-bedrock member Ask WTF | A-only sessions/preferences, no operator navigation | Create, continue, archive, delete, paginate, compact, logout/login restore |
| Ordinary Member B | Open same member product | B-only data and independent empty/history states | Cannot enumerate/read/mutate/delete A records |
| Editor | Route to `/beta/ops` | Only editor-visible destinations and actions | Denied from admin and super-admin capabilities |
| Admin | Route to `/beta/ops` | Member management/audit screens only where policy allows; no super-admin transfer/release action | Admin allow/deny matrix rechecked on every request |
| Super-admin | Route to `/beta/ops` without member creation | Complete super-admin Settings/transfer/release surfaces; no member self-provisioning side effect | Single-seat invariant, transfer, release, and member-management capabilities |
| Suspended/revoked member | Non-enumerating denial | No private or admin content | Same denial shape as unknown member |

Use real staging identities supplied through the existing owner-controlled flow.
Do not put emails, tokens, Clerk subjects, private content, or native session IDs
into test artifacts. Browser verification must run in the Codex in-app browser,
not Chrome, and must record 1382x887, 1382x1180, and 320x710 acceptance.

## Cloudflare pair boundary

Alpha and Beta may share reviewed source behavior, but their deployed assets are
not interchangeable.

| Lane | Web | Edge | Data plane |
|---|---|---|---|
| Production Alpha | `wtfmedia-web` | `wtfmedia-edge` | production Vectorize/R2/KV/D1/queues |
| Staging Beta | `wtfmedia-web-staging` | `wtfmedia-edge-staging` | staging Vectorize/R2/KV/D1/queues and staging Clerk party |

No production corpus receipt proves staging retrieval completeness. Before live
Beta inference acceptance, compare metadata-only staging counts, source-mode
indexes, approved source availability, and a fixed query set against the
declared staging baseline. Never copy production member data or private
content.

## Execution waves

### Wave 0 — freeze the real Alpha bedrock

- Diff `origin/release/alpha`, `origin/rag/alpha-answer-accuracy`,
  `origin/release/beta`, and `3e4c887` by path and symbol.
- Produce the bedrock/adapt/defer/reject ledger.
- Re-run live Alpha IAB screenshots and DOM assertions before changing shared
  public components.
- Convert annotations A1-A4 and the old overlap/composer notes into failing
  browser/component contracts.

**Exit:** exact Alpha behavior and exact Beta additions are named; no branch is
merged wholesale.

### Wave 1 — shared Alpha presentation primitives

- Restore an unpositioned compact `AskComposer`.
- Restore the overflow-aware shared conversation viewport/footer contract.
- Restore Alpha's chat-route dock exemption and hamburger disclosure; add one
  member Settings gear inside the disclosure, not a replacement bottom menu.
- Preserve the safe citation projection introduced by `3e4c887`.

**Exit:** Public Alpha visual/interaction tests remain green and Beta renders the
same thread/composer primitive with only member-owned state adapters around it.

### Wave 2 — Alpha inference/retrieval parity

- Forward-port admitted Alpha answer-accuracy capabilities behind the shared
  runner.
- Keep provider/model configuration environment-owned and secrets absent.
- Add fixed published/uncut/both, named-person, follow-up, abstention, citation,
  timing, and candidate-order evaluations.

**Exit:** public and member entrypoints produce the same grounded behavior from
equivalent evidence; environment/corpus differences are reported rather than
papered over.

### Wave 3 — member session lifecycle and long context

- Add message pagination and context checkpoints.
- Add selected-session Archive and permanent Delete actions with distinct
  confirmations/contracts.
- Prove in-flight cancellation, idempotency, non-resurrection, owner isolation,
  and bounded payload/context behavior.

**Exit:** long sessions remain usable and context-aware; deletion removes only
the owner-authorized private session scope.

### Wave 4 — role-specific screens

- Inventory every editor/admin/super-admin destination and capability.
- Add route/UI assertions matching server policy.
- Fix only demonstrated mismatches; do not expose controls merely because a
  page component exists.

**Exit:** deterministic persona tests pass for navigation, action visibility,
and server authorization.

### Wave 5 — local integration and review

- Run full Worker and web suites, contracts, typecheck, lint, production build,
  privacy, architecture freshness, and diff checks.
- Run local/browser fixtures only for deterministic layout; do not substitute
  them for authenticated staging acceptance.
- Complete independent code/security/UI review and resolve all P0/P1 findings.

### Wave 6 — separately authorized staging acceptance

- Deploy exact reviewed commits only to the named staging pair.
- Verify staging resource/corpus readiness.
- Execute all seven personas above in the IAB.
- Record source, commit, deployment versions, D1 metadata-only receipts, live
  behavior, and owner visual approval separately.
- Confirm production Alpha and all production resources are unchanged.

## Codex fan-out map for the fresh session

Use one orchestrator plus three Codex workers. Workers are not alone in the
codebase and must respect the ownership below.

### Fleet A — Alpha bedrock and shared UI

Owns shared public presentation files and their tests only:

- `web/components/domain/public/{AskComposer,ConversationThread,SourcePanel,MigratedChatPage}.tsx`
- `web/components/shells/AppRail.tsx`
- focused public UI/unit/browser contracts

No member API, migration, auth, or role changes.

### Fleet B — inference and retrieval convergence

Owns:

- shared answer/retrieval/evidence modules under `cloudflare/src/chat/`,
  explicitly excluding `member-history.ts`, `member-memory.ts`, and new
  private lifecycle or checkpoint modules;
- public Edge adapter in `cloudflare/src/index.ts`;
- focused retrieval/inference/eval tests.

No provider credential, Wrangler binding, ingest, or deployment mutation.

### Fleet C — private lifecycle and long sessions

Owns:

- new additive D1 migration;
- `cloudflare/src/chat/member-history.ts` and member router contracts;
- member message pagination, checkpoints, archive/delete data behavior;
- focused D1/privacy tests.

No public UI or operator policy changes.

### Integration pass — member composition and role acceptance

After A-C stabilize, the orchestrator (or a fresh worker with explicit
ownership) integrates:

- `MemberChatWorkspace`, `MemberSessionNavigator`, member navigation and dialog;
- editor/admin/super-admin route and screen contracts;
- full regression and IAB acceptance plan.

## Stop conditions

- Stop if any work treats palette/token similarity as Alpha parity.
- Stop if a proposed merge would absorb an entire divergent branch without the
  capability ledger.
- Stop if Delete is implemented as Archive, Archive is described as deletion,
  or deleting a private session touches transcript corpus storage.
- Stop if context checkpoints can be cited as evidence or saved as explicit
  memory without member action.
- Stop if a member-facing screen exposes an operator route or the UI is used as
  authorization.
- Stop if a live test substitutes one member for the required persona matrix.
- Stop before any staging or production mutation without fresh, explicit owner
  authorization for that wave.

## Fresh-session prompt

> Resume WTFMedia from
> `.planning/inputs/2026-09-11-alpha-bedrock-beta-modular-convergence-handoff.md`
> using the isolated `codex/beta-chat-refinement` worktree. Alpha Ask WTF is the
> bedrock and Beta is a modular authenticated extension; do not build or style a
> separate Beta chat. First execute Wave 0 and prove the exact branch/symbol
> ledger across `origin/release/alpha`, `origin/rag/alpha-answer-accuracy`,
> `origin/release/beta`, and checkpoint `3e4c887`. Use live Alpha `/chat` as the
> navigation truth: no bottom dock, and the Alpha hamburger disclosure extended
> by one member Settings gear. Then fan out with the stated
> Codex ownership lanes. Preserve the production/staging Cloudflare pairs,
> Clerk identity plus D1 authority, owner-scoped data, Public Alpha, and all
> unrelated work. Add distinct selected-session Archive and confirmed permanent
> Delete flows, message pagination and safe long-session context checkpoints,
> and deterministic editor/admin/super-admin UI/RBAC coverage. Do not deploy or
> mutate remote data until local verification, independent review, and a fresh
> owner-authorized staging wave.

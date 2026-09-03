# WTF Phase 1 feedback extraction

Status: implementation checkpoint recorded on 2026-09-03. Extracted from the owner-provided
`WTF - Phase 1 [Feedback].docx` on 2026-09-03. The document is feedback
evidence; this file does not authorize production deployment, credential
changes, a broad visual rewrite, or data migration.

## Implementation checkpoint — isolated feedback wave

- FB-01 implemented in the migrated Ask WTF composer: the fixed composer now
  anchors directly above the bottom navigation rail, including the mobile safe
  area, and retains the input/mode/action grouping.
- FB-03 implemented in the migrated public chat: assistant answers render
  Markdown/GFM list structure; grouped numeric citations become individual
  links to canonical `/episodes/<public-video-id>` routes; unresolved or
  non-numeric brackets remain plain text. Source cards use the same route
  helper.
- The answer/source integration baseline also had a missing source-ranking
  export, an extra Worker brace, an unclosed source-mode test, and extensionless
  Worker imports. These were repaired only in the isolated feedback branch so
  local verification can run; no shared checkout or remote state changed.
- Verification: web unit 74/74, web typecheck/lint/build passed, full
  Cloudflare suite 169/169, and chat journeys passed at 320, 768, 1440, and
  desktop viewport projects.
- FB-02 remains local-only behind the existing Cloudflare Access/D1 release
  gate; no supplied password or new auth authority was added.
- FB-04 remains a data/provenance receipt task. The existing source-mode
  contract preserves canonical episode scope and source labels, but no remote
  catalogue correlation or alignment was performed.
- FB-05 remains separate; the broad reference redesign was not folded into
  this narrow implementation wave.

## Production correction checkpoint — 2026-09-03

The earlier isolated-feedback checkpoint above is historical. The reviewed
Alpha slice was subsequently integrated into `codex/docs-workflows` and
promoted after the full Phase 1 gate. The final correction also removed the
reported viewport-height gap by fixing the migrated shell's nested height and
padding flow; the composer remains directly above the intentional `bottom: 0`
navigation pill, and the hamburger control is present in the public chat shell.

- Production Worker version: `08ac8a8c-56d4-4a95-915b-2e65ec561176`.
- Production route probes: `/`, `/chat`, `/episodes`, `/connections`, and
  `/ops/settings` all returned HTTP 200.
- Production chat markers: migrated WTF OS shell, navigation toggle, bottom
  pill, and Ask WTF composer present; public operator-context strip absent.
- Episode-map navigation is bounded to explicit canonical mappings. Ambiguous
  or unmapped catalogue rows remain visibly `not linked` rather than being
  guessed from title similarity.
- The Beta auth/account-memory/RAG/admin lane remains separate and was not
  enabled or mutated by this Alpha promotion.

## Instruction boundary

The document asks for a shared login password for a set of email addresses.
That is recorded as a product intent (account continuity), not as an
implementation instruction. Do not add a shared password, password literal,
custom auth cookie, or local credential store. The repository's approved
direction remains Cloudflare Access for authentication, active D1 operator
resolution for authorization, and server-owned persistent history. Any change
to that authority requires a separate owner-approved auth decision.

The request to “change UI to the below one” is treated as a visual reference
and acceptance direction, not permission to replace the existing public shell
or discard the current Alpha/Beta release separation. Preserve the existing
public routes and use an additive, reversible slice.

## Extracted feedback map

### FB-01 — Composer/button bottom anchoring

- Source: DOCX item 1, page 1; annotated screenshot.
- Feedback: a visible gap/glitch appears around the lower platform button
  while scrolling; the complete text box/control group should sit at the
  bottom.
- Area: UI / responsive behavior / scrolling.
- Proposed change: make the Ask WTF composer and action group one bottom-
  anchored unit at the supported viewport sizes. Prevent the action button
  from visually separating from the input during scroll, resize, loading, and
  validation-error states.
- Acceptance: no gap or overlap at 320, 768, and 1440 widths; keyboard focus
  remains visible; composer, mode selector, and submit action stay associated;
  reduced-motion and mobile scroll behavior remain usable.
- Owner: web UI.
- Priority: P1 visual defect.
- Current status: implemented in the isolated feedback branch; browser chat
  journeys passed at the supported 320, 768, and 1440 viewport projects.

### FB-02 — Account continuity and last-question history

- Source: DOCX item 2, page 1; “From Before” request.
- Feedback: provide login for the supplied email identities and let each user
  return to the last question they asked through persistent memory.
- Area: auth / sessions / conversation history / memory boundary.
- Proposed change: keep the implemented Cloudflare Access identity boundary;
  resolve each verified identity to its active D1 operator and persist
  operator-owned conversations/messages. Present prior questions as
  conversation history, not as implicit institutional memory or training data.
- Acceptance: reauthentication restores the same operator's history; another
  operator cannot read it; archive remains non-destructive; admin visibility
  follows the approved role policy; public anonymous `/chat` and `/api/chat`
  remain stateless and unchanged.
- Owner: auth + edge + D1 + ops UI.
- Priority: P0 product capability, gated by staging auth evidence.
- Current status: local authenticated history and admin projection are
  implemented behind the server release gate; staging Access/browser proof,
  isolated D1/cache/secrets, and live activation remain open.

### FB-03 — Readable answer structure and exact episode citation targets

- Source: DOCX item 3, page 2 and following annotated answer screenshot.
- Feedback: format long answers as readable bullets or numbered points; clicking
  citation references such as `[1,2,3]` should open the exact cited episode,
  not the general episodes index.
- Area: answer presentation / citation navigation / accessibility.
- Proposed change: render supported structured answer blocks as semantic lists
  while preserving quoted evidence separately from synthesis. Make each source
  reference resolve to the exact `/episodes/[id]` target when an approved
  episode identity exists; preserve truthful source-mode and timestamp rules.
- Acceptance: long multi-source answers remain scannable; list semantics work
  with keyboard and assistive technology; every citation retains its source
  identity; exact episode links open the matching episode; missing or unmapped
  identity falls back honestly without guessing.
- Owner: answer contract + web citation/source panel.
- Priority: P1 usability and provenance.
- Current status: implemented in the isolated feedback branch; the anonymous
  API response shape is unchanged and the web renderer now owns the semantic
  list and exact-episode link projection.

### FB-04 — Published/uncut episode-set correlation

- Source: DOCX item 4, page 3 and annotated published/uncut source screenshots.
- Feedback: published and uncut currently show different episode sets; they
  should correlate, with the transcript/source asset being the differentiator.
- Area: catalogue identity / dual-source provenance / retrieval correctness.
- Proposed change: establish one canonical episode identity and attach
  published and approved uncut transcript assets to that identity. Source mode
  should select the transcript/evidence projection, not silently create two
  unrelated episode catalogues.
- Acceptance: mapped published/uncut records share the same episode identity;
  mode switching changes eligible evidence only; unmapped, quarantined, or
  held assets remain explicit; no cross-episode matching or fabricated
  timeline is introduced; both-mode results retain source labels.
- Owner: catalogue/provenance + ingest + answer retrieval.
- Priority: P0 data correctness.
- Current status: source-mode and episode-scoped filtering are implemented;
  trusted dual-timeline alignment and the complete correlation receipt remain
  open. The four named sheet exceptions stay outside fully-ingested claims.

### FB-05 — Visual reference alignment for the public workspace

- Source: DOCX item 5, page 3–4; reference photograph/mockup.
- Feedback: change the UI toward the supplied “the room” reference.
- Area: visual system / public workspace information architecture.
- Observed reference direction: a WTFOS wordmark/header, compact workspace
  metadata strip, “the room” hero, a two-column “what's open” and “room rule”
  composition, clear active states, and a compact bottom navigation dock.
- Proposed change: perform a bounded visual parity pass against the reference,
  preserving current route contracts, evidence truthfulness, responsive
  behavior, and the separate public/ops boundaries. Reuse existing design
  tokens/components where possible; do not replace the shell wholesale until
  the target pages and final reference are confirmed.
- Acceptance: owner-approved target pages are identified; visual captures pass
  at 320/768/1440; navigation and public `/chat` contracts remain unchanged;
  no source evidence, release control, or auth boundary is hidden by styling.
- Owner: web/design.
- Priority: P1 visual refinement.
- Current status: reference captured as planning evidence; exact page scope,
  component delta, and approval of a broad visual pass remain open.

## Recommended next wave

1. Review and selectively integrate the isolated FB-01/FB-03 implementation
   branch after owner review; keep the shared checkout untouched until then.
2. Produce a read-only FB-04 correlation audit from existing catalogue,
   published, and approved uncut identities; hold ambiguous rows.
3. Use the existing authenticated history slice for FB-02 staging proof; do
   not introduce shared credentials or claim live readiness without the
   isolated Access/D1/cache/secrets and signed-in browser evidence.
4. Turn FB-05 into a separate visual scope packet after the owner selects the
   exact routes/components represented by the reference.

## Open questions / evidence gaps

- Which viewport and scroll position produced FB-01, and is the gap present in
  the current migrated shell, legacy shell, or both?
- Should FB-03 links open the public episode detail page, an evidence/source
  drawer, or an authenticated operator episode inspector when the viewer is an
  operator?
- Which published/uncut rows in FB-04 are intended matches where external
  identity data is currently missing? No match should be inferred from title
  similarity alone.
- Which public routes are in scope for FB-05: home/“the room”, episodes,
  connections, Ask WTF, or all public pages?

## Non-goals for this input

- No shared password or new authentication authority.
- No production deploy, remote D1 migration, Access policy mutation, secret
  rotation, DNS change, queue/ingest replay, or corpus broadening.
- No deletion, merge, or destructive replacement of existing UI/planning
  assets.
- No claim that the separate local Alpha/Beta release-track commit is already
  integrated into `codex/docs-workflows`; it remains a separate local branch
  until selectively integrated.

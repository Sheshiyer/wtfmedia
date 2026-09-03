# Changelog

All notable user-facing releases are recorded here. Versions follow semantic
versioning; the web application version is held in `web/package.json`.

## [Unreleased]

- Fixed ingest queue URL to use the connect2nikhai subdomain.

## [0.3.3-beta.1] - 2026-09-04

### Added

- Restored the AppRail contract from the alpha baseline and wired the login
  flow through protected settings.
- Added an authenticated Ask WTF staging lane with server-side RAG, persisted
  chat answers, and protected chat history.
- Added consolidation policy panels: memory governance, RAG source health, and
  session history.
- Added a release gate separating the alpha baseline from the beta track.

### Changed

- Routed beta sign-in through protected settings and hardened the staging
  integration boundary.
- Hidden unverified operator release UI behind the staging gate.
- Separated the alpha baseline from the beta track so authenticated features
  do not regress public production paths.

### Fixed

- Added edge fallback to episode Frame.io links when direct URLs are
  unavailable.

## [0.3.2-alpha.1] - 2026-09-01

### Added

- Added named-person retrieval anchors so explicit guest questions resolve to
  matching episode evidence instead of semantically similar guests.
- Added truthful abstention and synthesis guardrails when named-person evidence
  is absent.
- Made the public source panel's `published`, `uncut`, and `both` controls
  filter the visible citation list and count.

### Changed

- Preserved episode scope, source identity, and truthful timestamp behavior
  across the named-guest retrieval path and source-panel projections.

### Deferred

- No additional Frame.io/Vectorize URL propagation, oversized timestamp-line
  chunking, or publisher/re-ingest tooling is included; that new slice is
  explicitly deferred as “won't do now.” Existing `main` behavior is preserved.

## [0.3.0-alpha.1] - 2026-09-01

### Added

- Added validated episode-scoped Ask WTF retrieval using the public YouTube
  `episodeId`, with Vectorize filtering and a post-retrieval scope check.
- Added a privacy-safe public uncut activation receipt for 49 approved mapped
  episodes, while keeping uncut playback and cross-timeline seeking held.
- Added the Cloudflare calendar control-plane API with idempotent writes,
  optimistic concurrency, bounded inputs, and hashed rate-limit keys.
- Added deterministic uncut timestamp-sidecar and Frame.io metadata refresh
  tooling, including metadata-only refresh jobs for untimed approved prose.

### Changed

- Ask WTF now preserves per-source `published`/`uncut` mode through fallback,
  mixed retrieval, episode pages, and the public source panel.
- Approved uncut Vectorize records carry their allowlisted Frame.io episode URL;
  Ask WTF exposes that URL only when it passes the HTTPS Frame.io host policy.
- Source citations show timestamps only when mapped and no longer render an
  unavailable-timestamp badge or fabricated published seek link for uncut.
- Episode cards and detail surfaces report indexed uncut evidence separately
  from playback and timeline-alignment availability.
- Removed the stale bottom-navigation pill from the public production bundle
  and retained the keyboard-safe navigation disclosure.
- Added the deterministic local `/api/chat` fallback and release-contract
  coverage while keeping production on the Cloudflare service binding.

### Verification

- Cloudflare unit and integration suite: 154 tests passed.
- Web Phase 1 aggregate verification passed: 72 unit tests, 85 contract tests,
  102 Storybook tests, 21 accessibility tests, 224 browser tests, 17 visual
  captures, production build, privacy scan, and rollback rehearsal.
- Web typecheck and lint passed; the contract suite covers 85 tests including
  the reviewed `/api/chat` projection hash update.
- Uncut reconciliation dry run: 49 jobs, 43 timestamp sidecars, 6 metadata
  refreshes, 18,040 explicit intervals, and 0 skipped.

### Held

- Cross-timeline timestamp mapping, synchronized uncut playback, and browser
  media projection remain separate follow-up gates; episode membership and a
  Frame.io episode URL do not prove seekable alignment.

## [0.2.0] - 2026-09-01

### Added

- Added episode-scoped Ask WTF retrieval from dedicated episode workspaces,
  while preserving separate public episode and private uncut asset identities.
- Added a fail-closed activation preflight that verifies mapped uncut bytes,
  storage keys, and content hashes before production upload or ingestion.

### Changed

- Reconciled canonical planning and ISA evidence with the bounded production
  release while keeping the broader provenance, alignment, playback, search,
  analytics, and operator-workspace gates explicitly open.
- Updated current-release onboarding to the verified 55 published, 49 mapped
  uncut, and 11,948-vector receipt without claiming timeline alignment.

### Fixed

- Restored the reviewed calendar Worker module and migration still imported by
  `main`, returning the edge bundle to a deployable state.
- Kept transcript source hashes separate from timestamp-inclusive ingestion
  idempotency hashes, so published sidecars still pass D1 provenance checks.

## [0.1.4] - 2026-08-31

### Changed

- Adopted the owner-approved WTF OS shell contract: a header wordmark and
  keyboard-safe operations disclosure above a scroll-safe application dock.
- Added a deterministic development-only local RAG fallback for `/api/chat`
  while preserving the Cloudflare service-binding production path and source
  headers.

## [0.3.1-alpha.1] - 2026-09-01

### Added

- Added a WTF OS favicon, Apple touch icon, Android/PWA icons, and maskable icon
  derived from the brand mark and wired them through the web metadata manifest.
- Added a browser regression proving an approved uncut Frame.io URL is rendered
  as the source action href.

### Fixed

- Kept the approved uncut Frame.io destination visible in Ask WTF source cards
  while retaining truthful timestamp and playback boundaries.

## [0.1.3] - 2026-08-11

### Fixed

- Removed automatic starter queries entirely after validating that several
  narrow-looking prompts still did not consistently yield citation-supported
  answers. The empty state now presents a non-submitting example only.

## [0.1.2] - 2026-08-11

### Fixed

- Replaced starter questions that asked for unsupported catalogue-wide rankings
  or recurrence claims with focused, source-answerable questions.
- Rewrote the chat empty state and safety response to explain what the assistant
  can answer and suggest a productive next query.

## [0.1.1] - 2026-08-11

### Added

- Added a 55-record corpus provenance manifest with source URLs, transcript
  hashes, embedding version, and per-episode timestamp availability.
- Restored source-level timestamp metadata for the 43 episodes with timed
  caption sidecars. Twelve fallback transcripts remain visibly untimestamped.
- Added a production RAG evaluation script covering grounded citations,
  ownership abstention, and timestamp-header honesty.

### Security

- Restricted Cloudflare chat access to the Vercel server using a rotated shared
  Worker/Vercel secret; direct Worker chat requests now receive `401`.
- Forwarded the original client IP only across that authenticated boundary and
  added request IDs, content-type enforcement, and strict response handling.

### Fixed

- Added the singular `own` phrasing to the ownership conditional after the
  production evaluation exposed that gap.

## [0.1.0] - 2026-08-11

### Added

- Deployed a dedicated Cloudflare shadow RAG Worker, `wtfmedia-edge`, with
  Workers AI, Vectorize, R2, KV, Queue, and a queue dead-letter path.
- Created the dedicated cosine Vectorize index `wtfmedia-catalogue-v1` with a
  `video_id` metadata index, without reusing unrelated account resources.
- Completed a two-episode R2 → Queue → Workers AI → Vectorize pilot and
  verified a grounded Worker response at the shadow endpoint.
- Added the Cloudflare infrastructure runbook, staged migration plan, and
  standalone architecture diagram.

### Changed

- Switched the Vercel chat route to the Cloudflare edge RAG provider while
  preserving the browser response and citation-header contract.
- Corrected documentation that overstated timestamp coverage, removed stale
  Crew claims, and described citations as evidence links unless a source has a
  verified timestamp.

### Security

- Added bounded request validation, KV-backed per-IP rate limiting, retrieval
  score/diversity limits, generic upstream error handling, and a secret-gated
  ingestion endpoint to the shadow Worker.

### Pending

- Full-corpus backfill, provenance manifest, citation/claim validation,
  golden-answer evaluations, WAF/Turnstile, and shadow comparison must pass
  before Vercel routes any public traffic to the Worker.

## [0.0.5] - 2026-08-11

### Fixed

- Added a grounding guard for corpus-wide recurrence/count questions and
  ownership or role claims, which cannot be established from six retrieved
  excerpts.
- Strengthened answer instructions against relationship inference and lowered
  answer sampling temperature.
- Removed the unsupported people/company recurrence suggestion and clarified
  that Connections represents recurring themes and ideas.

## [0.0.4] - 2026-08-11

### Changed

- Simplified Ask WTF to its production-backed retrieval path and updated all
  visible catalogue counts to 55 episodes and 1,933 indexed chunks.

### Removed

- Disabled the unavailable Crew mode and removed its localhost-only API proxy.
- Removed the simulated online-user counter and the unrelated drawing playground.

## [0.0.3] - 2026-08-11

### Fixed

- Rebuilt the Connections graph for all 55 synced episodes.
- Bounded NVIDIA model curation to a fast model and a short deadline.
- Added deterministic entity-and-category fallback so a malformed or unavailable
  model response cannot leave a stale graph in production.

## [0.0.2] - 2026-08-11

### Added

- Synced two episodes from the official Nikhil Kamath Podcasts catalogue:
  - *Nikos Christodoulides on Why India Must Lead What Comes Next* (`RSB58m7Xwhg`)
  - *Two Pharma Giants Who'd Never Met — Mankind & Dr. Reddy's* (`WMRO9dvD5T0`)
- Added their source transcripts and refreshed the browser catalogue.

### Changed

- Added bounded answer-model fallback: Llama 3.3 70B falls back to Llama 3.1
  8B if it cannot produce a first token within 12 seconds.
- The chat UI now identifies answers produced by a fallback model.

### Fixed

- Prevented a slow upstream model from consuming Vercel's entire function
  duration before a fallback could be attempted.
- Preserved searchable transcript passages when YouTube's timestamp API is
  unavailable, instead of dropping those episodes from the vector index.

## [0.0.1] - 2026-08-10

### Added

- Initial WTF Media catalogue, transcript retrieval, embedding-backed Ask WTF
  experience, episode browser, and connections experience.

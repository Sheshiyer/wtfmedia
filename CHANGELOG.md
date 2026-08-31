# Changelog

All notable user-facing releases are recorded here. Versions follow semantic
versioning; the web application version is held in `web/package.json`.

## [0.1.4] - 2026-08-31

### Changed

- Adopted the owner-approved WTF OS shell contract: a header wordmark and
  keyboard-safe operations disclosure above a scroll-safe application dock.
- Added a deterministic development-only local RAG fallback for `/api/chat`
  while preserving the Cloudflare service-binding production path and source
  headers.

## [Unreleased]

### Added

- Added episode-scoped Ask WTF retrieval from dedicated episode workspaces,
  while preserving separate public episode and private uncut asset identities.
- Added a fail-closed activation preflight that verifies mapped uncut bytes,
  storage keys, and content hashes before production upload or ingestion.

### Fixed

- Restored the reviewed calendar Worker module and migration still imported by
  `main`, returning the edge bundle to a deployable state.

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

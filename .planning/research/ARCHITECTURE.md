# Architecture Research: One Brain Re-foundation

**Project:** WTF Media
**Milestone:** v1.0 One Brain Re-foundation
**Researched:** 2026-08-18
**Overall confidence:** HIGH for repository topology and integration boundaries; MEDIUM for the not-yet-selected identity provider and operational persistence product

## Recommendation in One Sentence

Keep the shipping catalogue and `/api/chat` as a compatibility projection, add an authenticated `/ops` projection beside it, and make both consume explicit server-only read models built from one canonical episode-and-evidence spine rather than letting routes, adapters, or UI components become competing systems of record.

## Baseline: What Exists Today

The current application has a small, understandable deployment shape that should be evolved rather than replaced:

```text
anonymous browser
  ├─ GET /, /episodes, /connections       → Next.js on Vercel
  │                                          └─ repository-owned JSON and public transcript assets
  ├─ GET /chat                            → client-side chat surface
  └─ POST /api/chat                       → Vercel Route Handler
                                               └─ authenticated server-to-server call
                                                   → Cloudflare Worker /v1/chat
                                                       ├─ KV rate/idempotency state
                                                       ├─ Vectorize retrieval projection
                                                       └─ Workers AI embedding + answer

approved ingestion caller
  └─ authenticated enqueue                → Cloudflare Queue
                                               └─ Worker consumer
                                                   ├─ R2 transcript/timestamp objects
                                                   ├─ Vectorize upserts
                                                   └─ KV content-hash checkpoint
```

### Proven baseline strengths

- The public URL surface is narrow and already deployed: `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat`.
- The browser never receives the Worker shared secret. `/api/chat` is the Vercel boundary, and direct Worker chat rejects unauthenticated callers.
- The repository contains a public 55-episode catalogue projection, a generated provenance manifest, transcript assets, a curated connections projection, and protected RAG behavior.
- R2/Queue form the durable retrieval handoff, Vectorize is rebuildable, and KV records transient ingestion/rate state rather than being treated as the product database.
- Timed citations are emitted only when a retrieved passage has verified timing. Untimed sources remain video-level links.

### Baseline integration constraints

| Area | Current shape | Architectural consequence |
|---|---|---|
| Root layout | One global layout owns public header, footer, navigation, and custom cursor | It cannot safely become the operator shell; the document root must become neutral and public/ops shells must be nested below it. |
| Episode data | Server modules import repository JSON; the public browser receives episode objects | Preserve this as the initial public adapter, then replace its implementation behind a stable public DTO after canonical parity is proven. |
| Transcript UI | A monolithic client drawer fetches public JSON, then falls back to text | Split data loading from interaction. Private/operator transcripts must never be served from the public asset directory. |
| Connections | A static curated graph plus a pointer-driven canvas client | Share graph-domain queries only. Public and operator views need separate policy DTOs and client state; the public view also needs a semantic list/table equivalent. |
| Ask WTF | A client page posts to `/api/chat`; the route forwards the last user question and returns text plus source/model/fallback headers | Freeze this request/response contract behind tests. Add operator scope through a separate authenticated contract, not by silently changing the public handler. |
| Styling | Tailwind aliases and global classes contain raw brand values and behavior | Introduce semantic tokens first, then migrate consumers. Do not delete old classes until all public snapshots pass. |
| Authentication | No auth/session/DAL implementation is present | Authentication and authorization are new foundations. Hiding UI or checking only an `/ops` layout is insufficient. |
| Operational persistence | No repository-backed operational database or repository layer is present | Select persistence in an owned phase; architecture depends on a relational contract, not on a specific vendor in this research file. |

### Important current limitation

The repository has a provenance manifest for the public retrieval corpus, but it does not yet have the canonical internal episode, asset, workflow, person, metric, reconciliation, or permission records required by One Brain. The existing public video identifier is a useful external identity, not a safe primary key for the internal domain.

## Architectural Invariants

1. `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` remain stable until a tested replacement or redirect is explicitly approved.
2. A source-code route group may change file organization, never the public URL contract. Next.js route groups are omitted from URL paths by design.
3. Public and operator surfaces share domain facts and design foundations, not authorization policies, DTOs, navigation, or interaction state.
4. One stable internal `episodeId` is the canonical join key. Provider identifiers are external identities attached to it.
5. Clean-cut and published-video time are separate coordinate systems. A verified mapping may relate them; neither timeline overwrites the other.
6. A citation targets evidence, not merely an episode. A timed citation must resolve through a verified segment and asset timeline.
7. External integrations first produce read-only observations. They do not directly overwrite canonical entities.
8. Missing, stale, denied, and failed data are distinct states. None may be coerced to zero, empty success, or guessed metadata.
9. Authorization executes at the server data/action boundary for every protected operation. Layout checks are an experience optimization, not the security boundary.
10. Credentials, private source paths, raw provider failures, and internal-only fields do not enter browser DTOs, logs intended for operators, or public error bodies.

## Target Topology

```text
                           ┌─────────────────────────────────────┐
                           │ Next.js document root                │
                           │ fonts · metadata defaults · tokens   │
                           └──────────────┬──────────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
              ┌──────────▼──────────┐           ┌──────────▼──────────┐
              │ (public) projection │           │ (ops)/ops projection│
              │ PublicShell         │           │ OperatorShell        │
              │ anonymous DTOs      │           │ authenticated DTOs   │
              └──────────┬──────────┘           └──────────┬──────────┘
                         │                                 │
                  public queries                  auth + capability checks
                         │                                 │
              ┌──────────▼─────────────────────────────────▼──────────┐
              │ Server-only application layer                         │
              │ PublicCatalogueQueries · OperatorQueries · Commands   │
              │ projection mappers · availability/failure envelopes   │
              └──────────┬─────────────────────────────────┬──────────┘
                         │                                 │
             ┌───────────▼────────────┐       ┌────────────▼───────────┐
             │ Canonical domain store │       │ Evidence query service │
             │ episodes/assets/work   │       │ passages/citations/RAG │
             │ people/metrics/audit   │       │ public + scoped ports   │
             └───────────┬────────────┘       └────────────┬───────────┘
                         │                                 │
              reconciliation service            existing protected edge RAG
                         │                        plus versioned extensions
             ┌───────────▼─────────────────────────────────▼──────────┐
             │ Read-only integration adapters                         │
             │ observations · checkpoints · health · retry · conflicts│
             └────────────────────────────────────────────────────────┘
```

This is a modular monolith at the web/application boundary, not a microservice program. Domain modules and ports should be explicit, but they should deploy with the Next.js application until scale, ownership, or security evidence requires another service boundary. The existing Cloudflare RAG Worker remains a separately deployed evidence service because that boundary already exists and is protected.

## Recommended Repository Shape

The exact filenames may evolve during planning, but the boundaries should remain recognizable:

```text
web/
  app/
    layout.tsx                         neutral document root
    (public)/
      layout.tsx                       PublicShell
      page.tsx
      episodes/
      connections/
      chat/
    (ops)/
      ops/
        layout.tsx                     authenticated OperatorShell
        page.tsx                       Control Room
        episodes/
        knowledge/
        production/
        analytics/
        people/
        settings/integrations/
    api/
      chat/route.ts                    frozen public compatibility adapter
      ops/                              authenticated, versioned operator APIs only where needed
  components/
    brand/                              visual identity only
    ui/                                 accessible, domain-free primitives
    patterns/                           reusable state/layout behaviors
    domain/                             serializable domain DTO renderers
    shells/                             projection-specific shells
  domain/
    episode/                            entities, invariants, IDs
    evidence/                           transcript, segment, citation, timeline map
    workflow/                           stages, ownership, blockers, activity
    analytics/                          metric value + platform + reporting window
    people/                             person, guest, lead, evidence-backed relations
    integrations/                       observation, sync run, health, reconciliation
  server/
    auth/                               session and capability policy; provider adapter
    dal/                                server-only repositories and authorized queries
    projections/                        allowlisted public/operator DTO mappers
    adapters/                           read-only external system adapters
    reconciliation/                     matching, conflicts, promotion decisions
  styles/
    tokens.css
    themes.css
    motion.css
  tests/
    contracts/
    authorization/
    accessibility/
    visual/
    journeys/
```

Use `server-only` guards on DAL, credentials, adapter clients, and projection mappers that can see protected fields. Domain types may be shared only when they contain no secrets and are not mistaken for browser DTOs.

## Route and Permission Seams

| Surface | Audience | Authentication | Authorized data projection | Contract rule |
|---|---|---|---|---|
| `/`, `/episodes`, public episode detail | Anonymous | None | Published catalogue fields and public evidence only | Existing URL/query behavior remains; any detail route is additive. |
| `/connections` | Anonymous | None | Curated public themes and episode evidence | Must not expose saved evidence, internal notes, people leads, or workflow state. |
| `/chat` | Anonymous | None | Public Ask WTF sources | Keep `/chat` canonical during migration. Model/routing diagnostics move out of the public experience. |
| `/api/chat` | Anonymous browser through bounded Vercel endpoint | Rate/input controls; Worker call is server-authenticated | Existing public RAG compatibility DTO | Preserve request shape, response body behavior, headers, status codes, limits, and secret boundary. |
| `/ops/**` | Signed-in operator | Required in server layout and leaf data access | Capability-filtered operator DTO | Anonymous users receive a non-leaking redirect or denial. |
| `/api/ops/**` and Server Actions | Signed-in operator | Required per handler/action | Minimum fields for that capability and workspace | Every entry point re-checks authorization; UI visibility is not permission. |
| Integration administration | Restricted operator capability | Strong session plus integration-management capability | Health, scope, last sync, safe failure code, retry action | Never return credentials, raw storage paths, or provider response bodies. |

Next.js recommends a server-only Data Access Layer that performs authorization and returns minimal DTOs. It also warns that layout checks do not replace checks in Server Actions and Route Handlers. Apply those rules directly here: `OperatorShell` may redirect early, but every DAL query, operator API, and future mutation verifies the current principal and requested capability again. See the official [authentication guide](https://nextjs.org/docs/app/guides/authentication) and [data security guide](https://nextjs.org/docs/app/guides/data-security).

### Authorization model

Start with capabilities rather than scattering role-name conditionals through pages:

```text
episode:read-internal
episode:manage
evidence:read-internal
workflow:manage
analytics:read
people:read-sensitive
integration:inspect
integration:retry
```

Roles may map to capability sets, but repositories and actions check capabilities. Record actor, capability, entity, outcome, and time for consequential commands without recording request or response bodies. The exact identity provider, session storage, role catalogue, invitation flow, and MFA policy remain **UNKNOWN** and need an owned security/auth phase before implementation.

## Canonical Domain and Source-of-Truth Rules

### Episode is the join point

```text
Show/IP ──< Episode >── ExternalIdentity
                ├─────< Asset ──< TranscriptVersion ──< TranscriptSegment
                │          └──── TimelineMap ──── paired Asset
                ├─────< Citation / EvidenceReference
                ├────── WorkflowRecord ──< WorkflowEvent / Blocker
                ├─────< ClipCandidate
                ├─────< MetricObservation
                ├─────< EpisodePersonRole >──── Person
                └─────< ReconciliationIssue / AuditEvent
```

| Record | Canonical key and ownership | Source-of-truth rule |
|---|---|---|
| `Episode` | Stable opaque internal `episodeId` | Canonical identity and join root. Never reuse a provider video ID as the primary key. |
| `ExternalIdentity` | `(provider, externalId)` unique, linked to `episodeId` | Lets public video IDs and future systems reconcile without changing internal identity. |
| `ShowIP` | Stable internal `showId` | Names the editorial property independently of playlist/provider naming drift. |
| `Asset` | `assetId`, `episodeId`, kind, version, source class | Distinguishes source media, clean cut, published video, audio, thumbnail, and derivative. References are credential-free handles, not browser-visible private paths. |
| `TranscriptVersion` | `transcriptId`, `assetId`, content hash, format/language, timing coverage | Bound to exactly one source asset/version. New ingests create or confirm a version; they do not silently mutate history. |
| `TranscriptSegment` | `segmentId`, transcript-relative range, text/content hash | Citation anchor. Timing is optional and explicitly qualified. |
| `TimelineMap` | Mapping version plus source/target `assetId` | Stores verified interval mappings between clean-cut and published timelines. Absence means “unmapped,” not “same time.” |
| `Citation` | `citationId`, `segmentId`, selected asset coordinate | Resolves a claim to evidence and only adds a timestamp URL when that coordinate is verified. |
| `WorkflowRecord` | One current workflow record per episode | Holds current stage, accountable owner, due/blocker state; append-only events explain changes. |
| `MetricObservation` | Episode/show, platform, metric, reporting window, observed time | A value is invalid without platform and reporting-window provenance. Unavailable is a state, not numeric zero. |
| `EpisodePersonRole` | Episode, person, role, evidence/authority | Transcript mention alone cannot establish guest, lead, owner, host, or employer status. |
| `IntegrationObservation` | Adapter, external record ID, observed version/hash | Immutable staging evidence. It becomes canonical only through deterministic or reviewed reconciliation. |
| `ReconciliationIssue` | Source observation(s), candidate target(s), status | Makes missing, duplicate, conflict, and ambiguous matches operator-visible. |

### Authority hierarchy

1. The operational relational store is authoritative for canonical IDs, relationships, permissions, workflow state, reconciliation decisions, and audit metadata.
2. Approved source assets/object storage are authoritative for media and transcript bytes. The operational store retains hashes and safe handles.
3. The current repository catalogue and provenance manifest remain the public compatibility source until canonical backfill reaches tested parity. They then become generated/versioned public projections rather than a second authoring source.
4. R2 is the durable handoff for the existing retrieval corpus; Vectorize is a derived search index; KV is pipeline/rate state. None is the canonical workflow database.
5. External platforms are authoritative for what they observed about themselves. Their data enters through immutable observations and reconciliation, never blind last-write-wins updates.
6. UI state and AI synthesis are never authoritative domain records. Saving an answer creates an explicit evidence object referencing its sources and model/run metadata.

## Dual-Timeline Contract

Clean-cut and published-video timelines must be modeled as coordinates on specific asset versions:

```typescript
type TimeCoordinate = {
  assetId: string
  seconds: number
  basis: "verified-caption" | "verified-edit-map" | "manual-review"
}

type TimelineMapSegment = {
  sourceAssetId: string
  sourceStart: number
  sourceEnd: number
  targetAssetId: string
  targetStart: number
  targetEnd: number
  status: "verified" | "needs-review"
}
```

Mapping belongs to an asset-pair/version, not to the episode globally. A citation-opening service receives the citation plus requested projection and returns one of:

- a verified coordinate on that asset;
- a verified mapped coordinate with mapping provenance;
- the original asset coordinate when it is safe and accessible; or
- `unavailable: timeline_unmapped`.

It must never copy a clean-cut timestamp onto a published video by assumption. Re-ingesting a changed asset invalidates or versions affected mappings and citations rather than mutating them invisibly.

## Projection Architecture

### Public projection

`PublicEpisodeDTO`, `PublicConnectionDTO`, and `PublicCitationDTO` are explicit allowlists. They may include published title, show label, public thumbnail, public video identity, duration/view metadata already supported by the catalogue, public transcript availability, public themes, and safe citation coordinates. They must exclude workflow, blockers, budgets, leads, internal owners, source storage handles, adapter health, audit history, and private evidence.

The first implementation should wrap the existing repository JSON behind `PublicCatalogueQueries` without changing output. After the canonical store is populated, run both readers in shadow parity and only switch the implementation when stable IDs, counts, titles, URLs, transcript availability, connection membership, and citation behavior match approved tolerances.

### Operator projection

Operator DTOs are workspace- and capability-specific rather than one “full episode” object:

- `EpisodeWorkspaceDTO`: identity, current stage/owner, asset readiness, transcript/timeline summaries, blockers, recent activity.
- `TranscriptWorkspaceDTO`: safe asset labels, transcript segments, timing coverage, citation/opening affordances.
- `ControlRoomDTO`: counts and next actions derived from authorized workflow records, each with a pre-filtered destination.
- `KnowledgeDTO`: active scope, evidence results, saved evidence, retrieval availability.
- `PerformanceDTO`: platform, reporting window, freshness, value or explicit availability state.
- `IntegrationStatusDTO`: permission mode, last attempt/success, safe health code, next retry, owner.

Do not serialize canonical database records directly into Client Components. DTO mapping is both a security boundary and a decoupling seam.

## Server, Client, URL, and Cache Ownership

| State or behavior | Owner | Why |
|---|---|---|
| Session, principal, capabilities | Server auth/DAL | Never trust browser state for access. |
| Canonical records and reconciliation | Server repositories/domain services | Shared durable truth with invariants and audit. |
| Route data loading | Server Components by default | Keeps credentials and protected fields off the client and reduces client JavaScript. |
| Workspace filters, tab, page, search scope | URL search params/path | Supports refresh, back, share, deep link, and server rendering. |
| Drawer/dialog open state, focus, pointer/keyboard gestures | Leaf Client Components | Browser interaction is its proper boundary. |
| Unsaved composer text and transcript selection | Local client state | Ephemeral and private to the current interaction unless explicitly saved. |
| Streaming conversation display | Dedicated Client Component | Requires incremental body reading, cancellation, focus announcements, and scroll behavior. |
| Adapter health and sync checkpoints | Server operational store | Must survive sessions and be visible consistently to authorized operators. |
| Public catalogue cache | Static/generated or tagged cache | Public data changes on controlled publication/reconciliation events. |
| Operator/workflow reads | Per-request or deliberately short-lived cache | Permission and operational freshness take precedence over broad reuse. |

Place `'use client'` only at interactive leaf entry points; everything imported below that boundary enters the client graph, and props crossing it must be serializable. See the official [`use client` directive](https://nextjs.org/docs/app/api-reference/directives/use-client). Do not put the whole operator shell or episode workspace behind one client boundary.

Cache policy is part of each query contract. Public projections may use explicit revalidation tags keyed by canonical entities. Authenticated and permission-sensitive fetches should default to per-request behavior or explicit `no-store` until a permission-safe cache design is proven. Next.js documents per-fetch cache controls in its official [`fetch` reference](https://nextjs.org/docs/app/api-reference/functions/fetch).

## Data and Control Flows

### 1. Public catalogue read

```text
request → PublicShell Server Component
        → PublicCatalogueQueries
        → current repository adapter OR canonical public projection
        → PublicEpisodeDTO
        → server-rendered list/detail
        → small client islands for browsing/transcript interaction
```

Migration rule: the current adapter remains selectable until parity and route tests pass. A failed canonical projection must not cause internal fields to leak through a “temporary” direct database render.

### 2. Public Ask WTF compatibility flow

```text
/chat client → POST /api/chat (unchanged browser contract)
             → validate bounds
             → attach server-only Worker secret/request ID/IP hint
             → existing Worker /v1/chat
             → validate result
             → text body + existing X-Sources/X-Model/X-Fallback headers
```

Keep the compatibility route thin. Do not add operator session semantics, saved evidence, workflow writes, or private scope fields to `/api/chat`. Contract tests should snapshot success, abstention, validation failure, upstream 503, header encoding, timestamp omission, and browser-readable body behavior.

### 3. Operator route read

```text
/ops/... request
  → OperatorShell verifies session for early redirect
  → leaf Server Component calls authorized query
  → DAL re-verifies session + capability + entity scope
  → repository/domain service
  → minimal workspace DTO with availability metadata
  → Server Component + interactive leaf clients
```

An authorization failure returns no entity existence details. A partial integration failure returns the safe canonical portion plus a typed degraded source state when the principal may inspect it.

### 4. Scoped operator knowledge flow

```text
operator composer
  → authenticated operator knowledge endpoint/action
  → capability + requested episode/show scope validation
  → EvidenceQuery port
  → current public retrieval adapter OR future versioned scoped retrieval endpoint
  → evidence result with explicit quote/synthesis/source separation
  → optional explicit “save evidence” command
```

Episode/show filtering is not supported by the current Worker request contract. Add it behind a new versioned internal endpoint and labelled evaluation set; do not overload `/v1/chat` or pretend post-filtering six returned passages is equivalent to scoped retrieval. The precise retrieval extension is a **phase research flag**.

### 5. Read-only adapter ingestion and reconciliation

```text
scheduled/manual pull
  → adapter reads external records using server-held credential
  → normalize to IntegrationObservation
  → validate + content-hash deduplicate
  → match by explicit external identity, then deterministic evidence
  ├─ unique safe match → propose/link under reconciliation rule
  ├─ no match          → missing/unlinked issue
  ├─ many matches      → ambiguous issue
  └─ conflict          → field-level conflict issue
  → update sync checkpoint and safe health state
  → refresh affected operator projections
```

The adapter interface exposes `pull`, `health`, and `retry` only. No outbound publish/message/payment/task mutation belongs in v1.0. Adding any write method requires a separate approval, idempotency design, audit/rollback semantics, and authorization matrix.

### 6. Retrieval-corpus reconciliation

```text
canonical episode + approved transcript version
  → build provenance manifest/job with stable episode mapping and content hash
  → durable object handoff + idempotent queue
  → derived vector index
  → ingestion status observation
  → reconciliation report: canonical-only / corpus-only / hash drift / timing drift
```

The existing queue idempotency by content hash should be retained. Add stable internal episode linkage to the handoff contract without removing the current provider ID fields until every consumer is migrated.

## Read-Only Adapter Contract

All integrations should implement one port and produce the same operational envelope:

```typescript
type AdapterHealth =
  | { state: "healthy"; lastSuccessAt: string }
  | { state: "stale"; lastSuccessAt: string; observedAt: string }
  | { state: "degraded"; code: string; retryable: boolean }
  | { state: "permission-denied"; code: string }
  | { state: "unavailable"; code: string; retryable: boolean }

type IntegrationObservation<T> = {
  adapter: string
  externalId: string
  observedAt: string
  sourceVersion?: string
  contentHash: string
  payload: T
}
```

`payload` is a normalized, validated server-side value, not a raw response archived into the application database. Preserve only fields the domain needs. Raw assets stay in approved source storage. Public/operator errors expose stable safe codes and request IDs, not provider bodies or credentials.

## Failure-State Propagation

Use a shared availability vocabulary across DAL results, components, and adapter health:

| State | Server behavior | Operator behavior | Public behavior |
|---|---|---|---|
| `ready` | Return current DTO | Render data and actions | Render data |
| `partial` | Return safe data plus unavailable fields/sources | Label missing source and keep safe work usable | Omit internal detail; do not invent substitute data |
| `stale` | Return last known data with observed/refresh time | Show stale label, owner, and refresh/retry path | Use only if public policy permits; otherwise unavailable |
| `empty` | Successful query with no records | Explain why and next valid action | Honest empty state |
| `permission-denied` | 403/denial without entity leakage | Explain required access generically | Behave as not available; never enumerate protected records |
| `unavailable` | Typed code, retryability, request ID | Show what failed, what remains safe, and retry/owner | Generic safe failure; no provider details |
| `conflict` | Preserve both observations and reconciliation issue | Show competing sources and require resolution | Keep last approved public projection |

Route-level `loading.tsx` and `error.tsx` handle shell/page boundaries; pattern components handle field/panel partiality. Errors crossing server/client boundaries must be serializable and sanitized. Public RAG continues returning generic 503 errors on upstream failure. Operator retry actions record attempt/outcome and never turn a failed pull into an empty successful dataset.

## Design-System Integration Boundary

The design system should evolve in five layers with one-way dependency:

```text
semantic tokens → accessible UI primitives → reusable patterns → domain components → projection shells/routes
```

- `brand/` may depend on tokens but not on operational domain data.
- `ui/` has no episode, integration, or permission knowledge.
- `patterns/` owns state-complete behavior such as DataTable, Timeline, EmptyState, ErrorState, and IntegrationStatus.
- `domain/` accepts serializable DTOs and emits intent callbacks/links; it does not fetch canonical records directly.
- `shells/` controls public versus operator navigation, density, effects, and context.

Public and operator surfaces share tokens/primitives, but contextual theme mappings are allowed. Public-only effects such as the custom cursor and looping brand motion must not live in the neutral document root. Selective headless primitives sit below repository-owned components; dependency installation remains owned by the implementation phase with its tests.

## New and Modified Components

| Boundary | Action | Responsibility |
|---|---|---|
| Neutral root layout | Modify | Retain document metadata/font foundations; remove public navigation, footer, and cursor. |
| `PublicShell` | New from current layout | Own current public navigation/footer/brand effects and public-only DTOs. |
| `OperatorShell` | New | Verify session, render persistent rail/context/status/next action, pass minimal principal DTO. |
| Current public pages | Move into route group, then migrate | Keep URLs and behavior; consume public query interfaces rather than raw canonical records. |
| Public chat route handler | Keep and harden | Remain a compatibility adapter to protected edge RAG. |
| Operator knowledge endpoint | New | Authenticated scope validation and structured evidence contract; no public contract reuse. |
| Episode browser | Split | Server-loaded collection plus client interaction islands; URL-backed filters where shareable. |
| Episode drawer/transcript reader | Replace incrementally | Accessible overlay/workspace behavior, source asset identity, verified timing and untimed states. |
| Connection graph | Modify | Canvas visualization plus semantic list/table; separate public and operator projection inputs. |
| Model picker | Remove from public / gate internally | Diagnostics are internal and capability-controlled, not a public product choice. |
| DAL + projection mappers | New | Centralize authorization, repositories, safe DTOs, and availability envelopes. |
| Canonical domain modules | New | Enforce episode, evidence, timeline, workflow, metrics, people, and reconciliation invariants. |
| Adapter/reconciliation modules | New | Read-only observations, health, dedupe, matching, conflicts, retry. |
| Token/primitive/pattern layers | New plus migration | Preserve WTF identity while replacing raw role drift and bespoke accessibility behavior. |

## Dependency and Build Order

Two foundations can begin in parallel after contracts are frozen: the provenance domain and the visual/test foundation. They converge at the first authenticated episode workspace.

1. **Freeze compatibility and define contracts**
   - Snapshot public routes, query strings, deep links, `/api/chat` request/response/headers/statuses, public DTOs, RAG abstention, and citation timing behavior.
   - Define canonical IDs, availability/failure envelopes, capability vocabulary, and repository ports before selecting vendors.

2. **Create the design/test foundation**
   - Add semantic tokens, themes, motion/focus policy, representative fixtures, component stories, accessibility and visual harnesses.
   - Prove a small primitive set inside one real public component; do not build the entire library speculatively.

3. **Create the provenance spine in shadow mode**
   - Implement canonical episode/external identity/asset/transcript/timeline/citation schemas and repositories.
   - Import the public manifest/catalogue into a reconciliation report without switching readers or writing external systems.

4. **Split shells without changing URLs**
   - Make the root neutral; move public pages into `(public)` and add `PublicShell`.
   - Add auth provider adapter, server-only DAL, capability checks, and `(ops)/ops` shell.
   - Route groups omit their folder names from URLs; use one common root plus nested layouts to avoid unnecessary cross-root navigation behavior. Official Next.js project-structure guidance documents this behavior: [route groups and layouts](https://nextjs.org/docs/app/getting-started/project-structure).

5. **Migrate and prove the public projection**
   - Move home, episodes, connections, and chat components onto tokens/primitives/public DTOs one vertical slice at a time.
   - Keep `/api/chat` unchanged. Run compatibility, visual, accessibility, and RAG tests after each slice.

6. **Ship one canonical operator episode slice**
   - Control Room summary → episode workspace → source asset → transcript → verified citation → workflow owner/next action.
   - This is the first convergence of auth, canonical data, design patterns, and failure states.

7. **Add scoped Knowledge**
   - Introduce the separate authenticated evidence endpoint, explicit episode/show scope, quote-versus-synthesis DTO, saved evidence, and evaluated retrieval extension.

8. **Add production workflow modules**
   - Production board/calendar, clips, briefs, owners, blockers, and activity all operate on the same episode/workflow records.

9. **Add analytics and people projections**
   - Enforce platform/window availability and evidence-backed person roles before rendering aggregates or lead status.

10. **Add read-only adapters one at a time**
    - Each phase owns one adapter's contract fixtures, authorization, health, retry, reconciliation, and privacy tests.
    - Do not add outbound methods as “future-proofing.”

11. **Cut over generated public projections and remove legacy code**
    - Shadow compare current and canonical projections first.
    - Remove old globals, direct JSON consumers, and monolithic clients only when no consumers remain and all protected route/API tests pass.

## Incremental Migration Rules

| Migration | Safe sequence | Rollback seam |
|---|---|---|
| Route groups | Add contract tests → neutralize root → move one public route → verify URL/output → move next | Move route source back; no data migration involved. |
| Public catalogue reader | Introduce interface around current JSON → implement canonical adapter → shadow parity → feature-controlled cutover | Select existing repository adapter. |
| Transcript reader | Preserve current public fallback → add typed transcript DTO → add asset/timing states → migrate drawer/workspace | Keep old drawer behind the public adapter until parity. |
| `/api/chat` | Freeze tests → refactor internal helper only → verify production-shaped fixtures | Revert helper selection; external contract unchanged. |
| Design tokens | Add aliases matching computed styles → migrate component → snapshot/contrast test → delete raw use later | Alias back to current values/classes. |
| Authenticated shell | Add auth/DAL → deny by default → enable fixture users → add workspace routes | Remove `/ops` exposure without affecting public routes. |
| Canonical records | Import to shadow tables/store → reconcile → report conflicts → approve projection cutover | Continue reading public generated files; never destructive-replace source data. |
| Adapter | Fixture pull → dry-run observations → reconciliation UI → controlled live read | Disable adapter; retain last approved canonical state and sync audit. |

## Architecture Risks and Mitigations

### 1. Public/internal data leakage through shared types

**Risk:** A convenient `Episode` object grows internal fields and is serialized by a public page or Client Component.

**Mitigation:** Separate canonical records from allowlisted `Public*DTO` and capability-specific operator DTOs; test anonymous responses for forbidden field classes.

### 2. Layout-only authorization

**Risk:** A protected-looking shell hides navigation while direct Route Handler, Server Action, or DAL access remains possible.

**Mitigation:** Verify at every server entry point and inside authorized queries; add an anonymous/role/capability matrix test.

### 3. Three competing episode identities

**Risk:** Repository episode rows, retrieval corpus records, and adapter records each become “the episode.”

**Mitigation:** Create stable internal IDs plus unique external identities, then make reconciliation explicit and report corpus-only/canonical-only records.

### 4. Timeline collapse

**Risk:** A timestamp is treated as universal across source, clean cut, and published video.

**Mitigation:** Require `assetId` on every coordinate and version mappings. Unknown mapping disables target-timeline navigation.

### 5. Retrieval contract drift

**Risk:** Operator scope or structured responses silently break public `/api/chat` clients and citation parsing.

**Mitigation:** Keep the public compatibility adapter and add a new versioned authenticated evidence contract with independent evaluations.

### 6. External observation overwrites canonical truth

**Risk:** Polling order or an intermittent provider changes owners, dates, people roles, or stages incorrectly.

**Mitigation:** Immutable observations, deterministic matching, conflict queue, explicit field authority, and no last-write-wins merge.

### 7. Public transcript storage reused for private evidence

**Risk:** Operator-only transcripts or source artifacts are placed under the web public directory because the current drawer fetches there.

**Mitigation:** Public assets remain explicitly publishable. All private evidence loads through authenticated server queries using safe handles.

### 8. Cache crosses permission or freshness boundaries

**Risk:** A broad cached query serves protected or stale operator data to another context.

**Mitigation:** Cache public projections explicitly; keep permission-sensitive reads request-scoped until cache keys include all authorization and tenancy dimensions and tests prove isolation.

### 9. Design system becomes a parallel product rewrite

**Risk:** A large primitive migration delays the provenance slice or erases WTF identity.

**Mitigation:** One-way layers, semantic aliases, real-workflow proof, and old-class removal only after consumer migration.

### 10. “Unavailable” becomes zero

**Risk:** Failed analytics or integration pulls render plausible empty metrics and drive wrong decisions.

**Mitigation:** Typed availability states, required reporting windows, stale timestamps, explicit retry/owner, and fixture tests for every failure mode.

## Validation Probes

### Contract and routing

- Route inventory test proves anonymous GET behavior for `/`, `/episodes`, `/connections`, and `/chat` before and after source moves.
- Public navigation, supported query strings, bookmarks, and deep links remain stable.
- `/api/chat` contract fixtures cover 400, 413/limits where applicable, 429 at the edge, 503, 200 grounded, 200 abstention, source header encoding, and timestamp omission.
- Direct Worker chat without its shared secret remains HTTP 401.
- Build/type generation probes remain `npm run build --prefix web` and the Cloudflare type-generation script owned by that package.

### Authorization and privacy

- Anonymous users cannot enumerate internal tasks, budgets, leads, adapter health, or entity existence through HTML, RSC payloads, route handlers, or client bundles.
- Each operator route/API/action runs an anonymous/insufficient/sufficient capability matrix.
- Bundle and response scans find no server credentials, private storage handles, or raw provider bodies.
- Public DTO schema tests reject newly added canonical fields unless explicitly allowlisted.

### Provenance and reconciliation

- Stable internal episode IDs survive re-import; provider identity uniqueness is enforced.
- Repeated transcript ingestion with an unchanged content hash is idempotent.
- Catalogue reconciliation reports canonical-only, public-only, duplicate, and conflicting identities.
- Every transcript references an asset version; every timed citation resolves to a verified segment coordinate.
- Dual-timeline fixtures cover mapped, partially mapped, changed-version, and unmapped cases.

### Projections and failures

- Public and operator connection projections derive from shared evidence fixtures but have distinct field and interaction-state snapshots.
- Missing analytics renders unavailable, never zero.
- Adapter permission denial, timeout, malformed data, partial page, stale checkpoint, and retry exhaustion all yield distinct safe states.
- Control Room links land on correctly filtered workspaces and never count inaccessible records.

### UI boundary

- Component stories cover ready, loading, empty, partial, error, denied, stale/offline, disabled, focus, and reduced-motion states.
- Core internal routes pass keyboard, serious-axe, 320px, 768px, and 1440px probes.
- A bundle analysis confirms large domain/server dependencies did not enter client islands.
- Visual snapshots prove tokens preserve the committed public identity before legacy globals are removed.

## Phase Research Flags / Unknowns

| Topic | Status | Required decision before implementation |
|---|---|---|
| Identity provider and session model | UNKNOWN | Provider, invitations, MFA, session duration/revocation, user lifecycle, and deployment compatibility. |
| Operational persistence product | UNKNOWN | Select relational store/driver/migrations/backups after stack research; preserve the domain/repository contract above. |
| Capability matrix | PARTIAL | Product roles and sensitive-field access need owner/security confirmation. |
| Canonical backfill authority | PARTIAL | Define field-by-field authority and conflict owners for catalogue versus external observations. |
| Scoped RAG implementation | UNKNOWN | Validate filterable retrieval, structured evidence response, latency, and gold-set thresholds behind a separate contract. |
| Timeline reconciliation | UNKNOWN | Determine how edit maps are produced/reviewed and what verification threshold enables cross-asset jumps. |
| Adapter cadence and retention | UNKNOWN | Per-source polling/webhook support, rate limits, observation retention, and safe operator-visible metadata. |
| Audit retention/privacy | UNKNOWN | Retention periods and sensitive-field redaction need an owner-approved security/privacy policy. |

## Source Ledger

### Repository evidence — HIGH confidence

- `.planning/PROJECT.md` — milestone scope, compatibility, evidence, privacy, and read-only integration constraints.
- `DESIGN.md` — authoritative route split, shell/component layers, state completeness, visual migration, and target screen contracts.
- `ISA.md` — canonical acceptance criteria for permissions, provenance, dual timelines, adapters, quality, and anti-criteria.
- `PRODUCT.md` — shipping brand, voice, audience, and public Ask WTF identity.
- `web/app/layout.tsx` and current public route pages — global public shell and shipping route/component boundaries.
- `web/app/api/chat/route.ts` — Vercel-to-Worker secret boundary and public response contract.
- `web/components/EpisodesBrowser.tsx` and `web/components/ConnectionGraph.tsx` — current client-state and accessibility migration seams.
- `web/lib/episodes.ts`, `web/lib/connections.ts`, and repository data schemas — current public catalogue and graph projection contracts.
- `web/src/data/corpus-manifest.json` and its repository-owned generator — current content-hash and timing-coverage provenance contract.
- `cloudflare/src/index.ts` — edge retrieval, ingestion idempotency, direct-call authorization, safe errors, and citation checks.
- `docs/CLOUDFLARE-INFRASTRUCTURE.md`, `docs/CLOUDFLARE-MIGRATION-PLAN.md`, and `docs/PRODUCTION-EVALUATION.md` — deployed boundary, source-of-truth handoff, parity, and evaluation evidence.
- `web/package.json`, `web/tsconfig.json`, `web/tailwind.config.ts`, and `web/app/globals.css` — framework, strictness, token, and migration baseline.

### Current primary framework sources — HIGH confidence

- [Next.js project structure and route groups](https://nextjs.org/docs/app/getting-started/project-structure) — route groups organize code without changing URL paths; nested layouts can separate site sections.
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication) — authentication/session/authorization distinctions, DAL, DTO, and per-entry-point checks.
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security) — server-only DAL, authorization, minimal DTOs, and secret containment.
- [Next.js `use client` directive](https://nextjs.org/docs/app/api-reference/directives/use-client) — client entry boundary and serializable props.
- [Next.js server `fetch` reference](https://nextjs.org/docs/app/api-reference/functions/fetch) — explicit cache/no-store and revalidation semantics.

Context7 was queried against official Next.js v15 documentation for version-appropriate confirmation before the current official pages were checked. No external source overrides the repository's validated deployment facts or milestone authorities.

## Confidence Assessment

| Area | Confidence | Reason |
|---|---|---|
| Existing topology | HIGH | Directly traced through routes, components, data files, Worker code, scripts, and deployment documents. |
| Public/operator separation | HIGH | Required by project/design/ISA authorities and aligned with current Next.js route/data-security guidance. |
| Canonical provenance model | HIGH | Directly maps all active acceptance criteria and existing manifest/ingestion evidence without assuming a vendor. |
| Server/client and state boundaries | HIGH | Supported by current source shape and official Next.js documentation. |
| Adapter/reconciliation pattern | HIGH | Follows milestone read-only/evidence constraints and prevents identified overwrite/privacy failures. |
| Auth implementation | MEDIUM | Boundary is clear; provider, session, and role lifecycle remain intentionally undecided. |
| Operational persistence | MEDIUM | Relational and repository requirements are clear; product selection is delegated to stack/phase research. |
| Scoped retrieval and timeline generation | MEDIUM | Required contracts are clear, but the current Worker lacks scoped retrieval and no edit-map producer exists yet. |

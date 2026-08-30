# WTF OS current release integration and cutover plan

**Status:** active implementation plan; three-account inventory, target
foundation clone, reviewed integration, D1 calendar persistence, fresh paired
secrets, and both workers.dev preview deployments are complete. Source
quiesce/final-delta, DNS/domain authority, hostname cutover, and rollback gates
remain held below.
**Release posture:** temporary public link without Access. Visitors who know
the URL may view the product and list/create/update calendar records. Access
and fine-grained RBAC are next-release scope.

## Release objective

Ship the integrated WTF OS release at `wtfhq.in`: replace the Ask WTF shell
with the reviewed WTF OS design, reuse the existing Ask WTF inference stack for
published YouTube and uncut source modes, persist production-calendar changes,
and finish settings hygiene. Missing evidence must remain visibly unavailable;
the release cannot invent sources, timestamps, mappings, writes, or provider
connections.

## Locked decisions

- This release is deliberately ungated. Anyone who knows the URL may view it.
- Anonymous calendar `list`, `create`, and `update` are allowed for this short
  release window. Delete, bulk operations, ingestion administration,
  transcript activation, provider settings, and secrets are not public.
- Cloudflare Access and fine-grained RBAC are next-release work, targeted in
  approximately one week; they are not a current-release activation gate.
- `Internal` is still a candidate uncut pointer, not an activated master.
- The three unmatched catalogue rows are quarantined. See
  [`2026-08-30-wtfos-internal-release-decisions.md`](../../../.planning/inputs/client-questions/2026-08-30-wtfos-internal-release-decisions.md).
- UI examples are provisional and cannot be represented as editorial answers,
  verified alignment, or persisted operational evidence.
- The target uses the approved logical resource names and the migration map in
  [`2026-08-30-9d9d-cloudflare-migration-inventory.md`](../../../.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md).
- Wrangler profile roles are locked: `9d9d` is the read/copy source,
  repository-bound `wtfmedia` is the target that owns `wtfhq.in`, and
  `default` is an unrelated control account that must remain untouched.
- No WTF Pages project exists. `wtfmedia-web` remains an OpenNext Worker with
  static assets; creating Pages would add an unplanned architecture.

## Execution waves

### Target preview execution receipt — 2026-08-30

- Canonical release-integration source was reconciled with PR #23, verified,
  and deployed to the mapped `wtfmedia` profile as `wtfmedia-edge` and
  `wtfmedia-web`.
- D1 migration `0006_public_calendar.sql` is live. Same-origin public calendar
  list/create/update, optimistic revision, idempotent create, KV rate limits,
  append-only mutation receipts, no-delete enforcement, and UI refetch/failure
  behavior are implemented and verified.
- Fresh edge/web shared authority and ingest authority were generated and
  placed together through ephemeral mode-restricted files, then destroyed
  locally. No credential or account-scoped identifier is committed.
- Live workers.dev proof covers edge health, direct-call denial, web root,
  grounded Ask WTF retrieval, D1 calendar create/update/reload, responsive
  compact/desktop layout, truthful Settings/production copy, and clean browser
  console.
- The source `9d9d` estate remained read-only and `default` was untouched. No
  Pages resource, Access/RBAC, DNS, Custom Domain, source quiesce, final delta,
  or source deletion occurred.

### Wave 0 — evidence and release contract

**State:** complete locally.

- Record current view policy, deferred RBAC, deferred Access, source-mapping
  requirements, and the corrected three-row quarantine ledger.
- Make source data truthfulness an acceptance rule: no mock catalogue,
  fictional provenance, generated timestamp, or simulated write outcome.

### Wave 1 — review and integrate the WTF OS UI

**State:** integrated, verified, and deployed to the target workers.dev
preview. Custom-domain release remains held.

- Review the UI Wave 1 and Cloudflare web-migration worktrees, then integrate
  them as explicit, reviewable units. Do not merge uncommitted work by
  implication and do not overwrite root-worktree changes.
- Apply the existing ReactBits/MotionSites components through the WTF OS token
  system and motion preferences; do not install another component kit or turn
  catalogue components into a second visual system.
- Keep the operator UI honest: disconnected catalogue/provenance and
  unverified alignment render an unavailable state. No fixed demo episode,
  source asset, or timestamp appears in a release candidate.
- Verify mobile and desktop rendering, interaction, console, and failed network
  requests in a browser.

### Wave 2 — clone the Cloudflare foundation and add dual-source inference

**State:** target foundation clone and reviewed edge preview deployment
complete for the published catalogue. Dual-source Ask WTF (`published` /
`uncut`) plus KV, R2, Vectorize, and ingest-integration join is now **P0**
ahead of hostname cutover. Final uncut *activation* still waits on mapping
and editorial evidence.

- Define one privacy-safe DTO with explicit `sourceMode` (`published` or
  `uncut`), source asset/version, segment IDs, source timestamps, mapping
  status, and citation state.
- UI selector switches only between response-backed source versions. It shows
  the exact source timestamp; `unmapped`, `conflicted`, and
  `cut_from_published` remain explicit results.
- Reuse the existing R2 catalogue, Vectorize index contract, ingestion queue
  and DLQ, 55-key KV state, live Workers AI binding, and Ask WTF retrieval
  flow. NVIDIA remains a reviewed code/provider seam rather than a live
  Cloudflare resource proven by this inventory. Add `sourceMode` and
  source-version metadata; do not create a parallel inference system for uncut.
- Build parser/chunking/idempotency tests using synthetic fixtures. Do
  not put source payloads in Git or call them editorial evidence.
- After target R2 is enabled and the owner authorizes the write window, create
  target resource shells; copy 99 R2 objects/13.2 MB and 55 persistent KV keys;
  reproduce or deterministically rebuild 5,742 vectors; deploy the edge Worker
  with fresh target secrets; and reconcile counts as the initial bulk baseline.
  This first pass is not cutover consistency proof.
- Execution receipt: target R2, KV, Vectorize, both queues, and D1 now exist.
  R2 reconciles at 99 objects / 13,204,194 bytes with all-object hash equality;
  KV reconciles at 55 keys with value equality and no logged values; Vectorize
  reconciles at 5,742 unique matching IDs, 1,024 dimensions, and cosine.

### Wave 3 — production calendar persistence

**State:** complete on the target preview. Repository migrations `0001`–`0006`
are applied and live list/create/update persistence is verified.

- Add a canonical calendar DTO and validation contract: UTC instants plus
  `Asia/Kolkata` display default, event type, IP/show labels, owner, conflict
  state, and audit-safe revision metadata.
- Add a reviewed D1 calendar migration and make D1 the canonical backend.
- Allow anonymous list/create/update only through a strict same-origin API:
  validated DTOs, length and date bounds, idempotency keys, optimistic
  revisions, safe audit metadata, and KV-backed rate limiting. Do not expose
  delete in this release.
- On a successful mutation, invalidate/refetch the calendar, modal/detail
  windows, board, and relevant action flows. On failure, preserve the form and
  show the server result rather than optimistic success.
- Calendar provider projection/sync remains next-release work.

### Wave 4 — settings hygiene

**State:** integrated, truth-aligned with the D1-backed release, and deployed to
the target workers.dev preview.

- Bring settings navigation, appearance, connection truth, release version,
  and recovery guidance under the WTF OS shell.
- Expose connection state and configuration prerequisites, never fake a
  connected provider, live account, or persisted preference.

### Wave 5 — target deployment, domain mapping, and rollback proof

**State:** target Worker deployment and preview verification complete. Source
quiesce/final delta, capability-specific DNS/domain authority, hostname
cutover, observation, and rollback acceptance remain waiting. Remaining
operations are specified below; none of those steps is authorized by the
preview receipt.

- Deploy the reviewed edge Worker and integrated web Worker to the target
  account with target-owned bindings and newly supplied secrets.
- In a separately owner-authorized cutover window, record the source Worker and
  queue before-state, stop new source ingestion/producers, settle the source
  queue, copy the final R2/KV delta, and reconcile or rebuild Vectorize from the
  final target R2 set. Restore source settings and abort if any count or queue
  disposition is unexplained.
- Attach the `wtfhq.in` custom domain only after both Worker health and backend
  integration checks pass.
- Verify desktop and mobile UI, published/uncut retrieval and citations,
  calendar persistence across sessions, settings truth, console/network health,
  and source/target inventory reconciliation.
- Keep every source data resource through the observation window. The verified
  emergency endpoint is
  `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/`; current rollback
  removes the target Custom Domain to restore the pre-cutover no-apex state,
  communicates that source URL, and restores any quiesced source settings.
  This is not same-host continuity. The owner must accept that outage model or
  approve a separately reviewed/rehearsed same-host route before cutover.

### Remaining cutover operations — after workers.dev preview

**Recorded:** 2026-08-30. Planning only. No source quiesce, DNS write, Custom
Domain attach, secret rotation, or `default` mutation is authorized by this
section.

**Canonical preview (already live):**

- Integration worktree: `wtfmedia-release-integration` at `be304bd`
- Web: `https://wtfmedia-web.connect2nikhai.workers.dev`
- Edge health: `https://wtfmedia-edge.connect2nikhai.workers.dev/v1/health`
- Profiles: source reads `--profile 9d9d`; target writes `--profile wtfmedia`;
  never omit a profile; never use `default`

**This worktree is not the deployed unit.** The dirty `wtfmedia` checkout holds
ungated AppRail navigation, dual-source `sourceMode`, and the Excel title map.
Those changes are local and not on `be304bd`. The deployed shell is the
integration dock (no fixed left rail). Joining this worktree into the preview
is a separate review, not implied by cutover.

Inventory steps 1–9 are complete. Remaining inventory order is 10 → 11 → 12.

#### Hard holds

Do not do any of these until the named HITL gate passes:

- Pause, drain, or restore `9d9d` ingest producers/consumers
- Copy a final R2/KV/Vectorize delta
- Attach or change `wtfhq.in` DNS or a Workers Custom Domain
- Create Pages, Access, or RBAC
- Delete or overwrite source data
- Touch the `default` account

`docs/CLOUDFLARE-WEB-MIGRATION.md` in the integration tree still describes
Vercel rollback and `/ops` Access mapping. That document is stale against this
release: rollback is Custom Domain removal plus the source workers.dev URL;
Access is Wave 6.

#### HITL lock — 2026-08-30

Owner answers recorded for the remaining window:

- Canonical cutover source: integration preview as deployed
  (`wtfmedia-release-integration` @ `be304bd`). This checkout's ungated rail,
  title map, and `sourceMode` stay out of the hostname window.
- Rollback model: accept no-apex outage. If cutover fails, remove the target
  Custom Domain; emergency URL is
  `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/`.
- Next action: read-only DNS / Custom Domain authority probe on
  `--profile wtfmedia` only.

#### Remaining priority list — 2026-08-30

Hostname cutover stays held. Product work before that window is ordered
below. **P0 is Ask WTF chat for YouTube published (released) and uncut**,
because that path is what writes and reads KV, R2 assets, Vectorize, the
ingest queue, and Settings integrations. Do not attach `wtfhq.in` until P0
is joined into the canonical preview or explicitly waived.

| Pri | Work | Why it is here | Current truth |
| --- | --- | --- | --- |
| **P0** | Ask WTF `/chat`: `published` (YouTube released) and `uncut`, including the stores it touches | One retrieval stack. A wrong `source_mode` contaminates KV idempotency, R2 objects, vector metadata, and ingest jobs. | **Done on preview.** Joined in `bd041a3` and deployed. Published grounded with six sources; uncut returns zero sources and does not convert published times. |
| **P0a** | KV `WTFMEDIA_STATE` | Ingest keys are `ingest:{videoId}` and currently imply published. Rate-limit keys `rate:{window}:{ip}` stay shared. Uncut must not overwrite a published content hash. | 55 persistent keys copied. Values not printed. Live ingest still stamps `source_mode: "published"`. |
| **P0b** | R2 `wtfmedia-catalogue` assets | Published transcripts/sidecars are the 99-object copy. Uncut audio/video objects are not activated. Object metadata must name `sourceMode`; published bytes are never relabelled uncut. | 99 objects / 13,204,194 bytes reconciled. Uncut pointers remain `candidate` / `not-activated`. |
| **P0c** | Vectorize `wtfmedia-catalogue-v1` | Filter `source_mode` **before** composition. Missing metadata = published. A published timestamp is never rewritten as uncut. | 5,742 vectors, 1,024 / cosine. Filter is live on `wtfmedia-edge`. |
| **P0d** | Integrations / Settings | YouTube sync and captions are the published ingest path. Uncut upload, ASR, and transcript activation stay fail-closed. NVIDIA is a code seam, not a live binding. Settings must keep connections **not configured**; do not fake a connected provider. | Ingest admin mutations remain closed. Calendar provider sync is next-release. |
| **P0e** | Title map (ops episode map) | Exact-title map 59 mapped / 3 quarantined. Not a live catalogue. Quarantine stays excluded from R2, KV, vectors, and answers. | **Done on preview.** Renders on `/ops/episodes`. |
| **P1** | D1 production calendar | Already live on the preview. Do not regress list/create/update or re-open delete. | `0006` applied; anonymous receipts; no actor identity. |
| **P2** | Ungated all-pages rail in this checkout | Optional join. Not required for Ask WTF dual-source. | Local only; Playwright click-through unverified. |
| **P3** | Source high-water, quiesce, final delta, `wtfhq.in` attach | Cutover window. P0 join no longer blocks it; still needs a separate owner window. | DNS zone visible; Custom Domain list empty; DNS-record API 403. |
| **P4** | Access/RBAC; 20-query key; ten alignments; three quarantine dispositions | Next release / editorial activation. Do not block the published chat path. | Explicitly deferred. |

P0 join target is the canonical integration worktree, not a second Worker stack. Reuse R2, KV, Vectorize, queue, and Workers AI; add `sourceMode`. Do not ingest uncut masters until mapping + asset evidence exist.

#### Gate 0 — join decision (HITL, before any source mutate)

Pick the cutover source before freezing a high-water mark.

| Track | Ships | Does not ship |
| --- | --- | --- |
| A. Integration as deployed | Dock shell, Settings, D1 calendar, grounded published Ask WTF, ungated public link | This worktree's left-rail all-pages nav, Excel title map, `sourceMode` dual-source contract |
| B. Join then cut over | Track A plus reviewed dual-source DTO/filter and/or ungated rail | Uncut activation; three quarantine dispositions; Access |

Uncut activation still waits on the owner 20-query key, ten alignment cases,
and three quarantine dispositions. Those do not block Track A.

#### Gate 1 — DNS / Custom Domain authority (read-only probe)

Current grant cannot read DNS records. Before a cutover window, prove
**without writing**:

1. `npx wrangler deployments list --name wtfmedia-web --profile wtfmedia`
   names the target profile. (`whoami` rejects `--profile`; do not use it
   as the account probe.)
2. The `wtfhq.in` zone is visible to that profile.
3. Workers Custom Domain **list** is authorized. Attach write remains
   unproven until an owner window issues `PUT /accounts/{account_id}/workers/domains`.
   Docs: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
4. Edge stays off the public hostname; only `wtfmedia-web` receives
   `wtfhq.in` / `www` if approved.

**Probe receipt — 2026-08-30, read-only, `--profile wtfmedia`:**

- Profile works. Target R2 lists `wtfmedia-catalogue`. Target scripts include
  `wtfmedia-edge` and `wtfmedia-web`. Two web deployments exist (upload at
  13:01Z and a later version at 13:11Z).
- `GET /zones?name=wtfhq.in` returns 200: active full zone, not paused,
  nameservers `lana` / `viddy`. Public `dig` matches: Cloudflare NS, no apex
  or `www` A/AAAA/CNAME/TXT answers.
- `GET /accounts/…/workers/domains` returns 200 with **zero** hostnames.
  `wtfmedia-web` routes list is empty; workers.dev subdomain is enabled.
- `GET /zones/…/dns_records` still returns 403 / Cloudflare error 10000.
  DNS-record CRUD is not granted. Custom Domain attach may still succeed
  because Cloudflare manages those records; that write was **not** exercised.
- No PUT/PATCH/DELETE, no `triggers deploy`, no `default` profile, no
  `9d9d` mutation.

Abort a later attach window if the zone is missing, if workers/domains
list starts failing, or if a Custom Domain write is denied. Do not deploy
routes with `custom_domain: true` until Gate 4 proof exists.

#### Gate 2 — source high-water freeze (read-only `9d9d`)

Re-inventory source without mutating it. Record privately, not in Git:

- Worker script versions and binding names for `wtfmedia-web` and
  `wtfmedia-edge`
- Queue pending/in-flight counts and consumer settings for
  `wtfmedia-ingest` / `wtfmedia-ingest-dlq`
- R2 unique-key count, aggregate bytes, and a privacy-safe key/ETag/SHA
  manifest
- KV persistent key count (values never printed)
- Vectorize unique ID count, dimensions, metric

Define the delta rule before copy: a target object/key/vector is stale if its
source counterpart is missing or its ETag/SHA/ID set differs. Unexplained
count drift aborts the window.

#### Gate 3 — rollback model (HITL, required before Gate 4)

Proven emergency URL:
`https://wtfmedia-web.sheshnarayan-iyer.workers.dev/` (HTTP 200 during
inventory).

Default rollback: delete the target Custom Domain, restoring the pre-cutover
no-apex `wtfhq.in` state, point operators at the source workers.dev URL, and
restore any quiesced source producer/consumer settings. This is **not**
same-host continuity.

Cutover cannot start until the owner either accepts that outage model in
writing or authorizes a rehearsed same-host rollback (for example a version
rollback on the already-attached hostname).

Restore rehearsal for Gate 4 must exist as a command list before the first
source pause.

#### Gate 4 — quiesce + final delta (mutating, separate owner window)

Bounded exception to `9d9d` read-only. Abort and restore source settings on
any unexplained count or queue disposition.

1. Capture the Gate 2 snapshot again at window start.
2. Stop new source ingress: detach or pause the source ingest producer and
   consumer using the recorded settings as the restore image. Do not delete
   the source queue.
3. Settle the source queue by the owner-chosen drain-or-abandon rule.
4. Copy the R2 delta into target `wtfmedia-catalogue`; reconcile unique keys,
   bytes, and SHA-256.
5. Copy the KV delta into target `WTFMEDIA_STATE`; reconcile key set without
   logging values.
6. Upsert or deterministically rebuild target Vectorize from the reconciled
   target R2 set; prove 1,024 / cosine and an explained ID count.
7. Re-run preview health, direct-call 401, one grounded Ask WTF, and calendar
   list/create/update on workers.dev **before** touching DNS.

No Pages, no Access, no source deletion.

#### Gate 5 — attach `wtfhq.in` (mutating, only after Gate 4 proof)

1. Confirm `ALLOWED_ORIGIN` / app origin for the apex (generated target
   config already names `https://wtfhq.in`; preview must keep working or be
   explicitly retired).
2. Attach the Custom Domain to `wtfmedia-web` only (`custom_domain=true` on
   the hostname, or the Workers domains API). Do not put the edge Worker on
   the public host.
3. Wait for certificate active.
4. Exact-host checks at 320px and 1440px: `/`, `/chat`, `/episodes`,
   `/connections`, `/production` or `/ops/production` as shipped, Settings,
   grounded Ask WTF, calendar persist across reload, clean console, no
   horizontal overflow.
5. Confirm Access is still absent and copy does not claim a login gate.

#### Gate 6 — observe

Keep all `9d9d` data and Workers for at least seven days. Rollback remains
Custom Domain removal plus the source emergency URL unless a same-host route
was approved in Gate 3. Source deletion is out of scope.

#### Verification that still does not block hostname cutover

- Owner 20-query editorial key
- Ten published-to-uncut alignment cases
- Three quarantine row dispositions
- NVIDIA provider activation
- Fine-grained RBAC / Cloudflare Access (Wave 6)

#### Local leftover in this checkout

Dual-source `sourceMode` and the title map exist only in this dirty worktree
and are now **P0** for join into `be304bd` before hostname cutover. Ungated
AppRail navigation remains P2 and optional. Unit/typecheck/Storybook for the
dual-source slice passed; Playwright click-through of every destination was
**not** completed. Do not treat that Playwright run as green.

### Wave 6 — Access and RBAC (next release)

**State:** explicitly deferred.

- Configure and verify the Cloudflare Access application, policies, and
  protected hostname for the named team members after this release.
- Produce the role/anonymous/expiry/tampering/cache-isolation evidence packet
  and receive the separate owner approval before deployment.

## Completion evidence for this release

1. The deployed WTF OS UI and settings work at 320px and 1440px with clean
   browser console/network evidence.
2. No episode, transcript, provenance, alignment, or calendar field is shown
   without a source-backed response. Missing data has an explicit state.
3. The source toggle uses only a response-provided mode and timestamp; it never
   derives an uncut timestamp from a published timestamp without verified
   intervals.
4. Calendar create/edit/list flows persist in target D1 across browser sessions
   and surface failures rather than optimistic completion.
5. The three quarantine rows remain excluded until owner disposition.
6. R2 object count/bytes, Vectorize count/configuration, Worker bindings,
   queues, KV, D1 migrations, and domain routing have target receipts.
7. Access/RBAC remains visibly deferred and does not masquerade as active.
8. A recorded source high-water state plus final R2/KV/Vectorize delta proves
   the target is internally consistent after queue settlement.
9. Rollback rehearsal proves the exact source emergency URL and either records
   owner acceptance of no-apex recovery or proves a same-host rollback route.

## Explicitly deferred beyond this release

- Cloudflare Access application/policy setup and fine-grained team RBAC.
- External calendar provider sync.
- New YouTube/social OAuth authorization not already available to the product.
- The owner-authored answer key and ten approved alignment records.

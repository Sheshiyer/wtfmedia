# WTF Media Cloudflare estate inventory and 9d9d-to-target migration map

**Observed:** 2026-08-30
**Inventory evidence posture:** the original baseline was a live, read-only
Wrangler/API inventory across the mapped `9d9d`, `wtfmedia`, and `default`
profiles, plus public DNS inspection. The execution receipt below records the
subsequent authorized target creates and copies. Account identifiers,
credential values, secret values, object keys, KV values, and payloads remain
intentionally omitted.

## Executive decision

Cloudflare account migration is a **clone, verify, and cut over** operation,
not an in-place transfer. The 9d9d resources remain the rollback source while
equivalent target-account resources are created, data is reconciled, the
Workers are redeployed from reviewed repository source, and `wtfhq.in` is
attached only after the release checks pass.

The current release is intentionally available without Cloudflare Access.
Anyone who knows the URL may view the product and may list, create, or update
production-calendar records. Anonymous delete, ingestion control, transcript
activation, provider administration, secret access, and release approval are
outside that exception. Access and fine-grained RBAC move to the next release.

## Initial target-foundation execution receipt — 2026-08-30

The owner subsequently authorized the create/copy wave. The original inventory
below remains the pre-write baseline; these live receipts supersede its target
readiness statements that R2 was disabled and the named target resources were
absent.

- Created target R2 `wtfmedia-catalogue`, KV `WTFMEDIA_STATE`, Vectorize
  `wtfmedia-catalogue-v1`, queues `wtfmedia-ingest` and
  `wtfmedia-ingest-dlq`, and D1 `wtfmedia-ops`. Account-scoped identifiers were
  used only at runtime and were not committed.
- Copied all 99 R2 objects and 13,204,194 bytes. A fresh target enumeration
  proved 99 unique keys; every object matched source by key, size, ETag,
  storage class, metadata, and SHA-256. Source stayed unchanged during the
  initial copy. Wrangler's bucket aggregate remained stale at zero after the
  copy, so it is not used as stronger evidence than fresh enumeration plus 99
  successful production object reads.
- Copied all 55 persistent KV keys through a private temporary export/import
  path. Source and target key sets and values matched; no key value was printed
  or retained in repository evidence.
- Replayed all 5,742 vectors. Fresh paginated source and target snapshots each
  contained 5,742 unique IDs with an identical ID set; the target contract is
  1,024 dimensions with cosine distance.
- Applied repository D1 migrations `0001` through `0005`: five migration
  receipts, 16 tables, and no pending repository migration. The separately
  reviewed calendar migration is still absent and was not invented.
- Both target queues are empty shells with zero producers and zero consumers.
  Producer, consumer, retry, concurrency, and DLQ wiring remains coupled to
  the reviewed edge deployment.
- No target Worker, Pages project, Custom Domain, DNS record, Access policy, or
  secret was created. No source or `default` resource was changed or deleted.

This is the initial bulk baseline, not cutover consistency. The separately
authorized source quiesce, queue settlement, final R2/KV/Vectorize delta,
preview verification, hostname cutover, and rollback observation remain.

## Target preview Worker and calendar execution receipt — 2026-08-30

The owner confirmed the `wtfmedia-release-integration` worktree as the canonical
release integration and authorized its locked dependency installs, fresh
target-secret generation/placement, D1 calendar migration, and target Worker
deployment. This executed the existing plan through the workers.dev preview
gate; it did not reopen or replace the migration design.

- Reconciled the canonical worktree with PR #23's `e0791f8` main baseline,
  installed the existing lockfiles without an audit rewrite, and verified the
  complete edge suite (127/127), web typecheck/lint, 59 unit tests, 101
  component tests, 84 contracts, focused responsive browser journeys, Next
  build, and OpenNext build.
- Applied reviewed D1 migration `0006_public_calendar.sql` to target
  `wtfmedia-ops`. The live schema now contains two calendar tables, four
  indexes, and six enforcement/receipt triggers in addition to migrations
  `0001`–`0005`. The first remote apply failed atomically on D1's
  unparenthesized trigger `CASE` parser form; the migration was corrected to
  the documented parenthesized form, regression-tested, and then applied once.
- Generated the target Wrangler configuration from live target resource
  lookups into an ignored mode-600 file. No target account identifier, resource
  identifier, or secret value was added to Git.
- Generated fresh `EDGE_SHARED_SECRET`/`CLOUDFLARE_EDGE_SHARED_SECRET` and
  `INGEST_TOKEN` values in a private temporary directory, deployed both ends
  with the paired values, then overwrote and removed the local secret files.
  Secret values were never printed or copied into planning evidence.
- Deployed target `wtfmedia-edge` and `wtfmedia-web` on their workers.dev
  preview URLs. Edge is bound to target R2, KV, Vectorize, D1, Workers AI, and
  the ingest queue; web is an OpenNext Worker bound to static assets, Images,
  itself, and the edge service. No Pages project was created.
- Target `wtfmedia-ingest` now has `wtfmedia-edge` as one producer and one
  consumer, with `wtfmedia-ingest-dlq` retained as its configured DLQ. No
  deliberate ingest payload was enqueued during preview verification.
- Live gates passed: edge health returned 200; direct edge calendar, chat, and
  ingest requests returned 401; the web root returned 200; a real Ask WTF
  request returned a grounded answer with six catalogue sources; and the
  public calendar completed create, revision-guarded update, and reload through
  the web-to-edge service binding.
- The calendar retains one useful target-preview verification record. Its final
  state is `on-calendar`, revision 3, with three append-only mutation receipts.
  One extra anonymous update receipt appeared during live verification while
  the final record fields remained unchanged. This release intentionally
  records no verified actor identity, so attribution cannot be proven and is
  not inferred.
- Fresh in-app-browser checks confirmed the D1-backed copy, persisted record,
  calendar controls, clean console, and no horizontal overflow at compact and
  desktop widths. One stale “before records are wired” sentence was found,
  regression-tested, corrected, and redeployed through a second paired secret
  rotation.
- `9d9d` remained read-only; `default` remained untouched. No source quiesce,
  final delta, Custom Domain, DNS record, Access policy, RBAC activation,
  Pages resource, source deletion, or domain cutover occurred.

## Account topology — authoritative for migration commands

| Wrangler profile | Observed account role | WTF relationship | Mutation rule |
| --- | --- | --- | --- |
| `9d9d` | Personal source account | Owns the live `wtfmedia-web`, `wtfmedia-edge`, R2, KV, Vectorize, and queue estate. | Read/copy until a separately owner-authorized cutover quiesce. Under that bounded exception, pause ingress/producers, retain all data, record exact before-state, and restore it on rollback. |
| `wtfmedia` | Connect2nikhai target account, mapped to this repository | Owns the active `wtfhq.in` zone, cloned WTF data-plane foundation, target D1 calendar, and deployed `wtfmedia-edge`/`wtfmedia-web` preview Workers. | Foundation copy, calendar persistence, paired secrets, bindings, and workers.dev preview deployment are complete. Source quiesce/final delta and DNS/domain cutover remain separately gated. |
| `default` | Thoughtseed Labs control account | Broad unrelated Cloudflare estate; no WTF-named Worker, Pages project, zone, route, custom domain, R2, KV, D1, Vectorize index, or queue was found. | Do not create, move, update, or delete anything here for WTF Media. |

Running Wrangler from this repository selects the mapped `wtfmedia` profile.
Every source command must therefore include `--profile 9d9d`; every target
write must include `--profile wtfmedia`. An omitted profile is a cutover risk.

## Default-account control inventory

The requested account-wide pass found 9 Workers, 2 Pages projects, 9 R2
buckets, 19 KV namespaces, 2 D1 databases, 6 Vectorize indexes, 9 queues,
18 Durable Object namespaces, 4 Workflows, 2 Hyperdrives, 4 Worker custom
domains, 2 zones, 1 container, 1 tunnel, 1 secret store, 1 managed CA, and
1 email-sending domain in `default`. None matched WTF names, bindings, routes,
domains, or zones. Access applications, Turnstile widgets, pipelines, AI Search,
Flagship stores, and VPC services were empty. Some optional or gated APIs
returned permission/feature responses; those are unknown rather than absent.

## Target-account readiness inventory — pre-write baseline

| Capability | Live target observation | Planning consequence |
| --- | --- | --- |
| Zone/DNS | `wtfhq.in` is an active, full Cloudflare zone. Public DNS resolves its Cloudflare nameservers, but no apex or `www` address answer was observed. DNS-record API reads returned permission denied. | Target ownership is established; attaching or changing the hostname still needs an explicit cutover window and adequate DNS/domain authority. |
| Workers/Pages | No WTF Workers, routes, custom domains, or Pages projects are present. Existing Workers are unrelated. | Create/deploy two Workers. Do **not** create or migrate a Pages project: the web runtime is an OpenNext Worker with static assets. |
| R2 | R2 is disabled for the target account, and the mapped OAuth grant does not expose R2 authority. | Enable R2 and establish target R2 management/S3 copy authority before creating or copying the catalogue bucket. This is the first infrastructure gate. |
| KV/Vectorize | No target KV namespaces or Vectorize indexes are present. | Create new target resources; identifiers are account-scoped and cannot be transferred. |
| Queues | Only unrelated queues are present. | Create `wtfmedia-ingest` and `wtfmedia-ingest-dlq`, then reproduce bindings and retry settings. |
| D1 | One unrelated D1 database exists; `wtfmedia-ops` does not. | Create `wtfmedia-ops`, apply reviewed migrations, and bind its target-generated identifier. |
| Access | No Access application is present. | Intentionally deferred to the next release; do not represent the public link as protected. |
| OAuth authority | The mapped profile was freshly reauthenticated and can read the target account. It exposes Workers, KV, D1, Pages, AI, queues, routes, and scripts scopes, but no R2 scope or DNS-record read access. No write was exercised. | The old generic “management token missing” blocker is superseded. Remaining gates are capability-specific: R2 enablement/grant, DNS/domain authority, fresh secrets, and explicit owner authorization to mutate/deploy/cut over. |

## Live WTF resource reconciliation

| Capability | 9d9d evidence observed | Target mapping | Cutover proof |
| --- | --- | --- | --- |
| Web Worker | `wtfmedia-web` is administrable through `9d9d`; deployment history is enumerable. Its live bindings are static `ASSETS`, Images, self-reference to `wtfmedia-web`, and service binding `WTFMEDIA_EDGE` to `wtfmedia-edge`. No shared-secret binding is visible on the source web Worker. | Deploy the reviewed, integrated OpenNext Worker as `wtfmedia-web`; bind static assets, Images, self-reference, edge service, and any reviewed server-only secret required by the final source. | Deployment receipt, binding inventory, root and route smoke, console/network pass at 320px and 1440px. |
| Edge Worker | `wtfmedia-edge` health responds and its settings **and deployment history are now enumerable** through `9d9d`; the earlier ownership error is superseded. Live bindings are Workers AI, R2 `CATALOGUE`, KV `WTFMEDIA_STATE`, Vectorize `VECTORIZE`, queue `INGEST_QUEUE`, two secret-name bindings, and redacted non-secret configuration. | Recreate `wtfmedia-edge` from reviewed repository source in the target account. Never claim the live deployment itself or secret values were transferred. | Target deployment receipt; settings diff; health; authenticated web-to-edge service call; Ask WTF retrieval; ingest protection; rollback route. |
| Pages | No WTF Pages project exists in source, target, or `default`. `wtfmedia-web` is a Worker deployment with assets, not a Pages project. | **HOLD / no action.** Maintain the existing OpenNext-on-Workers architecture for this migration. | Workers deployment and route receipts; no invented Pages dependency. |
| R2 catalogue | `wtfmedia-catalogue`: 99 objects, 13.2 MB, APAC placement, Standard storage. Object bodies and keys were not copied into planning. | Create `wtfmedia-catalogue` in the target account. Copy through an R2 S3-compatible client or Cloudflare migration tooling while retaining the source bucket. | Exact object count and aggregate bytes; metadata/content-type sampling; checksum comparison where supported; application read test. |
| KV state | `WTFMEDIA_STATE` contains **55 persistent keys** with no expiration or metadata. Only the safe aggregate prefix `ingest` was recorded; values were not read. The earlier zero-key baseline is superseded. | Create a target namespace, copy the 55 source keys through a privacy-safe export/import path, reconcile count/prefixes, then bind it as `WTFMEDIA_STATE`. Namespace identifiers are not portable. | Target count of 55 or an approved explained delta; no value leakage; binding receipt; application idempotency/read test. |
| Vectorize | `wtfmedia-catalogue-v1`: 5,742 vectors, 1,024 dimensions, cosine metric. | Recreate the same index contract. Prefer deterministic export/replay by listing vector IDs and fetching/upserting records; if metadata/value recovery is incomplete, re-embed the approved R2 chunks with the existing model and stable IDs. | Dimension/metric equality; 5,742 reconciled records or an explained approved delta; duplicate-ID check; retrieval and ranking cases for both source modes. |
| Ingest queue | `wtfmedia-ingest` has `wtfmedia-edge` as producer and consumer: batch size 1, max retries 5, max wait 30 seconds, max concurrency 1, zero retry delay, and zero delivery delay. Its DLQ is `wtfmedia-ingest-dlq`. | Create the queue and reproduce the observed settings. During a separately authorized cutover quiesce, stop new source ingress, then drain or explicitly abandon remaining source messages before routing target producers; do not attempt opaque queued-message transfer. | Empty target baseline; producer-to-consumer receipt; retry and DLQ test; owner-approved source pause plus queue settlement decision. |
| Dead-letter queue | `wtfmedia-ingest-dlq` exists with no producer or consumer binding. | Create `wtfmedia-ingest-dlq` and bind it as the target ingest consumer's DLQ. | Deliberate failure reaches target DLQ without exposing source payloads in evidence. |
| D1 operations database | `wtfmedia-ops` was not found in the source account. The repository's non-UUID `database_id` is a placeholder, not live evidence. | Create a new target `wtfmedia-ops`; replace the target binding with its real identifier outside committed planning; apply repository migrations `0001`–`0005`, then a separately reviewed calendar migration. | Migration listing; schema probes; D1-backed episode/provenance checks; calendar list/create/update persistence across sessions. |
| Workers AI | A live `AI` binding exists on `wtfmedia-edge`. | Recreate the binding and retain the reviewed model contract unless evaluation evidence approves a model change. | One real embedding/retrieval/answer trace with source segment IDs and truthful timestamps. |
| NVIDIA inference | No live NVIDIA binding or secret name was observed in the source Workers. NVIDIA remains a repository/planning seam, not an account resource proven by this inventory. | Add only if the reviewed integrated release requires it and the owner supplies a fresh target secret. Do not describe it as migrated infrastructure. | Redacted secret-name/configuration receipt and provider-specific tests, or an explicit unavailable state. |
| Secrets | Expected names include `EDGE_SHARED_SECRET`, `INGEST_TOKEN`, `CLOUDFLARE_EDGE_SHARED_SECRET`, and `NVIDIA_API_KEY`; optional model settings remain configuration. Values were not inspected or recorded. | Recreate secrets in the target from the owner's secure source. Generate new shared secrets where both ends can rotate together. | Secret-name presence only, successful protected calls, rejected missing/wrong secret. Never print values. |
| Domain | `wtfhq.in` is confirmed as an active zone in the `wtfmedia` target account. No source WTF custom domain exists, and no public apex or `www` address answer was observed. | After target Workers pass, attach `wtfhq.in` as the target web Worker's Custom Domain; route the edge Worker only through its intended service/API boundary. | Certificate active; DNS resolution; exact-host route suite; rollback record; no split-brain cache. |

### Inventory reconciliation notes

- The Wrangler R2 list output exposed only the API's first 20 buckets. A
  cursor-capable account API query returned 25 and placed
  `wtfmedia-catalogue` outside that first page; direct bucket info then
  reconfirmed 99 objects and 13.2 MB. Never infer absence from an unpaginated
  bucket list.
- Source Worker settings and deployments are administrative evidence; a health
  response alone is runtime evidence and does not establish ownership.
- Binding names are inventory. Secret values are non-exportable and were not
  read. Fresh target secrets are a separate owner-controlled input.
- No Pages migration, NVIDIA account-resource migration, Access setup, or
  change to `default` belongs in this cutover.

## Create / copy / update / hold matrix

| Action | Target resource or configuration | Source/basis | Gate before action |
| --- | --- | --- | --- |
| **CREATE** | R2 `wtfmedia-catalogue` | Source bucket contract | Enable target R2 and grant R2 management/S3 authority. |
| **CREATE** | KV `WTFMEDIA_STATE` | Source namespace contract | Owner-authorized target write window. |
| **CREATE** | Vectorize `wtfmedia-catalogue-v1` (1,024, cosine) | Source index contract | Target write authority and replay/re-embed method chosen. |
| **CREATE** | Queues `wtfmedia-ingest` and `wtfmedia-ingest-dlq` | Observed source settings | Target write authority; source drain/abandon decision. |
| **CREATE** | D1 `wtfmedia-ops` | Repository migrations; no source D1 exists | Reviewed calendar migration and target write authorization. |
| **CREATE/DEPLOY** | Workers `wtfmedia-edge`, then `wtfmedia-web` | Reviewed repository source plus observed binding contract | Integrated source reviewed; target resources ready; fresh secret names supplied. |
| **COPY** | 99 R2 objects / 13.2 MB | `9d9d` R2 | Target bucket ready; privacy-safe copy tool and reconciliation receipt. |
| **COPY** | 55 persistent KV keys | `9d9d` KV | Target namespace ready; no values printed in evidence. |
| **COPY or REBUILD** | 5,742 vectors | `9d9d` Vectorize or deterministic target re-embedding | Stable-ID strategy and accepted count/delta rule. |
| **QUIESCE + DELTA** | Source ingress/producer pause, queue settlement, final R2/KV delta, and Vectorize reconciliation | Recorded source high-water manifest and exact Worker/queue before-state | Separate owner approval for source mutation; preview already green; bounded window and restore command rehearsed. |
| **UPDATE** | Account-scoped binding identifiers, service links, queue consumer, DLQ, environment config | Target-created resources | Resource receipts exist; repository remains free of secrets/account IDs. |
| **UPDATE/CUT OVER** | `wtfhq.in` Custom Domain/DNS | Target-owned zone | Preview gates pass; DNS/domain authority confirmed; rollback record ready. |
| **ROLL BACK** | Remove the target Custom Domain to restore the pre-cutover no-apex state; use the verified source Worker URL as the emergency endpoint; restore any quiesced source ingress/producer settings | `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/` returned HTTP 200 during inventory | Owner accepts that this is not same-host continuity, or a separately reviewed same-host rollback route is built and rehearsed first. |
| **HOLD** | Pages, Access/RBAC, NVIDIA provider activation, source deletion, all `default` resources | Not required or separately gated | Separate owner-approved task or next release. |

## What is reused for published and uncut sources

The uncut path extends the current Ask WTF pipeline rather than rebuilding it:

1. R2 remains the source-artifact store. Each approved object gains explicit
   `sourceMode`, source version, episode mapping, and content hash metadata.
2. The existing queue consumer remains the ingestion orchestrator. Stable
   idempotency keys include episode, source mode, version, and segment identity.
3. The current chunking, embedding, Vectorize retrieval, rubric/ranking, and
   NVIDIA/Workers AI seams remain shared. Vector metadata distinguishes
   `published` and `uncut` so filtering occurs before answer composition.
4. Answers cite returned segment IDs and source timestamps. Published-to-uncut
   conversion is allowed only through verified alignment intervals; otherwise
   the UI shows `unmapped`, `conflicted`, or `unavailable`.
5. The UI toggle changes an explicit query parameter and response projection.
   It cannot relabel a published answer as uncut or invent an alternate time.

## Temporary public calendar contract

Target D1 is canonical for this release. The public API surface is limited to
calendar `list`, `create`, and `update`.

- Accept only same-origin requests with a strict allowlisted DTO, maximum field
  lengths, valid event types, bounded date ranges, and normalized UTC instants.
- Require idempotency keys for create and an expected `revision` for update so
  retries and concurrent edits cannot silently duplicate or overwrite events.
- Apply conservative IP/request rate limits through target KV and return safe,
  non-identifying errors. Do not log raw notes, prompts, tokens, or credentials.
- Persist an audit-safe correlation ID, operation, timestamp, and record ID;
  this is operational traceability, not proof of an authenticated person.
- Do not expose anonymous delete, bulk import/export, provider sync, or secrets.
- After mutation success, invalidate/refetch calendar grids, lists, modal/detail
  windows, boards, and related action flows. On failure, retain user input and
  show the server result rather than a simulated success.

Because callers are anonymous, the system cannot attribute edits to a verified
team member in this release. The UI and handoff must state that limitation.

## Migration and cutover order

1. **Lock the profile boundary.** `wtfmedia` is freshly authenticated and
   repository-bound; `9d9d` is source-only; `default` is out of scope. Keep
   explicit profiles in every recorded command.
2. **Enable target R2 and validate capability-specific authority.** Cloudflare
   currently returns code `10042` for target R2. Establish R2 management/S3
   copy authority and confirm DNS/custom-domain authority without exercising a
   write. The existing source R2 S3 bundle is not general Wrangler authority.
3. **Freeze a baseline and high-water contract.** Re-run the source inventory;
   record resource names, object/vector counts, queue state, Worker versions,
   and a privacy-safe R2/KV manifest. Define how a final delta will detect every
   post-baseline object/key change before any bulk copy begins.
4. **Create target shells.** Create R2, KV, Vectorize, queues/DLQ, and D1; update
   environment-specific bindings; do not overwrite repository placeholders with
   secret or account-specific values in Git.
5. **Run the initial R2 and KV copy.** Copy without deleting the source.
   Reconcile R2 count, bytes, metadata, and sample checksums; reconcile all 55
   KV keys without printing values. Treat this as a bulk baseline, not final
   cutover consistency proof.
6. **Build the initial Vectorize target.** Export/replay records when
   recoverable; otherwise
   deterministically re-embed the approved target R2 corpus with stable IDs.
7. **Create D1 state.** Apply `0001`–`0005` and the reviewed calendar migration;
   seed only approved non-secret configuration. There is no source D1 dataset
   to claim as migrated.
8. **Deploy edge.** Add target secrets, deploy `wtfmedia-edge`, verify health,
   ingest protection, queue flow, dual-source retrieval, citations, and failure
   behavior.
9. **Deploy web.** Integrate the reviewed UI/worktree changes, deploy
   `wtfmedia-web`, bind the edge service and D1-backed calendar, and run the full
   localhost-equivalent production build/browser suite against the preview.
10. **Quiesce source and reconcile the final delta.** In a separately
    owner-authorized window, capture exact source Worker versions/bindings,
    stop new source ingestion/producers, and let the source queue settle by the
    approved drain-or-abandon rule. Record the high-water state; copy the final
    R2/KV delta; then upsert or rebuild Vectorize from the reconciled target R2
    set. Prove object/key/vector counts and queue disposition before traffic
    moves. If this step fails, restore the recorded source settings and stop.
11. **Attach `wtfhq.in`.** Add the Custom Domain only after all preview gates
   pass. Run exact-host desktop/mobile, source-toggle, persistence, settings,
   privacy, cache, console, and network checks.
12. **Observe and retain rollback.** Keep all `9d9d` data/resources for at
    least seven days. The verified emergency endpoint is
    `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/` (HTTP 200 during
    inventory). Current rollback removes the target Custom Domain, restoring
    the pre-cutover no-apex state, communicates that source URL, and restores
    any quiesced source ingress/producer settings. It does **not** preserve
    same-host `wtfhq.in` continuity. Cutover requires owner acceptance of that
    outage model or a separately reviewed and rehearsed same-host rollback
    route. Never delete source assets in this task.

## Remaining operations after target preview — 2026-08-30

Inventory steps 1–9 are complete (target shells, bulk copy, D1 `0001`–`0006`,
paired secrets, workers.dev preview). **Product priority is now P0 Ask WTF
chat for YouTube published + uncut**, including the KV, R2 asset, Vectorize,
queue, and Settings integration surfaces that path mutates. Hostname cutover
(inventory 10 → 11 → 12) stays held until that join is on the canonical
preview or waived.

Detailed gates and the priority table live in
[`2026-08-30-wtfos-internal-release-plan.md`](../../../docs/superpowers/plans/2026-08-30-wtfos-internal-release-plan.md)
under “Remaining priority list” and “Remaining cutover operations”.

Do not execute Gates 4–5 from this inventory row. They need a separate owner
window, a written rollback-model acceptance, and a successful read-only DNS
authority probe.

Worktree split: deployed preview is `wtfmedia-release-integration` @
`be304bd`. This `wtfmedia` checkout still has undeployed dual-source and
ungated-rail work. Joining that work is a review decision, not a silent
cutover input.

## Open blockers and explicit unknowns

- Target OAuth and R2 write/read authority now succeed. Target R2, KV,
  Vectorize, queues, and D1 have initial create/copy receipts as recorded above.
- Zone metadata reads now succeed for `wtfhq.in` (active, full, Cloudflare
  NS). Workers Custom Domain **list** succeeds and is empty. DNS-record
  reads still return 403 / error 10000. Custom Domain attach write is not
  proven; do not treat list permission as attach permission.
- Target D1 migrations `0001`–`0006` are applied, and live calendar
  list/create/update persistence plus append-only mutation receipts are proven.
- Fresh target-only paired secrets were generated and placed without exposing
  their values; direct protected calls reject missing authority and the
  web-to-edge service binding succeeds. Future rotation remains an operational
  action, not a migration blocker.
- The initial create/copy window and workers.dev preview deployment were
  authorized and executed from the owner-confirmed canonical integration
  worktree. The target preview is live; hostname cutover is not.
- The final delta requires a separately authorized source-ingress quiesce and
  queue settlement. Until then, source remains strictly read-only.
- Same-host rollback for `wtfhq.in` is not currently proven. The verified
  emergency source Worker URL is available, but the owner must accept the
  temporary no-apex/outage model or authorize a rehearsed same-host route
  before cutover.
- The owner-authored 20-query key, ten alignment cases, and three quarantine
  dispositions remain evidence gates for editorial/uncut activation, not for
  the UI shell or unrelated calendar records.

## Official migration references

- [R2 S3-compatible API](https://developers.cloudflare.com/r2/get-started/s3/)
- [R2 bucket-list pagination](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/methods/list/)
- [R2 Super Slurper migration](https://developers.cloudflare.com/r2/data-migration/super-slurper/)
- [D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Vectorize list/get workflow](https://developers.cloudflare.com/vectorize/best-practices/list-vectors/)
- [Vectorize insert/upsert format](https://developers.cloudflare.com/vectorize/best-practices/insert-vectors/)
- [Workers KV Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/kv/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [OpenNext on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)

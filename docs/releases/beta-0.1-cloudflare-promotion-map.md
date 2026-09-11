# Beta 0.1 Cloudflare asset and promotion map

Status: **source-only integration plan**  
Branch: `beta_0.1`  
Base: `release/beta` at `498c0e0`  
Audited candidate baseline: `4220eda`

`beta_0.1` is the integration-branch and pull-request label. It is not a Git
tag, package version, staging receipt, production receipt, or traffic claim.
The semantic release candidate remains `v0.3.3-beta.2` until package versions
and the alpha-only release workflow are deliberately reconciled.

## Runtime flow

```text
browser
  -> wtfmedia-web[-staging]
       -> ASSETS (.open-next/assets)
       -> WTFMEDIA_EDGE service binding
            -> wtfmedia-edge[-staging]
                 -> DB (identity, RBAC, chat, provenance, release state)
                 -> CATALOGUE (source and transcript objects)
                 -> VECTORIZE (derived retrieval index)
                 -> AI (embedding and answer inference)
                 -> WTFMEDIA_STATE (rate, ingest, and adapter state)
                 -> INGEST_QUEUE -> edge queue consumer -> configured DLQ
```

The browser never selects a Cloudflare account resource. The deployed web
Worker selects the edge Worker through its service binding; the edge Worker
selects data services through its own bindings. Clerk establishes identity,
while D1 remains the member/operator lifecycle and authority source.

## Environment map

| Runtime concern | Production | Staging | Responsibility | Evidence at 2026-09-11 |
| --- | --- | --- | --- | --- |
| Web Worker | `wtfmedia-web` | `wtfmedia-web-staging` | Next/OpenNext routes, authenticated shell, public pages | Both exist and have a 100%-traffic deployment; the candidate is not tied to either deployment |
| Static asset binding | `ASSETS` | `ASSETS` | `.open-next/assets`, including compiled chunks and files originating in `web/public` | Declared and present on the latest deployed web versions |
| Web self-service binding | `wtfmedia-web` | `wtfmedia-web-staging` | OpenNext self-reference | Environment-isolated in source and deployed binding metadata |
| Edge service binding | `wtfmedia-edge` | `wtfmedia-edge-staging` | Server-side chat, Beta APIs, auth, policy, ingest | Environment-isolated in source and deployed binding metadata |
| Images binding | `IMAGES` | `IMAGES` | Cloudflare Images API surface | Bound, but no current application consumer was found; do not claim an image pipeline |
| Edge Worker | `wtfmedia-edge` | `wtfmedia-edge-staging` | Validation, Clerk-token verification, D1 policy, retrieval, inference, queue consumption | Both exist and are healthy; the candidate is newer than the observed deployments |
| D1 binding `DB` | `wtfmedia-ops` | `wtfmedia-ops-staging` | Identity/roles, chats, memory, audit, releases, episode and ingest provenance | Both exist; remote migration state differs from this source branch |
| R2 binding `CATALOGUE` | `wtfmedia-catalogue` | `wtfmedia-catalogue-staging` | Immutable/approved source objects, transcripts, timestamps, manifests | Both buckets exist; object parity was not re-counted in this PR pass |
| Vectorize binding `VECTORIZE` | `wtfmedia-catalogue-v1` | `wtfmedia-catalogue-staging-v1` | Rebuildable retrieval vectors and public-safe source metadata | Both indexes exist; live counts/config were not returned by the list receipt |
| Workers AI binding `AI` | account binding | account binding | 1,024-dimension embeddings and bounded answer generation | Source and deployed binding metadata confirm the binding, not provider-quality acceptance |
| KV binding `WTFMEDIA_STATE` | namespace titled `WTFMEDIA_STATE` | namespace titled `WTFMEDIA_STATE_STAGING` | Rate windows, ingest content receipts, YouTube ETags/backoff | Separate namespaces exist and source config does not cross-bind environments |
| Ingest queue | `wtfmedia-ingest` | `wtfmedia-ingest-staging` | Transcript ingestion transport | Both exist with producer/consumer attachments |
| Queue DLQ | `wtfmedia-ingest-dlq` | `wtfmedia-ingest-staging-dlq` | Terminal delivery failures after configured retries | Both exist; automatic queue dead-letter routing is configured, but the optional runtime `INGEST_DLQ` producer binding is not |

Secrets remain outside source. Only secret **binding names** may be verified;
values must never be read into logs, planning, PRs, or handoffs.

## Where the assets go

### Web delivery assets

- Source-owned brand images, icons, the web manifest, public transcript
  projections, and other files under `web/public` enter `.open-next/assets`
  during the OpenNext build and are served through the web Worker's `ASSETS`
  binding.
- JavaScript, CSS, and framework-generated static files also enter that asset
  bundle. They do not belong in catalogue R2.
- The `IMAGES` binding is available but is not a substitute for `ASSETS`, and
  no current consumer justifies moving these files into Cloudflare Images.

### Catalogue R2 assets

The bucket currently supports two deliberate key generations:

| Key family | Meaning |
| --- | --- |
| `transcripts/<videoId>.txt` | Existing published retrieval transcript |
| `timestamps/<videoId>.json` | Published transcript timing sidecar when verified |
| `uncut/<sha256>.txt` | Privacy-safe, content-addressed approved uncut transcript |
| `uncut/<sha256>.timestamps.json` | Uncut timing sidecar; it does not imply published/uncut alignment |
| `manifests/corpus-manifest.json` | Corpus inventory/reconciliation receipt |
| `episodes/<episodeId>/assets/{uncut,published,captions,misc}/...` | Canonical uploaded source assets |
| `episodes/<episodeId>/transcripts/txv_<hash>.json` | Canonical versioned transcript object |
| `episodes/<episodeId>/metadata/{manifest,notes}_<hash>.*` | Canonical source sidecars and editorial metadata |

The legacy retrieval keys are still valid inputs. The structured
`episodes/...` layout is the provenance-first upload path; migration must not
rename or delete legacy objects merely to make the layouts look uniform.

### D1, Vectorize, KV, and queues

- D1 is the relational authority: operators, members, invitations,
  principal-profile mirrors, role/audit records, private operator/member chat,
  saved memory, deletion tombstones, release manifests, episodes, source
  assets, transcript versions/chunks, alignments, and ingestion jobs.
- Vectorize contains derived chunks keyed with `video_id`, `source_asset_id`,
  and `source_mode`. It is searchable state, not source-asset authority, and
  can be rebuilt from the approved R2/D1 path.
- KV contains compact operational state such as `ingest:<videoId>`,
  `ingest:uncut:<sourceHash>`, rate windows, calendar rate windows,
  `yt:etag:<channel>`, and YouTube quota backoff. It is not the RBAC database.
- Queues transport accepted jobs. The consumer fails closed unless the
  declared D1 source asset is available and its backing R2 object exists.
  Queues and DLQs do not replace D1 job receipts.

## Candidate versus live Cloudflare

Read-only named-profile inspection proves the resource names above and a
current 100%-traffic deployment for all four Workers. It does **not** prove
that this branch, commit, or source configuration is deployed.

Known deltas that must be cleared in staging:

1. Staging D1 reports `0012_member_chat_deletion.sql` through
   `0015_principal_profiles_email_guard.sql` as unapplied.
2. Production D1 reports `0011_clerk_invitation_id_prefix.sql` through
   `0015_principal_profiles_email_guard.sql` as unapplied.
3. The latest deployed staging edge binding receipt predates the candidate and
   does not expose the source-declared Clerk issuer/JWKS/authorized-party
   variables. Re-deployment must produce a fresh sanitized binding receipt.
4. `wtfhq.in` is reachable, but neither Wrangler file declares a custom route
   or custom domain. Domain-to-Worker traffic attribution therefore remains an
   external Cloudflare configuration receipt, not a source inference.
5. `scheduled.ts` exists, but no cron trigger or exported scheduled handler is
   declared. YouTube/retention scheduling is not an active-runtime claim.
6. Both `0006_chat_history.sql` and `0006_public_calendar.sql` exist, while the
   deterministic D1 migration test selects the chat migration. The duplicate
   ordinal and remote calendar state must be reconciled before any calendar
   migration or scheduling claim.
7. A future Beta tag cannot use the current release workflow: it accepts only
   `-alpha.N`, and root/web/edge package versions are not aligned. This PR is
   intentionally source-only and must not create a tag.

## Promotion order

### PR gate — authorized by this task

1. Freeze the `beta_0.1` head and record its exact base/head SHAs.
2. Run the complete deterministic edge/web/type/lint/build/privacy/architecture
   and diff checks on that exact head.
3. Open a source-only PR into `release/beta`; do not stack conflicting PRs #57
   or #59. Record them as superseded inputs without closing them automatically.
4. Require review and green remote checks. Do not merge in this task.

### Staging gate — separate deployment action

1. Re-run the read-only resource, deployed-binding, and migration inventory.
2. Back up/record staging D1 recovery evidence, then apply only reviewed
   outstanding migrations to `wtfmedia-ops-staging`.
3. Deploy the exact reviewed edge head to `wtfmedia-edge-staging`; record its
   version, bindings, health, and migration compatibility.
4. Deploy the exact reviewed web head to `wtfmedia-web-staging`; prove its
   service binding resolves only to `wtfmedia-edge-staging`.
5. Run API and route smokes, then use Codex IAB with real Clerk/D1 identities:
   signed-out, Member A, Member B, suspended/revoked, editor, admin, and the
   designated super-admin.
6. Prove desktop/mobile layout, cross-member isolation, role-projected
   Settings, archive/delete, session continuity, and no `/beta/ops` shell.
7. Record owner acceptance or defects. Staging success does not authorize
   production.

### Production gate — explicitly not authorized here

1. Reconcile the release workflow and all three package versions before any
   tag, or keep the promotion untagged with an explicit owner decision.
2. Capture current production Worker versions, traffic, bindings, domain
   attribution, D1 migration state, and rollback targets.
3. Back up/approve the D1 migration plan; production currently has one more
   outstanding migration than staging.
4. Apply compatible production migrations, deploy edge first, run health/API
   checks, then deploy web and run public Alpha plus authenticated Beta smokes.
5. Record exact deployment/version/traffic receipts and rollback evidence.

Any production migration, deploy, route, DNS, secret, queue, ingest, corpus,
or Clerk mutation requires a fresh owner-authorized task.

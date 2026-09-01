# Cloudflare backend and production-calendar activation review

**Status:** human decision required. The repository has a reachable Worker preview and reusable Vectorize/KV/Queue assets, but R2 and D1 are not present under the selected `9d9d` account. Phase 1 remains an ungated closed test; the owner requires Zero Trust before Phase 3 activation, and the current preview is not evidence that Access is configured. This is not a deployment request or a place to provide credentials.

## 1. Resource reconciliation

- [ ] Approve `wtfmedia-catalogue` as the exact R2 bucket name to create or restore, **or** provide the approved replacement name.
- [ ] Approve `wtfmedia-ops` as the exact D1 database name to create or restore, **or** provide the approved replacement name.
- [ ] Approve migration sequencing: empty schema first, provenance spine second, calendar schema third; state backup/rollback evidence required before each step.
- [ ] Confirm that `wtfmedia-catalogue-v1`, `wtfmedia-ingest`, its DLQ, and `WTFMEDIA_STATE` are the intended shared legacy assets for this product.

## 2. Secure chat activation

- [ ] An authorized operator will set a matching `EDGE_SHARED_SECRET` on `wtfmedia-web` through an approved secure channel.
- [ ] The existing edge secret must not be rotated during this handoff.
- [ ] Approve the post-handoff test: an authenticated, non-sensitive source-backed query with status/result-shape only recorded as evidence.

Do not put a secret, token, cookie, client id, or Access credential in this file, issue, chat, or commit.

## 3. Canonical production calendar

Fill every field before shared calendar activation:

| Field | Decision |
| --- | --- |
| Canonical schedule owner | Native D1-backed WTF OS production calendar; provider projections never become the source of truth. |
| Roles allowed to create/move/resolve/delete a work item | Editors create or revise drafts; admins schedule and resolve conflicts; super-admins govern exceptional corrections and policy. |
| Default timezone and daylight-saving rule | `Asia/Kolkata` workspace default; store UTC instants with event timezone; permit an explicit event override. |
| Date-only, timed, and all-day semantics | Historical posting values remain date-only; no time is inferred. Timed and all-day events are explicit records. |
| Permitted sticky-note colours and workflow meanings | Shoot purple, publish blue, milestone yellow, complete green, blocked/conflicted red; each IP also carries a text label and non-colour marker. |
| Conflict owner when two editors move one item | Preserve both revisions and mark conflict; an admin resolves with an attributed reason. |
| Audit/retention and correction policy | Append-only correction history; retain prior state and reason under the existing environment-specific audit policy. |
| External provider and authorized account identity | Deferred. No provider is canonical or enabled. |
| Read-only export first, or approved bidirectional sync | Deferred until the native calendar is working; any later provider starts as an owner-approved projection. |
| Provider scopes, revocation owner, failure/retry behaviour | Deferred with provider selection; no OAuth or provider scope is authorized by this packet. |

## 4. Retrieval and provenance activation

- [x] The supplied workbook/PDF package is structurally catalogued in [`2026-08-29-uncut-provenance-source-reconciliation.md`](2026-08-29-uncut-provenance-source-reconciliation.md); it is not copied into the repository.
- [x] Approve a two-axis asset-role classifier and partial local reconciliation: `Internal` remains a candidate until confirmed, while unmatched rows stay `ambiguous`.
- [x] Approve the hybrid factual-correctness/ranking rubric: policy pass/fail plus grounding, source/moment accuracy, calibrated uncertainty, and usefulness scoring.
- [ ] Provide the approved transcript/corpus manifest, the `Internal` field's final asset role, permitted uncut-asset classes, and the authored 20-query evaluation set.
- [ ] Approve embedding model/version and re-index acceptance threshold.
- [ ] Approve verified timeline-alignment evidence required before uncut playback is exposed.

## 5. Hostname and `/ops`

- [ ] Approve the Cloudflare zone and canonical hostname.
- [x] Phase boundary: Phase 1 is ungated closed testing only. Before Phase 3 activation, WTF OS is team-only; YouTube and uncut are unified authenticated evidence sources, while application roles scope capabilities rather than source type.
- [ ] Approve the Phase 3 Access application, policy audience, operator identities, recovery test path, and protected-route scope.
- [ ] Define the rollback window before Vercel is retired.

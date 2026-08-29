# Client questions — current status

**Last reviewed:** 2026-08-29
**Scope:** owner/editorial inputs and their evidence state. This index is not a
deployment, provider, credential, or content-ingestion authorization.

This directory preserves the original question packets for provenance. Use this
index to distinguish questions that still need a response from historical
records whose original gate has been closed or superseded.

## Current owner or editorial action

| Packet | Current state | Next action |
|---|---|---|
| [`2026-08-29-phase-3-blocking-inputs.md`](2026-08-29-phase-3-blocking-inputs.md) | Draft-held | Approve the separate live-activation scope and provide the Phase 3 inputs through an owner-managed secure channel. |
| [`2026-08-27-ip-taxonomy-reconciliation.md`](2026-08-27-ip-taxonomy-reconciliation.md) | Draft-held | Select the canonical IP/show model and provide a versioned mapping plus dispute owner. |
| [`2026-08-27-editorial-evaluation-set.md`](2026-08-27-editorial-evaluation-set.md) | Draft-held | Provide the editorial-authored 20-query set for Phase 4 `KNOW-08`. |
| [`2026-08-27-share-rotation.md`](2026-08-27-share-rotation.md) | Owner action required | Revoke or rotate the historical third-party capability shares and return a redacted attestation. |

The Phase 3 packet consolidates related decisions; it does not silently choose
the taxonomy, language, storage, channel, or benchmark answers on behalf of
the owner. It also does not replace the detailed IP, editorial-evaluation, or
share-rotation packets.

## Historical or resolved records

| Packet | Current state | Meaning |
|---|---|---|
| [`2026-08-27-plan-02-12-staging-authorization.md`](2026-08-27-plan-02-12-staging-authorization.md) | Historical record | The filled 2026-08-27 form and Phase 2 closure language are not proof of a current Cloudflare Access, D1, route, secret, or seat configuration. A new live Access activation packet is required before remote work. |
| [`2026-08-27-shell-refinement-scope.md`](2026-08-27-shell-refinement-scope.md) | Resolved decision record | The A + B + D selection shipped through PRs #12 and #13; C remains unselected and E is deferred. |
| [`2026-08-27-git-state-backlog.md`](2026-08-27-git-state-backlog.md) | Superseded snapshot | The 2026-08-27 dirty-tree inventory is archival, not a present work queue. |

## Update protocol

1. When reviewed repository work changes a question's status, update both this
   index and that packet; retain the original wording as historical context
   where it explains an earlier decision.
2. Do not put credentials, OAuth tokens, private URLs, account identifiers,
   media paths, or raw provider screenshots into this directory. Record a
   redacted attestation, source hash, or owner-approved reference instead.
3. A local test, schema, UI, or plan update is not a live-provider receipt.
   Remote Cloudflare, OAuth, calendar, R2, queue, MCP, and OTA actions each
   require their own owner-approved scope.
4. For current implementation and deployment boundaries, also read
   [`.project/HANDOFF.md`](../../../.project/HANDOFF.md) and
   [`docs/architecture/architecture.html`](../../../docs/architecture/architecture.html).

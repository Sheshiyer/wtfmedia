# Phase 03-00 Context: Release-safe integration gate

## Authority

Production is pinned to the owner-supplied Cloudflare Worker/OpenNext receipt
for `origin/main` at `ee00c28`. This context authorizes local planning,
read-only audits, isolated worktree changes, and local verification only. It
does not authorize a push, deployment, Cloudflare mutation, secret change,
queue operation, or production data migration.

## Problem

The preserved WIP commits are clean but divergent. The dual-source chat and
uncut-alignment bundles overlap in the public chat/source-mode contract and
provenance files. The UI and backend bundles also include planning, generated
artifacts, and dependency changes. Whole-branch cherry-picks are therefore not
an acceptable integration strategy.

## Locked compatibility rules

- `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` remain compatible.
- `/api/chat` retains `messages`, `sourceMode`, optional `episodeId`, streaming,
  `X-Sources`, `X-Source-Mode`, `X-Uncut-Unavailable`, `X-Model`, and
  `X-Fallback` semantics.
- Published, uncut, and combined evidence stay distinct. Missing or unmapped
  uncut evidence is unavailable, never inferred.
- `legacy` and `wtfos` are server-governed variants. Stable remains the
  default; preview access is cohort-controlled and reversible.
- Access is the authentication authority; D1 is the operator and audit
  authority; policy is deny-by-default and UI visibility never grants access.
- Public routes remain stateless until authenticated sessions/history are
  explicitly designed and accepted.
- No raw prompts, responses, tokens, private paths, or provider credentials
  enter browser DTOs, audit events, or tuning datasets by default.

## Exit evidence

This gate exits only when the compatibility manifest, branch overlap matrix,
release/channel contract, auth/RBAC gap register, and local verification plan
are reviewed. The existing `03-01` through `03-06` plans remain retained
execution artifacts. They are not deleted or replaced; after this gate they
may be executed selectively, or receive additive follow-up plans when the
audit identifies overlap or a safer boundary.

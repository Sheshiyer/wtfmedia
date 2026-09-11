# Pavun/Beta integration precedence map

**Recorded:** 2026-09-11
**Owner directive:** Precedence is assigned by product surface, not globally by
branch age or author. A wholesale side selection is forbidden.

## Identity and submitted branches

Repository evidence resolves the owner's shorthand `pavun` to GitHub account
`Pavun57`: the literal `pavun` account has no WTFMedia PRs or commits, while
`Pavun57` authored the two relevant open submissions.

| PR | Head | Exact observed SHA | Primary contribution |
|---|---|---|---|
| #48 | `rag/alpha-answer-accuracy` | `d4e45b44f3527b768408069f191951c2c3f492cb` | grounded chat, retrieval/citation accuracy, and Beta/backend integration |
| #49 | `feat/chat-ui-session-memory` | `1e40ef262e3113f38fc29f5b89adb8dd016706f1` | chat history forwarding, 90/75-second request budget, visible match confidence, and local-secret ignore |

Both PRs currently have failing or conflicting GitHub checks, so precedence is
an integration rule, not permission to merge an unreviewed head.

## Authoritative surface split

| Surface | Precedence | Integration rule |
|---|---|---|
| Beta/public visual composition, AppShell/AppRail, hamburger and navigation pill | Current Beta convergence work | Never restore the older shell or replace the current visual/navigation grammar wholesale. |
| `/` landing, `/beta` principal landing, `/beta/chat`, `/beta/workspace`, `/beta/settings/*`, `/beta/admin/*`, and `/beta/ops/*` compatibility redirects | Current Beta convergence work | Preserve the canonical route map and root-to-home/authenticated landing behavior. |
| Clerk entry/return routing, principal admission, member/operator precedence, RBAC, admin, and scoped Settings | Current Beta convergence work | Edge/D1 policy remains authority; no Pavun chat/backend patch may broaden or bypass it. |
| Chat orchestration, history passed to inference, retrieval, reranking, grounding, citations, answer repair, accuracy evaluations, and request budgets | Pavun57 PR #48/#49 intent | Prefer Pavun's behavior and tests; port later safety fixes on top without changing the intended answer behavior silently. |
| Backend chat/data implementation outside identity and RBAC | Pavun57 PR #48/#49 intent | Preserve backend semantics unless a current security, provenance, or data-integrity gate fails, then document the smallest adaptation. |
| Shared files such as `SourcePanel.tsx`, `web/app/api/chat/route.ts`, and `cloudflare/src/index.ts` | Symbol-level split | Current UI/shell and auth/RBAC symbols win; Pavun chat/inference/accuracy symbols win. Never resolve the whole file as one side. |

## Current candidate reconciliation

- Pavun57 PR #48 head `d4e45b4` is an ancestor of the current candidate.
- PR #49 is not an ancestor as a patch, but its intended capabilities are
  preserved in evolved form: `.dev.vars` is ignored, prior messages reach the
  edge, the route/request budgets remain 90/75 seconds, and commit `a3e5cc0`
  restores visible calibrated match-confidence badges inside the current
  source-sheet UI without reverting the shell, routes, RBAC, admin, or Settings.
- Future conflicts must be classified by symbol against the table above before
  resolution. A branch name, newer timestamp, or wholesale checkout never
  decides precedence.

## Promotion consequence

The current exact source candidate is
`a3e5cc0fe80a7963526b8031a711a447ef0d8aa3`. Remote topology, historical tag,
staging, and production gates remain separate. This precedence decision does
not authorize pushing PR #48, merging PR #49, deploying, migrating, or changing
Clerk/D1 configuration.

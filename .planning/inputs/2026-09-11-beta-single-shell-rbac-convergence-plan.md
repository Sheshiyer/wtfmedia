# Beta single-shell RBAC convergence plan

## Status

**OWNER-APPROVED IMPLEMENTATION AUTHORITY.** This plan supersedes the split
`/beta` member shell and `/beta/ops` operator-shell assumption. It authorizes
repository implementation and local verification only. Staging deployment,
Clerk configuration changes, remote D1 migration, production mutation, push,
merge, and super-admin transfer remain separately gated.

## Global constraints

- Public Alpha `/chat` remains anonymous and is the visual/interaction bedrock:
  full-height conversation, floating wordmark and hamburger, compact composer,
  no bottom dock, source-backed answers, truthful abstention, and citations.
- Beta is one authenticated application. `/beta` resolves the verified
  principal; members land in private Ask WTF and operators land in Control
  Room. No Beta page may synthesize or render a `public_link` principal.
- Edge policy and owner-scoped D1 queries remain authority. UI visibility never
  grants access, and Clerk/profile data never grants a role.
- Conversation URLs expose only opaque prefixed UUIDs. Clerk subjects, D1 IDs,
  user hashes, and subject digests never appear in routes or browser DTOs.
- Member and operator chat stores remain separate in this release while sharing
  the same presentation and session-navigation components.
- AI Route and YouTube Analytics remain non-persisted previews. They must not
  expose save-like behavior or claim to affect provider/inference state.
- `/beta/preview`, browser fixtures, fake personas, production deployment, and
  live infrastructure mutation are forbidden acceptance substitutes.

## Canonical routes

| Purpose | Route |
| --- | --- |
| Principal admission | `/beta` |
| Private Ask and conversation | `/beta/chat`, `/beta/chat/[conversationId]` |
| Personal settings | `/beta/settings/{account,memory,sessions,appearance}` |
| Operator workspace | `/beta/workspace/{production,episodes,ingest}` |
| Operator settings | `/beta/settings/workspace/{readiness,release,ai,analytics,sessions,memory,sources}` |
| Admin users/access | `/beta/admin/users` |
| Admin audit | `/beta/admin/audit` |
| Super-admin release mutation | `/beta/admin/release` |

Known `/beta/ops/*` paths become temporary redirects to this tree and render no
independent UI. `/ops/*` remains the Alpha/legacy tree. Public `/chat` remains
ephemeral; protected operator conversation deep links redirect into Beta.

## Task 1: Edge principal, policy, and data contract

1. Add an additive `principal_profiles` migration linked to exactly one member
   or operator. Backfill linkage/email without guessing names; mirror bounded
   verified Clerk first/last-name claims on later admissions.
2. Add `GET /beta/api/principal-context`, resolving operator records before
   member records. Active operators win; inactive operators, suspended members,
   and revoked members deny without member fallback. Invited/absent users follow
   the approved open-enrollment member path.
3. Return a private browser DTO containing only principal kind, role, normalized
   email, safe profile names, canonical landing, capabilities, and environment.
   Signed-out is 401; lifecycle/capability denial is 403; no public default.
4. Extend the edge policy for member capabilities and canonical Beta paths,
   including super-admin-only release mutation. Preserve record-owner checks.
5. Add failing tests first for precedence, lifecycle denial, historical
   operator/member collision, open enrollment, DTO privacy, capabilities, route
   requirements, and unknown-route failure.

## Task 2: Beta routes, Alpha chat composition, sessions, and settings

1. Replace the `/beta/ops` rewrite loop with canonical Beta pages and bounded
   compatibility redirects. Remove the `/ops` to `/beta/ops` middleware redirect.
2. Add a server-verified Beta principal provider/gate. `/beta` routes members to
   `/beta/chat` and operators to `/beta/workspace`; unauthorized direct routes
   render no protected shell or content flash.
3. Compose private member/operator adapters inside the live Alpha full-height
   chat frame and compact composer. Keep newer evidence/source behavior.
4. Add a bounded desktop session rail and mobile drawer in the chat workspace.
   Cards navigate by prefixed UUID, show title/evidence/update context, and offer
   accessible archive/permanent-delete menus. Archive retains and removes from
   active history; delete preserves preferences/tombstones and cannot resurrect.
5. Build one nested Settings frame. Every principal sees account, memory,
   sessions, and appearance. Operators gain seven workspace areas; admins gain
   users/access and audit; super admin alone gains release mutation/transfer.
6. Replace role arrays in browser navigation with requirements evaluated against
   edge-projected capabilities. Add a contract test importing edge
   `policyForPath` so every protected destination agrees with policy.
7. Make AI/Analytics preview copy truthful and remove mutation affordances.
8. Add failing tests first for routing, no `public_link`, Alpha composition,
   session actions/ownership, capability navigation, settings tiers, legacy
   redirects, and public/Beta separation.

## Task 3: Acceptance and continuity

1. Run edge tests, web unit/contracts, typecheck, build, privacy scan, and
   responsive/a11y checks. Record warnings separately from failures.
2. Update `.planning/STATE.md`, `ISA.md`, `AGENTS.md`, and
   `.project/HANDOFF.md` with canonical routes, identity precedence, session
   behavior, Settings tiers, deferred providers, exact source/test receipts, and
   unperformed deployment/live-persona status.
3. Write one sanitized ad-hoc Codex memory extension note because the owner
   explicitly requested durable memory. Store decisions and supersessions only;
   never store raw Clerk/session identifiers.
4. Staging remains unaccepted until signed-out, two members, suspended/revoked,
   editor, admin, and `sheshnarayan.iyer@gmail.com` as active super admin pass
   real Clerk/D1 IAB acceptance. Super-admin transfer remains post-acceptance.

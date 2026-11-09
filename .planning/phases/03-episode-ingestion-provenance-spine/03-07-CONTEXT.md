# Phase 03-07 Context: Authenticated Ask WTF history

## Authority and status

This is an additive mini-phase under the `03-00` release-safe integration
gate. Its local implementation is authorized and remains feature-off. It does
not authorize a Clerk policy/configuration change, remote D1 migration, deployment,
production data write, or public-route change. Existing `03-01`–`03-06` plans
remain retained and unchanged.

## Goal

An approved WTF operator can sign in through the Clerk operator Beta, use the
authenticated `/ops` operator system and its
`/chat/{conversation_id}-{username}` conversation deep link, and return later
to the same conversation history. Every conversation and message is owned by
the server-resolved operator identity. Anonymous `/chat` and `/api/chat` remain
stateless and preserve their current request, response, source, fallback, and
citation contracts.

## Current repository evidence

- `cloudflare/src/auth/clerk.ts` verifies the Clerk session JWT's issuer,
  signature, expiry, authorized party, and normalized email.
- `cloudflare/src/ops-router.ts` resolves that verified identity against the
  active D1 operator roster and applies deny-by-default policy before origin
  handoff.
- `web/lib/auth/session.ts` correctly treats Clerk as the
  authentication authority and does not issue a WTF application auth cookie.
- `web/app/api/chat/route.ts` currently forwards only the public chat question,
  source mode, and optional episode scope to the edge service; it persists no
  conversation history.
- Existing D1 migrations contain operators, audit, provenance, and ingestion
  tables, but no conversation, message, or saved-memory tables before this
  wave; local migration `0006` now provides conversation/message history and
  local migration `0007` provides the staging/local release manifest.

Therefore Clerk is integrated as a source-level operator boundary, and this
bounded wave adds feature-off local persistence plus the local/staging release
control contract without live verification. The mini-phase remains incomplete
until authenticated API coverage, browser evidence, staging rollback, and live
Clerk session/MFA precedence are proven; public routes remain unchanged.

## Proposed boundary

### Authentication and identity

Protect the `/chat/{conversation_id}-{username}` deep link and
`/ops/api/chat/*` with the Clerk operator session. The Worker validates the
Clerk bearer credential or `__session` cookie; client-supplied identity headers, email fields,
role fields, and conversation owner fields are never authority. The verified
identity resolves to an active D1 operator and the application stores the
server-owned `operator_id`, not a browser token.

The exact authorized-party value, Clerk instance, and deployed policy receipt
remain activation evidence and are not configured by this local wave. The recognized active D1
operator roles remain `super_admin`, `admin`, and `editor`, subject to the
existing deny-by-default capability policy.

Owner decision: target a 720-hour (30-day) Clerk session and matching
instance policy. Global or MFA-specific Clerk settings must not reduce
this to a daily OTP cycle without an explicit activation exception. “Long
horizon” means conversation history survives Clerk logout and later
reauthentication; it does not mean creating a long-lived WTF auth token or
extending a cookie beyond the owner's Clerk instance policy.

The owner-facing authenticated conversation deep link is
`/chat/{conversation_id}-{username}`, reached through the existing `/ops`
authorization system. The conversation ID and username slug are navigation
identifiers only; server-resolved Clerk/D1 identity owns authorization. The
anonymous `/chat` root remains public and stateless.

### Conversation persistence

Use the existing D1 operator database for relational conversation history:

- `chat_conversations`: stable conversation ID, `operator_id`, workspace,
  title, source mode, created/updated timestamps, and lifecycle state.
- `chat_messages`: stable message ID, conversation foreign key, monotonic
  sequence, `user`/`assistant` role, bounded content, source metadata,
  model/fallback metadata, request id, and timestamps.
- Optional pseudonymous Clerk subject digest may strengthen identity binding;
  raw JWTs, cookies, and bearer tokens are never stored.

Owner decision: the browser may retain a local client cache for authenticated
chat and synchronize changes to the server at each activity epoch. D1 is the
canonical durable record; synchronization is Clerk-authenticated and
idempotent. Browser storage is never an authority for identity, authorization,
or rollout.

The initial phase uses D1 transactions and idempotency keys. A Durable Object
is not required unless later work introduces multi-client live collaboration,
WebSockets, or a single-writer streaming coordinator.

### API and UI compatibility

Add authenticated endpoints under `/ops/api/chat` for:

- create/append a conversation from a validated current user message;
- list the current operator's conversations with cursor pagination;
- read one owned conversation and its bounded message history;
- archive and export according to the explicit archive-only privacy policy;
  hard-delete and automatic purge are out of scope for this wave.

Add an operator-only `/ops/chat` history shell and the
`/chat/{conversation_id}-{username}` conversation view through the `/ops`
authorization boundary. Both must be server-gated behind the release manifest
and disable cleanly. The deep-link slug is navigation/display only. The public
`/chat` root and `/api/chat` remain unchanged, so anonymous visitors neither
gain persistence nor lose access.

### Staging release control

The owner authorizes testing the complete mini-phase on an isolated staging
version selected by a UI toggle. The toggle must call an authenticated,
server-side release-control endpoint and write an audited staging manifest;
it must never mutate an environment variable from the browser or treat
localStorage as authority. The manifest states are `paused`, `preview`,
`stable`, and `rolled_back`, defaulting to `paused`. Every protected page,
deep link, and API request reads the effective server state, so pausing the
manifest immediately disables authenticated history without a forced client
update. The public `/chat` and `/api/chat` path remains outside the manifest
and is probed unchanged in every state.

Staging has separate Clerk, D1, secret, and cache namespaces and must not
receive production data. Release-state mutation is `super_admin`-only for
this bounded wave by default; `admin` can test the authorized chat and
cross-operator content/export/archive paths. The exact staging evidence must
show toggle readback, denied unauthorized transition, audit metadata without
prompt/answer bodies, pause, restore, and public compatibility. The existing
local `WTFMEDIA_AUTH_CHAT_RELEASE` flag is only a feature-off seam until that
server control plane exists.

### Privacy and governance

Conversation content is user-owned application data, distinct from the
append-only audit ledger. Audit events record allowlisted lifecycle metadata
only; they never copy raw prompts, raw answers, tokens, or private payloads.
History is not automatically promoted into saved memory or fine-tuning data.
Owner decision: authorized administrative visibility includes conversation
metadata, conversation content, and the history of who called what. Every
administrative read/export/lifecycle action remains audited. Chat lifecycle is
archive-only and non-destructive rather than hard deletion. No automatic purge
is introduced in this bounded wave. The owner authorizes `admin` and
`super_admin` to export or archive across operator scope; ordinary operator
access remains owner-scoped. These policies are not inherited from the
audit-ledger policy.

## Non-goals

- No public-chat identity requirement or forced login.
- No local WTF auth cookie, password system, or token refresh service.
- No automatic memory extraction from conversations.
- No admin access to raw operator conversations solely by implication of role;
  the owner-approved visibility must still be enforced through explicit,
  server-side capability checks.
- No production Clerk policy/configuration, D1 migration, deployment, or data backfill in
  the planning step.

## Research baseline

Cloudflare's current documentation supports protecting a self-hosted
application by hostname and path, setting Clerk session duration, and
validating the Clerk JWT at the edge. D1 is the relational choice for
foreign-keyed conversation history; SQLite-backed Durable Objects remain an
optional later choice for single-writer coordination rather than a default.

- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/d1/best-practices/query-d1/
- https://developers.cloudflare.com/durable-objects/

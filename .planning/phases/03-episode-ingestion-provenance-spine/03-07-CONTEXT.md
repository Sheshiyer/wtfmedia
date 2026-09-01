# Phase 03-07 Context: Authenticated Ask WTF history

## Authority and status

This is an additive mini-phase under the `03-00` release-safe integration
gate. It is planned and inactive. It does not authorize an Access policy
change, D1 migration, deployment, production data write, or public-route
change. Existing `03-01`–`03-06` plans remain retained and unchanged.

## Goal

An approved WTF operator can sign in through the Cloudflare Zero Trust Access
application, use an authenticated `/ops/chat` Ask WTF surface, and return
later to the same conversation history. Every conversation and message is
owned by the server-resolved operator identity. Anonymous `/chat` and
`/api/chat` remain stateless and preserve their current request, response,
source, fallback, and citation contracts.

## Current repository evidence

- `cloudflare/src/auth/access.ts` verifies the Access JWT assertion's issuer,
  audience, signature, expiry, and normalized email.
- `cloudflare/src/ops-router.ts` resolves that verified identity against the
  active D1 operator roster and applies deny-by-default policy before origin
  handoff.
- `web/lib/auth/session.ts` correctly treats Cloudflare Access as the
  authentication authority and does not issue a WTF application auth cookie.
- `web/app/api/chat/route.ts` currently forwards only the public chat question,
  source mode, and optional episode scope to the edge service; it persists no
  conversation history.
- Existing D1 migrations contain operators, audit, provenance, and ingestion
  tables, but no conversation, message, or saved-memory tables.

Therefore Access is integrated as a source-level operator boundary, but the
authenticated Ask WTF persistence outcome is not yet implemented or live
verified. This mini-phase closes that gap without changing the public route.

## Proposed boundary

### Authentication and identity

Protect `/ops/chat` and `/ops/api/chat/*` with the existing Cloudflare Access
self-hosted application path. The Worker validates
`Cf-Access-Jwt-Assertion`; client-supplied identity headers, email fields,
role fields, and conversation owner fields are never authority. The verified
identity resolves to an active D1 operator and the application stores the
server-owned `operator_id`, not a browser token.

Cloudflare Access session duration remains an Access configuration decision.
“Long horizon” means conversation history survives Access logout and later
reauthentication; it does not mean creating a long-lived WTF auth token or
extending a cookie beyond the owner's Access policy.

### Conversation persistence

Use the existing D1 operator database for relational conversation history:

- `chat_conversations`: stable conversation ID, `operator_id`, workspace,
  title, source mode, created/updated timestamps, and lifecycle state.
- `chat_messages`: stable message ID, conversation foreign key, monotonic
  sequence, `user`/`assistant` role, bounded content, source metadata,
  model/fallback metadata, request id, and timestamps.
- Optional pseudonymous Access subject digest may strengthen identity binding;
  raw JWTs, cookies, and bearer tokens are never stored.

The initial phase uses D1 transactions and idempotency keys. A Durable Object
is not required unless later work introduces multi-client live collaboration,
WebSockets, or a single-writer streaming coordinator.

### API and UI compatibility

Add authenticated endpoints under `/ops/api/chat` for:

- create/append a conversation from a validated current user message;
- list the current operator's conversations with cursor pagination;
- read one owned conversation and its bounded message history;
- archive/delete according to an explicit retention and privacy policy.

Add `/ops/chat` as an operator-only surface with a history list and a current
conversation view. It must be server-gated behind the release manifest and
disable cleanly. The public `/chat` and `/api/chat` remain unchanged, so
anonymous visitors neither gain persistence nor lose access.

### Privacy and governance

Conversation content is user-owned application data, distinct from the
append-only audit ledger. Audit events record allowlisted lifecycle metadata
only; they never copy raw prompts, raw answers, tokens, or private payloads.
History is not automatically promoted into saved memory or fine-tuning data.
Explicit saved memory, administrative visibility, export, purge, retention,
and fine-tuning eligibility remain separate governed capabilities.

## Non-goals

- No public-chat identity requirement or forced login.
- No local WTF auth cookie, password system, or token refresh service.
- No automatic memory extraction from conversations.
- No admin access to raw operator conversations by implication of admin role.
- No production Access policy, D1 migration, deployment, or data backfill in
  the planning step.

## Research baseline

Cloudflare's current documentation supports protecting a self-hosted
application by hostname and path, setting Access session duration, and
validating the Access JWT at the origin. D1 is the relational choice for
foreign-keyed conversation history; SQLite-backed Durable Objects remain an
optional later choice for single-writer coordination rather than a default.

- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/d1/best-practices/query-d1/
- https://developers.cloudflare.com/durable-objects/

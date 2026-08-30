# Agentic integrations handoff

**Status:** planning only. This handoff is intentionally separable from the Phase 3 provenance recovery.

## Work partition

| Issue | Owner slice | Must not touch |
| --- | --- | --- |
| [#19](https://github.com/Sheshiyer/wtfmedia/issues/19) | YouTube read-only OAuth connection, consent, revocation, and sync activation | API-key fallback, repository secrets, public account data |
| [#20](https://github.com/Sheshiyer/wtfmedia/issues/20) | Reusable social-provider connection framework | YouTube-specific persistence shortcuts or write scopes |
| [#21](https://github.com/Sheshiyer/wtfmedia/issues/21) | Canonical production calendar and approved export projections | personal calendars, fabricated availability, unattended writes |
| [#22](https://github.com/Sheshiyer/wtfmedia/issues/22) | Local MCP/plugin, future hosted MCP, and Settings integration UX | Cloudflare account administration, deployments, credentials, Phase 3 data paths |

## MCP boundary

`wtf-os-local` is the current repository-local server. It is stateless, uses STDIO, and offers deterministic read-only status, release-history, and setup-guidance tools. It has no network calls, filesystem arguments, provider credentials, content search, upload, deployment, or write tools.

`wtf-os-remote` is a future, separately deployed Cloudflare Worker at `/mcp`. It should use Streamable HTTP and expose a deliberately small read-only projection. It is unavailable until the owner approves the Worker host, Cloudflare Access/OAuth policy, bindings, audit/redaction policy, and deployment. The Cloudflare account-management MCP is a distinct optional integration and must remain disabled by default.

Before a hosted implementation, validate the local server with a direct MCP client test. Do not add it to any global Codex/Cursor configuration during development.

## Settings experience contract

The future WTF OS Settings page is a control surface, not a hidden installer. It should show:

- Connection cards for local MCP, hosted MCP, YouTube, social providers, and calendar projections. Each card shows `not configured`, `awaiting authorization`, `connected`, `degraded`, or `revoked` from a real server response; it never fabricates a green state.
- A client picker for Codex, Cursor, and compatible hosted clients. Selecting a client renders a copyable configuration prompt/snippet containing only a local command or an owner-approved placeholder host. Copying does not write the user's configuration.
- Release metadata: semantic version, source revision, release channel, release candidate state, approval state, changelog link, and rollback target. The page must distinguish the local scaffold from a published release.
- An append-only release history containing version, channel, source revision, signed-manifest reference once available, approver, release time, rollback relationship, and human change note. Store the immutable release event before exposing it as current.
- OTA posture for a future native app: `not supported`, `prepared`, `canary`, `stable`, or `paused`. OTA cannot be enabled until the app has a signed update manifest, compatible client verification, staged rollout/rollback controls, and retention policy.

Persisted Settings, provider tokens, release authorization, and OTA assets are out of scope for this local recovery. Design schemas and migrations in the owning issue, with explicit access control and audit events.

## Separate-developer pickup prompts

### #19 — OAuth-only YouTube

Implement a read-only OAuth connection lifecycle for YouTube without accepting API keys. Start with a threat model for callback validation, token encryption, refresh/revocation, account switching, scope minimization, and audit redaction. Keep all credentials outside the repository. Provide local mocked tests and an owner-run deployment checklist; do not configure a real client, account, callback, or Cloudflare secret.

### #20 — Social provider framework

Design provider-agnostic connection records and consent state with per-provider scope definitions, encrypted-token boundary, revocation, health projection, and audit-safe error codes. Start with mocked adapters; do not scrape, use personal access tokens, or enable any provider write scope.

### #21 — Production calendar

Model one canonical internal production schedule and create read-only/export projections only after owner selection of calendar provider, identity, timezone policy, conflict policy, and retention. UI must make an unconnected calendar visibly unavailable. No external calendar write or subscription is authorized.

### #22 — MCP, plugin, and Settings

Keep `wtf-os-local` stateless and read-only. Test it directly over STDIO before any marketplace/global install. For `wtf-os-remote`, make a Cloudflare Worker implementation behind an owner-approved host and OAuth/Access policy, with tools that receive only redacted DTOs. Build the Settings cards and copy-prompt UX from real connection/release data, then add immutable release events before any OTA capability. Do not use this issue to configure or manage Cloudflare resources.

## Handoff acceptance

1. Each developer works from one issue with path ownership and a no-secret/no-deploy boundary.
2. Local tests prove unavailable and malformed states fail closed.
3. Any real connection, deployment, installation, export, or OTA release pauses for explicit owner approval.
4. The resulting handoff records exact test evidence and unresolved owner inputs.

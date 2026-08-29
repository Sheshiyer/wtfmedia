# WTF OS agentic Settings and release-history contract

**Status:** planned interface contract; no persistent Settings system or release channel is active in this repository.

## Purpose

Give a WTF OS operator a truthful, inspectable way to configure optional agentic connections and understand which product release they are using. The page must never silently alter Codex, Cursor, a cloud client, Cloudflare, a provider account, calendar, or application installation.

## Information architecture

1. **Agentic connections** — local MCP, hosted MCP, YouTube, future social providers, and calendar export. Show source, permissions, last verified time, and a safe error code. Only a server-confirmed state may say connected.
2. **Client setup** — choose Codex, Cursor, or another compatible client. Render an exact copy prompt/configuration template for that client. The template contains no secrets and has only a local command or `<owner-approved-host>` placeholder. It is copied, never applied automatically.
3. **Release and channel** — semantic version, revision, channel, published state, changelog, approval, rollback target, and compatibility range. A repository-local build must say `local scaffold`; it is not a release.
4. **History** — immutable release-event list ordered by release time. Each event records version, channel, revision, artifact/manifest reference once signed, approver, change note, supersession/rollback relation, and evidence link.
5. **OTA (future native app)** — the update artifact, signature verification, compatibility, staged cohort, pause/rollback, and retention live behind a separate signed release manifest. Until then, render `not supported`.

## State rules

| Surface | Allowed states | Truthfulness rule |
| --- | --- | --- |
| Connection | `not_configured`, `awaiting_authorization`, `connected`, `degraded`, `revoked` | `connected` requires a recent server-side verification record. |
| Local MCP | `available`, `unavailable` | Availability is the direct local protocol check, not package presence. |
| Hosted MCP | `not_configured`, `authorized`, `degraded` | Never show an endpoint until owner-approved Access/OAuth and deployment are live. |
| Release | `local_scaffold`, `draft_held`, `canary`, `stable`, `paused`, `rolled_back` | A version alone never proves publication or OTA availability. |
| Calendar | `not_configured`, `projection_ready`, `exported`, `revoked` | An internal schedule is canonical; external calendars are projections. |

## Data and security contract

- Store settings records separately from OAuth credentials. Client-facing DTOs must contain status and metadata, never tokens, secrets, raw provider responses, internal storage paths, or private transcript/provenance data.
- Create an append-only release event before changing the current-release projection. Audit settings, connection, release, export, and rollback mutations with actor and correlation ID.
- Make release manifests immutable and signed before any native-app OTA support. Enforce monotonic version/channel rules, compatibility checks, rollout cohort policy, and a tested rollback target.
- Treat copy prompts as documentation generated from an approved template. They must not invoke shell commands or modify config when rendered or copied.

## Delivery sequence

1. Verify the local, read-only MCP by direct protocol test.
2. Add read-only Settings DTOs and empty/unconfigured UI states.
3. Implement OAuth/provider connections in their own issues, then surface their verified state.
4. Add canonical calendar and export projection after owner approval.
5. Add immutable release-event history and release-channel workflows.
6. Build native-app OTA only after signed-manifest, staged rollout, and rollback acceptance tests pass.

# Phase 3 held-recovery plan

> Status: local-only recovery. This plan restores trustworthy behavior in the
> draft-held checkout; it does not authorize deployment, provider configuration,
> OAuth consent, R2 binding, calendar synchronization, or plugin installation.

## Goal

Replace the current fabricated and browser-visible Phase 3 behavior with a
small, fail-closed foundation that can safely receive owner-authorized Cloudflare
assets and OAuth connections later.

## Design

- The public web application may resolve a public YouTube video ID and timestamp
  from an answer citation. It must not import a catalog snapshot, infer an
  Uncut object path, expose provenance hashes, or fabricate timeline alignment.
- Uncut playback remains explicitly unavailable until an authenticated Worker
  endpoint returns a per-request signed playback projection with a verified
  alignment DTO. The UI keeps the control visible but disabled and explains the
  prerequisite.
- The YouTube adapter accepts an OAuth bearer authorization only. When no
  authorization is connected it returns `connection_required` without making a
  request, creating a job, or recording an audit event.
- The manual Worker sync endpoint returns
  `503 {"error":"youtube_oauth_not_configured"}` before any database write.
  The operator UI renders that state instead of invented quota, channel, or
  completion telemetry.
- Upload UI never creates a mock ticket or a mock asset. It reports the actual
  failure and preserves the selected file for retry.

## Implementation tasks

1. Quarantine browser catalog mappings
   - Replace `web/lib/provenance/catalog-mapping.ts` with a public-only citation
     resolver and remove `web/src/data/catalog-snapshot.json` from imports.
   - Make `useDualPlayback` consume only intervals passed by a trusted caller;
     an absent alignment produces an unmapped result rather than an identity
     mapping.
   - Update public chat and episode controls to show YouTube playback only and
     a disabled Uncut state.
   - Tests: public citation has no media URL, intervals, or Uncut-only claim.

2. Fail closed on unconfigured YouTube OAuth
   - Add a `connection_required` result to the adapter and require a bearer
     authorization before calling the YouTube API.
   - Remove API-key query construction, default channel IDs, and scheduled
     fallback channels.
   - Return the explicit 503 response from the manual sync endpoint before any
     job/audit mutation.
   - Tests: no authorization performs no network call; HTTP requests contain an
     Authorization header and no `key` query parameter; manual sync produces no
     persistence side effects.

3. Make operator controls truthful and type-safe
   - Move the JSX ingest workspace module from `.ts` to `.tsx`.
   - Remove synthetic sync and upload success paths. Use semantic controls,
     connected labels, and a live status region for actual results/errors.
   - Tests: typecheck and targeted unit/integration suites.

4. Record bounded follow-up work
   - Convert the blocking input packet to OAuth-only language; do not place any
     client secret, token, redirect value, or account identifier in the repo.
   - Add a separately executable handoff for issues #19–#22 covering OAuth,
     social providers, calendar projections, and the local-only MCP/plugin
   scaffold.
   - Update `.project/HANDOFF.md` with the local commit and owner gates.

5. Establish a safe MCP and release-management seam
   - Ship a stateless local MCP scaffold with deterministic, read-only tools
     for product status, release history, and client configuration guidance.
   - Design a separately deployable Cloudflare Worker MCP at `/mcp` using
     Streamable HTTP. It will remain read-only and unavailable until an owner
     approves Cloudflare Access/OAuth, bindings, and deployment.
   - Define the future Settings experience: a copyable client-specific setup
     prompt for Codex, Cursor, and compatible cloud clients; explicit
     connection state; release channel/version; changelog; OTA/release posture;
     and an auditable history. Do not create a fake persisted settings surface.
   - Keep Cloudflare's account-management MCP optional and disabled by default;
     it is distinct from the WTF OS MCP because it can manage account resources.

6. Verify and checkpoint
   - Run focused web unit tests, Worker tests, typecheck, lint/check where
     available, and `git diff --check`.
   - Commit only reviewed safe code and documentation locally. Leave the branch
     unpushed and report remaining owner-required integration gates.

## Acceptance criteria

- No public source imports or references the local catalog snapshot or
  `/media/uncut/` paths.
- The public citation test passes and a missing Uncut connection is visible as
  unavailable rather than playable.
- The manual YouTube route returns the 503 OAuth-unconfigured response with no
  job/audit mutations.
- Adapter tests prove OAuth authorization is required and API-key query strings
  are absent.
- The local MCP can be exercised without credentials and its generated client
  configuration stays disabled by default; remote MCP deployment remains an
  owner gate.
- No external provider, Cloudflare, calendar, plugin installation, or deployment
  action occurs during this recovery.

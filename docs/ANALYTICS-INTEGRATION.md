# Google analytics integration

## Boundary

The Beta analytics route is `/beta/settings/workspace/analytics`. Clerk proves the WTF OS principal; Google OAuth is a separate read-only provider connection. Editors have `analytics:read`. Admins and super-admins also have `analytics:manage`.

Normal report loads read D1 only. Google calls occur during OAuth/resource validation and scheduled synchronization, never during dashboard rendering.

## Google Cloud setup

Enable:

- YouTube Data API v3
- YouTube Analytics API
- Google Analytics Data API

Create an OAuth 2.0 Web Application client. Register an exact callback for each approved environment:

- Staging: `https://beta-staging.wtfhq.in/beta/api/analytics/oauth/callback`
- Production: `https://wtfhq.in/beta/api/analytics/oauth/callback` (register and use only in a separately approved production release)

Approved scopes:

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`
- `https://www.googleapis.com/auth/analytics.readonly`

No upload, account-management, partner, monetary, comment, or playlist-write scope is used.

## Runtime configuration

The edge worker expects these server-only values:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
ANALYTICS_TOKEN_ENCRYPTION_KEY
```

The client ID and redirect URI may be ordinary environment variables. The client secret and encryption key must be Worker secrets. Never place them in source, Wrangler configuration, browser variables, logs, issues, or chat. Generate the encryption key from a cryptographically secure random source and retain its key version for rotation planning.

Do not configure any of these values until the target environment and callback registration are approved.

## Migration

`0018_analytics_connections.sql` adds:

- single-use OAuth transactions;
- encrypted provider connection envelopes;
- selected YouTube channels and GA4 properties;
- YouTube channel/video daily metrics;
- GA4 daily totals and traffic-source metrics;
- idempotent synchronization runs and retry state.

Apply it through the existing reviewed environment-specific migration process. A missing migration produces a truthful `migrationRequired` status rather than a simulated connection.

## Connection flow

1. An admin chooses YouTube or GA4 and starts OAuth.
2. The edge stores only a SHA-256 digest of a random, ten-minute, operator-bound state.
3. Google returns to the exact allowlisted callback.
4. The callback consumes state before exchanging the code, preventing concurrent replay.
5. The edge checks the granted read-only scopes and AES-GCM encrypts the refresh/access credential envelope before D1 persistence.
6. The admin enters a YouTube channel ID or numeric GA4 property ID.
7. The edge validates that resource with the stored provider credential before selection.
8. Scheduled synchronization backfills the YouTube catalogue, refreshes a seven-day overlap, and upserts date-keyed provider reports.

Disconnect attempts Google revocation, removes the encrypted credential envelope, disables the selected resource, and stops future synchronization. Historical report retention remains an owner policy decision.

## Scheduling

The source contains a scheduled handler and idempotent synchronization worker. It intentionally declares no Wrangler cron trigger. Add the approved trigger only after staging migration, OAuth configuration, channel/property selection, cadence, quota budget, and owner authorization are recorded.

The default worker window is the previous seven complete UTC days. This overlap allows delayed provider data to correct earlier stored dates. Retryable quota and 5xx failures use bounded exponential backoff with jitter. Production synchronization remains held until separately approved.

## Metrics

YouTube stores views, estimated watch minutes, average view duration, likes, comments, shares, subscribers gained, and subscribers lost when returned by the report. Unknown or unsupported values remain `NULL` and render as unavailable.

GA4 stores daily active users, sessions, engaged sessions, engagement rate, and session default channel group. Daily totals use a separate no-dimension report because user counts are non-additive across traffic-source rows.

## Recovery

- `expired` / `token_refresh_failed`: reconnect the provider.
- `missing_permission`: reconnect and confirm the approved scopes/resource access.
- `quota_limited`: wait for the recorded retry window; do not repeatedly trigger manual requests.
- `provider_unavailable`: allow bounded retries, then inspect the redacted sync-run code.
- `migrationRequired`: apply the reviewed D1 migration before configuring OAuth.
- revoked access: reconnect; never reuse a previously exposed or revoked secret.

Do not log Google response bodies, tokens, authorization codes, OAuth state, or encrypted credential envelopes.

## Acceptance before production

- Reconcile matching date ranges and timezones against YouTube Studio and GA4.
- Record known provider reporting delay and GA4 reporting identity.
- Verify signed-out, member, suspended/revoked, editor, admin, and super-admin behavior.
- Verify desktop and mobile layouts.
- Confirm direct API calls deny unauthorized principals.
- Confirm disconnect stops refresh and reconnect does not duplicate daily rows.
- Record exact staging migration and deployment receipts.


## Local development

The local edge uses the existing staging D1 binding. Applying migration
`0018_analytics_connections.sql` there requires explicit owner approval; a local
server does not imply an isolated database.

Store server credentials in ignored `cloudflare/.dev.vars` using the canonical
`GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` names. The Google
project ID identifies the owning project; OAuth requests use its client ID.
Set `GOOGLE_OAUTH_REDIRECT_URI` to
`http://localhost:3000/beta/api/analytics/oauth/callback` and register that exact
URI on the Google OAuth web client. Keep a stable random
`ANALYTICS_TOKEN_ENCRYPTION_KEY` in the same ignored file.

From `cloudflare/`, start the edge with both files explicitly:

```sh
wrangler dev --config wrangler.jsonc --env local --env-file .dev.vars --env-file .dev.vars.local --port 8787
```

The second file preserves local identity/origin overrides. It is a tracked
local configuration file: do not put Google secrets in it. Without the explicit
file arguments, Wrangler selects `.dev.vars.local` and skips `.dev.vars`.
OAuth completion returns to the configured callback origin, including when the
frontend proxies to a different edge port. Real provider connection still
requires Google consent, the required APIs enabled, and the analytics migration.

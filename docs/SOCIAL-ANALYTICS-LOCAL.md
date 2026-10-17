# Social analytics local lab

The standalone `/social-analytics` route is a local-only experiment. It uses
Zernio's hosted OAuth handoff so a teammate connects LinkedIn, Instagram,
Facebook, or X (Twitter) from WTF OS without entering provider credentials into this
repository.

The same workspace is also available at `/beta/social-analytics` for signed-in
beta users with `analytics:read` when Clerk is configured locally. During
`next dev`, the public WTF OS hamburger links to `/social-analytics`, and the
beta hamburger links to `/beta/social-analytics` for local principals.

## Local environment

Create `web/.env.local` with these uncommitted values:

```dotenv
ZERNIO_API_KEY=your_server_side_zernio_key
ZERNIO_PROFILE_ID=your_zernio_profile_id
SOCIAL_ANALYTICS_LOCAL_ENABLED=1
```

The explicit enable flag is intentionally absent from deployed environments.
The API key is read only by Next.js route handlers. Client components receive
connection URLs and normalized analytics data, never the key. All three route
handlers also reject non-loopback hostnames, preserving the experimental local
boundary until the module is intentionally integrated with beta authentication.

## Flow

1. Open `http://localhost:3000/social-analytics`.
2. Choose a platform and select **connect**.
3. Complete Zernio's hosted OAuth and any page/profile selection.
4. Zernio returns to `/social-analytics`; the page refreshes account health.
5. When the Zernio Analytics add-on is available, the dashboard loads unified
   totals, daily distribution, follower movement, and top posts.

LinkedIn personal-profile analytics can be limited to posts published through
Zernio. LinkedIn organization pages and the other supported account types may
return broader provider history according to their permissions.

## What PR #84 adds

This is a separate social analytics dashboard, not an extension to YouTube
analytics, Ask WTF, or the Research agent. It has connection/reconnection cards
for the four platforms, platform and 7/28/90-day filters, metric cards, a daily
impressions chart, and a top-post list. The menu entry is in the hamburger,
not the bottom dock. Research navigation and the production YouTube visibility
rule are preserved by the integration.

The browser calls three Next.js routes:

| Route | Purpose |
| --- | --- |
| `GET /api/social-analytics/status` | Check configuration, list accounts in the configured profile, then check each account's health. |
| `POST /api/social-analytics/connect` | Request a hosted platform authorization URL and navigate the browser to it. |
| `GET /api/social-analytics/dashboard` | Request analytics for the profile, platform and selected UTC date range. |

The server adapter in `web/lib/social-analytics/zernio.ts` sends the key to
Zernio as a bearer credential, uses a 15-second provider timeout and no-store
fetches, and projects the returned fields into browser DTOs. Platform tokens
are managed by Zernio; this PR adds no platform-token storage or database
migration. It does not use an AI model.

The profile is one server-configured workspace, not a private profile created
for each WTF OS user. Use a profile dedicated to the four supported platforms:
“All connected” requests the provider's totals for that entire profile.
The Beta page has the existing principal/capability gate. The standalone local
page and its API intentionally do not implement production user/RBAC controls.
They require loopback hostnames and the explicit flag, and are disabled in a
production build even if that flag is accidentally set. The connection POST
also rejects cross-origin requests and requires JSON. Do not expose the local
lab through a tunnel or treat it as a production-ready authorization design.

These variables belong in **`web/.env.local`** for this implementation;
`cloudflare/.dev.vars` is not automatically read by these Next.js routes.
Restart the local web server after adding them. No credentials are included in
the merge, and neither staging nor production is activated by it.

## Reading the numbers

[Zernio's dashboard contract](https://docs.zernio.com/analytics/get-analytics-dashboard)
uses UTC days. Totals and daily observations cover engagement received in the
chosen window. Top posts were published in that window but carry lifetime
metrics, so their values need not add up to the window totals. Reach totals are
reported aggregates, not a count of distinct people across platforms and days.
The chart consistently shows impressions, including real zero values; it does
not substitute views or reach on individual days. Missing numeric fields show
as unavailable rather than invented zeroes. Account-health failures remain
unknown rather than claiming a healthy connection.

## What is not included

- Staging/production rollout, per-user profile ownership, or server-side admin
  authorization for managing connections outside the local lab.
- Publishing/scheduling posts, disconnecting accounts, saved social reports,
  automated sync jobs, or social analytics chat.
- New YouTube impressions/CTR support or changes to YouTube OAuth.
- A previous-period comparison UI: the provider request includes comparison
  data, but this workspace currently renders only the current window.

The provider dashboard requires its Analytics add-on and authorized platform
accounts. Results depend on platform permissions and synchronization coverage.
Live OAuth and real account analytics must be tested separately; mocked
adapter/route tests establish source behavior, not provider acceptance.

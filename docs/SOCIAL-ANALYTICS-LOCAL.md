# Social analytics and private metric chat

The authenticated workspace is `/beta/social-analytics`. Members can read and
ask questions; admins and super-admins can select the shared Zernio workspace
and connect/reconnect LinkedIn, Instagram, Facebook and X. Saved chats belong
to the signed-in account, not everyone using the shared connection.
Admins can also select a LinkedIn company Page administered by the connected
login and remove a connection after an explicit confirmation. Selecting a Page
uses Zernio's account-type switch and requests an external-post sync; merely
opening the picker changes nothing.

Implementation is local source only. Hosted flags are off by default. No shared
migration, provider configuration, push or deployment is implied.

## Setup for local testing

Apply migrations through `0024_social_analytics.sql` to a **local** test D1 before
testing. The migration adds workspace selection, private snapshots/tombstones,
and per-user request counters. Applying it to staging or production is a
separately approved operation with a recovery receipt.

Set these names in ignored `cloudflare/.dev.vars` (do not commit credentials):

```dotenv
SOCIAL_ANALYTICS_ENABLED=1
ZERNIO_API_KEY=
# Optional verified override; no profile ID is required for automatic discovery.
ZERNIO_PROFILE_ID=
ANTHROPIC_API_KEY=
```

Set in ignored `web/.env.local`:

```dotenv
SOCIAL_ANALYTICS_ENABLED=1
NEXT_PUBLIC_SOCIAL_ANALYTICS_ENABLED=1
WTFMEDIA_EDGE_LOCAL_ORIGIN=http://localhost:8787
```

Retain the existing local Clerk/Edge host configuration described in `PROJECT.md`.
Start the Edge with `npm --prefix cloudflare run dev` and Next with
`npm --prefix web run dev -- --hostname localhost`. Restart after configuration
changes. Sign in and open the social workspace. The sole accessible profile or
unique default is discovered automatically from the API key. If multiple profiles
have no unique default, an admin must select one. An explicit admin selection
or server override takes precedence; a stale selection never falls back to a
different workspace. No profile is created automatically. Only admins and
super-admins can connect or reconnect accounts. Members and editors can view
the shared metrics and ask questions, but cannot change connections or profiles.

Staging/production require separate server-side Web and Edge enable flags;
`NEXT_PUBLIC_SOCIAL_ANALYTICS_ENABLED` only controls navigation and grants no
access. All API requests still require current Clerk/D1 admission and the
appropriate capability.

## How a question becomes an answer

1. The browser sends the question, visible filters and bounded conversation
   context to `/beta/api/social-analytics/assistant` through the existing proxy.
2. The Edge verifies the principal and limits chat to ten requests per minute.
3. The shared Ask WTF direct Claude helper (`claude-sonnet-5-5`) interprets the request into a validated
   query plan. It cannot choose arbitrary tools, URLs, SQL or workspace IDs.
4. The server reads Zernio evidence under the selected profile. Post references
   are resolved within a bounded profile-scoped catalogue and checked against
   connected account IDs, never fetched by an unverified arbitrary ID.
5. Server code calculates differences and returns typed tables, dates, source
   references, freshness and limitations. Model-generated numbers are not used.

Supported requests include platform summaries, matching-period platform
comparisons, equal-length period comparisons, post comparisons, metric rankings
and daily trends. Follow-ups such as “the second one” resolve one prior entity.
Explicit new filters take precedence; changing dashboard filters clears implicit
conversation scope. Post titles with several matches require a choice.

Budgets: 2,000-character question, eight prior turns of 2,000 characters,
four platforms, two periods, ten displayed rows, twelve provider requests,
three dashboard requests in parallel, up to five pages of 100 posts, 15-second
provider timeout, 20-second model timeout and 60-second total budget. Transient
idempotent provider reads retry once within that budget. Connection handoffs do
not retry automatically. Incomplete coverage is disclosed.

## Reading the results

- Missing values remain **Unavailable**; a reported zero remains **0**.
- LinkedIn personal-profile analytics only cover posts published through
  Zernio or individually imported by URL. Choose a company Page for Page
  analytics. A healthy connection with no observations is not a zero-reach
  diagnosis. Facebook may similarly need a completed external-post sync;
  the 90- and 365-day filters help distinguish sparse recent activity from
  absent historical data.
- Strongest posts use provider captions, image thumbnails and outbound post
  links where supplied. If enrichment fails, aggregate dashboard totals remain
  available and an opaque provider post ID is not displayed as a title.
- Dashboard totals measure activity received during the selected inclusive UTC
  dates. Post totals are **lifetime-to-date** for posts published in those dates.
- Post searches cover the selected publication dates. If an older post cannot
  be found, widen the date range. First-N-day post comparisons are unavailable
  without historical observations; lifetime figures are never substituted.
- Percentage change is unavailable with a zero baseline. Engagement-rate
  differences are percentage points. Provider formulas can differ by platform;
  comparisons are directional and reach is not unique people across networks.
- Daily trends support impressions, reach, views and follower growth. Longer
  ranges show the latest ten observed days and disclose that limit.
- Rankings exclude unavailable values. A bounded or incomplete post scan is not
  presented as an overall winner. Cross-post platform measurements stay separate.
- A platform error preserves the other platforms' evidence. Causes and suggested
  improvements are not presented as proven explanations or guaranteed outcomes.

## Chat controls and privacy

The chat has a separate scrolling conversation area, fixed composer, suggestions
toggle, retry, stop waiting, copy/download answer, and private save/reopen/delete.
Stopping waiting cancels the browser wait; it does not promise downstream work
or billing has stopped.

Saved answers are historical snapshots with original evidence timestamps.
Follow-ups re-fetch data. Snapshot values are never trusted as provider evidence.
Permanent deletion clears content and leaves a minimal owner-scoped tombstone
so stale saves cannot restore the chat. Account deletion erases social chat
content, tombstones and request counters. Ordinary member deletion does not
remove the shared social connection.

## API and source map

All private routes are below `/beta/api/social-analytics`:

| Route | Access | Result |
| --- | --- | --- |
| GET `/status` | Analytics read | Connection state; admins also see available profiles |
| POST `/selection` | Analytics manage | Confirm a profile from the server's discovery list |
| POST `/connect` | Analytics manage | Zernio-hosted OAuth URL for the selected profile |
| GET/PUT `/linkedin-pages` | Analytics manage | List administered Pages; switch the selected LinkedIn account to a verified Page |
| DELETE `/accounts/:id` | Analytics manage | Remove an active account in the selected profile |
| GET `/dashboard` | Analytics read | Normalized dashboard for validated platform/dates |
| POST `/assistant` | Analytics read | Validated plan and structured evidence answer |
| GET/POST `/investigations` | Owner | List/save private chat snapshots |
| GET/DELETE `/investigations/:id` | Owner | Reopen/permanently delete a private snapshot |

The runtime-neutral provider and contracts live in `cloudflare/src/social-analytics-*`.
The local web wrapper uses the same normalizers. UI lives in
`web/components/domain/social/`. No vector store, research runner or new AI
provider is introduced. Research, Ask WTF and production YouTube visibility are
unchanged.

The standalone `/social-analytics` lab retains its loopback-only,
`SOCIAL_ANALYTICS_LOCAL_ENABLED=1`, non-production guards and old server-only
`web/.env.local` Zernio configuration, with API-key-only discovery. It exposes
no private chat/history API and cannot initiate connections: its connect route
returns 403 and the UI links to the signed-in workspace. Use authenticated Beta
to connect accounts and test chat. Reader status responses omit profile IDs and
profile lists; admins retain the identifiers required by the profile selector.

## Acceptance boundary

Automated provider, planner, router and UI tests use controlled data. They prove
source behavior, not connected-account accuracy or deployment acceptance. Real
Zernio reconciliation, hosted OAuth, two-user signed-in privacy, and responsive
Safari/Chromium checks remain necessary before rollout. Read-only live profile
and account discovery succeeded during PR #85 integration. This does not prove
OAuth completion or metric accuracy in a signed-in browser.

Provider references: [profile discovery](https://docs.zernio.com/profiles/list-profiles),
[dashboard](https://docs.zernio.com/analytics/get-analytics-dashboard), and
[post analytics](https://docs.zernio.com/analytics/get-analytics).

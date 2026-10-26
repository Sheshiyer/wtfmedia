# Social Analytics Chat Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task after owner approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admitted users ask natural-language questions about connected LinkedIn, Instagram, Facebook and X accounts, receive verifiable metric answers and comparisons, and save private conversations.

**Architecture:** Follow the existing YouTube assistant pattern: the model interprets a question into a validated query plan, Zernio supplies evidence, and server code calculates and formats the answer. Use the existing Beta web-to-Edge proxy and Clerk/D1 authorization. Shared workspace connections and private user conversations remain separate; no vector database, research runner or autonomous multi-agent loop is needed.

**Tech Stack:** Existing Next.js/React, Cloudflare Worker/D1, Zernio HTTPS API, and shared `openRouterChat` helper. The repository currently defaults to `z-ai/glm-5.3-flash`; inherit the approved environment configuration rather than introducing a second provider or promising model availability.

**Spec:** Owner request dated 2026-10-18: plan a social-metrics chatbot like YouTube analytics, including comparisons; implement only after approval. Scope and acceptance requirements are recorded below. Existing baseline: `docs/SOCIAL-ANALYTICS-LOCAL.md` and PR #84, integrated as `752dd07`.

**Status:** Owner approved local implementation on 2026-10-18. Implementation and automated verification are complete locally; credentials, shared migrations, push and deployment remain out of scope.

Execution note: storage and UI were implemented in independent parallel work slices after the shared contracts were established. Integrated verification precedes a single cohesive local commit because the new routes, shared types, migration and UI depend on one another. Live provider and signed-in browser acceptance are deferred until the owner supplies the Zernio key.

## Product scope

Examples the first release should handle:

| Question | Expected behavior |
| --- | --- |
| How did Instagram perform last month? | Platform summary with exact dates and available metrics. |
| Compare Instagram and LinkedIn this month. | Side-by-side metrics for matching UTC dates; distinguish platform definitions. |
| Which platform gained the most followers? | Rank comparable follower changes from the connected supported platforms. |
| Compare this week with last week. | Equal-length periods, absolute differences and valid percentage changes. |
| Which five posts got the most shares? | Provider-backed ranked posts, with platform, date, IDs/links and coverage. |
| Compare these two posts. | Resolve exact authorized posts, display each one's metric basis and evidence. |
| How did the second one perform? | Answer about the second entity in the prior result, not repeat the comparison. |
| Only show its clicks. | Preserve the resolved entity/date scope while narrowing the metrics. |
| Why did engagement fall? | Explain observed changes and contributing metrics; do not claim an unproven cause. |
| What should we improve? | Evidence-linked observations and clearly labeled suggestions, not guaranteed outcomes. |

Initial metrics: impressions, reported reach, likes, comments, shares, saves, clicks, views, provider engagement rate, follower count and follower change. Support only combinations actually returned for that account/platform. Derived values: absolute/percentage differences, interaction count and explicitly labeled ratios with documented denominators. Revenue, ad ROAS, conversions, demographics, best posting time, sentiment and competitor-private metrics are not promised by the current adapter. Add platform-specific tools only after contract and account-access verification.

“All things with metrics” means read, explain, filter, compare, rank and export the returned evidence. Chat cannot publish/delete posts, disconnect accounts or change permissions. Download/copy the current answer and Save chat are included; scheduled reports and automatic posting are excluded.

## Global constraints

- Implementation starts only after the owner approves this plan. Deployment and shared D1 migrations remain separately authorized operations.
- Work on `feature/pavun`; do not push subsequent implementation unless explicitly requested.
- Preserve current Research and Ask WTF behavior, owner-scoped history, and YouTube Analytics hiding in production.
- No new library, transcript corpus, vector index, or research agent is required.
- Backend principal/capability checks enforce access; a menu or browser-supplied role is never authorization.
- API/model credentials stay server-side. Logs and handoffs contain no prompts, responses, credentials or internal owner identifiers.
- Missing/unsupported/pending metrics stay null with a reason. A measured zero remains zero.
- The hosted social feature stays disabled until separately approved; no new chat or private history is exposed on the unauthenticated `/social-analytics` lab.

## User flow and UI

1. Admin opens Social Analytics. The backend lists Zernio profiles using its key.
2. With one accessible profile, show its name and select it for admin confirmation. With multiple profiles, show a selector. Never silently select a different workspace. With none, explain setup and link to Zernio; do not create paid resources automatically. An existing configured profile remains a supported override, validated against accessible profiles.
3. The confirmed profile is stored once per environment. Members use the selected workspace and cannot switch its connection/profile through a request.
4. Admin connects/reconnects the platforms through Zernio. Members can view analytics and use chat, but cannot manage connections.
5. Chat inherits visible filters unless the question overrides them. Display profile/platform/account, dates and metric basis on each answer.
6. Each answer has a short conclusion, metric cards or a comparison table, evidence links, freshness and a concise limitation notice when needed. Metric values are rendered from typed server fields, not model-written numbers.
7. Follow-up references use resolved IDs and ordered entities, not just text similarity. Ambiguous post names show selectable candidates.
8. Desktop: chat beside dashboard with its own scrolling area and fixed composer. Mobile: full-width panel/drawer; no narrow squeezed tables, horizontal page overflow or content behind the navbar. Use existing tokens/components.
9. Include hide/show suggestions, New chat, Retry, Stop waiting, Copy/Download answer, Save chat, saved-chat list and confirmed Delete. Save/delete/retry show immediate progress and success/failure. Stop waiting cancels the client request; it must not promise a provider call has stopped or its cost was avoided.
10. Saved chats are account-private across devices. Reopening shows the historical answer with its original timestamp; asking another question re-fetches metrics rather than treating saved numbers as current evidence.

## Data and answer rules

- Explicit question scope overrides previous-turn scope, which overrides dashboard defaults. A deliberate dashboard filter change resets implicit scope for the next question and is reflected in the scope label.
- API date windows are inclusive UTC days, at most 366 days. Resolve relative dates server-side; reject nonexistent dates, reversed windows and future ranges. Show partial current-day coverage if the user includes today.
- Compare the same metric, units, attribution basis and time window. If platform definitions differ, label the comparison directional; do not declare unique people reached across networks by adding platform reach.
- Dashboard totals measure activity received during the window. Top-post metrics are lifetime totals for posts published in that window. Never compare these as though they are identical.
- Default post comparison is explicitly labeled lifetime-to-date. A request for first-seven-day or other age-matched comparison needs real historical observations; if unavailable, offer a clearly labeled supported alternative, not fabricated values.
- Percentage change is `(current - previous) / previous * 100` only with a nonzero baseline. From zero to positive: show the absolute increase and “percentage unavailable: zero baseline”. Engagement-rate changes use percentage points; do not average platform rates without compatible raw denominators.
- Ranking has a named metric. “Best” without a metric asks a clarification, with suggested choices. Do not find global winners by sorting only the dashboard's five displayed posts. Use provider sorting where valid; bounded pagination must disclose incomplete coverage. Null metrics are excluded from rankings, not treated as zero.
- Verify selected account/post membership under the authorized workspace before retrieving evidence. Do not treat a cross-post as two different creatives without labeling it, or collapse different platform measurements into one observation.
- A failed platform produces a partial answer with per-platform status. Distinguish not connected, permission missing, add-on unavailable, sync pending, empty response, timeout and actual zero.
- Provider post text and all prior chat messages are untrusted content, not instructions. The model cannot choose arbitrary URLs, profile IDs, SQL or unsupported tools.

## Proposed execution path

`Question + filters + bounded context -> authenticated Beta API -> validated model plan -> authorized Zernio calls -> deterministic calculations -> structured response -> chat UI`

Reuse `cloudflare/src/chat/openrouter.ts` for interpretation, following `cloudflare/src/analytics-assistant.ts`. One planner invocation per turn is the default; model wording is not evidence. Produce core summaries from verified result fields. Do not add a second generative call just to restate a table. Unexpected planner output gives a useful clarification/retry response; it never triggers an unrestricted provider query.

Initial execution bounds: question 2,000 characters; last 8 messages with 2,000 characters each; at most 4 platform targets, 2 comparison periods, and 10 result rows; at most 12 provider requests including discovery/validation, concurrency 3, and 5 pagination pages of 100 rows. Keep the existing 15-second provider timeout, use a 20-second planner deadline and a 60-second overall request deadline. Return partial/bounded coverage instead of silently exceeding limits. Retry an idempotent provider read at most once for transient errors and only within remaining budget; no automatic retry of profile/connection mutations.

Proposed typed contracts in `cloudflare/src/social-analytics-contracts.ts`:

- `SocialQueryPlan`: intent (`summary | platform_comparison | period_comparison | post_comparison | ranking | trend | clarification`), authorized account/post references, allowlisted metrics, date windows, metric basis, ordering and limit.
- `SocialChatContext`: visible scope plus ordered entity references from prior responses. Treat it as hints and revalidate every ID; never accept browser-supplied evidence values.
- `SocialEvidence`: platform/account/post reference, metric, nullable value, units, basis, dates, fetchedAt, provider dataAsOf, availability reason and source URL when available.
- `SocialChatAnswer`: status (`answered | partial | clarification_required | unavailable`), scope, summary, columns/rows, evidence, ordered entities, limitations and retryability. No owner IDs or credentials in browser DTOs.

## Implementation tasks

Every task follows: write its listed regression tests, confirm they fail, implement the bounded behavior, run its checks, review the diff, then make a local commit. Do not migrate shared databases or deploy as part of a source task.

### Task 1 — Authorized workspace/profile and provider access

**Files:** modify `cloudflare/src/member-router.ts`, `cloudflare/src/auth/policy.ts`, `cloudflare/src/index.ts`, `web/lib/social-analytics/zernio.ts`, and `web/components/domain/social/SocialAnalyticsWorkspace.tsx`; create `cloudflare/src/social-analytics-provider.ts`, `cloudflare/src/social-analytics.ts`, `cloudflare/src/social-analytics-contracts.ts`, `cloudflare/tests/social-analytics.test.mjs`; reserve the next migration number (currently 0024) and update `cloudflare/migrations/manifest.json` only at implementation.

**Interface:** `resolveSocialWorkspace(db, env)` returns the configured authorized profile; `fetchSocialEvidence(env, plan, workspace)` returns typed evidence and coverage. Move provider parsing into the explicit-env provider module. Retain a thin server-only web wrapper for the existing local lab, so there is one provider normalization implementation. Beta uses `/beta/api/social-analytics/*` through the existing catch-all proxy, not the unauthenticated lab API.

- [x] Tests: signed-out=401; suspended=403; member can read but cannot set a profile or start OAuth; admin can configure; one/many/no profile states; stale configured ID never falls back; supplied foreign account/profile is denied before fetching; disabled environment rejects all new endpoints.
- [x] Add a singleton environment-local D1 workspace selection row. Reuse the existing configured profile as an override without exposing configuration to clients. Backend handlers for status, admin profile confirmation, connection and dashboard use `analytics:read`/`analytics:manage` as appropriate.
- [x] Preserve the local lab boundary; gate new Beta surfaces with an explicit default-off social feature flag. No provider secrets are uploaded by this task.
- [x] Verify: `npm --prefix cloudflare test` and existing social adapter unit tests. Commit only when existing local behavior and new role checks pass.

### Task 2 — Evidence queries and honest comparisons

**Files:** implement query contracts/provider tools in the Task 1 modules; create `cloudflare/tests/social-analytics-evidence.test.mjs`.

**Interface:** `executeSocialPlan(env, workspace, plan)` returns `SocialChatAnswer` evidence/calculations; supports dashboard, paginated post analytics, single-post metrics and documented follower results. Preserve available post IDs, provider links and freshness in adapter DTOs. Use individual platform/account calls where the aggregate endpoint cannot express the required filter.

- [x] Tests: missing value != 0; baseline 0 != infinity; 10% to 12% = +2 percentage points; received-period totals are not lifetime post totals; incomplete paging cannot claim an overall winner; unsupported follower attribution is unavailable; one platform timeout preserves other platforms' results.
- [x] Implement allowlisted queries, membership validation, deterministic calculations, date validation and bounded concurrency/request counts. Rank only comparable supported observations.
- [x] Verify evidence tests and all existing YouTube analytics tests; commit without changing YouTube contracts.

### Task 3 — Model interpretation and follow-up context

**Files:** create `cloudflare/src/social-analytics-assistant.ts`, `cloudflare/tests/social-analytics-assistant.test.mjs`; modify `cloudflare/src/member-router.ts` and auth policy for `POST /beta/api/social-analytics/assistant`.

**Interface:** `handleSocialAnalyticsAssistant(request, env, principal, dependencies)` validates input, calls existing `openRouterChat`, validates `SocialQueryPlan`, and invokes `executeSocialPlan`. Inject planner/fetch dependencies for offline tests. Reuse existing admission/rate-limit infrastructure, with a proposed limit of 10 chat requests per minute per verified principal.

- [x] Tests: “second post” selects only prior entity B; changing to Facebook discards implicit Instagram scope; explicit dates win; duplicate title yields clarification; typos resolve only to a unique candidate; forged history metrics cannot become evidence; prompt injection in captions cannot invoke another tool; malformed model JSON/timeout returns a retryable state.
- [x] Implement scope precedence, bounded context, metric/tool allowlists and execution deadlines. Do not pass credentials, D1 owner IDs or unrelated private chats to the model.
- [x] Verify assistant and authorization tests; commit.

### Task 4 — Structured chat UI

**Files:** create `web/components/domain/social/SocialAnalyticsChat.tsx`, `web/tests/unit/social-analytics-chat.test.ts`; modify `SocialAnalyticsWorkspace.tsx`, `web/lib/social-analytics/contracts.ts`, and `web/app/beta/social-analytics/page.tsx` as needed.

**Interface:** `SocialAnalyticsChat({ scope })` uses existing `useMemberFetch`, posts question/context to the Beta endpoint, and renders `SocialChatAnswer`. Reuse YouTube's successful interaction patterns, not its video-specific iframe/scripts or provider logic.

- [x] Tests: singular follow-up doesn't show a two-entity table; missing metrics display Unavailable; pending send blocks double-submit; filter changes don't relabel an old answer; a late/aborted result cannot overwrite a newer conversation; retry retains the question; hide/show suggestions works with keyboard.
- [x] Implement scoped answers, responsive tables, evidence details, collapsible suggestions, loading/partial/error/empty states and plain-text/Markdown Copy/Download built from structured values. Only offer suggestions supported by the connected data.
- [x] Verify unit tests, lint and typecheck; inspect 320/768/1440px layouts and Safari/Chromium where available. Label any untested browser honestly. Commit.

### Task 5 — Account-private saved chats

**Files:** create `cloudflare/src/social-analytics-investigations.ts`, `cloudflare/tests/social-analytics-investigations.test.mjs`; extend the migration from Task 1 before any shared application; modify member router, policy, `cloudflare/src/user-deletion.ts`, and `SocialAnalyticsChat.tsx`.

**Interface:** `/beta/api/social-analytics/investigations` supports owner-scoped list/save and ID-scoped read/delete. Follow the existing `analytics-investigations.ts` model while using a separate social table and prefixed UUIDs. Save snapshots with schema version, messages, resolved scope and original evidence timestamps; validate shape/size (100 messages, 100 KB maximum). Stored browser snapshots remain untrusted and never become fresh evidence.

- [x] Tests: user A cannot list/read/delete user B's chat; revoked user denied; oversized or malformed snapshots rejected; deleting an account removes saved social chats; stale save retries cannot resurrect a deleted chat; save failure never shows Saved.
- [x] Implement private snapshots, delete/replay protection, confirmation, immediate progress and account-deletion integration. Shared workspace connection records are not deleted when an ordinary member is deleted.
- [x] Verify isolation/lifecycle tests and UI actions; commit.

### Task 6 — Acceptance and rollout preparation

**Files:** update `docs/SOCIAL-ANALYTICS-LOCAL.md`, `.project/HANDOFF.md`, architecture ledger and environment templates with names only, never credentials.

- [x] Run web unit/contracts/typecheck/lint/build, backend tests, privacy scan and architecture check.
- [ ] Test real authorized Zernio data for at least two platforms and manually reconcile selected metric answers with provider responses. Exercise rankings, period comparison, post comparison, context switching, missing data, expired connections and save/reopen/delete.
- [ ] Confirm signed-out/member A/member B/suspended/admin access and private history boundaries in a real signed-in browser. Local/mocked tests do not prove staging acceptance.
- [ ] Present the results and remaining provider gaps for owner acceptance. Keep staging/production disabled until separately approved; migration recovery receipt and environment-specific keys/profile binding are prerequisites to rollout.

## Review focus and acceptance cases

| High-risk input/condition | Required result | Owning task |
| --- | --- | --- |
| Multiple Zernio profiles or stale selection | Ask admin; no silent workspace switch | 1 |
| Unsupported metric or incomplete comparison | Null/partial with reason; no fabricated zero or winner | 2 |
| “Second one” after a comparison or a filter change | Correct single entity and visible dates | 3, 4 |
| Slow requests while starting a new chat | Immediate progress; stale results cannot overwrite | 4 |
| A second user or deleted chat retry | Owner isolation and no resurrection | 5 |

Approval means accepting the scope and task order for local implementation. It does not approve provider configuration, shared migrations, push, or deployment. No implementation estimate is a commitment until real account capabilities are checked.

## Provider references checked for this plan

- [List profiles](https://docs.zernio.com/profiles/list-profiles): discover accessible profiles; do not assume a fixed ID.
- [Analytics dashboard](https://docs.zernio.com/analytics/get-analytics-dashboard): daily/window totals, followers, comparison data and post lifetime metrics; Analytics add-on needed.
- [Post analytics](https://docs.zernio.com/analytics/get-analytics): post lookup, platform filters, pagination and sorting; pending/error states and LinkedIn personal-account history restrictions.

These documents describe provider capability, not a successful test using this workspace's credentials.

## Implementation receipt — 2026-10-18

- Tasks 1–5 implemented locally. Profile discovery requires admin confirmation;
  all admitted readers can query metrics; saved chats are private and tombstone-backed.
- Reviewer findings were reproduced and fixed: explicit IDs beat pronouns,
  same-platform follow-ups retain their post, comparison/trend intent survives
  reference resolution, matched-age requests never become lifetime answers,
  missing ranking contenders are disclosed, and distinct account observations
  retain account identity. Mixed current/previous calendar windows are aligned.
- Automated checks: full backend 514 passed, full web unit 326 passed, contracts
  97 passed; focused social suite subsequently includes an end-to-end authorized
  route/quota test. Typecheck, lint and production build pass.
- Controlled Chromium component fixtures passed 320/768/1440 overflow and core
  chat interactions. This is not real Clerk/provider acceptance; Safari/WebKit,
  live OAuth, live metric reconciliation and two real users remain unverified.
- Owner explicitly deferred supplying Zernio credentials. No secrets, shared
  migrations, runtime flags, hosted code or Git remotes were changed.
- Unsupported date-specific post history returns an explicit limitation;
  lifetime post evidence is never substituted for trend or period-specific data.

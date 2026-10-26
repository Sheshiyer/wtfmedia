# WTF OS — cross-machine conversation handoff

Prepared: 23 October 2026, Asia/Kolkata. Repository: `Sheshiyer/wtfmedia`.

This is a consolidated working-memory handoff, not a verbatim chat export. It preserves the owner's final decisions, implementation history, verified release receipts, unresolved issues and operating boundaries. Credentials, private user content, session identifiers and machine-specific checkout paths are intentionally excluded.

## 1. Start here: exact current state

- Working branch: **`feature/pavun`**. Continue here unless the owner requests another branch.
- Latest pushed commit: **`4eaaf9515296ac116ee0a731c022898a54ae96cb`** (`4eaaf95`). Local and remote matched and the working tree was clean before this handoff was created.
- PR **#86** was reviewed, merged, corrected, tested and deployed to staging. Its merge and fixes are already pushed.
- Staging runtime candidate: **`9990e5e8eb01640a94425080d74dee9e270f2a07`**. Later commits record receipts and preserve an architecture document; they do not represent additional runtime deployments.
- Staging URL: **https://beta-staging.wtfhq.in**. Social workspace: `/beta/social-analytics`; research: `/beta/research`; Ask WTF: `/beta/chat`.
- Production URL: **https://wtfhq.in**. Production deliberately differs from staging. Do not promote the feature branch wholesale.
- Latest task before this handoff: push everything and check CI. Push is complete. Hosted CI did **not** run for the current commit; see section 4.
- No new feature implementation is requested by this handoff. Read it, inspect the target checkout, and obtain the owner's next task.

Important correction to older receipts: `.project/HANDOFF.md` entries saying PR #86 was still local and the architecture draft was untracked describe the moment before the subsequent push. Those changes are now on the remote branch at `4eaaf95`.

## 2. Owner preferences and durable rules

1. Complete authorized work, including fixes, appropriate tests and requested deployment. Avoid repeatedly asking permission for already approved actions.
2. Explain outcomes simply. The owner wants a functioning product and clear explanations, not implementation terminology in normal user flows.
3. Use the existing architecture, templates, dependencies and provider integrations. Do not rebuild every social/search API individually.
4. Keep working on `feature/pavun`. Push only when explicitly requested. Prior pushes/deployments are completed authorizations, not unlimited future permission.
5. Staging and production are distinct operations. Production deployments, shared service changes, database migrations, credentials and provider setup need appropriate explicit scope.
6. Preserve PR #48 and PR #77 branches and their documented protection boundaries. Do not force-push, move tags or replace another agent's work.
7. Keep secrets server-only. Never copy `.dev.vars`, `.env` files, auth stores or tokens into a handoff, Git commit, browser bundle or diagnostic output.
8. Only admins/super-admins may manage YouTube/social connections. Readers can inspect permitted shared metrics and ask questions. Saved chats/reports are owner-scoped, subject to explicitly implemented sharing/admin capabilities.
9. Missing data must remain unavailable. Never turn a missing provider result into a reported zero or invent a citation.
10. Do not log prompts, answers, transcripts, raw provider error bodies or private ownership/session identifiers. Record safe status, counts, duration and error categories.

Read the actual checkout's `AGENTS.md`, `README.md`, `PROJECT.md`, `.project/HANDOFF.md`, `docs/AGENT-ONBOARDING.md`, and applicable release instructions before editing. Some onboarding/release prose is historical: resolve conflicts using current code and the most recent exact deployment receipts.

## 3. Release and Git receipts

### Latest known deployments

These are recorded deployment observations, not a fresh live read from the receiving machine.

| Service | Last recorded version | Context |
| --- | --- | --- |
| Staging Web, `wtfmedia-web-staging` | `dbaf9988-4994-4ab8-992f-32d6827ea36d` | PR #86 candidate `9990e5e`, 100% traffic, 22 Oct |
| Staging Edge, `wtfmedia-edge-staging` | `8271bf46-d7c2-451a-9935-8822bcbc832e` | Same candidate, 100% traffic, 22 Oct |
| Staging research host | `511a56ad-2176-47e4-aaac-935b4de31071` | Claude/research-reader rollout, 21 Oct; unchanged by PR #86 |
| Shared Alpha Edge, `wtfmedia-edge` | `375698fc-37da-44bd-a8f7-585b9d388868` | Separately authorized Claude citation repair, 21 Oct; serves production inference too |
| Internal Alpha Web, `wtfmedia-web` | `3d5a5965-14f3-486a-a608-330d539dec81` | Last recorded unchanged shared inference adapter |

The current production frontend version was not freshly inspected during the PR #86 task. Do not reuse old architecture snapshot versions as a current production receipt.

PR #86 rollback references:

- Staging Edge: `88d438be-a6f5-4cd3-8a98-aee5179dda62`.
- Staging Web: `56ab007a-ec01-4932-91cc-7608218c19af`.
- All 26 Edge and 10 Web bindings were unchanged by the rollout.
- No migrations, secret changes, production deployment or research-host deployment accompanied PR #86.

Last recorded research image: `sha256:f2f94dae049046a6eb7244cb2eb5a6dd6a949ee4274a31af42839b5dbc5587f8`. The rollout reused a verified dependency image after a registry layer upload failed; lockfile and all 14 Python runtime module hashes were checked. Do not assume rebuilding or changing a Web Worker also deploys this image.

### Recent commits

| Commit | Purpose |
| --- | --- |
| `4eaaf95` | Commit historical architecture/user-flow snapshot and refresh generated docs; pushed |
| `b97183b` | PR #86 staging deployment and smoke receipt |
| `9990e5e` | Harden local connection management, metric states and post-date handling |
| `2ca50de` | Merge PR #86 into `feature/pavun` |
| `92db836` | PR #86 upstream implementation |
| `8cc99fb` | Earlier no-evidence UI deployment receipt |
| `e77be40` | Hide sources on no-evidence responses and repair verification harness |

The architecture document `WTF_OS_Current_Architecture_and_User_Flows.md` is explicitly a **historical snapshot**. Its OpenRouter, research controls and deployment descriptions predate the latest changes. Do not use it to undo Claude or restore removed UI.

## 4. CI: precise current blocker

For commit `4eaaf9515296ac116ee0a731c022898a54ae96cb`:

- GitHub Actions returned **no runs**.
- Check-runs returned **zero checks**; commit status was `pending` with an empty status list. This is not a running job or a passing gate.
- Workflow inventory returned **zero active workflows**.
- `Phase 2 Gate`, workflow ID `343501812`, was reported as **deleted**.
- `Architecture ledger`, workflow ID `346176880`, was reported as **deleted**.
- `.github/workflows` exists on `feature/pavun`; querying that directory on the default branch `main` returned 404.
- Current GitHub credentials have push access but not admin access. Reading Actions policy settings returned 403. The exact repository policy could not be inspected.
- Older failures in the branch's run list are not failures for this commit. The latest listed successful Phase 2/Architecture runs were on 5 October for `20a19695da515b3dca7ca9c6878d3b886c58ba15`.

No empty commit, workflow-policy change or default-branch update was made to manufacture a CI result. A repository administrator needs to investigate and restore workflow registration/configuration. Recheck permissions and current workflow state before acting; this handoff does not authorize changes to `main` or repository-wide policies.

## 5. Tests and acceptance boundaries

PR #86 integrated source checks passed:

| Check | Result |
| --- | --- |
| Web unit tests | 429 passed |
| Web contracts | 101 passed |
| Edge tests | 576 passed |
| Phase 2 browser suite | 20 passed |
| Typecheck and lint | Passed |
| Privacy scan | 0 violations across 435 bounded files |
| Isolated OpenNext build | Passed; 98 pages generated |
| Staging Web and Edge dry runs | Passed |
| Architecture freshness after final document commit | Passed; 787 inputs |

Earlier Claude/research integration recorded 157 Python tests and 5 hosted-store tests. Those were not rerun for the later social-only PR; do not present them as newly executed against a fresh environment.

Live PR #86 smoke results:

- Root: 307; sign-in: 200; social workspace shell: 200.
- Signed-out principal API: 401.
- Signed-out GET/PUT `/beta/api/social-analytics/linkedin-pages`: 401.
- Signed-out DELETE `/beta/api/social-analytics/accounts/:id`: 401.
- Local-lab Page/removal routes on staging: 404.
- Compiled and live sign-in public Clerk identity matched staging.
- Both staging versions read back at 100% traffic.

Not proven by those checks: real LinkedIn Page switching/removal, OAuth completion, reconciliation of real provider metrics, every role/persona, Safari/macOS behavior, or a complete new live Claude research report. A page-shell 200 does not prove authenticated functionality. Controlled test fixtures are source verification, not live acceptance.

## 6. Product architecture that must stay intact

```text
Browser → Next.js Web Worker → authenticated Edge API
                                ├─ Clerk identity verification + D1 admission/RBAC
                                ├─ owner-scoped chats, research, settings and history
                                ├─ Google APIs / synchronized YouTube observations
                                ├─ Zernio social analytics
                                ├─ private Research Worker → Python Container → Treg + Claude
                                └─ shared Alpha Web /api/chat → Alpha Edge RAG + Claude
```

- Next.js 15 / React 19 / TypeScript, Tailwind and existing shared components; OpenNext packages the frontend for Workers.
- **Alpha alone owns transcript ingestion, corpus, retrieval, inference, grounding, citations, timestamps and enriched moments.** Staging/Beta must not create a second evidence plane.
- Beta owns identity/admission/RBAC and validated owner-scoped history. Staging delegates Ask WTF through `WTFMEDIA_ALPHA_WEB` to Alpha's established public contract.
- Clerk establishes identity. D1/Edge policy grants authority. Browser role arrays and navigation visibility are not authorization.
- Maintain one verified principal across route navigation and check destinations against it. Do not restore a full-screen “checking access” dialog on every page change or render protected data before admission.
- Members and operators share the accepted Ask WTF presentation through typed adapters to their separate stores. Do not recreate the old operator chat fork.
- Settings are under `/beta/settings/*`; administration under `/beta/admin/*`. Historical routes may only be compatibility surfaces.
- The shared Alpha service also affects production. A staging inference fix may therefore need a separately authorized shared-service release; a staging frontend deployment alone cannot update Alpha inference.
- Actual current apex configuration uses `wtfmedia-web-beta` for authenticated production ingress with `wtfmedia-edge`. Read live/config receipts; some older documents still describe the previous apex topology.

### Transcript ingestion and vectorization

Approved source asset + backing R2 object → queue → processing/chunking/provenance → embeddings → Vectorize plus supporting metadata → Alpha retrieval. Missing source receipts fail closed. Beta has no separate ingest queue or corpus to populate.

Historical corpus numbers vary by receipt: the 1 September baseline was 55 published / 49 mapped uncut assets and 11,948 vectors; README records later 56 published assets and 56/56 published timing on 4 September. No current full recount was done here. Mapping an uncut asset to an episode does not prove timestamp alignment. Deferred source exceptions remain documented in AGENTS/README.

Do not ingest new episodes, broaden the corpus or enqueue live jobs without the owner's task and the required source/provenance checks.

## 7. AI services: final decision supersedes earlier experiments

The owner moved generation from earlier OpenRouter/GLM and OmniRoute experiments to **direct Anthropic Claude**, with the repository model identifier **`claude-sonnet-5-5`**.

| Feature | Model role | Evidence authority |
| --- | --- | --- |
| Ask WTF | Generation, reformulation, repair/classification, enrichment | Alpha-retrieved transcript evidence |
| YouTube chat | Interpret a question into a validated query plan | Google APIs and stored analytics observations; server calculations |
| Social chat | Interpret a question into a validated query plan | Zernio workspace/account metrics; server calculations |
| Research | Resolve scope, summarize evidence, write/check sections and answer report follow-ups | Treg-derived retained public sources |

- TypeScript adapter: `cloudflare/src/chat/claude.ts`; Python adapter: `research/providers.py`.
- Server variable: `ANTHROPIC_API_KEY`. Never put it in a `NEXT_PUBLIC_*` variable.
- Transcript query embeddings remain the existing embeddings pipeline; switching generation providers does not require re-vectorizing the corpus.
- Old saved model metadata remains readable. Do not relabel historical OpenRouter/OmniRoute results as Claude.
- No silent fallback to old generation providers. Legacy secrets may remain attached; their removal/rotation is a separate task.
- Model names above are repository configuration and recorded runtime observations, not a new public model-catalog verification in this handoff.
- Safe errors distinguish missing credentials, provider errors, transport failures, truncation and malformed output. Do not expose provider bodies.

Shared Alpha live calibration on 21 October recorded an initial grounded answer and two grounded follow-ups at roughly 13.83s, 14.64s and 15.68s, plus a truthful unsupported-data abstention around 13.75s. These are bounded observed cases, not latency guarantees.

## 8. Ask WTF: behavior and citation fixes

The owner repeatedly emphasized useful context-aware follow-ups and truthful lack-of-data responses.

- Existing public contract: `/api/chat`, `messages: [{ role, content }]`, source modes `published`, `uncut`, `both`; streamed/plain-text response with `X-Sources` and `X-Fallback` metadata.
- Beta persists only the validated Alpha answer/source/moment projection; bounded conversation context crosses the bridge, not Clerk credentials, owner IDs, private memory or internal transcripts.
- Fixed false rejection of multi-sentence quotations with a valid trailing citation.
- Citation repair now produces structured sentences/source indices, validates them and rechecks coverage. Do not blindly append citations to unsupported claims.
- A too-small evidence-verdict output allowance truncated Claude responses; it was raised from 5 to 64 tokens.
- `X-Fallback=true` can also accompany a successfully repaired grounded answer. It does not alone mean abstention.
- **No-data/ungrounded/unavailable answers must not show “1 source cited,” stale sources, moments or duplicate warning panels.** Display the truthful explanation alone. This also applies when reopening previously saved turns.
- Grounded cited-excerpt fallbacks still retain legitimate evidence. Do not hide all sources merely because a fallback flag exists.
- Presentation cleanup does not rewrite saved records or fabricate evidence.

## 9. YouTube analytics history and final requirements

- Owner requested account-saved chats, not download-only/local-only storage. Saved investigations are private to the account.
- A comparison must use the intended videos and appropriate date windows. A follow-up asking about the second video must resolve that video alone.
- Preserve reported zero versus missing data, selected-period versus lifetime views, and matched post-publication windows versus calendar windows.
- The suggestion questions can be hidden/shown. The user wants immediate feedback for actions and readable narrow-screen tables.
- Only admins/super-admins connect/reconnect/select the shared Google account/channel; readers inspect allowed metrics and chat.
- The owner reported missing connection buttons on another device/macOS. Screenshots sometimes showed the explicit non-admin state. Do not assume an OS/CSS problem or bypass permissions; inspect the actual production principal, role, auth result and viewport.
- The later explicit owner decision was to **remove/hide YouTube Analytics from production**. Preserve the current production page/nav guards until explicitly reauthorized. Staging retains the feature. Hiding UI did not erase provider data.
- PR #83 was an earlier integration request involving analytics/CTR/impressions. Do not claim broad CTR coverage simply from that request; inspect current metric contracts and supported Google reports.

## 10. Social analytics and PRs #84–#86

- Zernio is the integration provider; the owner initially asked about a dynamic profile ID.
- Discover profiles server-side. A sole profile or unique default can be resolved; ambiguous choices require an admin. Respect explicit selections/overrides and fail on stale selection instead of silently switching workspaces.
- Members/editors can view permitted shared metrics and ask comparison/ranking/follow-up questions. Saved investigations remain private to each user.
- Claude plans; the application validates intents, metrics, dates/entities and scope, reads provider evidence and calculates numbers. The model must not invent numeric results.
- Snapshot chats are historical evidence; metric follow-ups can fetch current scoped provider data. Post lifetime metrics are not period activity.
- PR #84 introduced earlier social integration; #85 was later merged for the connection/chat flow. Migration `0024_social_analytics.sql` was explicitly approved for staging during that work. Recheck applied migrations before any future database operation.

### PR #86 (latest completed integration)

URL: https://github.com/Sheshiyer/wtfmedia/pull/86

Title: **Fix social analytics coverage and add LinkedIn Page management**.

Adds admin-only administered LinkedIn company Page selection, account-type switching and an external-post sync request; Manage connection/reconnect and confirmed removal; personal-LinkedIn coverage/sync messaging; 365-day date range; stronger post captions, safe thumbnails and outbound links.

Review fixes before shipping:

1. New standalone localhost APIs could have mutated real provider connections without authenticated admin admission. They now deny management and direct users to authenticated Beta. Removed unused local mutation wrappers. Beta Edge enforcement remains authoritative.
2. All-null metrics were incorrectly labelled no activity. UI now distinguishes unavailable metrics, pending sync and reported zeros.
3. Invalid provider post dates could crash formatting. The fallback title now handles them safely and formats valid dates in UTC.

Main files: `cloudflare/src/social-analytics-provider.ts`, `social-analytics.ts`, `social-analytics-contracts.ts`, `auth/policy.ts`; `web/components/domain/social/SocialAnalyticsWorkspace.tsx`; local API guards; associated Edge/web tests. See `docs/SOCIAL-ANALYTICS-LOCAL.md`.

The branch merge is pushed. No separate GitHub merge-button action was required. Recheck PR metadata if its visible status matters.

## 11. Research: final product intent

This is **pre-shoot guest/company/industry research**, not an episode-retrieval report. The owner explicitly rejected an episode-dependent workflow, user YouTube IDs and upload fields.

### Input and scope

- Three fields: guest name, company name, industry. **Any one field is sufficient**; two or three also work.
- Missing fields stay missing. Do not substitute the founder of a supplied company for an explicitly named different guest.
- Clarification is available when needed; optional clarification can be skipped. Skipping never authorizes an invented identity.
- Research only the requested scope. Guest-only, company-only and industry-only requests must not fabricate extra subjects. Inapplicable sections are skipped/omitted rather than shown as empty failed cards.
- Rename Private notes to **Additional info**; remove the checkbox in new submissions. Submitted guidance can influence priorities, comparisons, exclusions, interview angles, output structure and optional dates.
- “Last five months” was an example, not the only purpose of guidance. Explicit date requests guide/filter evidence; do not impose a fixed recency window on every report.
- Raw Additional info is not blindly copied into public searches; derive bounded public topics/constraints. Do not silently reuse previously unapproved legacy notes.
- **India is audience context throughout otherwise global research**, not a standalone mandatory India section or a filter excluding global sources. Discuss Indian relevance, gaps, skills, jobs and opportunities when supported and relevant, without inventing them.

### Report structure

| Tier | Intended coverage when applicable |
| --- | --- |
| Snacks | Guest profile: background, career, personality/leadership evidence and decisions |
| Appetizers | Company/industry economics, competitors, market context and supported comparisons/GDP contribution |
| Main course | Positioning, gaps and practical opportunities, including what young people in India could build or learn |
| Desserts | Main takeaways, outlook and scope-specific interview questions/follow-ups |

Keep four sections when the requested scope warrants them; do not generate irrelevant filler to satisfy slot counts. Questions must fit the accepted identity/company/industry and Indian audience context.

### Evidence and sources

- Use Treg adapters for six discovery channels: **Web, LinkedIn, YouTube, Instagram, Reddit, X/Twitter**.
- Web search uses the catalog-validated Perplexity tool through Treg. Social tools may use dedicated integrations or explicit domain-targeted web fallback.
- Distinguish content origin from retrieval method: a Reddit URL returned by web search does not prove a direct Reddit API call succeeded.
- Earlier owner request removed a hard 80-source limit. A later performance decision established **20 sources per channel, with spare slots shared across channels, up to 120 for ordinary new runs**. The later policy wins.
- Do not pad counts with irrelevant/empty records or label a zero-retained-source channel “Found.” Preserve truthful no-results/access/budget/failure coverage.
- Existing cited sources must not be evicted; large historical reports remain readable.
- Show original platform colors/icons in coverage and source displays.
- Report prose uses **one compact expandable citation row per main section**, deduplicated, rather than long source links after every line. Keep the overall Sources disclosure and individual source disclosures.
- The owner dislikes repeated “Unverified” clutter and internal technical panels. Improve prose/presentation without presenting weak evidence as verified or hiding material uncertainty.
- Retained source excerpts remain the evidence; generated summaries do not replace them.

### Runtime and performance

- Private Python runner using pinned GPT Researcher integration/custom provider adapters; not six independent always-on agents.
- One orchestrated job has discovery channels and sequential writing stages, plus scope/summarization/checking calls. Total call count varies.
- Cloudflare hosts it through `research-host/` Worker + Container + Durable Object durable state. Web/Edge calls the private runner, never browser-to-runner directly.
- D1 application ownership/admission and runner checkpoints are separate responsibilities. Keep durable delivery, cancellation/deletion and job leases consistent.
- Cached evidence summaries are reused across sections/retries. Do not rerun discovery just to retry synthesis.
- Summary allowance: 4,000 output tokens, one bounded 8,000-token retry for truncation within the attempt policy. Exhausted shared preparation must not repeat independently for all four sections.
- Earlier GLM failure was reproduced as `finish_reason=length` at 1,200 tokens; 4,000 worked for the diagnostic input. A three-batch preparation probe took 43.8 seconds; that was not a full report duration.
- Earlier OmniRoute latency/routing led first to OpenRouter/GLM and later to the final Claude migration. Do not reinstate those routes based on old notes.
- Safe diagnostics include stage timing, token counts, byte counts and allowlisted failure reasons. Generic old “provider unavailable” messages cannot be retroactively assigned a precise cause without evidence.
- Dedicated provider catalog/access can change. A past YouTube tool 404 required fallback. A LinkedIn charge exceeded its catalog quote and was recorded as budget-limited. Verify current contracts/costs before increasing budgets.

### Final reader/UI requirements

- Top form scrolls normally; saved-brief sidebar stays sticky on desktop. The final owner correction removed the requirement to freeze the top form.
- Navbar has an opaque background and proper spacing; content must not overlap visible logo/navigation.
- While running, show a clear preparing/progress state instead of every edit/download option and empty section.
- Show immediate loading/deleting/working feedback; ignore stale responses from previous selections and preserve usable saved data on load failures.
- Remove report-header Research again, Reload saved brief and Delete research controls.
- Put deletion on the saved-brief sidebar as a bin icon using the established confirmation/lifecycle behavior.
- Remove Edit brief, Version history and Run details/limitations panels from the reader. Legacy storage/API compatibility is not permission to restore those controls.
- **Download Word** produces a genuine `.docx` from the same cleaned report representation as the UI: headings, lists, tables, links, source icons/references and source appendix. Do not merely rename Markdown.
- Word output excludes form fields, private notes, sidebar, app controls and follow-up chat. Content parity matters; different Word clients can wrap pages/fonts differently.
- Clean recognized citation debris such as `[, ]` without destroying real brackets or unknown references. Preserve original stored content.
- Single approximation tildes must not accidentally create strikethrough. Explicit double-tilde Markdown remains supported.
- Tables should be used when appropriate for comparisons/metrics, not forced for every narrative paragraph.

### Report follow-up semantics

Research follow-up uses saved source extracts as evidence plus report/recent conversation context. It makes a bounded Claude call; it does **not** call Treg again, search/extract new data or regenerate the report. Explain missing evidence honestly. This differs from analytics follow-ups, which can refresh provider metrics.

Research is owner-private by default. Explicit sharing, where implemented, exposes only the authorized read-only report projection; raw notes/follow-up conversations remain excluded. Do not turn a shared connection or generic runner token into permission to read other users' reports.

## 12. Cross-machine setup and verification

Start with read-only reconciliation; do not discard work already present on the other machine:

```bash
git status --short
git branch --show-current
git fetch origin feature/pavun
git log -5 --oneline origin/feature/pavun
git rev-list --left-right --count HEAD...origin/feature/pavun
```

If the checkout is clean and already on the intended branch, a fast-forward update is appropriate. If it has local commits/edits, preserve them and inspect divergence. Do not hard-reset to this handoff's SHA: the branch may have legitimately advanced.

Install dependencies from the committed lockfiles and consult package scripts. The previous machine used project-local Wrangler, including `research-host` version 4.129.0. Do not depend on another machine's global CLI, auth, temporary directories or virtual environment.

Credentials must be provisioned separately through the owner's secure process. Relevant names, **not values**:

| Component | Configuration names |
| --- | --- |
| Claude generation | `ANTHROPIC_API_KEY` |
| Research search | `TREG_TOKEN` |
| Edge-to-runner | `RESEARCH_RUNNER_URL`, `RESEARCH_RUNNER_TOKEN` |
| Social provider | `ZERNIO_API_KEY`; optional verified `ZERNIO_PROFILE_ID` |
| Local Web-to-Edge | `WTFMEDIA_EDGE_LOCAL_ORIGIN` |
| Social activation | `SOCIAL_ANALYTICS_ENABLED`, `NEXT_PUBLIC_SOCIAL_ANALYTICS_ENABLED` |
| Identity | Environment-specific Clerk configuration; follow current examples/config |

The hosted state token and provider credentials are separately managed server secrets. Do not derive them from this document or copy the original chat's credential messages.

Local research service command after authorized configuration:

```bash
research/.venv/bin/python -m research.serve --provider-vars cloudflare/.dev.vars
```

The loader reads only permitted provider/auth settings and does not shell-source the file. A new machine needs its own Python 3.13 environment and locked dependencies. Runner health is private/authenticated. A runner URL is the configured service address; its token is backend authentication, not a Treg-issued profile ID or browser login.

For local Beta, use the documented localhost hostnames consistently: Next `--hostname localhost`, Web upstream `http://localhost:8787`. `0.0.0.0` / `127.0.0.1` substitutions can break routing/hostname checks. The local Python runner may use `http://127.0.0.1:8080` under the allowed local adapter configuration. Do not use production Clerk redirect settings for localhost.

**Local frontend does not guarantee local database.** Prior development could use staging D1. Inspect the selected bindings before applying migrations or writing test records. Research uses migration 0023; social workspace/chat uses 0024; earlier analytics/account-chat work used 0016–0022. Historical approvals are not permission to apply these blindly to a new database.

Useful checks from repository root:

```bash
npm --prefix web run test:unit
npm --prefix web run test:contracts
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix cloudflare test
node web/scripts/verify-phase2.mjs
npm run docs:architecture:check
research/.venv/bin/python -m unittest discover -s research/tests -v
npm --prefix research-host test
npm --prefix research-host run typecheck
```

Use relevant tests, not every suite for every edit. The Phase 2 disposable build must retain sibling `cloudflare/src` imports while excluding credentials/state. Some subprocess/socket tests required normal execution permissions after sandbox restrictions caused false failures. Diagnose the restriction; do not remove security checks or fake success.

## 13. Deployment procedure and risks

Before any future authorized rollout, read `docs/releases/beta-0.1-cloudflare-promotion-map.md` and current configurations/receipts.

1. Freeze an exact tested source SHA and record currently deployed versions/bindings for rollback.
2. Identify target Web, Edge and optional research host separately. Never assume a branch name proves deployment identity.
3. Preserve environment-specific secrets/bindings; do not add Alpha corpus bindings to staging.
4. Build frontend from a clean source archive with copied dependencies and **no local `.env*` or `.dev.vars`**.
5. Supply the verified staging public Clerk key explicitly. Decode the compiled key and compare its issuer with staging configuration, then verify live after rollout.
6. Existing Next.js **15.5.24** required OpenNext's `--dangerouslyUseUnsupportedNextVersion` override for recent builds. This is a known maintenance risk, not a dependency upgrade or proof of future support. Do not silently change versions during an unrelated release.
7. Run target-specific packaging/dry runs and deploy only the authorized service(s), using explicit environment arguments. Repository scripts intentionally reject ambiguous deployment commands.
8. Read back version/traffic/bindings and smoke the public hostname, not just a diagnostic `workers.dev` URL.
9. Research changes require a matching Container image/runtime deployment. Do not include secrets, local state or private SQLite files in Docker context.
10. Record bounded receipts. Database backup/migrations, new credential setup, production/shared-Alpha effects and real account mutations need their own authorized scope. Worker rollback does not restore database data.

No running local services or ephemeral test files are guaranteed to exist on the receiving machine.

## 14. Recommended next work, not preauthorized changes

- Restore/investigate hosted CI with a repository administrator, then verify checks for the exact current SHA.
- Run an owner-authorized authenticated staging acceptance pass: admin management vs reader restrictions, real metrics reconciliation, report generation/Word export/follow-ups and responsive browser behavior.
- If testing connection removal or Page selection, use explicitly approved test accounts; these mutate shared provider state.
- Address the unsupported Next/OpenNext combination as a separate scoped maintenance change.
- Recheck older documentation and plan checkboxes before relying on them. Some plans retain unchecked items despite later implementation; recent source/tests/receipts are stronger evidence.
- Do not promote research/social work or re-enable production YouTube without the owner's request.

## 15. File map for the receiving agent

| Concern | Start with |
| --- | --- |
| Owner rules and continuity | `AGENTS.md`, `PROJECT.md`, `.project/HANDOFF.md` |
| Generated architecture | `docs/architecture/SERVICES.md`, `DEPENDENCY-GRAPH.md`, `architecture.html` |
| Ask WTF inference and citations | `cloudflare/src/chat/public-chat.ts`, `answer.ts`, `claude.ts`, `alpha-gateway.ts` |
| Public chat adapter | `web/app/api/chat/route.ts` |
| Shared Beta chat and admission | `web/components/domain/beta/`, Edge member/operator routers and `auth/` |
| YouTube | `cloudflare/src/analytics*.ts`, `web/components/domain/ops/YouTubeAnalyticsWorkspace.tsx` |
| Social | `cloudflare/src/social-analytics*.ts`, `web/components/domain/social/`, `docs/SOCIAL-ANALYTICS-LOCAL.md` |
| Research UI/render/export | `ResearchWorkspace.tsx`, `ResearchContent.tsx`, `ResearchSourceBadge.tsx` under Beta components; `web/lib/research*.ts` |
| Research app contracts | `cloudflare/src/research*.ts` |
| Python research | `research/worker.py`, `gptr.py`, `providers.py`, `evidence.py`, `chat.py`, `diagnostics.py` |
| Hosted research | `research-host/src/`, `research-host/README.md`, `docs/RESEARCH-RUNNER.md` |
| Claude migration | `docs/CLAUDE-GENERATION.md`, `docs/superpowers/plans/2026-10-21-research-ui-claude-migration.md` |
| Historical planning | `WTF_OS_Research_Agent_Plan.md`; other Phase 1/2 documents if present in the receiving checkout |
| Migrations and deployment | `cloudflare/migrations/`, Web/Edge/research-host Wrangler configs |
| CI | `.github/workflows/`, plus actual GitHub workflow registration/settings |

## 16. Suggested first message for the next agent

> Read this handoff and the repository operating instructions. Reconcile your checkout with origin/feature/pavun without discarding local work. The last pushed source is 4eaaf95 and the last staging Web/Edge runtime is 9990e5e. PR #86 is merged, reviewed, deployed and pushed. Hosted CI has no active workflows and is not green. Preserve direct Claude generation, Alpha-only transcript authority, admin-only connection management, private saved data and the final research input/reader design. Report any drift and wait for my next scoped task before new deployment, migration, provider or production changes.

This handoff was created from conversation history, current tracked source/documents and previously verified receipts. No provider call, new live report, deployment, Git push or credential transfer was performed to create it.

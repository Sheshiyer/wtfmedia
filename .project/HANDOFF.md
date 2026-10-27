## 2026-10-27 — Staging research figures deployment receipt

- Owner-authorized candidate e2daa10e1c21a7fbb7c1898a60a23589a678d488
  is pushed to feature/pavun and deployed. Runtime source is 358516f; the candidate
  changes only the pinned container image and release/architecture documentation.
- Exact versions read back at 100% traffic:
  Edge 7e01774c-ab26-4bcb-b0c6-626dff9eec32,
  Web b9223b45-dd4d-44db-b478-64de54a3a9bf,
  Research 3adec911-1ebd-4d51-9631-27b08ebff06a.
  All 27 Edge, 10 Web and 10 Research bindings match their pre-rollout metadata.
- Container application version 11 is ready with pinned image
  94391e365d52a68a706b454ee4a0d31b75577cfa81240c5d2713bff4789feb0a.
  Specific application readback initially lagged; the later container inventory
  confirms the new version, ready state and exact digest.
- Live staging sign-in is 200 with the verified staging Clerk public identity;
  root redirects, research page responds 200, unsigned principal/research APIs
  deny with 401. Edge health is 200 and preserves Alpha corpus/inference authority.
  The live research JavaScript exactly matches the isolated build bytes.
- No schema migration, secret rotation, production/shared Alpha deployment,
  saved-report rewrite or new paid research job in this rollout. Authenticated
  staging report generation was not rerun. Direct runner health with the local
  token returned 401, so no authenticated runner-health claim is made; existing
  deployed secret bindings are preserved. Container control-plane readiness and
  prior live local generation/export checks are separate evidence.
- Test URL: https://beta-staging.wtfhq.in/beta/research . Existing recovered report
  is retained. Rollback versions/image are in the preparation entry below; roll
  back Edge before older runner/readers and preserve durable storage and secrets.

## 2026-10-27 — Owner-authorized staging visual release preparation

- Runtime source 358516f is committed and pushed. Its isolated OpenNext build
  passes lint/types and compiled staging Clerk verification. The linux/amd64
  image imports successfully and all 19 Python module hashes match that source.
  Registry image 94391e365d52a68a706b454ee4a0d31b75577cfa81240c5d2713bff4789feb0a
  is pinned for deployment. Docker attestation packaging was removed after a
  registry blob error; no runtime source or locked dependency changed.
  Staging recovery bookmark is retained privately; migration inventory is current.
- Owner requested all changes pushed to feature/pavun and deployed to staging.
  Research figures v2 and the verified generation/repair fixes ship together across
  runner, Edge and web. No migration or credential change is required.
- Source checks: 183 Python tests, 59 Edge research tests, 7 research-host tests,
  19 web report/figure tests, host/web types, and privacy (0/446) pass. Updated
  stale compatibility fixtures to use shared preparation and permit bounded
  extraction upgrades of uncited snippets while preserving source IDs and URLs.
- Pre-rollout readback: Edge e13c0fdd-30b9-46de-810f-d4fa8cb101f5,
  Web b0aef305-da90-43ef-a7ca-de5111342a99,
  Research 1df3de38-a1da-4933-82d2-ef43f8d25749; all at 100% traffic.
  Prior research image is ca1555b1b1434df0c527af29f14459e7969edfe025647909580bf97183b0d01a.
  Staging report status inventory has no queued/running briefs.
- Use committed-source builds without private state/env files. Verify compiled
  and live public Clerk identity against the staging issuer. Deploy compatible
  runner and reader before Edge starts submitting visual-policy-2 jobs.
  Publication and smoke receipts will follow; this entry is not deployment proof.

## 2026-10-27 — Live visual-only recovery verified

- Owner explicitly authorized end-to-end testing and sending the selected saved
  report and retained public excerpts to the existing Anthropic service.
- Live visual-only recovery completed all four planned figures with five model
  calls and no discovery, search, extraction or report-writing calls. Two drafts
  required automatic repair. The prior ready figure, sections and sources remain
  exactly unchanged. Python and the actual Edge projection both accept all four.
- Saved the recovery into the same staging-backed report with a revision guard,
  retained version and submitted run receipt. Database readback verifies completed,
  four ready figures, and unchanged notes/messages/content. Large inline SQL payload
  exceeded D1's statement limit; recovery instead reused the saved prior version
  and run payload. No schema changes, other reports or production changes.
- Actual React reader rendered four loaded figures from the recovered projection
  in a loopback-only verification snapshot. Actual browser Word export succeeded;
  all four figures are embedded across seven PNG pages. This is reader/export
  verification, not authenticated Clerk UI acceptance; native browser permissions
  were unavailable. Private snapshots and receipts remain ignored.
- Regression checks: 12 Python recovery/figure tests, 19 report/figure web tests
  and web typecheck pass. Format equivalence preserves signs, units and date
  precision; unsupported claims still fail. Automatic repair receives its draft
  and precise field errors; no provider replacement or wider budget was needed.
- Changes remain local on feature/pavun. No push or deployment. Refresh the
  existing report to read the saved recovery; no full research regeneration needed.

## 2026-10-27 — Figure formatting validation and repair context

- Owner's subsequent local report stopped with one ready and three failed figures,
  each after two attempts; remaining allowance was not exhausted. Read-only cached
  analysis found false numeric rejections from hyphens/ranges, equivalent percentage
  spellings, month-date formatting and supported timeline entries without dates.
  Other rejected drafts contain real unsupported date/number claims.
- Align Python/shared TypeScript format-only quantity and date rules. Preserve
  negative signs, percentage units, quote identity and explicit date precision.
  Supported undated events now render in a separate context area, not on the
  chronology. At least two supported dated events remain required for timelines.
- Automatic repair now receives its bounded previous draft and exact failing
  item/field. Existing two-attempt and reservation limits remain; no wider budget,
  new provider, invented evidence or automatic saved-report mutation.
- Read-only replay of seven cached drafts: both validators agree on every outcome;
  four accepted drafts cover three sections and render finite SVG geometry. The
  remaining section correctly fails on unsupported event dates. No full live
  completion is claimed. Typecheck and lint pass.
- Saved report remains unchanged. No paid provider calls, automated test suites,
  browser automation, push or deployment. Reloaded the local runner only after confirming no active job.

## 2026-10-27 — Comparison figure citation indexing correction

- Owner's next local report finished partial with three ready figures and one
  failed comparison after two attempts; no active job remained. Cached-output
  inspection found unsupported numbers in comparison cells in one attempt and
  out-of-range item evidence indices in the other. This was not budget exhaustion.
- Simplified the generation DTO: each item/edge selects evidenceBank string IDs
  directly, constrained to valid IDs in the per-request schema. The runner builds
  the compact evidence list and numeric citation indices. Persisted figure and
  shared browser/Word contracts remain unchanged. Unknown IDs fail closed.
- Repairs now receive comparison-cell numeric error details and explicit citation
  instructions instead of a generic structure failure. Numeric support checks
  remain mandatory; no failed draft is promoted or silently assigned new evidence.
- Python/schema checks and read-only recompilation of the three saved ready figures
  pass, including unknown-ID rejection. No provider calls, test suites, database
  mutation, push or deployment. Saved partial report remains unchanged. Reload the
  idle local runner for the next explicitly started generation.

## 2026-10-27 — Local figure generation failure correction

- Investigated the owner's terminal partial local run using content-free summaries
  and read-only cached-output validation. No active job remained. Four non-null
  figure drafts lacked the required title because schema normalization removed
  named `properties.title` as though it were a schema annotation. Four other
  requests returned null. Automatic repair allowance was insufficient; the reader
  did not clearly distinguish terminal visual failure from pending generation.
- Corrected schema traversal; preserved required field names. Models now select
  exact retained evidence passages by ID and the runner materializes citations.
  Targeted collection can upgrade uncited snippets, while preserving cited evidence.
  Reserve first attempts and bounded automatic repairs before broad discovery;
  size figure count for both. Record content-free failure details and final progress.
- Removed the report visual retry/upgrade button at owner request. Existing reports
  remain unchanged; terminal visual omissions are explicitly described as stopped.
- Static Python/schema integrity, TypeScript, lint and read-only saved-source
  passage checks pass. Reloaded the idle local runner with the correction.
  No provider requests, report backfill, browser automation or test suites were run.
  No new provider, credential changes, database migration, push or deployment.
  Changes remain local on feature/pavun; actual next-report quality remains unverified.

## 2026-10-26 — Local research figures v2 implementation

- Owner requested the reference-report visual generation plan be implemented on
  feature/pavun. Changes are local; this task does not push, deploy, change secrets,
  run live research, or mutate shared databases.
- Added figure planning before writing, targeted evidence collection, a separate
  persisted figures array, explicit edge/chart/timeline/comparison/metric schemas,
  retained-quote and numeric validation, derived arithmetic, and required visual
  coverage for completion. Legacy jobs/readers retain stored v1 diagram support.
- Visual-only retries/upgrades use the existing owner-scoped run action and revision
  check. Saved prose and successful figures are preserved; notes, Alpha lookups,
  general discovery and section writers are excluded from the retry path. Missing
  evidence stays explicit. Figure-only changes now appear in version history.
- New jobs protect first figure attempts and writing reserves before discovery.
  Optional summary preflight denial can select relevant original extracts per
  section with an explicit limitation, rather than consume protected funds.
- Added bounded licensed-source image collection with public-IP-pinned HTTPS,
  redirect/byte/pixel/time limits, image-specific attribution/license evidence and
  metadata-free retained PNG bytes. No new image provider or public asset store.
- Reader and Word share rendering and subsection placement. The reader exposes
  explanation/source links and scrollable figures; Word splits tall figures at
  row boundaries. Missing figures keep the overall report partial while the UI
  reports written and visual completion separately. Automatic quotation-card
  fallback no longer satisfies the visual requirement.
- Static checks: web TypeScript and lint, Python syntax/DTO schema import, runner
  store JavaScript syntax, and Edge research-module bundle. No test suites,
  browser/Word render automation, paid inference, external image fetch or live
  report executed, per owner preference. Runtime quality remains unverified.
- Pickup: docs/RESEARCH-VISUALS.md. Later authorized staging rollout needs runner,
  Edge and web together; no migration is required for existing JSON document
  storage. Manual acceptance should cover report diversity, missing evidence,
  retries/recovery, images, source links, narrow screens and Word pagination.

## 2026-10-26 — Production receipt: YouTube Analytics and Social Analytics only

- Owner-authorized release source aa72b98 deployed with the bounded release
  builder. Apex Web 48912c66-e223-41b1-a6d9-22fdee5a12a2 and Edge
  4f21894f-9ecd-40d5-afae-dad24890a843 read back at 100% traffic.
  Public routes: https://wtfhq.in/beta/analytics and
  https://wtfhq.in/beta/social-analytics .
- Production Edge content downloaded after publication exactly matches artifact
  e5faca8f3e488e2e854bccd1025029f3f68f14a263d14ab9d5c3602dac8aa435.
  The scoped overlay preserves all non-analytics baseline code; the separately
  deployed shared Alpha Web was not touched. Web preserves its six production
  bindings/runtime settings, production Edge/self binding and apex Custom Domain.
- Owner separately approved migration 0024 and the existing local Zernio key.
  Recorded pre-migration D1 recovery bookmark:
  00000242-00000000-00005110-62ff7bc175336ff71382cfdae7808519.
  Only 0024 was applied: social_analytics_workspace, social_analytics_investigations,
  social_analytics_rate_limits. Migration 0023 remains absent. No Research or
  new Production Calendar code/data was promoted; the prior production placeholder
  remains byte-identical to the recorded frontend ancestor.
- All previous 29 Edge bindings/runtime settings are preserved. The only added
  bindings are SOCIAL_ANALYTICS_ENABLED=1 and secret_text ZERNIO_API_KEY. The key
  was passed in a permission-restricted temporary file, deleted after deployment.
  No token values were logged or committed; Google configuration is unchanged.
- Packaging included built-in Next lint/types and production Clerk identity
  checks. Publication readback: sign-in HTTP 200, production Clerk identity
  clerk.wtfhq.in, signed-out Social Analytics API HTTP 401. No signed-in browser,
  Google/Zernio query, model call or test suite was executed. Account data and
  editorial acceptance remain for owner testing.
- Rollback: previous apex version e0a702a0-a19b-4445-9473-335c8fa539af and
  pre-overlay Edge artifact/version b0b59cfc-7152-4dcd-b606-5bcbb58fb3de.
  Preserve the approved new key and additive tables during code rollback; do not
  erase private state or replace unrelated production settings. Staging unchanged.
- Candidate and this receipt are local commits on feature/pavun. This task asked
  for production deployment, not another branch push or merge.

## 2026-10-26 — Analytics-only production candidate prepared and authorized

- Owner requested only YouTube Analytics and Social Analytics on wtfhq.in,
  then explicitly approved production migration 0024 and adding the existing
  local ZERNIO_API_KEY to production Edge. No key rotation or account connection
  changes are included. Research and Production Calendar are excluded.
- Live rollback targets: apex Web e0a702a0-a19b-4445-9473-335c8fa539af;
  Edge b0b59cfc-7152-4dcd-b606-5bcbb58fb3de. Internal Alpha Web is unchanged.
- The downloaded live Edge code matches the recorded baseline hash
  22ec8afd3d8f10d8addea95c2fff06432375344d6c526214b45d5c73012a2327.
  The release builder adds an isolated analytics module, social policy/dispatch
  after existing admission/CSRF checks, and the current YouTube assistant. Reversing
  those replacements restores the baseline byte-for-byte. Initial artifact hash:
  e5faca8f3e488e2e854bccd1025029f3f68f14a263d14ab9d5c3602dac8aa435.
- Frontend is reconstructed from the recorded production analytics ancestor
  ded0b4c, retaining its non-analytics application. Later production analytics
  connection/layout fixes are included through the current analytics assets.
  The detached historical production commits are unavailable in this checkout;
  this is a source-lineage reconstruction, not a byte-identical Web baseline claim.
  New Social Analytics files and bounded navigation, capability and image-host
  adaptations are listed by scripts/prepare-production-analytics.mjs.
- Production already has migrations through 0022 and Google/Anthropic settings.
  Only 0024 adds three social tables; Research migration 0023 and calendar
  migrations are excluded from the separate migration directory. A migration
  receipt/recovery bookmark and runtime receipts follow execution.
- Isolated OpenNext build (with its built-in lint/types) and Edge packaging
  succeeded. Production public Clerk identity matches clerk.wtfhq.in. No test
  suites, browser automation, model calls or provider analytics queries were run.
  Changes remain on feature/pavun; no new delivery branch is created.

## 2026-10-26 — Staging deployment receipt: research reliability and visual recovery

- Owner-requested changes pushed to feature/pavun. Exact deployed candidate:
  f3394a461f63a1aa96337e3ae8f95e9d2f3d5c98; runtime source is 82b64d7,
  followed only by the pinned image and documentation/architecture checkpoint.
- Deployed versions read back at 100% traffic:
  Edge e13c0fdd-30b9-46de-810f-d4fa8cb101f5,
  Web b0aef305-da90-43ef-a7ca-de5111342a99,
  Research 1df3de38-a1da-4933-82d2-ef43f8d25749.
- Detailed container info confirms application version 10 and image
  ca1555b1b1434df0c527af29f14459e7969edfe025647909580bf97183b0d01a,
  no health errors or failed instances. The aggregate containers-list endpoint
  briefly returned the previous version/image; the specific application readback
  confirms the published configuration. No paid research job was initiated.
- All prior 26 Edge, 10 Web and 10 Research bindings and runtime settings are
  unchanged. Edge has one new plain-text binding: RESEARCH_BUDGET_POLICY_VERSION=1.
  New staging jobs use policy 1; existing jobs retain their recorded policy.
  Web binds only to staging Edge and retains beta-staging.wtfhq.in. Live public
  sign-in and compiled assets both contain the expected staging Clerk identity.
- Isolated OpenNext deployment build completed, including built-in lint/types.
  No test suites, browser acceptance, Word visual checks or live model probes were
  run, per owner preference. Publication receipts are not editorial acceptance.
- Public test URL: https://beta-staging.wtfhq.in/beta/research . Refresh saved
  completed reports for evidence-map/table presentation; new reports use the
  revised generation and budget behavior. No saved report was rewritten.
- No production/shared Alpha deployment, secret rotation, database migration or
  new scheduled task. Rollback targets are in the immediately preceding candidate
  entry. Disable new policy-1 submissions before rolling back admission/store code;
  preserve Durable Object data and secrets, and never delete namespaces.

## 2026-10-26 — Owner-authorized staging candidate preparation

- Owner requested pushing all changes to feature/pavun and deploying staging.
  Research/web/Edge runtime source is committed as 82b64d7 and pushed.
- Built that committed Python source with the existing locked dependencies and
  Dockerfile for linux/amd64, without local data or environment files. Published
  image digest ca1555b1b1434df0c527af29f14459e7969edfe025647909580bf97183b0d01a
  is pinned in the staging research configuration.
- Staging Edge configuration enables RESEARCH_BUDGET_POLICY_VERSION=1 for new
  jobs. Deployment order must publish the compatible store/container and web
  readers before the Edge flag. Existing jobs keep their recorded policy.
- Isolated web packaging uses staging public Clerk configuration; the current
  public sign-in key matches the configured staging issuer. No local secret env
  file is copied. OpenNext requires its unsupported-Next-version override for
  the existing pinned Next release; dependency upgrades are outside this task.
- Rollback targets before this release: Edge b6ed68ac-a6c2-4f9b-95ad-e1b0239b853f,
  Web 24f40836-70b9-41ad-874d-0b4fefb89cac, Research
  816729d0-3fcb-4108-87a5-d7eb38f318a6 with prior image
  e0e12e3f5142330aae14ce8616e336700e0f5fe14931e6b5549630d036d2bc62.
- Test suites, browser automation and paid research runs remain excluded by owner
  instruction. Deployment receipts follow publication; this entry is not acceptance.

## 2026-10-26 — Visuals as a report requirement, with retained-evidence recovery

- Owner reported continued model-null diagrams. The prompt previously permitted
  omission when a graphic added no value and supported only flows/comparisons.
  It now requests an evidence map when the sources cannot establish a process or
  compatible comparison. Model evidence is selected separately per section,
  prioritizing that section's cited extracts within the existing bounded batch.
- Policy-1 preparation and writing protect one shared diagram reservation alongside
  remaining core calls. The total job ceiling and model request count are unchanged.
- A deterministic fallback builds an explicitly attributed evidence map from short,
  complete statements in cited full extracts. It never draws invented flow arrows,
  treats snippets as full evidence, or truncates a statement to fit. The existing
  quote/source/numeric validators still apply. Fewer than two eligible statements
  means no map; this is not a promise of diagrams for unsupported evidence.
- Browser and Word export can derive the same map for completed saved sections
  without another provider request or a persisted report rewrite. Stored diagrams
  remain preferred. Derived maps replace obsolete omission notices in that section
  with an explanation of their source. Word collects derived figures before rasterizing.
- Added focused source regression cases, not executed at the owner's request.
  No tests, build, browser automation, paid run, push or deployment. Local source
  changes remain on feature/pavun and preserve preceding uncommitted work.

## 2026-10-26 — Diagram schema regression and table source links

- Owner's subsequent local report exposed a regression in the previous visual
  change: three Anthropic diagram requests returned HTTP 400, then the last visual
  lacked reservation capacity. The new schema included `minItems: 2`/`maxItems`,
  which official Anthropic structured-output docs list as unsupported. These
  constraints are removed from request schemas; local item validation remains.
- Shared visual generation now makes one bounded request for all applicable saved
  sections, reducing the maximum visual reservation from 1,000,000 to 250,000
  micro-units without increasing the job ceiling. Each figure is validated and
  omitted independently; safe batch failure details persist in runner state.
- The reader previously removed recognized citations from table cells along with
  prose citations. Source-only cells became blank and caveats began with punctuation.
  Shared AST preparation now retains table citations as links; browser anchors and
  Word source bookmarks are both wired. Saved report bodies are not rewritten.
- Added/updated offline regression cases for unsupported schema constraints, a
  single visual batch, independent figure rejection and table citations. They were
  not executed. No browser tests, paid requests, automatic report reruns, push or
  deployment. Changes remain local on `feature/pavun`; prior local work is preserved.
- Existing table links update on refresh/export. Diagram request fixes affect
  future generation; a completed report with failed visual requests remains intact.

## 2026-10-26 — Recover supported diagrams and explain omissions

- Read-only inspection of the owner's latest completed local report found four
  attempted visuals, no budget breaker, two model-null responses and two rejected
  diagrams containing unsupported dates/numbers. No report text or private source
  excerpts were copied into this checkpoint; the saved report remains unchanged.
- Visual requests now use the existing structured JSON transport and quote-first
  instructions. Local recovery replaces unsupported headings with neutral wording
  or an affected item with its complete verified quote only when it fits; repaired
  items use a comparison layout. Strict source, quote and numeric validation remains
  mandatory. There is no extra model request or larger allowance.
- Distinct omission reasons are saved with section labels and displayed in the
  report reader. Older generic warnings now display too. Photographs and separate
  generated illustrations remain outside the implemented diagram capability.
- Added offline recovery/reader regressions, not executed per owner instruction.
  No paid run, provider probe, push, deployment or report rewrite. Changes remain
  local on `feature/pavun`; existing uncommitted budget-reliability work is preserved.

## 2026-10-26 — Research budget reliability implemented locally

- Owner authorized full implementation of the research budget reliability plan.
  Work remains local on `feature/pavun`; prior credential and planning notes are
  preserved. No push, deployment, credential update or shared database operation.
- Shared GPTR preparation now precedes section writers. Query/extraction/summary
  checkpoints and core drafts survive recovery. Optional evidence-backed diagrams
  run after core sections and have durable attempted/omitted outcomes.
- Policy-1 `admit` and `allowance` work across local SQLite and hosted store RPC.
  Lease-fenced phase counters, retry reservations, cache-aware summary preflight,
  core reservation priority and global admission breakers live in store-owned
  `jobs.state._budget`; ordinary saves preserve it. No schema migration.
- Safe limit metadata survives Python validation, RPC, Edge projection, reader and
  export summaries. Earliest causal failures are retained; shared search auth errors
  stop dependent work without disabling web because of one social endpoint failure.
- Activation is gated: deploy compatible readers/store/runner first, then separately
  set Edge `RESEARCH_BUDGET_POLICY_VERSION=1` for new jobs. No flag or environment was
  changed. Existing jobs keep their recorded admission policy and reservations.
- Added offline regression coverage and adjusted GPTR fixtures. Per owner instruction,
  no tests, browser automation, live research, provider probes or build were run.
  Source implementation is not acceptance evidence. Owner testing and any future
  staging image build/deployment remain outstanding.
- Regenerated architecture documentation from the updated source ledger. Git diff
  whitespace inspection is clean; this is not a runtime or test acceptance claim.
- Details and rollout: `docs/RESEARCH-RUNNER.md` and
  `docs/superpowers/plans/2026-10-26-research-budget-reliability.md`.

## 2026-10-26 — Research budget reliability plan

- Owner requested an implementation plan after a newer report retained 125
  sources, failed its first section before diagram generation, and completed
  three subsequent sections. A per-phase call limit is the leading explanation;
  the saved generic failure does not prove which specific limit fired.
- Plan: `docs/superpowers/plans/2026-10-26-research-budget-reliability.md`.
  Covers typed limit metadata, separate shared preparation, durable atomic call
  admission, required-work priority, optional diagrams after core writing,
  preservation of authentication/first failures, compatible reader messages,
  acceptance criteria and staged rollout without increasing the spending ceiling.
- Planning only: no application edits, tests, provider calls, push or deployment.
  Owner continues to perform application testing. Prior local credential-update
  documentation and generated architecture changes remain intact.

## 2026-10-26 — Owner-supplied staging TREG credential update

- Read-only diagnosis of the owner-identified failed brief found TREG search
  HTTP 401 failures and zero retained sources before later budget exhaustion.
  The runner's final failure overwrote the earlier authentication cause. The
  saved failure predates the research-visuals deployment; no report was rerun.
- Owner supplied a replacement in the ignored Cloudflare vars file. Updated
  only `TREG_TOKEN` on `wtfmedia-research-staging` through protected stdin;
  no key value was printed or committed. Local credential files remain intact.
- Secret-change version `816729d0-3fcb-4108-87a5-d7eb38f318a6` reads back at
  100% traffic. All ten binding definitions and runtime settings are unchanged.
  The container is inactive and staging has zero active briefs, so its next
  startup will load the replacement credential without interrupting a job.
- No provider authentication test, browser use, new research run, application
  code deployment, database mutation or production credential change performed.
  Existing failed reports remain failed. Preserving the first error and stopping
  earlier on authentication failures remain source follow-up work.

## 2026-10-26 — Staging deployment receipt: research report visuals

- Owner-authorized staging candidate `82224ba2cb63ac7c36e63791121753592558acff`
  deployed. Web/Edge/research application source is unchanged from the successful
  `5f0ecad` build; the candidate adds the pinned research image and documentation.
- All three deployed versions read back at 100% traffic:
  Edge `b6ed68ac-a6c2-4f9b-95ad-e1b0239b853f`,
  Web `24f40836-70b9-41ad-874d-0b4fefb89cac`,
  Research `1f02701e-9b34-4a23-b316-4777faf04bbe`.
  Container application version 9 reports ready and the exact pinned image
  `e0e12e3f5142330aae14ce8616e336700e0f5fe14931e6b5549630d036d2bc62`.
- Readback confirms all 26 Edge, 10 Web and 10 Research bindings plus runtime
  settings are unchanged. Web retains the staging Edge binding and the existing
  `beta-staging.wtfhq.in` Custom Domain. No production/shared Alpha deployment,
  database migration, credential rotation or new scheduled task occurred.
- Public research URL: `https://beta-staging.wtfhq.in/beta/research`.
  Start a new report to generate figures; existing reports remain unchanged.
- Deployment packaging included Next's lint/type validation, isolated public
  staging Clerk identity verification and locked container dependencies. Owner
  explicitly requested no computer/UI testing: no browser acceptance matrix,
  Word visual checks, test suites or live research/model jobs were run. Version,
  binding, image and traffic readback prove publication, not editorial acceptance.
- Rollback targets: Edge `181597c7-7196-49a1-96b7-43544ebf42b2`, Web
  `2c07fdac-0752-4a57-9a36-bf7a0453f3e1`, Research
  `e467a19f-acaa-4c41-b993-adbf037634ef` with prior image
  `f2f94dae049046a6eb7244cb2eb5a6dd6a949ee4274a31af42839b5dbc5587f8`.
  Preserve Durable Object state and secrets during any rollback; never delete
  namespaces. This documentation receipt does not change the deployed candidate.

## 2026-10-26 — Staging research image prepared

- Built the committed `5f0ecad` research source with its unchanged Dockerfile and
  hash-locked dependencies for `linux/amd64`, using Wrangler's prescribed
  `--provenance=false` format. Published and pinned digest
  `e0e12e3f5142330aae14ce8616e336700e0f5fe14931e6b5549630d036d2bc62`.
  The first upload with Docker's default attestation manifest failed; the
  compatible-format retry succeeded. No private state or local env files enter
  the archived build context.
- Docker Desktop was installed with owner approval; direct app installation
  avoided Homebrew's administrator-only system symlink step. Engine is running.
- Isolated OpenNext build (including its lint/type checks), compiled staging
  Clerk identity check and Edge/Web packaging completed. No test suites, browser
  checks or live research jobs run. Owner reiterated no computer/UI testing.
- The only runtime change after `5f0ecad` is the research image pin. Existing
  durable namespaces, secrets and staging database remain in place. Deployment
  version receipts follow separately after publication.

## 2026-10-26 — Staging build preparation

- Owner authorized staging deployment and installing Docker Desktop for the
  research image build. The isolated committed-source OpenNext build exposed a
  prior navigation lint error: the auth-frame public chat anchor now uses the
  existing Next Link import, preserving its destination and presentation.
- Staging migration inventory has no outstanding migrations. No database change
  is needed. Build preparation uses the verified public staging Clerk issuer;
  local environment files are excluded. Runtime receipts follow after deployment.

## 2026-10-26 — Research visuals branch delivery

- Owner requested committing and pushing all research visual changes to
  `feature/pavun` and merging into `futures/nikhai`. Fresh fetch confirms both
  remote branches start at `5599d2f`; delivery can fast-forward both to the same
  new commit without merge conflicts or rewriting history.
- Includes report diagram generation, source validation, reader rendering,
  embedded Word images, Markdown alternatives and accompanying documentation.
  Tests remain deferred to the owner. No deployment, migrations, credentials,
  corpus changes or private reference files are included in this delivery.

## 2026-10-26 — Research report diagrams (local source only)

- On `feature/pavun`, added explanatory process diagrams and comparison graphics
  inspired by the owner's reference report formats. Reference files/images remain
  outside the repository and are not research evidence or provider input.
- New runs attempt one figure per applicable section through the existing metered
  model transport after numeric review. Bounded specifications require retained
  source extracts and matching quotations; unsupported numeric tokens are rejected.
  No new image provider, remote image fetching, evidence store or migration.
- The reader displays fixed SVG images, captions and expandable evidence. Word
  downloads embed the same figures as PNGs with explanations and linked sources;
  Markdown gets text alternatives. Existing reports require a fresh research run
  for visuals. Figure provenance is checked, but editorial entailment/order still
  requires human review. Unsupported/oversized figures leave the text intact.
- Owner requested personal testing: no tests, typecheck, build, browser checks,
  live model calls or Word rendering performed for this change. Architecture
  metadata regenerated. No commit, push, deployment, credentials or corpus changes.
- Reloaded the idle localhost research worker after confirming no queued/active
  local jobs; its existing supervisor starts the updated worker. No report launched.
- Remaining acceptance: generate a real report, inspect diagram relevance/source
  links at desktop/mobile sizes, download Word and review pagination/image clarity.

## 2026-10-26 — Owner-requested branch delivery

- Owner accepted the local result and requested pushing all current changes to
  `feature/pavun` and merging them into `futures/nikhai`. Both remote tips were
  `0decb12` before delivery, so one new commit can fast-forward both branches
  without another merge conflict or history rewrite.
- Delivery includes the requested login entry/public Ask WTF navigation,
  signed-in Production/Social Media links, Social Media page 404 correction,
  Production migration compatibility fix, and removal of unrelated incoming
  test/tooling changes. Local environment files remain ignored and untracked.
- No tests rerun at the owner's request. Architecture metadata is regenerated
  for the final source. This is source delivery, not application deployment;
  the separately authorized staging migration receipt is recorded below.

## 2026-10-26 — Social Media page 404 correction

- Removed the duplicate frontend feature-flag `notFound()` check from
  `/beta/social-analytics`. The common Beta admission/capability gate remains;
  the backend retains its integration availability and authorization checks.
  This aligns the page with the signed-in navigation. Local source change only;
  no tests, push or deployment, per the owner's current instructions.

## 2026-10-26 — Local navigation and entry-flow correction

- Owner requested visible signed-in Social Media and Production navigation,
  a login entry at `/`, and Ask WTF as the only signed-out workspace. Root
  defaults to `/sign-in`; the existing server-verified signed-in redirect to
  `/beta` remains. Public Ask WTF stays at `/chat` with a single workspace link
  and sign-in utility. Auth-frame return links point to `/chat`.
- Added Production to the operator menu under its existing `production:read`
  capability. Social Media remains under `analytics:read`; removed its separate
  client-build visibility switch. Both appear in the operator workspace nav.
  Existing member/operator permissions and backend feature gates remain intact.
  Old public Connections, Episodes and Social Media page URLs enter their
  authenticated Beta destinations rather than displaying signed-out workspaces.
- Owner explicitly requested no further testing. These navigation edits have
  not been tested or pushed; prior check results do not cover this change.
- Earlier scope cleanup restored ten unrelated test/tooling files to Pavun
  `0d28392`. Login source had not changed in the merge; localhost lacked its
  Clerk publishable key. Restored only the matching public staging key in the
  ignored frontend config and restarted the local services. No secret key was
  copied, rotated or committed.
- Owner-authorized staging migrations 0025–0028 are now applied. The first
  attempt failed on D1's GLOB pattern limit and left no Production tables or
  migration receipts. The equivalent bounded hex check was corrected; retry
  receipts and new columns were read back, with nine IP categories, zero items
  and zero source cells. Recovery bookmark before migration:
  `000001d9-00000000-00005110-426c55197d1b4b4c29a05346137e590e`.
  No private workbook import or application deployment was performed.

## 2026-10-26 — Production merged into the shared Beta flow

- Owner requested the Production feature from `futures/nikhai` (the actual
  remote name), integration with `feature/pavun`, and synchronization of both
  branches. Merge parents are Pavun `0d28392` and Nikhai `e1dd440`. The only Git
  conflict was this handoff; both records were retained below. This checkpoint
  supersedes the incoming standalone local-preview routing instructions.
- Canonical page is `/beta/workspace/production`; calendar, board, dubbing,
  source review and edits use `/beta/api/production`. The existing Beta proxy,
  Clerk session fetch, principal resolution and capability policy own access.
  Editors can read/write; admins and super-admins can manage source contacts
  and configuration. Members and inactive operators are denied. Legacy
  `/ops/production` redirects to Beta; old Production APIs have no handler.
- Imported Production UI, backend, isolated workbook import tools and additive
  migrations 0025–0028. Removed the incoming standalone local API/auth bypass
  and preview exceptions; preserved Pavun middleware, shared proxy, shell,
  package/config, research and canonical Alpha retrieval behavior. A missing
  Production schema returns a truthful unavailable state. Browser fixtures are
  limited to Storybook and are not live data or staging acceptance evidence.
- VERIFIED-SOURCE: 601 Edge tests, 432 web unit tests, 101 contract tests,
  typecheck, lint and optimized Next build pass. Two Production browser
  component checks pass using installed Chrome via an ignored local test
  configuration. Local import idempotency passes; Python importer checks are
  3 passed with the private-workbook integration check skipped (no workbook).
  Privacy scan reports zero violations; regenerated architecture and diff
  checks accompany delivery.
- No shared migration, private workbook import, deployment, credential change,
  or corpus operation was performed. Local secrets remain ignored/untracked.
  Populating a hosted calendar requires separately authorized migrations and
  a private data import. Branch synchronization is source delivery only.

## 2026-10-26 — Interview research dossiers and one published episode

- Owner requested research grounded in earlier podcast question context, using
  the Payments panel and Hotels/Hospitality Word examples as editorial structure.
  Source changes remain local on `feature/pavun`; this task does not deploy the
  new research code or push the branch. The one new episode ingest was explicitly
  authorized and completed in shared Alpha.
- The authenticated research edge obtains a bounded published Alpha answer/source
  projection using only the supplied public subject. Private notes, identity and
  credentials do not cross the bridge. The identical projection is retained in
  the durable job payload for submission retries. No second corpus or raw
  transcript export is introduced. The runner uses historical question themes
  in GPTR planning and writing, and retains a labelled cited appendix. These are
  Alpha summaries, not verified verbatim questions or speaker-attribution receipts;
  unavailable context and unresolved identities fail closed with visible limits.
- Four compatible report slots now contain guest dossiers/timelines, industry and
  economic comparisons, thematic deep dives, and a proposed interview sequence
  with follow-ups. Two guest and/or four industry topic searches precede channel
  discovery and have recovery checkpoints. Twenty is now a provider page size;
  retention ranks relevance/extract quality within 120 current sources with a
  small diversity floor. At most twelve separate Alpha references accompany the
  report. Eight page extracts, existing spend limits and bounded model contexts
  remain enforced. The Word examples inform structure, not factual evidence.
- LIVE-VERIFIED: `YU-RrDdyx34`, published 2026-10-23, “Who’s Paying for the AI
  Boom—and Can It Last? | WTF is AI?”, was absent from the catalogue. Downloaded
  original English auto-captions yielded 4,576 timed segments (duration 8,937s).
  Uploaded transcript and timestamp objects were downloaded and hash-compared
  before registering one episode/external identity and two available source assets.
  Canonical job admission validated the D1 receipt; exactly one job was accepted
  by the existing Alpha queue. No credential rotation or runtime deployment.
- Transcript SHA-256:
  `571bc5b359a4e08332fc129a3538976daf862b9070ef98bb84614a5ebc915d70`.
  Timestamp sidecar SHA-256:
  `b5a2a90da84d571a1703e60548817b48f93b9ee7723c7b1b863700bc394557fb`.
  KV v2 receipt content hash:
  `c3a22d338612e8de27023dacf694017a7540388452020396a153cbf6098ab0ba`,
  `chunkCount=129`, `timingOrigin=published_sidecar`. All 129 vector records
  read back with the correct published video identity and verified native timing.
  A scoped semantic query returned five matching passages (top score 0.7217493).
  The live historical-context bridge through shared Alpha returned available
  cited synthesis with six references to this exact video in about 34 seconds.
  Only metadata was logged. Auto-captions do not establish speaker diarization.
- VERIFIED-SOURCE: 163 Python tests, 586 full Edge tests plus the subsequently
  added durable-context integration test (58/58 focused research tests), 112 web
  research/Word-renderer tests, web typecheck and privacy scan (0/435) pass.
  Real pinned GPTR tests use fake external adapters and prove planning/writing
  context propagation; a live full research dossier/editorial quality review and
  hosted deployment are not claimed. Architecture/diff checks accompany delivery.
## 2026-10-26 — Published futures/nikhai source branch

- The owner explicitly requested a GitHub push. The clean local
  `futures/nikhai` branch was published to `origin/futures/nikhai` after
  verifying that the remote branch did not previously exist. This publishes
  source changes, not a Cloudflare deployment or client-facing acceptance.
- The private workbook, imported guest contacts and notes, generated import
  snapshot, and ignored `.local/production-calendar.sqlite` remain local and
  were not uploaded. A collaborator needs the workbook through a separate
  secure channel to reproduce the populated calendar.

## 2026-10-26 — Local production-calendar and Pavun branch integration

- Owner requested a local merge of the latest Pavun work with the existing
  production calendar and the branch name `futures/nikhai`. The remote has
  `feature/pavun` (not `futures/pavun`); that is the source merged here.
- Preserve the four production surfaces: calendar/month, board, dubbing, and
  source-workbook review. The local-only preview uses `/ops/production`
  because the merged Beta gate requires deployed Clerk configuration;
  deployed operator access remains `/beta/workspace/production`. The
  production API remains `/ops/api/production` and the local SQLite preview
  remains `scripts/local-production-api.mjs` on port 8788.
- Pavun already owned migration ordinals 0016–0024. The local-only production
  migrations were renumbered without changing their SQL to 0025–0028 and
  appended to the manifest. This avoids duplicate ordinals in a fresh D1
  checkout. The existing ignored `.local/production-calendar.sqlite` is not
  renamed, deleted, exported, or pushed.
- The combined operator policy retains production read/write/manage grants
  alongside Pavun analytics/research grants. The operator router retains
  production API handling and Pavun's CSRF guard; obsolete ops-chat routing
  was removed while Beta chat remains Pavun-owned.
- The source merge is not a Cloudflare release. No remote D1 migration,
  deployment, workbook upload, or GitHub push is authorized by this merge.
  Do not call the client-facing production calendar accepted on source tests
  alone. The private workbook and imported contacts remain outside Git.

## 2026-10-24 — Final Alpha and staging verification receipt

- Final runtime source is `6155c2e` on `feature/pavun`, pushed after review.
  Shared Alpha `b0b59cfc-7152-4dcd-b606-5bcbb58fb3de` and staging Edge
  `181597c7-7196-49a1-96b7-43544ebf42b2` read back at 100% traffic.
  All 29 Alpha and 26 staging bindings remain unchanged. Both health endpoints
  report configured Anthropic generation; staging retains Alpha corpus authority.
- Downloaded live Alpha exactly matches the tested minimal artifact, SHA-256
  `22ec8afd3d8f10d8addea95c2fff06432375344d6c526214b45d5c73012a2327`.
  It is reproducible with the committed patch builder, the original live
  baseline, a pre-fix bundle from `4eaaf95`, and the bundle from `6155c2e`.
  The original pre-task rollback versions recorded below remain available;
  intermediate `53cf8a7d`/`627e9c96` lack the final repair constraint.
- Final live test through the actual Alpha web `/api/chat` adapter, after
  synthetic prior-topic history: HTTP 200, six sources, 16 in-range citation
  markers, complete sentence coverage, `answered_grounded`, Sonnet 5.5,
  20.34 seconds. `X-Fallback=true` indicates the successful citation repair;
  it does not mean excerpt fallback or missing evidence. This is a bounded
  successful test, not a guarantee that all future model outputs are valid.
- Staging Web remains the verified `7a6ad43` artifact at
  `2c07fdac-0752-4a57-9a36-bf7a0453f3e1`; the final correction changes Edge
  code only. Research remains secret-update version
  `e467a19f-acaa-4c41-b993-adbf037634ef` with the validated new Treg key.
  Public testing URL: `https://beta-staging.wtfhq.in/beta/chat`.
- Final checks: 584 Edge tests, 55 compiled Alpha tests, web typecheck,
  architecture freshness (790 inputs), bundle/diff checks. Both added repair
  regressions fail on the previous source. Earlier 429 web unit/101 contracts,
  lint, privacy, five research-host tests and isolated staging build also pass.
  Local vars files remain present, ignored and untracked; no values enter Git.
  No full authenticated persona matrix or hosted research report was rerun.

## 2026-10-24 — Citation repair contract tightened after live verification

- Owner explicitly authorized the live quick-commerce test, including sending
  retrieved production excerpts to the existing Anthropic service, after
  automatic approval review required that specific consent. The initial
  blocked probe did not run; subsequent diagnostics retain metadata only.
- Live topic-switch retrieval now returns six sources and can produce
  `answered_grounded`, but some attempts still return `synthesis_invalid`.
  Server diagnostics show valid citation numbers with rejected coverage, not
  a provider timeout. Local in-memory tracing also found uncited opening prose
  and an intermittently rejected repair; no original response text is retained.
- Tightened repair generation and validation: every returned finding requires
  a nonempty source-index array. An empty findings array explicitly abstains,
  exposes no sources or citations, and never forces citations onto unsupported
  content. The sentence-coverage guard still rejects multiple unsupported
  claims in one item. No extra model retry or request-budget increase.
- VERIFIED-SOURCE: Edge 584/584, compiled minimal Alpha artifact 55/55,
  web typecheck, bundle and diff checks pass. A real Anthropic test with invented
  evidence accepts the stricter schema and returns a grounded repaired answer.
  Final runtime receipts follow when this correction is deployed.

## 2026-10-24 — Initial staging release, shared Alpha patch and Treg update

- Owner authorized staging deployment and branch push, then explicitly approved
  the shared Alpha production impact. Source candidate
  `7a6ad4314a55a3aa2a3fe6ad5cba45092b048319` is pushed to `feature/pavun`.
  Production frontend, databases, corpus, ingest and DNS are unchanged.
- Staging Edge `627e9c96-abff-4754-b17f-11c90a6fea1f` and Web
  `2c07fdac-0752-4a57-9a36-bf7a0453f3e1` read back at 100% traffic.
  All 26 Edge and 10 Web bindings and runtime settings match the baseline.
  Public ingress remains `https://beta-staging.wtfhq.in`.
- Shared Alpha Edge is `53cf8a7d-f739-47ef-a93c-d4cb9e3a9d56` at 100%.
  All 29 bindings and runtime settings are unchanged. The downloaded live
  bundle exactly matches the tested minimal artifact, SHA-256
  `e1be3fcc044e6f27d3d59a36990e2ef19cfd655e99dd3bb8e6b844560591799b`.
  Only answer, query-topic and public-chat modules replace the former live
  bundle; its pre-patch SHA-256 is
  `d2f90e02129b0698f3530d998f159966cdf6230419b0b34bee0d1bb5176265c9`.
  The committed patch builder verifies that baseline and equivalence to
  pre-fix chat code at `4eaaf95`. No staging-only application code is promoted.
- Replaced only `TREG_TOKEN` on `wtfmedia-research-staging`, using the owner's
  new local Cloudflare vars value through protected stdin. Secret-update
  version `e467a19f-acaa-4c41-b993-adbf037634ef` reads back at 100%, with
  the same ten binding names and runtime settings. The new key passed one
  bounded public Treg search (HTTP 200, provider receipt present). The runner
  was inactive, so its next start loads the new environment. Existing local
  runner credentials return 401 against staging; no separate runner token
  was changed and no authenticated research run is claimed.
- Isolated committed-source OpenNext build and staging/Alpha dry runs pass.
  Compiled and live sign-in configuration match the staging Clerk issuer.
  Existing Next.js 15.5.24 still needs OpenNext's unsupported-version override;
  dependency upgrades remain separate. Source checks are recorded below.
- Live smoke: staging root 307, sign-in 200; staging principal/research and
  production principal return 401 signed out. Alpha and staging `/v1/health`
  return healthy Anthropic/Sonnet configuration; staging identifies Alpha as
  its corpus authority. No full signed-in persona matrix was repeated.
- Rollback versions: Alpha `375698fc-37da-44bd-a8f7-585b9d388868`, staging
  Edge `8271bf46-d7c2-451a-9935-8822bcbc832e`, staging Web
  `dbaf9988-4994-4ab8-992f-32d6827ea36d`. Research before the key update:
  `511a56ad-2176-47e4-aaac-935b4de31071`; do not undo the approved secret
  update as part of an unrelated code rollback. Durable state is unchanged.

## 2026-10-24 — Alpha topic retrieval and citation validation fixes

- Owner requested tracing and fixing the quick-commerce failure in shared
  Alpha, then pushing all local changes only to `feature/pavun`. Subsequently
  authorized staging deployment, replacement of staging's Treg key from the
  local Cloudflare vars file, and shared Alpha deployment with its production
  impact. Runtime deployment receipts will be recorded separately below.
- Read-only source tracing found unconditional history rewrites changed the
  embedding query and the speech-dependent phrase-anchor/deduplication path.
  The original question selected six passages mentioning the topic; synthetic
  earlier-topic rewrites selected three and two. This demonstrates a failure
  mechanism, not recovery of the original turn's unavailable internal trace.
- Explicit standalone topic requests now retain their current wording.
  Referential follow-ups still resolve from history, with a prompt that
  preserves new topics. Direct passage mentions are promoted before the
  citation cap, independently of speech verbs; episode and person scope,
  source-mode filters and score floors remain enforced. Semantic alternatives
  are retained, and no relevance filter, corpus mutation or new provider is added.
- Citation validation incorrectly split amounts and continuation abbreviations
  such as rupee amounts, examples and lowercase continuations of initialisms.
  The same defect rejected structured repairs. Corrected those boundaries,
  retaining rejection of uncited preceding/following claims, actual new
  sentences, malformed repair structures and out-of-range citations.
- VERIFIED-SOURCE: three targeted regressions fail on the previous source and
  pass with the fix; full Edge suite 583/583, web contracts 101/101, web
  typecheck, privacy scan (0 violations), Worker bundle dry run and diff check
  pass. Contract tests require local HTTP binding permission; the sandboxed
  attempt timed out and was replaced by the passing permitted run.
- Live read-only retrieval through the fixed source selected six topic-bearing
  passages both standalone and after synthetic prior-topic history, with all
  generation calls stubbed. Real Claude with invented evidence reproduced the
  old citation failure and returned `answered_grounded` after the fix. A live
  corpus-to-Claude synthesis probe was blocked by automatic approval review;
  no new full end-to-end live-corpus synthesis acceptance is claimed.
- Includes the earlier requested local-credential untracking, context handoff
  and architecture refresh. Local secret values remain outside Git; no
  credentials, private history, prompt/answer bodies or transcript excerpts
  are included in this checkpoint.
- Release preparation: web unit 429/429, web lint and research host 5/5 plus
  typecheck pass. The new Treg key passed a bounded public search (HTTP 200).
  Recorded Alpha source commit is unavailable locally and on the remote.
  `scripts/build-alpha-topic-patch.mjs` instead checks the downloaded live
  bundle's exact hash and pre-fix chat modules before replacing only the
  reviewed answer, query-topic and public-chat modules. The resulting artifact
  passes 54/54 chat tests against its compiled functions and route adapter.
  This preserves other deployed Alpha code rather than promoting staging code.

## 2026-10-24 — Read-only Ask WTF evidence diagnosis

- Confirmed the published-only local chat uses the shared Alpha web service,
  whose recorded web version binds to `wtfmedia-edge`. Inspected the current
  deployed Alpha source through a temporary download; no runtime was changed.
- Read-only Alpha corpus checks: D1 has 6,354 active transcript chunks
  (5,742 published, 612 uncut). A quick-commerce phrase search matched 28
  active chunks. Direct published Vectorize retrieval returned relevant
  excerpts, including Craft Beverages, Next Gen, Nandan Nilekani and Uber.
- In-memory checks of 57 published and 57 uncut stored R2 text objects found
  quick-commerce phrases in both sets, but no matches for the checked
  astrology/horoscope/zodiac/jyotish/kundli terms. Stored-object counts do not
  establish ingest approval or completeness; keyword absence does not prove
  the subject was never discussed. No corpus text was retained locally.
- Shared Alpha probes returned quick-commerce sources for a standalone query
  and synthetic topic switches based on the owner's screenshot. One standalone
  response reported `synthesis_invalid`; subsequent history-bearing probes
  reported `answered_grounded`. The local source pipeline also answered the
  synthetic sequence with a topic-preserving rewrite. These checks do not
  reproduce or fix the screenshot's original missing-evidence response, nor
  establish whether that turn failed during reformulation, ranking or synthesis.
- An unscoped private-history diagnostic was rejected before execution.
  Continued with synthetic history only. No private conversation bodies or
  identifiers were retained in this checkpoint. No source-option, application
  code, corpus, credential, deployment, commit or push change in this diagnosis.

## 2026-10-24 — Keep local Edge credentials outside Git

- Owner requested removing `cloudflare/.dev.vars.local` from Git tracking
  while preserving its local contents and working services. Added a root
  ignore rule for `cloudflare/.dev.vars.*` and removed only the index entry.
- Local file integrity and service health were checked without logging keys.
  The removal is staged locally; no commit or push is part of this task.
  This does not erase the file from existing Git history or rotate credentials.

## 2026-10-23 — Cross-machine context pickup and flow verification

- Read the owner's `WTF_OS_Chat_Memory_Handoff_2026-10-23.md` and repository
  operating guides; reconciled the checkout from `main` to the existing
  `feature/pavun` branch. Fetched origin and confirmed HEAD and upstream both
  resolve to `4eaaf9515296ac116ee0a731c022898a54ae96cb`, with zero divergence.
  The owner's plural branch spelling refers to this existing singular branch.
  Future work stays here; any requested push must target only `feature/pavun`.
  No push, commit, deployment, migration or provider mutation in this pickup.
- The Oct 22 statements below that PR #86 changes were still local are
  historical: the merge, review fixes and receipts are present on origin at
  `4eaaf95`. Last recorded staging runtime remains `9990e5e`; this check did
  not read back Worker versions or establish a new deployment receipt.
- Context correction from current source: `BetaChatWorkspace` always uses
  `createMemberChatAdapter` and `/beta/api/chat`. `memberIdForPrincipal` maps
  operators into owner-scoped member chat storage while operator admission and
  authority still resolve through the operator roster. Older separate-store/
  adapter descriptions do not describe this current Beta chat path. Legacy
  operator routes/storage must not be removed merely because of this finding.
- Preserve Alpha-only transcript authority, direct Claude generation,
  authenticated owner-scoped saved work, admin-only analytics connection
  management, and production YouTube page/navigation guards. Research remains
  pre-shoot guest/company/industry work; any subject field suffices. Six-channel
  discovery targets up to 120 sources; report follow-ups use retained evidence
  without new discovery. Keep the accepted reader and genuine Word export.
- Fresh VERIFIED-SOURCE at this runtime tree: 576 Edge tests, 429 web unit
  tests, 101 web contracts, 157 Python research tests, five research-host tests,
  20 Phase 2 browser tests, and 34 research reader browser tests pass. Research
  browser coverage is desktop and 320px Chromium, not Safari/Firefox. Web and
  research-host typechecks, web lint, architecture freshness (787 inputs), and
  privacy (zero violations across 435 bounded files) pass. Locked dependencies
  were installed locally; sandbox socket restrictions and a missing browser
  were resolved without changing source, dependency versions or lockfiles.
- Fresh read-only staging smoke: root 307, sign-in 200, signed-out principal,
  research and LinkedIn Page-management reads 401. An initial principal probe
  timed out at 20 seconds; one retry returned 401 in about 1.13 seconds.
  These checks do not prove authenticated role isolation, real OAuth/metrics,
  a new live report, or production parity. No real account was modified.
- GitHub still reports zero active workflows, zero runs and zero check-runs
  for `4eaaf95`. Hosted CI is not green; repository administration remains a
  separate task. Older README/onboarding/planning and architecture narrative
  contains historical model/topology/state claims; use current source and exact
  dated receipts. The supplied memory file remains preserved and untracked.

## 2026-10-22 — PR #86 staging deployment receipt

- Exact runtime candidate `9990e5e8eb01640a94425080d74dee9e270f2a07`
  deployed to staging Edge `8271bf46-d7c2-451a-9935-8822bcbc832e` and
  Web `dbaf9988-4994-4ab8-992f-32d6827ea36d`; both read back at 100%
  traffic. Public ingress: `https://beta-staging.wtfhq.in`.
- All 26 Edge and 10 Web bindings unchanged. Rollback versions are Edge
  `88d438be-a6f5-4cd3-8a98-aee5179dda62` and Web
  `56ab007a-ec01-4932-91cc-7608218c19af`. No migration or secret change.
- Isolated archive build used copied dependencies and verified staging public
  Clerk configuration, without local environment files. Compiled and live
  sign-in keys match the staging issuer. OpenNext build and both dry runs pass.
  Existing Next.js 15.5.24 still requires OpenNext's unsupported-version
  override; a framework upgrade remains a separate maintenance risk.
- Live smoke: root 307, sign-in 200, social analytics shell 200; signed-out
  principal and GET/PUT Page-management plus DELETE account APIs return 401.
  Standalone local-management routes return 404 on staging. No real provider
  connection was switched or deleted; signed-in persona and OAuth checks were
  not repeated. Production/shared Alpha and research services remain unchanged.
- Merge and review-fix commits remain local on `feature/pavun`; no push was
  requested for this deployment. Existing GitHub Actions availability limits
  are unchanged; checks above are local source checks and live smoke receipts.

## 2026-10-22 — PR #86 reviewed and integrated for staging

- Merged PR #86 (`92db8365accea61cb793678ef32ae1cc4b8986d3`) into
  `feature/pavun`: administered LinkedIn Page selection, confirmed connection
  removal, coverage/sync messaging, 365-day filters and richer post previews.
- Review fixes: blocked unauthenticated local Page/account management, removed
  unused provider mutation wrappers, distinguished missing metrics from reported
  zero activity, and guarded malformed post dates. Authenticated Beta management
  retains server-side admin capability and selected-workspace checks.
- VERIFIED-SOURCE: 429 web unit, 101 contract, 576 Edge and 20 Phase 2 browser
  tests pass; typecheck/lint pass; privacy scan has zero violations across 435
  bounded files. Controlled tests do not prove live LinkedIn mutations or
  connected-account accuracy. No real account was switched or removed.
- Staging Web/Edge deployment authorized; no migration, credential change,
  production/shared Alpha or research deployment. No branch push requested.
  The unrelated untracked architecture/user-flow draft remains untouched.

## 2026-10-21 — No-evidence chat presentation deployed to staging

- Owner-authorized frontend candidate `e77be403eb27f6464bc5c2c0401c530cc73cd30a`
  deployed to `wtfmedia-web-staging` as
  `56ab007a-ec01-4932-91cc-7608218c19af`, read back at 100% traffic on
  `https://beta-staging.wtfhq.in`. All ten existing bindings are unchanged.
  Staging Edge, shared Alpha, production frontend and research runner unchanged.
- Isolated source archive used copied existing dependencies (unchanged lockfile)
  and the verified staging public Clerk key, with no local environment files.
  OpenNext build, embedded Clerk-domain check and deployment dry run passed.
  OpenNext required its explicit unsupported-version override for the existing
  Next.js 15.5.24 release; no dependency upgrade was made. Framework support
  remains a separate maintenance risk.
- Live smoke: root 307, sign-in 200, Beta chat shell 200, signed-out principal
  API 401. Live sign-in key matches staging issuer. No new authenticated persona
  testing; the prior controlled browser regression covers saved no-data replies.
- Rollback Web version: `6f816576-4b4b-4b17-b2b2-9a8dd18be40f`. No migrations,
  credential changes or production deployment. GitHub Actions remains without
  active registered workflows; local source checks are not hosted CI receipts.

## 2026-10-21 — Push verification and no-evidence answer presentation

- Owner requested pushing the branch and fixing CI failures, then requested
  no-data chat replies show only their explanation without a cited-source card
  or duplicate warning. Shared member/operator presentation now omits stale
  sources, citations, moments and follow-ups on ungrounded/unavailable answers;
  public chat also respects retrieval-weak/abstention state. Grounded answers
  and cited-excerpt synthesis fallbacks retain evidence. Saved records are not
  mutated, and this change does not deploy a new web bundle.
- Reproduced and fixed the Phase 2 disposable build losing sibling Cloudflare
  source imports; its isolated workspace now preserves web/cloudflare/src
  layout while excluding Worker credentials/state. Corrected old browser tests
  to enforce the owner-requested production analytics removal (hidden menu and
  404), while staging remains visible. Regenerated architecture fingerprints.
- Initial push through `e9d57c1` was confirmed remotely. GitHub reports zero
  runs/checks for that SHA, Phase 2 and Architecture workflows as `deleted`, and
  no registered Research workflow. Workflow files exist on feature/pavun;
  Actions policy inspection returns 403 for the current non-admin account.
  No repository Actions settings or default branch were changed. Local gates
  are source verification, not a claim that hosted GitHub CI passed.
- Local verification: web unit 425/425, contracts 101/101, Python research
  157/157, typecheck and lint pass. Final Phase 2 gate passes with 574 Edge
  tests, 20 browser tests (including both saved no-data-answer regressions),
  audit-filter checks and zero privacy violations across 433 bounded files.
  A public journey attempted with the signed-in Phase 2 adapter redirected to
  Beta and was not an acceptance result; the matching Beta regression is used.
- The unrelated untracked architecture/user-flow draft remains untouched.
  No deployment, database, credentials or model configuration change.

## 2026-10-21 — Ask WTF citation repair deployed and checked

- Owner explicitly approved deploying the shared Alpha citation fix after being
  informed that staging's shared inference also serves production Ask WTF.
- Final staging runtime source `9b2a7b5` is deployed as Edge version
  `88d438be-a6f5-4cd3-8a98-aee5179dda62`; isolated Alpha candidate
  `746bd86934fe0c115d35c37a60dea9b3efef804a` is deployed as Edge version
  `375698fc-37da-44bd-a8f7-585b9d388868`. Both read back at 100% traffic.
  Alpha contains only the two chat runtime and two regression-test file changes
  over its previous production inference base, not a feature-branch promotion.
- Final live checks exposed a five-token evidence-verdict budget truncating
  Claude's response. Increased that classifier budget to 64 and added the
  regression. VERIFIED-SOURCE: 574/574 staging-source and 485/485 isolated
  Alpha tests pass; both final deployment dry runs and diff checks pass.
- Live Alpha web chat adapter: initial answer and two history-bearing follow-ups
  returned HTTP 200, `claude-sonnet-5-5`, `answered_grounded`, six sources and
  valid citation indices in 13.83s, 14.64s and 15.68s. No excerpt-only fallback.
  The unsupported-data question returned `abstained` with no exposed sources or
  citations in 13.75s. X-Fallback remains true for repaired grounded answers as
  well as abstention; it does not alone mean synthesis failed.
- Health confirms Anthropic / Sonnet 5.5 configured on both services. All 26
  staging and 29 Alpha bindings are unchanged. No web/research deployment,
  migrations, secret changes, corpus changes or branch push. Only metadata was
  retained from live conversations; no question, answer or transcript bodies.
- Full authenticated browser/persona acceptance was not repeated. Public staging
  remains `https://beta-staging.wtfhq.in`; shared Alpha Web remains unchanged.
- Pre-task rollback Edge versions: Alpha `3abdfb0b-2223-44f0-bec5-7d131f3952db`,
  staging `bad7e205-cae7-4b1d-98c6-f3f905a1b25c`. Immediate previous citation
  rollout versions were Alpha `65884044-6231-4291-9f90-460b41e261a0` and staging
  `3270dd95-b3e8-487a-991f-8d58a4905a25` (before classifier-budget correction).

## 2026-10-21 — Ask WTF follow-up citation repair prepared

- Owner requested citation fallback repair, follow-up testing and staging
  deployment. Staging continues to delegate inference to shared Alpha; its
  required inference patch also affects production Ask WTF.
- Reproduced false rejection of multi-sentence quotations with a single valid
  trailing citation. The checker now treats a cited quotation as one unit and
  still rejects uncited surrounding prose and invalid source numbers.
- Free-form citation repair repeatedly left or introduced uncited opening
  sentences. Repair now requests structured sentences with explicit source
  indices, validates the shape/range, renders citations, and reapplies the same
  coverage guard. Invalid, unsupported or failed repairs retain safe fallback;
  no blind citation insertion or extra retry loop. Repair receives the rejected
  span as quoted data, with current evidence and existing conversation context.
- Temporary diagnostics logged only punctuation shapes, never question, answer
  or transcript text, and were removed before packaging. No secrets changed.
- VERIFIED-SOURCE: 573/573 staging-source Edge tests and 484/484 isolated Alpha
  candidate tests pass, including three-turn history/citation preservation and
  malformed-repair cases. A real local Claude conversation returned
  `answered_grounded` with six sources on all three turns (25.46s, 25.45s,
  18.96s). Live deployment results follow; no full persona/UI matrix claimed.
- Pre-deploy rollback: shared Edge `3abdfb0b-2223-44f0-bec5-7d131f3952db`,
  staging Edge `bad7e205-cae7-4b1d-98c6-f3f905a1b25c`. Web/research/UI, existing
  credentials, migrations and corpus resources are outside this patch. No push.

## 2026-10-21 — Shared Alpha Ask WTF now uses Claude

- Owner-authorized inference-only candidate
  `bf88ccedffbabd8c413099ed01ea55b3dcb6c0c3` is deployed to `wtfmedia-edge` as
  version `3abdfb0b-2223-44f0-bec5-7d131f3952db`, read back at 100% traffic.
  Both Beta environments use this shared Alpha inference authority.
- Existing Anthropic key added as the shared Edge server secret. Version binding
  comparison shows only `ANTHROPIC_API_KEY` added: zero removed or changed
  existing bindings. Temporary credential file removed. No web/research/analytics
  promotion, migrations, corpus changes, credential rotation or push.
- Live health confirms Anthropic, `claude-sonnet-5-5`, configured true. Through
  the actual Alpha web `/api/chat` adapter, initial question: HTTP 200, model
  `claude-sonnet-5-5`, `answered_grounded`, six sources, 13.67 seconds. It needed
  citation repair, so X-Fallback remained true. Follow-up: HTTP 200, same model,
  six sources, 14.82 seconds, but `synthesis_invalid`; the existing safe cited
  excerpt fallback was returned. Model migration is confirmed; consistently
  successful synthesis across follow-ups is not claimed and needs calibration.
- Both production and staging principal APIs still return 401 signed out.
  Direct Python HTTP probes received 403 in this host environment; curl reached
  the same endpoints successfully. No authenticated user-session UI matrix was
  repeated. No question/answer or transcript bodies retained in receipts.
- Rollback: Edge `bad9782e-6844-400a-bdfb-1992ffadface`; shared Alpha Web remains
  `3d5a5965-14f3-486a-a608-330d539dec81`. Previous provider secrets are preserved.
  Rollback restores the old model route, not data or independently changed state.

## 2026-10-21 — Shared Ask WTF Claude cutover prepared

- Owner explicitly requested shared Ask WTF generation use direct Anthropic
  Claude Sonnet 5.5. This affects both staging and production through the existing
  Alpha web bridge; no second corpus is introduced.
- Isolated production candidate `bf88ccedffbabd8c413099ed01ea55b3dcb6c0c3`
  has parent deployed source `89c122c5559a4a1bcd4798d1b13065b2df58aa9c`.
  Only ten inference/runtime/test files differ. Production identity, analytics,
  ingest, resource configuration and web builds remain at their deployed base.
- Old retry hints are accepted for client compatibility but cannot select another
  model. Grouped citations use the canonical parser; uncited claims, invalid
  placeholders and out-of-range references still fail. Sentence-level citation
  instructions are explicit. No diagnostic chat/transcript bodies were logged.
- VERIFIED-SOURCE: isolated candidate Edge 476/476, current branch Edge 565/565,
  production package dry run and diff whitespace checks pass. Live local probe
  reports `claude-sonnet-5-5`, `answered_grounded`, six sources, 14.27 seconds;
  one citation repair was needed. This is not a deployed receipt.
- Rollback target recorded before upload: production Edge
  `bad9782e-6844-400a-bdfb-1992ffadface`; Alpha web
  `3d5a5965-14f3-486a-a608-330d539dec81` is not changed. Anthropic key upload
  is limited to the shared Edge under this model-change authorization. No push,
  migrations, UI promotion or new research run. Deployment result follows.

## 2026-10-21 — Claude and research reader deployed to staging

- Owner-authorized candidate `aed119b4d597d7d060c7cc8b1787e54d4698a830` is deployed:
  Edge `bad7e205-cae7-4b1d-98c6-f3f905a1b25c`, research host
  `511a56ad-2176-47e4-aaac-935b4de31071`, Web
  `6f816576-4b4b-4b17-b2b2-9a8dd18be40f`. Deployment readbacks show 100% traffic.
  Public staging remains `https://beta-staging.wtfhq.in`.
- Research image is pinned to
  `sha256:f2f94dae049046a6eb7244cb2eb5a6dd6a949ee4274a31af42839b5dbc5587f8`.
  Registry upload of a rebuilt dependency layer failed, so the existing pinned
  dependency image was reused after exact requirements-lock hash comparison.
  All 14 Python runtime module hashes match current source; image imports pass.
  No private state, local environment file or credential was included in the image.
- The existing local Anthropic key was uploaded only as a server secret on the
  staging Edge and research host. Existing runner/state tokens and other secrets
  remain unchanged. No database migrations, production/Alpha changes or push.
- Live smoke: staging Edge reports Anthropic/Sonnet 5.5 configured and retains
  Alpha corpus delegation. Hosted runner authenticated health reports configured
  true after rollout (an initial transitional check returned false). Root returns
  307; sign-in/research return 200; unsigned principal/research/social APIs return
  401. Live Clerk issuer and research JavaScript match the isolated staging build.
- Previous rollback versions: Edge `1686db84-f7e8-4c39-b760-d00e61dc44fd`, host
  `21cbc9e3-6757-4f69-b1ae-470f4d864b86`, Web
  `ea504264-795e-4532-96d1-b7789dcc463e`; prior image
  `sha256:72f7c184b02248b8de07e591e9e787d784a54a92db1a2976cadab73733f72ac0`.
  Rollback does not restore data; do not remove state namespaces.
- Per owner instruction, no new staging report or signed-in chat test was run.
  End-to-end user testing and the full persona matrix remain unverified. Shared
  Alpha Ask WTF still uses its existing deployed generation; this staging rollout
  does not migrate that production-affecting inference service.

## 2026-10-21 — Claude staging candidate preparation

- Owner requested staging deployment of the approved reader/flexible-input and
  Claude implementation. Shared Alpha and production are excluded. Local social
  analytics now has the same explicit backend feature flag as staging.
- VERIFIED-SOURCE: edge 563, web unit 418, contracts 101, Python 157, hosted store
  5; web/host types, lint, privacy (0/433), isolated OpenNext build and staging
  package checks pass. The build uses the verified staging Clerk issuer and no
  local environment files. Existing Next 15.5.24 requires OpenNext's explicit
  unsupported-version override; no framework upgrade is included.
- Live local calibration before the owner stopped testing: direct Claude access
  succeeded; YouTube planning with synthetic Google data preserved exact metrics;
  social planning resolved comparisons and the second post. Local YouTube is
  disconnected and returns an honest connection message. Local Ask WTF reached
  Claude but used the citation fallback; this is not full live acceptance.
- Staging has no pending D1 migrations. Existing staging versions and secret names
  were recorded before deployment. Only the server-side Anthropic credential is
  added to the staging Edge and research host; other credentials are preserved.
- Final deployment versions, image digest and smoke results follow after upload.

## 2026-10-21 — Research presentation deployed to staging

- Owner authorized deployment of grouped section sources and the single-tilde
  rendering fix. Exact candidate `785f1338ed5d6a386550aa22299b826938328fe6`;
  staging Web version `ea504264-795e-4532-96d1-b7789dcc463e` has 100% traffic on
  `beta-staging.wtfhq.in`. Rollback Web version:
  `d8d04ac5-b1ca-4120-a777-f7e1b1815dbf`.
- VERIFIED-SOURCE: 91 research unit tests, TypeScript, lint, architecture ledger
  (773 inputs), OpenNext build and staging package dry run pass. Isolated build
  used the verified staging public Clerk key, with no local environment files.
- Live research JavaScript matches the built asset byte-for-byte and contains
  both fixes. Sign-in Clerk issuer matches staging. Root redirects (307);
  sign-in/research return 200; unsigned principal/research/social APIs return 401.
- Existing bindings/secrets retained; Edge and research-host deployment versions
  unchanged. No database/provider/production changes or push. Signed-in report
  appearance and source expansion still require real-browser verification.

## 2026-10-21 — Section-level research sources (local)

- Report sections now collect their known citation IDs into one collapsed source
  row below the prose, with coloured platform icons and a unique source count.
  Expanding the row reveals links using the existing source-detail navigation.
  Repeated references are deduplicated within each section; uncited sources are
  not attributed to it, and unknown references remain visible.
- Saved prose and Markdown exports retain original citations. Follow-up chat
  retains its existing citation presentation; current and historical report
  sections share the new rendering.
- VERIFIED-SOURCE: 91 research/metadata unit tests, web TypeScript and diff
  whitespace checks pass. No deployment/push or live-browser verification.

## 2026-10-21 — Research approximation formatting (local)

- Research Markdown now disables GFM single-tilde strikethrough so paired single
  tildes in generated prose remain literal. Explicit double-tilde strikethrough,
  citation links, tables and saved content remain unchanged. The shared renderer
  covers report sections, historical versions and research follow-up messages.
- VERIFIED-SOURCE: regression reproduced accidental `<del>` before the fix;
  89 research/metadata unit tests and web TypeScript pass afterward.
- No deployment or push. The exact saved report has not been inspected or
  checked in the live browser; explicit double-tilde formatting still renders.

## 2026-10-20 — Summary allowance/retry fix deployed to staging

- Owner authorized this deployment. Application source `ce595900dee7705266897697cae3d92b26595397`;
  exact image-pin candidate `9b7aa08ce874f4555226de30a5bdaf7ab1018117`.
  Staging research Worker `21cbc9e3-6757-4f69-b1ae-470f4d864b86` has 100% traffic.
  Container application version 7 rollout `233c4c4f-b25d-4068-a6c0-a9ef326233e4`
  completed with no reported health errors. Image digest:
  `sha256:72f7c184b02248b8de07e591e9e787d784a54a92db1a2976cadab73733f72ac0`.
- Live bounded preparation check summarized all 120 retained public sources in
  three batches: 17.58s, 9.14s, 16.99s; total 43.8s. No truncation, 11,654-byte
  combined context, reported GLM 5.3, recorded model cost $0.008929. This used
  temporary local diagnostic state and did not restart or modify the saved report.
- Release checks passed: 126 Python tests, 4 hosted-store tests, TypeScript,
  architecture freshness (773 inputs), diff/package dry-run, and image import
  checks. All 14 runtime module hashes match committed source. Existing locked
  dependency bundle reused; no private state or credentials entered the image.
- After rollout completion, private health reports configured=true; a synthetic
  hosted follow-up returned the expected fact/citation in 11.8 seconds, recorded
  model cost $0.000058. Staging pages return 200, root redirects, and protected
  principal/research/social APIs return 401 unsigned. Web/Edge versions and all
  bindings are unchanged. No secrets, migrations, production changes or push.
- Rollback: previous research Worker `2afc677f-b786-40e4-aabb-10791195124f`, image
  `sha256:bd890e5f40d578c6a4c31c229bfb4665d01df07661de670183f50cac2fc390f8`.
  Full live report generation and signed-in UI remain untested for this candidate;
  owner can use Research again to test a fresh run. Historical per-section timing
  cannot be recovered from available saved revisions or unauthorized log access.

## 2026-10-20 — Summary truncation and retry correction (local)

- Owner requested a 4,000-token summary allowance, corrected retries and staging
  deployment after the GLM run failed all four tiers twice. Retained metadata
  confirmed 120 sources and `output_truncated`; no report text entered diagnostics.
  Saved submission-to-failure span was about 151 seconds. Historical Cloudflare
  telemetry remained unauthorized, so exact per-section durations are unproven.
- A bounded retained-public-evidence probe reproduced `finish_reason=length` at
  1,200 output tokens (471 reasoning tokens). The equivalent 4,000-token probe
  finished successfully with 1,915 output tokens in 18.41 seconds. This proves
  summary truncation on that input, not every failed call's internal timing.
- Summaries now start at 4,000; a truncated batch gets one 8,000-token retry via
  the existing two-attempt section budget. The allowance and completed batches
  are checkpointed. Exhausted shared-summary failure stops further tiers, including
  after process recovery; independent writer failures retain existing behavior.
  GLM 5.3, source quotas, global spend limits, privacy and output validation remain.
- VERIFIED-SOURCE: 126 Python tests pass. New regressions failed on old code,
  reproducing eight calls at the same limit; corrected tests cover 4,000 → 8,000,
  completed-batch reuse across restart, successful four-tier recovery, and stopping
  after exhausted shared preparation without issuing calls for other tiers.
- Deployment receipts follow separately. No failed user report was restarted or
  modified; any live preparation diagnostic uses temporary local job state only.

## 2026-10-20 — OpenRouter GLM 5.3 research deployed to staging

- Owner authorized staging deployment. Application source is `60c5289`; final
  image-pin candidate is `7d84adec0c3eeef005b7211edba0750404fbcd94`.
  The existing local OpenRouter key was uploaded to the staging research host's
  `OPENROUTER_API_KEY` secret. No credentials were printed or committed; old
  OmniRoute secrets remain unused and were not removed or rotated.
- Final research Worker `2afc677f-b786-40e4-aabb-10791195124f` has 100% traffic.
  Container application version 6 rollout `1b1d19ff-773a-4211-a4b6-11dcd12729fa`
  completed with no reported health errors. Final image digest is
  `sha256:bd890e5f40d578c6a4c31c229bfb4665d01df07661de670183f50cac2fc390f8`.
  The first image was replaced during final verification to preserve the existing
  missing-credential failure DTO; a regression now validates that DTO explicitly.
- All 14 Python runtime file hashes match committed source. Final source checks:
  124 Python tests, 4 hosted-store tests, TypeScript, architecture freshness
  (773 inputs), package dry-run and diff check passed. Build used the previously
  hash-locked offline dependency bundle; no local private state entered the image.
- Final hosted health returns configured=true. After rollout completion, one
  synthetic no-search follow-up passed in 10.22 seconds with the expected fact
  and citation; recorded model cost $0.000056. Its disposable job is removed by
  the endpoint. An earlier request returned 503 during rollout; the post-rollout
  retry succeeded. No full research report was started and no stopped user run
  was resumed. Signed-in UI and full report timing remain for owner testing.
- Staging public root redirects; sign-in/research pages return 200 and protected
  principal/research/social APIs return 401 unsigned. Web
  `d8d04ac5-b1ca-4120-a777-f7e1b1815dbf` and Edge
  `1686db84-f7e8-4c39-b760-d00e61dc44fd` versions/bindings are unchanged.
- Previous research rollback reference: Worker
  `d9890653-6b7b-459f-8330-5e40536a152a`, image
  `sha256:599cb556a70ee8ea53f219fd6306592e1498af84952145ec418bc4e299f17570`.
  Rollback does not restore storage or remove the added secret. Production and
  shared database schemas were unchanged. Local commits only; no branch push.

## 2026-10-20 — Research model pinned to OpenRouter GLM 5.3 (local)

- Owner stopped their staging research and requested a model-only investigation,
  then explicitly chose OpenRouter GLM 5.3 instead of OmniRoute auto-routing.
  No stopped research was resumed or replaced. No deployment, push, shared
  migration, secret upload, or host OmniRoute configuration change occurred.
- Bounded synthetic diagnostics observed the old alias returning different
  model identifiers. One writer began answering around 170 seconds; other calls
  hit the 180-second client deadline. Reasoning-control probes did not establish
  a reliable improvement. This shows request/route latency, not proof of an
  internal provider queue or an infrastructure fault. Historical telemetry access
  remained unauthorized; saved-run failure metadata was available.
- Research now always requests `z-ai/glm-5.3` from OpenRouter with low reasoning
  effort, streaming and existing privacy/price constraints. Legacy OmniRoute
  settings do not override it. Missing OpenRouter credentials fail before budget
  reservation. Local launcher, GPTR config, model metadata and container secret
  forwarding use the same route. Historical saved model receipts remain intact.
- Live synthetic writer probe with about 24 KB input completed in 19.27 seconds,
  returned 4,824 characters with source markers, and reported `z-ai/glm-5.3`;
  usage was 4,931 input / 1,010 output tokens, billed $0.001804. An actual search
  guidance parser probe returned valid priorities/date constraints in 2.31 seconds,
  billed $0.000126. Only synthetic evidence/notes were sent. These are model-call
  checks, not a full report latency or editorial acceptance result.
- Earlier local performance fixes are retained: whole-brief preparation and
  summary checkpoints are reused across section writers/retries, large evidence
  batches are 48 KB, provider success timing is logged, and an answer starting
  before its deadline gets one bounded 120-second completion window. Reasoning
  and heartbeats cannot extend the deadline; incomplete/truncated streams fail.
- VERIFIED-SOURCE: 124 Python tests, hosted-store tests (4), TypeScript and diff
  checks pass. Regression cases cover legacy gateway settings, missing keys,
  usage/cost, streaming completion/stalls, durable preparation and full source
  pools with real call/spend guards. Full live research and staging UI are untested.
- Before a future authorized staging deploy, add the existing OpenRouter key to
  the research host's `OPENROUTER_API_KEY` secret (Edge secrets are not inherited),
  build/test/pin a new runner image, and deploy the matching host source. The
  current deployed image/Worker still use the preceding OmniRoute implementation.

## 2026-10-20 — Balanced research runner deployed to staging

- Owner authorized deployment, then reserved the full report timing test for
  their own testing. No synthetic paid report was submitted.
- Application source `9f5df5a`; image-pin candidate `728b4bb`. Python imports and
  all 14 runtime module hashes match the archived source. 118 Python tests pass;
  architecture ledger (773 inputs), diff check, and host dry-run pass.
- Staging research Worker `d9890653-6b7b-459f-8330-5e40536a152a` receives 100%
  traffic. Container application version 4 rollout
  `7ef32d90-2728-4bf2-84bf-93c83d1460d7` is completed with no reported errors.
  Image digest:
  `sha256:599cb556a70ee8ea53f219fd6306592e1498af84952145ec418bc4e299f17570`.
- Edge `1686db84-f7e8-4c39-b760-d00e61dc44fd` and Web
  `d8d04ac5-b1ca-4120-a777-f7e1b1815dbf` are unchanged. All three Workers retain
  their bindings. Public staging root redirects, sign-in/research return 200,
  and signed-out protected principal/research/social APIs return 401. Private
  runner health after the completed rollout returns `configured=true`.
- Rollback reference: research Worker `a83dc2be-5726-42a1-a012-ade534152413`,
  image `sha256:2b0ac6e430791a451a21d10fddbe5511f906874643b352beb14f5cf03104a37b`.
  Production, credentials and shared database schemas were not changed. No push.
- Full report speed, paid-provider completion, and authenticated UI acceptance
  remain unmeasured for this candidate; the owner will test timing in staging.

## 2026-10-20 — Slow research diagnosis and balanced source budget (local)

- Owner reported a roughly 20-minute run. Read-only live runner metadata at
  16:49 UTC showed 65 sources / 49,060 excerpt bytes, all six channels found,
  and the first section on attempt 2 with no retained failure detail.
  Counts were Web 10, LinkedIn 10, YouTube 10, Instagram 10, Reddit 7, X 18.
  Historical Cloudflare telemetry rejected credentials (10000); the precise
  upstream cause is not proven. No run was cancelled, deleted or restarted.
- Source comparison confirms that `474089e` sent a selected 28 KB evidence
  context directly to writing; `da4df37` added sequential full-evidence batch
  model calls for every tier/attempt. The deployed model read timeout is 600
  seconds. This explains additional possible latency, not an observed timing
  breakdown or proof that source count caused the reported delay.
- Local changes target 20 sources per channel, 120 total, sharing unused slots.
  Relevant candidates rank within channels; URL deduplication and saved citation
  protection remain. Legacy reports with more than 120 protected citations are
  preserved. Web/YouTube/X request 20; undersupplied direct social searches get
  one domain-targeted web supplement, never unbounded pagination.
- Full evidence summaries now use a common public scope and cache exact batches
  in private job state across tiers/retries. Changed scope/text invalidates the
  cache. Private notes still guide search scope and final writing; originals
  remain the evidence authority. Failure reasons remain during retries and are
  cleared when the section succeeds.
- Model read inactivity timeout and chunk-checked elapsed deadline are reduced
  to 180 seconds; connection timeout stays 45 seconds. These are per-request
  limits, not a guaranteed three-minute report or strict wall-clock interrupt.
  Slow but valid upstream calls may now time out earlier.
- VERIFIED-SOURCE: 118 Python tests pass, including quota/shortfall allocation,
  protected citations, exact-batch reuse/invalidation, request bounds, and retry
  failure persistence. New tests failed before changes. No new paid full report,
  deployment, push, shared migration or provider/model configuration change.

## 2026-10-20 — Research guidance deployed to staging

- Owner authorized staging deployment. Application source is
  `da4df376f70d8406adabbd49c316a6c173842d59`; deployment candidate
  `a91eee8bd79a2654a6791898033a69363d564468` changes only the pinned image.
  No push, production change, secret change or database migration.
- Fresh checks: 110 Python tests, 542 Edge tests, 395 web unit tests,
  hosted-store test/typecheck, architecture freshness across 772 inputs,
  isolated 98-page OpenNext build and all three dry-run packages passed.
  The earlier 38 desktop/mobile fixture checks remain source evidence.
  All 14 image Python runtime files match committed source; compiled and live
  Clerk public identity matches the staging issuer.
- Staging versions read back at 100% traffic:
  Edge `1686db84-f7e8-4c39-b760-d00e61dc44fd`;
  Web `d8d04ac5-b1ca-4120-a777-f7e1b1815dbf`;
  Research `a83dc2be-5726-42a1-a012-ade534152413`.
  Existing bindings and secret names are unchanged. Custom Domain remains
  `beta-staging.wtfhq.in`; Web binds to staging Edge/self only.
  Migration inventory reports no pending migrations.
- Runner image:
  `registry.cloudflare.com/8f380cb5640467030b647e12773efb46/wtfmedia-research-staging@sha256:2b0ac6e430791a451a21d10fddbe5511f906874643b352beb14f5cf03104a37b`.
  Application API confirms version 3 and completed rollout
  `d2c7ea10-e698-46b1-8ce7-997d38225442`, with no health errors.
  Build reused the documented offline hash-locked dependencies. A registry
  manifest rejection was resolved by publishing without build attestation.
- Live checks: staging Edge health is OK with Alpha corpus authority; root
  redirects, sign-in/research pages return 200, and research assets contain
  structured inputs plus updated private-note guidance/consent. Principal,
  research status/list and social status return 401 without authentication.
- No new signed-in hosted research report or live social-source trial was
  started; the owner will test in their account. Existing reports are unchanged.
  Large runs retain payload/context/spend guards and can cost more or fail
  explicitly; unlimited retained source count is not an unlimited budget.
- Rollback versions: Edge `1ec66d09-59bc-4563-954c-7b5c5f9d36cf`;
  Web `cf4c7f99-31fe-4aaf-b74c-ed5092ce7b60`;
  Research `c5414d51-13d3-4d3f-8e2e-afef2e817b6b`, with prior image
  `sha256:6b59ea1cbb7f007f449220262ca8fd4f865a8852c6f666e651bb2c03ebf6e1b7`.
  Earlier readers enforce 80-source limits, so coordinate rollback with new
  submissions/results; rolling back code does not roll back saved state.

## 2026-10-20 — Research guidance, source retention and failure diagnostics (local)

- Supersedes the earlier local 80-slot representative fix below. Every unique
  eligible returned source is retained, including results beyond the requested
  provider page size; Python, Edge and browser contracts accept counts over 80.
  Saved citation IDs/excerpts remain protected. Large synthesis contexts read
  all usable extracts in batches while original evidence remains unchanged.
- Approved private notes now guide searches as well as writing: public topics,
  priorities, comparisons, exclusions and interview angle are interpreted before
  discovery. The full approved notes guide synthesis. UI consent explains that
  derived public guidance goes to search providers; unapproved notes remain
  in the private record and are not sent to providers.
- Dates are optional instructions, not the research goal. Calendar-relative
  ranges are resolved once and checkpointed. Native supported date/recency
  filters plus local publication-date checks cover discovery and tier searches;
  undated/out-of-window evidence is excluded for a strict time scope. Raw note
  prose is not copied into queries. Ambiguous guidance can request clarification.
- Safe saved failures/logs now identify provider, operation, HTTP status and
  reason, separating HTTP/transport/stream failures from local context limits.
  Logs include bounded timing/byte counts and exclude inputs, raw responses,
  identifiers and credentials. Historical generic failures remain unidentified.
- VERIFIED-SOURCE: 110 Python tests (real pinned GPTR with fake external
  adapters included), 542 Edge tests, 395 web unit tests, 38 desktop/mobile
  fixture browser tests, web typecheck, scoped ESLint and architecture check.
  Focused receipt tests were rerun after the final diagnostic additions.
- VERIFIED-LIVE, bounded local synthetic check: OmniRoute `noesis-research`
  reported `gpt-5.6-terra`; general guidance applied no date constraint, a
  five-month instruction resolved to 2026-05-20 through 2026-10-20, and Treg
  returned six eligible dated web sources. Two model planning calls and one
  web search only; no full report or live social-channel trial was run.
- No deployment, push, migration, model switch or credential change. Existing
  reports are unchanged. Deploy tolerant Edge/Web readers with the new runner
  image together when authorized. Existing payload, model-context and spend
  safeguards remain; large evidence sets can cost more and fail explicitly at
  those limits instead of silently evicting sources.

## 2026-10-20 — Research partial-report diagnosis and local source fixes

- Read-only staging run metadata confirms three completed sections and an
  `appetizers` failure after two attempts with `provider_unavailable`. The last
  successful model receipt is OmniRoute / `gpt-5.6-terra`; it does not identify
  the model or HTTP/stream cause of the failed call. Historical telemetry API
  rejected current credentials (10000), so no exact upstream cause is proven.
- Discovery recorded all six channels as found. At the 80-source cap, later
  relevance-ranked web expansion could evict uncited social evidence: final
  counts were Web 68, LinkedIn 1, YouTube 10, Instagram 0, Reddit 0, X 1.
  Local retention now reserves usable channel representatives before filling
  remaining slots by relevance, without replacing protected cited sources.
- Shared source marks now use brand colors. Zero-retained discovery displays
  “Results found; none retained”. Successful polling clears an earlier refresh
  error rather than leaving a stale timeout warning beside the loaded report.
- VERIFIED-SOURCE: 93 Python tests, 394 web unit tests, 38 desktop/mobile
  research browser fixture tests, web typecheck and scoped ESLint pass.
  New regressions failed before the fixes. Local badge screenshot inspected.
- These fixes are local only. No deployment, push, provider/model change,
  credential change, migration or paid research rerun was performed. Existing
  partial reports are unchanged; signed-in staging retry is not verified.

## 2026-10-20 — Research V2 deployed to staging

- Owner authorized staging deployment and will perform the signed-in research
  trial. Candidate `ee940302451a912a1d1f5c9f3739bc0a1e610560` pins the tested
  container image; application source is unchanged from `474089e`. No push,
  production deployment, credential change or shared migration was performed.
- Staging migration inventory has no pending migrations. Existing secret
  binding names were preserved across all three Workers. Web binds only to
  staging Edge/self; Edge retains staging D1 plus the Alpha inference bridge.
- Deployed versions, each read back at 100% traffic:
  Edge `1ec66d09-59bc-4563-954c-7b5c5f9d36cf`;
  Research `c5414d51-13d3-4d3f-8e2e-afef2e817b6b`;
  Web `cf4c7f99-31fe-4aaf-b74c-ed5092ce7b60`.
  Custom Domain remains `beta-staging.wtfhq.in`.
- Runner image:
  `registry.cloudflare.com/8f380cb5640467030b647e12773efb46/wtfmedia-research-staging@sha256:6b59ea1cbb7f007f449220262ca8fd4f865a8852c6f666e651bb2c03ebf6e1b7`.
  Containers application API confirms version 2 and completed rollout
  `bb603334-af96-468f-96fb-a27ea2cadcac`, with no health errors. The dashboard
  summary briefly returned the old version; the application/rollout API was
  used for verification. No active research was started for this deployment.
- VERIFIED: all 13 image Python runtime files match committed source; isolated
  OpenNext build, three dry-run packages, hosted-store tests and typecheck pass.
  Compiled/live public Clerk key matches the staging issuer. Live API health
  reports staging and Alpha corpus authority. Root redirects; sign-in and
  research page return 200; live research assets contain Guest/Company/Industry.
  Principal, research status/list and social status reject signed-out access.
- User chose to test the signed-in flow themselves. This receipt does not claim
  a new hosted report completed, real-user privacy matrix, Safari acceptance,
  or a rollback rehearsal. The runner is idle until work is requested.
- Rollback versions: Edge `83f831ed-9ea8-47e4-8d18-211db91c5c45`;
  Research `b7cf82e5-4301-494f-99c9-9720d6e10725`;
  Web `c8e5c646-baef-4853-8d59-3ca5f468cd41`.
  Prior image digest:
  `sha256:fc404877fe5b93debbe426e09ed99f7b3f4331292b614f1d53d32365c4874549`.
  Disable V2 submissions before any old-runner rollback; preserve Durable
  Object and D1 state. Worker rollback alone is not an image/state rollback.

## 2026-10-20 — Research V2 implemented locally

- Owner approved the complete research flow. Continued on `feature/pavun`;
  no push, shared database change, credential update or deployment.
- New Guest/Company/Industry inputs retain comprehensive global research with
  Indian audience context throughout. Four tiers cover guest background,
  company/industry, positioning/opportunities, and interview preparation.
  Private notes stay consent-gated and out of public queries.
- Added six Treg channel adapters with observed catalog contracts, truthful
  fallback/coverage, platform badges and source details. No episode ID,
  upload control or public per-section regeneration is present.
- Report-first UI retains cooking, clarification, partial/failure, cancellation,
  deletion, versions and follow-up states. Scope changes label the retained
  report as outdated and prevent mismatched follow-up; restoring a clean
  snapshot restores its corresponding scope/evidence.
- Safe diagnostics classify failures without provider bodies or identifiers.
  Model metadata survives recovery and missing billing stays unknown.
  Later relevant evidence can replace uncited sources without orphaning prior
  citations; optional search failures can use retained evidence. Empty social
  records, empty completed sections, malformed metadata and Unicode boundary
  mismatches have regression coverage.
- VERIFIED-SOURCE: 91 Python tests, including installed pinned GPTR
  compatibility; 540 full backend tests plus the subsequent focused snapshot
  restore regression; 394 web unit, 97 contract and 36 Chromium desktop/320px
  mobile tests. Frontend build/lint, targeted typechecks, hosted runner
  typecheck and durable-store tests passed. Browser tests use fixtures.
- Local runner image `wtfmedia-research:local-v2-20261020` built with the
  documented offline, hash-locked dependency recipe after the normal dependency
  download stalled. Local image digest:
  `sha256:6b59ea1cbb7f007f449220262ca8fd4f865a8852c6f666e651bb2c03ebf6e1b7`.
  Networking-disabled smoke passed pinned GPTR import, authentication, private
  validation errors, V2 enqueue/read/delete. No image was pushed or deployed.
- LIVE-LOCAL: one public-subject trial completed four substantial sections and
  retained 80 sources with resolvable citation IDs. A provider outage recovered
  on retry; the successful retry took about eleven minutes. Final data passed
  Edge/Web validators and Markdown export. Later review fixes were checked
  offline, not by repeating the full paid trial after every change.
- The live model receipt reported OmniRoute `noesis-research` and
  `claude-sonnet-5-5`; tool cost was $0.10768 recorded/reserved, model billing
  was absent. YouTube used domain-targeted web fallback after its catalog tool
  returned 404. A LinkedIn call charged $0.008 despite a $0.002 quote/cap, so
  the channel stopped as budget-limited; limits were not silently raised.
- Remaining acceptance: the other public editorial trials, genuine ambiguity
  quality checks, signed-in two-user staging checks, reproduction of the old
  apparent-empty report, Safari and deployment/rollback. The exact historical
  final-section failure remains unknown. No live staging acceptance is claimed.
- Rollout uses additive optional JSON fields, not a new D1 migration. Publish
  tolerant readers, then the new runner image, then the V2 form. Old runner
  images reject V2 requests; keep the old image and disable new V2 submissions
  before rolling back. See the implementation plan and `docs/RESEARCH-RUNNER.md`.

## 2026-10-20 — Research diagnosis and consolidated implementation plan

- Owner requested diagnosis before further changes, then a complete plan.
  Read-only staging checks found a clarification-paused run with zero sections,
  a partial run with three completed sections and two failed final-section
  attempts, and a completed run with four substantial saved sections.
- Exact historical final-section failure was not retained: current code combines
  provider, budget and validation errors and discards subprocess output. A short
  live error tail contained no new events. The apparent missing completed report
  still needs authenticated browser reproduction; no runtime fix is claimed.
- Proposed plan:
  `docs/superpowers/plans/2026-10-20-research-reliability-and-india-focus.md`.
  Covers safe diagnostics, Guest/Company/Industry inputs, Indian audience context,
  six honest source-channel outcomes, source icons, model/billing separation,
  clarification/report layout, and removal of per-section regeneration.
- Owner clarified that India is context across the whole research process, not
  a separate section or the sole goal. The plan preserves comprehensive global
  guest/company/industry research and applies Indian relevance where useful.
- Planning documents only. No application code, credentials, shared data,
  deployment, commit or push changed. Await implementation instruction.

## 2026-10-19 — Social analytics deployed to staging

- Owner authorized staging deployment and Zernio secret upload, and separately
  approved migration `0024_social_analytics.sql`. Exact runtime candidate:
  `ce3844a819e59ae071d2f0266799a542722218a0` (PR #85 merge plus staging-only
  Web/Edge enable flags). No production deployment or source push in this task.
- D1 recovery bookmark before migration:
  `00000194-00000002-00005109-f65b3729a5fbba40e7055905b78255c7`.
  Applied only migration 0024 to `wtfmedia-ops-staging`; final inventory has no
  pending migrations. Retain these additive tables during a code rollback.
- Staging Edge `83f831ed-9ea8-47e4-8d18-211db91c5c45` and Web
  `c8e5c646-baef-4853-8d59-3ca5f468cd41` each read back at 100% traffic.
  Web Custom Domain is `beta-staging.wtfhq.in`, paired exclusively with staging
  Edge/self. Edge uses staging D1 and the existing Alpha web inference binding.
- Uploaded only `ZERNIO_API_KEY` through a temporary mode-0600 secrets file,
  removed after deployment. Readback confirms `secret_text`; OpenRouter,
  Google OAuth, Clerk and Research runner secrets remain present. No key value
  is retained in source or this receipt. Research runner was not redeployed.
- VERIFIED-SOURCE: exact candidate 516 backend, 331 web unit, 97 contract tests,
  typecheck, lint, architecture freshness and isolated OpenNext build passed.
  Both Workers passed dry-run packaging. Excluded tracked local-only config
  from the build copy; no web env files were copied. Compiled and live public
  Clerk identity both match the staging issuer. Direct installed Wrangler was
  used with an explicit verified account because the host-specific named-profile
  wrapper is unavailable; frontend autoconfig was disabled after its delegation
  misparsed the deployment message, then the built artifact deployed successfully.
- LIVE-VERIFIED: backend health reports staging and Alpha corpus authority;
  root redirects, sign-in/social/Research/YouTube pages respond 200, principal
  and social status/assistant/connect/selection reject signed-out requests (401).
  IAB reaches the real staging sign-in widget with a return to social analytics.
- Rollback: Edge `5c96378a-330f-41d4-8166-5debcee241b2`, Web
  `eb151d59-21d8-44c4-b77d-3a25a0d05bf8`. Rollback not exercised. Real signed-in
  admin/member, OAuth completion, chat metric accuracy and saved-chat acceptance
  remain open; automated role fixtures are not live-persona acceptance.

## 2026-10-19 — PR #85 profile discovery and admin-only social connections

- Owner authorized merging PR #85 (`c83ba7fa74657256251a6f85e003039764ec6b9e`)
  into `feature/pavun`, pushing the merge, and adding the supplied Zernio key to
  ignored local Cloudflare configuration. No shared configuration, migration or
  deployment is part of this task.
- Reconciled the PR's older local-lab branch with the current shared provider,
  authenticated chat, saved investigations, principal policy and production
  YouTube hiding. Sole/unique-default profile discovery requires only an API
  key; explicit selections/overrides retain precedence and stale selections fail
  closed. Ambiguous profiles require an admin choice in the authenticated UI.
- Members/editors can view metrics and chat. Only admins/super-admins may connect,
  reconnect or select a shared profile; router tests cover all four roles.
  Reader status omits profile IDs/lists. The standalone local lab's connection
  endpoint now denies mutations and links users to the signed-in workspace.
- VERIFIED-SOURCE: 516 backend, 331 web unit and 97 contract tests passed,
  including discovery edge cases, non-admin mutation denial, dashboard/chat
  access and the local-lab bypass regression. Typecheck/lint checked separately.
- LIVE-VERIFIED: read-only discovery using the locally configured key succeeded
  with one accessible profile and one Instagram account. No OAuth was initiated,
  no accounts/profiles were changed, and no metric-accuracy or real-browser
  acceptance is claimed. Migration 0024 remains required before activation.

## 2026-10-18 — Social analytics chat implemented locally

- Owner approved the social-chat plan for local implementation on `feature/pavun`.
  No push, deployment, provider credential change or shared migration was performed.
  Staging/production remain disabled by default; production YouTube hiding stays intact.
- Adds authenticated `/beta/api/social-analytics/*` routes, admin-only profile
  discovery/confirmation and OAuth handoffs, shared provider normalizers, bounded
  metric plans using the existing OpenRouter helper, period/platform/post comparisons,
  rankings, trends, explicit context and safe unavailable/partial responses.
- New private social investigations support save/reopen/permanent delete with
  replay-proof tombstones, account erasure and immediate UI feedback. The standalone
  local lab exposes no private chat or history. No Ask WTF/Research inference boundary changes.
- Migration `0024_social_analytics.sql` is source-only and was exercised in isolated
  SQLite tests. It must be applied through the approved environment-specific recovery
  and migration process before deploying this candidate. It adds profile selection,
  investigations and per-user rate-limit counters; no provider secrets are stored.
- VERIFIED-SOURCE: full backend 514/514, web unit 326/326, contracts 97/97, typecheck,
  lint and production build pass. Focused social tests cover the reviewed context,
  ranking, privacy, missing-data and deadline cases, plus authorized route/quota wiring.
  Chromium fixture interactions/overflow passed at 320/768/1440; these are not
  signed-in browser or provider acceptance. Safari/WebKit remains untested.
- Owner will add the Zernio key later. Live profile/account reconciliation, real OAuth,
  actual metric accuracy and two-user signed-in acceptance remain open. Configuration
  names, local commands and supported metric limits: `docs/SOCIAL-ANALYTICS-LOCAL.md`.

## 2026-10-17 — PR #84 integrated into feature/pavun

- Owner authorized review, merge, commit and push of PR #84 (`b645c0a36845e925da0bd375460359676f4fa903`). This integration retains Research, the accepted principal shell, and production-only YouTube Analytics hiding. No deployment, shared migration, provider credential change or PR #48/#77 mutation.
- Adds a local Zernio social dashboard for LinkedIn, Instagram, Facebook and X, with status, hosted authorization handoff, date/platform filters, daily impressions and top posts. Configuration is server-only `web/.env.local`; one shared configured profile, no per-user social store, no AI or YouTube reach work.
- Resolved five navigation/test merge conflicts and supplied the missing `analytics:read` policy entry. Strengthened the local-only production-build guard, date-range validation and connection origin/content-type checks. Missing metrics remain null/unavailable, reported zero stays zero, the chart no longer changes metric per day, and unknown connection health is not shown as healthy.
- VERIFIED-SOURCE: regression failures reproduced before fixes; 289 web unit, 97 contract and 479 backend tests pass. Web typecheck, lint, Next production build, privacy (0/428), architecture regeneration and diff checks pass. The sandbox backend run stalled; the same suite passed outside the sandbox.
- Explanation/setup/limitations: `docs/SOCIAL-ANALYTICS-LOCAL.md`. Live Zernio OAuth/analytics, signed-in UI and cross-browser behavior were not tested in this integration. Provider results in the original author handoff below remain REPORTED.

## 2026-10-16 — YouTube Analytics hidden in production

- Owner-authorized frontend-only deployment: isolated production candidate `616462767832c878d87db10725ddef2f738d937f`, based on prior production source `89c122c5559a4a1bcd4798d1b13065b2df58aa9c`. Equivalent owner-branch fix is local commit `c4b2e676d1e1e28cb9771d09ee2c0f2b1337ba5e`; no push.
- Production `wtfmedia-web-beta` / `wtfhq.in` now serves version `e0a702a0-a19b-4445-9473-335c8fa539af` at 100% traffic. Rollback Web version: `d94eb63c-ed24-4857-9273-ec77c725e953`. Existing production Edge binding remains `wtfmedia-edge`.
- Analytics navigation is hidden for production principals; direct Analytics and legacy settings entry URLs redirect to `/beta/chat`. Staging Analytics remains available. Research was not promoted; backend APIs, saved analytics data, credentials and databases were not changed.
- VERIFIED-SOURCE: 255 unit and 97 contract tests passed; lint, typecheck/OpenNext build, privacy (0/415), architecture and diff checks passed. Built assets use the production Clerk issuer.
- LIVE-VERIFIED: Analytics and legacy entry return 307 to chat, root 307 to `/beta`, sign-in/chat 200, unauthenticated principal API 401; staging Analytics 200. Signed-in visual/browser acceptance and rollback rehearsal were not performed.

## 2026-10-15 — Research deployed to staging

- Owner-authorized runtime candidate: `f29758828cdd57995b4f1f8d3e0f693190aee028` on `feature/pavun`, committed locally; no push and no production deployment.
- `https://beta-staging.wtfhq.in`: Web `eb151d59-21d8-44c4-b77d-3a25a0d05bf8` binds only to Edge `wtfmedia-edge-staging`, version `5c96378a-330f-41d4-8166-5debcee241b2`. Edge retains staging D1 and Alpha chat authority.
- New private runner `wtfmedia-research-staging`: Worker `b7cf82e5-4301-494f-99c9-9720d6e10725`; container application `a03ccd7b-0688-4dbe-8b50-98eb080230c2`; image digest `sha256:fc404877fe5b93debbe426e09ed99f7b3f4331292b614f1d53d32365c4874549`. Distinct runner/state credentials and the existing Treg/OmniRoute provider settings were uploaded as secrets. Secrets are retained only in ignored local configuration and Cloudflare.
- LIVE-VERIFIED: runner health configured=true; unauthenticated runner/state 401; runner token denied state access; synthetic durable checkpoint/read/delete/replay checks passed. A public-subject single-section research job completed with 44 retained sources and citations resolving to source IDs. Follow-up returned HTTP 200 with a nonempty answer. Tool receipt total was 34,000 micro-units; model cost remains unknown, not zero. Disposable test job was deleted after checks.
- Live custom-domain root redirects to `/beta`; research page responds 200; unauthenticated research/principal APIs return 401. Canonical `/sign-in` responds 200 with the verified staging Clerk issuer. Edge health reports staging, Alpha inference service and Alpha public corpus authority. No pending staging D1 migrations were found; no shared D1 migration was applied in this deployment.
- Rollback references recorded before deployment: Edge `eebb50b8-4433-4189-b77a-6c435fd44bc8`, Web `99a603ec-e557-44db-8591-6b251cf5b18f`. No rollback rehearsal or forced container-restart test performed. Durable storage must not be deleted for a code rollback.
- Remaining acceptance: real signed-in two-user/RBAC and responsive UI matrix. No connected browser was available, so API/source checks are not described as browser acceptance. Existing laptop-run jobs were not migrated into the hosted queue; saved D1 briefs remain intact.

## 2026-10-15 — Staging research runner preparation

- Owner approved staging deployment including Cloudflare-hosted Python research. Added a staging-only Container plus SQLite Durable Object for job checkpoints, lease fencing, budgets, receipts and deletion tombstones; private method RPC uses a separate token. Existing local SQLite mode remains supported.
- Provider credentials are injected as Worker secrets, never browser variables or image layers. Staging runner/state tokens are distinct from local credentials. No production resources changed.
- VERIFIED-SOURCE: 479 backend, 282 web unit, 97 web contract, 52 Python and 4 durable-store tests passed; web lint/typecheck, runner-host typecheck, privacy scan (0/419) and isolated staging OpenNext build passed. Built image imports GPT Researcher 0.16.1 successfully without network.
- Staging D1 readback reports no pending migrations. Browser assets verified against the staging Clerk issuer. Runtime deployment and signed-in persona acceptance are not yet claimed.

## 2026-10-15 — Saved report episode bias and blanket labels

- Inspected the owner-requested saved report: completed under the old appearance-discovery workflow. The long-lived runner had not reloaded the updated Python workflow. All jobs were complete before restarting it.
- Validator no longer prefixes every paragraph/heading with “Unverified synthesis”. Unknown citations and specific numeric/conflict warnings remain; legacy UI replaces only the blanket prefix with one editorial-review notice.
- Full Research again submissions now start with fresh sources and sections, avoiding saturation by the old 80-source list. Single-section regeneration retains context. Saved history is not overwritten by this source change.
- VERIFIED-SOURCE: 48 Python tests, backend research tests, 25 frontend research tests, typecheck and focused lint pass. New live generation has not been run.

## 2026-10-15 — Research loading recovery

- Local logs showed brief reads taking 51–112 seconds and returning 503 while Wrangler reported lost network connections. Frontend and private runner remained reachable. Restarted the local backend with the existing staging binding/configuration; no data or credentials changed.
- Added a 30-second read deadline covering session acquisition, fetch and response parsing. Stalled reads now show the existing retry UI instead of indefinite loading; writes retain existing behavior to avoid ambiguous automatic replays.
- VERIFIED-SOURCE: 26 focused frontend tests, typecheck, lint and diff check passed. Authenticated browser reload still needs verification.

## 2026-10-15 — Pre-shoot research scope and simplified inputs

- Local source only: removed YouTube ID and file upload controls from new and saved briefs; retained optional consented notes and legacy DTO compatibility.
- New runner submissions exclude legacy Alpha references and no longer call Alpha episode retrieval. Treg discovery preserves the full guest/company/competitor request; four sections now cover background, company/industry, competitors and interview preparation.
- Shared report renderer uses numbered source links, horizontally scrollable evidence tables, and collapsed numeric-audit details. Existing stored reports are unchanged; new research is needed to regenerate content.
- VERIFIED-SOURCE: 47 Python tests, 25 frontend research tests, backend research test entry, web typecheck and focused lint pass. Architecture ledger refreshed. No deployment or new live provider run performed for this change.

# Project handoff

## 2026-10-26 Dubbing status and new-entry cross-check

**Status:** LOCAL-ONLY. No GitHub push, remote Cloudflare write, migration,
or deployment in this pass.

- Rechecked the Dubbing Tracker screenshots and private workbook against the
  local database: 57 imported dubbing jobs, 18 actual column-C go-live dates,
  39 without a go-live date. Source column G has 29 checked, 25 unchecked, and
  3 rows without a box among those jobs. Eleven checked jobs have no column-C
  date and remain **not published** per the client's clarification.
- Workbook row 30 is still a deliberate exception, not silently counted in
  those 57 jobs: its apparent name is in column C rather than the episode/
  guest columns, with a contact and follow-up note in later cells. Its raw
  cells remain in the private source archive and the import-review queue;
  confirm its episode/guest identity before making it operational.
- The Dubbing list now shows the source Posted? checkbox state on every imported
  episode, separately from actual publication. It also surfaces a note cue;
  episode details show workbook H follow-up notes to authenticated editors,
  while source contact column E remains manager-only.
- Each episode has an editable dubbing work status and separate team note.
  The detail panel has a direct confirmed go-live date field, which creates
  the blue-mic calendar event. Permission statuses and notes stay per guest.
- Add episode from the Dubbing view preselects dubbing tracking. The API
  atomically creates the episode and dubbing job so it appears in Dubbing
  immediately, without a second save. Isolated API tests cover creation,
  note persistence, and transition from not published to published; the
  browser confirms the preselected form and imported note/status display.
  No fake test entry was added to the user's local database.
- Web typecheck, lint, 165 web unit tests, and 11 focused production API
  tests pass. This is not client-facing approval; prior staging/auth/source
  review blockers still apply.

## 2026-10-25 Shareable production-calendar branch pickup

The GitHub feature branch `codex/release-beta-calendar-local` contains the
calendar/board/dubbing UI, importer and loader, local API, tests, migrations
`0016`–`0019`, and documentation. A new collaborator must explicitly clone
this branch; `main` does not contain this calendar work. See the pickup steps
in `scripts/production-calendar/README.md`.

The repository is public. The client's source XLSX, guest contacts/notes,
generated snapshot, local SQLite, and browser screenshots remain private and
ignored. Therefore a clone without a separately and securely supplied workbook
will have the code but not Nikhai's populated local calendar. Do not describe
the branch as a complete data transfer or a client-facing release. Staging D1,
auth, and unresolved source-review flags remain outstanding. No merge or
deployment was authorized by the request to share the code branch.

## 2026-10-25 Calendar source branch handoff

Nikhai authorized pushing this local production-calendar work to GitHub. The
reviewed source, migrations, tests, and documentation are intended for the
`codex/release-beta-calendar-local` feature branch only. The private workbook,
import snapshot, local SQLite database, and UI screenshots are not part of the
commit. Branch push is not a merge, Cloudflare migration, deployment, or
client-facing acceptance. The outstanding review and test limits in the next
checkpoint still apply.

## 2026-10-25 Add Episode and calendar navigation check

**Status:** LOCAL-ONLY UI CHANGE. No GitHub push, remote Cloudflare write,
migration, or deployment.

- Add episode now opens a dedicated form in the visible main content area
  rather than a details panel below the calendar at laptop widths. It starts
  with no IP selected, requires an explicit IP and title, and returns to the
  board after a confirmed API save. Cancel returns to the previous view without
  creating a record.
- The redundant Month/Week switch and Week mode were removed. Calendar is a
  month view with previous/next and direct month selection.
- Browser interaction confirmed the form appears immediately, requires a
  chosen IP, enables Create episode only after required fields, and cancels
  without saving. The isolated edge API test covers record creation; no test
  item was added to the user's local workbook database.
- The source snapshot and local SQLite reconcile at 79 items (9 Production
  Tracker, 13 IP-sheet, 57 Dubbing Tracker), 39 calendar action marks (7
  shoots, 7 main posts, 7 IP posts, 18 dubbed go-lives), and 46 separately
  retained original-video dates. The local DB integrity check is `ok`.
  Eleven review flags remain within the four in-scope sheets; seven older
  pipeline-sheet flags remain in the private archive but are excluded from
  the production API's review count and UI.
- Web typecheck, lint, all 165 web unit tests, focused production edge tests,
  and the supplied-workbook import integration test passed. The full edge
  suite does not pass in this checkout: the edge `jose` dependency is absent,
  and older test fixtures use URL-encoded file paths that fail on this
  space-containing checkout under the current Node runtime. These failures
  are outside this calendar change and must be resolved before release CI.
- This remains a local preview, not client-facing sign-off. Remote D1
  migration/auth, workbook-owner review of unresolved source ambiguities,
  and staging acceptance remain outstanding.

## 2026-10-25 Local calendar scope and usability pass

**Status:** LOCAL-ONLY UI AND IMPORT-SCOPE CHANGE. No GitHub push,
Cloudflare write, remote migration, or deployment.

- The production area now has three working views: Calendar (month),
  Board, and Dubbing. The literal Production Tracker grid and dated-mark list
  are no longer primary navigation. The manager-only Workbook reference and
  episode details retain source evidence and exact H/I/J checkbox states.
- The main board includes the 9 named Production Tracker episodes plus 13
  named BTS, Stitched, and Ways Of The World IP-sheet rows. Dubbing Tracker
  source records stay in the Dubbing view and their 18 actual blue-mic go-live
  dates remain on the calendar. Blank numbered POV/Animated slots are not
  episodes. Board lanes use explicit production stages and actual release
  dates; unknown source stages remain unknown in item details.
- Pod Pipeline 2026–27 and Pipeline are deferred to a separate future page.
  Their original cells remain in the private local database, but the working
  source reference and import-review summary expose only Production Tracker,
  Calendar, Dubbing Tracker, and WTF & Nikhil Kamath IPs. Future imports no
  longer create production-calendar review issues from the two deferred sheets.
- The local API was refreshed on `127.0.0.1:8788`; the local page at
  `http://127.0.0.1:3001/ops/production` visually shows the three views,
  22 board items, 18 dubbed releases, 39 unpublished dubbing jobs, and four
  in-scope source sheets. Web typecheck/lint, focused web unit, edge API, and
  workbook integration tests pass. This is not a client-facing acceptance or
  a verified remote Cloudflare mapping.

## 2026-10-25 Production Tracker local fidelity follow-up

**Status:** LOCAL-ONLY. No GitHub push, Cloudflare write, remote migration, or deployment.

- The workbook owner confirmed `Payments EP` belongs to `WTF Is`. The local
  production item now uses that IP; its Post Production stage and 21 August
  shoot mark remain unchanged.
- Unnamed Production Tracker rows 17–19 are excluded from operational records,
  review flags, and the working source-row view. Their imported raw cells remain
  in the private database archive so the original workbook is not altered.
- Episode shoot location and per-source-row guest role are structured, editable
  fields. Names, roles, H/I/J checkbox states, and agreement notes retain their
  original row positions; the pharma row's checked box and adjacent no-contract
  note are displayed separately without an inferred legal/permission outcome.
- A dedicated `Production tracker` tab reproduces columns A–J in workbook
  order, merged episode/guest/status groupings, the source pink/green/yellow
  fills, H/I/J boxes, and agreement text. It is horizontally scrollable on
  narrow screens and opens each episode's editable details.
- The Dubbing view now displays Production Tracker H/I/J checkbox counts for
  those podcast items rather than calling every source guest permission
  “pending.” The original Dubbing Tracker permission workflow remains separate.
- The local snapshot was regenerated from the supplied workbook, migration
  `0019` applied to the local SQLite database after a backup, and reconciliation
  resolved 10 stale Production Tracker review flags. Source import, API and
  web checks pass; SQLite integrity is `ok`. The local API is running on
  `127.0.0.1:8788` for the dashboard at `127.0.0.1:3001`.

## 2026-10-25 Dubbing Tracker full-page local cross-check

**Status:** LOCAL-ONLY REVIEW, not a client-facing release. No GitHub push,
Cloudflare write, remote migration, or deployment occurred.

- Compared the complete Dubbing Tracker screenshot set with the source XLSX
  through row 117, including merged panels. The local import contains 57
  dubbing jobs, 109 guest-permission rows, 18 dated dubbed go-lives and 39
  without a go-live date. Eleven undated jobs have a tick in source column G;
  they correctly remain *not published* under the client's clarification.
- The dashboard now separates column B original-video history from column C
  blue-mic publication marks. Original-video dates no longer inflate month,
  week, list, board, day-sheet, or headline action-mark counts. All 46 B dates
  remain preserved and visible in item details.
- Clear "WTF is …" dubbing titles now map to WTF Is. Source solo/panel order,
  raw posted-checkbox state, per-guest permission, manager-only contact and
  follow-up notes, and workbook row references are visible in the Dubbing view
  or item details. Source notes remain visible even for row 63, where no guest
  is linked. Contact-shaped guest fields are flagged and masked for editors.
- Open source exceptions remain: shifted row 30 ("Brain Armstrong" appears in
  column C), and guest-name cells containing contact text at rows 61–62.
  These are preserved in the raw source; no person or episode is invented.
- Regenerated the private source snapshot, backed up local SQLite before
  reconciliation, resolved 14 stale import-review flags, and verified local
  integrity plus focused import/API/web tests. The local browser shows 39
  calendar action marks, 57 workbook dubbing jobs, 18 live and 39 unpublished.

## 2026-10-24 Local production-calendar workbook fidelity checkpoint

**Status:** LOCAL-ONLY WORK IN PROGRESS on `codex/release-beta-calendar-local`.
No GitHub push, PR, remote D1 migration, or Cloudflare deployment occurred.

- The six-sheet workbook remains preserved cell-for-cell in the private local
  import/database. Its Calendar action marks are now consistent across month,
  week, list, board, and detail views: blue 🎙️ dubbed episode live, green 📤
  episode live, yellow 🎥 main episode shot. IP color is a separate legend.
- The ⭕️ Not Live BTS entry remains undated. Source tracker ☑/☐ boxes are
  operational checklist rows, with original source cells unchanged. Unchecked
  means not ticked in the workbook, not a confirmed negative outcome.
- Merged podcast statuses apply across rows 2–13 and 14–19. Clear title-based
  IP matches are assigned; past typed shoot/post/dub-go-live dates are actuals.
  Five unnamed POV/Animated planning slots are retained only in source cells.
- Editable targets display named-item progress from the IP sheet: BTS 12,
  Stitched 20+, POV 15, and Animated IP 20.
- Local SQLite was backed up before reconciliation and before adding target
  columns. `PRAGMA integrity_check` returned `ok`. Focused import, local API,
  web typecheck, lint, and calendar unit tests pass. The local dashboard is
  available at `http://127.0.0.1:3001/ops/production` while its servers run.

**Client clarification (2026-10-25):** Dubbing Tracker column C is the dubbed
episode publication receipt. All 39 imported dubbing jobs without a column-C
date are **not published**, including 11 with `Posted? = Yes` in column G.
Publication is derived from an actual dated event in the API and displayed
separately from dubbing work status. The original column-G tick is preserved.
Workbook integration (18 dated, 39 undated, 11 ticked-but-undated), edge API
tests, web typecheck/lint/unit tests, local SQLite integrity, and the live
local Dubbing view were checked after the clarification. No new schema or
remote write was needed.

**Deferred client question:** The transcript explains green
prospect-pipeline fill but does not fully define remaining pink/yellow fills.
Ask Nikhai after the other local changes are complete. Full staging/persona
acceptance and remote database migration remain unapproved.
## Pavun branch historical handoff (preserved during integration)

## 2026-10-15 Research history semantics and scroll header

- Owner reported two versions before report generation. Existing draft creation and queued-run saves each increment the optimistic-lock revision. Preserved internal revisions/history for concurrency and recovery, but history listings now include only completed/partial snapshots with nonempty findings. Removed internal revision counters from the sidebar/header; visible saved entries use their timestamps. Mutation receipts add history entries under the same conditions.
- Research-only AppRail now has an opaque canvas background, bottom border/padding and corresponding shell top clearance; other routes retain their existing header presentation.
- Focused backend Research tests and 24 frontend Research tests pass; typecheck passes. Added regression for zero history entries during initial generation and one stable entry after findings save. No migrations, deployment, push or browser visual acceptance.

## 2026-10-15 Research optional-input layout

- Owner requested tidier YouTube ID and upload fields. Made the ID a fixed-height compact field in a top-aligned narrow column; grouped notes, styled native file upload, file limits and consent in the wider column, stacking on mobile. Existing import validation, replace confirmation and consent behavior remain. Local-only styling update; no deployment or browser visual acceptance.

## 2026-10-15 Research availability and workspace layout fix

- Owner saw Research unavailable despite a healthy runner. Reproduced exact root cause in installed workerd: fetch rejects redirect:error before network access. Changed the shared Research adapter to redirect:manual; non-2xx (including redirects) still fail closed. Actual local backend adapter health now returns configured:true. Temporary diagnostic code was removed; no new public diagnostic or auth bypass remains.
- Reorganized Research into a full-width new-brief form, separate saved-brief sidebar, and results area with section descriptions. Preserved existing design tokens, note consent and permissions. Added explicit Retry connection and 30-second unavailable-state recovery checks with timer cleanup.
- Both backend Research test files and 24 frontend Research tests pass, including redirect rejection, outage retry and timer cleanup. Local browser visual and signed-in full creation flow remain unverified; no Playwright, push or deployment.

## 2026-10-15 Local Clerk redirect correction

- Local frontend had production Clerk keys in ignored .env.local while the backend used staging identity. Production handshake rejected the localhost redirect. Reused the existing staging key pair from ignored web provider vars in the local frontend and restarted Next; no Clerk dashboard, deployed credentials or production changes. Signed-in browser retry remains for the owner.

## 2026-10-15 Local Research services and staging persistence

- Owner requested all local services and previously authorized applying Research persistence to staging. Applied sole pending migration 0023_research.sql to existing wtfmedia-ops-staging; readback reports no pending migrations. Recovery bookmark: 0000017d-00000000-00005105-616e5c084924caaba6c11edd2cc8cf79. No new application database, deployed code or production mutation.
- Runner uses ignored local provider vars and loopback port 8080; private token generated locally. Next starts on localhost:3000 with WTFMEDIA_EDGE_LOCAL_ORIGIN=http://localhost:8787. Backend uses --env local and both --env-file .dev.vars and --env-file .dev.vars.local, retaining staging D1/admission settings while loading the private runner credentials. No private credentials were added to the tracked local settings file.
- Installed workerd supports only compatibility date 2026-06-02, so local startup uses that CLI override and --persist-to .wrangler/research-local-state to avoid incompatible old runtime cache. Deployed compatibility settings and old cache are unchanged. This runtime mismatch limits local/deployed parity.
- Fixed Research localhost allowance to also recognize DEPLOYMENT_ENVIRONMENT=local, while preserving OPS_ENVIRONMENT=staging for admission. Loopback-only HTTP restriction remains; deployed staging HTTP and local non-loopback HTTP are rejected. Both focused backend Research test files pass. Signed-in browser flow remains for owner testing.

## 2026-10-15 Research OmniRoute integration — local only

- Owner supplied OmniRoute base URL/key in ignored local provider vars and authorized using it for Research. Read-only authenticated catalog returned 5,324 advertised IDs/aliases, including the noesis-research combo. A short request succeeded in 5.6 seconds and reported claude-sonnet-5-5. Catalog presence does not prove every advertised model works; combo routing can change remotely.
- Research loader accepts only its five provider/auth settings. Paired OmniRoute settings select noesis-research for all Research generation; incomplete/unsafe configuration fails closed, with no request-time OpenRouter fallback. With neither setting supplied, prior direct OpenRouter behavior remains. Treg search/extraction and Ask WTF/analytics are unchanged. No host router configuration, credentials, shared persistence, deployment, commit or push was changed.
- OmniRoute owns upstream routing/privacy/pricing; OpenRouter-specific options are not sent. Token-only receipts leave modelUsd null and preserve conservative local reservations, which are not a gateway billing cap. Key redaction includes OmniRoute.
- Initial real section attempts failed with generic provider-unavailable errors; the precise upstream cause was not captured. A separate long-answer probe succeeded in 33 seconds. Non-streaming OmniRoute model calls now permit the existing 600-second generation/read window instead of the generic 45-second idle read. Connect timeout remains 45 seconds; Treg/direct OpenRouter keep their previous idle behavior.
- Reports use OmniRoute streaming transport, assembled server-side into the existing response contract. Incomplete/error/malformed streams fail closed and token-limit finishes still reject truncated answers. A second non-streaming section trial also failed after the longer read allowance; no exact upstream cause is claimed.
- VERIFIED-SOURCE: 46 runner tests pass, including real pinned GPTR compatibility with fake external adapters, gateway selection, secret loading/redaction, invalid paired settings, unknown costs, stream completeness and gateway timeout. Live streaming section completed in 141 seconds with 47 retained sources, including real Treg search/extraction, report generation and numeric-review stage. Recorded tool charges were 34,000 micro-USD; modelUsd remains unknown. Earlier non-streaming failures are separate attempts, not included in that successful-run charge. Architecture check passes with 723 inputs; diff check passes. No full-four-section, follow-up, browser or production acceptance claim.

## 2026-10-15 DeepSeek V4 research trial — not accepted for deployment

- Owner requested trying DeepSeek V4 after GLM upstream rate limits. Local research model is now the pinned OpenRouter `deepseek/deepseek-v4-flash-0731`; Ask WTF/analytics models are unchanged. GPTR model environment reuses the adapter MODEL constant. No deployment, push, credential change, shared migration, or provider-routing change occurred.
- The 6,000-token DeepSeek report exhausted its output budget. Read-only OpenRouter receipt: serving provider OpenInference, finish_reason length, 5,644 completion tokens and 619 native reasoning tokens, roughly 263 seconds generation. Following the owner's standing instruction to increase token limits, report writing now receives 12,000 tokens; planning/follow-up retain their existing smaller limits, and price/privacy/budget controls remain. The writer retains its 1,500-word target with a character target matching existing storage bounds. Truncated responses are still rejected.
- Forty-one runner tests pass, including upstream GPTR conduct/write receiving 12,000 tokens, input bounds, truncation accounting and timeout behavior. Local API health/auth/cancel/delete/replay checks pass. Treg search/extraction and DeepSeek subject resolution/planning work.
- Diagnostic script initially had a stale 300-second timeout, so its abort was NOT used as application acceptance evidence. Retested through the real local Python service with the actual 600-second provider deadline: the report did not complete and entered its second attempt after that window. Stopped that trial to avoid repeated long paid requests. No successful full DeepSeek section or follow-up is claimed. The earlier GLM section success is separate evidence.
- Remaining: investigate serving-provider routing/latency before accepting this local trial model. OpenRouter still selected OpenInference for DeepSeek, the same shared pool that rejected GLM. Model choice alone did not demonstrate a latency/reliability fix. Do not deploy this moving local branch based on the offline test pass.

## 2026-10-15 Research retest and owner-requested larger output budget

- Owner resumed local testing and explicitly requested increasing the token limit rather than shortening reports. Report generation now receives 6,000 tokens through both GPT Researcher configuration/environment and the OpenRouter adapter; the original 1,500-word section target is retained. Low reasoning effort matches Ask WTF. Provider response processing has a 600-second deadline plus a 45-second idle timeout. Truncated model output is rejected after recording its cost instead of being accepted as a complete answer.
- VERIFIED-SOURCE: 41 runner tests pass, including actual GPT Researcher conduct/write with an assertion that the report writer receives 6,000 tokens, truncation rejection/accounting, and keep-alive deadline handling. Both backend research test files and 22 frontend research tests pass. Live isolated runner checks pass for configured health, unauthorized access, cancel-before-submit, deletion and replay rejection.
- Live evidence: Treg search/extraction succeeds. A 3,000-token report returned finish_reason length; after the increase a report returned finish_reason stop, about 9,800 characters, in 191 seconds. The isolated Snacks workflow then completed its numeric-evidence check and saved a completed section with 47 retained sources. This verifies one complete section, not full four-section/follow-up/editorial/browser acceptance.
- Exact remaining provider failure is HTTP 429 from OpenRouter upstream_provider_shared_pool, provider OpenInference, for z-ai/glm-5.3-flash. The credential is valid; retry can succeed. No provider fallback or credential change was made. Full brief and follow-up reliability remain unaccepted; do not claim staging readiness.
- Changes remain local on feature/pavun; no push, deployment, shared migration, or persistent runner configuration. Local integration uses temporary private SQLite state and a temporary runner token. Production and staging are unchanged.

## 2026-10-15 Research live testing — stopped at owner request

- Owner added TREG_TOKEN and requested testing, then chose local testing only and asked to stop/check later. No staging/production deployment, shared migration, role changes or push. Provider keys were read only into test processes; values were not copied into source or logs.
- Installed the existing hash-locked Python 3.13 research dependencies into the ignored local virtual environment. Live Treg search and extraction worked; a short OpenRouter request using the configured GLM model succeeded. Full report generation did not complete reliably: observed temporary HTTP 429 and a report request exceeding two minutes. No full-brief or authenticated browser acceptance is claimed.
- Local uncommitted changes: research requests use the existing Ask WTF low reasoning effort, and response-chunk processing enforces a 300-second deadline with the separate 45-second idle-read timeout. Added regression coverage and updated runner documentation. Forty runner tests (including actual GPTR compatibility), 23 backend research tests and 22 frontend research tests pass. These do not establish live quality or uptime.
- Resume by checking redacted provider rejection metadata and completing a full four-section brief plus follow-up using isolated local state. Staging still needs a private Python runner host and explicitly approved migration/configuration. Existing local Worker config uses remote staging D1; do not assume local frontend means isolated persistence. Current test runner token was temporary, not configured for app use. Do not deploy the unaccepted changes without further owner direction.

## 2026-10-15 Production analytics connection visibility fix

- Owner reported an admin account with Connect Google visible on mobile but absent on desktop, and authorized production redeployment. No coworker identity/session was inspected. Fixed stale UI permission hints: analytics status now returns the current server-derived management permission, and the bridge refreshes controls from it. Backend admin/super-admin enforcement remains unchanged; readers see an accurate admin-required message. Connection controls wrap with 44px minimum targets and narrow-screen card layout remains vertical.
- Exact isolated production candidate `89c122c5559a4a1bcd4798d1b13065b2df58aa9c` excludes Research. VERIFIED-SOURCE: 453 backend, 255 frontend unit, 97 contract tests; lint, privacy 0/415, architecture 684-input check, Worker dry-run and OpenNext build pass. Focused tests cover stale permission hints in both directions. Direct Chrome layout checks of the actual card/styles pass at 320, 375, 540, 768, 1024, 1440 and 1920px with visible contained controls and no horizontal overflow; this is not authenticated acceptance.
- Production Edge `bad9782e-6844-400a-bdfb-1992ffadface` and Web `d94eb63c-ed24-4857-9273-ec77c725e953` read back at 100% traffic. Web serves wtfhq.in and binds production Edge/self. Rollback versions: Edge `01bafaf1-9143-46de-974d-9e048c81ea6e`, Web `7234eb06-b50f-429c-8792-d3e170bc916a`.
- Live smoke: backend healthy/production, root 307, sign-in/chat/analytics 200, unsigned analytics status and same-origin OAuth-start POST 401, updated bridge/CSS assets 200 with permission-refresh code present. OAuth POST without Origin is rejected as 404. Coworker signed-in desktop/mobile and Google consent remain unverified. No database, role, credential, staging or internal Alpha Web changes; no push.

## 2026-10-15 Production analytics promotion — deployed with verified smoke checks

- Owner requested the current staging analytics in production before Research testing and separately approved production migrations/OAuth configuration. Reconciled newer October 12 reach fixes from PR #83 head `c510014` with the October 9 baseline. Isolated exact candidate `5518cd1536d0c93ba52dd6f0fba01dfc0e28dd43` excludes Research and enables production analytics navigation. Candidate is a detached local commit; no new delivery branch or push.
- VERIFIED-SOURCE: 449 backend, 250 frontend unit, 97 contract tests, lint, privacy 0/415, architecture, Worker dry-run and OpenNext build pass. Verified compiled production Clerk public identity. No browser acceptance claimed.
- Production migrations 0016–0022 applied and rechecked with no pending candidate migrations. Research 0023 excluded. Pre-migration recovery bookmark: `000001f6-00000000-00005104-1d71bb38360949bc65695ddb529f723b`. No user/history copying from staging. Production Google OAuth settings and fresh encryption key configured via protected stdin; callback is `https://wtfhq.in/beta/api/analytics/oauth/callback`. Google allowlist/consent remains unverified.
- Production Edge `01bafaf1-9143-46de-974d-9e048c81ea6e` is at 100% traffic; health reports ok/production. Previous Edge `d3bd05e0-539e-4519-bee9-20326ac14077`. Existing corpus/ingest bindings preserved.
- First Web candidate `7bdcc10a-c89f-4493-a313-fd1e5f214fcf` returned 500; immediately restored Web `28870a53-9cc0-49f6-8bea-2ea21b3e45b8` at 100%, and live sign-in returned 200. Diagnosis: production Web has no CLERK_SECRET_KEY binding. Existing local production key was independently verified against production public JWKS; the candidate returns 200 locally with that key supplied. Local runtime used compatibility date 2026-08-27 because installed workerd does not support deployed date 2026-08-29; deployed configuration is unchanged.
- Owner explicitly approved adding the existing verified production Clerk key as server-only CLERK_SECRET_KEY on wtfmedia-web-beta. A separate secret upload was rejected by Cloudflare after rollback (10215), so the same candidate artifact and secret were deployed together. Final Web version `7234eb06-b50f-429c-8792-d3e170bc916a` serves wtfhq.in; readback verifies secret_text type and only production Edge/self service bindings. No Clerk key rotation or identity change.
- Live smoke: root 307; sign-in, /beta/analytics, /beta/chat and assistant asset 200; unsigned principal, analytics status, saved investigations, assistant POST and OAuth-start POST 401. Live Clerk public identity matches clerk.wtfhq.in. Backend health remains ok/production. Authenticated YouTube consent/sync/chat and Google callback allowlist remain unverified; production needs its own admin channel connection. Staging and internal Alpha Web were not deployed. No branch push.

## 2026-10-15 Production promotion preparation — blocked on Cloudflare access

- Owner requested promoting the current staging version to production with YouTube Analytics, before testing Research. Use the live-verified staging source plus the analytics visibility change, excluding Research; the last recorded staging candidate is `ded0b4c8285996092bf4d3b410e8a52a5b268a89`, not a fresh live receipt.
- Locally removed the production-only analytics visibility restriction in navigation/page and updated unit/browser expectations. Four focused navigation tests and web typecheck pass. Browser tests were not run.
- Current Wrangler OAuth login has access to two accounts; read-only deployment lookups for `wtfmedia-edge-staging` return Worker-not-found (10007) in both. The required named-profile host Wrangler is unavailable. Correct WTF Media Cloudflare authentication is needed before live revision, production migration/provider/rollback checks and promotion.
- No deployment, database mutation, credential change, commit or push occurred. Production remains unchanged. Research is committed separately at `c236792` and must not enter this promotion.

## 2026-10-13 Research workspace — local implementation

- Owner approved the research plan and Research navigation entry, then explicitly deferred the Treg token and live testing. Work stays on `feature/pavun`; no push, deployment, shared migration, credentials or hosting changes.
- Added `/beta/research` in the existing authenticated shell for all admitted roles. Includes four-tier briefs, notes/import with model consent, episode references, saved versions/edit/restore, section regeneration, clarification, progress/cancel/retry, explicit workspace-wide read-only sharing, Markdown export and evidence-based follow-up. Notes and chat stay private when sharing; the UI warns that sections can contain notes-derived content.
- Edge uses owner-scoped D1 records and a private runner contract. Migration `0023_research.sql` is prepared only. Optimistic writes, three-active-job admission, bounded payloads, cached reads during runner outages, preserved cancellation results, idempotent job submission and retryable account erasure are covered by local tests. Account deletion also clears research versions and queues remote-copy erasure before confirming completion.
- `research/` reuses hash-locked GPT Researcher 0.16.1 through Treg Perplexity search/Exa extraction and the existing OpenRouter model choice. SQLite provides durable job leases, restart recovery, cancellation/deletion tombstones and budget reservations. Alpha remains the transcript authority: its public references are discovery links, never invented transcript excerpts. Private notes do not enter search queries.
- VERIFIED-SOURCE: 473 backend tests, 272 frontend unit tests, 97 contracts, typecheck and lint pass. Python 3.13.14 runs 39 offline tests, including actual GPT Researcher conduct/write over four tiers with 80 sources and fake provider adapters. A separate Python-result-to-Edge-validator smoke passes. Worker dry-run bundle and bounded privacy scan pass. An offline research CI workflow was added and its YAML parsed locally; it has not run on GitHub. No browser, live-provider or Docker runtime acceptance is implied.
- Next activation requires the private runner, `RESEARCH_RUNNER_URL`/`RESEARCH_RUNNER_TOKEN` in Edge, Treg/OpenRouter credentials in the runner, and an explicitly approved target-database migration/deployment. Follow `docs/RESEARCH-RUNNER.md`. Do not assume localhost means an isolated database: existing local development can use staging D1.
- Remaining live acceptance: three guest briefs, real provider/model availability and billing, useful citation/extraction coverage, editorial numeric verification and optional managed-provider comparison. Missing transcripts/timestamps remain explicit; no ASR or exhaustive podcast catalogue coverage is claimed. Changes remain local and uncommitted.

## 2026-10-09 PR #83 merged and deployed to staging

- Owner-authorized local merge of PR #83 head `9072c57ef5217c57f41a79cadc7b4f7e85f41b98` into feature/pavun produced candidate `ded0b4c8285996092bf4d3b410e8a52a5b268a89`. Includes stale resource recovery plus Reporting type discovery, failed reach setup receipts, percentage CTR normalization and reach coverage status. Existing assistant, saved chat and lifetime-view updates retained. Documentation conflicts resolved by preserving both histories and regenerating architecture. No branch push or GitHub PR closure.
- VERIFIED-SOURCE: 449 backend tests, 250 frontend unit tests, 97 contracts, typecheck, lint, privacy 0/415 and architecture 683-input check pass. Isolated OpenNext build completes 95 pages with copied dependencies, no local env files and verified staging Clerk public identity.
- Staging Edge `a4e8d686-5630-49b0-b116-a8c35aa45514` and Web `99a603ec-e557-44db-8591-6b251cf5b18f` each read back at 100% traffic on beta-staging.wtfhq.in. Web binds only to staging Edge/self. Rollback: Edge `209d34e7-e61c-491f-b539-fcccf7595381`, Web `b9a80954-81dd-4dff-b4bb-443e9bfd7a4e`. No pending migrations, database mutation, credential changes or production deployment.
- Live smoke: staging Edge health ok with Alpha corpus authority; sign-in and updated production bridge return 200; live Clerk identity matches staging; unauthenticated saved-chat GET and assistant POST return 401. Actual signed-in channel sync and generated Google reach reports were not exercised. Reach remains asynchronous and requires a subsequent sync once Google provides its report; deployment does not establish that impressions/CTR are populated.

## 2026-10-09 YouTube reach/CTR repair (PR candidate)

- Diagnosed the staging state through read-only CLI queries: core YouTube Analytics synchronization had completed, but the selected connection had no `youtube_reporting_jobs` receipt and therefore zero reach days. Impressions and CTR come from the separate asynchronous YouTube Reporting API rather than the core Analytics query.
- Reach synchronization now discovers the required `channel_reach_basic_a1` report type before job creation, retries failed job setup, and persists redacted failure states such as `reporting_api_disabled` and `reach_report_type_unavailable`. These failures remain non-blocking for views/watch-time/subscriber synchronization and are rendered in dashboard coverage instead of an unexplained zero.
- Corrected Reporting CSV CTR normalization: provider values are percentages and are always divided by 100, preserving sub-1% values (`0.87%` becomes ratio `0.0087`) and weighted channel CTR. Added success and provider-disabled regression coverage.
- This source change does not deploy, enable a Google API, mutate shared D1 data, or promise immediate reach history. The first Google report may take up to 24 hours after a successful job creation; a later synchronization imports it.

## 2026-10-07 View-count distinction deployed to staging

- Owner-authorized backend candidate `ba3432a5039c543632473f06d87217df294f5219` deployed as Edge `209d34e7-e61c-491f-b539-fcccf7595381`, verified at 100% traffic. Rollback Edge: `aaff6ee7-f41f-4794-b333-186123db92f9`. Web remains `b9a80954-81dd-4dff-b4bb-443e9bfd7a4e`; no web-source changes since that build.
- Exact candidate checks: 446 backend tests, 97 contracts, privacy 0/415 and architecture pass. No pending migrations; no database, credentials, production or branch-push changes.
- Live staging Edge health is ok; unauthenticated assistant POST returns 401 through beta-staging.wtfhq.in. Current lifetime views are now queried separately from period views. The owner's actual live video count remains for authenticated testing, not independently verified by these smoke checks.

## 2026-10-07 Period versus lifetime video views (local)

- Owner reported zero views despite a roughly 3.4k YouTube total. Read-only staging catalogue inspection confirms the selected video was published in May while the answer requested September 10–October 7; no synchronized daily rows exist for that video. This establishes the scope mismatch risk, not independent confirmation of the current public total.
- Single-video views now fetch current statistics through YouTube Data API videos.list as a separately labelled lifetime count, while preserving the Analytics period value and explicitly explaining the date scope. Statistics must match both video and connected channel; missing/invalid totals remain unavailable. Empty Analytics reports can still show a valid lifetime count without fabricating period zeros. Subscriber responses explicitly identify period totals.
- Verification: 446 backend and 250 frontend tests and web typecheck pass; focused assistant checks rerun after report normalization. Tests include zero period/3,400 lifetime, missing period rows, absent or invalid statistics and wrong-channel statistics. No deployment, push, credential or database changes. Actual current public total remains unverified by the agent; owner-authenticated retry is needed.

## 2026-10-07 Chat context and UX fixes deployed to staging

- Owner-authorized candidate `b56d3a6f594f18fc5b76640fc950d87ea19245ad` deployed to staging: Edge `aaff6ee7-f41f-4794-b333-186123db92f9`, Web `b9a80954-81dd-4dff-b4bb-443e9bfd7a4e`, both verified at 100% traffic. Custom domain https://beta-staging.wtfhq.in and staging-only paired service bindings verified. No push or production change.
- Rollback versions: Edge `37fb272e-d565-4285-b6b6-248638745671`, Web `de613a4d-ba94-4cb2-a3f5-382594c7272e`. No pending migrations and no database mutations in this deployment.
- Exact candidate backend tests 445, contracts 97, privacy 0/415, architecture and isolated OpenNext build (95 pages) pass. Frontend 250 unit tests, typecheck/lint and synthetic live-model checks passed before commit. Copied dependency files and explicit staging Clerk identity used; no local env files copied.
- Live sign-in and updated chat script return 200; the script contains conversation context, suggestion visibility controls and composer fixes. Compiled/live Clerk identity matches staging. Saved-chat API rejects unauthenticated requests with 401; Edge health is ok/staging with Alpha public API authority. Owner-authenticated live-channel acceptance remains for user testing.

## 2026-10-07 Analytics chat UX review (local)

- Fixed composer clearing unsent drafts while busy; submission now preserves the next draft, disables the send button during response generation and exposes aria-busy. Malformed source URLs are skipped instead of replacing a valid answer with a generic error.
- Successful saves now update the list from the save receipt, so a subsequent list-refresh failure cannot misreport a successful save. Only genuinely unsaved changes trigger discard confirmation; account requests have a bounded timeout. Ambiguous video choices identify the query and Video A/B slot.
- Two-video comparisons now support explicitly requested calendar dates through a validated selected window, instead of silently using first-seven-days. Existing post-publication windows remain supported. Calendar comparisons disclose that ages differ.
- Verification: 445 backend tests, 250 frontend tests, typecheck/lint pass. Actual GLM plus synthetic reports verified explicit calendar dates and both second-video follow-up phrasings. No browser automation or real-channel acceptance claim. All changes remain local; no push, deployment or database changes.

## 2026-10-07 Conversational video follow-ups and suggestions toggle (local)

- Fixed follow-ups that repeated a comparison when the owner asked about the second video. The planner now receives the last eight user/assistant messages, capped at 6,000 characters each and treated as untrusted context; provider queries remain the numeric authority. Latest-task and ordinal interpretation stay model-driven. Reopened saved chats reuse their transcript for context.
- Added an accessible Hide suggestions / Show suggestions toggle without clearing chat. No persistence/schema change.
- Verification: 20 focused backend tests, 249 frontend unit tests, typecheck/lint pass. Live GLM with synthetic reports returned only Video B and its prior dates for both the exact reported shorthand and an explicit second-video follow-up. These changes are local, not deployed or pushed.

## 2026-10-07 Analytics chat and saved investigations deployed to staging

- Owner authorized staging deployment of exact local source `76936255fea3302d3f91c79a6803c0e6a6bb23be`. Edge `37fb272e-d565-4285-b6b6-248638745671` and Web `de613a4d-ba94-4cb2-a3f5-382594c7272e` each verified at 100% traffic; custom domain remains https://beta-staging.wtfhq.in. Web binds only the staging Edge/self services. No branch push or production change.
- Rollback receipts before deployment: Edge `86678121-4e9a-436f-9245-bc823d14c262`, Web `089ea899-4a75-4385-ad49-6b9082c2aaf9`. Migration inventory confirms no pending migrations; previously approved 0022 remains applied, with no additional database mutation in this deployment.
- Candidate backend 444 tests, contracts 97, privacy 0/415 and architecture pass; frontend unit 248 and typecheck/lint passed before commit. Isolated OpenNext build completed 95 pages using copied dependencies, no local env files, and explicitly verified staging Clerk public configuration. Compiled assets and live sign-in both identify the staging Clerk instance.
- Live curl checks: sign-in 200, updated analytics chat asset 200, unauthenticated saved-chat API 401. Edge health is ok/staging with Alpha public API inference authority. Full owner-authenticated channel/chat/save acceptance remains for staging testing; synthetic model checks are not real-channel evidence.

## 2026-10-07 Analytics chat regression review (local)

- Exercised the actual GLM/OpenRouter interpreter for single-video metrics, subscriber/view rankings, period changes, misspelled two-video references, fair selected-pair comparison, lifetime comparison, unsupported revenue, follow-up likes, and unknown titles, using synthetic Google reports/catalogue only. All ten final scenarios passed; this does not certify real-channel data accuracy.
- Reproduced and fixed a 503 when Google omitted rows for an empty baseline: available current metrics now remain visible with a null baseline. Corrected the planner instruction so unknown selected-catalogue titles go through server catalogue lookup rather than being misclassified unsupported.
- Verification: 444 backend tests, 248 frontend tests, typecheck/lint pass; focused assistant tests rerun after the prompt adjustment. Local unauthenticated assistant, saved-chat list and save routes all return 401. Existing saved-chat isolation/reopen/deletion coverage passes. No browser automation, deployment, push, credential or database changes in this review. Owner-authenticated live-channel checks remain unverified.

## 2026-10-07 Live comparison metrics and selection continuity (local)

- Owner reported unavailable comparison values despite working single-video answers. Single-video chat queried Google live, while two-video chat only aggregated synchronized rows. The shared comparison service now optionally fetches live core metrics for both videos; chat enables it with each video's displayed publication window. Missing provider values stay null; provider denial fails truthfully. Impression metrics remain explicitly identified as synchronized data.
- Dashboard selection now takes precedence over a prior answer's video ID in chat requests. Comparison headings use Video A/B with full titles above, and the table scrolls horizontally instead of splitting words into narrow columns.
- Verification: 443 backend tests pass, including absent stored observations, live per-video dates/values, empty reports and provider denial. Frontend unit/typecheck/lint checked; local analytics and backend health respond 200. No deployment, push, database or credential changes in this update. Real signed-in channel comparison remains for owner testing.

## 2026-10-07 Account-saved analytics chats and title spelling (local)

- Selected channel-owned video titles now accompany model query context, allowing GLM to resolve misspelled references without hard-coded intent matching. Live-model tests resolved the owner's misspelled comparison against synthetic catalogue/report data.
- Replaced demo-only saved investigations with Save chat, New chat, account list, reopen, and confirmed delete. Private text snapshots use the existing verified member-owner lane for all roles; bounded inputs, owner-filtered reads/writes/deletes, safe text rendering, and account-history erasure are covered. Saved answers remain snapshots, never retrieval evidence.
- New migration 0022 creates analytics_investigations. Owner separately approved applying 0022 to staging D1 for local testing. Applied successfully and verified the table and migration receipt without reading user data. Pre-migration recovery bookmark: 0000015d-00000000-000050fd-69a6bdf02e74cd1e61452219d9d1f9c0. No application deployment, production change or push.
- Verification: 443 backend tests and 248 frontend unit tests pass, including account isolation, upsert/reopen, deletion and safe rendering. Local services remain running. Typecheck, lint, privacy scan and architecture check pass. Local analytics/health endpoints return 200; the owner can now test Save chat and reopen with their signed-in account.

## 2026-10-07 Analytics chat two-video comparisons (local)

- Removed the planner's two-video rejection. Named videos resolve within the connected channel; selected-pair questions receive the dashboard comparison IDs/window. Chat reuses the existing Episode Review comparison service and synchronized observations, with title/date columns, exact differences, net subscriber change, CTR percentages and text findings. Missing values stay unavailable; ambiguous titles require selection. No keyword-based intent detection or second evidence store.
- Verification: 440 backend tests, 247 frontend unit tests, 97 contracts, typecheck and lint pass. Live OpenRouter correctly interpreted named-video and selected-pair comparison questions against synthetic stored reports; this is not live channel accuracy acceptance. Both local endpoints return 200. No push or deployment; owner can test locally.

## 2026-10-07 Local analytics interpreter configuration reload

- The owner-added OpenRouter key existed in ignored provider vars and the merged temporary local vars, but the already-running Wrangler process had not added the new binding on hot reload. Fully restarted the local backend; startup now confirms the hidden OpenRouter binding. Frontend analytics and backend health both return 200. The owner's signed-in chat retry remains unverified; no deployment or push.

## 2026-10-07 Local login proxy startup corrected

- Local principal-context returned 503 because Next was launched on 0.0.0.0, bypassing the localhost HTTP forwarder and reaching an incompatible dev service-binding Request implementation. Restarting on localhost exposed a second startup mismatch: upstream 127.0.0.1 did not match Edge OPS_HOSTNAME=localhost. Both frontend bind hostname and upstream now use localhost.
- Verified through the frontend: invalid bearer receives backend 401 unauthorized instead of 503/404. Existing auth checks remain unchanged. Both local servers remain running; authenticated retry requires the owner browser. No deployment or push. PROJECT.md records the exact startup pairing and verification.

## 2026-10-07 Analytics assistant ranking and structured answers (local)

- Owner reported suggested ranking questions being rejected and unstructured metric output, and requested local testing before deployment. Root cause: the model planner explicitly rejected rankings/comparisons while the dashboard suggested them; the renderer used unstyled definition-list values and scrolled to the end of long answers.
- Added validated model query kinds for live channel video rankings (provider sort, maximum 10 results, ignoring selected-video scope), same-scope period comparisons (preceding equal-length period by default), and general fair-comparison guidance. Query interpretation stays in the existing OpenRouter lane; all metric values remain provider-sourced. Missing baseline stays unavailable and comparisons do not assert causation. Two-video comparisons and unsupported metrics remain explicitly unsupported.
- Responses now show dates, aligned metric/value rows, ranking links, a current/previous/change table, and compact source/limitation notes. The newest answer opens at its summary rather than its final source link. Safe text rendering is preserved.
- Verification: 438 backend tests, full frontend unit checks and focused ranking/comparison rendering checks, typecheck/lint pass. Live OpenRouter interpretation passed ranking, period-change and guidance questions against synthetic Google reports; this is not a real-channel accuracy receipt. Local frontend responds 200; backend health responds OK.
- Both local servers run on ports 3000/8787. Frontend explicitly uses staging Clerk with browser-token admission and forwards to local Edge. Temporary local backend vars combine ignored provider configuration with existing local overrides; owner added the missing OpenRouter key to the ignored provider file and it was loaded without printing it. Existing local configuration uses staging D1 and remote Alpha bindings; no migrations or shared-data testing mutations were performed. No deployment or push; await owner's local testing feedback.

## 2026-10-07 PR #82 analytics synchronization merged and staged

- Owner requested review/merge of PR #82 (`feature/sarthak`, `4a520b95478380c65d588c8b197e52868443aa23`) into feature/pavun and staging deployment. Local merge candidate `ca6199e663c8924e3949b4f61744800e7607ffbe` retains user-management changes. Only generated architecture files conflicted; regenerated against the merged source. No branch push or GitHub PR closure.
- Fix filters daily video Analytics reports to the owned catalogue in batches of 200; unavailable optional Reporting reach data no longer blocks core sync. Local development may use browser bearer admission without a copied Clerk server secret; deployed middleware remains enforced. Analytics report pagination and other documented spreadsheet coverage gaps remain outside this fix.
- VERIFIED-SOURCE: 434 backend, 244 frontend unit, 97 contracts, typecheck, lint, architecture check and isolated OpenNext build (95 pages) pass. Built with copied dependencies and explicitly verified staging public Clerk key, without local environment files. Compiled artifact rejects any production public key; live readback matches the staging issuer.
- Staging Edge `236106c8-0831-4bd5-a50c-f5ea64cd1a5c`; Web `089ea899-4a75-4385-ad49-6b9082c2aaf9` on beta-staging.wtfhq.in, bound only to staging Edge. Previous rollback pair: Edge `5ac88d27-0244-437f-949b-cdbe65af389c`, Web `9a814433-789c-4364-bf35-30b7b94029e4`. No outstanding migrations; no database, credential or production changes.
- Live backend health OK, analytics page 200, unsigned analytics/principal APIs 401. Owner/colleague reported real local synchronization working; this deployment's signed-in YouTube synchronization remains for owner testing and is not claimed as independently verified.

## 2026-10-06 Staging Clerk build configuration corrected

- Owner reported a sign-in/workspace loop when using separate staging and production accounts. Root cause confirmed: staging Web `082645bf-8813-4573-87c8-cddd095882ae` compiled the production public Clerk key from copied local environment material. Its browser used `clerk.wtfhq.in` while the staging Edge verifier correctly expected `mighty-hedgehog-2913.clerk.accounts.dev`; rejected admission redirected back to an already-signed-in provider.
- Restored known-good Web `9d55eb20-413f-424c-a01c-aad1dfe9abea` while rebuilding runtime source `7544f159c45e94bcb77923dd3292c58773dcfeec` with the verified staging public key explicitly in the build environment and no local env file. Checked compiled artifacts contain staging key and no production public key. Final staging Web is `9a814433-789c-4364-bf35-30b7b94029e4`; Edge remains `5ac88d27-0244-437f-949b-cdbe65af389c` and migrations 0020/0021 remain applied.
- Live public-key readback confirms staging uses the staging instance and production still uses `clerk.wtfhq.in`. Staging unsigned principal API returns 401. Build passed; no source runtime change, production mutation, credential change or branch push. Authenticated dual-account behavior still requires the owner's browser refresh/sign-in. PROJECT.md now records mandatory build/live identity checks and excludes copying local environment material into staging builds.

## 2026-10-06 User management deployed to staging

- Owner authorized staging deployment of committed runtime source `7544f159c45e94bcb77923dd3292c58773dcfeec`. Edge version `5ac88d27-0244-437f-949b-cdbe65af389c`; final Web version `082645bf-8813-4573-87c8-cddd095882ae` on `beta-staging.wtfhq.in`, bound only to staging Edge. Production unchanged; no branch push.
- Applied only reviewed D1 migrations 0020/0021 to staging; post-apply inventory has no outstanding migrations. Pre-migration Time Travel bookmark: `0000014b-00000000-000050fc-422a7c34527e94ac74ed741da8c4ef1f`. Previous rollback pair: Edge `3ab50842-302e-41df-8353-95f90463d1fe`, Web `9d55eb20-413f-424c-a01c-aad1dfe9abea`. Schema changes remain backward compatible; avoid database recovery after real deletion without reviewing resurrection risk.
- The first frontend artifact (`25a13032-bdda-4dc3-a10f-9d66c53c15a0`) failed live requests with an unsupported dynamic Next middleware-manifest require. Immediately restored previous Web, rebuilt with local dependency files instead of an external node_modules symlink, verified the Worker locally (200), then deployed the corrected artifact. Use real copied dependencies for isolated OpenNext production builds.
- Exact-commit source checks passed: 433 backend, 243 frontend unit, 97 contracts, typecheck/lint and architecture. OpenNext built 95 pages. Live backend health is OK with Alpha corpus authority; final page/API smoke and deployment traffic readback recorded. Signed-out IAB reaches sign-in; no authenticated admin session is available for live invitation, role-change, suspension or destructive deletion acceptance. No actual users were deleted or invitations sent during verification.

## 2026-10-06 Unified user management and permanent deletion (local)

- Owner requested all signed-in members/operators, role changes, working invitations, suspension and permanent deletion including all history. The authenticated `/beta/api/admin/users` roster deduplicates D1 users; UsersWorkspace supports search, member invitations, role changes, suspension/reactivation and typed-email Delete confirmation. Self and super-admin changes are protected; ownership transfer remains separate.
- Migration 0020 preserves historical operator IDs when explicitly demoting to member; both admission paths honor this flag and ordinary inactive operators still deny. Migration 0021 permits account-scoped history erasure and prevents deleted accounts recreating chats/preferences or regaining operator access.
- Delete atomically erases both member/operator active and archived conversations, messages, saved preferences, profile and pending OAuth transactions. It blocks access before deleting the matching Clerk account. Provider failure leaves a visible retryable deletion-pending state; completion hides the user. Minimal access-denial, security audit and content-free deletion receipts remain; shared channel data is unaffected.
- VERIFIED-SOURCE: 433 backend tests, 243 frontend unit tests, 97 contracts, 18 isolated browser checks, typecheck, lint and privacy 0/415 pass. Tests cover full deletion, retries, other-user isolation and typed confirmation. Contract tests require local listener permission; sandbox-only run could not open its stub server. No real invitation delivery or Clerk account deletion was performed.
- Changes remain local on feature/pavun. Migrations 0020/0021 have NOT been applied to shared databases; no push or deployment. Regenerate architecture after this checkpoint and tracking new source files. Live staging role/provider acceptance remains outstanding.

## 2026-10-05 Phase 2 tests migrated to Beta

- Owner authorized updating the legacy tests and pushing all changes on `feature/pavun`. Replaced retired `/ops` UI expectations/HMAC admission with canonical Beta workspace, users settings and audit paths. Added denied-principal, legacy redirect, member/operator environment visibility and mobile assertions; retained roster, transfer confirmation and audit export coverage.
- Dedicated Phase 2 config builds a disposable source copy with test-only Clerk adapters; production configuration and runtime auth are unchanged. Browser API fixtures return explicit principal/record responses and otherwise fail closed; external browser traffic is blocked. This is deterministic UI evidence, not live Clerk/D1 acceptance.
- Full Phase 2 gate passes: 428 backend tests, 16 browser tests, audit-filter tests, typecheck and privacy 0/414. Frontend unit 243/243, contracts 97/97 and lint pass. Architecture regenerated after this handoff and after tracking new files. No application deployment in this task.

## 2026-10-05 Branch CI investigation

- Owner asked to inspect failed CI on pushed `feature/pavun` source `dae114d`. Architecture run 37292394217 failed because the final deployment handoff changed a fingerprint input after generation. Reproduced locally and regenerated the three artifacts after this checkpoint.
- Phase 2 run 37292394210 passed backend tests but failed nine legacy operator browser tests. They navigate retired `/ops`, `/ops/operators`, and `/ops/audit` paths using HMAC context headers; middleware redirects these to Clerk-protected Beta destinations. Identical nine failures already occur in September 28 run 36438800711, predating the production analytics change.
- Browser test migration to the current Beta/Clerk admission contract remains outstanding. No authentication bypass, skipped test, workflow weakening, browser automation, deployment, or push performed. This is a CI diagnosis, not a claim that Phase 2 is green.

## 2026-10-05 Production analytics visibility update

- Owner confirmed existing production `wtfhq.in` after initially naming another domain. Production menus for both member and operator principals now hide YouTube Analytics; the canonical dashboard also displays unavailable in production. Local/staging visibility is retained using the verified principal environment. This is UI visibility, not a change to backend permissions.
- Exact runtime source `f2f95c8` deployed to `wtfmedia-web-beta`, version `28870a53-9cc0-49f6-8bea-2ea21b3e45b8`, with Custom Domain `wtfhq.in`. Previous Web rollback version `4415f659-f443-421b-84a2-608d7d9f50e3`. Production Edge remains `d3bd05e0-539e-4519-bee9-20326ac14077`; no backend, secrets, database, DNS or staging changes. No branch push.
- Verification: 243 frontend unit tests, 97 contracts, typecheck, lint, architecture check and isolated OpenNext build pass. Live root redirects (307); sign-in/chat/Connections return 200; unsigned principal-context returns 401. Live Clerk publishable configuration matches the previous production page. Staging analytics returns 200. No browser automation or signed-in visual acceptance claimed.

## 2026-10-04 Staging OAuth callback redirect hotfix

- Owner reported `not_found` after Google returned to the staging callback. Deployed web proxy left redirect mode implicit, allowing the return-to-page redirect to be followed inside the Edge service binding; that backend has no `/beta/analytics` page. Explicit `redirect: manual` now preserves the 303/Location for the browser, matching the existing localhost forwarding path.
- Regression test reproduces the follow-mode 404 and verifies manual-mode 303/header preservation. 242 frontend unit tests, 97 contracts, typecheck/lint and isolated OpenNext build pass. No OAuth code from the screenshot replayed or recorded.
- Deployed source `b9594b97344b07df7b118586b99e533933f16d84` to staging Web version `9d55eb20-413f-424c-a01c-aad1dfe9abea`. Backend unchanged at `3ab50842-302e-41df-8353-95f90463d1fe`; previous Web rollback version `02bdf9a2-5a26-4c58-a1d3-75921aa829a7`. Production untouched, no branch push.
- Read-only staging connection check showed YouTube revoked with no selected channel. Owner should start fresh Connect Google after this update. Successful signed-in consent and channel synchronization remain unverified; no browser automation used.

## 2026-10-04 GLM and member analytics deployed after key provisioning

- Owner supplied the OpenRouter key and authorized adding it. Stored only as `OPENROUTER_API_KEY` on `wtfmedia-edge-staging`; no value written to repository or local env files. Advised rotation because it appeared in chat. Prior missing-key deployment hold is resolved.
- Deployed runtime source `4b346b8e42a3fae807eb2b7dc18ea15fea03a5ca`: Edge `3ab50842-302e-41df-8353-95f90463d1fe`, Web `02bdf9a2-5a26-4c58-a1d3-75921aa829a7` at `beta-staging.wtfhq.in`. Rollback pair before this task: Edge `c6ee1e97-97f4-46af-9111-13916ca7a0b9`, Web `db2adfff-251e-4802-a972-46b20a336a4a`.
- Analytics planning now uses the shared GLM/OpenRouter lane. All admitted members/operators can read analytics and use chat; only admin/super-admin can manage channel connection and synchronization. No production changes, database migrations, or branch push.
- Source verification: 428 backend tests, 241 frontend tests, 97 contracts, typecheck/lint, architecture check, and isolated OpenNext build pass. A first synthetic provider smoke failed without status; a retry through the shared client returned valid JSON from `z-ai/glm-5.3-flash`. Real YouTube answer reconciliation and signed-in role UI remain manual acceptance.

## 2026-10-04 GLM/access deployment prepared; staging key missing

- Owner requested deployment of GLM analytics and member analytics access. Candidate `4b346b8` includes the member-compatible legacy analytics redirect; local source changes are committed, not pushed. Backend 428/428, frontend 241/241, contracts 97/97, typecheck/lint and architecture checks pass.
- Rechecked live secret names after owner stated Ask WTF works: staging Edge and staging Web both have no OpenRouter key; Alpha Web has its Edge transport secret; production Edge has `OPENROUTER_API_KEY` and `_2`. Staging Ask WTF uses the Alpha gateway to production inference, while analytics planning runs on staging Edge. No secret values read or copied.
- Deployment is held pending `OPENROUTER_API_KEY` on `wtfmedia-edge-staging` (or secure local availability for provisioning). Owner was asked to add it without posting it in chat. No new deployment or remote mutation in this task; previous staging analytics model remains running. Build artifact is being prepared in the existing temporary deployment checkout.

## 2026-10-04 Member analytics access and provider configuration status

- Owner requested analytics and analytics chat for all admitted users, with channel controls restricted to admins. Members now receive `analytics:read`, see the analytics menu/page, and reach protected report/chat routes. Connect, OAuth callback, selection, disconnect, synchronization, and retention mutations remain admin/super-admin only; editors and members do not receive manage controls or API permission.
- Verification: 428 backend tests pass, including member router read/chat admission and all channel mutation denials; frontend typecheck and 9 focused tests pass. Architecture current at 667 inputs. Local changes only; no deployment or push.
- Owner reported the existing OpenRouter key was already added. Read-only production binding-name check confirms `OPENROUTER_API_KEY` and `OPENROUTER_API_KEY_2` on the production Edge worker. Local environment and local vars files still lack those bindings; Cloudflare secret values were not accessed or copied. Live analytics GLM testing/staging provisioning remains pending secure key availability. Staging remains on the previously deployed model and role policy.

## 2026-10-04 Analytics model aligned with Ask WTF (local)

- Owner requested the same GLM/OpenRouter structure as Ask WTF. Analytics planning now calls shared `openRouterChat`, inheriting default `z-ai/glm-5.3-flash`, model override, low-effort reasoning, and primary/backup key handling. Added opt-in JSON output to the shared client; existing Ask WTF callers retain their default request shape. Google still supplies all numerical report values.
- Removed the analytics Workers AI inference call and fallback. No remote binding or secret changes, deployment, or push. Local `.dev.vars` and `.dev.vars.local` contain no OpenRouter key; asked owner for its existing secure source or to add it to ignored `.dev.vars`. Do not claim live GLM verification until credentials are available.
- Verification: 426/426 backend tests, including shared model/JSON/key-fallback and missing-key behavior; architecture current at 667 inputs; whitespace check passes. Staging remains on its previously deployed runtime/model.

## 2026-10-04 Staging Connections and compact controls deployment

- Owner authorized staging deployment of runtime source `e0eb4937b8ae5f8cfeaaa453b05ccfee9803f792`: Edge `c6ee1e97-97f4-46af-9111-13916ca7a0b9`, Web `db2adfff-251e-4802-a972-46b20a336a4a` at `beta-staging.wtfhq.in`. Previous rollback pair: Edge `ed3fbf48-15db-4632-82f6-33c7ab96fc34`, Web `595b5650-cd1c-41fa-a0d6-9b7a0358697c`.
- Includes Connections menu instead of Episodes, shared authenticated topic explorer, direct channel controls, owned-channel discovery, and disconnect. Existing staging secrets and bindings retained; no migrations, production deployment, or branch push.
- Verification: 424 backend tests, 241 frontend tests, 97 contracts, typecheck/lint, and isolated OpenNext build pass. Updated the staging binding test to accept the owner-approved analytics AI binding while retaining bans on duplicate corpus/ingest resources. Post-commit documentation refresh covers 667 tracked inputs.
- Live HTTP: Connections 200, analytics 200, unsigned analytics API 401, staging backend healthy with Alpha corpus authority. Signed-in channel operations and visual acceptance remain manual.

## 2026-10-04 Local compact YouTube connection controls

- Replaced Manage connection and its expanded setup panel with direct Connect, Disconnect, and Update data actions in the connection card. Removed manual channel ID/timezone fields; multiple owned channels use a name-based selector.
- The existing protected selection endpoint now discovers the authenticated account's channel when no ID is supplied, selects only an unambiguous single result, and returns choices without writes for multiple results. Explicit IDs still require ownership verification. Disconnect uses the existing revocation endpoint and clears displayed report data.
- Verification: 20 analytics backend tests including single/multiple/empty owned-channel results; 6 targeted frontend tests; script syntax and whitespace checks pass. Local changes only, no deployment or push. Signed-in visual/Google interaction remains for owner testing.

## 2026-10-04 Local Connections menu integration

- Fetched `feature/sarthak`; its existing `260f50d` topic explorer is already merged and no newer commits remain to integrate.
- Replaced the signed-in operator Episodes menu entry with Connections. Added the same Connections destination to member menu disclosure, reusing the existing explorer at `/beta/connections` within the authenticated app shell. Direct episode routes remain available.
- Registered the destination with existing `beta:read` access and retained the explorer's sticky workspace layout without a bottom dock. Targeted navigation/topic tests 20/20 and typecheck pass; local page/API HTTP checks pass. Owner requested local testing before deployment: no push or deployment for this change.

## 2026-10-04 Owner-authorized staging analytics deployment

- Deployed exact source `36e9eb953037c0fa0739aa061ef2a5b3b37d2f55` to `beta-staging.wtfhq.in`: Edge `ed3fbf48-15db-4632-82f6-33c7ab96fc34`, final Web `595b5650-cd1c-41fa-a0d6-9b7a0358697c`. Web binds only to staging Edge; staging D1 and Alpha bridge remain unchanged.
- Owner separately approved staging provider setup: added Google OAuth client ID/secret, encryption key, callback `https://beta-staging.wtfhq.in/beta/api/analytics/oauth/callback`, and analytics-planner AI binding. No secret values recorded. No migrations pending; no database migration applied. No production changes or branch push.
- Source checks: Edge 423/423, web 241/241, contracts 97/97, typecheck/lint, topic route 4/4 after runtime adaptation, architecture current at 666 inputs, privacy 0/411. OpenNext build passes after changing the imported connections route to the adapter-compatible nodejs runtime.
- Initial isolated build used symlinked dependencies and produced a manifest-resolution HTTP 500 on staging. Rebuilt identical source with copied dependencies and replaced Web version `351c94db-ae2d-453d-8929-45ed0e86db1f`; final smoke verifies sign-in 200, analytics page 200, unsigned analytics API 401, dashboard static asset 200 after canonical redirect, and Edge health reporting staging/Alpha corpus authority.
- Pre-task rollback versions: Web `ac77a9f2-b9a9-4397-b6c8-11195b41eab4`, Edge `10b8a7c6-d596-433b-859c-403b94b7b9b3`. Provider secrets were separately updated by owner approval. No browser automation; Google console redirect registration and signed-in consent/live metrics remain unverified. This is deployment evidence, not full Beta persona acceptance or spreadsheet parity.

## 2026-10-04 OAuth start constraint fix

- Backend logs identified the OAuth-start 500 as migration 0018's return_path CHECK rejecting `/ops/settings/analytics`. OAuth transactions now always persist the schema-compatible legacy value; callbacks return to the fixed `/beta/analytics` page on the configured frontend origin. User-supplied return paths cannot alter that destination.
- Updated dashboard request and regressions for persisted path and callback outcomes. All 19 analytics tests pass; local backend auto-reloaded. No shared schema changes, deployment, or successful live Google consent claimed.

## 2026-10-04 Analytics connection authentication and copy cleanup

- Owner reported unauthorized status disabling Google connection in the embedded dashboard. Its plain fetch calls lacked the explicit Clerk bearer authentication used by the app. Added a same-origin analytics-only request bridge using the parent Clerk session, with one fresh-token retry after 401. Embedded calls wait for bridge readiness; Google credentials remain server-side.
- Removed connection implementation instructions, build brief/data contract, speculative historical tiers, and outer mapping contract. Retained simple Google connection, channel selection, update and refresh controls; replaced developer-facing status and local-save copy.
- Verification: 241/241 frontend unit tests, typecheck, targeted lint, script syntax and diff checks pass. New auth bridge is served locally with HTTP 200. No authenticated Google consent success, live metrics validation, deployment, or production-readiness claim. Prior provider/API gaps still apply.

## 2026-10-04 Analytics single-page presentation

- Owner requested removal of the nested-page appearance. Embedded dashboard mode hides its duplicate header/logo/menu and uses a transparent background; the app retains its primary navigation. Removed the extra page heading and frame border, and hid the bottom dock on `/beta/analytics`.
- A cleaned-up ResizeObserver follows dashboard content height so the surrounding page handles scrolling as reports and answers change. Standalone dashboard presentation remains available without embedded mode.
- Frontend typecheck, targeted lint, and diff whitespace validation pass. Visual verification remains manual; no push or deployment.

## 2026-10-04 Standalone analytics navigation

- Added YouTube analytics to the operator main menu, capability-filtered by `analytics:read`, with a standalone `/beta/analytics` page outside the Settings layout. Removed the Settings navigation item; its old page redirects to the new destination.
- Registered the new route in frontend principal/destination checks and edge policy, preserving operator-only access and existing protected analytics APIs.
- Verification: 17 targeted frontend tests, 5 edge policy tests, frontend typecheck, and whitespace checks pass. Local new/old URLs respond with HTTP 200 behind the principal gate; authenticated visual verification remains manual. No push or deployment.

## 2026-10-04 Analytics iframe header fix

- Firefox blocked the analytics iframe because the global response header was `X-Frame-Options: DENY`.
- Added an exact `/analytics-demo/index.html` header override with `SAMEORIGIN` and CSP `frame-ancestors 'self'`. Other pages retain `DENY`.
- Live localhost HTTP verification after automatic frontend reload: dashboard returns 200 with the new headers; sign-in returns 200 with `DENY`. Diff whitespace check passes. No browser automation, push, or deployment.

## 2026-10-04 Sarthak refresh and analytics assistant

- Preserved prior local OAuth fixes in `1fe73fb`, then merged `feature/sarthak` head `260f50d` (analytics workspace and topic explorer) into `feature/pavun` as `52f95c8`. Only HANDOFF conflicted; retained both histories. Nothing pushed.
- Added protected POST `/beta/api/analytics/assistant` with operator `analytics:read`. The existing production workspace chat now calls this API instead of the fixture keyword responder.
- Workers AI interprets questions into validated metric/date/title plans. Channel-scoped catalogue retrieval resolves video identity; ambiguous matches ask for selection. YouTube supplies totals directly. Answers contain metrics, net subscriber growth, dates, source links, and reporting caveats; no LLM-authored numerical claims.
- Scope: one video or channel; views, watch time, average duration/percentage, subscriber gains/losses, likes, comments, shares. Comparisons/rankings/causes/reach are explicitly unsupported in chat. No transcript corpus changes or new migrations.
- Verification: full edge suite 422/422 before final channel-scope adjustment; focused final assistant suite 9/9, frontend 240/240 unit and 97/97 contracts, typecheck/lint. Local sign-in and assistant script return 200; unsigned assistant returns 401. No browser automation.
- Synthetic live Workers AI smoke returned a valid JSON metric plan; no private channel data sent.
- Local frontend :3000 and backend :8787 running with existing configuration. Read-only staging inventory has zero provider connections, so authenticated Google consent and real-channel answer reconciliation remain unverified.
- API review gaps recorded in `docs/ANALYTICS-INTEGRATION.md`: daily-video query filter, Analytics pagination, null coercion, content classifications, and spreadsheet expected-CTR differences. Do not claim all YouTube integration or spreadsheet parity is complete. No deployment or shared database mutations in this task.

## 2026-09-29 Approved staging analytics migrations

- Owner explicitly approved applying analytics migrations 0018 and 0019 to shared staging D1 (`wtfmedia-ops-staging`). Confirmed those were the only pending migrations, then applied both using Wrangler migration tracking.
- Captured pre-apply D1 Time Travel recovery bookmark `0000011e-00000000-000050f5-942b9ccd6397a39e02c395e3f7a15739`; no database contents exported.
- Remote readback verifies both migration records, all 13 analytics tables, and the three added video reach/retention columns. Prior pending-migration notes are superseded by this receipt.
- Production unchanged. No deployment, scheduling, provider sync, or Google consent performed; owner can refresh localhost analytics and start Google consent.

## 2026-09-29 Local analytics OAuth origin fix

- Diagnosed OAuth start returning 404 before authentication: local frontend origin used port 3000 while HTTP upstream used port 8787. Google credential bindings were present.
- Local proxy now validates the original browser origin before translating it to the internal edge origin. Foreign-origin mutations return 403. Deployed service-binding path is unchanged.
- Analytics UI distinguishes storage setup, disconnected accounts, missing configuration, and generic connection failures. Connect is disabled while storage migration is required.
- Verification: 234 web unit tests, typecheck, lint; unsigned same-origin live POST reaches 401 authentication, foreign-origin POST returns 403. No authenticated OAuth success claimed.
- Migrations 0018/0019 remain pending owner approval for shared staging D1. No migrations, provider configuration changes, push, or deployment performed.

## 2026-09-29 Local PR #81 integration

- Merged `feature/sarthak` / PR #81 at exact head `30b5635b645f6bfd3c90ecfc1c59cc72cd2b4b24` into local `feature/pavun` without conflicts. No push or GitHub PR-state mutation.
- Adds YouTube Reporting API reach imports, audience/retention observations, period and episode comparisons, derived metrics, manual sync routes, and a labelled demo reference. Migration 0019 follows 0018; neither was applied to a shared database by this task.
- Verified locally: 413/413 edge tests, 232/232 web unit tests, 97/97 contracts, typecheck, lint, and the 657-input architecture ledger. Removed trailing whitespace in two incoming documents.
- GitHub Phase 2 Gate remains failed: nine browser tests on audit, control-room, and operator routes. Inspected failure logs; no browser tests were rerun and no claim is made that these failures are resolved or pre-existing.
- No deployment, credential changes, Google sync, scheduling, or database mutation. Live metric accuracy and provider reconciliation remain unverified; local passing tests do not prove spreadsheet parity or production acceptance.
## 2026-10-02 Connections sidebar navigation polish

**Status:** LOCAL SOURCE COMPLETE — no push, pull request, GitHub action,
deployment, Cloudflare mutation, corpus ingest, provider call, or secret use.

- Converted the Connections topic rail into a viewport-bounded sticky panel.
  The search header and category footer stay fixed while only the topic rows
  scroll; the panel clears the fixed WTF OS logo and keeps an intact frame at
  both page and list scroll boundaries.
- Added thin native-scrollbar styling, overscroll containment, and conditional
  top/bottom fades so continuation is visible without clipped cards or a
  broken-looking border.
- Added a generated category selector in the fixed footer. It composes with
  text search, reports the filtered/total count, and currently exposes all
  eight categories from the generated data rather than a hard-coded list.
- Replaced the native category select after full-screen browser acceptance
  exposed unreliable popup behavior inside the clipped sticky rail. The new
  in-page menu opens upward, reports per-category counts, closes on outside
  press or Escape, resets the topic scroll position, and selects the first
  matching topic so the evidence panel remains synchronized with the filter.
- Reproduced the remaining click failure in the user's full-screen Chrome
  layout. The visible category row overlapped the fixed bottom dock's
  transparent full-width wrapper, so Chrome delivered the pointer event to
  the invisible shell layer. The dock wrapper is now pointer-transparent and
  only the visible navigation pill accepts pointer input. A 1470x956 journey
  assertion guards the overlap with `elementFromPoint` before opening the
  category menu.
- Local browser verification confirmed sticky geometry, internal list
  scrolling, restored top state, menu open/select/restore at 1470x956, a
  13-topic AI & Technology result, synchronized Science & Climate detail, and
  successful menu opening at the formerly blocked full-screen Chrome position.
  Verification passes: TypeScript, ESLint, web unit 237/237, contracts 97/97,
  production Next build (92 pages), architecture ledger check (657 inputs),
  and `git diff --check`. Repository Playwright remains locally unavailable
  because its pinned Chromium headless-shell binary is not installed; the new
  journey is committed as a regression check and the exact interaction was
  accepted manually in installed Chrome.

## 2026-10-02 Expanded, fully receipted topic Connections index

**Status:** LOCAL SOURCE COMPLETE — no push, pull request, GitHub action,
deployment, Cloudflare mutation, corpus ingest, provider call, or secret use.

- Expanded the deterministic Connections discovery pipeline from 24 broad
  clusters to 72 topic connections, 201 strong shared-episode links, and 653
  exact caption-aligned moments across the existing 55-episode local index.
- Corrected the topic-count contract: `episodeCount`, `occurrenceCount`, and
  the number of distinct evidence episodes are now identical for every topic.
  Every episode counted by the UI has a displayed start/end time, transcript
  excerpt, direct YouTube moment link, and local episode link.
- Added phrase-level discovery alongside semantic clustering. Generic
  conversational phrases, place-style labels, duplicate aliases, and weak
  graph overlaps are filtered; normalized labels and their actual matched
  anchor language are exposed in the API and UI.
- Limited graph degree to six strong relationships per topic so the expanded
  catalogue remains navigable. Search includes labels, categories, anchor
  language, related phrases, episode titles, and connection explanations.
- Verification remains local-only; see the command/test receipts in the
  current task before making any staging or production claim.

## 2026-10-01 Local dynamic topic Connections implementation

**Status:** LOCAL SOURCE COMPLETE — no push, pull request, GitHub action,
deployment, Cloudflare mutation, corpus ingest, provider call, or secret use.

- Replaced the migrated `/connections` entity/place projection with a generated
  topic index derived from the existing local RAG passage embeddings. The
  legacy rollback surface and its historical dataset remain unchanged.
- Added `npm run connections:build`. The provider-free builder performs
  deterministic semantic clustering, rejects over-broad/place-style labels,
  applies per-topic evidence thresholds, and aligns focused evidence phrases
  back to native published-caption sidecars. It does not estimate timestamps;
  unaligned evidence is omitted.
- The current local artifact contains 24 topics, 41 shared-episode topic links,
  and 143 caption-aligned evidence moments across 55 indexed episodes.
- Added public `GET /api/connections` with full-index, text-filter, bounded
  limit, and per-topic detail modes plus schema/freshness headers. The browser
  bypasses its own cache while shared caches may retain the immutable generated
  projection briefly.
- The Connections UI now includes dynamic topic search, an interactive graph,
  related-topic navigation, confidence/readback metadata, exact start/end
  clocks, transcript excerpts, semantic match explanations, direct YouTube
  timestamp links, dedicated episode links, and explicit loading/error/empty/
  methodology states.
- Verification: generator completed; web unit 237/237 and contracts 97/97
  passed before the final evidence-window tightening; focused topic/API tests
  4/4, TypeScript, ESLint, production Next build, and `git diff --check` pass.
  In-app browser verified topic search/selection, API freshness, 143-moment
  readback, timestamp links, and zero horizontal overflow at the available
  621px viewport. Repository Playwright journeys remain unexecuted because its
  pinned Chromium binary is not installed on this host.
- Local preview is available at `http://127.0.0.1:4321/connections`. No live or
  production acceptance is claimed.

## 2026-09-28 Local PR #80 integration and Google OAuth configuration

- Integrated PR #80 head `3cfe4a8` into `feature/pavun` locally, preserving current chat, identity, and UI contracts. No push or deployment.
- Renumbered the additive analytics migration to `0018_analytics_connections.sql` because 0016 and 0017 already exist on this branch. Updated migration manifest and capability-scoped analytics navigation.
- Configured owner-supplied Google client credentials only in the ignored local secret file, with a local encryption key and frontend callback. Local edge must explicitly load both env files; see `docs/ANALYTICS-INTEGRATION.md`. No credential values are recorded here.
- Fixed OAuth callbacks returning to the internal edge port instead of the configured frontend origin; added a regression test. Removed principal-response body logging from the web proxy.
- Verification: 412/412 edge tests, 232/232 web unit tests, 97/97 contracts, web typecheck/lint, and 6/6 focused proxy tests pass. Local sign-in/settings return HTTP 200 and unsigned protected API routes return 401.
- Frontend runs on localhost:3000; edge on localhost:8787. No authenticated browser or real Google consent acceptance claimed.
- Read-only staging schema check found no analytics tables. Migration approval is pending because local edge uses shared staging D1. No migration, cron, provider connection, or deployment was performed. Google client callback registration remains to be verified.

## 2026-09-28 Issue #79 source-only analytics implementation

**Status:** SOURCE-ONLY FEATURE PR PREPARED — no Google Cloud mutation, credential use, D1 apply, Cloudflare configuration, deployment, scheduled trigger, provider connection, or production change occurred.

### Delivered source contract

- Replaced the local YouTube fixture/API-key preview with separate YouTube and Website (GA4) stored-report views at `/beta/settings/workspace/analytics`.
- Added explicit edge `analytics:read` and `analytics:manage` capabilities. Editors can read; admins and super-admins can manage connections. Member/operator separation remains fail-closed.
- Added operator-bound, expiring, single-use Google OAuth state; read-only scope validation; encrypted credential envelopes; token refresh; resource validation; and disconnect/revocation handling.
- Added migration `0016_analytics_connections.sql` for connections, resources, daily history, and idempotent sync state.
- Added YouTube catalogue backfill plus channel/video daily reports and separate GA4 daily-total/traffic-source reports. Scheduled overlap refresh is source-complete, but no cron trigger is declared.
- Added setup, recovery, scopes, callback, metric, and staging-acceptance documentation in `docs/ANALYTICS-INTEGRATION.md`.

### Local receipts

- Cloudflare full suite: 274/274 passing.
- Web unit: 161/161 passing; web contracts: 92/92 passing.
- Web TypeScript and ESLint pass.
- Wrangler dry-run bundles the edge Worker; no upload or deployment occurred.

### Remaining live gates

- Revoke/rotate any credential previously disclosed outside the secret store; exposed credentials must never be used.
- Owner confirmed the authorized YouTube channel ID for staging selection; the GA4 property ID remains pending. Resource identifiers stay runtime selections rather than source constants.
- Register the approved staging callback and configure fresh server-side secrets directly in the staging secret store.
- Review/apply migration 0016 to staging, then deploy the exact reviewed source and explicitly add the approved scheduled trigger.
- Complete real OAuth, provider reconciliation, persona, desktop/mobile, and disconnect/reconnect acceptance in staging.
- Production remains a separate owner-authorized release.

## 2026-09-28 Local feature/pavun branch and no-push instruction

- Owner requested the updated branch be integrated into `feature/pavun` and
  future changes kept local unless a push is explicitly requested.
- No local or remote `feature/pavun` existed at inspection. Created it directly
  from `codex/apex-app-cutover-20260923` at `f535650`; all source and deployment
  receipts are inherited without conflicts or a redundant merge commit.
- Updated `AGENTS.md` to make this the default working branch and supersede
  the older mandatory new-`codex/*` delivery rule. No push or deployment.


## 2026-09-23 Approved app promoted to wtfhq.in

**Status:** DEPLOYED; unsigned HTTP/API smoke verified. Authenticated user
acceptance has not been performed in this turn.

- Owner requested the current approved app at `https://wtfhq.in` and explicitly
  chose to disable the old `beta.wtfhq.in` address rather than redirect it.
- Exact source: `71fe0d5`, isolated on `codex/apex-app-cutover-20260923`.
  Existing PR branches were not updated.
- Apex ingress now uses the existing authenticated `wtfmedia-web-beta` Worker,
  preserving its secret/service bindings. Web version
  `4415f659-f443-421b-84a2-608d7d9f50e3`; Custom Domain moved from
  `wtfmedia-web` to this Worker. The old Beta Custom Domain was removed.
- Production edge `d3bd05e0-539e-4519-bee9-20326ac14077` trusts `wtfhq.in`
  for OPS_HOSTNAME, OPS_ORIGIN and CLERK_AUTHORIZED_PARTIES. Existing live
  Clerk issuer/JWKS, production D1 and corpus bindings remain unchanged.
- The `wtfmedia-web` Worker remains the internal Alpha inference service via
  WTFMEDIA_ALPHA_WEB. Its code was not redeployed. No D1 migration, data copy,
  secret rotation or corpus mutation occurred. Staging was not deployed.
- Obsolete apex sign-in/sign-up 404 path overrides were explicitly deleted
  after route inventory: deploying their config with an empty routes list
  alone left the old routes active. The now-unrouted 404 Worker version is
  `587f20b2-2853-47a4-9255-eaf87e8ef926`.
- Verification: 233/233 web unit tests, 97/97 contracts, lint, Next type/build
  checks and OpenNext bundle passed; architecture current at 650 inputs.
  Live `/` 307 to `/beta`; `/beta`, `/sign-in`, `/sign-up` 200; sign-in HTML
  contains approved copy and live Clerk host; unsigned principal-context 401;
  GET `/api/chat` 405 and empty POST 400. Staging sign-in remains 200.
  `beta.wtfhq.in` no longer resolves. No signed-in chat/role acceptance claim.
- Rollback: restore prior domain configuration and edge host vars together.
  Prior app web version `757598ad-7684-484a-bb33-3fe1209b6e22`; prior edge
  `ac636378-5895-45e0-ad9c-296e4b496057`; prior apex Alpha version remains
  `3d5a5965-14f3-486a-a608-330d539dec81`. Worker code rollback alone does not
  restore Custom Domain ownership or deleted sign-in/sign-up path overrides.


## 2026-09-19 Member Beta production launch at beta.wtfhq.in + GTM

**Status:** LIVE. Owner-authorized production launch with dev Clerk retained
for now (swap to a production Clerk instance is a named later task).

- Source: `5c1d725` (launch) + `a91272d` (ledger) + `1fe862c` (domain fix).
- Code: member beta release is manifest-gated in every environment
  (`member-release.ts`, `member-router.ts` — the D1
  `member_beta_releases` row is the only gate; production is no longer
  hard-paused in code). Production edge config gains `OPS_HOSTNAME=
  beta.wtfhq.in`, `OPS_ORIGIN`, `OPS_ENVIRONMENT=production`, dev-instance
  `CLERK_ISSUER`/`CLERK_JWKS_URL`, `CLERK_AUTHORIZED_PARTIES=
  https://beta.wtfhq.in`, and the `WTFMEDIA_ALPHA_WEB -> wtfmedia-web`
  binding so member answers ride the public Alpha pipeline.
- D1 `wtfmedia-ops`: all 17 migrations were already applied. Backup
  bookmark `00000191-00000002-000050eb-d46dc45c25d837e3b9f780e3a683a368`
  taken before the owner-approved manifest flip:
  `member_beta_releases` now has `production = preview` (alongside
  `local = preview`). No staging row — staging enablement is unchanged.
- Secret: `CLERK_SECRET_KEY` (dev instance value) set on production
  `wtfmedia-edge`. Web continues to use the dev publishable/secret keys
  baked at build.
- Deploys: production edge `9c588d22-6587-4d12-ba02-b3b711f5efd2`;
  production web `0c8c9def-e097-4854-9d5e-15089348c685` then
  `4cdc0dd9-8f8e-4f4b-b659-326b2a033eff`.
- Incident: the first web deploy declared `routes` with only beta.wtfhq.in
  and Cloudflare replaced the dashboard-managed domain set, detaching
  wtfhq.in (522 for ~15 minutes). Owner approved the restore; the config
  now declares BOTH `wtfhq.in` and `beta.wtfhq.in` as custom domains so
  future deploys cannot detach the apex. Lesson recorded: routes in
  wrangler.jsonc replace the worker's full custom-domain set.
- GTM `GTM-NFGBT3QV` added to the root layout (beforeInteractive head
  snippet + noscript iframe); verified present in served HTML on wtfhq.in
  (2 refs) and beta.wtfhq.in (1 ref).
- Smoke: beta.wtfhq.in/sign-in 200, /beta 200, unsigned principal-context
  401, GET /api/chat 405; wtfhq.in / 200, /chat 200; beta-staging /beta
  200 unchanged. Suites: Cloudflare 396/397 (pre-existing
  `calendar.test.mjs`), web 232/232 + 97/97 + typecheck + lint.
- Same-day revision (owner-directed): the apex must not show the new sign-in
  or options. beta.wtfhq.in now serves from a NEW worker
  `wtfmedia-web-beta` (`232c11ac`, then `fa426c83` with the unified
  sign-in), while `wtfmedia-web` (apex) rolled back to pre-launch
  `3d5a5965-14f3-486a-a608-330d539dec81`. Sign-in is now ONE page — the
  member frame for every sign-in/sign-up flow (`acddf9f`, `1970e93`);
  bare /sign-in defaults to the member return. Verified: beta.wtfhq.in and
  beta-staging.wtfhq.in show the member frame; wtfhq.in keeps the old
  operator frame on the rolled-back build; beta /beta 200; apex /chat 200.
  Staging web redeployed as `ac77a9f2-b9a9-4397-b6c8-11195b41eab4`.
- 2026-09-19 launch fixes (owner-reported): production beta 403'd on every
  page — the auth layer (`principal-context.ts`, `member-context.ts`)
  hard-denied the production environment. Lifted (`3d41ba8`); the
  member_beta_releases manifest remains the only gate. Production edge
  `3d046bab-d8c9-477f-9d47-02a59cc205d8`. Staging overlay data was then
  copied into production D1 (backup bookmark
  `0000019a-00000000-000050eb-0c5bfa94d8e5579526d488d77f3593c0`):
  member_users/invitations/conversations/messages/audit/tombstones with
  original ids, operator `connect2nikhai` inserted as id 100 (FK remap),
  principal_profiles remapped by email, member ids remapped where open
  enrollment had already provisioned different prod ids (rpavun52
  staging 3 -> prod 1; sheshnarayan member staged 1 -> prod 11). Parity
  verified: 5/10/36/7 rows. Apex sign-in removal (owner chose 404): new
  stub worker `wtfmedia-apex-auth-404` (`15263cce-d061-430f-b555-3c0181dbed88`)
  serves 404 on `wtfhq.in/sign-in*` and `/sign-up*` via path-specific
  routes; zone-rule API was outside the wrangler token's scope. Verified:
  apex auth paths 404, apex / and /chat 200 unchanged.
- Roster fix: `/beta/settings/users` showed "operator roster unavailable" on
  beta production because the ops lane (`ops-router.ts:297`) requires the
  `OPS_ORIGIN_PROOF` secret to be configured; it had never been set on the
  production edge (staging already had it). Owner approved creating the
  secrets: `OPS_ORIGIN_PROOF` on production `wtfmedia-edge` and
  `WTFMEDIA_OPS_ORIGIN_PROOF` on `wtfmedia-web-beta` (fresh random value,
  same on both sides, not logged). Unsigned `/api/ops/operators` returns the
  same non-enumerating 404 on both environments; signed verification is with
  the owner in the browser.
- 2026-09-21 live Clerk swap (owner-provided live keys): production edge vars
  now point at `clerk.wtfhq.in` issuer/JWKS (`712be2d`), `CLERK_SECRET_KEY`
  set to the live secret on production `wtfmedia-edge`, beta web rebuilt with
  the live publishable key (`757598ad-7684-484a-bb33-3fe1209b6e22`), edge
  deployed `36572c34` then `ac636378-5895-45e0-ad9c-296e4b496057` with the
  member rebind fix (`86ce3e9`): an active member whose stored clerk_user_id
  belongs to the dev instance is rebound to the verified live identity on
  first login (audited, source issuer_rebind). Staging/local keep the dev
  instance. NOTE: `clerk.wtfhq.in` DNS was still NXDOMAIN at deploy time
  (authoritative check) — sign-in works only once the CNAME is actually live
  in the wtfhq.in zone. The web build bakes `.env.local` into one bundle, so
  a future staging web deploy would carry live keys; split or swap staging
  before redeploying it.
- Open follow-ups: the operator control-room
  release track (`release_manifests` / authenticated-chat) remains
  production-paused and untouched; the staging member-acceptance matrix
  (ISC-344) was never run and stays open.


## 2026-09-16 Follow-up anchoring fix and ask-wtf layout repair

**Status:** STAGING DEPLOYED from exact candidate `83bce50` on
`rag/alpha-answer-accuracy`. No push, PR, production, DNS, Clerk, D1, or
corpus change.

- Fix: chat follow-ups are now always reformulated against conversation
  history before retrieval, and moment-reel relevance is judged against the
  resolved query rather than the raw follow-up. Previously a bare follow-up
  ("give me all the timestamps") embedded weakly, retrieval drifted
  off-topic, and the sources panel rendered irrelevant episodes on a
  grounded answer. Regression test: `cloudflare/tests/public-chat-followup.test.mjs`.
- UI: the question-lattice stripe uses a fixed 306px period centered on the
  card so partial tiles split evenly on both edges instead of clipping
  purple-only on the right. On `/beta/chat` the rail no longer reserves a
  separate top band; the workspace header row carries the title and the
  hamburger in one row with a single divider.
- Verification: Cloudflare 394/395 (`calendar.test.mjs` fails identically on
  the clean tree — pre-existing, unrelated); web unit 232/232, contracts
  97/97, typecheck, lint, architecture freshness (648 inputs), and
  `git diff --check` pass.
- Deploys (owner-requested, staging only): edge
  `a70f22bb-54cc-4f54-bdf0-e1e071349cbd` and web
  `0c3e96f0-f97f-48de-a40d-36d44ac7ec1a`. Binding readback unchanged:
  staging D1, `WTFMEDIA_ALPHA_WEB -> wtfmedia-web`, staging Clerk vars on the
  edge; web keeps self-reference, `WTFMEDIA_EDGE -> wtfmedia-edge-staging`,
  IMAGES, ASSETS. Note: the named `wtfmedia` Wrangler profile is absent on
  this host; deploys used the default OAuth profile with the account
  explicitly pinned (`8f380cb5…fb46`, verified read-only first).
- Smoke: `/sign-in` 200, `/beta` 200, unsigned `/beta/api/context` 401, GET
  `/api/chat` 405, production `https://wtfhq.in/chat` 200 unchanged.
- Follow-up the same day: `2abcaf7` strips sources/moments entirely on cited
  abstentions (answer leads with "the excerpts contain nothing about X" while
  citing the misses) and adds a system-prompt rule against citing excerpts to
  describe what they miss; `84563cc` deepens the beta chat header row so its
  divider sits lower. Redeployed staging: edge
  `d65d5e39-39a0-4c11-9956-dfb89546f3a0`, web
  `d019af7e-3f83-475a-a52e-3eb5625bab29`; smoke 200/200/405, production
  unchanged. Suites: Cloudflare 395/396 (pre-existing `calendar.test.mjs`),
  web 232/232 + 97/97 + typecheck + lint.
- Owner-tested UI pass (`c0f3124`, pushed to `rag/alpha-answer-accuracy`,
  updating PR #48's head per the owner's explicit push instruction): beta chat
  header row and sidebar logo block share a 5.5rem band with one continuous
  full-width divider and vertically centered contents; empty-state card hugs
  content with a 32rem floor, vertically centered between divider and
  composer; composer widened to max-w-7xl (shared with public Alpha). Local
  beta proxy now strips content-encoding so `next dev` +
  `wrangler dev --env local` (staging D1/Vectorize/Alpha over remote
  bindings) renders the real workspace instead of failing closed on the
  decoded-but-labelled-gzip principal-context response. Deployed web staging
  `ab9565be-34f8-445a-95ae-dfb2be17ae95`; edge unchanged at
  `d65d5e39-39a0-4c11-9956-dfb89546f3a0`. Smoke: 200/200/405, production
  `/chat` 200 unchanged.
- Sidebar follow-up (`60d2b0e`): divider segment removed from the sidebar logo
  block and the logo left-aligned; divider spans only the content column. Web
  staging redeployed as `bc5373dc-a7ae-45b5-b542-495c14b63020`; smoke 200s,
  production unchanged.
- Sign-in follow-up (`ff9072c`): bare `/sign-in`/`/sign-up` default to the member
  return and light member frame; member sign-in copy is now "everything WTF
  runs on, one search away." with a pinned "Private workspace. WTF team
  only." footer and more space under the panel stripe. Web staging
  `8ac60096-37f7-423c-be37-afba2f8711a4`; smoke 200s, production unchanged.
- Presentation follow-up (`5938e6f`): member sign-in text block vertically centered
  (privacy note pinned bottom, nudged right); beta chat sidebar uses canvas
  cream. Web staging `534824c0-a9fd-4e72-9b65-6cddc23febb6`; smoke 200s,
  production unchanged. Local-note: Clerk dev sessions fail closed when the
  host clock drifts past ~5s (iat-in-future refresh loop) — resync NTP.
## 2026-09-16 Production Alpha edge deploy (owner-authorized)

- The owner authorized production deployment of the answer-pipeline fixes
  after confirming beta-staging member chat answers come from production
  Alpha through `WTFMEDIA_ALPHA_WEB` — the staging edge only owns auth/D1.
- Deployed source `1704c57` (plus doc receipts) to production
  `wtfmedia-edge`: new version `6ee67eba-7ffc-464e-9c1e-3b196afc0e2a`.
  Pre-deploy version `e9cd9a49-623c-4401-89fb-7d0c1d1e0e42` is the rollback
  target. Includes: follow-up reformulation anchoring, resolved-query moment
  enrichment, dynamic abstention classifier (ABSTAIN ships no
  sources/moments), tightened unsupported-topic verdict.
- Correction the same day (`72b6511`, owner-authorized for production): the
  tightened verdict misclassified partial answers with caveats, stripping real
  sources. ABSTAIN now requires that no part of the answer addresses the asked
  question. Production edge `dd1a3f08-b087-45a8-b93b-1d385443ce18`, staging
  edge `4e9205d1-a87e-4014-b0c7-781ff22a3c5c`; smoke 200s.
- Relevance gate (`8d8e7d4`): a fast model drops retrieved excerpts that do not
  genuinely discuss the asked topic before answer generation, so misspelled or
  broad queries return a simple no-information reply with no sources panel.
  No-information copy is now "Sorry, we don't have enough information about
  that in the catalogue — try a different question." Production edge
  `c9ea2779-95af-476b-8d3c-b53882f96cfc`, staging edge
  `f82b6db6-5c9f-428d-8e9a-f27a73881c28`; prod /chat 200. Cloudflare suite
  397/398 (pre-existing `calendar.test.mjs` only).
- Gate rollback (`2fca2ad`, owner-directed): the relevance gate dropped good
  chunks for answerable questions, so it was removed the same day. Retrieval
  is back to the score floor; weak moments now stay in the reel with honest
  star ratings instead of being filtered out. The abstention classifier
  remains. Production edge `3fccf3f6-9953-480a-a75b-a8bf5e470ae8`, staging
  edge `10b8a7c6-d596-433b-859c-403b94b7b9b3`; smoke 200s.
- Smoke: production `/` 200, `/chat` 200, GET `/api/chat` 405; staging
  `/beta` 200 unchanged. No D1, corpus, queue, secret, DNS, or web-worker
  change accompanied this deploy.

- Answer follow-up (`9e3d91c`): abstention is now decided by a fast model
  verdict (ANSWERED vs ABSTAIN), replacing the keyword-regex detector per the
  owner's direction. Absence answers ship with no sources/moments, so
  "nothing else was discussed?" no longer renders random episodes. Edge
  staging `b2fd6404-6ce2-428f-b90c-8d2561ca7ed8`; smoke 200s, production
  unchanged. Suites: Cloudflare 396/397 (pre-existing `calendar.test.mjs`),
  web 232/232 + 97/97.
- Classifier tightening (`1704c57`): "topic unsupported but here is what the
  excerpts cover" now classifies ABSTAIN. Edge staging
  `2bf4066a-c14c-4430-b5ca-f0847ab00211`. Production remains on the pre-fix
  pipeline — the owner's failing screenshot was the public surface, which is
  production unless taken on the staging hostname.
- Open: the composer "drag handle" pill from the owner report was not found
  in source (no `left-1/2`/handle element; both fixed composer wrappers
  already carry `lg:left-72`); needs a devtools selector to fix. Empty-state
  card dead space is a pending content decision (fill vs. shrink). Authenticated
  IAB re-check of the follow-up scenario and the member acceptance matrix
  (ISC-344) remain open.

## 2026-09-12 Issue #78 staging deployment and operator acceptance

**Status:** STAGING DEPLOYED; REAL OPERATOR IAB PASS; MEMBER ACCEPTANCE OPEN.

- The owner authorized IAB verification followed by staging deployment. Source
  `017e952bdf3ccb58367d489d4c76ab6f19ee320b` is pushed on
  `codex/issue78-chat-integration`; these receipt updates are documentation only.
- `wtfmedia-web-staging` serves `https://beta-staging.wtfhq.in` at 100% on
  version `35e29c22-9464-45f1-8943-d62e1471fb9b`, deployment
  `cfe5dda2-0344-4530-a64a-bf6cfc5c820b`. Service and secret bindings are
  preserved. No release branch, PR, tag, DNS, auth, schema, corpus, or queue
  changes accompanied this deployment.
- The first upload, `a62d3d31-4e92-46b0-9c0c-b736ce65c324`, returned HTTP 500:
  symlinked dependencies left a dynamic middleware-manifest require in the
  OpenNext bundle. Staging was restored to
  `b4e4ef19-2990-4f1b-bdf1-c9d8d8556792` and `/sign-in` returned 200.
  Local `npm ci` and a clean `.next`/`.open-next` rebuild fixed the failure
  without package, lockfile, source, configuration, or middleware changes.
  Both dependency trees now resolve inside this worktree as real directories.
- The rebuilt Worker passes local `/episodes` 200 and GET `/api/chat` 405,
  plus the Cloudflare build and staging dry run. Temporary Wrangler 4.131.1
  supported the configured compatibility date; the host's 4.124 emulator did
  not. Final live `/sign-in` and `/episodes` return 200; GET `/api/chat` is 405.
- Real Clerk/D1 operator IAB reopened an existing saved conversation. Markdown
  renders six bold spans, one list, and 24 episode citation links. At 1382x887
  the composer spans y795–871; at 320x710 it spans y622–694 and the final
  answer clears it by 31.875px. Question and answer share x32–284 on mobile.
  The title clamps to two lines, and neither viewport overflows horizontally.
- The live mobile operator menu spans x68.005–308.005; account/theme controls
  remain contained and Escape returns focus to the toggle. Fresh local member
  component QA separately verifies logout containment and outside dismissal.
  The authenticated document returned 200 with no failed requests, HTTP
  errors, or console errors during the final IAB checks.
- Inventory confirms unchanged staging Edge
  `71f8c529-1040-4248-8e36-351741fc4edb`, production Web
  `3d5a5965-14f3-486a-a608-330d539dec81`, and production Edge
  `ccd1d952-5be7-41c9-9275-f9d6b3b470a7`.
- ISC-344 remains open for real member acceptance and the broader persona
  matrix. The earlier 229 unit / 97 contract passes remain source evidence;
  those suites were not rerun during this deployment turn.

## 2026-09-12 Issue #78 private chat presentation repair

**Status:** REVIEWED LOCAL SOURCE AND COMPONENT QA PASS. No push, PR update,
merge, deployment, or authenticated staging acceptance occurred.

- Issue: [#78](https://github.com/Sheshiyer/wtfmedia/issues/78). Integration
  branch: `codex/issue78-chat-integration`, based on clean staged-source
  candidate `32c1c3f`. Reviewed code/test head: `e48e214`; this handoff and
  generated architecture receipts are documentation successors.
- Terra high extracted `ChatAnswerMarkdown` from Alpha's existing renderer.
  Public Alpha, the shared member/operator Beta workspace, and the legacy
  operator answer view now preserve the same Markdown and episode-citation
  semantics. User questions remain plain text; rich source sheets remain
  unchanged. Legacy operator citation mapping retains explicit episode IDs
  and never infers identity from URLs.
- Luna medium constrained the shared Beta workspace to the dynamic viewport,
  kept the private composer fixed while messages scroll, retained user and
  assistant messages in the reading column, and bounded long titles to two
  lines while retaining the full accessible text. Public Alpha and legacy
  operator automatic composer behavior remain intact.
- Menu utilities now wrap inside the bounded scrollable disclosure. Its
  logout and theme controls stay inside the panel, including at narrow widths.
- GPT-5.3 Spark completed read-only GitHub and file-scope processing after its
  initial quota/context failures. It confirmed issue #78 remains open and
  PR #77 remains `beta_0.1` into `release/beta`, with head
  `7ec8298664a40b7b138f2b8d042d89858645cb67`.

### Verification

- Full web unit suite: **229/229**. Contracts: **97/97**.
- TypeScript, ESLint, Next production build (**89 pages**), architecture
  freshness (**637 inputs**), and `git diff --check` pass.
- Privacy scan: **0 violations across 401 files**.
- Independent Terra high QA used the Codex in-app browser and inspected real
  component screenshots at **320x710** and **1382x887**. Composer bottoms were
  **694.01px** and **871.28px**, respectively; final story messages remained
  clear of the composer with no horizontal overflow. This is bounded
  component evidence, not proof of an authenticated route.
- Menu logout controls stayed inside the panel at both widths. Escape restored
  focus to the toggle; outside click dismissed the menu. Markdown headings,
  lists, and episode links rendered correctly; final browser checks had no
  console errors.

### Remaining acceptance and pickup

The canonical staging IAB redirected `/beta/chat` to sign-in. **ISC-344 and
issue #78 remain open for exact-candidate real member/operator verification
after a separately authorized staging deployment.** The prior broader persona
matrix remains open. No fake authenticated route, preview, or production data
was used to satisfy acceptance.

Review the bounded patch with
`git diff 32c1c3f..codex/issue78-chat-integration`. Preserve the dirty primary
checkout and the existing source branches. This repair does not advance
`beta_0.1`, PR #77, PR #48, a release tag, or any deployment.

## 2026-09-12 Final Beta staging gates and signed-out repair

**Status:** FINAL SOURCE/STAGING/VIEWPORT/SIGNED-OUT/ROLLBACK/RELEASE-POLICY
GATES VERIFIED; MULTI-PERSONA IAB MATRIX STILL OPEN.

- Exact source candidate `409a8ae205c515e453477703bc2342744231006d`
  passes Edge 388/388, web unit 225/225, web contracts 97/97, TypeScript,
  ESLint, 89-page OpenNext build, privacy 0/400, architecture freshness across
  631 inputs, and `git diff --check`.
- Beta no longer exposes an ingest capability, navigation item, protected
  policy, or reachable ingest UI. The direct Beta ingest URL fails closed.
  Alpha `/ops/ingest`, retrieval, inference, citations, timestamps, and rich
  moment behavior remain unchanged.
- Final staging is Edge `71f8c529-1040-4248-8e36-351741fc4edb` and Web
  `b4e4ef19-2990-4f1b-bdf1-c9d8d8556792`. Edge is runtime-equivalent to
  candidate `409a8ae` from `2c04bc2` because the later source change affects
  only Web logout and release evidence. Health still names staging and
  `alpha_public_api`.
- Authenticated super-admin IAB verifies the Alpha-derived chat, grounded
  citation header, rich source sheet, moment playback/export, persisted owner
  history, archive actions, long-title clamping, drawer focus return, composer,
  and zero horizontal overflow at 1382x887, 1382x1180, and 320x710.
- Acceptance exposed an inert logout fallback caused by client bundle-time
  configuration. The final Web repairs it by invoking the browser Clerk
  session, clearing only protected local caches, and using truthful recovery on
  provider failure. Live logout redirects to `/sign-in`; direct navigation to
  the prior protected chat exposes no private conversation or chat composer.
- Edge rollback moved accepted `67e93676-8519-4e33-8b7b-83b45fa975a8` to
  predecessor `91b2fc7a-f657-4dd1-a66d-4f3c50ad7b21` and back. Web rollback
  moved final `b4e4ef19-2990-4f1b-bdf1-c9d8d8556792` to predecessor
  `d098c2ce-fd70-4540-bad3-cc547a8f276d` and back. Health and public Alpha
  remained reachable; D1 and corpus state were not rolled back or mutated.
- The separately authorized versioned Edge deployment removed inert staging
  `INGEST_TOKEN`; final secret-name readback omits it. `/v1/admin/enqueue` and
  `/beta/preview` remain absent.
- Owner reconciliation preserves remote `v0.3.3-beta.2` immutably at
  `66f434ab152fd2776c961aed21926e76b5df9204`. Its packages declare
  `0.3.3-beta.1`; it is historically inconsistent provenance, not the current
  Beta or a deployment receipt. Do not delete, move, reuse, or reinterpret it.
- Beta 0.1 keeps operator history Archive-only. Permanent Operator Delete is
  unavailable until detach/tombstone, audit, saved-memory, and anti-resurrection
  contracts receive a separate review.
- Production remains Edge `ccd1d952-5be7-41c9-9275-f9d6b3b470a7` and Web
  `3d5a5965-14f3-486a-a608-330d539dec81`. PR #48, PR #77, `beta_0.1`, DNS,
  Clerk configuration, production data, corpus, and tags were not changed.

**Next action:** the IAB is intentionally signed out. Sign in as real Member A,
then complete Member B, editor, admin, and an audited suspended/revoked staging
identity. Do not update `beta_0.1` or PR #77 until that matrix passes.

## 2026-09-12 Beta Alpha-overlay staging acceptance checkpoint

**Status:** SOURCE/BUILD VERIFIED; DEPLOYED TO BETA STAGING; GROUNDED
SUPER-ADMIN IAB ACCEPTED; FULL PERSONA/VIEWPORT/ROLLBACK ACCEPTANCE OPEN.

- Exact runtime candidate
  `748c0e4e8d732b5ecdbd3cda572c8bd67f2a32d6` makes Alpha the sole corpus,
  ingest, retrieval, inference, grounding, citation, timestamp, and enriched-
  moment authority. Beta adds only Clerk identity, D1 admission/RBAC/admin, and
  owner-scoped conversations, messages, sessions, history, and lifecycle.
- The Beta Edge sends a bounded conversation to Alpha's existing public
  `/api/chat` contract through `WTFMEDIA_ALPHA_WEB -> wtfmedia-web`, validates
  its public answer/source/moment metadata, and persists that sanitized
  projection in staging D1. It never sends Clerk credentials, D1 owner IDs,
  saved memory, secrets, or internal transcript text to Alpha.
- Source verification passes: Edge 387/387, web unit 220/220, web contracts
  96/96, TypeScript, ESLint, OpenNext production build (89 pages), privacy
  0/400, architecture freshness across 630 inputs, and `git diff --check`.
- Before the only current D1 schema change, Time Travel returned bookmark
  `0000006b-00000000-000050e3-0bb7072294902e18dbbd945231ef35dc`.
  Wrangler applied only `0016_rich_chat_source_metadata.sql` to
  `wtfmedia-ops-staging`; no corpus or ingest data was created or copied.
- Only the changed staging Edge was deployed: version
  `67e93676-8519-4e33-8b7b-83b45fa975a8`. Staging Web remains
  `cbc25bba-c2a1-436f-8612-11813dbd3946` because the accepted UI was already
  deployed and unchanged. Health reports `inferenceService=wtfmedia-web` and
  `corpusAuthority=alpha_public_api`.
- Wrangler resource readback names only `DB=wtfmedia-ops-staging` and
  `WTFMEDIA_ALPHA_WEB -> wtfmedia-web`, alongside bounded staging auth/
  environment variables. The staging Edge has no AI, Vectorize, R2, KV, queue,
  or ingest resource and does not expose `/v1/chat` or `/v1/admin/enqueue`.
  Version readback still lists a legacy inert `INGEST_TOKEN` secret; removing
  it requires a separate owner-approved credential task.
- Independent QA found the preceding `5229f99` / Edge
  `91b2fc7a-f657-4dd1-a66d-4f3c50ad7b21` receipt misclassified grouped Alpha
  citation markers as ungrounded. It remains historical in the deployment
  chain and is not final grounded acceptance. The final fix reuses Alpha's
  canonical grouped-citation parser.
- Live authenticated Codex IAB as the existing super-admin created and reloaded
  a new owner-scoped `cnv_*` conversation. The grounded answer and rich source
  sheet render with no abstention/fallback label and remain correct after
  reload. Per-episode `N cited` badges count Alpha-cited excerpts, not the
  separate editor moment rows below them. Desktop 1382x887 and mobile 320x710
  had no horizontal overflow. `/beta/admin/users` rendered the live D1 roster
  and `super_admin` role.
- Production Edge `ccd1d952-5be7-41c9-9275-f9d6b3b470a7` and Web
  `3d5a5965-14f3-486a-a608-330d539dec81` remain unchanged. No production
  deployment, DNS, Clerk, tag, corpus, queue, or data mutation occurred.
- PR #48 and PR #77 remain untouched. The owner-approved review delivery is a
  clean new `codex/*` remote branch at the exact final documentation head, not
  `rag/alpha-answer-accuracy` or `beta_0.1`. Do not advance PR #77 until all
  remaining gates pass; never force-push.

**Owner decision superseding earlier entries:** Beta must not have a separate
corpus or ingest/bootstrap path. Any later-in-file instruction to populate
staging R2/KV/Vectorize, load `STAGING_INGEST_TOKEN`, or run the deleted
bootstrap script is historical and must not be executed.

**Next action:** complete signed-out, Member A/B, suspended, editor, admin, and
super-admin IAB acceptance; verify 1382x1180 on this exact candidate; rehearse
rollback; reconcile `v0.3.3-beta.2`; then decide whether the accepted SHA may
advance `beta_0.1`/PR #77. Operator permanent Delete remains a separately
reviewed lifecycle decision. Separately authorize removal of the inert staging
`INGEST_TOKEN` secret.

## 2026-09-12 Beta rich-citation source-sheet repair (superseded)

**Status:** HISTORICAL CHECKPOINT; SUPERSEDED BY THE ALPHA-OVERLAY OWNER
DECISION ABOVE. The
authenticated Beta answer path now preserves the existing Alpha editor-sheet
moment projection instead of reducing every answer to the compact citation
fallback.

- Public Alpha and authenticated Beta use one moment pipeline for adjacent
  transcript ranges, duration budgeting, enrichment, and truthful fallbacks.
- Member and operator answers persist the excerpt-free public moment projection
  plus cited indices; safe browser parsers accept current persisted camelCase
  and public-header snake_case shapes and fail closed on malformed values.
- The shared source panel receives the originating question, exact citation
  indices, effective source mode, and moments. Rich answers show unique cited
  episode count, grouped moment ranges, play links, topic, confidence/strength,
  summary, relevance rationale, and Excel export. The export header stacks at
  narrow widths instead of clipping.
- Edge `381/381`, web unit `220/220`, web contracts `96/96`, TypeScript, ESLint,
  production build, focused Grouped Moments Storybook interaction, architecture
  freshness across 625 inputs, and `git diff --check` pass.
- Exact runtime candidate `25019a373dbb4829f759de8b1bea00f01635eb6d`
  is deployed only to the isolated Beta staging pair: Edge version
  `a68b4793-ed57-4c1c-8436-2e574ccdb192` and web version
  `cbc25bba-c2a1-436f-8612-11813dbd3946`. Wrangler readback names only the
  staging D1/R2/KV/Vectorize/queues and the staging Edge service binding.
- Pre/post deployment readback leaves production Edge version
  `ccd1d952-5be7-41c9-9275-f9d6b3b470a7` and production web version
  `3d5a5965-14f3-486a-a608-330d539dec81` unchanged. `/beta/preview` remains
  `404` on both staging and production.
- IAB confirmed the rich shared component at desktop and 390x844. That fixture
  is presentation evidence only, not Beta acceptance. Real authenticated IAB
  then created a new owner-scoped conversation as the existing super-admin,
  observed the truthful no-evidence fallback, and reloaded the persisted turn
  at 1382x887, 1382x1180, and 320x710 with zero document-width overflow. The
  browser recorded no errors; only Clerk's expected staging development-key
  warning appeared.
- This checkpoint observed no separate staging corpus and proposed a bounded
  bootstrap. That proposal is rejected by the later owner decision: Alpha is
  the sole evidence/inference authority, the bootstrap script was removed, and
  no staging ingest credential is required, permitted for use, or sufficient
  for Beta acceptance. A legacy inert secret remains attached pending a
  separate owner-approved credential cleanup.
- Existing persisted answers without moment metadata remain on the truthful
  compact source fallback; no synthetic topics, ranges, ratings, or rationale
  are reconstructed in the browser.

**Superseded next action:** do not load `STAGING_INGEST_TOKEN`, populate a Beta
corpus, or run a staging bootstrap. Use the current Alpha-overlay checkpoint
above.

## 2026-09-11 Continuity checkpoint (fleet alignment)

### Done

- Staging runtime mapping is pinned to source `f6bbf58`
  (edge `427b1ea7-4e2a-4a8e-86c1-1920c0741e6c`, web
  `3668390f-1dc8-438e-9dab-19c331b732ce`).
- Alpha-derived Ask WTF composition is retained under current Beta route/security
  rails. PR #48’s intended chat/retrieval/citation/persistence behavior is
  preserved while PR #48 remains unchanged.
- PR #77 is the only approved beta promotion lane and may advance only from the
  exact staging-accepted final SHA or a separately receipted runtime-equivalent
  artifact.

### Remaining

- Signed-out, member A/B, suspended, editor, admin, and super-admin matrices
  across desktop and mobile.
- Grounded staging acceptance (later closed through the Alpha overlay; no Beta
  corpus was populated).
- Rollback rehearsal and `v0.3.3-beta.2` tag/lineage reconciliation.
- Operator Archive-versus-Delete policy closure.

### State

- This work has no new live gate passes claimed beyond bounded deployment and
  partial IAB observations.
- Local docs head prior to this fleet is `078f582`; it is not staging-accepted.
- `/beta/preview` and synthetic/fake browser data are non-authoritative.

## 2026-09-11 Beta settings and session-service mapping repair

**Status:** SOURCE-VERIFIED AND DEPLOYED TO BETA STAGING; SUPER-ADMIN IAB OBSERVED.
This is a bounded staging receipt and does not complete full persona acceptance
or production authorization.

- Exact code candidate `f6bbf584fa5c9a07cc218f0211f3c5020bb4f3f7`
  maps Account to the existing Clerk logout control, maps Memory to the real
  owner-scoped immutable preference/custom-instruction lifecycle, and maps
  Sessions to active plus archived owner history.
- Duplicate operator “sessions & history” and “memory governance” navigation
  entries are removed. Their legacy URLs redirect to the canonical member-tier
  Settings pages; release/users/audit remain capability-gated additions.
- Conversation list/get reads retry one transient network/401/502/503/504
  failure and expose truthful account-verification versus staging-service
  copy. The same super-admin session loaded history after deployment, so the
  reported drawer warning was not a missing D1 operator mapping.
- Edge list endpoints accept `includeArchived=1` while default chat drawers
  remain active-only. The canonical Sessions page shows lifecycle state and
  Archive. Member Delete uses the existing confirmation and tombstone-backed
  API. Operator Delete remains held because no reviewed operator deletion
  schema or tombstone contract exists.
- Source verification: Edge 380/380, web unit 219/219, contracts 96/96,
  typecheck, lint, OpenNext production build (89 pages), privacy 0/400,
  architecture freshness across 625 inputs, and `git diff --check` pass.
- Staging versions are edge `427b1ea7-4e2a-4a8e-86c1-1920c0741e6c` and web
  `3668390f-1dc8-438e-9dab-19c331b732ce`. IAB confirms the history drawer,
  account logout, canonical Preferences form/empty ledger, and Sessions list
  with two active conversations. No lifecycle or preference write was used as
  QA evidence. Production, DNS, Clerk configuration, and data were untouched.
- GitHub still has PR #48 from `rag/alpha-answer-accuracy` to `main` and PR #77
  from `beta_0.1` to `release/beta`. Do not push the checked-out branch by
  name. After remaining staging acceptance, fast-forward the exact staging
  accepted final SHA (or a separately receipted runtime-equivalent artifact) to
  `beta_0.1` with `HEAD:beta_0.1`; this updates PR #77 without repurposing PR
  #48. Force-push is forbidden.

**Historical next action, superseded:** finish the real persona/viewport matrix
and rehearse rollback. The proposed staging-corpus step is dropped; use the
Alpha-overlay checkpoint above. Do not advance PR #77 before all remaining
gates pass. Operator permanent Delete remains separately reviewed.

## 2026-09-11 Beta staging signed-in workspace repair

**Status:** SOURCE-VERIFIED AND DEPLOYED TO BETA STAGING. Two independent
authenticated super-admin IAB passes confirm the reported presentation/navigation/roster
regressions are repaired. This is not full staging acceptance and is not a
production-Beta deployment.

- Exact code candidate `32ec582d9ab953413710832c62e773eb212c00e1` replaces
  the member/operator presentation fork with one accepted Alpha-derived chat
  frame and typed adapters for the separate `mcnv_*` and `cnv_*` stores.
- Same-session Beta navigation retains the verified principal, rechecks route
  capabilities locally, and no longer shows the full-screen workspace-opening
  card on every page load. Protected content remains withheld until admission.
- Chat and Settings omit the obsolete bottom dock; operator navigation contains
  no ingest destination. Settings hides Readiness, AI Route, YouTube Analytics,
  RAG & Sources, and duplicate Release Mutation while preserving direct
  server-policy enforcement.
- `/beta/admin/users` proxies the authenticated Clerk request through the web
  service binding to the D1-backed edge roster. No prefabricated roster or
  private row content was added to source.
- Source checks pass: Edge 380/380, web unit 205/205, web contracts 96/96,
  typecheck, lint, OpenNext build (89 pages), privacy 0 violations across 399
  files, architecture freshness across 623 inputs after this checkpoint, and
  `git diff --check`.
- `wtfmedia-web-staging` version
  `b67a0833-3eda-4c53-b6ed-056969200350` serves `32ec582` on
  `beta-staging.wtfhq.in` with `ASSETS`, self-reference, and only the
  `wtfmedia-edge-staging` service binding. Edge version
  `3b4aa27f-6c62-4077-a432-897f10002039` was not redeployed.
- Two independent live IAB passes confirm the shared chat frame, persisted operator conversations,
  clamped cards with zero document-width overflow, no ingest or bottom dock,
  reduced Settings, and the real operator roster. Operator conversation and
  roster endpoints returned 200 with no HTTP 4xx/5xx observed. Only the existing
  super-admin was observed; the full persona and viewport matrices remain open.
- The visible no-evidence answer was truthful for this historical runtime.
  The later owner decision closes its former corpus blocker by routing Beta to
  Alpha's canonical public chat authority; no Beta corpus is permitted.
- Permanent Delete remains implemented for member conversations only. Operator
  conversations expose Archive because the operator server store has no
  reviewed delete/tombstone capability; this is an explicit release gap.
- No production Worker, Beta production hostname, D1, corpus, queue, Clerk,
  DNS, secret, or public Alpha state was changed. No branch was pushed because
  this local branch is the head of PR #48 and remote topology remains
  owner-gated.

**Historical next action, superseded:** complete the persona/viewport matrix,
decide the operator Delete contract, rehearse rollback, and use a clean remote
candidate branch. The separate staging-corpus plan is dropped.

## 2026-09-11 Beta 0.3 lineage correction; UI repair paused

**Status:** READ-ONLY LINEAGE AND LIVE-STATE AUDIT COMPLETE. The user's latest
direction pauses UI fixes. No code fix, build, commit, push, deploy, tag, data
copy, ingest, Clerk change, DNS change, or production mutation was performed by
this audit.

- There is no single latest Beta object. `v0.3.3-beta.2` peels to older `main`
  `66f434a` and is not an ancestor of `origin/release/beta` `498c0e0`.
  `origin/beta_0.1` `7ec8298` is PR #77 on top of that release branch.
  Pavun57's RAG head is `d4e45b4`; local merge `d3b4590` combines it with PR
  #77; staging source `abb5413` adds later host/runtime closure. Local manifests
  say `0.3.3-beta.3`, but beta.3 is not a tag.
- The already-corrected signed-in chat UI is present in `beta_0.1` through the
  Member/Alpha convergence commits. Later commit `cab6773` maps member
  principals to `MemberChatWorkspace` but operator principals to the older
  operator `ChatWorkspace`. The current super-admin screenshot is the latter.
  This is a role-to-presentation mapping regression, not missing prior work.
- Live canonical IAB now resolves and authenticates the existing super-admin.
  It proves operator landing and persistence/reopening of two owner-scoped
  `cnv_*` conversations. It does not close the remaining member/editor/admin/
  suspended persona matrix or viewport acceptance.
- The ungrounded response was not evidence that persistence was disconnected.
  This historical audit predated the owner-approved Alpha overlay; its proposed
  separate staging-corpus operation is superseded and must not be performed.
- The authoritative audit is
  `.planning/inputs/2026-09-11-beta-0.3-lineage-and-surface-authority-audit.md`.
  A future implementation must reuse the existing Member/Alpha presentation
  through typed member/operator adapters, keep owner stores and RBAC intact,
  and retain Pavun57 backend inference symbols. Do not start a third chat UI.

**Historical blockers, since updated above:** complete persona and viewport
acceptance, release-history/tag decision, remote delivery, rollback, and all
production gates. The Alpha-overlay checkpoint closes the former UI/adapter,
operator-roster, and separate staging-corpus items for the observed
super-admin path only.

## 2026-09-11 Beta 0.1 integration evidence and promotion checkpoint

**Status:** EXACT CANDIDATE DEPLOYED TO STAGING; AUTHENTICATED IAB ACCEPTANCE
AND ROLLBACK REMAIN OPEN. Production was not changed.

### 2026-09-11 canonical staging deployment receipt

- Exact candidate `abb5413` adds the canonical host contract and truthful edge
  health identity. It passes Edge 380/380, web unit 197/197, web contracts
  96/96, typecheck, lint, production/OpenNext build, privacy, architecture
  freshness across 620 inputs, and `git diff --check`.
- Before migration, D1 Time Travel returned a recovery bookmark and inventory
  showed `0012`–`0015` pending. Those four reviewed migrations applied to
  `wtfmedia-ops-staging`; post-apply inventory is empty and readiness tables,
  the active super-admin mapping, principal-profile mirrors, and staging
  `preview` release state read back successfully.
- `wtfmedia-edge-staging` version
  `3b4aa27f-6c62-4077-a432-897f10002039` reports its staging environment,
  service, and index truthfully and has only staging data/queue/auth bindings.
- `wtfmedia-web-staging` version
  `00cfe1b4-161e-4c86-addf-dd3894085d3d` owns the
  `beta-staging.wtfhq.in` Custom Domain, `ASSETS`, self-reference, and only the
  `wtfmedia-edge-staging` service binding.
- Cloudflare authoritative DNS, exact-host TLS, `/` to `/beta`, signed-out
  `401`, and edge health pass. That deployment receipt ended while Codex IAB
  retained the pre-activation NXDOMAIN; the later lineage audit above
  supersedes it with a real super-admin observation. The full persona,
  viewport, and rollback matrices remain unaccepted. Never substitute the
  `workers.dev` diagnostic URL.
- Production Workers, bindings, D1, queues, DNS, Clerk, and traffic were not
  changed; their latest deployment histories remained unchanged.

### Verified source facts

- The host-visible integration is local merge
  `d3b4590fb86966b2a3b4c69ab2c8fea9aa0a8b7a` on
  `rag/alpha-answer-accuracy`, with parents
  `d4e45b44f3527b768408069f191951c2c3f492cb` and
  `7ec8298664a40b7b138f2b8d042d89858645cb67`.
- Bounded source closure is committed as `79a0285` (operator chat/RBAC runtime
  fixes), `b7f5bec` (release workflow, version, and deterministic migration
  guards), and `2c4007d` (planning plus generated architecture). That SHA is
  the superseded pre-precedence source checkpoint, not the current candidate.
- Owner precedence refinement is preserved in staging candidate `abb5413`.
  Current convergence work remains
  authoritative for UI, canonical Beta/Ops routes, Clerk/auth landing/return,
  navigation pill, RBAC, admin, and Settings. Pavun57 PR #48/#49 intent leads
  chat, inference, retrieval/accuracy, and backend chat behavior.
- The user-reported `3eebf57` object is unavailable in this checkout. Do not
  substitute it for `d3b4590`, and do not call either SHA deployed without an
  environment receipt.
- At exact candidate `abb5413`, Edge 380/380, web unit 197/197, web contracts
  96/96, TypeScript, lint, production/OpenNext build, privacy with zero
  violations across 396 files, architecture freshness across 620 inputs, and
  `git diff --check` pass. These are source/build evidence only.

### Historical reports and still-open acceptance

- The earlier user report of local full-stack behavior and remote D1 migrations
  remains historical context. Independent named-profile receipts now establish
  actual staging migration/deployment state. The earlier report provides no
  production evidence. Authenticated staging IAB is now partial and failing,
  not accepted: one super-admin passed identity/landing/history persistence
  while the presentation fork and empty evidence plane blocked completion.
- Root, web, and edge source manifests use the next unused candidate version,
  `0.3.3-beta.3`. Remote `v0.3.3-beta.2` already exists and peels to `66f434a`,
  while its release note says it was neither a tag nor a deployment receipt.
  Treat that as an unresolved release-history gate; do not move, delete, reuse,
  or silently reinterpret the historical tag.
- GitHub reports PR #77 still open from `beta_0.1` into `release/beta`; PR #48
  remains open from `rag/alpha-answer-accuracy` into `main`. The local branch
  is ahead of its remote. A push would materially repurpose PR #48,
  so no remote branch or PR was changed without an explicit topology decision.
- The literal GitHub account `pavun` has no repository submissions; repository
  evidence resolves the owner's shorthand to PR author `Pavun57`. PR #48 head
  `d4e45b4` is already an ancestor. PR #49's prior-message forwarding,
  90/75-second budgets, local-secret ignore, and visible match-confidence intent
  are preserved in the evolved candidate without reverting the current UI.

### Governing release boundary

- The release checklist is
  `.planning/inputs/2026-09-11-beta-0.1-production-readiness-checklist.md`.
  It requires committed post-merge runtime and release/migration source fixes,
  an exact candidate SHA, an exact source-test rerun,
  staging backup/migrations/bindings/paired deploys, and the real Clerk/D1 IAB
  persona matrix at 1382x887, 1382x1180, and 320x710.
- Beta preserves one authenticated shell: `/beta` resolves the edge principal;
  members use `/beta/chat`; operators use `/beta/workspace` for the control
  room; both admitted principal kinds may use `/beta/chat` for their role-safe,
  owner-scoped history view inside the same Beta gate/AppShell. Settings stays
  under `/beta/settings/*`; `/beta/ops/*` is redirect-only compatibility;
  public Alpha `/chat` remains separate. Clerk establishes identity, while edge
  policy and D1 lifecycle/RBAC decide authority.
- Production remains a new owner-authorized action with distinct production
  Clerk, D1 backup/migration, exact edge/web/domain/traffic, smoke, and
  rollback receipts. Provider/YouTube persistence, scheduled jobs, long-context
  compaction, and full Alpha alignment are explicit deferrals, not omissions to
  be filled by a release claim.

### Next action

**Superseded by the 2026-09-12 checkpoint above.** Continue the real Clerk/D1
persona, remaining viewport, and rollback matrix against the Alpha overlay;
do not provision a Beta staging corpus. Resolve the historical
`v0.3.3-beta.2` tag and keep Clerk, production infrastructure, production data,
and production traffic unchanged without fresh owner authorization.
## 2026-09-11 Beta single-shell RBAC convergence checkpoint

**Status:** LOCAL SOURCE AND BUILD VERIFIED through `00e8267` — no remote
branch, PR, merge, deployment, Clerk configuration, D1 migration, provider
configuration, corpus mutation, DNS change, or production Alpha state changed.

### Delivered source contract

- `/beta` resolves one authenticated edge principal: members land in
  `/beta/chat`; operators land in `/beta/workspace` for the control room. Both
  admitted principal kinds may open `/beta/chat` for their role-safe,
  owner-scoped history view inside the same Beta gate/AppShell. The canonical
  nested Settings and administration routes are capability-scoped.
- Edge policy is the route authority. Operator records take precedence over
  historical member rows, inactive operators deny, profile mirrors do not
  grant authority, unknown paths fail closed, and the browser-navigation
  contract checks its destinations against that policy.
- `/beta/ops/*` is redirect-only compatibility. `/ops/*` and public `/chat`
  remain legacy Alpha surfaces. No Beta `public_link` fallback remains.
- Member and operator conversation stores remain independently owner-scoped;
  client URLs retain only prefixed conversation UUIDs. Session cards expose
  Archive and separately confirmed permanent Delete.
- Legacy operator `cnv_` links redirect from public `/chat/*` into protected
  `/beta/chat/*`. Server projections strip owner, request, and idempotency
  identifiers from browser chat DTOs, and privileged roster roles receive no
  cross-operator private-chat access.
- AI Route and YouTube Analytics are explicit non-persisted local previews;
  they do not configure providers, analytics, or inference.

### Local receipts

- Cloudflare tests: 267/267 passing.
- Web unit tests: 162/162 passing; web contracts: 92/92 passing.
- Web typecheck, lint, production build, architecture check, and privacy scan
  passed; the privacy scan reported zero violations.

### Still unaccepted

- No reviewed source has been deployed to staging and no new D1 migration has
  been applied remotely. The deployed staging surface cannot validate this
  checkpoint.
- Real Clerk/D1 IAB acceptance remains required for signed-out, Member A,
  Member B, suspended/revoked, editor, admin, and super-admin personas at
  desktop and mobile. That matrix must separately record deployment versions,
  metadata-only D1 readiness, observable UI/API behavior, and owner approval.
- Production Alpha remains untouched. A green local suite is not a staging or
  production release claim.

### Next owner-authorized action

Review the local source diff, then authorize a named staging deployment and
migration only if the reviewed commit is selected. Run the real IAB matrix
against that exact staging receipt before requesting Beta acceptance. Do not
deploy production or mutate production data under this checkpoint.

## 2026-09-11 v0.3.3-beta.2 Alpha-bedrock release-candidate checkpoint

**Status:** LOCAL RELEASE CANDIDATE VERIFIED — no remote branch, PR, merge,
deployment, Clerk, D1, Cloudflare resource, corpus, or Public Alpha state was
changed. `codex/beta-chat-refinement` is descended from `origin/release/beta`
and contains the source-only candidate.

### Delivered in this candidate

- `7bea241` exports `ConversationThreadFrame`, preserving public Alpha's
  overflow-aware fixed-to-inline composer behavior while leaving its caller
  contract intact.
- `47e1464` adds reverse keyset member-message pages (newest 50 in chronological
  order), owner-bound cursors, an immutable content-free delete receipt, and a
  safe linked-preference count.
- `bb1eaa1` requires literal `DELETE` in the member deletion dialog, keeps
  active titles wrapping, and retains two-line clamp only in the session rail.
- `6082c6d` makes Member Beta consume the Alpha frame, loads older message pages
  into that frame, retains loaded history on new answers, and shows the safe
  preference count before confirmed deletion.
- `2293b47` prepares the source-only `0.3.3-beta.2` release-candidate note;
  `docs/architecture/*` was regenerated to the final source graph.

### Verified locally

- Cloudflare: 254 passing tests, including owner isolation, reverse message
  paging, cursor rejection, bounded prior turns, deletion audit receipts,
  safe preference retention, and no resurrection.
- Web: 150 unit and 90 contract tests passing; typecheck, lint, production
  build, and privacy scan (0 violations across 360 bounded files) pass.
- Architecture ledger and `git diff --check` pass. This proves source/build
  behavior only, not a deployed staging or production runtime.

### Intentionally not claimed or changed

- The existing authenticated staging IAB page still serves an earlier deployed
  build and showed the unavailable-session defect at review time. No destructive
  control was clicked. It cannot validate this candidate until an owner
  separately authorizes deployment and the real Clerk/D1 persona matrix.
- No automatic context compaction/summarization was added. Server inference
  remains bounded to the latest eight prior turns / 8,000 characters; durable
  checkpoint policy and failure handling remain a separately designed release
  gate.
- Signed-out, Member A, Member B, suspended/revoked, editor, admin, and
  super-admin staging acceptance remains open. Existing source RBAC tests are
  deterministic but not a substitute for that live matrix.

### Next owner-authorized actions

1. Review the local candidate diff and create a clean PR to `release/beta`.
2. Merge only after review; do not merge `rag/alpha-answer-accuracy` wholesale.
3. Authorize a named staging deployment, then run the real authenticated IAB
   persona and 1382px layout matrix.
4. Keep production Alpha's worker/resource pair untouched unless a distinct
   production release is authorized.

## 2026-09-11 Alpha-bedrock / Beta modular convergence execution checkpoint

**Status:** LOCAL SOURCE AND BUILD VERIFIED — no deployment or remote state was
changed. The isolated `codex/beta-chat-refinement` branch now contains the
bounded convergence slice. It is ready for an owner-authorized staging
acceptance wave, not a release claim.

### Commits in this checkpoint

- `53ef445`: adds the confirmed owner-scoped permanent-delete contract and
  migration `0012_member_chat_deletion.sql`. It erases the selected
  conversation and messages, retains immutable minimal deletion/provenance
  tombstones, detaches but does not delete separately saved preferences, and
  blocks replay of the original create idempotency key.
- `6811564`: replaces the ambiguous session control with direct `archive
  conversation` and separately labelled `delete` actions. Delete is a
  focus-managed confirmation dialog whose copy makes the irreversible storage
  effect and saved-preference boundary explicit.
- `66d79b6`: adds the committed Alpha/Beta inference-retrieval capability
  ledger and a fail-closed lower-case named-guest retrieval adaptation.
- `0df461f`: restores Alpha chat-frame rules in shared UI: Ask routes have no
  bottom dock, the Alpha hamburger remains the disclosure, and member Settings
  is one additive gear inside it. The member selected-route states now share a
  bounded conversation viewport with retry/new-question recovery.

### Local receipts

- `npm --prefix cloudflare test`: 253 passing tests, including confirmed
  permanent deletion, owner isolation, anti-resurrection, archive-generation
  race handling, role policy, release policy, and retrieval source contracts.
- `npm --prefix web run test:unit`: 144 passing tests.
- `npm --prefix web run test:contracts`: 90 passing tests.
- `npm --prefix web run typecheck`, `lint`, and `build`: pass; the build
  enumerates the existing public, member, and operator routes.
- `npm --prefix web run test:privacy -- --check`: zero violations across 360
  bounded files. `npm run docs:architecture:update`,
  `npm run docs:architecture:check`, and `git diff --check` pass.

### Still deliberately open

- The selected conversation endpoint still returns full message history. The
  existing history rail has keyset pagination, but reverse message pagination,
  versioned owner-scoped untrusted context checkpoints, compaction failure
  behavior, and long-thread UI acceptance remain open work.
- The source role-policy suite is deterministic, but the signed-out, Member A,
  Member B, editor, admin, super-admin, and suspended/revoked authenticated
  staging UI/API matrix is not yet proven.
- No current source change is deployed. The stale staging page is evidence of
  the prior defect only; it cannot validate this local checkpoint until an
  owner authorizes a staging deployment and authenticated IAB acceptance.

### Next session

Start from `.planning/inputs/2026-09-11-alpha-bedrock-beta-modular-convergence-handoff.md`
and this checkpoint. Keep Public Alpha as the shared presentation bedrock;
extend it only through modular member storage, lifecycle, preferences, and
policy adapters. Before any release request, complete message paging/context
evaluation and the owner-authorized persona/viewport matrix. Do not restore
`/beta/preview`, add a member bottom dock, merge divergent Alpha branches
wholesale, or mutate Cloudflare/Clerk/D1/corpus state without separate owner
approval.

## 2026-09-11 Alpha-bedrock / Beta modular convergence correction

**Status:** PLANNING-READY WITH A LOCAL SOURCE CHECKPOINT — Alpha's actual Ask
WTF product is now the explicit bedrock; Beta is an authenticated, persistent,
role-aware extension around it. The fresh-session authority is
`.planning/inputs/2026-09-11-alpha-bedrock-beta-modular-convergence-handoff.md`.

### Why the UI kept drifting

- `origin/release/alpha` is at `e86923b`, while the later Alpha chat and
  answer-accuracy work lives on `origin/rag/alpha-answer-accuracy` at
  `d4e45b4`; accepted composer geometry is directly represented by `887699e`.
- `origin/release/beta` at `498c0e0` is not descended from that later Alpha
  line. It inherited an older shared base and then implemented a separate
  member composition. Reusing colors and a few components did not preserve the
  real Alpha interaction model.
- The next implementation must forward-port capabilities from exact Alpha
  commits into shared primitives. It must not merge the divergent Alpha
  accuracy branch wholesale because that line also contains earlier Beta
  merges, provider experiments, and other independently gated work.

### Owner annotations incorporated

- The session rail remains 240px, bounded, independently scrolling, and clamps
  only session-card titles. The active conversation heading may wrap.
- Like live Alpha `/chat`, member Ask routes have no bottom dock. Preserve the
  floating wordmark and top-right Alpha hamburger; its Ask WTF, Episodes,
  Connections, and theme grammar remains, with one additive member Settings
  gear plus account/logout utilities. The current two icon-labelled Ask
  WTF/Settings buttons are not the intended menu.
- Loading, unavailable, retry, empty, answer, and long-history states remain
  inside one bounded conversation viewport; an error banner above a large dead
  canvas is not accepted.
- A selected session needs its own action. The current header `archive` control
  behaves like navigation and does not satisfy that requirement.
- Archive and permanent delete are different. Archive retains D1 storage.
  Permanent delete requires a confirmation dialog plus a new owner-scoped
  schema/API contract that removes the conversation, messages, and internal
  context checkpoints without touching transcript corpus data or silently
  deleting explicit saved preferences. The existing immutable
  `member_saved_memories.source_conversation_id` `ON DELETE RESTRICT` link must
  receive a reviewed detach/tombstone design, and anti-resurrection tests must
  replay the original create idempotency key after deletion.
- There is no automatic long-session compaction today. The browser receives the
  full selected message history, while inference sees at most the latest eight
  turns within 8,000 characters. Message pagination and versioned,
  non-evidence context checkpoints are now required before full-session memory
  can be claimed.

### Preserved local implementation

Local commit `3e4c887` on the isolated `codex/beta-chat-refinement` worktree
contains a source-only chat hardening slice:

- public and member answer paths share `runChat`;
- episode-scoped retrieval keeps multiple chunks from one episode;
- malformed scores and blank excerpts fail closed before inference;
- prior named-user context anchors follow-ups without becoming evidence;
- factual prose requires bounded citations or falls back to excerpts;
- persisted member citations retain safe numbers/times/modes;
- selected-load and failed-turn retry states, truthful loading, abstention copy,
  and reader-respecting bounded scrolling are covered;
- production/staging web-to-edge and data-binding separation has direct tests.

Fresh local verification at that checkpoint passed 251/251 Cloudflare tests,
142/142 web unit tests, 90/90 web contract tests, TypeScript, ESLint, and
`git diff --check`. This is not Alpha-parity proof, semantic-entailment proof,
a commit on a remote branch, a staging deployment, or live acceptance.

### Remaining role and release gates

The existing authenticated IAB receipt proves only one ordinary staging member
at desktop size. It does not prove:

- Member A versus Member B isolation and logout/login recovery;
- editor screen/action restrictions;
- admin screen/action restrictions;
- super-admin `/beta` to `/beta/ops` routing without member creation;
- the single-seat transfer/release controls;
- suspended/revoked behavior;
- 320x710 drawer/focus/overlap behavior;
- permanent deletion or long-session compaction.

Production Alpha and staging Beta remain separate Cloudflare pairs:
`wtfmedia-web` → `wtfmedia-edge`, and `wtfmedia-web-staging` →
`wtfmedia-edge-staging`, each with its own data plane. Shared code does not
authorize asset or data convergence.

### Next session

Open the isolated worktree and use the exact fresh-session prompt at the end of
`.planning/inputs/2026-09-11-alpha-bedrock-beta-modular-convergence-handoff.md`.
Start with Wave 0's branch/symbol ledger, then fan out the shared Alpha UI,
inference/retrieval, and private lifecycle/long-session lanes to bounded Codex
workers. Integrate member composition and role screens only after those lanes
stabilize. Do not deploy or mutate remote data until the full local matrix,
independent review, and a new owner-authorized staging wave pass.

## 2026-09-11 Member Beta anti-drift correction (superseded in part)

**Superseded visual acceptance:** the later owner annotations and convergence
entry above replace this entry's bottom-pill and selected-session UI claims.
Its authenticated create/continue/reload evidence remains valid.

**Status:** ANNOTATED LAYOUT + AUTHENTICATED IAB VERIFIED — the owner's 1382x887
overlap and composer annotations are resolved on the real signed-in staging
route. Session cards remain inside their rail, titles clamp to two lines, the
chat bar is the live-production Alpha capsule, and the icon-labelled Ask WTF /
Settings pill remains below it.

### Recovered owner contract

- Preserve the floating top-left WTF OS wordmark and minimal navigation pill.
- Keep Account, Theme, and Appearance utilities in the hamburger; the bottom
  pill is workspace navigation only and may carry the primary Settings route.
- Begin with the existing Alpha Ask WTF experience. Authentication, persistent
  conversations, history, memory, and member Settings are additions to that
  experience, not permission to replace it with a dashboard.
- Do not render private destinations or data before verified sign-in.
- Keep ordinary members and D1-authorized operators on separate routes and
  authority paths.
- Permanently reject `/beta/preview`, fake member data, browser fixtures, and
  demo pages as product or acceptance surfaces.

### Anti-drift implementation lock

- The member empty Ask surface directly reuses Public Alpha's
  `ConversationEmptyState` and `AskComposer`.
- Member Beta selects the live-production compact `AskComposer` variant: a
  single-line input and compact Ask WTF button without the expanded source-mode
  rail or full-width panel background.
- Desktop session grids and links remain zero-min-width; titles clamp to two
  lines with long-word wrapping; long history scrolls inside its bounded rail.
- The rejected welcome/dashboard feature grid is absent.
- The member auth frame uses Alpha's cream/ink evidence-card composition;
  the dark operator gateway remains operator-only.
- Member Settings nests only its route navigation and content beneath the shared
  shell; it does not add another global header.
- The bottom pill retains only Ask WTF and Settings as icon-labelled primary
  destinations. Sessions remain in the rail/drawer and Settings owns memory,
  sessions/privacy, and appearance.
- The Phase 2 member UI addendum, `.planning/STATE.md`, ISA criteria, and durable
  memory record this same contract and must be updated together after any future
  owner-approved change.

### Release boundary

- Commit `adf8494` was deployed to staging before this visual correction as Edge
  `f19c1ad8-80b3-4841-b86a-95efd67ec640` and web
  `510da7f5-0218-42d1-a01f-d9ac9a581df7`.
- The corrected web source at commit `5bdbd3e` was deployed through the named
  `wtfmedia` staging profile as web version
  `51cce902-fdde-4327-80f3-758f79d38d30`. Edge remained on the reviewed
  `f19c1ad8-80b3-4841-b86a-95efd67ec640` release because this correction did
  not change Edge source.
- Authenticated IAB proved the shared Alpha evidence card and composer on
  `/beta`, persisted a real private conversation at a route-backed URL,
  continued it, restored both turns after reload, and preserved selection
  through browser back/forward. Account, memory, sessions, and appearance
  Settings routes opened under one shared shell without duplicate chrome.
- The answer truthfully abstained when the current catalogue did not support
  the question; that is a valid evidence boundary, not sourced-answer proof.
- `/beta/preview` remains `404` on staging and production.
- The owner's annotations supersede the visual acceptance of web version
  `51cce902-fdde-4327-80f3-758f79d38d30`: its real flow passed, but the rail
  overlap and expanded composer did not. Do not reuse that version as visual
  approval.
- Commit `56aad90` was deployed through the named `wtfmedia` staging profile as
  web version `e298b69c-d0a0-49a4-b528-5f3914703e0e`. At the annotated 1382x887
  IAB viewport, two real session cards stayed within the 240px rail, their
  titles clamped to two lines, the evidence card remained unobscured, the
  compact single-line composer had no background band or mode rail, and the
  Ask WTF / Settings pill displayed chat and settings icons.
- The corrected compact composer successfully continued the existing private
  conversation, and the truthful evidence fallback remained attached to that
  canonical route.
- The independent QA subagent could not see the parent task's authenticated IAB
  surface and exposed only unauthenticated Chrome sessions. It correctly left
  that check blocked rather than substituting a signed-out page; the visual
  receipt above is the primary task's direct authenticated IAB evidence.
- Production, `wtfhq.in`, DNS, Clerk configuration, and production data remain
  untouched.

## 2026-09-11 Member Beta workspace remediation map

**Status:** PLANNING-READY — the authenticated `/beta` shell remains the live
staging integration baseline, but the 2026-09-10 visual review rejected its
single-page information architecture as the final member product. No product
code, deployment, provider configuration, D1 data, Worker, DNS, production, or
Public Alpha state changed in this planning checkpoint.

- The comprehensive implementation handoff is
  `.planning/inputs/2026-09-11-member-beta-workspace-routing-remediation-plan.md`.
- The mapping confirms that Clerk identity, D1 operator/member authority,
  owner-scoped conversation persistence, explicit saved memory, source panels,
  WTF OS shell tokens, responsive disclosure, and Alpha/Beta isolation already
  exist and must be preserved.
- The actual gaps are member conversation continuation, history pagination,
  deep-linked/current-session routing, per-conversation request isolation,
  normal-member Settings, explicit preference-import review, member navigation,
  and non-internal copy.
- The target experience uses a persistent ChatGPT/Claude-style conversation rail
  and route-backed chat workspace. Memory moves to member Settings and remains
  distinct from conversation history; operator Settings remain admin-only.
- The existing open-enrollment acceptance plan is incorporated unchanged. The
  feature is not accepted until one active super-admin and two ordinary members
  pass routing, persistence, logout/login, and cross-member isolation on staging.

### Next session

Start at Wave 0 of the mapped plan in an isolated worktree rooted at the current
reviewed Beta source. Re-verify the preserve/adapt/build ledger, write the member
UI addendum, and add red tests for gaps G1–G12 before implementation. Do not
delete or rebuild working auth/data seams, do not use a browser fixture, and do
not deploy until the implementation slice passes review and deterministic checks.

## 2026-09-10 Authenticated member dashboard shell

**Status:** STAGING DEPLOYED AND VISUALLY VERIFIED — the authenticated member
route now renders the reviewed WTF OS workspace instead of the unframed
implementation page. Authentication, operator routing, member ownership, and
the existing Edge/D1 API boundary are unchanged.

- Web staging version: `3e7789c2-08c9-4999-93b9-dde4c73da447` from source
  commit `aa0c745`. No Edge or production deployment was performed.
- `/beta` now enters an explicit member-mode `AppShell` with the WTF OS top
  rail, member navigation, theme control, logout, and bottom workspace pill.
- The ready state presents the account-scoped Ask WTF composer, active sourced
  conversation, private session history, and explicit-save memory as one
  responsive member dashboard. The earlier raw cream page is no longer the
  authenticated presentation.
- Member navigation is intentionally limited to Ask WTF, sessions, and memory.
  Operator Profile, Settings, release controls, and cross-account data remain
  absent; a verified D1 operator still redirects to `/beta/ops` before the
  member endpoint is consulted.

### Verification

- Web unit tests pass 106/106 and contract tests pass 86/86; strict typecheck,
  lint, production build, and `git diff --check` pass.
- The authenticated in-app-browser session resolved the real staging context,
  chat history, and memory APIs, then rendered the member shell and all three
  private sections. The disclosure opened with logout, theme, and the three
  member destinations.
- Runtime logs contain no application error. The only browser warning is
  Clerk's expected development-key notice for this staging development
  instance.
- Remaining multi-account acceptance is unchanged: verify the active D1
  super-admin redirects to `/beta/ops`, then use a second ordinary account to
  prove owner isolation across chat, history, memory, logout, and sign-in.

## 2026-09-10 Beta open enrollment and fixture withdrawal

**Status:** STAGING DEPLOYED — verified non-operator Clerk users now receive a
private member account on first access. Administrator authority remains an
explicit active D1 `operators` mapping. Production and Public Alpha were not
changed by this deployment.

- Edge staging version: `44e03259-df3b-4e55-a6e0-89a354c5c597`.
- Web staging version: `1493c650-fd4a-488e-9492-9cfce43cb10c`.
- `/beta` returns 200, the rejected `/beta/preview` fixture now returns 404,
  and unsigned `/beta/api/context` retains the non-enumerating `404
  ops_unavailable` boundary.
- `https://wtfhq.in/beta/preview` remains 404.

### Authorization contract

- Clerk verifies identity only. A verified user without an active operator row
  self-provisions one active `member_users` row bound to the exact Clerk
  subject and receives only member authority.
- An active operator email is excluded from member self-provisioning and routes
  through `/beta/ops`; only D1 may confer editor, admin, or super-admin rights.
- Suspended and revoked member rows remain denied. Existing member chat,
  history, and saved-memory queries remain owner-bound at the SQL boundary.
- The fake browser-only member fixture and its route, data module, component,
  and unit test were deleted rather than retained as an authentication bypass.

### Verification

- Phase 2 deterministic verification passed, including 210/210 Edge tests,
  10/10 Phase 2 browser tests, TypeScript, unit coverage, and the privacy scan.
- Live probes confirmed the staging and production boundaries listed above.
- The correct staging Edge still verifies the `mighty-hedgehog-2913` Clerk
  issuer/JWKS and binds only staging resources.
- Read-only staging D1 verification confirms the requested account remains the
  one active `super_admin`; its older unbound invited member row cannot override
  that operator mapping. The member release remains `staging/preview`.

### Clerk provider gate

- The Clerk CLI was authenticated and explicitly linked to the `WtfOS`
  application (`app_3J5UCAhqn41tl3oO9tAV1D9totj`) and its
  `mighty-hedgehog-2913` development instance
  (`ins_3J5UCE1dosqLPdOcdxZ5ZXnkBVm`).
- A dry run and immediate exact-instance patch changed only
  `auth_access_control.sign_up_mode` from `restricted` to `public`. Google
  remains enabled and authenticatable, the seven-day maximum session lifetime
  and single-session policy are unchanged, and the sole redirect remains the
  staging `/beta` URL.
- Live tracing then proved the browser bearer reached the staging Edge but both
  role lookups returned 404 before D1 admission. The instance had no custom
  session claims while the Edge identity verifier requires a normalized
  `email`. A second dry run and exact-instance patch added only
  `session.claims.email = {{user.primary_email_address}}`; Clerk retained its
  default 60-second token lifetime and five-second clock skew.
- Immediate readback found the same three Clerk users and no additional page.
  No user, invitation, operator row, Worker, secret, route, DNS record,
  production instance, or Public Alpha resource was created or changed by
  either provider update.

### First live acceptance

- After Clerk's one-minute token refresh, the existing
  `thoughtseedlabs@gmail.com` session passed `/beta/api/context`, chat, and
  memory loading and rendered the real private member workspace. D1 readback
  shows one active, Clerk-bound company member created by open enrollment.
- Read-only D1 verification confirms `sheshnarayan.iyer@gmail.com` remains the
  one active `super_admin`; its historical invited member row remains unbound
  and did not override operator authority.

### Remaining live acceptance

- Sign out and complete one fresh Google sign-in with the active D1
  super-admin. It must route from `/beta` to `/beta/ops` without creating a
  member row.
- Complete a fresh sign-in with a second ordinary account, then verify the two
  member workspaces remain owner-isolated across private chat, history,
  saved-memory, logout, and reauthentication.

## 2026-09-10 Worker topology and deploy-target containment

**Status:** DEPLOY TARGETS CONTAINED — no Worker was deleted. The required
topology is a pair per environment, not duplicate application assets:

- Production: `wtfmedia-web` owns `https://wtfhq.in`; its private service
  binding targets `wtfmedia-edge`. Public Alpha remains routes on this web
  worker, not a separate Worker.
- Staging: `wtfmedia-web-staging` owns the Workers staging hostname and binds
  only to `wtfmedia-edge-staging`.
- The temporary staging-only `/beta/preview` fixture was withdrawn in the
  subsequent open-enrollment deployment above.

### Containment receipt

- An ambiguous web deploy command briefly targeted the top-level production
  worker. It was immediately rolled back to prior Worker version
  `3d5a5965-14f3-486a-a608-330d539dec81`; no migration, secret, D1, queue, or
  production-route change occurred.
- Staging preview was then deployed explicitly with `--env staging` as Worker
  version `6d5b9997-d728-4c74-ab44-0c34c12dc5ed`. A live staging probe returned
  the fixture at that historical point; the fixture is now removed from
  staging, and `https://wtfhq.in/beta/preview` remains 404.
- Ambiguous `cf:deploy` / `deploy` package scripts now fail closed. Staging
  and production each require an explicit script, and the named `wtfmedia`
  web alias now means staging.

### Topology rule

- Do not delete either Edge Worker: each is its corresponding web worker's
  service-binding API authority.

## 2026-09-10 Staging Clerk issuer alignment

**Status:** STAGING DEPLOYED — staging web served Clerk from
`mighty-hedgehog-2913.clerk.accounts.dev`, while the staging edge Worker was
configured to verify `trusted-platypus-25.clerk.accounts.dev` tokens. This
made the edge reject valid browser sessions before D1 membership resolution.

- Aligned the staging `CLERK_ISSUER` and `CLERK_JWKS_URL` declarations with
  the public Clerk instance loaded by the deployed staging web sign-in page.
- Read-only Clerk verification confirms that instance has the normal session
  `email` claim and no custom JWT templates. The Beta edge uses that standard
  session credential; it does not request a session-customization template.
- The Clerk development session lifetime is currently 60 minutes. This is a
  live configuration fact and does not match the planned 720-hour policy, so
  it remains an explicit future configuration gate rather than an inferred
  release claim.

### Staging receipt

- Deployed the reviewed `release/beta` commit `b98a446` via the named
  `wtfmedia` Cloudflare profile only: Edge deployment
  `3b8f375f-95b5-493d-bf88-2072808456eb` and web deployment
  `e3d25662-7183-4be0-8d70-65946ae60dc1`. Production was not touched.
- Cloudflare confirmed the staging Edge binding set, including the matching
  Clerk issuer/JWKS, D1, KV, R2, Vectorize, Queue, and existing
  `CLERK_SECRET_KEY`. The staging web keeps the Edge service binding.
- Staging D1 already contains all member-Beta tables and the environment's
  `member_beta_releases` row is `preview`.
- An unsigned `/beta` probe returns the deployed member page; unsigned
  `/beta/api/context` returns the intentional non-enumerating `404
  ops_unavailable` denial. An invited member must now complete the real
  Clerk sign-in and reach this endpoint to prove Clerk-to-D1 membership
  resolution and private-chat access.

## 2026-09-09 Member Beta onboarding and Clerk return-target refresh

**Status:** REVIEW-READY SOURCE SLICE — the invite-only member entry now
distinguishes private Beta access from operator access. No staging or production
deployment, Clerk configuration change, D1 mutation, invitation lifecycle
change, or public Alpha change was made in this slice.

- `/sign-in?redirect_url=/beta` now preserves the allowlisted `/beta` target,
  so an invited member returns to the private Beta dashboard after Clerk
  authentication rather than being silently sent to `/ops`.
- The Clerk entry frame selects a member narrative for that destination:
  invite-only company Beta, Bangalore-first cohort, private Ask WTF workspace,
  and three concise verify/join/ask steps. `/ops` retains its separate operator
  narrative and authorization language.
- The redesigned frame removes the heavy nested faux-browser treatment,
  narrows the desktop form rail, improves the mobile reading order, and keeps
  the existing WTF OS wordmark, semantic palette, texture, reduced-motion
  components, and visible public-Alpha boundary.

### Verification

- New return-target unit contract passed after a verified red failure;
  the full web unit suite passed 96/96, along with strict typecheck, lint,
  Next production build, and `git diff --check`.
- The test runner still emits its pre-existing Vite native-config and Node
  deprecation warnings; no test, type, lint, or build failure was present.

### Next acceptance

- Review and merge the source PR, deploy only to the existing staging Workers,
  then accept the pending Clerk invitation. Confirm the first authenticated
  landing is `/beta`, followed by the private-chat and member-isolation checks.

## 2026-09-09 Invite-only company member Beta source checkpoint

**Status:** MERGED BETA SOURCE CHECKPOINT — private member Beta source merged
through PR #54 as `1e6afd7` into `release/beta`. It has not been deployed,
migrated, activated, or tested with real Clerk accounts; public Alpha is
unchanged.

- Added `0010_member_beta.sql`: isolated member identity/invitation/audit
  lifecycle, member-owned archive-only chat and memory, plus an independently
  paused, production-denying member release manifest.
- `/beta/api/*` requires the staging host, the dedicated enabled release,
  verified Clerk JWT, and active matching D1 member. First acceptance binds and
  re-reads the Clerk subject before admission.
- Persisted Beta assistant responses retain the safe source projection and
  render the established citation panel, including the edge timestamp field.
- `/ops/settings/users` offers admin-only roster, invite, pending-invitation
  revoke, suspend, and reactivate. It exposes no member chat/memory content.

### Verification

- 206 Cloudflare tests, 94 web unit tests, and 86 web contract tests passed;
  lint, typecheck, production build, and `git diff --check` also passed.

### Remaining staging gates

- The read-only staging inventory found no pending `0009_saved_memory.sql` or
  `0010_member_beta.sql`, no release-manifest row, and no `CLERK_SECRET_KEY`
  in the staging Worker secret list. It records a distinct historical
  `0009_temporary_super_admin_roster.sql`; do not overwrite it.
- Apply pending migrations to staging, deploy reviewed artifacts, configure and
  verify the staging Clerk keys/invite-only mode, enable the dedicated member
  manifest, and run one admin plus two Bangalore-member acceptance accounts.
- Issues #50, #51, and #52 remain open until those staging receipts are
  verified; their source implementation merge receipts are on the issues.

## 2026-09-09 Invite-only company member Beta staging activation

**Status:** STAGING PREVIEW READY — the reviewed `release/beta` source is
deployed only to `wtfmedia-edge-staging` and `wtfmedia-web-staging`. Production
was not deployed, migrated, configured, or activated.

- Remote D1 now records migrations `0009_saved_memory.sql` and
  `0010_member_beta.sql`; the dedicated `member_beta_releases` row is
  `staging/preview`, attributed to the active staging super-admin record.
- `CLERK_SECRET_KEY` is a Worker secret on both staging Workers. It is absent
  from source and was not logged. The linked Clerk development instance now
  uses restricted sign-up, so access requires an invitation.
- Staging `/chat` and `/beta` return `200`. Unsigned `/beta/api/context`
  returns the intentionally non-disclosing `404`; production `/chat` remains
  `200` and production `/beta/api/context` remains `404`.
- The full Cloudflare suite passed 206/206, including member invitation,
  invitation-to-subject activation, owner isolation, archive-only history,
  explicit-save memory, and independent member-release-gate coverage.

### Remaining acceptance gates

- An existing staging super-admin must sign into `/ops/settings/users` and
  dispatch two Bangalore-cohort invitations to owner-approved test addresses.
- Each recipient must accept the Clerk invitation, sign in, and complete a
  private-chat, history/archive, explicit-memory/archive, and cross-member
  isolation check. Verify the resulting D1 lifecycle/audit receipts without
  reading chat or memory payloads.
- Keep issues #50, #51, and #52 open until those live receipts exist. No
  production Beta release is authorized by this checkpoint.

## 2026-09-09 Authenticated history, explicit memory, and query activity

**Status:** LOCAL BETA IMPLEMENTATION — the remaining account-history and
memory slice is wired in repository source and verified with local tests. No
Clerk credential entry, live account access, D1/Worker migration, deployment,
KV secret write, DNS change, or production mutation was performed.

- Authenticated Ask WTF history remains owned by the verified Clerk-to-D1
  operator mapping. The existing conversation/message tables stay
  owner-scoped and archive-only; the history UI now exposes the server cursor
  as an explicit “load more conversations” action and no longer writes chat
  payloads to browser storage.
- Added `0009_saved_memory.sql` and the owner-scoped `saved_memories` DAL.
  Memory is explicit-save only, bounded to 2,000 characters per entry and
  8,000 characters of model context, optionally anchored to an owned
  conversation, and reversible through archive rather than destructive delete.
- `/ops/api/memory` now supports owner-only list/read/create/archive behavior
  behind the shared RBAC policy. Active memory reaches the authenticated
  answer runner as context only; it is explicitly excluded from transcript
  evidence and automatic extraction remains disabled.
- Each authenticated chat query now emits one allowlisted `protected_search`
  audit row with the conversation id, count, and `authenticated_chat` scope.
  `/ops/audit` exposes a query-activity filter and protected conversation link;
  raw prompts, answers, tokens, and private payloads are not copied into the
  audit ledger. Memory lifecycle writes use the existing audited policy-write
  envelope.
- The Settings memory page now owns the actual account-context ledger,
  explicit save form, source-conversation field, unavailable/empty/loading
  states, and archive action. The Settings directory and readiness copy now
  describe memory as “explicit only” rather than “not activated.”
- The sessions policy grid now stays two-up until the wide breakpoint and
  allows long policy values to wrap within their cells, preventing the
  nested Settings content from clipping at operator laptop widths.
- The authenticated conversation route now includes an account-session rail
  with active-session state, direct navigation, new-session entry, paginated
  loading, empty/error/unavailable states, and server-authorized owner labels.
  Public `/chat` remains the anonymous Alpha composer and now links into the
  protected account-session lane without sharing its transient conversation.

### Verification

- Cloudflare suite: 180/180, including migration, owner-isolation, archive,
  memory-context, and `protected_search` assertions.
- Web unit suite: 93/93; web lint, typecheck, production build, and
  `git diff --check` pass.
- In-app browser confirms `/ops/settings/memory` renders the branded nested
  page with the explicit-only status and truthful local unavailable state;
  the local `/ops/api/memory` call returns 503 because this seam has no edge
  binding/Clerk provider. This is not a live-account acceptance receipt.
- In-app browser confirms the authenticated conversation route renders the
  branded account-session rail and truthful unavailable state when the local
  history endpoint has no edge binding; the public Ask WTF page retains its
  anonymous composer and exposes the protected account-session link.

### Remaining live gates

- Apply `0009_saved_memory.sql` through the approved staging Wrangler path,
  then test two real Clerk accounts across login, logout, reauthentication,
  owner isolation, memory save/archive, and conversation continuation.
- Capture staging D1 receipts for persisted conversations, memories, and
  query ledger rows; verify admin/super-admin query visibility and editor
  denial without exposing another operator’s memory.
- Reconcile the live Clerk widget, release-manifest state, provider bindings,
  and deployment commit before calling the Beta feature set released.

## 2026-09-09 Hamburger utility placement

**Status:** LOCAL UI REFINEMENT — utility actions now live in the existing
hamburger disclosure; no deployment, credential, KV, Worker Secret, OAuth, D1,
DNS, or live provider mutation performed.

- Moved operator profile, light/dark theme, and Settings icon actions out of
  the fixed bottom pill into the top-right hamburger disclosure.
- The disclosure exposes them as a labelled “Account and display” icon group;
  the bottom pill remains reserved for primary workspace navigation.
- Profile and Settings active states, focus-on-open, Escape-to-toggle, and the
  public sign-in/theme placement remain preserved. Logout remains only in the
  root Settings account section.

### Verification

- Web unit: 93/93; typecheck, lint, and `git diff --check` pass.
- In-app browser confirms the closed disclosure has no profile, theme, or
  Settings actions in the bottom pill. The open-state Playwright assertion is
  present but local Chromium is not installed.

## 2026-09-09 Signed Super Admin Beta settings review

**Status:** REVIEWED LOCAL IMPLEMENTATION — a synthetic non-local signed
`staging` context was used for read-only rendering checks; this is not a live
Clerk session, staging deployment, D1 receipt, or account-acceptance result.

- The signed `super_admin` view returned 200 for the Settings overview, all
  eight nested Settings pages, and `/ops/profile`, with the shared shell,
  hamburger disclosure, and workspace-only bottom pill present on every route.
- The Super Admin view exposes all Settings destinations, including the
  admin-only Access page. The signed RBAC comparison hides Access for `editor`
  while keeping AI and YouTube Analytics visible with read-only notices;
  `admin` retains Access and provider-management visibility.
- In-app visual review covered the Settings directory, AI route, YouTube
  Analytics, Release Control, Operator Access, and Profile pages. The design
  reads as the existing WTF OS system: semantic accents, bordered panels,
  explicit state badges, dedicated route ownership, and no global settings
  dump.

### Remaining live gates

- Local Clerk has no `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, so the real widget
  correctly renders the provider-unavailable recovery state. No account or
  Chrome profile was accessed.
- The local release API is unavailable, so Release Control remains visibly
  server-unavailable; AI and YouTube Analytics remain local fixture/mock
  states. Profile identity and D1 mapping remain edge-unavailable in the
  local seam.
- Playwright open-state launch remains unavailable because the local Chromium
  executable is not installed. Live Clerk sign-in, edge-to-D1 identity
  readback, release-manifest readback, and owner acceptance remain open.

## 2026-09-08 Dedicated operator profile and settings mapping

**Status:** LOCAL IMPLEMENTATION — the profile workspace and safe backend
readback are wired in the repository; no deployment, credential, KV, Worker
Secret, OAuth, D1, DNS, or live provider mutation performed.

- Added `/ops/profile` as a dedicated operator workspace. It renders identity
  and role, verified scope, Clerk provider, normalized email-to-active-D1
  mapping, active state, and account timestamps without projecting raw claims.
- Added the protected `GET /ops/api/profile` edge route. It re-reads the active
  D1 operator by the already verified operator id, cross-checks normalized
  email and role, emits a safe profile DTO, and reuses the existing protected
  headers and audit boundary.
- The profile page maps `settingsSectionsFor(role)` into a role-filtered access
  map. The edge policy remains authoritative; anonymous public-link mode gets a
  verification-required state, and local missing-edge responses are labelled
  local preview rather than fabricated account data.
- The hamburger disclosure profile icon opens `/ops/profile`, the Settings icon
  opens `/ops/settings`, and logout remains only in the root Settings account
  section.

### Verification

- Profile edge DTO and policy tests were added; web route, parser, policy, and
  browser coverage were added.
- Web unit: 93/93; web contracts: 86/86; Cloudflare suite: 178/178.
- Web typecheck, lint, production build, privacy scan, and `git diff --check`
  passed. The in-app browser showed the profile page, role-filtered settings
  map, 200 profile/settings responses, and a 200 stylesheet response. The
  repository Playwright assertion is present but could not launch because its
  local Chromium executable is not installed.

## 2026-09-08 Settings route architecture rework

**Status:** LOCAL IMPLEMENTATION — the monolithic settings panel has been
replaced with a nested settings directory; no deployment, credential, KV,
Worker Secret, OAuth, D1, DNS, or live provider mutation performed.

- `/ops/settings` is now a directory only. It presents governed cards and does
  not render the AI, analytics, sessions, memory, RAG, access, or release
  workspaces inline.
- Added nested pages for `/readiness`, `/release`, `/ai`, `/analytics`,
  `/sessions`, `/memory`, `/sources`, and `/access` under the Settings layout.
  The layout owns the nested navigation and explicit denied state; each child
  owns one focused workspace. The Settings navigation is directory-only and
  does not carry request metadata or account actions.
- Settings navigation is role-filtered from one route contract. Verified
  operators can read the shared settings workspaces; the access child requires
  admin/super-admin authority; AI and Analytics mutation controls remain
  admin/super-admin only; release mutation remains super-admin only.
- Edge `policyForPath` and the edge router now recognize nested settings paths,
  with `/ops/settings/access` mapped to `operators:read` and other children to
  `control_room:read`. The older web policy projection matches that boundary.
- Repaired the local render failure by restarting the dev server after the
  production build had replaced its `.next` output, restoring the CSS asset
  from 404 to 200. Also made the verified-time display deterministic in UTC
  to remove the server/browser hydration mismatch, and added intrinsic
  wordmark dimensions as a stylesheet-failure fallback.
- Moved the verified environment, workspace, organization scope, effective
  role, and last-verification readback into the protected operator-access
  workspace. The Settings navigation now stays focused on nested route
  discovery rather than carrying request metadata.
- Replaced the global operator logout utility with non-destructive profile,
  light/dark theme, and Settings icon controls in the WTF OS hamburger
  disclosure. The bottom pill remains primary workspace navigation only. Logout
  remains available only in the root `/ops/settings` account section; nested
  settings pages do not render it.
- The active local page was browser-reviewed at
  `http://localhost:3000/ops/settings`, `/ops/settings/ai`, and
  `/ops/settings/access`. The local harness uses the signed `super_admin` seam;
  it is not a live Clerk or D1 receipt. The refreshed settings page renders
  with the WTF OS stylesheet and no recoverable hydration issue overlay.

### Verification

- Web unit: 93/93; web contracts: 86/86; Cloudflare suite: 177/177.
- Web build, sequential typecheck, lint, privacy scan, and `git diff --check`
  passed. The build enumerates all eight nested settings routes.
- Public Alpha routes remain outside the settings tree. Existing dirty work is
  preserved and no files were staged, committed, reset, or cleaned.

## 2026-09-08 Admin integrations settings UI and local verification

**Status:** LOCAL UI IMPLEMENTATION — branch `codex/clerk-auth-swap`; no
provider credential, KV, Worker Secret, OAuth grant, D1 migration, deployment,
DNS, or live data mutation performed.

- Added the protected settings composition for the global OpenRouter route:
  allowlisted primary model, ordered fallback controls, keyboard-operable
  add/remove/reorder actions, admin-only mutation affordances, write-only key
  handoff, local verification/save states, and redacted KV/audit readback copy.
- Added the YouTube Analytics connection surface with OAuth-first/read-only
  policy, explicit not-configured/verifying/connected/revoked states, a
  write-only local preview field, and a mock dashboard whose values are
  labelled fixture data, not provider data; freshness remains `not observed`.
- Kept sessions/history, memory governance, RAG health, and operator access in
  the same settings route. Reconciled the older web capability projection so
  editors may read settings while only admin and super-admin roles receive
  mutation affordances, matching the edge control-room read authority.
- Local browser review used the in-app browser at
  `http://localhost:3000/ops/settings`, `/ops/chat`, and `/ops/operators`.
  The mock dashboard transition passed locally. Chat remains held behind the
  server release gate; the local harness emitted a read-only D1 503 for its
  release readback, so no live session/history receipt is claimed.

### Remaining implementation gaps

- The save/test actions are intentionally local UI seams. A server-authorized
  settings endpoint, D1/KV policy persistence, Worker Secret custody, audit
  event, and OpenRouter health probe still need a separately reviewed backend
  slice. KV must hold only redacted policy/health projections; raw keys do not
  belong in KV or browser state.
- YouTube Analytics remains OAuth-first. The local API-key control is only a
  preview seam; the real OAuth connection, account scope, refresh receipt,
  quota/error states, and server-backed analytics adapter are not activated.
- Clerk live configuration and staging D1/operator readback remain required
  before account-based sessions can be enabled. Existing live probes were
  stale Access builds and the configured staging D1 lookup returned API 7404.

### Verification

- Web unit: 89/89; web contracts: 86/86; Cloudflare suite: 177/177.
- Web typecheck, lint, Next production build, privacy scan, and
  `git diff --check` passed; privacy scan reported 0 violations across 318
  bounded files.
- No pull/merge/reset was performed: the dirty working tree is preserved and
  `HEAD` remains equal to `origin/main` at `66f434a`.

## 2026-09-08 Clerk-backed operator Beta auth migration

**Status:** LOCAL IMPLEMENTATION — branch `codex/clerk-auth-swap`; no deployment,
production instance, secret, DNS, Cloudflare policy, D1 migration, or live data
mutation performed.

- Cloudflare Access authentication was replaced in the repository adapter with
  Clerk JWT verification from `Authorization: Bearer` or the `__session` cookie.
  Issuer, JWKS, expiry, authorized-party, user-id, and normalized-email checks
  fail closed.
- Existing email-to-active-D1-operator mapping, `super_admin`/`admin`/`editor`
  RBAC policy, signed edge-to-origin context, audit projections, routes, release
  manifest, and recovery/unavailable states were preserved.
- Public Alpha remains anonymous at `/`, `/chat`, and `/api/chat`. Clerk sign-in
  and sign-up are available under `/sign-in` and `/sign-up`; operator logout
  clears `wtf-ops:*` browser state before Clerk sign-out.
- The linked Clerk development instance passed CLI health checks and has the
  session email claim configured. The web publishable key is intentionally not
  committed; staging still needs its build-time key and an owner-approved
  interactive auth/revocation check.
- Verification: Cloudflare `npm test` 177/177; web unit 85/85; web contracts
  86/86; privacy scan 0 violations; TypeScript, lint, and production build pass.

This checkpoint is repository evidence only. Keep the public Alpha/Beta
boundary and complete staging configuration review before any deployment.

## 2026-09-04 WTFMedia v0.3.3-beta.1

**Status:** PUBLISHED — tag `v0.3.3-beta.1` created, PR #46 merged.

- AppRail contract restored from the alpha baseline; login flow wired through
  protected settings.
- Authenticated Ask WTF staging lane with server-side RAG, persisted chat
  answers, and protected chat history.
- Consolidation policy panels exposed: memory governance, RAG source health,
  and session history.
- Beta sign-in routed through protected settings; staging integration boundary
  hardened; unverified operator release UI hidden behind the staging gate.
- Edge fallback to episode Frame.io links added.
- Alpha baseline separated from the beta track so authenticated features do not
  regress the public production path.
- Repo docs refreshed: README, AGENTS.md, CHANGELOG, release notes, package
  version, AGENT-ONBOARDING scaffolding prompt, and GitHub repo description
  updated to reflect the beta.

## 2026-09-01 WTFMedia v0.3.2-alpha.1 release candidate

**Status:** PUBLISHED — tag `v0.3.2-alpha.1` and PR #44 merged.

- Ask WTF now widens retrieval for explicit named-person questions, anchors
  candidates to title/text evidence, tolerates the observed Sunil/Suniel
  spelling difference, and abstains instead of substituting another guest.
- The public source panel now filters the returned citations by `published`,
  `uncut`, or `both`; the visible count, list, timestamps, and links follow the
  selected mode.
- Local verification covers the full Worker suite, focused web tests,
  typecheck, lint, and the mixed-source browser journey. This is repository
  evidence only; it is not a production deployment receipt.

### Explicitly deferred — WON'T DO NOW

No additional Frame.io/Vectorize URL propagation, oversized timestamp-line
chunking, or publisher/re-ingest work is part of this release candidate. The
existing `main` Frame.io behavior is preserved, but no queue replay, Vectorize
rewrite, URL backfill, ingest, or deployment is authorized by this checkpoint.
Reopen the new chunking/metadata slice only as a separately planned,
owner-authorized ingest workstream.

## 2026-09-01 Production web 0.2.0 release

**Status:** LIVE — the owner-approved semantic minor release is deployed to
`wtfmedia-web` and passed its exact-tag preview plus post-deploy production
canary. This receipt supersedes the web deployment identifiers in the Ask WTF
episode-scoped completion receipt below; its corpus and held-boundary facts
remain current.

- Release: annotated tag `v0.2.0` resolves to merge commit
  `c11ddd58548675aa9c1fc3c5d9f7f62b52f8c408` from PR
  [#36](https://github.com/Sheshiyer/wtfmedia/pull/36). The merged tree is
  identical to reviewed candidate `c4c8e5053ed000719e1eeb89909ade82c8e5409e`.
- Cloudflare web version
  `67635664-33d8-414b-bd53-de859eb7cc69` is deployed as
  `ab4b12c3-2562-4df0-9252-7bfdd62c9f7c` with 100% traffic.
- Rollback target: prior web version
  `90099f42-13b6-4a4e-8d97-bd93b9f953fa`, deployment
  `c981ac0a-c141-439b-a222-14ed28764d7f`.
- The release tag was rebuilt through OpenNext and passed a remote Cloudflare
  preview before deployment: home, `/episodes`, mapped detail
  `/episodes/SPLFyVyTI1A`, and episode-scoped `published`, `uncut`, and `both`
  chat all returned HTTP 200.
- The live canary repeated those checks on `https://wtfhq.in`. Published chat
  returned three scoped published sources with truthful model-fallback state;
  uncut returned six scoped uncut sources; both returned six scoped sources
  spanning uncut and published. Edge health returned HTTP 200.
- `wtfmedia-edge` was not deployed. It remains version
  `75b96e1f-6fa6-4182-bbdd-99047399de64`, deployment
  `04e2a1a9-d796-41d9-bad5-3d952c8f206c`.
- Auth/Access, edge source, ingest, queues, D1, KV, R2, Vectorize, DNS, secrets,
  and dependency definitions were untouched. Root user-owned ISA/architecture
  and catalogue work remained preserved.
- Repository gates passed on the exact reviewed candidate: Phase 1 aggregate,
  Phase 2, Phase 3, architecture, privacy, full edge tests, web lint,
  typecheck, unit and contract suites, production build, and remote preview.
  The Temperance plan combo was rate-limited and advisor OAuth had expired;
  direct evidence gates passed without substituting those unavailable checks.

### Held boundaries

- Mapping an uncut asset to a public episode is not trusted cross-timeline
  alignment. Trusted alignment, synchronized playback, evaluation, analytics,
  and the operator provenance workspace remain open workstreams.
- This was a web-only version cut and deployment. Do not infer an edge, data,
  auth, ingest, DNS, secret, or corpus mutation from this receipt.

### Next action

Plan the remaining Phase 3/4 work as a separately authorized slice. Do not
move the `v0.2.0` tag or rerun deployment, rollback, ingest, or activation from
this handoff.

## 2026-09-01 Ask WTF episode-scoped production completion

**Status:** PRODUCTION COMPLETE — owner-approved final receipt for the bounded
episode integration slice. This receipt is now the canonical handoff for the
released behavior; it does not close the broader Phase 3–4 roadmap.

- Episode pages pass the mapped public YouTube `episodeId` into Ask WTF.
- All 49 approved mapped uncut assets are verified in R2 and D1. KV receipts
  are 55/55 published and 49/49 uncut. Vectorize reports 11,948 vectors with
  `source_mode` and `video_id` indexes. Queue backlog is 0 and the DLQ is back
  at its pre-release baseline of 18.
- Live mapped-episode chat passed for `published`, `uncut`, and `both`, with
  grounded episode-scoped sources. An unmapped episode remained scoped and
  truthfully reported uncut unavailable without retrieving unrelated evidence.
- Home, `/episodes`, and mapped episode-detail pages returned HTTP 200.
- Final web version `90099f42-13b6-4a4e-8d97-bd93b9f953fa` is deployed as
  `c981ac0a-c141-439b-a222-14ed28764d7f`. Final edge version
  `75b96e1f-6fa6-4182-bbdd-99047399de64` is deployed as
  `04e2a1a9-d796-41d9-bad5-3d952c8f206c`.
- The reviewed changes and final receipt merged through PRs [#32](https://github.com/Sheshiyer/wtfmedia/pull/32), [#33](https://github.com/Sheshiyer/wtfmedia/pull/33), [#34](https://github.com/Sheshiyer/wtfmedia/pull/34), and [#35](https://github.com/Sheshiyer/wtfmedia/pull/35).
- Two defects were recovered without losing availability: five oversized
  Vectorize IDs were repaired and replayed, and the first web bundle was
  rolled back after HTTP 500s. The corrected bundle passed remote preview
  before the final cut.

### Held boundaries

- Trusted uncut timeline alignment and synchronized uncut playback remain
  unavailable; episode membership is not evidence of cross-timeline alignment.
- Auth/Access, DNS, secrets, ingest credentials, and team-owned UI design were
  untouched. Root ISA/architecture WIP remains preserved.
- The full Phase 3/4 acceptance gates remain open: canonical internal
  provenance workspace, ten-episode alignment evaluation, twenty-query search
  evaluation, hybrid search filters, synchronized playback, and cached
  YouTube performance observations.

### Next action

Planning reconciliation is recorded in `.planning/STATE.md`,
`.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `ISA.md`. Plan the
remaining Phase 3/4 work as a separate owner-authorized slice. Do not rerun
activation, reindexing, rollback, or deployment from this handoff.

## 2026-08-31 Production web 0.1.4 canary

**Status:** LIVE — the approved web-only release is deployed and passed its
post-deploy canary. This receipt is tied to the exact merged source commit;
the edge Worker, authentication, transcript ingest, DNS, and secrets were not
changed.

- Release: `v0.1.4`, merge commit
  `d47c2d2410fa091d930f431ba413abb20cb100b6` from PR #29.
- Cloudflare web version:
  `8f19a895-9827-469c-8716-543adc375932`; deployment
  `69b2bf46-8fd5-43cd-82f3-e37773c5da7d` is serving 100% traffic.
- Live probes: `https://wtfhq.in/` returned HTTP 200 with the new application
  and operations navigation markers; edge health returned HTTP 200; published,
  uncut, and both chat requests returned HTTP 200 with valid `X-Sources`,
  `X-Fallback`, `X-Source-Mode`, and `X-Uncut-Unavailable` headers.
- Browser canary confirmed the operations disclosure opens, moves focus to
  `/ops`, closes on Escape, and restores focus to its toggle.
- Rollback target: prior web version
  `99812da9-86f2-42df-bd37-0319a23ad47b`.

**Next gate:** any authentication/history, uncut alignment/citation, edge
configuration, corpus ingest, DNS, or secret change requires its own approved
workstream and production receipt.

## 2026-08-31 PR #28 navigation and chat-route contract

**Status:** OWNER-APPROVED LOCAL SCOPE — navigation contract and chat-route
manifest only. No login, shared password, per-user history, Cloudflare
mutation, deploy, ingest enqueue, or secret rotation is included.

- The current release shell uses a fixed header wordmark plus one application
  navigation disclosure. Public workspace and role-projected operational links
  share that scroll-safe disclosure surface.
- The disclosure is a labelled button/navigation pair, moves focus to its first
  link when opened, closes on Escape or an outside pointer, and restores focus
  to the toggle on Escape. Responsive proof covers 320, 768, and 1440 pixels.
- The local NVIDIA/vector fallback in `/api/chat` is a separately approved
  development-only route change. Its protected baseline hash is updated in the
  compatibility approval receipt; production remains Cloudflare service-bound.
- The linked authentication/history request is explicitly deferred to a
  separate identity and persistence feature with its own approval packet.

**Next gate:** rerun the focused navigation, contract, architecture, and
Phase 1/2 checks, then use the repository PR prepare/merge pipeline. Runtime
and production receipts remain separate from this source merge.

## 2026-08-31 Release onboarding docs refresh

**Status:** LOCAL DOCUMENTATION UPDATE — no Cloudflare mutation, no deploy,
no ingest enqueue, no secret rotation.

- Updated `README.md` to describe the live WTF OS / Ask WTF Cloudflare release
  instead of the older proof-of-concept/Vercel-centered status.
- Updated `PROJECT.md` with current project goals, production resource names,
  corpus receipt counts, deferred transcript exceptions, and real verification
  commands.
- Updated `AGENTS.md` with agent pickup rules, the `/api/chat` source-mode
  contract, Cloudflare resource map, current corpus receipt, ingest fail-closed
  rule, and gated actions.
- Added `docs/AGENT-ONBOARDING.md` as the quick-start map for other engineers
  and agents: goals, production contract, Cloudflare resources, current corpus
  receipt, file map, verification commands, and mutation gates.
- Refreshed `docs/CLOUDFLARE-INFRASTRUCTURE.md`,
  `docs/CLOUDFLARE-MIGRATION-PLAN.md`, and
  `docs/PRODUCTION-EVALUATION.md` so they no longer imply the current product
  is only a shadow/Vercel proof of concept.

**Interpretation:** The repo now has a clearer handoff surface for team members
and agents. This documentation does not change the current production caveat:
live Ask WTF and the approved corpus receipts are green, while deploy receipts
still need to be tied exactly to the latest `main` commit before claiming the
prod worker code is at that commit.

## 2026-08-31 Bounded flow redesign on tuned WTF OS shell

**Status:** LOCAL IMPLEMENTATION — not deployed, not committed. This pass keeps
the current tuned root/WTF OS light design as the source of truth and changes
only the approved flow furniture.

- Room: removed the obsolete dark evidence treatment; release context remains
  in Settings.
- Episodes: `/episodes` is now a catalogue/index only. Each episode opens a
  dedicated `/episodes/[id]` public workspace with published embed, truthful
  uncut availability, transcript, Ask WTF entry, and mapped connection
  keywords. The detail header uses the compact page title scale, unavailable
  uncut source cards are hidden, and transcript/keyword overflow is compacted
  behind native show-more accordions after the first three items.
- Ask WTF: composer is fixed above the dock, and evidence panels/rails use
  high-contrast light surfaces.
- Connections: graph remains the primary surface, paired with searchable
  ideas/episode-title evidence; repeated grids and raw video-ID displays were
  removed.
- Control room: removed the fake refresh action; active operational
  destinations remain surfaced through the split centered-logo dock.
- Navigation: four public destinations, centered WTF OS mark, then four
  operational destinations; mobile/tablet retain scroll-safe bottom navigation.

**Verified:** `npm run typecheck`; `npm run lint`; `npm run test:contracts`
77/77; `npm run test:unit` 69/69; focused Playwright journey slice 36/36 across
Episodes, URL state, Connections, and public routes; additional
accessibility/focus/motion/theme/viewport slice 67/67; `npm run build`
generated 68 pages including 55 static `/episodes/[id]` paths; production
preview smoke on `http://127.0.0.1:5191` confirmed `/episodes` and
`/episodes/SPLFyVyTI1A` return HTTP 200 on desktop/mobile with no horizontal
overflow, catalogue cards present, detail transcript/chat present, compact H1
rendering, no unavailable uncut component, and transcript/keyword accordions
present.

## 2026-08-31 Clean Ask WTF Cloudflare reconciliation branch

**Status:** CLEAN PR BRANCH READY — `codex/ask-wtf-cloudflare-fallbacks`
starts from `origin/main` (`4175ac9`) and carries only the deployed Ask WTF
Cloudflare/web service-binding reconciliation, source-mode fallbacks, generated
architecture ledger refresh, and reproducible OpenNext/Wrangler web build
files. No new corpus ingest, secret rotation, DNS mutation, or production
cutover was performed in this branch.

Verified on the clean worktree:

```bash
cd cloudflare && npm test
# 129 passing

cd web && npm run typecheck && npm run lint && npm run cf:build
# passed

cd web && npm run test:unit -- tests/unit/source-mode.test.ts
# 3 passing

cd web && npm run test:contracts -- tests/contracts/api-chat.contract.test.ts
# 20 passing

npm run docs:architecture:check
# current: 424 inputs, 4e5faa190841ccc1bfcf41248a3b450ac87f72a3ab3872cccc4e1d5c9be3574d
```

Remaining runtime gap remains unchanged from the production check: Vectorize
contains uncut vectors, but uncut R2/KV corpus receipts are not fully
reconciled. Do not claim all uncut assets ingested until an approved transcript
corpus is supplied and R2/KV/Vectorize agree.

## 2026-08-31 Light active-build dock and settings roadmap

**Status:** LOCAL IMPLEMENTATION — not deployed, not committed. The public and
ops shells now use explicit light mode and a shared bottom floating navigation
pill. The dock contains only active build surfaces: room, episodes,
connections, ask wtf, control room, production, episode map, and settings.
Held surfaces stay directly reachable but are moved out of primary navigation
and shown as roadmap items on `/ops/settings`.

- Removed the left panel / hamburger drawer as the primary shell navigation.
- Moved ops release context to settings only; it is not repeated on every ops
  page.
- Public home and control room list active build items only.
- `/ops/ingest`, `/ops/operators`, and `/ops/audit` remain truthful
  coming-soon pages in public-link mode, without dead controls or inferred
  backend data.

**Verified:** `npm run typecheck`; `npm run lint`; focused unit contracts
16/16; Playwright active-nav/settings roadmap/shell suite 40/40; light-theme
journey 8/8; `npm run build`; live smoke on `http://127.0.0.1:5175/ops/settings`
for desktop and mobile confirmed `data-wtf-theme="light"`, held routes absent
from the dock, roadmap links present, one settings context strip, and no
horizontal overflow.

## 2026-08-30 Uncut direct timestamps on target preview

**Status:** LIVE ON WORKERS.DEV — `wtfmedia-release-integration` @ `b88a1fd`.
Secrets were not rotated. Hostname cutover stays held. No uncut corpus was
invented or copied from published YouTube.

- Uncut citations are `uncut:{id}` plus `M:SS`. No http URL. A YouTube URL
  in metadata is never used as an uncut link.
- Published Ask WTF still returns six YouTube sources with clocks.
- Uncut toggle still falls back to named published sources
  (`X-Uncut-Unavailable: true`) until approved `uncut/{hash}.txt` files exist.
- Live: edge `c1ae291a-cd1b-4f17-9878-481087ad2c72`, web
  `b8879f21-530d-40e9-bc2e-fa396bf47c14` at
  `https://wtfmedia-web.connect2nikhai.workers.dev/chat`.

## 2026-08-30 Uncut R2 upload blocked — no approved transcript files

**Status:** BLOCKED ON CORPUS — operator script is ready in
`wtfmedia-release-integration`; no `uncut/` objects were written. R2
`wtfmedia-catalogue` is still 99 published objects. Published YouTube
`.txt` files were not copied. Secrets were not rotated. Hostname cutover
stays held.

- 10 eligible Clean Cut candidates (quarantined rows excluded).
- Catalogue sheet is readable; linked Drive transcript files 404 for this
  Google account; Frame.io Clean Cuts stay unfetched.
- Drop folder: integration `.planning/inputs/uncut-local/` (gitignored).
- Apply path: `node scripts/put-uncut-and-enqueue.mjs --dir … --apply`
  then enqueue with `INGEST_TOKEN` in the environment.

## 2026-08-31 D1 source-asset receipt populated for approved corpus

**Status:** LIVE TARGET RECEIPT — D1 provenance is no longer empty for the
approved Ask WTF corpus. No Vectorize, KV, R2, Worker, DNS, or secret mutation
was performed in this pass.

- Populated target `wtfmedia-ops` through a temporary ignored Wrangler config
  using the live target D1 UUID and the private target API token. Token values,
  account identifiers, and SQL text bodies were not written to repository
  artifacts.
- D1 readback now shows 63 `episodes`, 63 `source_assets`, 63
  `transcription_runs`, 63 `transcript_versions`, 6,354
  `transcript_segments`, 6,354 `transcript_chunks`, and 63 completed
  `ingestion_jobs`.
- Published receipt: 55 active `published` transcript versions and 5,742 D1
  chunks, matching the 55 R2 `transcripts/*.txt` objects and 5,742 published
  Vectorize IDs.
- Uncut receipt: 8 active `uncut` transcript versions and 612 D1 chunks,
  matching the 8 R2 `uncut/*.txt` objects, 8 `ingest:uncut:*` KV keys, and 612
  uncut Vectorize IDs.
- The four deferred sheet exceptions remain intentionally out of the clean
  spreadsheet-ingest claim: `WTF is a Battery?`, `WEF - Economics`,
  `The Foundery`, and the `Brain Armstrong` transcript-row mismatch.

**Interpretation:** The stronger D1 `source_assets` receipt path is now green
for the approved, currently queryable R2/KV/Vectorize corpus. This is a
provenance receipt import over already-processed assets, not an ASR rerun, not
a Vectorize rebuild, and not approval of the deferred sheet rows or any missing
approved uncut corpus outside the 8 hash-addressed uncut text assets.

## 2026-08-31 Approved transcript ingest reconciliation, deferred exceptions held

**Status:** LIVE TARGET RECEIPT — owner authorized proceeding with Cloudflare
asset reconciliation for YouTube/published transcripts and the already-present
uncut text assets, while deferring `WTF is a Battery?`, `WEF - Economics`,
`The Foundery`, and the `Brain Armstrong` transcript-row mismatch.

- Target account access was verified through the private target API token in
  `.env` without printing token values. The shell's default Wrangler OAuth was
  the unrelated Thoughtseed Labs account, so target commands used the
  repository's ignored target token/account variables instead.
- R2 `wtfmedia-catalogue` contains 107 objects / 14,436,290 bytes: 55
  `transcripts/*.txt`, 43 `timestamps/*.json`, 8 `uncut/*.txt`, and 1
  manifest object.
- The 55 target R2 published transcript objects exactly match the 55 local
  `web/src/data/episodes.json` video IDs. No published transcript object is
  missing or extra. The 43 target timestamp sidecars exactly match the 43 local
  sidecars.
- KV `WTFMEDIA_STATE` contains 63 `ingest:` keys in the approved scope: 55
  published `ingest:<videoId>` keys and 8 `ingest:uncut:<hash>` keys. The 8
  uncut KV hashes match the 8 target R2 `uncut/*.txt` object hashes.
- Vectorize `wtfmedia-catalogue-v1` reports 6,354 vector IDs: 5,742 published
  `videoId:chunk` vectors covering all 55 local YouTube episodes, plus 612
  uncut-shaped `u:<hash>:<chunk>` vectors.
- Live `https://wtfhq.in/api/chat` accepted the production `messages` +
  `sourceMode` body shape. `published` returned six published citations via
  cited fallback, `uncut` returned three uncut citations, and `both` returned a
  mixed published/uncut answer with six citations.
- Negative deferred-title probes for the four held rows returned 200 with
  fallback/source results, but none cited the deferred title as a clean matched
  source.

**Superseded by later receipt:** D1 provenance was empty at this checkpoint.
The later 2026-08-31 D1 source-asset receipt populated D1 for the approved
currently queryable corpus. Full sheet ingestion and all uncut assets still
exclude the four deferred rows and any unapproved uncut corpus.

## 2026-08-31 Ask WTF product goal live; full uncut ingest receipt held

**Status:** PROD OPERATOR-VERIFIED — source changes committed and pushed on
`codex/wtfmedia-release-integration` as `d88ca88`; PR #25 is open but not
mergeable cleanly because the integration branch carries older drift against
`main`. This checkout has not force-merged, deployed, or reconciled that drift.

- Product goal is green: live `https://wtfhq.in/api/chat` answers `published`
  with mapped YouTube citations, `uncut` with truthful published fallback when
  uncut evidence is unavailable, and `both` with mixed uncut and published
  evidence.
- Deployment receipts supplied by the operator: `wtfmedia-edge`
  `df3ad7d5-6534-475d-a43c-388a5c21a10d`; `wtfmedia-web`
  `99812da9-86f2-42df-bd37-0319a23ad47b`.
- Runtime store receipts supplied by the operator: Vectorize has 6,354 total
  vectors including 612 uncut vectors; `wtfmedia-ingest` has both producer and
  consumer attached to `worker:wtfmedia-edge`; model fallback, cited evidence
  fallback, and sanitized edge/web error logs are live.
- Stronger ingest claim remains held: the sampled uncut vector's expected R2
  object was missing; `ingest:uncut:` KV keys were empty; local
  `.planning/inputs/uncut-local` has no approved corpus beyond `.gitignore`;
  `UNCUT_DIR` is unset.

**Interpretation:** Ask WTF can be queried across YouTube/published and uncut
source modes and works as intended for the product goal. Do not mark **all
uncut assets fully ingested** until R2, KV, and Vectorize reconcile from an
approved uncut corpus or an explicitly approved explained delta.

## 2026-08-31 Uncut source-asset ingest guard

**Status:** LOCAL IMPLEMENTATION — no Wrangler writes, no Cloudflare ingest,
no R2/KV/Vectorize mutation, no deployment.

- Transcript queue ingestion now verifies the declared D1 `source_assets` row
  and its R2 object before reading the generated transcript object or staging
  vectors.
- Missing, unavailable, non-R2, wrong-episode, or absent backing source assets
  fail as `source_asset_unavailable`; the queue can DLQ terminal failures
  without leaking storage keys.
- The previous vector-only success shape is now blocked: a transcript object can
  exist, but Vectorize staging does not start unless the source asset object is
  also present.

**Verified:** `npm --prefix cloudflare test -- transcript-ingest`; Cloudflare
Phase 3 focused tests inside `npm run verify:phase3`; public provenance unit
tests inside `npm run verify:phase3`; `git diff --check` inside
`npm run verify:phase3`.

**Not verified:** full `npm run verify:phase3` still fails at web TypeScript
because stale generated `.next/types` reference absent route files in this
checkout. No generated `.next` files were deleted in this pass.

## 2026-08-30 P0 dual-source Ask WTF joined to target preview

**Status:** DONE ON CANONICAL PREVIEW — joined into
`wtfmedia-release-integration` as `bd041a3` and deployed. This dirty
`wtfmedia` checkout is not the live unit. Secrets were not rotated.
Hostname cutover stays held.

Live: `/chat` published is grounded with six published sources; uncut
returns no sources and does not convert published timestamps.

## 2026-08-30 Remaining priority: Ask WTF published + uncut first

**Status:** EXECUTED FOR P0 — dual-source Ask WTF is on workers.dev. Remaining
P0 stores: uncut assets still not activated; Settings integrations stay not
configured. Hostname cutover stays held.

- **P0:** join dual-source Ask WTF into the canonical preview (`be304bd`).
  Published is already live. Uncut stays filtered and not activated.
- **P0 stores:** KV ingest keys must not let uncut overwrite published
  hashes; R2 published objects stay published; Vectorize filters
  `source_mode` before composition; YouTube ingest = published; uncut
  upload/ASR/activation stay fail-closed; Settings integrations stay not
  configured.
- **P1:** D1 calendar already live — do not regress.
- **P3:** high-water / quiesce / `wtfhq.in` after P0.

Do not deploy, rotate secrets, or pause `9d9d` from this note.

## 2026-08-30 Remaining cutover planning after target preview

**Status:** PLANNING ONLY — Codex completed the `wtfmedia` workers.dev preview
from `wtfmedia-release-integration` @ `be304bd`. This checkout is not that
deployed unit. No source quiesce, DNS, Custom Domain, or `default` mutation
was performed here.

HITL locked: cut over from `be304bd`; accept no-apex rollback to
`https://wtfmedia-web.sheshnarayan-iyer.workers.dev/`.

Read-only DNS probe: `wtfhq.in` zone visible; no Custom Domain attached;
public apex/www still unanswered; DNS-record API still 403. Next remaining
gates are high-water freeze, then a separately authorized quiesce/delta
window, then Custom Domain attach.

Gates are in
[`2026-08-30-wtfos-internal-release-plan.md`](../docs/superpowers/plans/2026-08-30-wtfos-internal-release-plan.md).

## 2026-08-30 Ungated current-release navigation

**Status:** LOCAL IMPLEMENTATION IN THIS CHECKOUT — same shells and pages, not
Access-gated. Not deployed. Not joined to `be304bd`.

- Public and operator rails share `currentReleaseNavigation`: `/`, `/episodes`,
  `/connections`, `/chat`, `/ops`, `/ops/production`, `/ops/episodes`,
  `/ops/ingest`, `/ops/operators`, `/ops/audit`.
- Missing HMAC no longer bounces page views to recover. Visitor context is
  `public_link`. Mutation APIs (ingest admin, roster writes, audit export,
  delete) stay fail-closed.
- Home “what's open” lists the same destinations. Ingest, operators, and audit
  stay `unavailable` but remain clickable.

**Verified:** web typecheck; current-release-nav unit tests; Storybook
MigratedHomePage / ControlRoom / PublicShell.

**Not verified:** Playwright click-through of every destination (locator fix
landed; the CI rebuild run did not complete). Do not treat ungated navigation
as release evidence.

## 2026-08-30 Ops episodes list from title map

**Status:** LOCAL IMPLEMENTATION — `/ops/episodes` now renders the privacy-safe
title map (59 mapped / 3 quarantined). Not a live catalogue. No Wrangler, D1,
ingest, or 0006 overlap.

- Fail closed if the map is missing, contains URLs, or drops a quarantined title.
- Uncut stays `candidate` / `not-activated`. Quarantined rows are visible so
  they remain excluded; there is no inspect/provenance action.

**Verified:** web typecheck; title-map and provenance-truthfulness unit tests.

## 2026-08-30 Dual-source Ask WTF contract + Excel title map (B1+B2)

**Status:** LOCAL IMPLEMENTATION — no Wrangler writes, no D1 calendar/0006
overlap, no secrets, no Worker deploy.

- Ask WTF request now carries `sourceMode` (`published` default, `uncut`
  explicit). Edge retrieval filters vector `source_mode` before composition.
  Missing metadata is treated as published. A published timestamp is never
  rewritten as uncut.
- Public citations add `source_mode`, `mapping_status`, and `segment_id`.
  The composer exposes a published/uncut toggle; uncut stays unavailable
  unless a mapped uncut citation is returned.
- Excel snapshots at `.planning/inputs/podcast-catalog/2026-08-27/` map 59
  Internal rows to 62 transcript rows by exact title. Artifact:
  `title-map.json` (hashes and statuses only, no URLs). Three quarantined
  titles remain excluded. Internal clean-cut pointers are `candidate` and
  `not-activated`.

**Verified:** web typecheck; unit tests for source-mode and title map;
Cloudflare `source-mode` tests 4/4; api-chat contracts 20/20; chat Storybook
14/14.

## 2026-08-30 Cloudflare target foundation execution

**Status:** LIVE TARGET CREATE/COPY COMPLETE — Worker deployment and cutover
held at reviewed-source, calendar, secret, DNS, final-delta, and rollback gates.

- Executed from the existing
  [`9d9d` migration inventory](../.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md),
  not a replacement plan. Every source read used `9d9d`, every target write
  used `wtfmedia`, and `default` remained untouched.
- Created target R2 `wtfmedia-catalogue`, KV `WTFMEDIA_STATE`, Vectorize
  `wtfmedia-catalogue-v1`, queues `wtfmedia-ingest` and
  `wtfmedia-ingest-dlq`, and D1 `wtfmedia-ops` without committing account IDs.
- R2: 99 unique objects / 13,204,194 bytes. Fresh source/target enumeration and
  all-object reads proved identical key sets, sizes, ETags, Standard storage,
  metadata, and SHA-256. Wrangler's bucket aggregate is lagging at zero and is
  recorded as stale rather than promoted over direct object evidence.
- KV: 55 persistent keys copied; source/target key sets and values match. No KV
  value was printed or retained in repository evidence.
- Vectorize: 5,742 unique target IDs equal the complete source ID set; contract
  is 1,024 dimensions with cosine distance.
- D1: migrations `0001`–`0005` applied, five receipts, 16 tables, zero pending
  repository migrations. The separately reviewed calendar migration is absent
  and was not invented.
- Queue shells are empty with zero producers and consumers. Their producer,
  consumer, retry, concurrency, and DLQ settings remain coupled to the edge
  deployment.
- Target `wtfmedia-edge` and `wtfmedia-web` remain absent. No Pages project,
  secret, DNS record, Custom Domain, Access policy, source resource, or
  `default` resource was changed or deleted. Temporary local R2 readers were
  stopped and did not create production Workers.

**Critical deployment boundary:** the current root edge suite passes 120/121
and fails the operator-navigation expectation after the Episodes link was
added. The release-integration worktree is dirty and lacks its local declared
dependency install; it is not a reviewed deployment unit. The calendar
migration is absent, and `EDGE_SHARED_SECRET` / `INGEST_TOKEN` values are
non-exportable and have not been recreated in the target. Do not deploy either
Worker, attach queue consumers, quiesce source, or map `wtfhq.in` until these
gates are resolved.

## 2026-08-30 WTF OS copy pass (waves A–D)

**Status:** LOCAL IMPLEMENTATION — copy only. No Cloudflare, deployment, Access,
calendar backend, or registry mutation.

Public `/` is now **the room**; `/ops` stays **control room**. Metadata names
**wtf os** and drops hardcoded 55 / "guest's own words". Production is no
longer labelled not-activated. Recover/sign-in/request-access no longer pretend
Access is live. Ask WTF names published vs uncut. Ingest mock jobs are gone.

**Verified:** web typecheck; focused unit tests; Storybook component suite for
the rewritten stories; Playwright 54/54 on control-room, production, recover,
operators, audit, home/chat rollback, and shell-drawer at 320/1440.

**Did not do:** calendar persistence backend; making `/ops/production` reachable
without ops context from the public home (production row is active, no href);
visual baseline regeneration; live browser walk.

**Next:** owner visual walk of `/`, `/chat`, `/ops`, `/ops/production`, and
recover. Visual snapshots will fail until re-approved.

## 2026-08-30 Cloudflare three-account reconciliation

**Status:** LIVE READ-ONLY INVENTORY + LOCAL DOCUMENTATION — the target
`wtfmedia` Wrangler profile was freshly reauthenticated; no Cloudflare write,
deployment, data copy, DNS/domain change, or secret mutation occurred. Current
release direction, the corrected source discrepancy ledger, and truthfulness
repairs are recorded in
[`2026-08-30-wtfos-internal-release-decisions.md`](../.planning/inputs/client-questions/2026-08-30-wtfos-internal-release-decisions.md)
and
[`2026-08-30-wtfos-internal-release-plan.md`](../docs/superpowers/plans/2026-08-30-wtfos-internal-release-plan.md).
The read-only 9d9d source inventory and target mapping are in
[`2026-08-30-9d9d-cloudflare-migration-inventory.md`](../.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md).
No provider, deployment, R2/D1/vector, calendar, Access, DNS, or hostname state
changed.

**Historical baseline:** target create/copy actions were subsequently executed;
see the newer foundation receipt above. This section remains the pre-write
inventory checkpoint.

- Current release policy is a temporary ungated public link: anyone who knows
  the URL may view WTF OS and list/create/update production-calendar records.
  Delete and non-calendar administrative mutations remain unavailable or
  protected. Fine-grained RBAC and Cloudflare Access are next-release work.
- Three account roles are now explicit: `9d9d` is the read/copy source;
  repository-bound `wtfmedia` is the target that owns the active `wtfhq.in`
  zone; `default` is an unrelated Thoughtseed Labs control account with no WTF
  resource match and must remain untouched.
- Source evidence confirms administrable `wtfmedia-web` and `wtfmedia-edge`
  settings/deployments, 99 R2 objects (13.2 MB), 55 persistent
  `WTFMEDIA_STATE` keys, 5,742 vectors at 1,024 dimensions/cosine, and the
  ingest/DLQ queues. Source D1 and WTF Pages are absent.
- The target migration is clone-and-cutover, reusing the R2, KV, Vectorize,
  queues, live Workers AI binding, and Ask WTF pipeline. NVIDIA is only a
  code/planning seam in this inventory, not a proven live Cloudflare resource.
- Target OAuth reauthentication succeeded, but R2 remains disabled
  (Cloudflare code `10042`) and no R2 scope is granted; DNS-record reads are
  also denied. Enable/authorize those capabilities and obtain a bounded owner
  execution window before creating, copying, deploying, or cutting over.
- Cutover consistency now uses two passes: initial bulk R2/KV/Vectorize
  population, followed by a separately authorized source-ingress/producer
  quiesce, queue settlement, and final R2/KV/Vectorize delta. Record and restore
  the exact source Worker/queue before-state if that window aborts.
- The verified emergency source endpoint is
  `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/` (HTTP 200). Current
  rollback removes the target Custom Domain and restores the pre-cutover
  no-apex state; it does not preserve same-host `wtfhq.in` continuity. Owner
  acceptance or a separately rehearsed same-host rollback route is required.
- The previous empty-KV, unresolved-edge-ownership, and generic-target-token
  blocker statements are superseded by this checkpoint.
- Corrected evidence: 59 Internal rows versus 62 transcript rows yields three,
  not two, unmatched transcript titles: `Brain Armstrong`, `WEF - Economics`,
  and `WTF is a Battery?`. They remain excluded from all data and UI outputs
  pending a source-backed outcome.
- The root operator episode drafts now fail closed: no mock catalogue, fixture
  provenance, simulated transcript activation, or default verified alignment
  is presented when the live source is absent.
- Local verification passed: web typecheck; 54 unit tests; ESLint; privacy
  scan (0 violations); and optimized Next build. An authenticated production
  build browser pass returned 200 for episode catalogue/detail and production
  calendar at 1440px and 320px with no console errors or failed requests.
- The UI Wave 1 and Cloudflare web-migration worktrees remain separate and
  uncommitted. Do not merge or deploy either as part of this checkpoint.

## 2026-08-29 Client-question status review

**Status:** LOCAL DOCUMENTATION — the client-question index at
`.planning/inputs/client-questions/README.md` separates active owner/editorial
inputs from historical records. No provider, deployment, credential, or media
action was taken.

- Still open: canonical IP/show taxonomy and mapping, the editorial 20-query
  evaluation set, third-party share rotation, and the consolidated Phase 3
  live-activation inputs.
- Historical/resolved: the filled Plan 02-12 authorization form is not current
  Cloudflare runtime proof; the A+B+D shell choice shipped in PRs #12/#13; the
  2026-08-27 git-state backlog is archival only.
- The Phase 3 packet now distinguishes local regression/source recovery from
  live activation, keeps YouTube OAuth-only, and directs sensitive connection
  details to an owner-managed secure channel rather than Git.
- Keep untracked `/ops/episodes` and `/ops/ingest` drafts out of commits and
  release evidence until individually reviewed.

## 2026-08-29 Architecture inventory + Phase 1 Access boundary

**Status:** LOCAL DOCUMENTATION — current repository architecture is recorded in [`docs/architecture/architecture.html`](../docs/architecture/architecture.html). No Cloudflare account, Access Application, policy, hostname, seat, D1 binding, OAuth account, calendar, MCP host, or OTA channel was configured or verified.

- Repository Phase 1 remains a public compatibility/proof release; it is **not** gated by Cloudflare Zero Trust or Access provisioning.
- The `/ops` UI, seat/RBAC schema, future Access JWT verifier, and loopback-only development context are modeled code, not evidence of a live protected application or assigned operator account.
- `npm run docs:architecture:update` regenerates the HTML ledger and compact companion inventories from reviewed source facts; `npm run docs:architecture:check` is the deterministic freshness gate used by the architecture CI workflow.
- The current inventory makes historical deployment/Phase 2 closure text visible as historical evidence only. The worker queue/cron, asset upload, OAuth, hosted MCP, calendar, release, and OTA holds remain explicit.
- The editor navigation now remains at `/ops` and `/ops/production` while the Episode workspace is still an excluded draft; the public drawer Storybook contract verifies in-place YouTube playback and an explicitly unavailable Uncut control.
- Focused lint/typecheck/unit/contract/component checks passed after that repair. The aggregate Phase 1 journey run remains a separate recovery item: it exposed ten migrated-shell/browser expectation failures before the run was stopped, so it is not represented as fresh Phase 1 acceptance evidence.
- Keep untracked operator drafts outside commits and the canonical inventory until individually reviewed; do not infer deployment authority from this documentation update.

## 2026-08-29 Phase 3 held recovery + agentic integration planning

**Status:** LOCAL RECOVERY — previous safe checkpoint `399a83b`; the focused local regression suite is green and this follow-up is checkpointed locally. Phase 3 is not complete and no external system was changed.

**Recovered locally**
- Public citations now resolve only an approved YouTube identifier/timestamp. They do not expose catalogue snapshots, private media paths, hashes, or invented Uncut alignment/playback.
- YouTube ingestion is OAuth-gated; a missing connection returns an explicit unavailable state before a job or audit mutation. API-key configuration is no longer requested in the Phase 3 owner-input packet.
- Asset upload, transcript consumption, timeline parsing, and operator DTOs were tightened to fail closed around identity, vault availability, malformed alignment, raw errors, and internal job payloads.
- `npm run verify:phase3` is now a read-only regression runner over the actual focused Worker tests, public provenance unit tests, web typecheck, and whitespace check. The previous self-grading simulator is retired and must not be used as completion evidence.
- A repository-local, read-only WTF OS MCP/plugin scaffold is being added for release status, release history, and setup guidance only. It is not installed globally and does not contact Cloudflare.

**Planning handoff**
- GitHub planning issues: [#19 OAuth-only YouTube](https://github.com/Sheshiyer/wtfmedia/issues/19), [#20 social OAuth framework](https://github.com/Sheshiyer/wtfmedia/issues/20), [#21 production calendar](https://github.com/Sheshiyer/wtfmedia/issues/21), and [#22 WTF OS MCP/plugin](https://github.com/Sheshiyer/wtfmedia/issues/22).
- Read `docs/handoffs/2026-08-29-agentic-integrations.md` and `docs/wtf-os-agentic-settings.md` before picking up one of those issues. They partition local MCP, future hosted MCP, Settings UX, release history, OTA, and calendar responsibilities so a separate developer can work without touching Phase 3 provenance code.

**Owner gates / do not infer**
- Do not deploy a Worker, bind D1/R2/Queues/KV, configure Cloudflare Access or OAuth, authorize a YouTube/social account, enable calendar sync, install/publish the plugin, or emit OTA updates from this worktree.
- Phase 3 still needs the documented editorial inputs; deployless Worker-entrypoint coverage and safe queue/cron plus asset-confirm handoff; a true large-media R2 streaming/direct-upload design (the current bounded handler buffers its body); durable, single-use upload-ticket state; D1 alignment-persistence/YouTube ETag durability review; a real configured-asset integration test; and owner acceptance evidence.

## 2026-08-28 Production calendar chrome (truthful empty)

**Status:** LOCAL IMPLEMENTATION — uncommitted on `main`. Preview: `http://127.0.0.1:3000/ops/production`.

**Shipped in this slice**
- `/ops/production` calendar + board + pin well. No episode records, owners, or counts. Local-only sketches in `next dev`.
- React Bits **Folder** harmonized to cream/ink/attention as `PaperFolder`. No shadcn init. No neon catalog colors.
- Closed `DatePicker` on production pins and audit after/before filters (02-UI-SPEC time range).
- Production is a workspace nav item for every ops role. Control Room ledger still says production is **not activated**.
- Rail current-route: `/ops` is exact-match so Control Room is not also current on `/ops/production`.

**Verified:** `npm --prefix web run typecheck`; vitest production/policy/lifecycle; Cloudflare operator-policy 3/3; Playwright `tests/phase2/production.spec.ts` 2/2.

**Did not do:** Plan 02-12 staging/production smoke; Phase 3 ingestion; Google Calendar sync; fake episode pins.

**Next Action:** Visual walk `/ops/production` and `/?boot=1` on localhost:3000. Plan 02-12 stays owner-gated. Do not start Phase 3.

## 2026-08-28 WTF OS splash + Grok React Bits MCP (do not re-loop)

**Status:** LOCAL IMPLEMENTATION — uncommitted on `main` (`ced3e83`, ahead of origin by 2). Host MCP is done. Do **not** reinstall React Bits MCP or re-ask for the Pro license.

**New-session first reads:** `PROJECT.md`, `AGENTS.md`, this file, `docs/design/MOTION-MAP.md`, `.planning/STATE.md`. Visual contract: `.planning/phases/02-UI-SPEC.md`.

**What this session already decided**

- Product name is **WTF OS**. Official lockup is `web/public/brand/wtfos-wordmark.png`. **Do not recolor letters.** Raster is the mark; reconstructed `wtf`/`media` spans are retired.
- Cloudflare Access is the IdP. There is no consumer password signup. Access-shaped routes: `/sign-in`, `/request-access` (owner-approved seat). Recovery stays `/ops/recover`.
- Splash is **two plates**, public-only: Grainient background + official logo alpha video. Not a CSS progress bar. Skip overlay under `navigator.webdriver`. Reduced motion: still Grainient/canvas + static PNG.
- Grok Imagine bg video was rejected (watermark, no alpha). Catalog pick: React Bits **Grainient** (MIT, `ogl`), cream/ink tokens. Pro alternatives already verified against the live license: `grain-wave-tw`, `halftone-wave-tw` (also `silk-waves-tw`, `dither-wave-tw`). Do not paste neon Aurora/Plasma/Silk/Galaxy.
- React Bits / MotionSites are **catalogs**. Harmonize to tokens. **No shadcn visual layer** in WTF OS.
- Local `/ops` needs HMAC. `next dev` + loopback may inject signed `x-wtf-ops-context` via `web/lib/ops/local-dev-headers.ts` when `WTFMEDIA_OPS_ORIGIN_PROOF` is set. Preview:
  ```bash
  WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key WTFMEDIA_OPS_LOCAL_ROLE=super_admin npm --prefix web run dev
  ```
- Phase 1 public rooms: `/`, `/episodes`, `/connections`, `/chat`. Phase 2 ops: `/ops`, `/ops/operators`, `/ops/audit`, `/ops/recover`. Phase 3+ inactive. Plan **02-12 owner-gated**.

**Host MCP (already installed — do not `grok mcp add` again)**

| Server | Command | Doctor |
|---|---|---|
| `reactbits` | `npx -y reactbits-dev-mcp-server` | handshake OK, 5 tools (OSS catalog) |
| `reactbits-pro` | `~/.grok/bin/reactbits-pro-mcp.sh` → `npx shadcn@latest mcp` | handshake OK, 7 tools |
| `motionsites` | HTTP MCP (also on Claude) | OAuth; this Grok session may need `/mcps` auth |

License lives **only** at `~/.temperance_engine/secrets/reactbits-license.env` (mode 600). Wrapper sources it. **Never commit, never paste into chat, never put in `web/.env.local` unless a later owner task asks.** Live probe: `@reactbits-starter` and `@reactbits-pro` registry.json both HTTP 200. `web/components.json` is **not** in the repo yet — do not `shadcn init`; do not install Pro files until the owner picks a block **and** registries are added without pulling shadcn primitives.

A **continued** Grok conversation will not see `reactbits__*` / `reactbits-pro__*` in `search_tool`. Open a **new** Grok session in this repo. If tools are missing: `/mcps` refresh. If `grok mcp list` already shows the three names, stop.

**Uncommitted (do not `git add .`)**

Tracked mods include layout, recover, AccessRecovery, OperatorContextStrip, MigratedWordmark, AppRail, middleware, package.json (+ `ogl`), brand/public-shell tests, tailwind. Untracked: `docs/design/MOTION-MAP.md`, `web/app/sign-in/`, `web/app/request-access/`, `Grainient.tsx`, `WtfOsBoot.tsx`, `web/lib/ops/display.ts`, `web/lib/ops/local-dev-headers.ts`, `web/public/brand/wtfos-wordmark.png` (+ `.source.png`), `web/public/brand/splash/`.

**Next Action (new session)**

1. Confirm `grok mcp list` shows `reactbits` + `reactbits-pro`. Call OSS `list_components` / Pro search for backgrounds. Do not reinstall.
2. Continue **visual** walk only: splash → `/sign-in` → `/request-access` → public rooms → ops chrome. Owner still ~30% on visuals. Wire live Control Room status later.
3. Optional splash swap: Grainient (shipping now) vs Pro `grain-wave-tw` / `halftone-wave-tw` after owner pick. Splash is skippable and session-once (`?boot=1` replays). Grok mark cropped off `wtfos-bg-still.jpg`. Chroma plates stay sources, not product layers.
4. Do not start Phase 3. Do not execute Plan 02-12. Do not rotate Frame.io/Drive/Zset here.

**Owner still holds:** 02-12 staging questions; IP/editorial; share rotation.

## 2026-08-27 Phase 2 operator visual alignment

**Status:** LOCAL IMPLEMENTATION — uncommitted until this checkpoint lands

**Evidence:**
- Remaining Phase 1 evidence/docs checkpointed on `aa913d7` (Lighthouse CI cache ignored).
- Phase 2 screens restyled to `02-UI-SPEC.md` without new fetch/auth logic: Control Room, Operators, Audit, Recovery.
- `WorkspaceHeader` sizes: `workspace` (public default), `control-room` (`text-display` clamp 40–72), `page` (34px / 28px Operators and Audit).
- Control Room has one yellow `attention` command plus secondary **refresh status**. Context strip uses 11px labels, 13px values, tabular last-verified time, and does not truncate scope fields.
- Operators/Audit use page headers, dense 13px rows, 2px ink panels, 320 record lists / 768+ tables. Recovery is `AccessRecovery` with spec copy.
- No fake health, counts, or invented workflow systems.

**Verification:**
```bash
npm --prefix web run typecheck
cd web && npx vitest run tests/contracts/wtf-os-token-contract.test.ts
cd web && WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key npx playwright test --grep-invert @visual tests/phase2 --project=phase1-chromium-320 --project=phase1-chromium-768 --project=phase1-chromium-1440
```
Typecheck passed. Token contract 3/3. Phase 2 Playwright 39/39. Browser screenshots of `/ops` at 1440 and 320 confirmed the yellow command and stacked 320 chrome.

**Next Action:**
Wire live status refresh and remaining operator/audit data presentation after this visual baseline. Plan 02-12 stays owner-gated.

## 2026-08-27 Operator shell converge + refinements A/D

**Status:** LOCAL IMPLEMENTATION — uncommitted worktree diff on `d1e7ece`

**Evidence:**
- `OperatorShell` is a thin `AppShell` adapter (`data-ops-shell`, lowercased nav, public-workspaces + sign-out utility).
- Operator hamburger accessible name is `open operations navigation`; public remains `Open application navigation`.
- Drawer titles: `operations navigation` vs `application navigation`. Descriptions: `authorized operations destinations` vs `open a WTF OS workspace`. Operator nav landmark is `operations`.
- Control Room restores 02-UI-SPEC empty copy (`the room is open` as ledger title + verified body in WorkspaceHeader) and keeps one yellow command. Layout still owns `OperatorContextStrip`.
- StatusLedger accepts at most one `promoted` item, rendered above the list with slot copy `do this next` and a 4px attention bar (not a second yellow fill). Admin/super_admin promote operator access → `/ops/operators`; editor promotes ask wtf → `/chat`.
- Escape restores focus to the hamburger (operator 320 + public 320 keyboard/pointer paths).

**Verification:**
```bash
npm --prefix web run typecheck
WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key npm --prefix web run build
cd web && npx playwright test --grep-invert @visual tests/phase2/control-room.spec.ts tests/journeys/shell-drawer-focus.spec.ts --project=phase1-chromium-320 --project=phase1-chromium-768 --project=phase1-chromium-1440
```
15/15 Playwright passed. No deployment, secret, or registry mutation.

**Next Action:**
Path-scoped commit of the operator-shell converge files. Plan 02-12 stays owner-gated.

## Phase 2 Planning Checkpoint (2026-08-26)

**Status:** EXECUTING — Plans 02-01 through 02-11 complete

**Evidence:**
- The approved `02-UI-SPEC.md` remains the visual and interaction contract at commit `5f5f1ad`.
- The superseded umbrella `02-PLAN.md` was replaced by 12 executable plans (`02-01` through `02-12`) across eight dependency-ordered waves.
- Static validation covers all 15 Phase 2 requirement IDs, all 26 locked context decisions, 24 executable tasks, and 35 uniquely owned threat definitions.
- Plan 02-01 established the immutable 35-threat ledger, empty fail-closed aggregate schema, and privacy-safe command-bound evidence fragments (`f4853e3`, `5be9f74`, `6278dad`).
- `cd web && npm run verify:phase1` passed after the stale completed-state test contract was reconciled (`2c080e0`); no Phase 1 behavior changed.
- Plan 02-02 applied and listed the portable D1 migrations locally with Wrangler 4.95.0; the approved roster, typed audit envelope, and symbolic environment contract are checkpointed (`f49efed`, `ae4d5b6`, `196eec5`, `5fbccee`).
- Plans 02-03 and 02-04 established verified Cloudflare Access + fresh D1 authority, closed policy navigation, and atomic super-admin transfer (`f06105c`, `0306b3a`, `c28c679`).
- Plan 02-05 added action-specific, append-only audit encoding; authorized fixed CSV export; and local/staging/production retention purges using an audited D1 batch (`ea316ef`, `6a4c0c4`). Local Cloudflare tests passed (18/18) and T-02-13 through T-02-15 have persisted passing receipts.
- Plans 02-06 and 02-07 established the edge-to-origin signed-context boundary, request-scoped policy projection, and non-leaking recovery/sign-out lifecycle (`25990ba`, `ae75f5e`).
- Plan 02-08 implemented the protected Control Room, role-projected responsive shell, truthful inactive status, and a recovery route outside the protected layout (`19a9156`, `bee5b28`). Local type checks, 320/768/1440 browser checks, and T-02-22 through T-02-24 passed.
- Plan 02-09 added a D1-backed invitation approval allowlist. Only the active `super_admin` can approve an address; an administrator can consume a pending approval to activate the invited `admin` or `editor`, and each action is audited (`774c3ad`, `7da776c`).
- Plan 02-10 added privacy-safe audit-ledger filtering and fixed CSV export. The operator UI exposes only approved DTO fields, while local filter validation rejects unknown inputs (`00ab446`, `6c0b321`).
- Plan 02-11 added the deterministic local Phase 2 verifier, CI gate, staged-evidence gate, and operations runbook. Local verification passed; staging and final release modes intentionally require separately supplied evidence (`7296f63`, `d4909e2`).
- Plan 02-12 now has local fail-closed staging preflight and production-smoke runners. They reject incomplete or ambiguous targets before a receipt is written or request is sent (`bb5d51c`).
- Plan `02-12` is non-autonomous: owner-approved staging evidence and a separately authorized, exact-host, read-only production smoke remain blocking gates.
- No deployment, migration, provider credential change, production write, registry mutation, or cutover occurred.

**Next Action:**
UI/UX work can proceed without Plan 02-12: land `wtf-os-shell-materialize`
(plus `web/tests/component-trace.json`) so `origin/main` matches the local
WTF OS shell. Plan 02-12 stays blocked until the owner fills
`.planning/inputs/client-questions/2026-08-27-plan-02-12-staging-authorization.md`.

## Phase 1 Completion Checkpoint (2026-08-25)

**Status:** COMPLETE

**Evidence:**
- 23/23 plans executed (T-01-01 through T-01-70 all passed)
- 72/72 threat definitions in final aggregate (`web/tests/security/phase1-threat-results.json`)
- Unqualified `cd web && npm run verify:phase1` exit 0 with all 12 sections green
- Owner approved visual baselines (5 decisions, 2026-08-25)
- Migrated UI variant active (`publicUiVariant()` default = migrated)
- Legacy rollback path retained and tested (38/38 tests pass)
- 17 approved snapshots promoted to `web/tests/visual/public-routes.spec.ts-snapshots/`

**Next Action:**
Phase 2 plans 02-01 through 02-11 are executed. Keep Phase 1
`verify:phase1` green after the WTF OS shell lands on `main`. Do not
flip REQUIREMENTS.md COMP/DSYS rows until that verifier passes on the
landed shell.

## Phase 2 Prerequisite Decisions (RESOLVED 2026-08-25)

1. **Deployment architecture** — Existing Vercel public application plus the existing Cloudflare edge estate — Resolved
2. **Authentication** — Cloudflare Zero Trust Access — Resolved by owner clarification on 2026-08-25; supersedes the unpersisted Clerk decision
3. **Database** — Cloudflare D1 for operator and audit persistence — Resolved by owner clarification on 2026-08-25
4. **Application roles** — `super_admin` (single transferable ownership seat), `admin` (operational administration), and `editor` (read + limited write) — Resolved
5. **Capability matrix** — Deny-by-default; editor: episodes/connections/chat/analytics read, chat write; no user management — Resolved
6. **Protected operator boundary** — A Cloudflare-controlled operator endpoint will enforce Access and route to the existing Vercel application — Resolved by owner clarification on 2026-08-25
7. **Temporary Cloudflare account authority** — The personal `9d9d` Wrangler account may own Phase 2 Cloudflare resources for now — Resolved by owner clarification on 2026-08-25
8. **Account portability** — Repository-owned schema, migrations, binding names, policy, and verification must remain portable; credentials and numeric account identifiers stay outside source control — Required Phase 2 constraint
9. **Final account migration** — Port the Cloudflare resources from `9d9d` to the final owner account later — Deferred to a separate owner-approved migration task
10. **Identity-to-operator mapping** — Cloudflare Access authenticates the normalized email; D1 must contain a matching active operator with a recognized `super_admin`, `admin`, or `editor` role. Missing, inactive, or unknown-role records are denied — Resolved by owner confirmation on 2026-08-25 and extended on 2026-08-26
11. **Expiry, revocation, and deactivation recovery** — Immediately discard protected client state, reveal no protected data in the recovery screen, retain only a validated intended `/ops` destination, and recheck both Access authentication and D1 authorization before restoring access — Resolved by owner confirmation on 2026-08-25
12. **Authoritative session and sign-out** — The verified Cloudflare Access token is the only authentication session; WTF issues no separate authentication cookie. Every protected server request rechecks the active D1 role. Sign-out clears protected client state and proceeds through Cloudflare Access logout — Resolved by owner confirmation on 2026-08-26
13. **Capability enforcement** — One shared deny-by-default server policy governs pages, APIs, queries, exports, record/field projection, errors, and cache boundaries. UI visibility mirrors policy but never grants authority; unknown combinations deny without revealing protected details — Resolved by owner confirmation on 2026-08-26
14. **Bootstrap super administrator** — `sheshnarayan.iyer@gmail.com`, the current personal `9d9d` account owner, holds the single temporary `super_admin` seat. It may be handed off later through an atomic, audited transfer that never leaves zero or multiple active super administrators — Resolved by owner direction on 2026-08-26
15. **Initial visible-roster access mapping** — Aditi Raj is `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia are `editor`; the 9d9d owner email remains `super_admin` — Resolved by owner confirmation on 2026-08-26
16. **Append-only audit policy** — D1 records authentication outcomes, expiry/logout, protected searches/views/exports, operator and role changes, settings changes, and super-admin handoffs using allowlisted metadata plus correlation IDs. Tokens, raw queries, prompts, responses, and private payloads are prohibited — Resolved by owner confirmation on 2026-08-26
17. **Audit retention and visibility** — Production retains audit records for 365 days; staging retains them for 30 days; local audit data is ephemeral. Only `super_admin` and `admin` may view or export records. Every export and automated purge is audited, and expired records are deleted without silent archival — Resolved by owner confirmation on 2026-08-26
18. **Environment and data isolation** — Local, staging, and production use separate D1 databases, Cloudflare Access applications/policies, secrets, and cache namespaces. Production data is never copied to lower environments. Repository-owned migrations promote forward through environments, and preview deployments receive no protected backend unless explicitly bound — Resolved by owner confirmation on 2026-08-26
19. **Truthful initial Control Room shell** — The first authenticated `/ops` release shows the current environment, workspace, effective operator role, authorized navigation, live-derived service status, and one dominant setup action. Missing systems render explicit unknown, offline, unavailable, or permission-denied states; they never fabricate health or substitute misleading zeroes — Resolved by owner confirmation on 2026-08-26
20. **Fail-closed production release gate** — Production remains blocked until staging proves the complete anonymous/expired/inactive/editor/admin/`super_admin` authorization matrix; Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and responsive behavior; and rollback plus runbook rehearsal. Deterministic checks block CI, the owner approves the staging evidence packet, the production smoke test is read-only, and every failed or unknown gate blocks release — Resolved by owner confirmation on 2026-08-26

**Superseded draft warnings:** The untracked `web/lib/auth/session.ts` creates
an unsigned JSON `wtf_session` cookie. The draft D1 schema omits `super_admin`,
accepts unrestricted JSON audit metadata, and hard-codes 90-day retention.
These conflict with Decisions 12, 14, 16, and 17 and are not approved
implementation authority. Executable Phase 2 plans must replace them.

## Phase 2 Owner-Supplied Roster Evidence (2026-08-26)

The owner supplied a cropped messaging screenshot. The table records only the
six visible entries; it does not claim the screenshot contains the complete
team. Job titles remain distinct from application authorization roles.

| Person | Email | Supplied job title | Phase 2 application role |
|---|---|---|---|
| 9d9d account owner | `sheshnarayan.iyer@gmail.com` | Temporary infrastructure owner | `super_admin` |
| Aditi Raj | `aditi@allthingswtf.com` | Production Manager | `admin` |
| Sai Date | `sai@allthingswtf.com` | Senior Designer | `editor` |
| Naisthika Rathod | `naisthika@allthingswtf.com` | Production Associate | `editor` |
| Amal Vinayan | `amal@allthingswtf.com` | Motion designer | `editor` |
| Akash Pandey | `akash@allthingswtf.com` | Post production manager | `editor` |
| Yash Majithia | `yash.majithia@nksqr.com` | Unknown — not visible in supplied screenshot | `editor` |

## Phases 3–10 Status

**Authorization:** Planned / inactive. Phases 3–10 remain planned but inactive until Phases 1–2 are accepted and explicit owner authorization is recorded for the next phase.

## Technical Notes

**Variant selector:** `publicUiVariant()` in `web/lib/public/public-ui-variant.ts`. Default: `migrated`. Legacy rollback: `WTF_PUBLIC_UI_VARIANT=legacy`. Server-only; never serialized to client.

**Performance budgets:** Approved in `web/tests/performance/phase1-budgets.json` (Plan 01-07). 11 metrics. Enforcement: `web/scripts/capture-phase1-performance.mjs --check`. LHCI collection: `npm run test:performance` runs `lhci collect && lhci upload` (no assert phase).

**Visual baselines:** 17 approved snapshots (4 routes × 3 viewports × 4 states). Stability loop in `captureVisual()` ensures deterministic captures. Broken-image alt text handled via CSS `img { color: transparent }` in visual tests.

**Aggregate verifier:** `web/scripts/verify-phase1.mjs` runs 12-section fail-fast sequence. `web/scripts/lib/phase1-threat-results.mjs` validates fragments with correction-ledger tolerance. `web/scripts/merge-phase1-threat-results.mjs` produces final 72-definition aggregate. CI gate: `.github/workflows/phase1.yml` runs `npm run verify:phase1`.

## Checkpoint

- Status: `draft-held`
- Portfolio: `thoughtseed`
- Repository: `wtfmedia`
- Registry WorkObject: `branch:wtfmedia`
- GitHub: `Sheshiyer/wtfmedia`

This packet was drafted by the packet-authoring tool from registry and
repository evidence. It has not been reviewed by a human and is not
committed.

## Completed

- Registry WorkObject matched via `sourceInventory`.
- Packet drafted: all six files present.
- 1 field(s) flagged for review — see `.project/CONTEXT.md`.
- Chat-model fallback repair deployed to Vercel production on 2026-08-11:
  each NVIDIA model must emit a first token within 12 seconds; otherwise the
  route tries Llama 3.3 70B and then Llama 3.1 8B before returning a safe 503.
  `npm run build --prefix web` passed before deployment.
- Live production probe against `https://wtfmedia.vercel.app/api/chat` returned
  HTTP 200, `X-Fallback: true`, and `X-Model: meta/llama-3.1-8b-instruct`,
  confirming that recovery works when the primary does not answer in time.
- Released `wtfmedia-web` v0.0.2 to production on 2026-08-11. The catalogue now
  contains 55 episodes and 1,933 embedding chunks. Both newly synced episode
  IDs are present on `/episodes` and appear in live `/api/chat` source headers.
- Released `wtfmedia-web` v0.0.3 to production on 2026-08-11. Connections now
  rebuild for all 55 episodes using a bounded NVIDIA curation attempt and a
  deterministic fallback when the provider returns malformed output.
- Released `wtfmedia-web` v0.0.4 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_2uASTwWVVtbTYoFZumYwrMkZVqdW`). Removed the
  unavailable Crew mode and its
  localhost-only route, the simulated online-user count, and the unrelated
  drawing playground. The public UI now presents only the production-backed
  retrieval path and current 55-episode / 1,933-chunk totals.
- Released `wtfmedia-web` v0.0.5 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_Gefto4o1NstkUdvWBch7k2fBMrXZ`) to prevent
  unsupported corpus-wide people or
  company counts, and ownership/role claims, from being generated from a
  six-excerpt semantic retrieval result. Connections are now described only as
  recurring themes and ideas, not a verified people/company index.
- Deployed the isolated Cloudflare shadow RAG Worker `wtfmedia-edge` on
  2026-08-11. Dedicated account resources are `wtfmedia-catalogue-v1`
  (Vectorize, 1,024-d cosine), `WTFMEDIA_STATE` (KV),
  `wtfmedia-catalogue` (R2), `wtfmedia-ingest` (Queue), and
  `wtfmedia-ingest-dlq` (DLQ). The Worker is not connected to the Vercel UI.
- Verified a two-episode pilot from R2 through Queue, Workers AI, and
  Vectorize. `POST /v1/chat` at the Worker shadow endpoint returned HTTP 200
  with grounded sources for a pilot question. Infrastructure details and
  cutover gates are in `docs/CLOUDFLARE-INFRASTRUCTURE.md`.
- Released `wtfmedia-web` v0.1.0 to production on 2026-08-11 (deployment
  `dpl_B3h7PAkP7d72HZhuV27PX5rattWJ`). The Vercel
  `/api/chat` route now preserves its browser contract while proxying
  server-to-server to `wtfmedia-edge`; no Cloudflare account credential is
  sent to the browser. The full 55-episode corpus has been uploaded to R2 and
  queued for idempotent ingestion; Vectorize throttling was resolved by
  single-consumer queue delivery, eight-vector batches, and bounded backoff.
- Released `wtfmedia-web` v0.1.1 to production on 2026-08-11 (deployment
  `dpl_9rzb7RUSxizn42agcLC7A9nMtYr3`). Added the 55-record provenance manifest,
  restored timestamps for the 43 caption-backed episodes, and added production
  evaluation coverage for citation grounding, ownership abstention, and
  timestamp honesty. Direct Worker chat is now denied without the server-only
  Vercel/Worker shared secret (HTTP 401).
- Released `wtfmedia-web` v0.1.3 to production on 2026-08-11 (deployment
  `dpl_CHR5zYqgFEngizFu8Uy2Nb46kgM1`). Removed automatic starter prompts after
  they conflicted with the grounding policy; the empty state now shows a
  non-submitting, source-answerable example instead.

## Next action

Review this draft packet, resolve any items flagged in the review summary,
commit the six files as a single repository change, and move
`packet_status` to `reviewed-held`. A relocation manifest approval and a
live-apply approval both remain separate, later steps.

Monitor the Cloudflare-backed production route as the full 55-episode queue
drains. Next hardening work is a source/provenance manifest, measured timestamp
coverage, golden RAG evaluations, and WAF/Turnstile plus richer telemetry.

Connections curation is now resilient to malformed or unavailable NVIDIA model
responses. The model remains preferred for canonicalization; the deterministic
fallback keeps the graph current when curation cannot be normalized.

## Verification

```bash
not-applicable
cd video && npm run lint
git status --short
```

No registry, capsule, relocation, session, or Paseo mutation was performed.
The owner-authorized Cloudflare shadow resources and Worker deployment above
are the only external infrastructure mutations in this checkpoint.

## 2026-08-25 Plan 01-18 aggregate + rollback + candidate checkpoint

- Plan 01-18 now has passing threat evidence for T-01-55, T-01-56, and T-01-57.
- Task 1 (rollback rehearsal): Both legacy and migrated variants pass all 19 tests per variant (38 total) across all 4 protected routes; protected data files (episodes.json, connections.json, vectors.json) verified unchanged via SHA-256.
- Task 2 (aggregate verifier + CI): `web/scripts/verify-phase1.mjs` implements a static 12-section fail-fast sequence; `web/scripts/lib/phase1-threat-results.mjs` provides read-only fragment validation with correction-ledger support and legacy fragment tolerance; `.github/workflows/phase1.yml` runs `npm run verify:phase1` on Ubuntu/Node 22 with Playwright Chromium.
- Task 3 (candidate review packet): `web/tests/visual/phase1-candidate.json` assembled with 17 visual candidates across 4 routes, 3 viewports (320/768/1440), and 4 states (default, drawer-open, empty, response); candidate check-merge validates 62 results from 20 completed plans; privacy scan reports 0 violations across 138 files.
- Threat ledger: 72 total definitions, 62 non-exempt, 10 exempted (T-01-55 through T-01-64).
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

### Next action

Execute Plan 01-19 (owner visual approval). The candidate packet is ready for owner review at 320/768/1440 viewports. Repository Phase 2 remains gated behind complete Phase 1 acceptance.

## 2026-08-24 Plan 01-17 cross-route proof checkpoint

- Plan 01-17 now has passing threat evidence for T-01-52, T-01-53, and T-01-54.
- The Task 2 correction is bound to the exact historical failure; candidate mode produces 17 persistent, ignored PNG/JSON hash pairs without approving baselines.
- The component trace recomputes the migrated protected-route import graph, verifies exports/story states/layer direction/cycles, and blocks any remaining `TBD` validation mapping.
- Contracts passed 67 tests, privacy scanning reported zero violations across 137 files, lint exited zero, and the component-trace suite passed 3 tests.
- Repository-wide typecheck remains blocked by existing errors in `web/tests/accessibility/public-routes.spec.ts:391` and `web/tests/journeys/chat.spec.ts:365`; Plan 01-18 must own or resolve these before aggregate acceptance.
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

## 2026-08-18 PAI / Manifest initialization checkpoint

- Status: bounded local review passed; the repository packet remains
  `draft-held` and no relocation, registry, provider, or deployment authority
  is implied.
- Repository Git identity was restored from the declared `origin/main` history
  without replacing or reverting the existing working tree.
- `ISA.md` now owns acceptance and the active goal; GSD remains the execution
  planning authority under `.planning/`.
- Temperance project, Manifest, and goal receipts were initialized. The live
  bridge is fresh, `active_planner` is `isa`, and project doctor reports zero
  high-severity gaps.
- The current public catalogue is retained as a protected read-only projection
  while the proposed milestone reframes the primary product as an internal,
  evidence-native podcast operating system.
- Private source materials informed bounded requirements synthesis only; raw
  transcripts, embedded source links, and source files were not copied into
  project artifacts.
- Machine-local Manifest and orchestration receipts are ignored. The inherited
  promo task is preserved as historical work but resolves to no executable
  next-wave proposal.
- Independent Cato-style re-audit passed after portability, routing, and goal
  length corrections.
- `DESIGN.md` now records the repository-grounded reference lock, public/internal
  route split, semantic use of the committed palette, typography and motion
  rules, accessible component foundation, current-to-target component map,
  screen contracts, and dependency order for GSD decomposition.
- The design packet added and proved ISC-129 through ISC-134. All 134 ISA IDs
  remain unique; 18 are currently evidenced as complete.
- Live Refero catalogue research was unavailable because the configured
  subscription is inactive. No account was changed; committed WTF brand assets,
  the shipping UI, bundled craft references, and current official component
  documentation form the bounded research set.
- The design audit's route-continuity gap is resolved: `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat` are protected compatibility
  contracts, and public/operator connection graphs are separate projections
  over shared evidence. Orange is explicitly a provisional comp-derived token,
  not an addition to the committed `PRODUCT.md` palette.
- The final independent design remediation re-audit passed with no actionable
  blockers; it was read-only and changed no files.

### Next action

Discuss and plan Phase 1, `Compatibility + Component Proof Harness`, against
the approved design packet and roadmap. Phase 2 remains authorized only after
Phase 1 acceptance; Phases 3 through 8 remain planned and inactive. No
implementation, dependency installation, deployment, or external-service change
is authorized by this planning checkpoint.

### Verification

```bash
temperance-project-init --cwd . --check --json
temperance-next-wave --cwd . --json
git check-ignore -v .temperance/project.json .temperance/manifest.json
```

## 2026-08-19 GSD milestone planning checkpoint

- Owner approval finalized `v1.0 One Brain Re-foundation` as an eight-phase
  roadmap in commit `f6654aa`.
- The approved requirements define 70 unique v1.0 IDs across all ten accepted
  families; every ID maps to exactly one phase with zero gaps or duplicates.
- Phase 1 and Phase 2 are the only implementation-authorized phases. Phase 2
  depends on Phase 1 acceptance, and Phases 3 through 8 require a later explicit
  owner authorization gate.
- Phase 1 consumes the approved moodboard, app-flow contract, component
  inventory, and `DESIGN.md`; it must deliver the proof harness plus at least
  one real migrated public component while protecting `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat`.
- ISA remains acceptance and goal authority. GSD remains execution-planning
  authority; ISC-10 through ISC-12 are now directly evidenced, bringing ISA
  progress to 18 of 134.
- No Phase 1 code, library installation, deployment, registry mutation,
  provider change, or external integration mutation occurred in this
  checkpoint.
- The superseded 20-second promo plan was preserved under `tasks/archive/` so
  Temperance no longer routes it as active work. The current next-wave proposal
  is bounded to the approved Phase 1–2 roadmap and remains human-approval
  blocked; nothing was dispatched.

### Next action

Run `$gsd-discuss-phase 1` to lock implementation choices and acceptance
evidence before `$gsd-plan-phase 1`.

## 2026-08-19 Phase 1 discussion checkpoint

- Phase 1 discussion is complete across the first proof slice, visual migration
  depth, compatibility policy, and acceptance evidence.
- The first proof slice is `EpisodesBrowser` plus `ScrollRail` and a URL-backed
  accessible public-detail drawer.
- The confirmed Phase 1 boundary visibly redesigns `/`, `/episodes`,
  `/connections`, and `/chat` while preserving their public behavior and the
  complete `/api/chat` contract.
- Compatibility is frozen across URLs, bookmarks, queries, navigation meaning,
  public data semantics, streaming, citations, source fields, headers, statuses,
  and safe errors. `/chat` remains canonical; the public `ModelPicker` is
  removed; `/connections` retains both its graph and an equivalent accessible
  list.
- Acceptance requires one blocking local/CI proof command, reviewed visual
  evidence at 320px, 768px, and 1440px, measured performance budgets, owner
  visual approval, and a documented rollback.
- Canonical context and the audit-only discussion log were committed in
  `08b0ef8`; GSD session state was committed in `2b198a2`.
- The approved Phase 1 roadmap amendment remains applied in the working tree
  and is not included in the discussion-context commits.
- No implementation, dependency installation, deployment, corpus change,
  provider change, registry mutation, or external-service mutation occurred.

### Next action

Run `$gsd-plan-phase 1`. Phase 2 remains queued behind Phase 1 acceptance, and
Phases 3 through 8 remain inactive.

## 2026-08-20 Client Phase 1/2 scope reconciliation checkpoint

- The owner explicitly selected preservation of the 23 committed repository
  Phase 1 plans from `0f80677`; no `01-*-PLAN.md` file was rewritten.
- The client build specification's “Phase 1” and “Phase 2” are now recorded as
  delivery tracks, not aliases for repository phases. Client Phase 1 spans
  repository Phases 2–4 after the proof harness; Client Phase 2 spans Phases
  5–9; migration closure is Phase 10.
- `.planning/REQUIREMENTS.md` now carries 102 unique v1.0 requirements across
  twelve families, including production membership/auditability, both-channel
  and uncut ingestion, segmented transcripts and alignment, hybrid retrieval,
  four-tier cited research, canonical calendar behavior, source adapters,
  automated reporting, cost observability, and evaluated clip intelligence.
- `.planning/ROADMAP.md` records the client acceptance spine, phase-specific
  prerequisites, delivery-track done conditions, and implementation boundary.
  Read-only adapters precede unified analytics; clip intelligence has its own
  human-owned evaluation gate.
- `ISA.md` adds and proves ISC-135 through ISC-140 for delivery-track mapping,
  blocker ownership, requirement coverage, and preservation of Phase 1 plans.
- Repository Phase 1 and Phase 2 remain the only implementation-authorized
  phases. Phases 3–10 remain planned and inactive pending Phases 1–2 acceptance
  and explicit owner authorization.
- No implementation, dependency installation, deployment, domain purchase,
  account change, provider spend, source ingestion, or external-service
  mutation occurred during this reconciliation.

### Next action

Review the reconciled planning diff, then execute the preserved Phase 1 plan
sequence with `$gsd-execute-phase 1` when implementation is explicitly started.
Before planning or executing Phase 2, settle deployment architecture, identity,
team roster, and the capability matrix.

### Verification

```bash
git diff --check -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md ISA.md .project/HANDOFF.md
node ~/.codex/get-shit-done/bin/gsd-tools.cjs roadmap analyze
git diff --exit-code 0f80677 -- .planning/phases/01-compatibility-component-proof-harness/01-*-PLAN.md
```

## 2026-08-20 Phase 1/2 execution alignment checkpoint

- Review confirmed that Phase 1 Plans 01-01 and 01-02 are committed and that
  their recorded package and compatibility approvals are internally consistent.
- The owner approved the minimal exact pre-existing pin amendment to
  `@types/node@22.12.0`; Vite 8.2.1 peer resolution completed without
  `--legacy-peer-deps` or an audit remediation.
- Plan 01-03 Task 1 passed its immutable exact-pin and non-watch-script gate.
  The approved Chromium installation completed without approving lifecycle
  scripts. Npm's reported advisories and denied transitive scripts were not
  remediated or approved.
- Plan 01-03 Task 2 failed closed because its immutable probe uses
  `require.resolve("@lhci/cli")`, while the approved package is CLI-only. Do
  not rewrite the preserved plan in place; create and approve a bounded
  correction plan that verifies the executable instead.
- GitHub Project `WTF Media — Phase 1 + 2 Execution` now mirrors only the
  authorized repository Phase 1 and Phase 2 work, their explicit decision
  gates, and the Plan 01-03 correction. Repository Phases 3–10 were not made
  executable on GitHub.
- The newly supplied logo was reviewed as a brand direction reference. Before
  its migrated-shell work begins, an owner-approved repository asset source and
  an explicit reconciliation with the existing wordmark constraint are still
  required; no external asset was copied into the repository.

### Next action

Plan the bounded correction to the Phase 01-03 LHCI probe, then resume Phase 1
from that correction. Phase 2 remains limited to its deployment, identity,
team-roster, capability-matrix, and field-policy readiness decisions.

### Verification

```bash
cd web && npm ls --depth=0
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
git diff --check
```

## 2026-08-20 Plan 01-03 LHCI correction completion checkpoint

- Owner-approved GitHub issue `#6` is resolved without changing any preserved
  `01-*-PLAN.md` definition or the mirrored validation ledger.
- `web/tests/security/phase1-threat-corrections/01-03-lhci-cli.json` is a
  strictly allowlisted correction record for only `T-01-07` and `T-01-08`. It
  binds each immutable command ID and SHA-256 digest to the exact failed,
  privacy-safe result before recording the approved executable CLI probe.
- `web/scripts/run-phase1-threat.mjs` accepts only that correction file,
  approval reference, two threat IDs, original binding, and replacement command
  digest. Unknown files, IDs, approval drift, command drift, or altered
  superseded evidence fail closed.
- Plan 01-03 Task 2 reran the actual `lhci` executable, recorded passing
  replacement evidence for both threats, and retained the original failed
  evidence inside the correction ledger. Task 1 was rerun and remains passed.
- The twelve approved package pins and the exact `@types/node@22.12.0`
  compatibility amendment remain installed; no lifecycle-script approval,
  peer-dependency bypass, audit remediation, deployment, or client-scope work
  occurred.

### Next action

Execute Plan 01-04 harness configuration only after its owned scope is reviewed.
Phase 2 remains limited to its recorded readiness decisions until Phase 1 is
accepted.

### Verification

```bash
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 2
npm --prefix web ls --depth=0
git diff --check
```

## 2026-08-20 Plan 01-04 privacy-harness correction checkpoint

- The Phase 1 execution record shows that Plan 01-04 Task 2's immutable
  `T-01-09` command invokes `npm run test:privacy -- --check`, while the
  scanner was first assigned to Plan 01-05, which depends on Plan 01-04.
- The owner resumed Phase 1 planning after this evidence. Commit `4d57e30`
  adds the smallest scoped correction: Plan 01-04 now owns the minimal
  offline scanner required by its existing command; Plan 01-05 still extends
  that scanner to the complete public-projection and generated-artifact scope.
- The 23-plan sequence, all immutable threat definitions, and the mirrored
  validation ledger remain intact. No external service, deployment, registry,
  credential, or Phase 2 work was changed.

### Next action

Resume `$gsd-execute-phase 1` at Plan 01-04. The implementation must create
the bounded scanner, rerun the threat runner, and retain only privacy-safe
digest evidence.

### Verification

```bash
git show --check --stat 4d57e30
node web/scripts/run-phase1-threat.mjs --plan 01-04 --task 2
```

## 2026-08-27 WTF OS whole-app shell (local working tree — not on origin/main)

- This checkpoint describes the **dirty local tree**, not `origin/main`.
  `5dc06fc` on main only switches `appUiVariant()` to `wtfos` and still
  renders tracked `PublicShell`. `AppShell`, `AppRail`, `MigratedHomePage`,
  and related files remain untracked.
- Locally, public and operator routes share one responsive application
  frame (`AppShell` / `AppRail`) with skip target, mobile drawer, workspace
  headers, semantic status ledgers, and explicit unavailable/not-activated
  states. `/ops/recover` stays outside the shell.
- Local `/` is a source-backed public Control Room (`MigratedHomePage`)
  with episode/show counts from catalogue data, named future systems, and
  a direct Ask workflow. It must not invent operational health.
- Binding design:
  `docs/superpowers/specs/2026-08-27-wtf-os-whole-app-shell-design.md`.
  Implementation sequence:
  `docs/superpowers/plans/2026-08-27-wtf-os-whole-app-shell.md`.
- No deployment, provider configuration, credentials, or protected content
  data was mutated by this local convergence work.

### Verification (local dirty tree only)

Commands below were recorded against the local tree. They are **not** a
fresh-clone `origin/main` receipt. `origin/main` currently fails Phase 2
Gate typecheck (`web/tests/component-trace.json` untracked) and Vercel
ESLint (`guest's` in committed `web/app/page.tsx`).

```bash
cd web
npm run typecheck
npm run lint
npm run test:contracts
npm run test:components
npm run test:privacy -- --check
npm run build
npm run test:rollback
```

### Next action

Land `wtf/wtf-os-shell-materialize` so this local shell exists on `main`,
then run A + D refinements (promoted dominant action + focus-return).
Do not start Plan 02-12 until the staging-authorization form is filled.

## 2026-08-27 session PR merge + next UI/UX wave

**Status:** PRs #7, #8, and #9 squash-merged to `origin/main`. Local main
fast-forwarded to `7defffa`. The ~120 other dirty files were not staged.

| PR | Squash commit | What landed |
|---|---|---|
| #7 | `baa90d8` | Podcast catalogue snapshot + owner questions; extractor no longer stores machine-local paths |
| #8 | `b9de2f8` | `scripts/session-pr.sh`, PR template, session-PR workflow doc |
| #9 | `7defffa` | Working-tree backlog with corrected main-build diagnosis |

Review notes: `/code-review ultra` was not launched (billed Claude Code
command). Grok review + follow-up commits resolved the only merge blocker
(absolute checkout/Downloads paths in `snapshot_sheets.py`). CI remains
red on `main` for reasons **outside** these PRs.

### Current remote vs local split

- **On `origin/main`:** Phase 1 plans 01-01..01-23 executed in history;
  Phase 2 plans 02-01..02-11 executed; 02-12 blocked on owner staging
  targets; WTF OS *variant default* is `wtfos` but presentation is still
  tracked `PublicShell` + pre-migration `web/app/page.tsx`.
- **In the dirty local tree:** `AppShell` / `MigratedHomePage` /
  `OperatorShell` adapters, journey/visual/threat evidence, Cloudflare
  docs, catalogue JSON refreshes. Highest-value follow-up is still
  `wtf-os-shell-materialize`, paired with `web/tests/component-trace.json`.

### Next UI/UX wave (Phase 1 + Phase 2 mapped)

See `.planning/STATE.md` Pending Todos. Execution order:

1. Unblock typecheck: commit `web/tests/component-trace.json`.
2. Materialize WTF OS shell (replaces lint-failing home page).
3. Refinement A (promoted dominant action) then D (focus-return). Local
   `AppRail` already has `aria-current` + attention active state (B).
4. Shell-dependent tests (journeys, rollback variants, visual, a11y).
5. Flip COMP/DSYS/QUAL Phase 1 rows in `REQUIREMENTS.md` only after
   `npm run verify:phase1` on the landed shell.
6. Close remaining 02-UI-SPEC gaps on `/ops` without activating Phase 3
   modules. Plan 02-12 stays owner-gated.

### Verification

```bash
git log --oneline -3 origin/main
# 7defffa docs(planning): categorize post-cleanup working-tree backlog (#9)
# b9de2f8 chore(workflow): add reusable session-PR scaffold (#8)
# baa90d8 docs(planning): snapshot podcast catalogue + draft owner questions (#7)
rg -n '/Users/|/Volumes/' .planning/inputs/podcast-catalog/tools/snapshot_sheets.py
# no matches
```

No registry, deploy, secret, or production mutation.

## 2026-08-28 Phase 2 WTF OS system-theme lock (reviewed local)

**Scope:** active WTF OS Phase 1/2 public, operator, recovery, graph, drawer,
and confirmation-dialog surfaces only. Legacy rollback behavior and unactivated
future workspaces were not changed.

- Added semantic light/dark token pairs, alpha-compatible Tailwind color
  channels, and a `data-wtf-theme="system"` contract scoped to WTF OS.
- Reduced background noise to static, low-opacity grain/dots; the Grainient
  and connections graph now redraw when the system preference changes.
- Migrated active shells, rails, cards, status labels, recovery, drawer, and
  operator dialogs to semantic foreground/surface/overlay roles. The raster
  wordmark receives a semantic plate on structural rails so its black letter
  remains legible in both themes.
- Added source and browser proof for semantic tokens, dark overlays, live
  graph re-theming, recovery routes, narrow layouts, and both operator dialogs.

### Verification (local dirty tree only)

```bash
cd web
npm run lint
npm run typecheck
npm run test:unit -- tests/unit/theme-contract.test.ts tests/unit/graph-theme.test.ts tests/unit/tokens.test.ts
npm run test:contracts -- tests/contracts/wtf-os-token-contract.test.ts tests/contracts/app-ui-variant.contract.test.ts
npm run test:components
npx playwright test tests/journeys/theme-system.spec.ts tests/journeys/episodes.spec.ts tests/journeys/connections.spec.ts tests/journeys/motion.spec.ts tests/journeys/shell-drawer-focus.spec.ts tests/phase2/operators.spec.ts tests/phase2/audit-ui.spec.ts --project=phase1-chromium-1440 --workers=2
```

All commands above passed: 23 focused unit checks, 9 contracts, 100 component
checks, and 47 focused browser journeys. Light and dark live renders were also
inspected locally after the normal boot interval.

### Handoff note

The Playwright server performs a production build in `web/.next`. Do not run
that suite concurrently with a manually started `next dev` process in the same
checkout: the production build replaces the development server's generated
artifacts. Restart `next dev` after the suite when an interactive visual review
is needed.

No deployment, registry, credential, production, or legacy-variant mutation
occurred in this wave.

## 2026-08-31 Ask WTF episode-scoped production release (source ready)

**Scope:** backend and Cloudflare retrieval contract only. PR #28 remains the
team-owned UI and was not edited.

- Release branch `codex/release-episode-scope` is based on `origin/main` at
  `fef9dedd`; the reviewed backend commit was transplanted without the older
  integration branch's unrelated drift.
- `/v1/chat` now accepts an optional public YouTube `episodeId`, applies a
  `video_id` Vectorize filter before `topK`, and post-filters returned matches
  so episode scope fails closed instead of broadening to unrelated evidence.
- Uncut R2 storage and citations remain hash/asset-addressed, while the mapped
  public YouTube identity is carried separately for episode retrieval.
  Structured ingest now emits `episode_id`, `video_id`, `source_asset_id`, and
  `source_mode` vector metadata. Batch admission rejects duplicate or
  mismatched public/private identities, including an uncut object key labeled
  as published or submitted without a mode.
- Queue admission and the consumer also require an exact available D1
  source-asset receipt for the public episode, R2 key, and content hash before
  queue mutation or vector staging.
- Published jobs keep the D1 transcript asset hash in `sourceContentHash` while
  their idempotency `contentHash` may additionally cover a timestamp sidecar;
  this preserves all 43 timed published jobs during the post-index re-upsert.
- Text-only uncut chat may use untimed evidence without timeline alignment.
  Synced playback and timestamp projection remain unavailable until trusted
  alignments exist.
- The PR #28-compatible web adapter forwards the public episode ID through
  `/api/chat` without redesigning the team-owned UI.
- Read-only manifest reconciliation found 49 mapped jobs from 52 rows, with 3
  held. The original job manifest carried 49 stale generic content hashes, so
  the new preflight rejects it. A private generated activation plan instead
  re-hashes the 49 local text assets, verifies each mapped storage key and
  metadata digest, and normalizes only the queue content hash.
- `main` retained a calendar import after its reviewed module, migration, and
  tests disappeared. Those exact release-integration files are restored so the
  edge bundle can deploy without altering the calendar contract.
- Verification passed: 149/149 Cloudflare tests, 14/14 source-mode tests,
  19/19 transcript-ingest tests, 4/4 queue-admission tests, manifest and
  activation script tests, Worker bundle dry-run, `git diff --check`, and
  final read-only review.

The owner approved production on 2026-08-31. Source is committed locally and
the compatibility receipt is updated. Live Vectorize still needs the
`video_id` metadata index before intended vectors are re-upserted. No push,
merge, deploy, upload, enqueue, DNS, secret, or live-data mutation had occurred
at this checkpoint. Full evidence and operator gates are recorded in
`docs/handoffs/2026-08-31-ask-wtf-episode-scope-backend.md`.

## 2026-08-31 Ask WTF episode-scoped production completion

**Scope:** backend, Cloudflare corpus activation, and the minimal PR #28 web
adapter. Team-owned UI design remained unchanged.

- PR #32 merged as `a706b67`; its squash tree is identical to reviewed head
  `d812759`. PR #33 merged the Vectorize record-ID hotfix as `4349b98`; its
  squash tree is identical to reviewed head `2240c3c`. PR #34 merged the
  both-mode evidence-balancing hotfix as `b62fb1f`; its squash tree is
  identical to reviewed head `33f98f4`.
- The `video_id` Vectorize metadata index was created under mutation
  `aee5e299-588c-4d58-9780-0f3f9e87dcd8` before any intended vector was
  re-upserted.
- All 49 approved mapped uncut text objects were hash-verified and uploaded to
  the existing catalogue bucket. D1 then proved 49 targets, 49 public YouTube
  identities, and 49 exact available source-asset receipts.
- The existing 55 published jobs were re-upserted so their vectors carry
  `video_id`, and the 49 mapped uncut jobs were activated without creating
  timeline alignments or displacing published active transcript versions.
- Five uncut jobs initially reached the DLQ because a full hash plus namespace
  exceeded Vectorize's 64-byte record-ID limit. The hotfix preserves the full
  SHA-256 identity as base64url, passed 151/151 Cloudflare tests, and deployed
  as edge version `978d2d8d-3322-4e95-975f-e549dcada263` in deployment
  `6d115890-ebe3-46a5-945e-a6be5fb4401d`. Exactly those five activation
  messages were matched, replayed, and removed; the DLQ returned to its
  pre-release backlog of 18.
- Ingest completed with queue backlog 0, the DLQ unchanged at 18, and exact KV
  membership of 55/55 published plus 49/49 mapped uncut jobs. Vectorize ended
  at 11,948 vectors with both `source_mode` and `video_id` string indexes.
- The first web cut, version `334f4252-e71d-4b8b-b070-a4e5908b991a`, returned
  HTTP 500 on every public route because a symlinked dependency tree caused
  OpenNext to leave a dynamic middleware-manifest require in the Worker
  bundle. It was immediately rolled back under deployment
  `5ee9e63a-90d1-4a28-a42f-8cf4b4b13be0`. A clean local dependency restore
  changed no package or lockfile; the rebuilt bundle passed remote preview.
- The final web cut is version `90099f42-13b6-4a4e-8d97-bd93b9f953fa` in
  deployment `c981ac0a-c141-439b-a222-14ed28764d7f`. Web rollback remains
  version `8f19a895-9827-469c-8716-543adc375932` in deployment
  `5ee9e63a-90d1-4a28-a42f-8cf4b4b13be0`.
- Live both-mode evidence initially exposed uncut crowding at the six-citation
  limit. PR #34 reserves capacity for each available mode, passed 152/152
  Cloudflare tests, and deployed as edge version
  `75b96e1f-6fa6-4182-bbdd-99047399de64` in deployment
  `04e2a1a9-d796-41d9-bad5-3d952c8f206c`. Edge rollback is version
  `978d2d8d-3322-4e95-975f-e549dcada263` in deployment
  `6d115890-ebe3-46a5-945e-a6be5fb4401d`.
- Final live probes passed: home, episodes, and mapped detail returned 200;
  the detail form carried the public episode scope; published returned two
  grounded scoped citations, uncut returned six, and both returned six across
  both modes. An unmapped episode stayed scoped and truthfully reported uncut
  unavailable while using published evidence.

### Held boundaries

- No DNS, secret, Access/auth, ingest-token, provider credential, or unrelated
  Worker mutation occurred.
- Uncut evidence is chat-retrievable only where an approved mapping exists.
  Trusted timeline alignment and synced uncut playback remain unavailable.
- Root ISA and architecture work stayed in the user's dirty checkout and was
  neither staged nor rewritten.

## 2026-09-01 WTF OS v0.3.1-alpha.1 release candidate

The clean release branch `codex/v0.3.1-alpha` is based on `origin/main` at
`v0.3.0-alpha.1` and contains the generated WTF OS favicon/app-icon set,
metadata manifest wiring, aligned `0.3.1-alpha.1` package versions, release
notes, and an exact-href browser regression for approved uncut Frame.io source
actions. The original dirty checkout remains preserved separately.

### Verification

- Production uncut probe returned `https://f.io/VrTLEcyQ` in `X-Sources` for
  episode `68ylaeBbdsg`.
- `HEAD -L https://f.io/VrTLEcyQ` returned the Frame.io redirect chain.
- Icon dimensions and alpha behavior were checked with `sips`; manifest JSON
  parses successfully.
- Web lint, strict typecheck, 85 web contract tests, 72 web unit checks, 154
  Worker tests, the focused browser journey, and architecture freshness checks
  passed on the clean release branch.

### Next action

PR #43 is open from `codex/v0.3.1-alpha` at the release candidate head; review
the pending GitHub checks before merging, and leave production promotion
separately gated.

## 2026-09-03 Beta consolidation — staging verification checkpoint

The isolated `codex/beta-consolidation` worktree reconciles the authenticated
history, server-generated answer persistence, server RAG path, Alpha/Beta
track gate, Access-protected release entry, logout return, and `03-00`
file-level integration receipt. The candidate's old Worker entrypoint,
temporary super-admin roster migration, broad public UI sweep, workflow noise,
and root checkout WIP were excluded.

Staging is isolated behind `wtfmedia-web-staging` and
`wtfmedia-edge-staging`. The committed Wrangler environments now default to
those suffixed names. Remote staging migration listing and apply both reported
no pending migrations. Edge and web staging deployments completed, and queue
inspection shows one staging producer/consumer owned by the staging edge.

The base Worker was restored from clean Alpha source after a target-resolution
mistake briefly changed its queue trigger. Production ingest now has exactly
one producer/consumer owned by the base edge. No production web deployment,
migration, data, secret, DNS, or ingest payload mutation was performed.

### Verification

- Cloudflare: 175/175 tests.
- Web unit: 81/81; contracts: 86/86; typecheck, lint, and privacy passed.
- OpenNext Cloudflare build passed and includes the same-origin operator API
  proxy, which preserves the Access assertion for edge enforcement.
- Full non-visual Playwright behavior/a11y/journey run: 228 passed, 8 skipped
  of 236; visual snapshot comparisons were not run.
- Rollback: 19 legacy plus 19 migrated checks passed across 8 route/variant
  combinations, with data integrity unchanged.
- Live staging: public `/` and `/chat` returned 200; `/ops/settings` and
  `/ops/api/*` returned Access 302; direct edge operator access returned 404.

Full evidence is in
`.planning/inputs/2026-09-03-beta-consolidation-evidence.md`. Interactive
Access login is still required for live session continuity, logout/reauth,
authenticated settings readback, and owner approval. PR #46 is open. The
hydrated public Alpha Playwright probe passed against `wtfhq.in` for `/` and
`/chat`; do not merge until the remaining authenticated rows are completed,
PR checks are green, and that public invariance result remains green.

## 2026-09-03 Beta consolidation UI and Alpha-preserving production cut

The Beta settings surface now projects sessions/history policy, disabled memory
governance, read-only RAG/source receipts, and protected operator-administration
readbacks from the reviewed `codex/beta-consolidation` branch. The existing
Access-to-edge context bridge is included so a verified session can hydrate the
server-rendered operator shell without trusting browser state.

The production code cut was deliberately Alpha-preserving: edge version
`1bd58a00-edbf-4c1e-a60d-fdc236ab5190` and web version
`3628cc71-e743-4dcc-bd5e-e9416ea560a5` were deployed with Beta remaining
server-disabled. Production has no operator secret set or production release
manifest activation, so no authenticated Beta session or release mutation was
enabled by this deployment.

### Verification

- Web unit: 86/86; contracts: 86/86; typecheck, lint, Next build, OpenNext
  build, and privacy scan passed.
- Cloudflare Worker suite: 176/176 passed.
- Non-browser live probes after deployment: public `/` and `/chat` returned
  200, malformed public `/api/chat` returned 400, `/ops/settings` returned
  Access 302, and unauthenticated operator-context access returned 404.
- The user-requested no-Playwright constraint was honored locally. The GitHub
  Phase 1 aggregate was canceled after its Playwright step began; Phase 2 and
  architecture checks passed. PR #46 remains open and unmerged.

## 2026-09-03 Beta consolidation navigation restoration (local, deploy held)

The shared WTF OS shell now restores the persistent `wtf-bottom-pill` on the
isolated `codex/beta-consolidation` branch. The header and bottom navigation
use distinct IDs, the shared WTF OS wordmark is rendered in both shell
surfaces, and the fixed Ask Composer is offset above the bottom rail. Public
`/chat` and `/api/chat` contracts remain unchanged; authenticated history
continues to live at protected `/ops/chat`.

The branch already contained the canonical same-origin Access login target:
`/cdn-cgi/access/login?redirect_url=%2Fops%2Fsettings%3FreleaseTrack%3Dbeta`.
No Access, D1, cache, secret, DNS, deployment, or Beta activation mutation was
performed. The shared checkout's unrelated dirty ISA/architecture work was not
edited.

### Verification

- Web unit: 87/87; contracts: 86/86; typecheck, lint, production build, and
  privacy scan passed.
- Cloudflare Worker suite: 176/176 passed.
- Architecture ledger was regenerated and its freshness check passed.
- Read-only production probes found `wtf-bottom-pill` and two WTF OS wordmark
  markers on `/` and `/chat`; `/ops/settings?releaseTrack=beta` returned the
  Cloudflare Access 302 with the canonical return target.
- Playwright was not run, per the current checklist. Browser layout, signed
  session continuity, logout/reauthentication, and live deployment parity
  remain evidence gates before PR #46 can merge or Beta can activate.

The two bounded external read-only audits were unavailable during this pass:
Antigravity returned quota 429 and the GitHub Claude audit aborted without
substantive output. Repository evidence was used instead; no worker output was
accepted as validation.

## 2026-09-08 Clerk Beta auth UI flow and motion slice (local, deploy held)

The Clerk operator entry and recovery states now share a branded
`OperatorAuthFrame` that makes the protected handoff explicit: Clerk identity,
edge-resolved roster role, then permitted Control Room access. The public Alpha
route remains anonymous and keeps its own shell. Recovery and unavailable states
use the same frame without loading operator data or inferring access from the
browser, URL, or local storage.

The public WTF OS boot overlay now includes a restrained “receipts become
actions” status moment and print-rule separator. The staggered text and animated-list
patterns were selected through the React Bits registry/MCP and adapted locally
to the existing semantic tokens, wordmark plate, motion durations, and reduced
motion policy. No React Bits credential, env file, provider secret, deployment,
or external project state was changed.

### Verification

- Web unit: 86/86; contracts: 86/86; typecheck, lint, and Next production build
  passed.
- In-app browser verification at desktop and emulated 320px reduced-motion
  state confirmed the recovery flow, three handoff steps, no document overflow,
  and no running animation under reduced motion.
- Non-reduced-motion browser verification confirmed the text/list transitions
  settle to opacity 1 and zero transform, with no runtime error overlay.
- Headless Playwright could not start because the local Chromium executable is
  not installed; visual snapshot approval and live Clerk widget interaction
  remain open gates.
- The local environment has no `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, so the
  rendered route is the truthful provider-unavailable state. Staging Clerk
  sign-in and the post-auth RBAC readback still require interactive verification.

## 2026-09-08 Clerk live-widget and beta UI readiness audit (local, deploy held)

The local operator route was re-run with the development Clerk configuration
loaded only into the running process. The actual Clerk widget rendered at
`/sign-in?redirect_url=%2Fops`, with email/password, Google, sign-up, and
Clerk development-mode states visible inside the WTF OS operator frame. No
credential, verification code, session value, or provider secret was entered or
committed. Interactive account completion remains a user handoff.

The deployed evidence does not yet match this source state. Staging
`/sign-in` still renders the former Cloudflare Access recovery page and
staging `/ops` still renders the Access-required shell; production `/sign-in`
still says sign-in is not in this release. The configured staging D1 lookup
returned Cloudflare API 7404, so there is no trustworthy live operator-roster,
chat-history, or memory receipt from the current account. No deployment,
migration, DNS, secret, or external provider mutation was performed.

The settings surface now includes a static Beta Readiness Ledger, alongside
the session/history and memory-governance panels. It makes the current states
explicit: Clerk widget and session/recovery need live receipts; Clerk-to-D1
mapping and account history have local contracts; cross-chat memory remains
not activated. Chat navigation now has explicit `new chat` and `back to
history` affordances. These are truthful UI states, not activation claims.

### Remaining UI and settings gaps

- The operator context strip still shows environment, workspace, effective
  role, and verification time, but not the signed-in Clerk identity or session
  lifecycle controls. Add a safe identity/session readback and active-session
  revoke/reauth path after live policy approval.
- Clerk development configuration currently has a seven-day maximum session,
  public sign-up, MFA disabled, and development only. The beta policy target
  is a 720-hour session with approved MFA and a production Clerk configuration;
  these must be activated and re-verified before deployment.
- History is intentionally operator-scoped and archive-only. The current UI
  has no pagination for the API cursor, per-row archive action, rename flow, or
  rendered moments table; persisted source metadata remains the available
  provenance surface.
- Cross-chat memory has no D1 store, extractor, injection, forget controls, or
  runtime route. The settings panel is a governance gate only until the
  memory policy and implementation are separately approved.
- The navigation contract exposes history under protected `/ops/chat`, but
  there is no memory destination while memory is held. The secondary web
  policy map still contains an older settings/admin-only interpretation that
  should be reconciled with the edge control-room read policy before release.

### Verification

- Local Clerk widget: rendered in the in-app browser; credentials intentionally
  not entered by the agent.
- Web unit: 86/86; contracts: 86/86; typecheck, lint, and Next production
  build passed.
- Privacy scan: 0 violations across 314 bounded files; `git diff --check`
  passed.
- Staging and production HTTP/UI probes remain stale Access builds; staging D1
  operator verification is blocked by API 7404.

## 2026-09-10 staging member callback and sign-in refinement

The staging member sign-in surface now uses the compact, padded Beta frame and
keeps the public shell out of protected client transitions. Clerk's same-site
absolute callback is normalized back to the fixed internal `/beta` route; an
external callback remains rejected. The member-entry copy is invite-only and
the public Alpha chip resolves to `https://wtfhq.in`.

### Verification

- Targeted Clerk callback and theme tests: 12/12; web lint, TypeScript, and
  Cloudflare production build passed.
- Live staging probe confirmed the absolute `/beta` callback shows the member
  frame without the public navigation rail.
- The correct Clerk instance has one existing pending member invitation; no
  duplicate invitation was created or sent.
- Remaining human gate: accept that invitation, sign in, and verify the
  authenticated `/beta` member-context readback.

## 2026-09-10 member Beta admission gate and token-forwarding repair

The staging `/beta` route no longer streams the raw member-chat scaffold before
the member context has been admitted. An unsigned visitor is redirected into
the refined member sign-in frame at `/sign-in?redirect_url=/beta`; a signed
session whose member record cannot be resolved receives a polished invitation
state instead. Chat, history, and saved memory render only after the context,
chat, and memory reads all succeed.

The same-origin Beta proxy now obtains the Clerk server-session token when the
browser has not supplied a bearer credential and forwards that token to the
staging edge. A caller-supplied bearer token is preserved unchanged. Edge D1
membership remains the authorization decision point.

### Verification

- Added proxy tests prove server-session token forwarding and preservation of
  explicit bearer credentials; focused unit suite passed 5/5. Web lint and
  TypeScript passed, and the Cloudflare production build completed cleanly.
- Deployed only `wtfmedia-web-staging`, version
  `711e807f-f1de-4e14-a00a-b994c1cffe7e`; production was not touched.
- Live unsigned `/beta` response contains the member-access-check frame and
  no `data-member-beta` or `private member chat` scaffold. Its context probe
  remains the intentional non-enumerating `404 ops_unavailable`.
- In-app browser navigation from `/beta` settled at
  `/sign-in?redirect_url=/beta` and visibly rendered the refined member sign-in
  UI. The remaining human gate is one invited-account session to prove the
  D1 activation, private chat, history, and memory reads end to end.

## 2026-09-10 staging invitation-ticket preservation repair

Clerk application invitations return a one-time `__clerk_ticket` to their
configured callback. The member Beta route now preserves a well-formed ticket
and routes it into the existing branded `/sign-up` Clerk component; ordinary
ticketless `/beta` visits continue to use the refined `/sign-in` member frame.
Future member invitations are issued with `/sign-up` as their bounded HTTPS
callback, while the member invitation validator continues to accept the legacy
`/beta` callback for invitations already sent.

The staging D1 invitation receipt was reconciled before this change: the
revoked provider invitation is terminally recorded as revoked, and the sole
pending Clerk invitation is the only `sent` receipt. Both reconciliation
steps have append-only member audit entries. No production resource was
changed.

### Verification

- Web: 102/102 unit tests, TypeScript, ESLint, and OpenNext Cloudflare build
  pass; the focused callback tests cover ticket preservation, malformed-ticket
  fallback, and the normal sign-in path.
- Edge: 208/208 tests pass, including member activation, private history,
  explicit memory, RBAC, and invitation lifecycle coverage.
- Staging deployments: `wtfmedia-edge-staging`
  `dd8e42ca-df07-4040-9abb-e30458036921`; `wtfmedia-web-staging`
  `e2df5d81-4633-4b49-a597-8251d8057a96`.
- Live unsigned `/beta/api/context` remains the intentional non-enumerating
  `404 ops_unavailable`; the authenticated member acceptance is the remaining
  human gate. The in-app browser cannot load Clerk's account host, so account
  completion must occur in a normal browser session.

## 2026-09-10 Beta canonical operator routing and verified session transport

All browser-facing operator work now has `/beta/ops` as its canonical route.
Legacy `/ops` UI routes redirect to their `/beta/ops` equivalents, while the
existing `/ops/api/*` Edge namespace remains unchanged as the protected
authority boundary. A Next rewrite serves the audited operator page tree at
the canonical Beta URLs, so the migration does not duplicate page logic or
weaken its existing server-side policy checks.

The browser and server-rendered operator paths now mint a Clerk server-session
token when the browser has not supplied a bearer credential, and forward that
token to the Edge for issuer/JWKS verification and D1 role resolution. The
Beta entry page checks verified operator context first, so an active operator
session enters `/beta/ops` rather than being shown the member-invitation state.

### Verification

- Web unit suite: 104/104 pass. New contracts prove `/ops/api` preserves an
  explicit bearer, forwards a minted Clerk token, and canonicalizes legacy
  protected return paths to `/beta/ops`.
- Web TypeScript, ESLint, and OpenNext Cloudflare build pass. Staging web
  deployment `432fe47e-e9be-41a3-956e-bfd5207e6279` is live; `/ops` returns a
  `307` to `/beta/ops`, `/beta/ops` and `/beta/ops/settings` return `200`, and
  unsigned `/beta/api/context` remains the intentional `404 ops_unavailable`.
  The full local Phase 2 gate passes after its browser assertion was updated
  from the retired `/ops/production` URL to `/beta/ops/production`. Production
  is out of scope. The remaining human receipt is one signed-in session
  reaching `/beta/ops` through the Clerk-to-Edge token handoff.

## 2026-09-10 invitation callback session-precedence repair

The `/beta` callback now gives a well-formed `__clerk_ticket` precedence over
an existing or partial Clerk session. It redirects that ticket immediately to
the branded `/sign-up` component, which is the only page allowed to consume
the invitation. This prevents a callback with `__clerk_status=sign_in` from
trying to fetch the private workspace before Clerk finishes invitation
acceptance.

### Verification

- Focused callback/proxy unit tests: 10/10; TypeScript, ESLint, and OpenNext
  Cloudflare build pass. The Clerk CLI was read-only healthy but linked to a
  different development instance, so it was not used to inspect, create, or
  revoke the target invitation.

## 2026-09-10 explicit browser-token forwarding repair

The staging D1 release row is `preview`; the intended address still has an
`invited` member row without a Clerk user ID, while its independent operator
row is active `super_admin`. The Beta client now obtains Clerk's browser token
and supplies it explicitly on every operator-context, member-context, chat,
and memory request. The web proxy preserves that bearer for Edge issuer/JWKS
verification, allowing the existing invitation to activate membership only
when the verified Clerk subject and normalized email match.

### Verification

- Web unit suite: 104/104; TypeScript, ESLint, and OpenNext Cloudflare build
  pass. This is an authorization transport repair, not a staging data bypass.

## 2026-09-11 Beta 0.1 PR and Cloudflare placement checkpoint

**Status:** SOURCE-ONLY PR OPEN — PR #77 from branch `beta_0.1`, base
`release/beta@498c0e0`. No merge, tag, migration, deployment, traffic, secret,
DNS, Clerk, queue, ingest, corpus, or production mutation occurred.

- The complete resource and data-flow authority is
  `docs/releases/beta-0.1-cloudflare-promotion-map.md`. It separates web
  OpenNext/`ASSETS` delivery from catalogue R2, D1 authority, derived
  Vectorize/KV state, Workers AI, and queue transport.
- Named-profile read-only inventory confirms separate production and staging
  web/edge Workers, D1, R2, Vectorize, KV, and ingest queue/DLQ resources.
  Current 100%-traffic deployments exist for all four Workers, but they predate
  this candidate and are not evidence that its source or bindings are live.
- Staging D1 reports migrations 0012-0015 unapplied; production D1 reports
  0011-0015 unapplied. The principal-profile and deletion/session schema is
  therefore source-only until a reviewed environment-specific migration and
  deployment receipt exists.
- The latest deployed staging edge binding receipt predates the source-declared
  Clerk issuer/JWKS/authorized-party configuration. A fresh edge binding
  receipt is mandatory after any authorized staging deploy.
- `wtfhq.in` is reachable, but its custom-domain/route attachment is not
  declared in either Wrangler file. Traffic attribution remains an external
  Cloudflare receipt rather than a source claim.
- PRs #57 and #59 are open and conflicting against the same base. Their older
  auth/session work is superseded by this integrated candidate; do not stack,
  cherry-pick, close, or merge them automatically.
- Safe staging order: inventory and recovery receipt → apply reviewed staging
  migrations → deploy edge and verify bindings/health → deploy web and verify
  its staging-only service binding → execute the real Clerk/D1 IAB persona and
  responsive matrix. Production needs a new owner-authorized task after that.

## 2026-10-17 social analytics source handoff

**Status:** Local source integration prepared for review; no Cloudflare deploy.

- The WTF OS social analytics workspace uses Zernio's hosted connection flow
  for LinkedIn, Instagram, Facebook, and X (Twitter). It shows account status,
  unified metrics, date/platform filters, daily observations, and top posts.
- A local-only page and server-only API routes require loopback hostnames and
  `SOCIAL_ANALYTICS_LOCAL_ENABLED=1`. The Zernio key and profile ID belong in
  ignored `web/.env.local`; no credential is committed or supplied to clients.
- The public local hamburger links to `/social-analytics`. An authenticated
  Beta route at `/beta/social-analytics` is registered under `analytics:read`
  and appears in local Beta hamburger navigation when Clerk is configured.
  Both routes stay unavailable on staging and production as currently gated.
- REPORTED by the PR author, not reverified during integration: their Zernio
  workspace returned a dashboard response and hosted X connection URL. Their
  existing Instagram account was inactive and required reconnection.
- Local checks passed: 246 web unit tests, TypeScript, ESLint, rendered page,
  CSS asset, and hamburger placement. A signed-in Beta session could not be
  exercised in this checkout because no local Clerk key was configured.

## 2026-10-21 — Direct Claude Task 4 (local, shared checkout)

- Approved Task 4 replaces active Ask WTF/YouTube/social generation with direct
  `claude-sonnet-5-5` using server-only `ANTHROPIC_API_KEY`. Includes classifier,
  repair, reformulation, follow-ups, moment labels and the local web generation
  fallback. Embeddings, evidence authority, calculations and RBAC are preserved.
- Bounded retry/cancellation, safe provider errors, schema-planned analytics,
  fixed model allowlists, truthful local-generation readiness, config example
  and privacy scanning are updated. Failed enrichment no longer multiplies
  credential failures through per-moment retries. Historical model reads remain.
- VERIFIED-SOURCE: final non-research edge 508/508, earlier full edge 563/563,
  web unit 415/415, web contracts 101/101, typecheck/lint pass, privacy 0/433.
  Restricted-sandbox subprocess/socket stalls disappear with normal local test
  permissions. No remaining old provider endpoint/key/helper in owned paths.
- Exact file manifest and integration boundaries: `docs/CLAUDE-GENERATION.md`.
  Parent owns research/Python integration and final architecture/build checks.
  Credentials/access and live model calibration remain unverified; staging-only
  deployment cannot switch shared Alpha Ask WTF. Alpha cutover requires distinct
  authorization. Self-reviewed source only; no secrets/dev.vars access, commits,
  push, deployment or research-owned edits by this task.

## 2026-10-21 — Research reader, flexible scope and Claude integration (local)

- Owner-approved plan: `docs/superpowers/plans/2026-10-21-research-ui-claude-migration.md`.
  Implemented on `feature/pavun`; no push/deployment, secrets, shared migrations,
  host configuration or corpus changes. Existing unrelated architecture narrative
  remains outside this delivery.
- Reader now has real Word export, owner-scoped sidebar deletion, simpler controls
  and shared citation cleanup. Removed editor/history/diagnostics UI preserves
  stored data. Additional info replaces new-note checkbox consent; legacy
  unapproved notes stay unapproved.
- Any nonempty guest/company/industry combination is accepted through browser,
  edge and runner. Clarification skip persists, excludes disputed identities and
  runs only clear scope. Entirely ambiguous subjects require a distinguishing
  detail. Inapplicable sections are explicitly skipped; no empty completed reports.
- Direct Claude Sonnet 5.5 transport covers research and all chat generation.
  Runner forwards only the new model credential; old secrets remain untouched.
  Typed streams, stop reasons, bounded retries, 4,000/8,000 summary retry and safe
  token diagnostics are tested. Report follow-ups use saved evidence without
  fresh searches. Google/Zernio/Treg and Alpha corpus authority are preserved.
- Session-keyed admission removes checking-access cards; stale responses and
  account transitions cannot restore previous private state. Controlled browser
  regression evidence only, not a new live Clerk acceptance claim.
- VERIFIED-SOURCE: edge 563; web contracts 101; web unit 415 plus 3 additional
  mixed-reference cases; Python 157; host 5; research browsers 68 (Chromium
  desktop/mobile, Firefox, WebKit); principal browsers 40. Typecheck, lint,
  production build and bounded privacy scan pass. DOCX opened in LibreOffice.
- Independent review fixed mixed reference-link destinations and stale-version
  clarification recovery. Final architecture artifacts accompany this source.
- Remaining: key/model-access smoke, full real report/analytics/chat calibration,
  real Clerk account matrix and actual Mac/iPhone/Word checks. Staging-only
  deployment cannot migrate shared Alpha Ask WTF; its cutover remains separately
  authorized. No live inference/deployment success is claimed.

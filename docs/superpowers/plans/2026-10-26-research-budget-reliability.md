# Research budget reliability implementation plan

Make research preparation, report writing and optional diagrams use explicit limits, preserve completed findings, and show the actual reason when work stops. Keep the current overall reservation ceiling while preventing optional work from consuming capacity needed for the report.

Status: implemented locally on `feature/pavun` after owner authorization. Source review and documentation updates are complete; automated checks and runtime acceptance remain unexecuted. Policy-1 submission activation remains gated for a separately requested compatible rollout. The owner will perform application testing; no browser automation, live research, provider calls, deployment or credential changes are part of this plan.

## Evidence and diagnosis

The latest saved staging run retained 125 sources. The guest profile failed with `budget_exhausted` before its visual-generation step. The company, industry and interview sections subsequently completed, and their visual steps ran. Diagram generation did not cause the first section's failure.

The exact limit was not retained. A per-stage call limit is the leading explanation, but a per-call retry or provider-cost limit cannot be excluded from the saved error. Do not retrospectively label this run with an unrecorded cause.

Source inspection establishes these separate constraints:

| Constraint | Current behavior | Problem |
| --- | --- | --- |
| Stage calls | `Calls.check()` blocks at 12 calls; `Calls.stage()` resets an in-memory counter | Shared GPTR planning, search and extraction can consume the first section's allowance. Resets and process recovery obscure the work boundary. |
| Whole-job reservations | Edge submits 5,000,000 micro-units; each model attempt reserves 250,000 | This is a $5 internal reservation ceiling, not a confirmed provider invoice. Anthropic token usage does not settle an actual dollar charge. |
| Per-call attempts | Store permits at most two attempts for a tool call key | Exhaustion becomes the same generic budget error. |
| Provider cost | Tool adapters reject reported charges exceeding the reserved amount | This distinct condition also becomes a generic budget error. |
| Error transport | Local exceptions have different messages, but hosted storage returns only `BudgetExceeded` | The cause is lost before the UI can explain it. |
| Optional visuals | One model request may run after each section | Its reservation can reduce capacity for later required sections even though a diagram itself is optional. |

An earlier run separately showed TREG search HTTP 401 failures, zero sources and subsequent budget exhaustion. The worker overwrote the earlier authentication cause with the last section failure. Both cases require better orchestration and diagnostics.

## Intended report flow

1. Resolve the supplied subjects and approved editorial scope.
2. Collect dossier and channel evidence with durable checkpoints.
3. Complete shared planning, search, extraction and evidence summaries once.
4. Write each applicable report section and perform its numeric review.
5. Save completed text and sources before optional enrichment.
6. Generate source-supported diagrams only from remaining capacity.
7. Finish with an accurate completed, partial or failed status and a specific explanation.

Preserve the existing Alpha historical-context boundary, six-channel coverage, evidence retention, source IDs, citations, cancellation, ownership checks and Word rendering. Do not create a second transcript corpus, reduce source coverage silently, raise the overall ceiling by default, or restart research automatically.

## Task 1 Preserve the actual limit reason

Files: `research/store.py`, `research/providers.py`, `research/diagnostics.py`, `research/contracts.py`, `research/remote_store.py`, `research-host/src/store.js`, `research-host/src/index.ts`, `cloudflare/src/research-contract.ts`, `web/lib/research.ts`.

- [x] Give limit exceptions structured, allowlisted metadata instead of interpreting arbitrary exception text.
- [x] Keep the existing `budget_exhausted` code for compatibility and add an optional validated `limit` object to failure DTOs and projections.
- [x] Define `limit.kind` as `stage_calls`, `job_reservation`, `call_retries` or `provider_cost_overrun`. Absent metadata means unknown; never guess for older reports.
- [x] Include a code-owned phase and bounded `used` and `maximum` integers where known. Counts apply to call limits; micro-units apply to reservation/cost limits. Do not mix these units or describe reservations as actual charges.
- [x] Return this optional metadata from the private store RPC and reconstruct it in `RemoteStore`. Preserve existing error names and fail closed on malformed metadata; never fall back to local storage.
- [x] Extend diagnostic whitelists, Python validation, Edge projection and web validation together. Logs contain only phase, count, limit kind and existing safe provider/status fields, without prompts, responses, secrets or private identifiers.

Completion condition: local and hosted paths distinguish all four limits; legacy failures still render without invented detail.

## Task 2 Separate shared preparation from section writing

Files: `research/worker.py`, `research/gptr.py`, `research/evidence.py`, `research/providers.py`; add `research/budget.py` for phase policy if needed.

- [x] Extract a shared `prepare()` operation from `GPTREngine.tier()`. It owns the existing GPTR planner/conductor, retained-source extraction and evidence summaries. Keep GPTR as the research engine.
- [x] Checkpoint successful preparation before entering the section loop. `tier()` consumes prepared context and writes only the requested section; it does not repeat discovery or charge shared work to the guest profile.
- [x] Replace anonymous `stage()` resets with explicit phase boundaries: resolution, dossier discovery, channel discovery, preparation planning/search, extraction, summaries, section writing, numeric review and visuals.
- [x] Give phases documented bounded allowances. Start with the existing 12-call ceiling per logical phase; preserve the existing two-query and eight-extraction bounds. Do not reset the counter for every item or failure to bypass a limit.
- [x] Use the existing 48 KB summary batches to calculate required summary work before dispatch. If the bounded plan cannot fit, stop at preparation with the precise limitation. Do not silently discard evidence or label the first section as a failed writer.
- [x] Preserve cached summaries and successful extraction checkpoints across retries and recovery. Completed shared work must not be purchased again just because another section begins.

Completion condition: adding guest, company and industry fields does not make the guest profile pay for the entire shared research phase.

## Task 3 Enforce budgets consistently across retries and restarts

Files: `research/budget.py`, `research/store.py`, `research/remote_store.py`, `research/providers.py`, `research/contracts.py`, `cloudflare/src/research.ts`, `research-host/src/store.js`, `research-host/src/index.ts`.

- [x] Make phase admission store-backed and lease-fenced. A process restart must not reset spent allowances, and concurrent GPTR callbacks must not oversubscribe a phase.
- [x] Add an atomic call-admission operation that checks the phase allowance, whole-job reservation and per-call retry allowance before recording a dispatched attempt. Use the same semantics in SQLite and the hosted Durable Object store.
- [x] Reuse existing tables initially: keep bounded budget policy/counters in a store-owned namespace within `jobs.state`, keyed by allowlisted phase and section. Store `save` must preserve this namespace so stale worker checkpoints cannot overwrite counters. If that cannot be made atomic without schema changes, revise the plan before introducing a migration.
- [x] A cache hit does not count as a new provider call. Every billable dispatch/retry does count. Keep the existing call-key/idempotency protections, and reject stale leases.
- [x] Keep the current 5,000,000 micro-unit job ceiling and conservative treatment of unknown model charges. Do not change accounting to actual-token pricing without a separately verified pricing policy.
- [x] Estimate outstanding writing and numeric-review reservations after preparation. Prioritize required report work; if it cannot all fit, preserve available findings and report insufficient remaining reservation explicitly.
- [x] Load older jobs under their recorded policy. Never reset their reservations or grant a fresh budget during a deployment. Unknown historical phase usage must remain unknown or be reconstructed conservatively from durable records, not treated as zero.
- [x] Add an optional validated budget-policy version to the job payload. Missing versions retain legacy behavior. Enable the new version for newly submitted jobs only after compatible hosted storage and the runner are deployed; do not reclassify an already queued or running job.

Completion condition: changing phases or restarting the worker cannot bypass either the job ceiling or a retry limit.

## Task 4 Generate diagrams after the core report

Files: `research/worker.py`, `research/visuals.py`, `research/budget.py`.

- [x] Move visual generation out of the per-section writing loop into a final enrichment pass after required text and numeric-review work.
- [x] Save each completed core section first. Check the remaining reservation before every visual call; allow at most one visual request per applicable section under the existing bounded provider behavior.
- [x] Keep diagrams optional. Insufficient remaining budget, invalid diagram evidence or a visual-provider error adds a clear limitation without changing a completed text section to failed.
- [x] Checkpoint each visual outcome, including intentional omission, so restarts do not duplicate diagram requests. Preserve the original section's primary failure if core work failed.
- [x] Retain the existing quote/source validation, complete-fence insertion, 24,000 UTF-16-unit limit and common reader/Word rendering. Do not add an image provider or external image downloads.

Completion condition: optional graphics cannot starve later required sections or erase usable findings.

## Task 5 Stop unrecoverable work and preserve the cause

Files: `research/worker.py`, `research/source_channels.py`, `research/gptr.py`, `research/diagnostics.py`.

- [x] Preserve the earliest causal failure for the report, with individual section failures retained separately. Later budget or skipped-work outcomes must not overwrite a prior authentication failure.
- [x] Stop shared discovery when the common TREG search path rejects authentication and there is no usable retained evidence. A failed dedicated social endpoint alone must not disable otherwise working web research.
- [x] If sufficient evidence was already retained, allow only bounded work that can use it without calling the broken provider. Explain the missing coverage.
- [x] Treat a common preparation failure as a report preparation failure rather than repeating it as four unrelated writing failures. Do not repeatedly invoke writers with no evidence.
- [x] Stop admitting new paid work after whole-job reservation exhaustion. For an isolated phase failure, continue only work whose prerequisites and reserved capacity remain available.
- [x] Preserve `Stopped` propagation, deleted-job tombstones, cancellation and lease checks. Do not auto-resubmit failed reports or introduce a new Retry UI in this change.

Completion condition: a shared search authentication failure produces an authentication message, while a genuinely limited phase produces its specific limit message.

## Task 6 Explain the outcome in the reader

Files: `web/lib/research.ts`, `web/components/domain/beta/ResearchWorkspace.tsx`, `web/components/domain/beta/ResearchContent.tsx`; update export wording where it shares failure summaries.

| Condition | Reader wording |
| --- | --- |
| Preparation phase exhausted its call allowance | Research preparation reached its request limit. Available findings have been retained. |
| Whole-job reservation exhausted | This run reached its configured research allowance. Available findings have been retained. |
| Per-call retries exhausted | A provider request reached its retry limit. |
| Provider cost exceeded reservation | A provider request exceeded its reserved allowance, so further work was stopped. |
| TREG authentication failed | Research search could not authenticate. Update the search provider configuration before starting another brief. |
| Only optional visuals omitted | The written report is complete. Some diagrams could not be generated within the remaining allowance. |
| Legacy generic budget error | A research limit was reached. This older run did not record which limit. |

Keep the main reader concise. Show the affected human-readable phase or section and the completion count where useful; do not expose internal phase IDs or a new diagnostics dashboard. Existing failed and partial reports remain unchanged in storage.

## Validation criteria for implementation

These are future acceptance checks, not instructions to execute tests during planning. The owner's current instruction remains: no automated browser/computer testing or live research runs. Record any unexecuted checks honestly when implementation is delivered.

| Scenario | Required outcome |
| --- | --- |
| Shared preparation plus four report sections | Preparation has its own limits; the first section does not fail merely because shared work used its allowance. |
| Each of the four limit kinds | Local storage, hosted RPC, Edge and reader preserve the same reason and units. |
| 125 retained sources with bounded summaries | Evidence is processed under the declared plan or stops with a truthful preparation limit; none is silently dropped. This source count alone is not an exact replay of the reported failure. |
| Twelve allowed dispatches and the next request | The next dispatch is blocked atomically; cached results remain available without another charge. |
| Worker restart or competing callbacks | No duplicate successful work, reset allowance, stale-lease write or overspend. |
| Budget available for core text but not visuals | Applicable text sections finish; visuals are omitted with a limitation. |
| TREG HTTP 401 with no evidence | Stop dependent work and retain authentication as the primary cause. |
| One dedicated channel fails but web works | Preserve usable web evidence and truthful channel coverage. |
| Partial report and cancelled/deleted job | Preserve authorized completed content; never resurrect deleted work. |
| Older stored reports and jobs | Readable records, conservative existing accounting and a neutral message for unknown limit reasons. |

Relevant existing suites for a later authorized check: `research/tests/test_providers.py`, `test_runner.py`, `test_failure_details.py`, `test_gptr_compat.py`, `test_source_budget.py`; `research-host/tests/store.test.mjs`; `cloudflare/tests/research-contract.test.mjs` and `research.test.mjs`; `web/tests/unit/research-metadata.test.ts` and `research.test.ts`.

## Delivery order

1. Implement structured metadata and backward-compatible readers/store RPC first.
2. Implement atomic phase admission and shared preparation.
3. Move visuals to the final optional pass and fix failure propagation.
4. Update reader messages and document acceptance evidence without claiming unperformed checks.
5. Keep changes local on `feature/pavun`. Push or deploy only under the owner's delivery instruction.
6. For a separately requested staging release, publish compatible Edge/Web readers and hosted-store support before enabling the new runner policy. Old RPC errors remain accepted. Make new failure fields optional so rolling versions do not reject reports.
7. Build and pin a new research image for the exact candidate, record Worker versions and image digests, and preserve durable state and credentials. A rollback must retain readers capable of displaying newly stored limit metadata and must not reset job budgets. Before rolling back to a runner that cannot parse the new job-policy field, disable new submissions and drain or explicitly cancel affected jobs with owner authorization. Do not send new-format jobs to an incompatible runner or silently discard them. Existing schema-version-2 research jobs keep their recorded budget policy; the new budget-policy version is a separate field.

No shared Alpha change, provider/model switch, price change, credential rotation or database migration is included in the planned fix.

## Implementation receipt

- Added `research/budget.py` and atomic `admit`/`allowance` RPC parity with preserved
  store-owned state, cache-aware planning, conservative retry reservations and
  durable global admission breakers. No table migration.
- Extracted GPTR preparation, persisted its plan/extractions/summaries, separated
  writing/numeric phases, and preserved drafts and earliest failures on recovery.
- Moved optional visuals to the final pass with persisted omission/attempt state.
- Extended typed limits through Python, hosted RPC, Edge, browser and shared export
  wording; historical unknown limits remain neutral.
- Added offline regression cases and adapted existing GPTR fixtures to explicit
  preparation. They were not run. No browser, provider, build, or application test
  was executed. No push, deployment, credentials or shared database change.
- `RESEARCH_BUDGET_POLICY_VERSION=1` is deliberately not set in this task. Readers,
  hosted storage and a compatible runner must be released before new-job activation.
  All acceptance scenarios above remain pending owner testing; checked tasks refer
  to implementation, not passing acceptance evidence.

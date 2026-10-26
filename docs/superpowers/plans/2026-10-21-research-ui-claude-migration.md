# Research UI and Claude Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Simplify research creation and reading, export faithful Word reports, and use direct Claude Sonnet 5.5 for the four AI features without weakening evidence or account isolation.

**Architecture:** Keep the existing Next.js UI, Cloudflare edge, Alpha transcript retrieval and private Python research runner. Change presentation, validate flexible inputs throughout the existing pipeline, and replace generation adapters rather than rebuild the workflows. Browser rendering and Word export consume the same cleaned report representation.

**Tech Stack:** Next.js/React/TypeScript, Cloudflare Workers/D1/Vectorize, Python/GPT Researcher, Treg, Anthropic Messages API, Markdown/GFM, DOCX.

**Spec:** The owner's 2026-10-21 request and four screenshots, captured in the accepted requirements below. This is a plan only; no runtime or deployment change is included in creating it.

## Accepted requirements

| Area | Final behavior |
|---|---|
| Report actions | Remove Research again, Reload saved brief and Delete research from the report header. Keep Download Word. |
| Sidebar | Add a trash icon to deletable saved briefs, using the existing chat deletion interaction pattern. |
| Extra panels | Remove Edit brief, Version history, and Run details and limitations from the reader. |
| Research input | Any one of guest name, company name or industry is enough. Accept two or three too. Users can skip optional clarification and omitted topics; research stays within the supplied scope. |
| Additional info | Rename Private notes to Additional info; remove the checkbox. Submitted information guides searches, scope, comparisons, exclusions and writing. Dates are optional guidance, not the only purpose. |
| Report formatting | Remove citation debris such as `[, ]`; keep readable headings, lists and useful tables. Keep section-level source icons and expandable evidence. |
| Word export | Download a real `.docx` with the same report text, ordering, headings, tables, lists and source references as the reader. |
| Model | Direct Anthropic API, `claude-sonnet-5-5`, for Ask WTF, YouTube chat, social analytics chat, research and research follow-ups. |
| Navigation | Stop showing the checking-access card during ordinary authenticated page switches. |
| Identity correctness | Never silently replace the entered guest with a different person associated with the company. |

## Global constraints

- Work locally on `feature/pavun`; push and deployment are separate owner-requested actions.
- Alpha remains the sole transcript retrieval, inference and citation authority. No duplicate corpus or re-embedding is part of this work.
- Keep Google/YouTube, Zernio and Treg as data providers. Claude handles language/model work; it does not replace those data sources.
- Preserve server-side admission, capabilities, owner scoping, deletion tombstones and cancellation.
- Research remains worldwide research with an Indian audience context, not an India-only search restriction.
- Preserve six-channel discovery and the existing 20-per-channel allocation/redistribution policy.
- Existing reports and history remain readable. Removing a panel does not delete its stored data.
- Remove technical diagnostics from the reader, but retain meaningful incomplete/error notices and evidence-qualified claims.
- Keep the current scrolling behavior: top form scrolls normally, saved briefs remain sticky on suitable desktop sizes.
- No secret values, private prompts, notes or response bodies in source control, logs or planning artifacts.

## Review focus

- Conflicting identities: “Mukesh Bansal + Zomato” must not turn into a Deepinder Goyal report without clarification (Task 2).
- Old records: unapproved legacy notes must not become newly authorized provider input just because the checkbox disappears (Task 2).
- Citation cleanup: preserve genuine brackets, ranges, punctuation, code and unknown references while removing recognized citation wrappers (Task 3).
- Session transitions: logout, account switches and revoked access must never expose cached data from the previous principal (Task 6).
- Provider failures: truncation, partial streams and retries must not produce a completed empty report or duplicate billable work without bounds (Tasks 4–5).

## What the source inspection established

- All three research fields are required in `ResearchWorkspace.tsx`, `web/lib/research.ts`, `cloudflare/src/research-contract.ts` and `research/contracts.py`; changing HTML alone is insufficient.
- `ResearchContent.tsx` removes individual known citations through `replaceResearchCitations`. Grouped wrappers can remain as punctuation after their IDs disappear. Fix parsing once and reuse it for the screen and export.
- The UI currently exports a Markdown blob. It has no DOCX writer dependency. The Python dependency tree includes `python-docx`, but using the private runner just to download an already loaded report would introduce an unnecessary service dependency.
- `BetaPrincipalGate.tsx` already uses an identity/session key and is mounted in the Beta layout. Normal route changes should reuse admission. The reported repeated flash still needs runtime reproduction; a confirmed remount/session/loading trigger must drive the fix.
- The fourth screenshot names one guest in the sidebar and another in the report. It proves a visible inconsistency, but does not yet establish whether the cause is model resolution, stale state or mismatched saved output. Check all three.
- TypeScript model calls share `cloudflare/src/chat/openrouter.ts`; Python model calls use `research/providers.py`. Model/provider names also appear in contracts, error parsers, readiness checks and container environment forwarding.

## Claude decision

Anthropic documents the direct model ID as **`claude-sonnet-5-5`**. Use the Messages API with server-only `ANTHROPIC_API_KEY`. Before enabling it, verify the owner's key has access with a bounded smoke request. [Official model migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

This is a transport migration: move system instructions into the appropriate API field, handle typed content blocks and stop reasons, and remove incompatible OpenRouter parameters. Sonnet 5.5 requires different thinking/sampling settings; start with explicit low effort for planners and medium for research synthesis, then measure latency and quality. Do not carry across temperature, reasoning budgets or forced-tool settings blindly. [Official migration requirements](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

Use JSON-schema output for query plans and scope decisions, followed by the existing application validators. A schema-valid plan still needs date, metric, ownership and budget checks. [Official structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

| Feature | Claude responsibility | Data authority retained |
|---|---|---|
| Ask WTF | Reformulation, answers, evidence checks, follow-ups and moment enrichment | Alpha transcript retrieval and citation/timestamp validation |
| YouTube chat | Understand question, references, dates and comparison plan | Google APIs and synchronized analytics records; deterministic calculations |
| Social chat | Understand platform/account/post scope and comparison plan | Zernio and validated metric calculations |
| Research | Clarify subject, interpret Additional info, synthesize sections and answer follow-ups | Treg search/extraction and retained source evidence |

Workers AI embeddings stay unchanged. No automatic fallback to OpenRouter or OmniRoute will be introduced. Preserve legacy provider identifiers when reading old saved records.

## Task 1: Simplify the research reader and move deletion

**Files:** Modify `web/components/domain/beta/ResearchWorkspace.tsx`; reuse the interaction pattern in `web/components/domain/member/MemberSessionNavigator.tsx`. Update `web/tests/unit/research-workspace.test.ts` and `web/tests/research-browser/research.spec.ts`. If list summaries lack deletion authority, update `web/lib/research.ts`, `cloudflare/src/research.ts` and the list DTO to return an explicit server-derived `canDelete` flag.

**Interface:** Reuse the existing owner-scoped delete endpoint and cancellation/erasure behavior. Sidebar deletion takes the selected row ID, not a stale report closure. Shared read-only briefs do not gain deletion rights.

- [x] Add behavior tests for selected/unselected deletion, cancellation, permission denial, server failure and double-clicks.
- [x] Remove the three report header actions and the editor, versions and diagnostics panels. Remove their unused fetching/state where no remaining caller needs it; retain server history.
- [x] Add a labelled, keyboard-accessible bin button next to each eligible sidebar item. It must not be nested inside the item selection button and must be usable on touch screens.
- [x] Keep confirmation. Show immediate pending feedback, disable repeated deletion, clear the selected report on success and retain the item with an error on failure. Keep pending deletion state independent from report selection.
- [x] Retain report/source/follow-up views, running progress, clarification continuation and concise failed/partial notices. Existing unstarted drafts can retain Start research; do not reintroduce Research again under another name.
- [x] Run the targeted UI tests and commit the scoped change locally.

## Task 2: Flexible input, Additional info and subject integrity

**Files:** Modify `web/lib/research.ts`, `ResearchWorkspace.tsx`, `cloudflare/src/research-contract.ts`, `cloudflare/src/research.ts`, `research/contracts.py`, `research/scope.py`, `research/gptr.py`, `research/worker.py`. Update web research tests, `cloudflare/tests/research-contract.test.mjs`, `cloudflare/tests/research.test.mjs`, `research/tests/test_research_v2.py` and `research/tests/test_search_scope.py`.

**Interface:** Keep the existing three string keys and `audienceCountry: "IN"`. Normalize absent fields to empty strings; reject non-string supplied values. Require at least one nonblank value; each populated field retains its 2–120 character bound. Build titles by joining populated fields only. Keep schema-version compatibility and existing saved documents.

- [x] Add failing contract tests at browser, edge and runner boundaries for guest-only, company-only, industry-only, all seven nonempty combinations, whitespace-only, invalid types and oversized values.
- [x] Implement matching validation and contextual form feedback: “Enter a guest, company or industry.” Remove individual HTML `required` attributes.
- [x] Do not ask users to fill every omitted field. If an optional clarification is shown, offer **Skip and continue** alongside the answer action. Persist that choice for the run so it is not asked repeatedly. Keep omitted fields empty; never insert a guessed guest/company as a substitute. Preserve these decisions through reload and runner retries.
- [x] Rename the textarea/summary to Additional info. Remove checkbox state and checkbox validation from new submissions. Include short helper text explaining that this information guides AI research and public search uses derived topics.
- [x] Preserve the existing storage contract initially: newly submitted Additional info sets the existing processing-authorization flag. Do not change legacy false flags or automatically reuse previously unapproved notes. Update errors/copy and tests accordingly.
- [x] Test priorities, competitors, exclusions, interview angle, geography and optional dates. Feed this guidance to scope, query planning, synthesis and interview questions; keep instruction hierarchy and search privacy boundaries.
- [x] Trace subject identity through submitted input, resolved subject, run output, persisted brief and selected UI state. Add regression fixtures for a contradictory guest/company pair and a late response from a previously selected brief.
- [x] Keep explicitly supplied guest identity fixed. On a material conflict, reuse the existing clarification state: ask whether the user intends that person, the company's founder, or a comparison. Continue the same brief after their answer.
- [x] Make report sections depend on the requested scope: guest-only researches that person, company-only researches that company, and industry-only researches that industry. Relevant background can explain the selected subject, but must not become an unsolicited full report on another person/company/topic. Omit inapplicable sections rather than generate empty cards or invent a guest. Update completion checks and Word export so deliberately omitted sections are not reported as failed or incomplete; preserve the four-section layout when the supplied scope calls for all four.
- [x] A skipped clarification must not authorize a guessed identity. If the remaining input cannot identify a person safely, state the ambiguity and research only the clearly identified scope, or request a minimal distinguishing detail before making person-specific claims. Test skip/reload/retry, company-only without guest biography, industry-only without an invented company, and conflicting entities without silent substitution.
- [x] Tailor interview questions to the accepted scope and check generated section identities against the resolved subject before marking complete.
- [x] Run contract, scope and runner tests; commit locally.

## Task 3: Shared report formatting and genuine Word export

**Files:** Modify `web/lib/research.ts`, `web/components/domain/beta/ResearchContent.tsx`, `ResearchWorkspace.tsx`, and research writing prompts in `research/gptr.py` / `research/contracts.py`. Create `web/lib/research-report.ts` and `web/lib/research-docx.ts`, with `web/tests/unit/research-report.test.ts` and `web/tests/unit/research-docx.test.ts`; extend browser tests. Update web package/lock files only for dependencies actually required.

**Interfaces:** `prepareResearchSection(content: string, sources: ResearchSource[]): { markdown: string; citedSources: ResearchSource[] }` is used by both UI and export. `buildResearchDocx(brief: ResearchBrief): Promise<Blob>` exports the selected report snapshot. Use a Markdown syntax tree for recognized citations and GFM formatting; declare directly imported parser packages rather than relying on transitive dependency resolution.

- [x] Test grouped/bare/linked known citations, duplicate references, legitimate brackets, lists, tables, code, escaped characters, unsafe links and unknown references. Assert no `[, ]` remnants and no lost citation mapping.
- [x] Replace individual string stripping with citation-aware cleanup of the entire recognized citation group. Preserve stored raw reports. Apply the same presentation fix to existing reports immediately; no model regeneration is needed for punctuation cleanup.
- [x] Preserve section source chips, original platform colors and expandable details. Update prompts to use tables for comparisons, timelines and metrics with comparable columns, and prose/lists for narrative and interview questions. Do not force every paragraph into a table or invent missing values.
- [x] Add a browser-side, lazily loaded DOCX writer using the `docx` package; generate the file locally from already authorized report data. This avoids adding an export server or invoking research/model APIs. [DOCX project](https://docx.js.org/).
- [x] Export title, audience context, report status, coverage, all displayed section content, section source references and a source appendix. Use the same headings, emphasis, lists, table cells and hyperlink destinations. Include local platform icon assets with text labels; do not fetch arbitrary remote images.
- [x] Exclude application controls, sidebar, input notes, removed technical panels and follow-up chat from the report document. Collapsing a source panel must not remove its report references from export. Export partial reports only with their visible incomplete status.
- [x] Set label Download Word, `.docx` extension and the Office Open XML MIME type. Show “Preparing Word file…” and useful failure feedback. Preserve long titles, Unicode, rupee symbols and long source URLs.
- [x] Inspect generated DOCX contents and open a representative file in Word or LibreOffice. Check text/order parity, lists, links, source icons and multipage tables; verify responsive browser tables too. Page breaks/font wrapping may differ between Word clients, but report content must match.
- [x] Run formatter/export/browser checks and commit locally.

## Task 4: Direct Claude adapter for Ask WTF and analytics chats

**Files:** Create `cloudflare/src/chat/claude.ts`; migrate callers in `chat/answer.ts`, `chat/public-chat.ts`, `chat/moment-pipeline.ts`, `analytics-assistant.ts`, `social-analytics-assistant.ts`, `social-analytics.ts`, `member-router.ts`, `index.ts` and affected environment types. Update `web/app/api/chat/route.ts`, `web/lib/models.ts`, model-picker labels/allowlists and related fixtures. Replace obsolete adapter tests with `cloudflare/tests/claude.test.mjs`; extend existing chat/analytics tests and contract suites.

**Interface:** Provide `claudeChat(env, messages, options)` returning the existing `{ answer, model }` contract. Options include output token budget, abort signal and optional output schema. Update callers explicitly rather than keep misleading OpenRouter function names. Use existing fetch transport; no general multi-provider framework is needed.

- [x] Write mock API tests for system/message translation, text blocks, structured output, refusals, empty response, truncated response, timeout, cancellation, 401/403, 429 and 5xx. Ensure only safe metadata reaches logs.
- [ ] Implement the direct Anthropic request and response adapter. Verify the key/model separately before enabling deployment configuration. Keep bounded retries within the caller's deadline; do not retry invalid credentials or invalid request parameters.
- [x] Migrate every generation call, including hidden classification/repair/enrichment paths. Preserve Ask WTF's public answer/source/fallback contract and transcript-only grounding behavior. Remove selectable legacy model routes for new turns while retaining historical metadata parsing.
- [x] Migrate analytics query planning to schema output and keep existing validation/calculation code. Test a single-video follow-up after comparison, date changes, lifetime versus date-range requests, absent data versus zero, and platform-specific metrics.
- [x] Add server-only `ANTHROPIC_API_KEY` configuration placeholders and redaction rules. Keep the key out of frontend bundles and client DTOs. Keep existing credentials untouched until separately authorized cleanup.
- [x] Run affected edge, web contract and privacy tests; commit locally.

## Task 5: Direct Claude throughout the research runner

**Files:** Modify `research/providers.py`, `research/gptr.py`, `research/chat.py`, `research/contracts.py`, `research/diagnostics.py`, `research-host/src/index.ts`, model readiness/configuration examples and relevant TypeScript DTO parsers in `cloudflare/src/research-contract.ts` / `web/lib/research.ts`. Extend `research/tests/test_providers.py`, `test_gptr_compat.py`, `test_failure_details.py`, `test_runner.py` and model metadata tests.

**Interface:** Keep the runner's existing model-call interface, but implement Anthropic transport using installed `httpx`. New metadata uses service/provider `anthropic` and the actual requested/reported model. Old `openrouter`/`omniroute` metadata remains valid for historical reads.

- [x] Add provider tests for Anthropic stream events split across chunks, content block types, termination, usage, refusal, truncation and aborted connections; verify secret redaction and accurate provider/error attribution.
- [x] Migrate subject resolution, scope planning, summaries, section writing, numeric/evidence checks and follow-ups. Confirm GPT Researcher's intercepted completion paths cannot silently call the old provider.
- [x] Preserve the existing report follow-up contract: use saved source extracts as evidence, with report sections and recent conversation as context. Make a model call only; no Treg searches, extraction or full rerun. Add a test asserting zero search/extraction calls for follow-ups, and explain missing evidence instead of inventing an answer. The UI should say “Ask about this report and its saved sources.”
- [ ] Preserve the current 4,000-token summary budget and one bounded 8,000-token truncation retry, reusing collected evidence. Calibrate thinking/output allocation with real Claude responses; never mark a truncated section complete. Do not restart searches for a synthesis retry.
- [x] Update container secret forwarding, readiness checks, failure validators and metadata renderers together. Add usage accounting from returned token counts; label estimated costs as estimates and never fabricate reported charges.
- [x] Preserve six-channel discovery, heartbeat, lease, cancellation, source retention and per-section timing. Log provider, model, stage, duration, attempt, token usage and safe error codes, not content.
- [ ] Run Python/host/contract tests, then a bounded live smoke when the key is configured. Later test one full research report and follow-up, recording section timings and any retries. A smoke test alone is not full report acceptance.
- [x] Commit locally.

## Task 6: Smooth authenticated navigation

**Files:** Modify only confirmed affected paths among `web/components/domain/beta/BetaPrincipalGate.tsx`, `web/app/beta/layout.tsx`, `web/components/shells/AppRail.tsx` and the actual triggering navigation caller. Update `web/tests/unit/beta-principal-runtime.test.ts`; add behavioral browser coverage for navigation and session changes.

**Interface:** Maintain one admitted principal per active Clerk identity/session in the persistent layout, with synchronous destination capability checks. Do not put trusted authorization state in localStorage.

- [x] Reproduce research → chat → analytics → settings navigation with network and component lifecycle observations. Determine whether the trigger is remount, hard navigation, a session transition, or unstable loading state. Do not log identity/session values.
- [x] Add a behavioral regression test asserting no admission-card flash or redundant admission request for a stable signed-in session navigating permitted pages. Replace the existing test's requirement for the literal checking-access card.
- [x] Fix the observed trigger while reusing the existing principal context. Replace the initial checking-access card with a small shell loading state that renders no private page content before verification.
- [x] Keep genuine access-denied and retryable verification errors. Session/account changes clear private state and re-admit; server API denial invalidates access as appropriate. Do not treat all 403s as a reason to reveal cached content.
- [x] Test hard refresh, signed-out deep links, account switch, expired session, revoked role, two users, back/forward and mobile navigation. Commit locally.

## Task 7: Integration, acceptance and delivery

- [x] Run `npm --prefix cloudflare test`, `npm --prefix web run test:unit`, `npm --prefix web run test:contracts`, `npm --prefix web run typecheck`, `npm --prefix web run lint`, `npm --prefix web run build`, `python -m unittest discover -s research/tests -v`, and `npm run docs:architecture:check` using the configured Python environment. Run existing host tests and the research browser suite as declared by their project scripts/configuration.
- [x] Verify guest-only, company-only, industry-only and conflicting-input runs; optional clarification skip; Additional info guidance; six-channel coverage; completion of all applicable sections (all four for full scope); accurate interview scope; follow-up continuity without fresh searches; delete behavior; Word parity; older saved reports; partial/failure states.
- [ ] Verify Ask WTF grounded answers/citations, YouTube and social single-item/comparison queries, owner-private history and admin-only connection controls.
- [ ] Check desktop/mobile overflow, keyboard interaction, pending actions, and Chromium/WebKit/Firefox browser behavior. Browser-engine testing does not prove a real Mac/iPhone result; label any device check not performed.
- [x] Record a reviewed source SHA and bounded handoff; no pushes by default. Prepare paired staging/runner deployment and rollback instructions after implementation approval.
- [ ] Deploy only when requested, with secrets configured on the services that actually execute model calls. Smoke-test authenticated staging, not just signed-out page reachability.

### Important Ask WTF deployment boundary

Staging Ask WTF delegates to the shared Alpha inference service. Updating only staging's UI/edge does **not** migrate that generation path. An Alpha model cutover can affect production and therefore requires a separately authorized shared-service deployment. Until then, label staging's Ask WTF provider honestly. An isolated Alpha test compute deployment would require its own reviewed configuration and read-only access to the existing corpus; do not create a second corpus to work around this boundary.

### Recommended sequence

1. Implement and review UI simplification, flexible inputs/identity handling, formatting and Word export.
2. Implement Claude adapters and all dependent metadata/configuration changes; run local contract tests.
3. Fix the reproduced navigation issue and run integrated regression checks.
4. With authorization and a working key, deploy staging research/analytics and verify one full run plus chat flows.
5. Schedule the shared Alpha Ask WTF cutover separately, then verify all four features use the intended provider.

## Completion criteria

The owner can submit one field plus optional Additional info, answer clarification if needed, read a correctly scoped report without citation debris or unwanted panels, export it as a usable Word document, delete it from the sidebar, and navigate without repeated access dialogs. All four AI features use the requested direct Claude model on their actual executing services, with grounded data, truthful failures and preserved account isolation.

No unrelated feature redesign, new research agents, new data providers, corpus changes, database cleanup or automatic production promotion is included.

## Implementation receipt — 2026-10-21

The local implementation is complete. Checked tasks describe source implementation and local evidence; they do not claim a hosted rollout. Tasks containing live model calibration, authenticated staging acceptance, or deployment remain open even where their local portion passes. The task commits are combined into one reviewed local implementation commit.

- Research browser checks: 68 passing across Chromium desktop/mobile, Firefox and WebKit. They use controlled API fixtures, not live Clerk or real research.
- Navigation: 40 passing controlled desktop/mobile browser checks; real account/device acceptance remains pending. The confirmed code issues were unstable loading/session boundaries and stale-response guards; an ordinary stable pathname change did not independently reproduce redundant admission.
- Source checks: edge 563, web unit 415 plus the 3 new mixed-reference regression cases, web contracts 101, Python 157, host 5. Typecheck, lint, production build and bounded privacy scan pass. Architecture freshness is recorded with the final commit.
- Word export: genuine OOXML inspected, opened and converted in LibreOffice with Unicode, source icons, links, lists and a multipage table. Actual Microsoft Word/Mac/iPhone checks remain pending.
- Independent review found mixed-reference link loss and stale clarification recovery; both were fixed and covered by regressions. Python skip handling was tightened so a clear company/industry can proceed while a disputed guest is excluded. Entirely ambiguous inputs remain in clarification.
- Live Claude access, latency, model quality and charge calibration are not verified. Add the server-only key before live testing. No secrets were read or changed; no remote service, migration, deployment or push was performed.
- Staging Ask WTF continues to execute through shared Alpha until its separately authorized deployment. Source migration alone does not change any deployed provider.

# Research Agent Implementation Plan — Indian Audience Context

> **Implementation status (20 October 2026):** Implemented locally on `feature/pavun`. Checked items record source implementation and local verification, not deployment or live staging acceptance. See the verification record below. No push or deployment is included.

**Goal:** Produce comprehensive, source-backed research on a future podcast guest, their company and their industry, and turn it into useful interview preparation, with dependable generation and a clear reading experience.

**Audience context:** The podcast and its audience are based in India. Carry this context through the entire research process: query planning, source selection, analysis, examples and interview questions. India is not a separate research section or the sole research objective. Research global subjects fully and connect findings to Indian readers where relevant; do not force every fact into an India angle or exclude valuable international evidence.

**Architecture:** Retain the existing Next.js research page, authenticated Edge API, private Python GPT Researcher runner, Treg tools, and OmniRoute model integration. D1 remains the authority for user-owned briefs; the Cloudflare Container and Durable Object retain execution state. Add structured inputs, explicit source-channel coverage, safe diagnostics, and report validation to this existing flow.

**Tech stack:** Next.js/React/TypeScript, Cloudflare Workers/D1/Containers/Durable Objects, Python/FastAPI, pinned GPT Researcher, Treg, existing OmniRoute route.

**Spec:** The owner's research feedback through 20 October 2026, consolidated below. This plan supersedes conflicting episode-centric, mandatory appearance-retrieval, per-section regeneration, and blanket “Unverified” requirements in `WTF_OS_Research_Agent_Plan.md`. Existing deployment and privacy boundaries remain in force.

**Status:** Plan only. No implementation, paid research trial, push, migration, or deployment is authorized by creation of this document.

## 1. Confirmed staging findings

Read-only staging inspection on 20 October established:

| Observed result | Confirmed evidence | Implication |
| --- | --- | --- |
| Latest run has no sections | Status is `clarification`; progress stopped at subject resolution; zero sources | Generation paused for a question. The page should foreground that question instead of displaying empty report panels. |
| An older run is incomplete | Three substantial sections; final section failed on both attempts; 80 sources | Preserve the successful work and expose a clear incomplete state. |
| Completed report from the screenshot | Four saved sections, approximately 15,000–18,000 characters each; 80 sources | No evidence of missing persisted content for this report. Its apparent display problem still requires browser reproduction. |
| Final-section failure is not diagnosable precisely | Provider, budget, and validation failures share a generic warning; subprocess output is discarded | Add safe error categories before attributing the failure to tokens, provider availability, or budget. |
| “Model cost: Unavailable” | Saved `modelUsd` is null | Missing billing is not a missing model. Model identity and billing must be displayed separately. |

A short live error-log capture returned no new events. This does not explain historical failures or prove a successful end-to-end run.

## 2. Product requirements

### Input

Replace the single request field with three clearly labelled fields:

1. **Guest name** — example: Elon Musk.
2. **Company name** — example: Tesla.
3. **Industry** — example: Electric vehicles.

All three are required for new research. Keep optional private notes with the existing model-use consent. Show **“Audience context: India”** prominently. Generate a concise report title from these fields.

Do not ask for a YouTube ID, episode attachment, or uploaded document. Preserve old briefs without forcing users to populate the new fields just to read them.

Clarification is reserved for genuine identity ambiguity, conflicting inputs, or an unclear relationship that materially changes the research. Do not stop merely to ask whether the user wants the subjects they already entered. Do not assume the guest works for the company when evidence contradicts that relationship.

### Report structure

Keep the four internal section keys for compatibility, with the following output:

| Tier / section key | Required output |
| --- | --- |
| **Snacks — Guest profile** / `snacks` | Who the guest is, background, career, major decisions, public views, and documented leadership traits. Avoid invented personality judgments or private personal details. |
| **Appetizers — Company and industry** / `appetizers` | Company strategy, products, competitors, industry economics, market size and GDP contribution where supported, comparison with related industries, regulation, infrastructure and barriers. Distinguish global and Indian figures and explain locally relevant differences. |
| **Main course — Industry positioning and opportunities** / `main` | Competitive positioning, market gaps, employment and skills, supply chains, and practical opportunities. Interpret these for the Indian audience, including what a 20–24-year-old in India could realistically build. Include requirements, risks and constraints rather than assuming the featured company will create local opportunities. |
| **Desserts — Takeaways and interview preparation** / `desserts` | Main takeaway, outlook, and 8–12 tailored interview questions with follow-ups grounded in the full report. Cover the guest's decisions, company and industry, and questions meaningful to Indian listeners about gaps, jobs, entrepreneurship and practical next steps where relevant. |

For Elon Musk / Tesla / EVs, first research Musk's background and decisions, Tesla's business and competitors, and the global EV industry. Throughout that work, consider what an Indian audience needs to understand: affordability, charging, manufacturing and components, service skills, local competitors and possible business opportunities. These are research questions, not pre-written conclusions about Tesla's plans or a requirement that every section discuss Indian jobs.

Global evidence is part of the core research, not merely supporting context. Explain Indian relevance where supported and useful; a guest's international history can stand on its own. Label prospective benefits as scenarios or opportunities; never present predicted jobs as announced commitments. Do not fabricate GDP shares, market sizes or job counts when sources lack comparable definitions and periods.

### Six source channels

“Six sources” means six research channels, not a limit of six documents:

| Channel | Purpose |
| --- | --- |
| **Web / Perplexity** | Official reports, company filings, Indian government data, reputable reporting and industry research. |
| **LinkedIn** | Public professional background, company posts, hiring and skill signals. |
| **YouTube** | Relevant public interviews, statements and explainers; use transcripts only when available. |
| **Instagram** | Relevant public guest/company posts and communications. |
| **Reddit** | Community experiences, objections and demand signals, attributed as anecdotal discussion. |
| **X / Twitter** | Public statements, announcements and topical discussion with identity and date checks. |

Use Treg rather than building separate direct platform integrations. Currently only `perplexity.web.search` and `exa.web.contents.get` are implemented. Validate Treg's current read-only endpoint contracts, account access and cost limits before adding any other tool.

If a dedicated platform tool is unavailable, a domain-targeted web search may be used, labelled as web-discovered platform content. Search snippets are not full posts, and video metadata is not a transcript. Record restricted access, no relevant results, provider failure and budget exhaustion separately. Never invent platform coverage or force irrelevant citations to fill six badges.

### Reader experience

- Place the report before editor controls, costs and diagnostic detail.
- Show six labelled platform icons at the top with actual coverage status and source counts.
- Inline citations show the source platform icon plus a readable publisher/title label and link, not bare source numbers or internal IDs.
- Keep the overall Sources accordion and individual source accordions collapsed by default. Clicking a report citation opens the relevant source entry.
- Each source expands to show its title, publisher, platform, link, publication date when available, retrieval date, evidence type and retained excerpt.
- Do not display blanket “Unverified” badges or repetitive developer warnings. Use specific notes such as “Company-reported figure,” “One report; no independent confirmation found,” or “Sources use different reporting periods.” Omit materially unsupported assertions rather than making them appear confirmed.
- Keep wide tables within horizontal scroll containers; prefer compact lists/cards for narrow screens. No clipped source IDs, squeezed columns or page-wide overflow.
- Remove all per-section regeneration buttons. Retain one report-level **Research again** action.
- While running, show **“Your report is cooking”**, a meaningful stage, elapsed time, and cancellation. No fabricated percentage or guaranteed finish time.
- Clarification, failure, partial completion and cancellation each get a clear dedicated state. Do not show completed-looking empty sections.
- Show immediate “Starting…”, “Deleting…”, “Saving…” or “Stopping…” feedback; prevent duplicate submissions and preserve useful content on transient errors.
- The top request form scrolls normally. The saved-brief sidebar stays sticky below the opaque navbar on desktop; mobile uses ordinary document flow.
- Saved history counts actual report snapshots, not draft creation and running-state updates.

## 3. Global constraints

- Continue locally on `feature/pavun`; no push or deployment until requested.
- Keep Ask WTF, YouTube Analytics, Social Analytics, principal admission and navigation permissions unchanged.
- Research is preparation for a future interview, not retrieval from the existing episode corpus.
- Briefs remain private by default. Preserve explicit existing sharing, account isolation, saved follow-up chat, editing, Markdown export, cancellation and complete research deletion.
- Do not auto-share old or new research. Public DTOs and logs must not expose internal owner/session identifiers or provider credentials.
- Private notes never enter public search queries. Their model use remains consent-gated.
- Tool results are untrusted evidence. Maintain URL validation, bounded inputs, read-only tool allowlists and existing network protections.
- Keep bounded calls, retries, token limits and monetary budgets. Diagnose exhaustion before raising limits; do not silently raise the paid-run budget.
- Preserve current source/result size limits unless measured evidence supports a reviewed change.
- Reuse the existing model service; do not modify host OmniRoute configuration or promise an upstream model that the gateway does not identify.

## 4. Data contracts and ownership

Add optional versioned fields to existing stored JSON; no new D1 table is expected:

```text
ResearchInputV2:
  guestName: string (trimmed, 2–120 characters)
  companyName: string (trimmed, 2–120 characters)
  industry: string (trimmed, 2–120 characters)
  audienceCountry: "IN"

ResearchDocument additions:
  schemaVersion: 2
  researchInput?: ResearchInputV2
  coverage?: ChannelCoverage[6]
  modelInfo?: { service, requestedModel, reportedModel? }
  failure?: { stage, code, retryable }

ChannelCoverage:
  channel: web | linkedin | youtube | instagram | reddit | x
  status: pending | searching | found | no_results | unavailable | failed | budget_limited
  sourceCount: integer
  method: dedicated_tool | web_search

ResearchSource additions:
  platform?: web | linkedin | youtube | instagram | reddit | x
  retrievedVia?: allowlisted tool ID
  evidenceType?: page_extract | search_snippet | post | transcript | video_metadata
```

Keep new fields optional when reading legacy documents and runner responses. Require `researchInput` for new V2 submissions; allow legacy saved runs to use their existing title without guessing three fields. Validate all fields independently in Web, Edge and Python. Metadata-only transitions must not create user-visible report versions.

Model metadata is per run. Show the configured route and separately any model identifier actually reported by the gateway. Do not rewrite history with today's configuration. Unknown model cost reads **“Cost not reported by provider”**; never substitute a guessed amount or zero.

## 5. Implementation tasks

### Task 1 — Recover precise failure visibility

**Modify:** `research/providers.py`, `research/worker.py`, `research/api.py`, `research/store.py`, `research/remote_store.py`, `research-host/src/store.js`.
**Tests:** `research/tests/test_providers.py`, `research/tests/test_runner.py`, `research/tests/test_remote_store.py`, existing `research-host/tests/`.

**Interface:** Introduce `ResearchFailure(stage, code, retryable)` with allowlisted codes for timeout, rate limit, authentication, budget exhausted, output truncated, empty model output, invalid output and storage failure.

- [x] Add regression cases proving these failures remain distinguishable and no injected secret, request body, response body, private title or identifier reaches logs.
- [x] Propagate safe failure metadata to persisted run/section diagnostics. Emit sanitized structured events through controlled logging; do not simply enable raw third-party subprocess output.
- [x] Record stage durations, attempt counts, source counts, output lengths, token usage when supplied, and budget consumption without content.
- [x] Check cancellation and lease fencing still prevent late saves or duplicate paid work. Retain bounded retries and honor provider retry timing.
- [x] Verify that zero/blank sections cannot be marked completed, and a failed final section preserves preceding output.
- [x] Run focused Python and durable-store tests; record local checks.

**Exit:** A new failed run explains the failure category. The historical failed final section remains “cause not retained” until reproduced; do not invent its cause.

### Task 2 — Add the three-field research contract

**Modify:** `research/contracts.py`, `cloudflare/src/research-contract.ts`, `cloudflare/src/research.ts`, `web/lib/research.ts`, `web/components/domain/beta/ResearchWorkspace.tsx`.
**Tests:** `cloudflare/tests/research.test.mjs`, `web/tests/unit/research.test.ts`, `web/tests/unit/research-workspace.test.ts`, `research/tests/test_runner.py`.

**Interface:** Thread `ResearchInputV2` unchanged from validated create request to the saved document and runner job. Derive the display title separately; never truncate the structured request to fit the title.

- [x] Add failing tests for required/oversized fields, Unicode names, old briefs, notes consent, tampered audience context, and owner isolation.
- [x] Build Guest / Company / Industry fields, optional private notes and the visible Indian audience context.
- [x] Persist V2 inputs in existing JSON, including run retry payloads and saved versions. Preserve old inputs on reopen and full rerun.
- [x] Keep video ID and upload controls absent.
- [x] Pass contract and component tests; record local checks.

**Exit:** New research stores all three fields; legacy briefs remain readable and rerunnable.

### Task 3 — Implement honest six-channel collection through Treg

**Modify:** `research/providers.py`, `research/evidence.py`, `research/catalog-receipt.json`, `research/worker.py`, `research/gptr.py`.
**Create:** `research/source_channels.py`, `research/tests/test_source_channels.py`.
**Interface:** `collect_channel(channel, research_input, calls) -> (sources, coverage)`; channel adapters use only validated, code-owned tool IDs.

- [x] Inspect current Treg contracts and record endpoint/schema/access/cost evidence for each channel. No guessed endpoint names, automatic publishing tools or new direct-provider credentials.
- [x] Add tests for all six channels, unavailable tools, empty results, private/restricted posts, spoofed domains, provider errors, duplicates and budget stops.
- [x] Plan channel-specific queries from the structured request and Indian audience context, combining global subject research with relevant Indian evidence. Do not append “India” to every query or restrict every search to Indian domains. Keep public-source collection shared across the four sections.
- [x] Normalize platform from validated URL/metadata, separately from retrieval provider. A Reddit URL found through Perplexity is Reddit evidence retrieved through web search.
- [ ] Deduplicate URLs and copied evidence; prioritize relevance and original sources. Keep cited sources available when enforcing the 80-source limit so later collection cannot orphan earlier citations.
- [x] Track channel coverage separately from report success. Reuse results and page extracts; stop scheduling calls before exhausting the run budget.
- [x] Pass adapter tests and a controlled authorized live provider check before claiming channel availability; record local checks.

**Exit:** Every requested channel has an honest result status. Dedicated versus web-search access is observable.

### Task 4 — Generate comprehensive research with Indian audience context

**Modify:** `research/contracts.py`, `research/gptr.py`, `research/worker.py`, `research/evidence.py`, `research/chat.py`.
**Tests:** `research/tests/test_gptr_compat.py`, `research/tests/test_runner.py`.
**Interface:** All four tier prompts consume `ResearchInputV2`, its `audienceCountry`, retained evidence and prior section summaries; follow-up answers inherit the same audience context and saved research scope.

- [ ] Add cases for a clear guest/company/industry request, genuinely ambiguous identity, an incorrect guest-company relationship, conflicting numbers and missing Indian market evidence. Verify global guest/company coverage remains substantive and no irrelevant India claims are forced into it.
- [x] Run subject resolution without unnecessary “do you want this research?” questions. When clarification is needed, preserve it explicitly and stop before paid discovery.
- [x] Implement the tier outputs in Section 2 with Indian audience context throughout planning and synthesis. Include relevant market gaps, skills/jobs and youth opportunities alongside complete guest/company/industry coverage and evidence-grounded interview questions.
- [x] Keep facts, attributed claims and forward-looking proposals distinct. Prefer official India/company sources for numerical claims.
- [x] Replace blanket verification labels with concrete evidence notes. Apply this during generation and validation, not by blindly stripping cautionary words from reports.
- [x] Validate nonempty, relevant, bounded sections and resolvable citations. A source ID alone is not proof that a claim is supported.
- [x] Preserve completed sections after failure; do not silently replace saved historical reports. Existing content remains intact until the owner edits or reruns it.
- [x] Run upstream compatibility and worker tests; record local checks.

**Exit:** A report researches all three inputs comprehensively for an Indian audience. It neither isolates India into one section nor substitutes India-only opportunities for the requested overall research. No fabricated statistics, automatic episode retrieval or generic unsupported claims.

### Task 5 — Repair state handling and report layout

**Modify:** `web/components/domain/beta/ResearchWorkspace.tsx`, `web/components/domain/beta/ResearchContent.tsx`, `web/lib/research.ts`, `cloudflare/src/research.ts`.
**Tests:** existing research unit/API tests; add interactive research state tests using the repository's browser test configuration.
**Interface:** Render dedicated clarification/running/partial/failed states; preserve the distinction between saved server content and unsaved editor draft.

- [ ] Reproduce the completed-but-apparently-empty report in an authenticated staging browser. Compare the received section lengths with rendered sections; check stale drafts, polling, version selection and CSS before choosing a fix.
- [x] Make clarification the primary panel and hide empty report shells until generation starts. Provide one clear Continue research action.
- [x] Keep the cooking screen and stage progress while active; display partial output with a clear explanation after failure.
- [x] Move editing into a collapsed panel below report content. Move operational warnings and costs into secondary details.
- [x] Remove section regeneration controls and reject new public section-specific run requests; preserve reading/cleanup of historical jobs. Keep one full-report rerun action.
- [x] Retain instant action feedback, duplicate-click prevention, retryable loads, cancellation and deletion. A timeout must not imply deletion or successful cancellation.
- [x] Verify the opaque navbar, sticky desktop sidebar, scrolling top form, usable mobile layout and no horizontal page overflow.
- [x] Test delayed responses, polling completion while editing, navigation during requests and version changes; record local checks.

**Exit:** Users can distinguish “needs clarification,” “working,” “incomplete” and “ready,” and reliably read their saved report.

### Task 6 — Add source icons, accessible citations and model metadata

**Modify:** `web/components/domain/beta/ResearchContent.tsx`, `web/components/domain/beta/ResearchWorkspace.tsx`, `web/lib/research.ts`, `cloudflare/src/research-contract.ts`, `research/providers.py`, `research/contracts.py`.
**Create:** `web/components/domain/beta/ResearchSourceBadge.tsx`.
**Interface:** One reusable badge consumes platform, accessible label, source URL and optional coverage state; report export consumes the same normalized metadata.

- [x] Test six-channel badges, unknown legacy metadata, misleading domains, duplicate publishers, unsafe URLs and source-link navigation.
- [x] Render header coverage icons with labels/counts; show unavailable or empty channels truthfully.
- [x] Replace bare numbered citation presentation with compact platform/publisher links. Open the containing Sources accordion and specific source accordion on citation navigation, including keyboard focus.
- [x] Preserve collapsed source details, safe links and readable excerpts. Use local icon assets/components; no third-party tracking images.
- [x] Display model service, requested route and reported model where available. Keep absent billing distinct from model identity.
- [x] Update Markdown export with readable source attribution, Indian audience context and evidence notes; retain honest legacy metadata.
- [x] Pass rendering, accessibility and export tests; record local checks.

**Exit:** Users can identify where evidence came from without raw source IDs, and “cost unavailable” cannot be mistaken for an AI outage.

### Task 7 — End-to-end verification and authorized staging rollout

**Modify:** `docs/RESEARCH-RUNNER.md`, `research-host/README.md`, `.project/HANDOFF.md`, and the existing root research plan to point to this replacement plan when implemented.

- [x] Run Python tests with the installed pinned dependencies, including upstream GPT Researcher compatibility; do not count skipped compatibility checks as a pass.
- [x] Run backend, web unit/contracts, typecheck/lint, durable-store tests and hosted-runner typecheck. Build the exact frontend and runner candidate.
- [ ] Review three public research trials: Elon Musk/Tesla/EVs; Deepinder Goyal/Zomato/food delivery; and an India-focused industry/guest with sparse social evidence.
- [ ] Verify source correctness, Indian relevance, citations, interview usefulness, channel coverage, elapsed time and measured costs. Sparse social evidence must not fabricate results or suppress good web-backed findings.
- [x] Exercise a provider outage, output truncation, rate limit, budget exhaustion, restart, cancellation, reload, deletion, old brief and stale draft.
- [ ] Verify two signed-in users cannot read/delete each other's private briefs, and existing explicit sharing behaves as intended.
- [ ] Check real desktop/mobile behavior and Safari where available; report any untested browser rather than claiming full coverage.
- [ ] After owner-authorized staging deployment, publish the new runner image and matching Worker/Edge/Web contracts in a backward-compatible order: tolerant Edge/Web readers first, new runner second, new request UI last.
- [ ] Record exact versions and image digest, smoke the real staging flow, and retain a rollback path for new and legacy documents. Keep production untouched.

**Commands:**

```bash
research/.venv/bin/python -m unittest discover -s research/tests -v
npm --prefix research-host test
npm --prefix research-host run typecheck
npm --prefix cloudflare test
npm --prefix web run test:unit
npm --prefix web run test:contracts
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run cf:build
```

Use the verified staging Clerk public key for staging builds, not local production configuration. Any newly required shared migration or provider configuration remains a separate approval; do not assume one is needed for JSON additions.

## 6. Review focus

| Risk | Owning checks |
| --- | --- |
| Correct name but incorrect guest-company relationship | Task 4: clarify or explicitly distinguish the relationship; no invented identity. |
| No platform access or only snippets available | Task 3: actual coverage/evidence type; Task 6: truthful display. |
| Sources removed by retention limits while earlier text still cites them | Task 3: preserve referenced evidence and validate final citation closure. |
| Completed server result hidden by stale local draft | Task 5: real response/render comparison, polling and unsaved-edit regression. |
| Mixed old/new versions during deployment or restart | Tasks 2 and 7: optional fields, legacy fixtures, backward-compatible rollout and rollback. |

## 7. Delivery order and definition of done

**Order:** diagnostics → structured inputs → source collection → report generation → state/layout fixes → attribution/model display → full verification.

Complete means:

- New research uses Guest, Company and Industry, with Indian audience context carried throughout the process rather than treated as a separate section or sole goal.
- Four useful sections match the requested tiers; no empty section is reported completed.
- All six channels have an explicit, honest search outcome.
- Sources and citations are readable, labelled and expandable.
- Blanket “Unverified” clutter is replaced with specific evidence context without disguising uncertainty.
- No YouTube ID, upload field or per-section regeneration remains in the user flow.
- Running/actions/clarification/partial results behave clearly, and old reports remain accessible.
- Saved research, follow-up context, versions, deletion and account privacy continue to work.
- Model identity and missing billing are distinguished.
- The historical final-section failure is either reproduced and fixed with a specific cause or explicitly remains unresolved; generic warnings are not counted as a diagnosis.
- Local checks and real staging checks are recorded separately. Production rollout is outside this plan.

## 8. Local verification record — 20 October 2026

The structured create/save/rerun/follow-up flow, six-channel adapters, revised
four-tier prompts, source presentation, diagnostics and lifecycle handling are
implemented. Scope changes retain the previous report with a server-controlled
`needsResearch` warning and block follow-up until new evidence arrives. A clean
historical snapshot restores its matching scope and evidence. Active costs are
not presented as final billing; empty completed sections cannot be saved.

Source checks: 91 Python tests (including installed GPT Researcher compatibility,
with no skipped compatibility checks), 540 backend tests plus the subsequent
focused restore regression, 394 frontend unit tests, 97 contracts, and 36
Chromium desktop/320px mobile browser tests passed. Frontend build/lint,
targeted typechecks and hosted durable-store tests passed. Browser checks use
fixtures and do not establish authenticated staging acceptance.

The runner image built locally with the documented offline hash-locked dependency
recipe after the normal download stalled. A networking-disabled image smoke
passed pinned GPTR import, authentication, safe validation errors and V2
enqueue/read/delete. No provider keys, local state, image push or deployment
were involved in this container smoke.

One controlled local public-subject run completed all four sections, retaining
80 sources and resolvable citations. A provider-unavailable failure recovered on
retry; that section took about eleven minutes on its successful attempt. The
run reported OmniRoute route `noesis-research`, upstream `claude-sonnet-5-5`,
$0.10768 recorded/reserved tool cost, and no model billing receipt. The final
payload passed the Edge and frontend contracts and Markdown export. Subsequent
retention, search-fallback and review fixes were verified by offline regressions;
the full paid trial was not repeated for each change.

YouTube's catalog tool returned 404, so YouTube coverage came through labelled
web search. Four dedicated social tools returned public data in isolated adapter
checks. The full run's LinkedIn call was charged $0.008 despite its $0.002 quote
and requested cap; the channel stopped as budget-limited and its limit was not
raised. These receipts do not guarantee future platform access or billing.

URL deduplication, cited-source protection and conservative copied-quote
independence checks are implemented. Full semantic deduplication and original
publisher verification remain editorial limitations, not automatic guarantees.
The complete three-subject editorial trial, genuine identity-ambiguity quality
checks, authenticated two-user staging/browser reproduction, Safari acceptance,
and hosted rollout/rollback remain open. Historical generic final-section
failures cannot be assigned a precise cause from the new diagnostics alone.

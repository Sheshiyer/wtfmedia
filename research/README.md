# Private research runner

Setup, API, boundaries, recovery and verification: [docs/RESEARCH-RUNNER.md](../docs/RESEARCH-RUNNER.md).

This service reuses pinned GPT Researcher 0.16.1 for planning, conducting research
and writing. Treg performs allowlisted search/raw page extraction. The installed
`httpx` client calls Anthropic Messages directly with `claude-sonnet-5-5` and
server-only `ANTHROPIC_API_KEY`. Planning/resolution use low effort; synthesis and
follow-ups use medium effort. Requests use `thinking.type: between_tools`, without
sampling parameters, tool choice or a legacy-provider fallback. The GPTR config
retains its `openai:` parser label, but every completion alias is intercepted and
its generic model/embedding transports remain blocked. Legacy OpenRouter and
OmniRoute settings do not select a research model. It does not access D1, Clerk, the vault or the Alpha corpus.

Research prepares subjects before a shoot. Any one of guest, company or industry
is sufficient. Missing fields normalize to empty strings; supplied nonempty fields
must contain 2–120 UTF-16 code units; non-string fields are rejected. India is the audience context throughout global
research, not a restriction to Indian subjects or websites. Legacy title-only jobs remain readable.
The four tiers cover guest profile, company/industry, positioning/opportunities,
and takeaways/interview preparation, with detailed dossiers, timelines, industry maps,
comparable economics tables, thematic deep dives, and a proposed interview sequence.
The authenticated edge obtains a bounded, cited historical discussion summary through
Alpha's existing public chat service. Only public subject fields cross that bridge;
private notes and owner identity do not. The runner receives validated public synthesis
and episode references, never a second transcript corpus. Historical context guides
fresh research and follow-up questions but is not evidence for current facts or a
receipt of verbatim wording/speaker attribution. A labelled appendix links the episodes;
missing context is disclosed. Unresolved identities discard that context.
Authorized Additional info (the existing `notes`/`notesApproved` contract) guides
planning, public search topics, optional date constraints,
report priorities and interview questions. Raw notes go to the model; derived public
guidance goes to search providers. Unapproved notes are never sent.
The UI has no video ID, file upload or per-section regeneration control.

Six channels are attempted: web, LinkedIn, YouTube, Instagram, Reddit and X.
Treg supplies Perplexity web search, Exa extraction and the five catalog-pinned
social searches in `social-catalog-receipt.json`. A failed direct social search
can fall back to domain-targeted web search; coverage records the actual method
and outcome. YouTube metadata is not treated as a transcript. Source counts
describe retained evidence, not coverage of an entire platform. Local source restores
adaptive collection: follow-up searches address uncovered research questions, not a
fixed source-count target. Twenty remains a per-request provider batch size. All four
sections follow documented people/company/industry connections even with one input.
Staging remains on the separately deployed 120-source rollback until a new rollout.

A 1 MB serialized evidence allowance leaves room within the existing 1.8 MB saved-document
limit. Saved cited source identity and text remain protected; they are not silently
pruned. Subject coverage and relevance select evidence when storage is full. A source
count is not proof of relevance, independence or claim accuracy. Separate Alpha
historical references retain their existing contract. Preparation can extract up to
ten priority pages.

Coverage assessment and the initial four figure goals share one model call. Writing,
numeric review, and one generation/repair pair per figure retain their reservations.
Adaptive search stops when evidence suffices, no useful query/evidence remains, or
its time/storage/remaining allowance is reached. It then hands retained evidence to
writing; reaching the optional search allowance does not itself fail the report.
Interrupted planning/search operations reuse durable cached receipts. Invalid combined
planning uses default figure goals without a second planning call; actual figures
still require supported evidence and validation.

Optional evidence work checks its remaining allowance before admission. If preparation
cannot proceed without using writing/diagram reservations, it uses relevant retained
extracts instead. It never clears a durable budget stop or provider cost overrun,
and empty evidence cannot become a completed report. The per-run ceiling remains
5,000,000 micro-units; there is no budget increase or live report replay.

Historical lookup has a 40-second bound and is separate from runner billing; it uses
the existing Alpha service's inference budget. Provider quality, exact question wording,
and speaker attribution still require editorial checks against the linked episode.
The four stable report slots and existing Markdown/Word renderer remain compatible.

Model route metadata is stored with each run, including a reported model only
when Anthropic supplies a safe identifier. Missing usage costs remain null.
Safe stage events distinguish timeouts, authentication, rate limiting, exhausted
budgets, malformed/empty/truncated output and storage errors. Saved failure details
identify provider, operation, HTTP status and a safe reason such as an interrupted
stream or a local context limit; logs also include elapsed time and byte counts. Provider bodies,
private subjects, notes, account identifiers and credentials never enter logs.

Offline source tests, including real upstream conduct/write with fake external
adapters, are separate from live acceptance. Historical OmniRoute trial results do
not establish acceptance for Claude Sonnet 5.5. No live key/model smoke or budget
calibration is implied by this migration; full editorial trials and hosted acceptance remain separate checks.
Fixture tests do not prove provider quality or full transcript coverage.


## Scope and integration contract

`skipClarification` is an optional strict boolean on the root `JobInput`, never
inside `researchInput`. The job body persists it unchanged. Identity resolution
returns an internal validated `kind` (`resolved`, `optional_guidance`, or
`identity_conflict`), `clarification`, and `ambiguousFields`. The model can only
flag supplied field names; it cannot replace their values. On skip, the worker
keeps the original request and checkpoints a narrowed copy with only disputed
fields blanked. A disputed guest plus a clear company/industry researches that
company/industry. The first applicable section includes a visible scope note;
its working title/clarification and public search focus exclude disputed identities,
and the provider boundary rejects derived queries that reintroduce their names.
If no clear subject remains, the run stays `clarification`
with no completed report; process recovery reuses its decision without another
resolution call. Optional guidance can be skipped without removing subjects.

New full runs cover all four sections from any valid starting field. Guest-only
research follows documented company roles into company economics and industry
analysis. Company-only or industry-only research identifies relevant people and
leaders; these are researched associations, not confirmed interview guests. The
original inputs remain unchanged. A missing association is an explicit evidence
limitation, never an invented identity. Ambiguous/excluded identities remain blocked.
All four sections must contain completed content for a full completed report.
Legacy skipped slots remain readable, and existing saved reports/visual-only retries
are not automatically rewritten. People/company sections retain their scope heading
validation; this guards substitution, not the truth of every generated claim.

Report follow-ups use only saved source extracts and report/history context, with
one model call and no search/extraction. A skipped guest slot prevents the original
guest input from being reintroduced as an assumed identity in follow-up context.
The bounded `Company:` and `Industry:` section titles also retain narrowed
company/industry scope for follow-ups without changing the wire schema.
Summaries retain the 4,000-token initial allowance and one 8,000-token truncation
retry with checkpointed evidence reuse. No retry restarts source discovery.

Anthropic token counts are recorded; its Messages response is not a billing
receipt. `modelUsd` stays null when charges are unknown and the existing budget
reservation remains charged internally. It is not a reported dollar charge or a
verified hard cap on the eventual provider invoice. Logs contain allowlisted
provider/model/stage/timing/usage metadata, never private text or credentials.

Verified API references: [Sonnet 5.5 migration](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide),
[stream events](https://platform.claude.com/docs/en/build-with-claude/streaming),
and [structured output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
Local checks: `research/.venv/bin/python -m unittest discover -s research/tests -v`,
`npm --prefix research-host test`, and `npm --prefix research-host run typecheck`.
Live model access, latency, report quality and cost calibration remain separate
owner-authorized checks. No credentials or deployment state changed here.

## Budget reliability policy

Shared preparation now precedes section writing; diagrams follow all core sections.
Policy-1 admission is atomic and survives worker restarts in local or hosted storage.
It distinguishes phase counts, whole-job reservations, retry limits and provider
cost overruns, while preserving completed text and the earliest causal failure.
The 5,000,000 micro-unit ceiling and 250,000 model reservation are unchanged.

New job activation is explicitly gated by Edge `RESEARCH_BUDGET_POLICY_VERSION=1`
after compatible hosted storage and the runner are deployed. Existing jobs keep
their recorded policy. See [rollout and recovery](../docs/RESEARCH-RUNNER.md#policy-1-rollout-not-activated-by-this-source-change).
Current local adaptive changes are covered by offline runner regressions; they do not
change the deployed 120-source staging image. Live provider quality is not an offline
test claim.

Figure generation follows core writing, with bounded per-figure repair attempts. Provider-compatible
schemas leave item-count bounds to local validation. Table references are preserved
as links in both the reader and Word export; existing reports need no paid rerun
for this display correction. Diagram changes still need owner runtime acceptance.

### Combined research inputs and financial evidence

Schema v2 keeps `guestName`, `companyName`, and `industry` as strings. Each field
now accepts newline-separated names: up to five per category, ten total, and
2–120 UTF-16 units per name. Commas remain part of names. Web/Edge and the runner
trim, normalize NFC and deduplicate within each category. Legacy single-subject
briefs remain valid; no database migration is needed.

Discovery searches each supplied subject individually before cross-topic
queries, within the twelve-call dossier ceiling. Company queries explicitly seek
annual reports, audited financial statements, investor relations and regulatory
filings. Retention and writer context preserve coverage across supplied subjects.
Extraction prioritizes financial candidates and is bounded to ten targets. When
the existing Exa catalogue supports it, financial pages request query-focused
highlights instead of full text (one content type at the existing per-page cost
ceiling); no AI summary is requested. Ranking does not certify publisher authority.
Writers receive original relevant passages alongside summaries and must separate
unverified-in-this-run metrics from proven non-disclosure, company-reported
numbers from independently confirmed facts, and listing status from availability
of financial reports. Existing citation, numeric and spending checks still apply.

Report generation no longer requests an editorial verification checklist. The web
and exports also omit that named section from existing saved reports, retaining
material limitations. Additional info is displayed beneath the owner-visible
title; schema-v2 approved Additional info is included in exports. Unapproved or
legacy private notes stay out of exports, and shared views retain server-side
note redaction. These presentation changes do not regenerate saved findings.

## Connection briefs (local source, context policy 1)

New full requests from the updated Edge carry `contextPolicyVersion: 1`.
Deploy the compatible runner before enabling those Edge requests; older runners
reject this additive request field. This source work has not been deployed.
Legacy jobs without the flag continue their original workflow and saved reports
are not rewritten. Existing visual-only recovery keeps its recorded scope.

The connection workflow discovers people/company/industry evidence from any
input, optionally extracts six original pages, selects up to 60,000 characters
of relevant passages, and extracts structured evidence in two bounded batches.
Each item retains an exact passage, attribution, period, scope and original
provenance. Duplicate passages collapse. Connections require distinct resources
and origins; repeated articles are not independent confirmation. Interpretations,
documented relations, alternatives and limitations are explicit. Predictions,
metadata and historical Alpha summaries are not observed outcomes/transcripts.

A separate verification pass reviews proposed relationships and original passages,
including up to three focused gap searches when allowance remains. Ranking uses
relevance, evidence strength and interview usefulness; no minimum insight count
is required. No accepted relationship yields an honest partial result, not filler.
Extraction/relation/review each allow one schema/evidence repair; durable checkpoints
and provider receipts preserve successful work across restarts. Semantic review is
model-based, not a guarantee of correctness or an independent human review.

Four public sections project this private structured state: Key insights, Connected
evidence, Questions worth exploring, Conversation plan. The existing source reader
and Word export use the same version-aware headings and retained source links.
Four visual goals explain relationships, original context, alternatives and interview
questions. Existing figure validation/repair applies. A locally validated comparison
of the referenced evidence can replace a failed richer diagram; it does not invent
causal arrows or fetch/generate a photograph. Interpretations remain labelled and
citations remain beneath visuals, not numbered inside the artwork.

The existing spending ceiling remains unchanged. Sixteen model reservations protect
extraction and review repairs plus four visual generation/repair pairs before optional
discovery. Bounded evidence selection is disclosed; source count is not analysis
coverage. Real provider overruns remain failures. No paid validation calls are part
of the automated suite. Context-focused editorial quality still requires live trials.

### Choose a research problem before the report

New full jobs from the local Edge use `problemSelectionVersion: 1`. After identity
resolution, a small two-query exploration proposes distinct source-linked research
questions across the subject's work. The runner returns `clarification` with
`researchProblems` and stops before full discovery, writing or visuals. This uses
the existing terminal-job and owner/revision boundaries; it needs no migration.

The reader requires an explicit option selection. Edge resolves `selectedProblemId`
against the current owner brief's offered options (client-authored problem text is
not accepted). The next job retains preview sources and passes the selected problem
into search scope, evidence selection, connection synthesis and review. The reader
and Word export show the selected question. Identity clarification remains separate;
skipping identity guidance does not skip problem selection. Changing subject or
notes clears stale choices. Legacy saved reports and visual-only recovery retain
their previous behavior. Deploy the compatible runner before the updated Edge.

Options are proposed investigations, not proven conclusions. The model is asked
for 4–6 different domains; at least two supported options are required rather than
inventing associations to fill a quota. Offline tests do not establish live editorial
quality or guarantee a particular domain mix.

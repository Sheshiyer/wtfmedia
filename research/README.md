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
and takeaways/interview preparation. It does not retrieve existing episodes.
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
describe retained evidence, not guaranteed coverage of an entire platform. New runs
target 20 retained sources per channel, sharing unused slots up to 120 total.
An undersupplied dedicated search gets one domain-targeted web supplement; no
unbounded pagination or unrelated evidence is used to fill the quota. Saved citations
remain protected even in larger legacy reports. Large evidence sets are synthesized
in batches, with unchanged summaries reused across sections and retries. Spend,
payload and model context limits still apply.

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

All completed runs contain exactly four unique slots in the existing tier order.
Guest-only requests skip `appetizers` and `main`; company/industry-only requests
skip `snacks`. Skipped slots have `status: "skipped"`, `content: ""`, no failure,
and a bounded reason in the title. At least one slot must be completed with
nonblank content. Missing slots, arbitrary skipped applicable slots, and empty
completed slots cannot finish a run. Readers and exports should omit skipped
slots, while retaining scope warnings. Person/company sections must start with
the requested identity heading before the worker accepts them. This guards
against substitution; it does not establish the truth of every generated claim.

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

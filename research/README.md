# Private research runner

Setup, API, boundaries, recovery and verification: [docs/RESEARCH-RUNNER.md](../docs/RESEARCH-RUNNER.md).

This service reuses pinned GPT Researcher 0.16.1 for planning, conducting research
and writing. Treg performs allowlisted search/raw page extraction; OpenRouter
performs generation using `z-ai/glm-5.3` with low reasoning effort. Legacy
OmniRoute settings do not select a research model. It does not access D1, Clerk, the vault or the Alpha corpus.

Research prepares guests before a shoot. New requests contain guest, company and
industry fields; India is the audience context throughout global research, not a
restriction to Indian subjects or websites. Legacy title-only jobs remain readable.
The four tiers cover guest profile, company/industry, positioning/opportunities,
and takeaways/interview preparation. It does not retrieve existing episodes.
Approved private notes guide planning, public search topics, optional date constraints,
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
when the gateway supplies a safe identifier. Missing usage costs remain null.
Safe stage events distinguish timeouts, authentication, rate limiting, exhausted
budgets, malformed/empty/truncated output and storage errors. Saved failure details
identify provider, operation, HTTP status and a safe reason such as an interrupted
stream or a local context limit; logs also include elapsed time and byte counts. Provider bodies,
private subjects, notes, account identifiers and credentials never enter logs.

Offline source tests, including real upstream conduct/write with fake external
adapters, are separate from live acceptance. Historical OmniRoute trial results do
not establish acceptance for the GLM 5.3 route. See the handoff for bounded live
model probes; full editorial trials and hosted acceptance remain separate checks.
Fixture tests do not prove provider quality or full transcript coverage.

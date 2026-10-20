# Private research runner

Setup, API, boundaries, recovery and verification: [docs/RESEARCH-RUNNER.md](../docs/RESEARCH-RUNNER.md).

This service reuses pinned GPT Researcher 0.16.1 for planning, conducting research
and writing. Treg performs allowlisted search/raw page extraction; OmniRoute
performs generation when its paired settings are supplied; otherwise direct
OpenRouter is used. It does not access D1, Clerk, the vault or the Alpha corpus.

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
describe retained evidence, not guaranteed coverage of an entire platform. All returned
unique, eligible sources are retained without a fixed count cap. Large evidence sets
are synthesized in batches; spend, payload and model context limits still apply.

Model route metadata is stored with each run, including a reported model only
when the gateway supplies a safe identifier. Missing usage costs remain null.
Safe stage events distinguish timeouts, authentication, rate limiting, exhausted
budgets, malformed/empty/truncated output and storage errors. Saved failure details
identify provider, operation, HTTP status and a safe reason such as an interrupted
stream or a local context limit; logs also include elapsed time and byte counts. Provider bodies,
private subjects, notes, account identifiers and credentials never enter logs.

Offline source tests, including real upstream conduct/write with fake external
adapters, are separate from live acceptance. One local four-tier trial completed
through the `noesis-research` OmniRoute route; the remaining editorial trials
and hosted acceptance are pending. Without OmniRoute settings, direct OpenRouter
uses `deepseek/deepseek-v4-flash-0731`. See the implementation plan and handoff for
actual model receipts, missing billing and platform access/cost limitations.
Fixture tests do not prove provider quality or full transcript coverage.

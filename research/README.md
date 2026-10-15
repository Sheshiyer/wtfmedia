# Private research runner

Setup, API, boundaries, recovery and verification: [docs/RESEARCH-RUNNER.md](../docs/RESEARCH-RUNNER.md).

This service reuses pinned GPT Researcher 0.16.1 for planning, conducting research
and writing. Treg performs allowlisted search/raw page extraction; OpenRouter
performs generation. It does not access D1, Clerk, the vault or the Alpha corpus.

The existing public Alpha chat API provides validated reference links and moments,
not raw transcript excerpts. Supplied `alpha_reference` entries (including
`alpha_<video>_<n>` IDs) remain discovery links and cannot support factual claims.
Only independently retrieved permitted page text can upgrade evidence coverage.
Verified supplied timing is preserved; page text is not silently called a
transcript and no timestamps are inferred. Missing transcripts/timing are explicit.

Offline source tests, including real upstream conduct/write with fake external
adapters, are separate from live acceptance. The default `deepseek/deepseek-v4-flash-0731`
model must pass the three-brief real trial after keys are supplied. No provider
quality, endpoint availability, billing, full transcript coverage or Docker
runtime acceptance is claimed from fake tests.

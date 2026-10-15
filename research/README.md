# Private research runner

Setup, API, boundaries, recovery and verification: [docs/RESEARCH-RUNNER.md](../docs/RESEARCH-RUNNER.md).

This service reuses pinned GPT Researcher 0.16.1 for planning, conducting research
and writing. Treg performs allowlisted search/raw page extraction; OmniRoute
performs generation when its paired settings are supplied; otherwise direct
OpenRouter is used. It does not access D1, Clerk, the vault or the Alpha corpus.

Research prepares guests before a shoot using Treg web search and page evidence.
It does not retrieve existing episodes. Requests can name a guest, companies and
competitors together. Optional private notes require consent and never become
public search queries. The UI has no video ID or file upload field.

Offline source tests, including real upstream conduct/write with fake external
adapters, are separate from live acceptance. The selected `noesis-research` OmniRoute route (or direct OpenRouter
`deepseek/deepseek-v4-flash-0731` without OmniRoute settings) must pass the three-brief real trial after keys are supplied. No provider
quality, endpoint availability, billing, full transcript coverage or Docker
runtime acceptance is claimed from fake tests.

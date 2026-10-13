# WTF OS Research Agent — Provider and Template Plan

Date: 13 October 2026
Status: local implementation complete and covered by offline source tests. Provider configuration, deployment and live editorial acceptance remain pending. See [runtime setup](docs/RESEARCH-RUNNER.md).

## Recommendation

Use an existing research engine instead of writing an autonomous research loop from scratch. The leading candidate is **GPT Researcher**, with a small Treg adapter for external research tools and the existing OpenRouter model configuration for generation. Keep the current WTF OS frontend, Clerk/D1 authorization, and application-owned persistence.

Before committing to the engine, compare it against a simpler managed-research flow through Treg/Linkup on the same three guest briefs. Choose the simplest option that meets the required evidence and editorial quality. Treg consolidates tool access; it does not supply the complete WTF research product.

## What the provider research established

| Option | Verified documentation finding | Implication |
| --- | --- | --- |
| Treg | Hosted tool gateway with HTTP and MCP access. REST uses `/call/<tool-id>` and `X-Treg-Token`. | One backend integration can cover several external services, but their inputs and outputs still require validation. [API reference](https://treg.to/docs) |
| Perplexity through Treg | Search and lightweight cited answers have platform-key routes. Background research start/status/cancel are listed as BYOK-only. | A single Treg token does not eliminate every provider-account requirement. [Catalog](https://treg.to/tools/perplexity) |
| Linkup through Treg | Lists platform-key search, page fetch, structured extraction, asynchronous research and status tools. | Candidate for a low-code managed research trial without a separate Linkup signup. [Catalog](https://treg.to/tools/linkup) |
| Direct X through Treg | Requires an OAuth account connection. | Do not promise account-free official X access. [Catalog](https://treg.to/tools/x) |
| ScrapeCreators through Treg | Lists public social-data tools, including YouTube and X capabilities, with endpoint-specific availability. | Candidate for public appearance/post discovery; test exact output and timestamp coverage before adopting. [Catalog](https://treg.to/tools/scrapecreators) |
| GPT Researcher | Existing Python research engine with report generation and MCP/custom retriever support. | Leading reusable engine; integration remains necessary. [Repository](https://github.com/assafelovic/gpt-researcher), [retrievers](https://docs.gptr.dev/docs/gpt-researcher/search-engines) |
| LangChain Open Deep Research | Configurable research template with MCP support, but the repository currently displays an archived status. | Useful reference, not the preferred new production dependency. [Repository](https://github.com/langchain-ai/open_deep_research) |

Treg's workflow catalog is not evidence of a ready-made four-tier podcast brief application. No exact WTF-compatible finished template was verified.

GPT Researcher's checked LICENSE contains Apache-2.0 text, while search results surfaced inconsistent package metadata. Pin an exact revision and check its LICENSE/NOTICE and dependencies before reuse. [Checked LICENSE](https://raw.githubusercontent.com/assafelovic/gpt-researcher/master/LICENSE)

## Proposed system

```text
WTF OS research page
  -> existing authenticated Beta API
  -> persistent research job
  -> private research runner using the selected engine
       -> Treg: allowlisted public search/extraction/research tools
       -> OpenRouter: planning and structured writing
       -> approved Alpha evidence interface: existing WTF episodes
       -> authorized internal notes: private context
  -> application citation/number checks
  -> versioned four-tier brief and evidence records
  -> existing WTF OS page: review, edit, regenerate, follow-up
```

GPT Researcher is Python-based. Plan a private Python container for that candidate, rather than assuming it runs unchanged inside the current TypeScript Worker. The managed-research candidate could keep the orchestration in TypeScript and avoid that service; the trial must assess whether it meets the workflow requirements.

All runtime hosting is proposed. Provisioning, secrets and shared-database migrations remain separate implementation actions.

### Reuse from our product

- Clerk authentication and D1 permission checks; browser navigation never grants access.
- Existing frontend shell and design system; one Research page, no embedded second application.
- Existing OpenRouter provider arrangement. The checked code uses `z-ai/glm-5.3-flash`; test structured-output/tool compatibility before selecting it for research. GPT Researcher warns that model behavior varies. [Model configuration](https://docs.gptr.dev/docs/gpt-researcher/llms)
- Existing owner-scoped storage/deletion patterns, adapted for research permissions rather than reusing analytics tables.
- Existing Alpha transcript authority. Do not copy its corpus into Beta or treat a generated answer as raw evidence. Reuse validated public evidence where sufficient; any new evidence endpoint requires a scoped Alpha-side implementation.

### Small amount of new product code

- Authenticated research create/status/read/cancel operations.
- A durable job record with stage progress, bounded retries and restart recovery.
- One Treg integration with a small allowlist and normalized evidence output.
- Four-tier brief schema, editing/versioning and single-tier regeneration.
- Source/claim links, numerical verification and cost receipts.
- Research UI and access/deletion tests.

Keep research-job storage in the existing application database. Proposed records: briefs and versions; runs and stage status; source evidence; claim-to-source links; tool/model usage. Large permitted attachments need private object storage approved for research, not reuse of the public transcript bucket.

## Research workflow

1. **Resolve the subject:** guest, company or industry input. Ask for clarification only when multiple plausible entities remain.
2. **Create a shared source set:** primary websites, filings, government/industry statistics, interviews and relevant WTF evidence. Deduplicate by canonical URL and underlying publication, not just domain.
3. **Run four bounded tracks:** Snacks (background), Appetizers (industry), Main course (opportunities for young Indians), Desserts (takeaways/outlook). Reuse collected evidence across tracks instead of paying repeatedly for the same search.
4. **Investigate appearances:** discover prior podcasts; fetch permitted transcripts when available. Store real timestamp metadata. Label unavailable transcripts/timing honestly; a search snippet is not a transcript.
5. **Verify:** associate each factual claim with actual supporting excerpts. For figures, compare year, units, geography and definitions against an independent source. Show disagreement or mark a single-source figure unverified. A model check alone is not proof.
6. **Produce the brief:** four editable sections, source links, dates, limitations, and per-section regenerate. Preserve previous versions and cite evidence, not a provider's generated summary as the original source.
7. **Follow-up chat:** answer from the saved evidence set; run an explicit fresh-research job when new information is needed.

Treat X posts as attributed statements or discovery leads. Do not use popularity or repetition across copied articles as independent confirmation.

## Integration details to prove in the trial

- Use REST behind the backend initially; GPT Researcher's custom retriever expects normalized source content, so Treg is not a drop-in base-URL replacement. A small adapter can return the required source format. [Retriever contract](https://docs.gptr.dev/docs/gpt-researcher/search-engines)
- MCP is an alternative supported by both systems; use it only if its scoped tools and authentication are simpler in practice. [GPT Researcher MCP](https://docs.gptr.dev/docs/gpt-researcher/retrievers/mcp-configs)
- Disable the template's default direct search and scraping paths when routing retrieval through Treg. Audit embedding and model defaults as well, so they do not silently require another account or export private notes.
- Persist asynchronous provider task references and poll existing tasks; do not start duplicate work after an HTTP 202 or timeout.
- Provider-specific proxy calls generally preserve provider schemas. Routed `treg.*` capabilities have separate routing semantics; validate each chosen contract rather than assuming universal automatic fallback. [Treg integration guide](https://treg.to/llms.txt)
- Record tool call IDs and billed amounts alongside model usage. Apply application-side limits on calls, concurrency and total run budget; stop launching work before exhausted budgets. [Integration guide](https://treg.to/integrate.md)

## Evidence, privacy and failure behavior

- Restrict tools to read-only research. No social publishing, account administration or contact outreach tools.
- Treat pages, transcripts and tool outputs as untrusted evidence, never as executable instructions. Constrain URLs and block private-network fetches.
- Derive research ownership and sharing permissions server-side. A proposed first release is private drafts with explicit team sharing; confirm team edit permissions before implementing sharing.
- Keep confidential offline notes out of external search requests. Their use with a model requires an approved data-handling path.
- Treg's privacy page contains both no-body-storage language and an answer-retention table; its integration documentation also describes stored results. Clarify retention and disabling it before sending confidential material. Public information only in the initial trial. [Privacy policy](https://treg.to/privacy)
- Failed tracks remain visibly partial. Missing data never becomes zero or a fabricated claim. Cancellation stops new work but may not reverse an already billed external task.
- Save provenance and permitted excerpts with retrieval dates. Apply deletion to private attachments, evidence and brief versions; verify upstream retention separately.

## Delivery plan and acceptance gates

Estimates below cover the research agent only, with one full-time developer and prompt editorial feedback. They are provisional until the trial, and exclude waiting for access or provider clarification.

| Stage | Estimate | Deliverable and gate |
| --- | --- | --- |
| Provider/template trial | 2–3 working days | Same three public guest briefs through GPT Researcher + Treg and managed Linkup research. Compare citation support, numbers, missing appearances, latency, cost and integration effort. Select engine and pinned endpoints. |
| First usable version | 7–10 additional days | Research page, persistent jobs, entity clarification, four tiers, sources, save/reopen and visible partial failures. No confidential-note uploads yet. |
| Editorial features | 5–7 additional days | Versioned editing, tier regeneration, source-grounded follow-up, authorized notes, episode attachment and confirmed sharing rules. |
| Verification and staging acceptance | 5–7 additional days | Independent numeric checks, available podcast timestamps, deletion/isolation tests, retry/cancellation tests and three real guest reviews. |

Target: first usable version in approximately **2–3 weeks**; fuller research workflow in approximately **4–6 weeks**, subject to gates. Automatic ASR for unavailable external transcripts, exhaustive Apple/Spotify coverage, and the original Kimi bake-off are not included in that estimate. If they remain mandatory for full Section 2.1 acceptance, scope and estimate them separately; this delivery must not be labeled fully spec-complete without them.

Acceptance checks:

- Every factual claim has evidence or a visible unverified label.
- Numeric sources actually agree on the reported figure's definition and period, or the brief explains the difference.
- Podcast timestamps come from transcript metadata; never inferred from a summary.
- Five prior appearances are surfaced per guest where available, with honest transcript-coverage limitations.
- One failed track does not erase completed work or mark an incomplete brief complete.
- Saved versions survive reload; one user cannot access another private draft.
- Tool/model costs are attributable to a run and bounded by the application.
- The research team accepts three real guest briefs as useful and reports the specified desk-research time saving.

## Costs and remaining decisions

Do not quote a fixed cost per brief before measuring. Total cost includes tool searches/extraction/research, model tokens, any embeddings, runtime and storage.

As a planning example, Treg lists Perplexity standard search at $0.005 per successful call: twenty such calls would be $0.10 for search alone. Linkup research is listed at $0.25–$2.50 per successful task; four independent tasks would be $1–$10 before generation and other work. These are illustrative catalog-based calculations, not a quote or recommended default. Recheck exact prices at implementation. [Perplexity](https://treg.to/tools/perplexity), [Linkup](https://treg.to/tools/linkup)

Needed for implementation: a server-side Treg account/token, three agreed trial subjects and sample briefs, hosting choice if Python wins, approved handling of private notes, sharing roles, and a per-run budget. A Sonar-specific mandate in the original spec needs explicit agreement if Linkup replaces it; likewise, using an existing engine does not count as completing the Kimi comparison.

## Research limits

The initial research reviewed public provider documentation and repositories without paid tool calls, account connections or deployment. Implementation now reuses a pinned GPT Researcher package and tests provider boundaries with simulated responses. Live account eligibility, quality, billing and the managed-provider comparison remain trial checks. Provider live-verification badges are provider claims, not our own end-to-end test results.

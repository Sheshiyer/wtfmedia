# Dependency and API audit receipt

Checked 2026-10-13, public metadata/source only; no paid requests.

- GPT Researcher: PyPI `gpt-researcher==0.16.1`, exact sdist
  `https://files.pythonhosted.org/packages/0f/d6/f1608a6c0841ecfda94f0c6fc564e5f5be44a29d9ba9205c3b10606ad4e4/gpt_researcher-0.16.1.tar.gz`.
- Sdist SHA-256: `2583fd89cc4b886260d4286c37bee984eeccf5b2d4daf0c2b4f157639476e182`.
- Wheel SHA-256: `1c0fe74a1c3319b2ac2caa910808c61b638634d2b75361521e8c4627a8b5a8cf`.
- That sdist's `LICENSE` contains Apache License 2.0; an unmodified copy is
  retained as `GPT-Researcher-LICENSE`. No NOTICE file was present in the sdist.
  This is the license receipt for this exact source, not a claim about every
  transitive dependency. Dependencies retain their installed metadata/licenses;
  redistribution requires a separate complete transitive license review.
- `requirements.lock` pins the complete resolver result and hashes, generated
  with `uv pip compile research/requirements.in --python-version 3.12
  --generate-hashes --output-file research/requirements.lock --no-header`.
  Tests installed this lock on CPython 3.13.14. The Python container tag is pinned
  by patch version, not immutable image digest; OS packages are not hash-locked.

Audited source files: `agent.py`, `actions/query_processing.py`,
`actions/report_generation.py`, `actions/retriever.py`, `skills/researcher.py`,
`skills/writer.py`, `skills/context_manager.py`, `utils/llm.py`,
`config/config.py`, and `config/variables/default.py` in that sdist.

The upstream conductor accepts `requires_scraping=False` retrievers with
`href/title/body/raw_content`; the writer accepts `custom_prompt` and
`ext_context`. Memory is lazy. This runner injects its per-run retriever and
replaces imported `create_chat_completion` aliases with the audited budget
adapter in dedicated processes. Generic providers and embeddings fail closed;
MCP, images, source curation and scraping are disabled. This is a version-specific
integration seam, not an upstream stable plugin promise; any upgrade requires
repeating the offline real-engine test and source audit.

Public provider schemas are recorded in `../catalog-receipt.json`:

- [Treg Perplexity search catalog](https://treg.to/catalog/endpoints/perplexity.web.search)
- [Treg Exa raw contents catalog](https://treg.to/catalog/endpoints/exa.web.contents.get)
- [Treg cost/idempotency integration reference](https://treg.to/integrate.md)
- [OpenRouter usage receipts](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [OpenRouter provider price ceilings](https://openrouter.ai/docs/guides/routing/provider-selection)

The runtime checks each allowlisted tool's current catalog contract before use.
No routed waterfall, arbitrary tool ID, default retriever, direct page fetch,
provider-generated source summary, paid asynchronous task or automatic ASR is used.

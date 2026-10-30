# Private research runner

## Structured research and diagnostics

New jobs carry `schemaVersion: 2` and `researchInput` with `guestName`,
`companyName`, `industry` and `audienceCountry: "IN"`. India is an audience
context across global research. At least one of the three subject fields must be
populated (2–120 characters); absent fields stay empty. `skipClarification`
persists an optional skip without authorizing a guessed person or company.
New full runs cover all four sections from any single supplied field, researching
related people, companies and industries from documented connections. Inputs remain
unchanged; researched leaders are not presented as confirmed guests. Existing saved
skipped sections remain readable and are not automatically regenerated.
India remains audience context across global research. It is not a separate report section or an
India-only search filter. Title-only historical jobs remain supported.

The runner returns optional `coverage`, `modelInfo`, and safe `failure` metadata.
Section failures also carry a safe error category. Coverage has six channels
and distinguishes dedicated tools from domain-targeted web search, no results,
unavailable access, failures and budget limits. Public API section regeneration
is disabled; internal legacy section jobs remain readable and cancellable.

The verified social tool catalog is recorded in
`research/social-catalog-receipt.json`. Each dedicated call rechecks the tool
contract before first use, reserves its bounded price and has an idempotency
receipt. Unknown schemas are errors, not empty successful searches. Provider
availability and account eligibility can change; do not treat catalog entries
as live success. Four dedicated channels returned data in the 20 October local
adapter check; the listed YouTube endpoint returned 404 and requires the
explicit web-search fallback.

The full local trial also observed a LinkedIn charge of $0.008 against a $0.002
catalog quote/reservation. The adapter recorded the actual charge and stopped
that channel as budget-limited; it did not raise the limit or claim coverage.
The per-call maximum header is a requested provider limit, not a guarantee of
upstream billing. Review this discrepancy before expanding live acceptance.

Source counts adapt to report evidence needs. After initial discovery, a bounded,
checkpointed assessment identifies uncovered topics and performs targeted follow-up
searches. Coverage claims must reference retained exact quotes. No channel quota or
120-source cutoff remains. Twenty is a provider batch size; several topic-specific
queries can collect more results from that channel. New searches stop when topic
coverage is supported, nothing useful is added, or provider, time, spending or storage
bounds intervene. The saved report shows a code-owned coverage notice for that stop.
Retention is limited by a 1 MB serialized evidence allowance within the 1.8 MB document
limit, prioritizing relevant subjects while preserving saved citations. Follow-up
searching shares the existing preparation-phase call limit, reserves the preparer's
calls and funds, protects writing/visual allowances, and has a three-minute window.
Up to twelve separate Alpha episode references can accompany the historical appendix.
The edge obtains this bounded public synthesis through the existing published Alpha
chat contract; private notes and owner identity never cross that bridge. The runner
has no Alpha corpus credentials or raw transcript access. Historical synthesis informs
research planning and proposed follow-ups, never current-fact validation or verified
verbatim/speaker claims. Missing context is disclosed and narrowed identity scope drops it.
Sources cited in completed sections, including numeric comparisons, are never
evicted; oversized legacy protected evidence remains readable.
Larger evidence sets are read in bounded synthesis batches with original source
IDs. Summaries are cached in private job state by exact evidence and public scope,
so unchanged batches are reused across sections and retries; changed evidence or
scope invalidates them. Generated digests never replace the retained evidence.
A supplementary search failure can use existing retained
evidence with a visible limitation; model, budget, storage and cancellation
errors are never swallowed. Content-free social records are not evidence.

The reader hides edit/version controls; historical API compatibility remains.
Editing the research subject through that API keeps the previous report but sets the server-owned
`needsResearch` flag and blocks follow-up against mismatched evidence until a
fresh result arrives. Restoring a saved version restores that version's scope
and flag. This does not rewrite old report content.

Worker stdout remains suppressed. The API process forwards only whitelisted
JSON `research_stage` events from worker stderr; arbitrary upstream logs are
discarded. Events include stage/status, safe failure code, bounded counts,
duration and token usage when reported. Failures retain an allowlisted provider,
operation, HTTP status and reason (HTTP/transport error, interrupted/invalid stream,
local context limit). Logs additionally include request/response byte counts. They exclude report text, request
bodies, provider error bodies, owner/session/run identifiers and credentials.
Historical generic failures cannot be retroactively assigned a precise cause.

The runner state remains durable across restarts; no D1 migration is required
for these additive fields inside existing JSON documents. Roll out tolerant
Edge/Web readers before the new runner and new request form. Deploying only the
web app does not update the Python Container image.

Standalone source lives in `research/`. It implements the private service contract
for the authenticated Edge integration; it never accesses D1, Clerk, the vault,
Alpha corpus storage or frontend credentials. Keep it reachable only by the
trusted Edge/backend adapter. The bearer token authenticates that adapter, not
individual users: ownership, roles, the per-owner active-job limit, saved versions
and durable Edge delivery retries remain application responsibilities.

## Setup without credentials or paid calls

From the repository root, with Python 3.13:

```bash
python3.13 -m venv research/.venv
research/.venv/bin/python -m pip install --require-hashes -r research/requirements.lock
research/.venv/bin/python -m unittest discover -s research/tests -v
```

Dependencies are pinned and hash-locked, including **GPT Researcher 0.16.1**.
The Apache-2.0 source/license receipt and audited integration seams are in
`research/licenses/RECEIPT.md`. The test suite uses temporary SQLite databases,
fake provider adapters and a real upstream conduct/write compatibility test. It
makes no paid requests and needs no keys. The compatibility test is explicitly
skipped if GPT Researcher is not installed; such a run is not full acceptance.

The recorded local verification interpreter is CPython **3.13.14**. Run the
same checks using the repository-local environment created above:

```bash
research/.venv/bin/python -m unittest research.tests.test_gptr_compat -v
research/.venv/bin/python -m unittest discover -s research/tests -v
```

The restricted test sandbox denies Unix-socket `send`, including asyncio's
thread wake-up self-pipe. Tests detect that specific denial and install a timer
wake-up policy in test processes only. No production networking guard is relaxed.

## Local service when setup is approved

Supply these **server environment variables** through the existing private secret
workflow. Never put their values in commands, logs, browser configuration or this
document:

- `RESEARCH_RUNNER_TOKEN`: shared only with the trusted backend adapter.
- `TREG_TOKEN`: org-scoped Treg API token.
- `ANTHROPIC_API_KEY`: required for direct `claude-sonnet-5-5` generation.
  Research does not fall back to OpenRouter or OmniRoute. Existing report
  metadata still records the provider that actually generated that report.
- Optional `RESEARCH_RUNNER_DB`: defaults to `research/.state/runner.sqlite`.

Run the loopback service:

```bash
research/.venv/bin/python -m research.serve
```

If these values already live in the owner's existing ignored
`cloudflare/.dev.vars`, this explicit alternative reads **only the three provider/auth settings listed above**
into the runner process. Existing environment values win. It does not shell-source
the file, interpolate references, copy it, print values, or load Clerk/D1 values:

```bash
research/.venv/bin/python -m research.serve --provider-vars cloudflare/.dev.vars
```

The file is not read automatically. Add the runner
and Treg tokens through the owner's local secret workflow when available; do not
paste them into chat. Launching without provider keys is allowed for health and
cleanup, but new jobs and chat return 503. No automatic provider probe runs at
startup. The main process supervises one worker subprocess; keep Uvicorn at one
worker. A crashed research worker restarts; expired job leases become claimable.

Bind only to loopback locally. Any remote private hosting, TLS, network policy,
volume backup/encryption, secret injection or deployment is a separate setup task.

## Connecting the existing web and Edge application

The frontend uses `/beta/api/research` through the existing authenticated web-to-Edge
proxy. It never calls the Python service directly. The Edge environment needs:

- `RESEARCH_RUNNER_URL`: the private service origin. A local service uses
  `http://127.0.0.1:8080` with `DEPLOYMENT_ENVIRONMENT=local` (or `OPS_ENVIRONMENT=local`); deployed environments require HTTPS. The local Wrangler environment keeps `OPS_ENVIRONMENT=staging` for staging admission records.
- `RESEARCH_RUNNER_TOKEN`: the same private adapter token supplied to the runner.

Migration `cloudflare/migrations/0023_research.sql` must be applied to the intended
application database before activating the new Edge code. It is included in the
migration manifest. This task prepared the migration but did not apply it to a
shared database. Local development currently may use remote staging D1, so do not
assume a command is isolated merely because the frontend runs on localhost.

Once the web, Edge and private runner are configured, refresh the authenticated
app to receive the new research capabilities, then open `/beta/research` from the
navigation. The runner health check disables new research when provider keys are
absent; saved briefs remain readable after configuration is removed. Existing
Ask WTF and YouTube routes do not use this runner.

## Container source

Build context must be `research/`, never the repository root:

```bash
docker build -t wtf-research-runner:local research
```

The Dockerfile runs as UID/GID **10001**, uses `/data/runner.sqlite`, disables
access logs and leaves credentials out of the image. A runtime command, for use
only after local setup is approved:

```bash
docker run --rm --name wtf-research-runner \
  -p 127.0.0.1:8080:8080 \
  --mount type=volume,source=wtf-research-private,target=/data \
  -e RESEARCH_RUNNER_TOKEN -e TREG_TOKEN -e ANTHROPIC_API_KEY \
  wtf-research-runner:local
```

A fresh named volume inherits the image's private `/data` ownership. A bind-mounted
private directory must already be owned by UID 10001 and mode 0700; a wrong owner
fails startup rather than relaxing permissions. SQLite is mode 0600. Its volume
contains confidential input, output and retained extracts. Do not share it with
public assets or corpus storage. `.state/`, databases, virtual environments and
local environment files are ignored/excluded from the Docker context.

The Dockerfile has not been built or run in this delivery. Its Python patch tag is
pinned; the base image digest and Debian OS package versions are not immutable.
The hash lock governs Python dependencies, not the entire OS supply chain.

## Private HTTP contract

Every route, **including `/health`**, requires `Authorization: Bearer <runner token>`.
Comparison uses `hmac.compare_digest`. No token or request validation input is echoed
back. OpenAPI/docs endpoints and access logs are disabled. HTTP request bodies have
a 1.2 MB byte cap in addition to DTO limits; clients should keep aggregate payloads
below it (especially UTF-8 source text).

| Method/path | Behavior |
| --- | --- |
| `GET /health` | `{configured:boolean}`: all three tokens present and exact pinned GPTR package installed. No paid call; not provider availability or quality evidence. |
| `POST /jobs` | Validated body below; 202 `{id,status}`. Same ID and canonical parsed-body hash replay safely. Changed body: 409. Retired ID: 410. Global queue full: 429. Unconfigured: 503. |
| `GET /jobs/{id}` | Current public projection, or 404. No private notes, internal lease IDs or raw provider errors. |
| `POST /jobs/{id}/cancel` | `{id,status}`. Queued/running jobs become cancelled; terminal results stay terminal. Unknown IDs receive a payload-free tombstone and return cancelled. |
| `DELETE /jobs/{id}` | Idempotent 204, including unknown IDs. Erases body/results/evidence/call cache and keeps only a SHA-256 ID tombstone. |
| `POST /chat` | `{answer,cost:{toolMicro,modelUsd}}`. No searches/extraction; uses retained evidence and bounded recent context. One concurrent follow-up; 55-second process deadline; provider failure/timeout is 503. |

Create request:

```json
{
  "id": "rrun_00000000-0000-4000-8000-000000000001",
  "title": "Public guest name and company",
  "notes": "",
  "notesApproved": false,
  "section": null,
  "clarification": null,
  "sections": [],
  "sources": [],
  "budgetMicro": 5000000
}
```

`section` is null or `snacks`, `appetizers`, `main`, `desserts`. A single-tier run
preserves supplied other sections; use a **new job ID** for regeneration or an
answer to clarification. `clarification` is public entity-disambiguation context,
so it can enter search queries; private notes belong only in `notes`.

Job response keys are `id`, `status`, `sections`, `sources`, `progress`, `warnings`,
`clarification`, `cost`. Job statuses: `queued`, `running`, `completed`, `partial`,
`failed`, `cancelled`, `clarification`. Section shape:
`{key,title,content,status}`. Failed tracks never erase successful ones.

Source shape: `{id,title,url,excerpt,retrievedAt,publisher?,publishedAt?,kind?,timestampSeconds?}`.
Optional source fields are omitted, not serialized as null. IDs may include
`alpha_<video>_<n>`. Only HTTP(S) source URLs are accepted; embedded credentials,
private literal addresses, local names and credential-bearing query fields are
rejected. Extraction checks all current DNS addresses are public. The runner
never locally fetches source URLs; Exa's own redirect/DNS policy is an external
provider boundary that still needs real validation.

Follow-up body: `{question,messages,sections,sources,notes,notesApproved}`;
messages contain only `user`/`assistant` roles. Bounds: title 400 characters,
notes 12,000; four sections at 24,000 content characters each; sources with
12,000 excerpt characters each and no fixed source-count cap; question 2,000; last 12 messages at 12,000 each.
Contracts accept older reports without a source-count limit; new research retains
evidence within the serialized storage allowance described above. Research synthesis considers every
retained eligible source in bounded, cached batches; follow-up
and numeric checks select relevance-ranked verbatim slices. Notes, previous sections
and recent messages remain bounded. Full accepted evidence stays
in the job. These byte bounds prevent a growing source set from overflowing every
subsequent tier. No model-generated follow-up answer is promoted into evidence.

## Research, evidence and cost behavior

GPT Researcher owns query planning, research conduction and report writing. The
runner supplies lifecycle/checkpoints, its Treg retriever and a budgeted model
completion adapter. It does not implement a replacement research engine.

After clarification, shared discovery uses the full public request for background,
industry/competitors and recent developments. GPTR plans up to two subqueries per
section and extracts up to four pages. Reports cover guest background, company and
industry, competitors and interview preparation. No episode ID or uploaded file is
required or offered; optional approved notes remain available.

Two allowlisted, synchronous, read-only Treg endpoints are used:

- `perplexity.web.search`: one public query, `search_type:web`, max ten results.
- `exa.web.contents.get`: one public URL and raw `text.maxCharacters:12000` only.

No arbitrary endpoint, routed provider waterfall, publishing, contact enrichment,
async provider task, provider-generated source summary or default direct scraping is enabled.
The runtime validates current public catalog fields/prices before using each tool.
The checked receipt is `research/catalog-receipt.json`; contract changes fail closed.
Approved notes are interpreted once into public research guidance before discovery.
This guides topics, priorities, comparisons, exclusions and interview angle; full
approved notes also guide synthesis and follow-up. The raw notes are not used as a
search query. Consent copy explicitly covers derived public guidance going to search
providers. Unapproved notes are withheld from every provider.

Date ranges are optional, not a default goal. Relative periods are resolved using
calendar arithmetic against the run's UTC date and checkpointed for retries. Absolute
ranges are validated. Ambiguous instructions request clarification. YouTube uses
publishedAfter, X uses since/until, LinkedIn and Reddit use broad native recency
filters; exact date bounds are checked locally on every channel and tier. Treg's
Perplexity tool has no dedicated date fields, so queries carry the range and results
are checked locally. Undated/out-of-range evidence is excluded under a strict date
constraint; retrieval time is never a substitute for publication time. Report prompts
also distinguish publication dates from the dates of events/financial periods.

There is no count-based source eviction. The existing 1.2 MB runner/state request
bound, 1.8 MB saved document bound, provider response limits and per-run/per-stage
budgets still apply. A limit failure is explicit; sources are not silently dropped
to make a report appear complete. Larger evidence sets can require more model calls.

Research does not call Alpha episode retrieval. Legacy Alpha references remain
readable in old briefs but are excluded from new runner submissions. Public videos
may still be cited if Treg returns relevant supporting evidence.

Output citations must use retained supporting source IDs. Unknown IDs, arbitrary
model links and HTML are removed. Generated synthesis is visibly marked unverified:
valid IDs do not establish semantic entailment. Numeric claims receive per-claim
comparison tables with retained verbatim quotes, value, unit, period, geography and
metric definition. Proposed metadata must literally occur in the quote. Disagreement,
missing dimensions or missing independent originals is reported. Matching domains or
numbers alone never produce a verified claim. Publisher independence, syndication and
meaning still require editorial review. Uncovered numeric claims receive an explicit
missing-comparison note rather than a false certification.

New policy-1 jobs use atomic `admit` in either local SQLite or hosted Durable Object
storage. Cache lookup, the 12-dispatch phase ceiling, retry ceiling, remaining core
reservation and whole-job reservation are checked under the live lease before
recording an attempt. Successful cached calls are free of new reservations and
counts. Every dispatched retry adds its conservative reservation; a key permits two
attempts. Treg retains its idempotency and max-cost headers. Successful model output
has a private deterministic cache keyed by phase, attempt and bounded request; an
interrupted unreceipted dispatch is never assumed free.

The store owns `jobs.state._budget` (policy, per-phase counters, call mapping and a
global admission breaker). Worker checkpoints cannot replace it. No migration or
extra evidence store is introduced. Resolution, dossier discovery, channel discovery,
shared planning/search, extraction and summaries each have one 12-call allowance.
Each section has separate writing, numeric-review and optional-visual phases. GPTR
plans up to two queries; extraction selects up to eight pages. Phase changes and
recovery never reset policy-1 counters. Summaries plan all 48 KB batches before
purchase, reuse settled responses/checkpointed digests, and fail explicitly when the
bounded workload cannot fit. Core writer/numeric reservations take priority over
preparation extras and visuals. Completed core drafts survive numeric-review errors.

Missing `budgetPolicyVersion` retains legacy admission/reservation behavior; old
phase usage is not invented or zeroed into policy 1. Existing reservations persist.
The global admission limit remains 100 queued/running jobs; duplicate replay precedes it.

The top-level `budget_exhausted` failure code remains compatible. Optional `limit`
metadata contains an allowlisted phase and kind (`stage_calls`, `job_reservation`,
`call_retries`, `provider_cost_overrun`) plus bounded `used`/`maximum` integers when
known. Call limits use counts; allowance/cost limits use micro-units. This is not a
provider invoice. Private RPC, DTOs, Edge projection, logs and reader preserve the
same fields. Malformed RPC metadata fails closed without local-storage fallback.
Old failures without this information remain explicitly unknown.

Common search authentication failures with no usable evidence stop dependent work.
When usable evidence exists, further search/extraction is disabled and bounded
writing can use that evidence with a coverage limitation. A dedicated social tool
failure alone can still fall back to working web search. Shared preparation errors
are reported as discovery/preparation failures, and later failures do not replace
the earliest causal report failure.

### Policy-1 rollout (not activated by this source change)

1. Publish compatible failure readers and hosted `admit`/`allowance` RPC support,
   then deploy a pinned compatible runner image under a separate deployment task.
2. Only afterward set the Edge variable `RESEARCH_BUDGET_POLICY_VERSION` to `1`.
   It adds `budgetPolicyVersion: 1` to newly persisted job payloads only. It is
   independent of report `schemaVersion: 2`; poll/retry reuses the recorded payload.
   For a local-only setup, the same variable belongs in the ignored Edge vars file
   once the local runner has this source. No configuration was edited here.
3. Do not rewrite queued/running jobs to the new policy or reset their state.
   Rollback must retain readers for new failure metadata. Disable new-policy
   submissions before rolling back; drain or owner-authorize cancellation of
   policy-1 jobs before using a runner that rejects the new field.

Current implementation and regression cases have not been executed for acceptance:
the owner requested code changes and will perform application testing.

`budgetMicro` is at most 5,000,000. Search reserves 5,000 micro-USD, extraction 1,000,
and a model request 250,000. Model requests are limited to 90 KB input and 12,000
output tokens. Direct Claude calls use explicit effort and model-compatible thinking settings. Report writing receives
the full 12,000-token allowance; shorter planning and follow-up calls retain their
existing limits. A response ending because of the token limit is rejected as
truncated rather than saved as a complete answer. Responses start with a 180-second
elapsed deadline. A streamed answer that starts within that deadline gets one
120-second completion window; reasoning and keep-alives do not extend it. The
client stops reading at the SSE completion marker. Idle reads are bounded to
180 seconds for Claude models and 45 seconds for Treg, with a 45-second
connection timeout. Elapsed deadlines are checked when chunks arrive, not by an
independent wall-clock interrupt; a stalled read can finish later. These are
per-request bounds, not an end-to-end report time guarantee. Retry progress retains the prior safe
failure reason until a section succeeds. The runner uses the direct Anthropic
Messages API with the pinned model ID `claude-sonnet-5-5`. Request budgets and
reservations are application safeguards, not provider-enforced price ceilings.
Unknown/timeout charges keep their reservation. Configure provider account
spend caps separately when setup is approved.
Streaming is assembled server-side and requires a finish marker; incomplete or
malformed streams are rejected. Token-only usage does not establish dollar cost: reservations remain and modelUsd
is null without a cost receipt. The local reservation is not a gateway price cap.

`cost.toolMicro` is recorded charge plus reserved estimates for missing receipts;
GET includes **"Tool cost includes reserved estimates where receipts unavailable"**
when applicable. `modelUsd` is null if any model receipt is unknown, never a fabricated
zero. Call IDs, amounts and retry counts are private SQLite receipts; provider bodies
and prompts are never logging fields. A cancellation cannot refund an in-flight call.
A late settlement after cancellation/deletion is fenced out; its upstream charge may
remain unknown locally. Chat budget receipts are disposable and returned only in its
response; a failed/timed-out chat may have an upstream charge without a local receipt.

## Recovery and deletion

SQLite uses short `BEGIN IMMEDIATE` transactions, secure deletion, DELETE journaling,
foreign-key cascades and full synchronization. Research leases last 120 seconds and
renew every ten seconds. Expired jobs are claimed with a new lease; old workers
cannot save results or start new reserved calls. Durable stage attempt counts bound
restart retries. Multiple explicitly started worker processes can share the local
SQLite queue, but the shipped service defaults to **one**, and a shared network
filesystem is not supported.

Cancel/delete before submission is safe: both tombstone unknown IDs. A later Edge
retry with the same ID is rejected. Deleting removes private stored payloads and call
caches; the tombstone contains no body. Cancel keeps the private job until delete.
Every new call and write checks the lease/status, so late work cannot resurrect data.
Cancellation stops new work; a call already past its reservation fence may still
finish and be billed. Cancellation does not claim to erase provider-side retention.

SQLite secure deletion does not erase volume snapshots, SSD remapping, backups or
third-party retained content. Operator backup/retention policy is a separate setup
responsibility. No hosting, shared database, credentials, DNS or production state was
provisioned or changed here.

## Remaining live acceptance

The selected route (**`claude-sonnet-5-5` via direct Anthropic API**) **must pass the real three-brief trial** before product
acceptance: availability through the specified provider constraints, planning JSON,
editorial usefulness, real citation support, extraction coverage, numeric comparison,
latency, cancellation and settled billing. Bounded synthetic model probes are recorded in the handoff; they do not replace
a full research acceptance trial. An optional managed Linkup comparison is not implemented/defaulted;
selecting it would require its own exact schema, retention and cost review.

## Cloudflare staging container

The staging host is implemented in `research-host/`. Its Durable Object stores
runner jobs, provider-call receipts, leases and deletion tombstones transactionally.
`RESEARCH_STATE_URL` plus `RESEARCH_STATE_TOKEN` select remote storage in Python;
missing or failed remote storage never falls back to an ephemeral SQLite file.
The local launcher still uses its existing SQLite file when neither is configured.
See `research-host/README.md` for deployment settings and recovery boundaries.

## Shared evidence preparation

A full run prepares its public scope, source discovery and evidence summaries once,
then reuses the durable checkpoint for all four writers and retries. A section-only
job prepares its own section scope. Large source pools use 48 KB summary batches;
small pools up to 24 KB go directly to writing. Summaries start with 4,000 output
tokens. A truncated batch gets the existing single retry with 8,000 tokens; its
allowance and completed batches survive restarts. If shared summaries still fail,
the run stops instead of restarting the same preparation for each section.
Original source extracts remain the
evidence authority. Each successful summary is checkpointed immediately. Stage
call counters reset between preparation, summaries and writing; the job-wide spend
ceiling and bounded retries still apply. Provider completion events include safe
elapsed time and request sizes without prompts, notes or response bodies.


## Reader and Additional info

The reader shows the report, its source coverage, grouped section citations,
expandable sources and private follow-up. A real Word download uses the same
cleaned report content and source links. Deletion lives in the saved-brief sidebar
and retains owner checks, confirmation and durable erasure behavior.

### Explanatory report visuals

New runs request up to one editorial process diagram or comparison graphic per
applicable section in a single shared model request, only after required section
writing and numeric reviews have been attempted and saved. One remaining-reservation
check covers the batch; each returned figure is validated independently. Each
figure has two to four labelled steps/cards, an explanation, source IDs and
supporting quotations. This adds at most one model request for the report, under
the existing job reservation ceiling, with durable attempted/omitted checkpoints. It does
not enable GPT Researcher's image generator or introduce an image provider.

`research/visuals.py` validates bounded figure specifications against retained
page extracts, transcripts or attributed posts. Search snippets, video metadata
and Alpha reference summaries cannot substantiate a figure. Supporting quotes
must match the retained extract after whitespace/case normalization, and number
tokens must occur in the associated quote. These checks validate provenance,
not semantic entailment: editorial interpretation, units, period, geography and
process order still need review against the displayed evidence.

Figures are additive `research-visual` fences in existing section Markdown, within
the unchanged 24,000 UTF-16-unit limit; only whole figures are inserted. Source
IDs remain protected during subsequent research. Invalid output, absent evidence,
provider limits or insufficient section space omit the figure with a warning and
preserve the report prose. Attempted, completed and intentionally omitted visuals
are checkpointed; an interrupted visual is omitted rather than purchased again.
A visual-only limitation cannot change a completed core report to failed.
Cancellation still propagates. Old reports are not
rewritten; a fresh research run is required to generate visuals.

The visual request now uses the existing structured-output transport and asks for
exact evidence quotes before drafting labels. Unsupported generated dates/numbers
can be repaired locally without another model request: a heading is replaced with
neutral wording, while an affected item may use its complete verified quote only
when that quote fits the existing 180-character detail limit. Item repairs become
an evidence comparison rather than preserving a potentially misleading flow.
Quotes are never shortened to fit or invented; source/quote failures remain fatal
to the figure. Every repaired figure passes the original strict validation again,
including the independent reader/export validation. The shared request uses a
250,000 micro-unit reservation instead of up to four separate reservations. Its
context contains bounded report orientation and shared source excerpts; it does
not reduce the retained source pool or change the whole-job ceiling.

No-figure recommendations, invalid structure, unsupported quotes/numbers, truncated
responses and provider failures have distinct visible omission messages. New messages
are labelled by section; older generic visual warnings remain visible without
retroactively assigning a cause. A completed report need not contain a diagram.
Photograph retrieval and separate AI-generated illustrations are not implemented.

The reader and Word exporter revalidate the same specification and source quotes.
Fixed SVG drawing primitives render escaped text as diagrams, with captions and
expandable source evidence in the reader. Word downloads rasterize those same
diagrams locally to embedded high-resolution PNGs, with explanations, evidence
and source links. No source-site images, remote fonts or model-supplied SVG/HTML
are fetched or executed. Word image-encoding failures stop the download with an
error instead of silently dropping the image. Markdown downloads contain a
readable text alternative. Reference documents inform the visual format only;
their images and private contents are not stored in the repository or seeded as
research evidence.

This visual extension is local source implementation, not runtime acceptance.
Automated tests, live research, browser rendering and Word layout checks have not
been run for it, in accordance with the owner's request to test personally.

Additional info on a newly submitted brief is processing guidance: users do not
need a separate checkbox. The existing `notes`/`notesApproved` transport remains
for compatibility. Only the explicit new submission sets approval; historical
unapproved notes are not retroactively sent to the model. Scope priorities,
comparisons, exclusions, audience and optional dates guide retrieval and writing.
Report follow-up performs a bounded model call over saved extracts and recent
conversation; it never searches or extracts new data.

Direct Claude support is a source change until the relevant services are deployed
and live credentials/model access verified. Ask WTF uses shared Alpha inference;
its cutover is a separate deployment boundary from the research runner.


### Diagram request compatibility and table citations

Visual schemas sent to Anthropic omit `maxItems` and `minItems: 2`; the API supports
only `minItems` values 0 or 1. Figure item counts remain enforced locally and in the
reader/export validator. Reference: [Anthropic structured-output limits](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
Batch requests preserve distinct per-section omission reasons and store allowlisted
provider failure metadata; a failed batch does not repeat the same invalid request
for each section or change completed report text to failed.

The shared Markdown preparation preserves recognized citations inside GFM table
cells as source links. Source-only cells remain populated, and caveats retain their
reference instead of being left with leading punctuation. The browser uses the
current report's source anchors; Word uses matching source bookmarks. Prose source
collection, unknown references, raw Markdown/code and saved report content retain
their existing behavior. Existing reports gain table links on refresh/export without
a paid rerun; missing figures cannot be retroactively recovered from failed API calls.


### Required visual treatment and saved-report recovery (local source)

Visual generation now chooses a documented process, a supported comparison, or an
attributed evidence map. It should return null only when there are too few supported
items, not merely because the section lacks a process. The single batch selects
bounded evidence separately for each section, prioritizing its cited extracts.
Policy-1 jobs protect one model reservation for this batch during preparation and
writing; the total allowance is unchanged. This supersedes the earlier optional,
remaining-budget-only visual scheduling description.

If synthesis fails or returns null, a local evidence map can use complete short
sentences from cited full extracts. It carries source links and explicitly avoids
claims of causality, equivalence or independent verification. No extra AI call or
image service is required. Snippets, uncited sources, overlong/truncated statements
and Alpha reference summaries cannot populate this fallback. Two distinct supported
statements from cited sources are required.

Completed saved reports can receive this same presentation in the browser and Word
export, without changing stored content. Existing valid diagrams remain preferred.
This is an evidence map, not a generated photograph or a claim that a flow was found.
Source changes are local; automated and live acceptance remain unrun by owner request.

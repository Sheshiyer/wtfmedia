# Private research runner

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
- `OPENROUTER_API_KEY`: existing approved OpenRouter key.
- Optional `RESEARCH_RUNNER_DB`: defaults to `research/.state/runner.sqlite`.

Run the loopback service:

```bash
research/.venv/bin/python -m research.serve
```

If the three values already live in the owner's existing ignored
`cloudflare/.dev.vars`, this explicit alternative reads **only those three keys**
into the runner process. Existing environment values win. It does not shell-source
the file, interpolate references, copy it, print values, or load Clerk/D1 values:

```bash
research/.venv/bin/python -m research.serve --provider-vars cloudflare/.dev.vars
```

The file is not read automatically. This delivery did not read it. Add the runner
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
  `http://localhost:8080` with `OPS_ENVIRONMENT=local`; deployed environments require HTTPS.
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
  -e RESEARCH_RUNNER_TOKEN -e TREG_TOKEN -e OPENROUTER_API_KEY \
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
notes 12,000; four sections at 24,000 content characters each; 80 sources at
12,000 excerpt characters each; question 2,000; last 12 messages at 12,000 each.
Model context separately selects relevance-ranked verbatim excerpt slices and
bounded notes, previous sections and recent messages. Full accepted evidence stays
in the job. These byte bounds prevent a growing source set from overflowing every
subsequent tier. No model-generated follow-up answer is promoted into evidence.

## Research, evidence and cost behavior

GPT Researcher owns query planning, research conduction and report writing. The
runner supplies lifecycle/checkpoints, its Treg retriever and a budgeted OpenRouter
completion adapter. It does not implement a replacement research engine.

After entity clarification, shared discovery tries three public appearance queries.
Each independently retried tier uses GPTR's planner (at most two subqueries plus
the original), accumulated sources and up to four raw page extractions. The Snacks
section lists up to eight candidate appearances with a target of five when found;
fewer results are explicitly reported. Search hits are **appearance leads**, not
proof that a guest attended. A page extract is not a transcript. Automatic ASR,
exhaustive Spotify/Apple discovery and dedicated caption retrieval are not implemented;
missing transcript/timing coverage is explicit. Supplied verified timing is retained,
never inferred from prose.

Two allowlisted, synchronous, read-only Treg endpoints are used:

- `perplexity.web.search`: one public query, `search_type:web`, max ten results.
- `exa.web.contents.get`: one public URL and raw `text.maxCharacters:12000` only.

No arbitrary endpoint, routed provider waterfall, publishing, contact enrichment,
async provider task, generated source summary or default direct scraping is enabled.
The runtime validates current public catalog fields/prices before using each tool.
The checked receipt is `research/catalog-receipt.json`; contract changes fail closed.
Private notes never enter search, including GPTR planning. Approved notes enter only
report writing and follow-up; unapproved notes are withheld from every provider.

The current Alpha public chat interface provides validated citation/moment references,
**not raw transcript extracts**. Empty `alpha_reference` sources remain in the source
list for discovery and cannot support facts. Neither an Alpha generated answer nor
any provider summary is treated as transcript evidence. Independent permitted
extraction can add actual raw page evidence under the existing source ID without
inventing timing. This is limited public API coverage, not full Alpha research access.

Output citations must use retained supporting source IDs. Unknown IDs, arbitrary
model links and HTML are removed. Generated synthesis is visibly marked unverified:
valid IDs do not establish semantic entailment. Numeric claims receive per-claim
comparison tables with retained verbatim quotes, value, unit, period, geography and
metric definition. Proposed metadata must literally occur in the quote. Disagreement,
missing dimensions or missing independent originals is reported. Matching domains or
numbers alone never produce a verified claim. Publisher independence, syndication and
meaning still require editorial review. Uncovered numeric claims receive an explicit
missing-comparison note rather than a false certification.

Before each paid call, SQLite durably reserves budget in one transaction. Treg calls
carry a stable idempotency key and route max-cost header; tool responses/receipts are
cached privately. Retries retain reservations and use the same key; at most two
attempts for the same tool payload. Model retries receive distinct reservations
because OpenRouter replay is not assumed free. Each stage caps paid attempts at 12,
each research tier has two durable attempts, and completed tiers survive restarts.
The global admission limit is 100 queued/running jobs; duplicate replay precedes it.

`budgetMicro` is at most 5,000,000. Search reserves 5,000 micro-USD, extraction 1,000,
and a model request 250,000. Model requests are limited to 90 KB input and 12,000
output tokens with the same low reasoning effort as Ask WTF. Report writing receives
the full 12,000-token allowance; shorter planning and follow-up calls retain their
existing limits. A response ending because of the token limit is rejected as
truncated rather than saved as a complete answer. Keep-alive response
chunks cannot extend the 600-second response deadline (an idle read is separately
bounded to 45 seconds). Requests use provider price ceilings of $1/m prompt and $10/m completion
tokens and no per-request fee. Provider fallback is disabled, supported parameters
are required, and data collection is denied. These are conservative local holds
and requested provider constraints, not an independently tested billing guarantee.
Unknown/timeout charges keep their full reservation; the runner can stop before the
nominal budget is fully consumed. Configure provider account spend caps separately
when setup is approved.

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

The default **`deepseek/deepseek-v4-flash-0731` must pass the real three-brief trial** before product
acceptance: availability through the specified provider constraints, planning JSON,
editorial usefulness, real citation support, extraction coverage, numeric comparison,
latency, cancellation and settled billing. This source delivery intentionally makes
no paid calls. An optional managed Linkup comparison is not implemented/defaulted;
selecting it would require its own exact schema, retention and cost review.

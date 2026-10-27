# Research figures v2

Local source implementation; no deployment or live report acceptance is implied.
New jobs use visualPolicyVersion=2. Existing in-flight jobs retain the v1 flow.

## Report contract

Every substantive section receives one required figure plan, with a second figure
where the remaining job allowance supports it (maximum eight figures and two
source images). The planner runs before the section writers. It chooses explanatory
flows, ecosystems, timelines, comparison matrices, bar/line/stacked charts, metric
infographics or relevant licensed images. Quotation cards do not satisfy this policy.
Missing evidence is an explicit incomplete figure, not permission to invent data.

Figures live in the document's `figures` array, separate from section Markdown and
its 24,000-character bound. Each has a stable section-scoped ID, editorial goal,
kind, attempt count and state. A ready figure carries a versioned structured spec.
No database schema change is required: existing owner-scoped document/version JSON
stores these fields. Existing brief ownership, revision checks, cancellation,
erasure and sharing continue to apply.

`shared/research-figures.ts` is the Edge and browser contract. Python's models and
validator in `research/figures.py` enforce the runner boundary. Validators check
exact retained quotes, source eligibility, numeric support, consistent chart scope,
explicit edge references, chronological dates, bounded fields and derived arithmetic.
These mechanical checks are not a guarantee of semantic truth; editorial claims
still need source review. Search snippets and Alpha public summaries cannot support
figures. Alpha's historical discussion context stays an editorial reference.

## Generation and budgets

The runner reserves core writing, first figure attempts and one automatic repair per figure before discovery.
Planning may add figures only within the remaining allowance. Targeted research is
bounded to one query and two full extracts per planned section, checkpointed and
routed through existing provider admission. Section writers receive the visual plan
and must retain sources in factual table rows. Figures are generated independently
with two bounded attempts, durable provider receipts, and reservations for figures
that have not finished their bounded attempts. Figure count is sized for two attempts per figure; the default allowance normally plans four substantive figures. Completed figures survive process recovery.
If summarizing all retained extracts would consume protected writing/visual funds,
writers use relevant original extracts per section and record the coverage limitation.

A visual-only run uses the existing owner-scoped `/run` action with
`visualsOnly: true` and the expected revision. The server supplies retained sections,
sources and figures; the browser cannot substitute them. Successful figures are
kept; missing figures receive a new bounded allowance. The runner skips subject
resolution, Alpha context retrieval, general discovery and section writing. It does
not forward private editorial notes. The endpoint remains available for an explicitly authorized recovery operation; the report reader does not expose an upgrade/retry button.
Retries use the retained evidence; insufficient evidence may require fresh research.

`completed` now requires complete written sections and all planned figures. When
writing is complete but figures are missing, the report remains `partial` and the
reader separately reports the writing state and ready/required visual counts.
Old reports retain their text and stored v1 graphics. Terminal partial reports explicitly say generation has stopped; waiting does not resume them.
The automatic reader-only quotation-card fallback is disabled.

### Generation contract hardening

Provider schema normalization preserves all named properties (including `title`)
while removing unsupported schema annotations. Each model-generated row and edge selects IDs directly from a bounded
bank of verbatim retained passages, constrained by a per-request schema enum. The
runner builds the deduplicated evidence list and citation positions, then attaches
source IDs and quote text before validation. The model never renumbers citations. Failed bounded drafts are
retained privately for the automatic repair request, which receives the offending
item/field and the prior draft rather than starting again without it. Unknown evidence selections fail closed. Numeric, timeline and
relationship checks remain enforced. Validation failures retain content-free
check codes and bounded repair instructions; no invalid draft is rendered as fact.
Targeted extraction may upgrade uncited snippets before writing while retaining
already-cited evidence and full extracts. No new provider or credential is required.

Numeric validation accepts equivalent thousands separators, decimal precision,
percentage wording and hyphenated ranges without turning genuine negatives into
positives or bare counts into percentages. Date validation accepts explicit month
names at matching precision; a year alone cannot support a month or day. Python,
Edge and browser enforce the same rules. Timelines require at least two supported
dated events. Supported undated items appear in a separate context area without
chronology lines; they are never assigned invented dates.

## Source images

Images are optional choices within the required visual plan. The collector reads
at most two already-retained public HTTPS pages per requested image and only accepts
image-specific licensed captions (CC0, CC BY, CC BY-SA or public domain). A site
footer or model claim is not an image license. Author attribution remains verbatim.
Only one image from a figure caption is selected; ambiguous or unavailable images
remain incomplete. No stock-image or image-generation service is added.

Every redirect and DNS result is checked; connections pin a public address while
verifying the original TLS hostname. Requests carry no user/provider credentials.
Page/image byte sizes, redirects, timeouts, pixel counts and image counts are bounded.
PNG/JPEG/WebP inputs are decoded and re-encoded as metadata-free PNG, at most 65 KB.
Approved bytes, dimensions, attribution, license quote and original/source URLs
are retained inside the owner-scoped report. Browser and Word views make no remote
image requests. Existing report/run erasure also removes these assets.

## Presentation and export

Fixed local SVG primitives render the specifications. Model HTML/SVG is never
executed. Figures include takeaway, source references, scope/caveats and accessible
text. Charts use zero-inclusive axes, explicit units and comparable measurements;
line series preserve chronology. Diagram arrows correspond to explicit edges;
a connection key keeps edge labels readable. Comparison cells retain row references.

The same subsection-placement function and renderer serve the webpage and Word.
On narrow screens, large graphics scroll inside their own region and include a text
explanation. Word rasterizes locally at double resolution and splits tall figures
at complete row boundaries, with continued titles, instead of shrinking an entire
long diagram to an unreadable thumbnail. Evidence and attribution follow the figure.
Export errors remain errors; a missing image is not silently replaced with success.

## Validation and rollout

Static syntax/schema, TypeScript, lint and bundle checks are distinct from runtime
acceptance. On 2026-10-27 the owner explicitly authorized automated tests and live
visual-only recovery through the existing Anthropic service. The selected saved
report completed all four figures with five model calls, including two automatic
repairs; no research or writing was rerun. Both validators accepted the result,
the actual React reader loaded all figures, and browser Word export embedded them.
The guarded database update and readback preserved written content and sources.
This does not establish authenticated UI, image retrieval or broad release acceptance.
Before release, inspect representative payment flows, industry charts, sparse-evidence
reports, legacy upgrades, mobile scrolling and Word pagination.

Deploy the runner, Edge and web together in staging when separately authorized.
The shared figure contract does not change Ask WTF, analytics, credentials, corpus
resources, production routing or production deployment state.

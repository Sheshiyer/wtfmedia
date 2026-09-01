# Uncut provenance source register

**Status:** owner-supplied sources structurally catalogued for planning. Original XLSX and PDF files remain outside the repository. This register stores no transcript text, private URLs, media paths, meeting passages, credentials, account identifiers, or machine-local paths.

## Source package

| Source label | Planning role | Structural evidence | Fingerprint |
| --- | --- | --- | --- |
| `Podcast Transcripts (1).xlsx` | Episode title, transcript-reference, published-date, clean-cut, and final-frame inventory | Five sheets, 62 non-empty episode rows, 58 transcript references, 59 posting dates, 12 clean-cut references, and 52 final-frame references. | `dc46a79c07d1` |
| `Internal - PODCAST Links .xlsx` | Candidate internal/uncut, subtitle, final-file, and Hindi asset inventory | Five sheets, 64 non-empty rows, and 57 values / 52 hyperlinks under the `Internal` field. | `f2070ab4efc3` |
| `WTF_Kickoff_Meeting_Minutes.pdf` | Product and operating-workflow evidence | 16 pages; covers YouTube, transcripts, uncut assets, calendar, and analytics. | `148709ae8a03` |
| `WTF_OS_Phase1_Phase2_Build_Spec.pdf` and companion Markdown | Delivery and acceptance authority | 10 pages; requires uncut-first transcripts, dual timeline reconciliation, source-agnostic segments, and a production-calendar decision. | `f807788513fe` |

## What the supplied evidence settles

- **Uncut is primary.** Canonical transcript segments derive from uncut media when available. YouTube is the published-video timestamp projection, not the default transcript authority.
- **Dual timelines are required.** A verified per-episode mapping translates uncut and YouTube moments in both directions; it may not apply a global offset.
- **One team evidence workspace; distinct provenance.** Phase 1 remains an ungated closed test. Before Phase 3 activates, WTF OS is gated by Cloudflare Zero Trust for approved team members. YouTube and uncut then share that authenticated workspace and are not separate access classes; their labels and timeline mapping remain visible for evidence fidelity.
- **The sheets are an import map, not a corpus.** They identify candidate assets and dates, but their values and links remain outside Git and are not a runtime dependency.

## Structural reconciliation findings

| Category | Transcript workbook | Internal-links workbook | Status |
| --- | ---: | ---: | --- |
| WTF podcast | 27 | 27 | Candidate one-to-one category match |
| People by WTF | 24 | 24 | Candidate one-to-one category match |
| WTF is Finance | 4 | 4 | Candidate one-to-one category match |
| Special Episodes | 4 | 5 | One additional internal-links row needs review |
| WTF Online | 3 | 4 | One additional internal-links row needs review |
| **Total** | **62** | **64** | **Two rows block automatic completion** |

Coverage is not converted into a success rate: a non-empty cell does not prove that an asset is accessible, is an uncut master, or aligns with the public episode. The `Internal` heading is a strong candidate for uncut media, but its semantic meaning and each row's asset role require owner confirmation.

## Import contract for the next implementation

1. A protected owner-run adapter reads the original workbooks; no repository code accepts copied rows, private links, or transcript text as fixtures.
2. The adapter creates a temporary reconciliation record from category, source row, normalized title, and an owner-approved public episode identifier. Title equality alone does not activate an asset.
3. Each candidate emits an explicit status: `mapped`, `missing_transcript`, `missing_uncut`, `ambiguous`, `inaccessible`, `needs_alignment`, or `rejected`.
4. A confirmed uncut asset is stored as a `source_asset` with a safe external reference and content hash. Its transcript becomes versioned timed, speaker-attributed segments. The workbook is a source register, not the asset store.
5. Alignment creates verified intervals between uncut and published assets. An uncut control stays unavailable until its asset and matching interval are verified.
6. Vectorisation activates only for approved transcript versions and records source type, version, vector id, model version, and content hash. A vector count alone is never a corpus-completeness claim.

## Calendar implications

The workbook's posting dates can seed a historical publishing projection after mapping. They do not establish a live production schedule: shoot-date coverage is only one row, asset completeness is uneven, and the source package does not provide future-calendar colour semantics.

The canonical production calendar remains a D1-backed workspace decision. It may link mapped episodes and import approved historic publish events, but it may not infer future shoots, owners, colour meanings, provider events, or notifications from these files.

## Human review still required

- Confirm whether `Internal` is the uncut-master field and classify the other fields into `uncut`, `clean_cut`, `subtitle`, `final_frame`, or `not_an_asset`.
- Reconcile the two additional link rows and any missing transcript/asset references before importing a mapping.
- Author the approved calendar decision in the Phase 6 implementation packet; its policy is selected but no calendar store or provider is active.
- Author the approved 20-query evaluation set; the rubric is selected but the source package does not contain answer-key evaluation evidence.

## Explicit non-actions

This cataloguing did not copy or upload assets; set D1/R2 names; provision Cloudflare; create a calendar; enable a provider; re-index vectors; configure OAuth; change Phase 1 access; or prove a live Phase 3 Access policy.

# Internal release evidence intake — 2026-08-30

## Agreed release posture

- The current WTF OS release is an **internal beta**. All current internal team members may view its permitted release surfaces; role-based access control is deferred to the next release.
- This is a product-scope decision, not proof that a Cloudflare Access Application, policy, protected hostname, or user roster is configured. Those remain separate activation work.
- Published YouTube and uncut transcript versions will be evaluated as distinct evidence variants. A user-visible selector must never infer a version, timestamp, or answer that is not supported by the selected source.
- The production calendar remains a persistence/integration objective. The current local-only calendar chrome is not a configured backend or provider sync.

## Quarantined transcript rows — owner disposition required

The catalogue reconciliation found 59 verified internal records and 62 source-sheet rows. These three source rows do not have a verified internal match. They are excluded from R2, D1, embeddings, the production calendar, and release output until an owner records one outcome.

| ID | Source sheet | Row | Source title | Recommended default | Valid owner outcome | Evidence reference |
| --- | --- | ---: | --- | --- | --- | --- |
| Q-01 | People by WTF | 25 | Brain Armstrong | `needs_source_file` | `match_existing`, `create_distinct`, `exclude`, `archive`, or `needs_source_file` | Pending |
| Q-02 | WTF is Finance | 5 | WEF - Economics | `needs_source_file` | `match_existing`, `create_distinct`, `exclude`, `archive`, or `needs_source_file` | Pending |
| Q-03 | WTF is Podcast | 28 | WTF is a Battery? | `needs_source_file` | `match_existing`, `create_distinct`, `exclude`, `archive`, or `needs_source_file` | Pending |

`needs_source_file` is the safe default because none of the three rows can be matched without a trusted source record. It is not a deletion, import, metadata update, or approval.

## 20-query evaluator pack — synthetic v0, not an authored answer key

This pack provides examples for building the UI and test harness now. It is **not** the client-authored 20-query answer key and cannot satisfy release acceptance. Each row requires a later client-authored expected answer, selected transcript version, and evidence reference.

| ID | Example query | Required selected-source behavior | Client-authored expected answer / evidence |
| --- | --- | --- | --- |
| E-01 | What is the central claim in this conversation? | Identify the selected version and cite one supported timestamp. | Pending |
| E-02 | What did the speaker say about the problem being solved? | Quote or abstain; do not paraphrase beyond the source. | Pending |
| E-03 | Which prior event is mentioned? | Link the claim to a timestamp in the selected transcript. | Pending |
| E-04 | What concrete example supports the argument? | Return a source-backed example or an evidence-unavailable state. | Pending |
| E-05 | What limitation or counterpoint did the guest raise? | Preserve qualifications from the selected version. | Pending |
| E-06 | How did the conversation define the key term? | Cite the definition rather than relying on model knowledge. | Pending |
| E-07 | What changed between the uncut and published versions at this point? | Compare only an approved, aligned pair; otherwise abstain. | Pending |
| E-08 | Where does the speaker discuss a decision? | Return an exact timestamp and transcript version label. | Pending |
| E-09 | What evidence was offered for the conclusion? | Separate stated evidence from the assistant’s inference. | Pending |
| E-10 | Did the guest make a prediction? | Include conditionality and timestamp, or say it is not evidenced. | Pending |
| E-11 | What question prompted this answer? | Trace to the preceding selected-source passage when available. | Pending |
| E-12 | What did the speaker say about timing? | Preserve the original temporal wording and cite it. | Pending |
| E-13 | What disagreement appears in the discussion? | Attribute each view precisely or abstain. | Pending |
| E-14 | How is this topic connected to the episode theme? | Use only source-supported connections. | Pending |
| E-15 | What action did the guest recommend? | Cite a recommendation without turning it into advice. | Pending |
| E-16 | What uncertainty remains unresolved? | Surface uncertainty rather than completing it with inference. | Pending |
| E-17 | Which names or organisations are mentioned? | List only names in the selected source passage. | Pending |
| E-18 | What is the strongest supporting quote? | Return one concise quote with timestamp and version. | Pending |
| E-19 | Can you find this idea in the uncut version? | Require selected uncut asset and alignment evidence before answering. | Pending |
| E-20 | Is there enough evidence to answer this? | Make an explicit, truthful abstention when there is not. | Pending |

## Ten alignment-evidence cases — intake template

An alignment case is accepted only when both assets, the selected time ranges, provenance, and an owner review are recorded. Do not put raw transcripts, private-media URLs, secrets, or full source payloads in this file.

| Case | Episode canonical ID | Published asset reference | Uncut asset reference | Published range | Uncut range | Alignment method/version | Reviewer decision | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-02 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-03 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-04 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-05 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-06 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-07 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-08 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-09 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| A-10 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Completion boundary

Before activation, the owner must replace every `Pending` entry with a reviewable evidence reference, provide the authored answer key, record the three Q-row outcomes, and approve the Phase 3 Access application/policy/hostname implementation in a separately scoped activation task. This document itself changes no provider, Cloudflare configuration, asset, database, embedding, deployment, or authorization state.

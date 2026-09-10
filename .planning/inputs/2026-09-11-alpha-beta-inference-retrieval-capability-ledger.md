# Alpha/Beta Ask WTF inference and retrieval capability ledger

## Purpose and admission rule

This is the committed Wave 0 ledger for ISC-219 and ISC-220. It compares
source history only; a ref, commit, or production/staging receipt is never
evidence that a capability is adopted by another lane. Alpha behavior becomes
shared bedrock only through an explicit, tested forward-port into the shared
answer/retrieval path. Beta-only identity, history, memory, lifecycle, and
long-context modules are deliberately outside this ledger.

## Exact graph and comparison points

| Reference | SHA | What it proves | What it does not prove |
|---|---|---|---|
| `origin/release/alpha` | `e86923b68467a41e888361d552301999beaffa83` | named Alpha release source, including evidence coherence and published timing repairs | later Alpha chat/refinement adoption by Beta |
| `origin/rag/alpha-answer-accuracy` | `d4e45b44f3527b768408069f191951c2c3f492cb` | later Alpha answer, source-sheet, moment, and retrieval experiments | a safe wholesale merge: it includes an earlier Beta merge and separately gated provider/source work |
| `origin/release/beta` | `498c0e0a47b575064cf90c91c9147f7ef5813906` | authenticated staging/member baseline | later Alpha refinement behavior |
| shared checkpoint | `3e4c88754ec88dbd40b6b4ce65e5643f5112d86f` | reviewed shared-runner hardening before this ledger | Alpha parity, semantic entailment, remote deployment, or live persona acceptance |

`release/beta` and `release/alpha` merge at `ee00c28019f79d45a1b657283ca434e99446245f`.
`release/beta` and `rag/alpha-answer-accuracy` merge at
`a0bf034950a1bad04f5eb64e9163a90d32b99c66`; the latter branch already
absorbed an earlier Beta integration. Neither ancestry fact admits a later
Alpha commit automatically.

## Shared capability ledger

| Capability | Exact Alpha evidence | Current shared evidence | Classification | Admission / next action |
|---|---|---|---|---|
| Bounded prior-turn interpretation that never becomes evidence | `6f3a4a0`; later public `MigratedChatPage.tsx`; `cloudflare/src/chat/answer.ts:boundedPriorTurns` before later accuracy changes | `3e4c887` `cloudflare/src/chat/answer.ts:boundedPriorTurns` and `runChat` send bounded context labelled untrusted | **bedrock** | Retain; long-context checkpoints remain a separate private lane. |
| Follow-up retrieval keeps the most recent named user topic, while an explicit new name supersedes it | later Alpha `cloudflare/src/chat/source-mode.ts:prioritizeMatchesForQuestion`; answer-accuracy commits `a8a3b2a`, `c6d4dc0` | `3e4c887` `runChat`, `extractNamedEntityPhrases`, and `prioritizeMatchesForQuestion` | **bedrock** | Retain the existing focused answer tests. |
| Lower-case direct speech questions preserve a named-person anchor | `a8a3b2a` `source-mode.ts:ENTITY_STOP_WORDS` and `extractNamedEntityPhrases` | This worktree adds a conservative shared adaptation in `source-mode.ts:extractNamedEntityPhrases`; `source-mode.test.mjs` proves `what did sunil shetty say?` excludes an unrelated higher-score guest | **adapt** | Adopted locally with a lower-case speech-query guard and stop-word split so generic prior turns cannot become false person anchors. |
| Fail closed when a named person has no matching evidence | Alpha `a8a3b2a` introduced a fallback-to-all branch, but the earlier Alpha contract and current prompt require non-substitution | Current `source-mode.ts:prioritizeMatchesForQuestion` returns `[]`; `source-mode.test.mjs` proves the contract | **reject** | Do not forward-port the fallback-to-all portion of `a8a3b2a`; it conflicts with evidence safety. |
| Reject malformed retrieval values before answer generation | no direct later-Alpha equivalent stronger than validation in answer-accuracy work | `3e4c887` `answer.ts:hasUsableExcerpt` and answer-runner tests reject blank text/non-finite scores | **bedrock** | Retain; never let a display-only source panel repair invalid evidence. |
| Per-factual-sentence citation coverage with excerpt fallback | `bf714d9` `skills/wtf-os-conversation.ts:parseCitationMarkers`; evidence-coordinator line | `3e4c887` `answer.ts:hasCitationCoverage` and `citedEvidenceFallback` | **bedrock** | Retain conservative fallback; it is not a semantic-entailment claim. |
| Source-specific `published`, `uncut`, and `both` retrieval before final top-K selection | `bf714d9` `evidence-coordinator.ts:queryEvidenceSources`; `source-mode.ts:buildVectorQueryOptions` | Current `source-mode.ts:resolveRequestedSources` projects from one query result and preserves mode identity | **adapt** | Add only after staging metadata/index readiness is proven for both source modes and a fixed parity evaluation is agreed. Do not infer staging completeness from production. |
| Pair each episode’s counterpart timeline in `both` mode | `d955eef`, `07a420e`, `1fb32b8`; `source-mode.ts:withRestoredDualMode`, `queryCounterpartMatches` | Current resolver truthfully returns the modes available in the retrieval result | **defer** | Requires a source-asset and counterpart-query contract plus fixed dual-source evaluations; no blind backfill. |
| Same-moment pairing, uncut clock offsets, and calibrated timestamps | `7858bef`, `477ce22`; `source-mode.ts:pickSameMomentCounterpart`, `applyUncutClockOffset`, `timestampConfidenceFor` | Current `projectDualSourceCitation` keeps published and uncut clocks separate and never rewrites one as the other | **reject** | The approved mapping establishes episode membership, not trusted cross-timeline alignment. Do not port offsets or synchronized-moment UI until alignment has its own authoritative receipt. |
| Candidate confidence bands, overflow disclosure, cited-first order | `9f19d1b`, `4231e70`; `source-mode.ts:timestampConfidenceFor` and public `SourcePanel.tsx` | Current source projection exposes stable citation numbers but no admitted later-Alpha ordering/overflow parity | **bedrock** | Fleet A owns the presentation forward-port; it must consume only safe projected citation fields. |
| Moment sheet, duration labels, final-chunk duration estimate | `6037329`, `07863b2`, `284c60c`, `8745d5d`; `moments.ts` | No shared source/adapter for this output in the Beta checkpoint | **defer** | Needs a separately reviewed D1/source-sheet interface and timing evaluation; not an inference shortcut. |
| Speaker attribution prompt and answerable follow-up generation | `c6d4dc0`, `bf714d9`; `skills/wtf-os-conversation.ts`, `buildFollowUpGenerationInput`, `selectAnswerableFollowUps` | Current `answer.ts:SYSTEM` already forbids relationship inference and `runChat` shares it with member transport | **adapt** | Add only with retrieval-backed follow-up evaluation and an API/UI transport contract; do not generate suggestions from titles or prior chat alone. |
| Model picker/retry selection and provider experiments | `492d81b`, later answer-accuracy branch model changes | Current fixed fallback list in `answer.ts:ANSWER_MODELS` | **reject** | Model, credentials, timeouts, and provider selection are environment-owned. This lane changes no provider, binding, secret, or deployment configuration. |

## Direct local forward-port in this slice

The only implementation admitted by this ledger is the lower-case named-person
anchor adaptation. It changes shared `cloudflare/src/chat/source-mode.ts` only
and adds one focused contract test. It deliberately preserves the current
fail-closed no-anchor rule and prevents generic past turns from becoming an
anchor by limiting recovery to direct speech questions and splitting generic
words from the candidate run.

Red proof: before the change, `npm test -- source-mode` failed because
`extractNamedEntityPhrases("what did sunil shetty say?")` returned no anchor.
Green proof: the focused source-mode suite and the answer-runner suite pass.

## Integration boundaries

- No `member-history.ts`, `member-memory.ts`, migration, lifecycle/checkpoint,
  Wrangler, credentials, environment, corpus, or deployment files are owned by
  this lane.
- Public and member entrypoints continue to share `runChat`; their transport,
  authorization, and storage adapters remain separate.
- Production Alpha and staging Beta retain their respective web/edge/data
  planes. Shared source admission does not authorize resource/data convergence.

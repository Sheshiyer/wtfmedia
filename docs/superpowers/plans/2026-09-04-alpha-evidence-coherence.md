# Alpha Evidence Coherence Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make unscoped Ask WTF retrieval choose the right episode, present answer evidence honestly, and activate source-native published timestamps through retry-safe ingestion.

**Architecture:** Resolve a unique catalogue episode before Vectorize top-K, let actual anchors and cross-mode relevance control passage selection, derive a cited-first episode-grouped browser projection without rewriting citation identity, and make declared timestamp sidecars a transactional ingest prerequisite. Recover the twelve missing or invalid published sidecars from their own YouTube captions and keep production activation explicitly bounded.

**Tech Stack:** Cloudflare Workers, D1, Vectorize, KV, R2, Queues, TypeScript, Node test runner, Next.js/React, Vitest, Playwright, Python, `youtube_transcript_api`, Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-04-alpha-evidence-coherence-design.md`

## Global Constraints

- Published and uncut timestamps remain independent; never infer or copy a coordinate across timelines.
- Alpha remains anonymous and stateless; add no authentication or persisted chat history.
- Every production-code behavior begins with a focused failing test and a recorded RED result.
- Concurrent writers use separate worktrees and own disjoint paths; integration occurs only from validated diffs.
- Never expose secrets, secret values, transcript bodies, or machine-local paths in committed artifacts or receipts.
- Only exact, allowlisted live resources may change; DNS and unrelated Cloudflare resources remain untouched.
- `INGEST_TOKEN` credential rotation and `ingest:<videoId>` KV receipt deletion are different operations and require distinct receipts.

---

### Task 1: Worker Retrieval and Transactional Ingest

**Ownership:** One isolated Worker worktree. No other worker edits `cloudflare/`.

**Files:**

- Create: `cloudflare/src/chat/catalogue-episode-anchor.ts`
- Create: `cloudflare/src/catalogue/transcript-ingest.ts`
- Create: `cloudflare/tests/catalogue-episode-anchor.test.mjs`
- Create: `cloudflare/tests/legacy-transcript-ingest.test.mjs`
- Modify: `cloudflare/src/chat/source-mode.ts`
- Modify: `cloudflare/src/chat/evidence-coordinator.ts`
- Modify: `cloudflare/src/catalogue/job-admission.ts`
- Modify: `cloudflare/src/catalogue/asset-map.ts`
- Modify: `cloudflare/src/index.ts`
- Modify: `cloudflare/tests/source-mode.test.mjs`
- Modify: `cloudflare/tests/evidence-coordinator.test.mjs`
- Modify: `cloudflare/tests/job-admission.test.mjs`

**Interfaces:**

- Produces: `resolveCatalogueEpisodeId(db, question): Promise<string | null>`.
- Produces: `prioritizeMatchesForQuestionWithAnchor(matches, question): { matches; anchored }`; retain the current array-returning wrapper for compatibility.
- Produces: `resolveRequestedSources` using `COMPETITIVE_SCORE_DELTA = 0.05`.
- Produces: `ingestTranscriptJob(job, env): Promise<"skipped" | "ingested">`.
- Produces: versioned state `{ schema: "wtfmedia.ingest.v2", contentHash, chunkCount, timingOrigin }`.
- Consumes: existing D1 `episodes` and `episode_external_identities`, deterministic `vectorRecordId`, and current public source types.

- [ ] **Step 1: Add RED catalogue-anchor and actual-anchor tests**

Add fixtures asserting that a catalogue containing `Sam Altman x Nikhil Kamath` resolves `SfOaZIGJ_gs`, that the common `Nikhil Kamath` phrase alone returns `null`, that `Sunil Shetty` matches `Suniel Shetty`, and that pseudo-entities in the supplement and Bangalore questions report `anchored: false` and preserve episode deduplication.

- [ ] **Step 2: Run RED retrieval tests**

Run: `npm test -- catalogue-episode-anchor source-mode evidence-coordinator` from `cloudflare/`.

Expected: FAIL because the catalogue resolver and anchor-result API do not exist and fixed per-mode reservation still returns weak rows.

- [ ] **Step 3: Implement canonical scope and competitiveness**

Use one read-only D1 query:

```sql
SELECT e.title, i.external_id AS video_id
FROM episodes e
JOIN episode_external_identities i ON i.episode_id = e.id
WHERE i.platform = 'youtube' AND i.is_primary = 1
  AND e.production_status = 'published'
LIMIT 100
```

Normalize title/query tokens, ignore catalogue-common bigrams, require a unique best match, and pass the result as the effective `episodeId` before `queryEvidenceSources`. Return `anchored` from post-retrieval prioritization and base `dedupeByEpisode` on that real result, not extracted phrase count. In `both`, reserve a mode only when `bestModeScore >= bestOverallScore - 0.05`; in `uncut`, choose the stronger published fallback when uncut trails by more than `0.05`.

- [ ] **Step 4: Run GREEN retrieval tests**

Run: `npm test -- catalogue-episode-anchor source-mode evidence-coordinator` from `cloudflare/`.

Expected: PASS, including the exact Sam query, supplement dedupe, Policing asymmetric-score, and broad-query fixtures.

- [ ] **Step 5: Add RED transactional-ingest tests**

Drive the exported consumer with fake R2/KV/Vectorize/AI bindings. Assert:

```ts
await assert.rejects(() => ingestTranscriptJob(declaredMissingSidecar, env), /timestamp_sidecar_unavailable/);
assert.equal(kv.puts.length, 0);
assert.equal(vector.upserts.length, 0);
```

Cover malformed, empty, negative, nonfinite, nonmonotonic, and below-0.80 transcript-coverage sidecars; intentional no-sidecar ingestion; legacy `{start,text,duration}` normalization; receipt skip; failure before receipt; and `replaceExisting` deletion of deterministic stale IDs after successful upsert. The sparse-sidecar fixture must prove zero embeddings, upserts, deletes, and receipt writes.

- [ ] **Step 6: Run RED ingest tests**

Run: `npm test -- legacy-transcript-ingest job-admission` from `cloudflare/`.

Expected: FAIL because the current private consumer silently falls back and writes a string hash.

- [ ] **Step 7: Extract and implement the ingest transaction**

Validate declared sidecars before embedding. Accept `{t,x}` and `{start,text}` only through explicit normalization into canonical rows, then require their normalized text length to cover at least 80 percent of the declared same-video transcript. Upsert all new vectors, delete stale IDs in bounded batches, then write the JSON receipt. `replaceExisting` is an optional boolean admitted only as a repair instruction; it never broadens identity or storage keys. Keep jobs without `timestampsKey` deliberately untimed.

- [ ] **Step 8: Run GREEN Worker tests**

Run: `npm test -- catalogue-episode-anchor source-mode evidence-coordinator legacy-transcript-ingest job-admission chat-agent-skills` from `cloudflare/`.

Expected: PASS with no warning-only success path for a declared sidecar.

- [ ] **Step 9: Export the Worker diff**

Record changed paths and test output. Do not deploy, enqueue, or access live credentials.

---

### Task 2: Published Sidecar Recovery and Wrangler Profile Safety

**Ownership:** One isolated script/data worktree. No other worker edits `scripts/`, `web/public/transcripts/`, or `web/src/data/corpus-manifest.json`.

**Files:**

- Create: `scripts/published-timestamp-sidecars.py`
- Create: `scripts/test_published_timestamp_sidecars.py`
- Modify: `scripts/build_provenance_manifest.mjs`
- Modify: `scripts/queue_cloudflare_ingest.mjs`
- Modify: `scripts/wrangler-profile.mjs`
- Modify: `scripts/wrangler-profile.test.mjs`
- Generate: the thirteen invalid or absent `web/public/transcripts/<videoId>.json` files
- Generate: `web/src/data/corpus-manifest.json`

**Interfaces:**

- Produces: `validate_sidecar(value) -> list[dict[str, object]]` with canonical `t`/`x` rows.
- CLI: `python3 scripts/published-timestamp-sidecars.py --check` performs no network or writes.
- CLI: `python3 scripts/published-timestamp-sidecars.py --fetch --video-id <id> ...` fetches only explicit IDs and atomically replaces valid files.
- Queue jobs include `replaceExisting: true` only for an explicit `--repair-video-id` allowlist.
- Wrangler wrapper invokes host binary with `--profile=<validatedName>`.

- [ ] **Step 1: Add RED sidecar and profile tests**

Test canonical `{t,x}`, conversion from `{start,text,duration}`, rejection of empty/textless/negative/nonfinite/nonmonotonic or sparse rows, exact same-video identity for imported official JSON3 captures, missing-file manifest exclusion, explicit fetch allowlisting, queue repair allowlisting, and the exact spawned argument `--profile=wtfmedia`.

- [ ] **Step 2: Run RED script tests**

Run:

```bash
python3 -m unittest scripts/test_published_timestamp_sidecars.py
node --test scripts/wrangler-profile.test.mjs
```

Expected: FAIL because the focused script and compatible profile syntax do not yet exist.

- [ ] **Step 3: Implement sidecar validation and safe CLIs**

Write files through a sibling temporary path followed by `Path.replace`. Never invoke embeddings. Make the manifest builder parse and validate every sidecar, including an 80-percent normalized transcript-coverage floor, before setting `available: true`. Make queue repair opt-in per video ID and leave normal jobs unchanged.

- [ ] **Step 4: Run GREEN script tests**

Run the same commands. Expected: PASS.

- [ ] **Step 5: Fetch the exact recovery allowlist**

Fetch only:

```text
2q7-cTPwf-g FPV5fAkqyBs VIlfHB7Jk2s 0JDsFpU6pGQ
2_yA6GoqUnY fEUoJSTYtyc LqSEfz4YUFA lRjprPQHuXw
wHQiewz8k9g g0CjWbgsdTQ AdI_XWv-ZTk WMRO9dvD5T0
LcWoP6KtZKw
```

The thirteen-path input includes Policing because its present file is structurally invalid; the final missing/invalid set should total zero.

- [ ] **Step 6: Validate and regenerate the manifest**

Run:

```bash
python3 scripts/published-timestamp-sidecars.py --check
node scripts/build_provenance_manifest.mjs
```

Expected: 56 episodes, 56 valid timestamp sidecars, zero invalid files, every cue nonnegative and monotonic.

If a manual direct track is structurally valid but below the coverage floor, inspect the other direct same-video tracks and use a complete source-native generated track when available. The known sparse manual files are `FPV5fAkqyBs` and `2_yA6GoqUnY`; their replacements must preserve 1.0 normalized text coverage without persisting raw signed capture URLs or wrapper files.

- [ ] **Step 7: Export the script/data diff**

Record exact generated IDs, cue counts, and hashes without transcript text. Do not upload to R2, rotate a secret, delete KV, or enqueue.

---

### Task 3: Cited-First Episode-Grouped Source Panel

**Ownership:** One isolated web worktree. No other worker edits `web/components/`, `web/lib/`, `web/app/api/chat/route.ts`, `web/tests/`, or `web/stories/`.

**Files:**

- Create: `web/lib/public/source-panel-model.ts`
- Create: `web/tests/unit/source-panel-model.test.ts`
- Modify: `web/app/api/chat/route.ts`
- Modify: `web/components/domain/public/MigratedChatPage.tsx`
- Modify: `web/components/domain/public/ConversationThread.tsx`
- Modify: `web/components/domain/public/SourcePanel.tsx`
- Modify: `web/tests/journeys/chat.spec.ts`
- Modify: `web/stories/MigratedChatPage.stories.tsx`

**Interfaces:**

- Produces: `AnswerQueryScope = { sourceMode: SourceMode; episodeId: string | null }` stored per assistant message.
- Produces: `buildSourcePanelModel(sources, citedIndices, visibleMode)` returning stable groups, cited/candidate labels, and total/visible/hidden counts.
- `SourcePanel` receives `queryScope` and never mutates the original source array.

- [ ] **Step 1: Add RED projection-model tests**

Assert one group for repeated episode passages, cited groups before candidate-only groups, original `[n]` for citations, plain `C1/C2` for candidates, immutable source objects/indices, and hidden citation counts after filtering.

- [ ] **Step 2: Run RED model tests**

Run: `npm run test:unit -- tests/unit/source-panel-model.test.ts` from `web/`.

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the pure projection**

Group by `episodeId ?? videoId ?? url`, retain original indices, and assign candidate ordinals before mode filtering so labels remain stable. Return cited and candidate sections separately.

- [ ] **Step 4: Run GREEN model tests**

Run the same command. Expected: PASS.

- [ ] **Step 5: Add RED browser journey**

Extend the mixed-source fixture to assert `searched: both`, the accessible group name `view this answer only`, one episode heading for repeated passages, no bracketed candidate marker, candidate labels `C1/C2`, `1 cited source hidden`, and a `show all cited sources` restoration action. Change the composer mode after response and prove the stored answer scope remains `both`.

- [ ] **Step 6: Run RED browser journey**

Run: `npm run test:journeys -- tests/journeys/chat.spec.ts` from `web/`.

Expected: FAIL on the new semantics while existing timestamp/link assertions remain green.

- [ ] **Step 7: Implement message scope and grouped presentation**

Capture request mode before fetch; project `X-Requested-Source-Mode` from the web route; store query scope on the assistant message; render cited groups expanded and candidates in a secondary collapsed `<details>` region. Preserve native YouTube/Frame.io actions per moment.

- [ ] **Step 8: Run GREEN web gates**

Run:

```bash
npm run test:unit -- tests/unit/source-panel-model.test.ts tests/unit/source-mode.test.ts
npm run test:journeys -- tests/journeys/chat.spec.ts
npm run typecheck
npm run lint
```

Expected: all pass at desktop and the existing compact project.

- [ ] **Step 9: Export the web diff**

Record changed paths and test output. Do not deploy.

---

### Task 4: Integrate and Verify Locally

**Files:**

- Modify: `.project/HANDOFF.md`
- Modify: `ISA.md`
- Modify: `README.md`
- Integrate: validated diffs from Tasks 1–3

**Interfaces:** Consumes all three worker diffs; produces one coherent branch and evidence ledger.

- [ ] **Step 1: Validate worker receipts before integration**

Require each run’s `index.json`, read `SUMMARY.md` first, confirm a non-Sol provider/model and gateway attribution, inspect changed paths for ownership violations, and reject trivial or unrelated output.

- [ ] **Step 2: Apply diffs in dependency order**

Apply Worker, script/data, then web diffs. Resolve only integration seams; never overwrite the ISA or unrelated user state.

- [ ] **Step 3: Run focused and full local gates**

Run Worker focused tests, full Worker suite, script tests, web unit tests, full chat journey, typecheck, lint, production build, Wrangler dry-run, privacy scan, sidecar audit, manifest count, and `git diff --check`.

- [ ] **Step 4: Run local browser acceptance**

Use the in-app browser only. Reproduce the supplement, Sam Altman, and Bangalore Policing scenarios from deterministic fixtures; capture rendered evidence for scope, grouping, hidden citations, candidate labels, and published timestamps.

- [ ] **Step 5: Run independent review**

Call the post-deliverable Advisor, then Cato for the mandatory E5 cross-vendor audit. Fix all critical findings and rerun affected gates.

- [ ] **Step 6: Update acceptance and handoff**

Mark only locally proven ISCs complete. Record live-only ISCs as held, append bounded verification evidence, refresh README counts, and add a pickup checkpoint to `.project/HANDOFF.md`.

---

### Task 5: Exact Production Activation Ledger

**Ownership:** Root orchestrator only; sequential and authority-sensitive.

- [ ] **Step 1: Resolve the requested reset target**

Read-only inspect Wrangler secret names and exact KV receipt keys. Determine whether the owner meant rotating `INGEST_TOKEN`, deleting `ingest:<videoId>` receipts, or both. Never print a secret value.

- [ ] **Step 2: Capture rollback inputs**

Record current Worker versions, R2 object metadata/hashes, redacted KV receipt presence, queue/DLQ depth, and affected Vectorize IDs before mutation.

- [ ] **Step 3: Stop at any unapproved activation action**

Enumerate Worker deploy, R2 sidecar upload, exact receipt reset, exact queue replay, Vectorize verification, web deploy, and browser acceptance separately. Execute only the actions the owner has explicitly authorized.

- [ ] **Step 4: Verify every executed mutation**

Require readback of the new Worker version or object hash, exact receipt state, settled queue, non-null published vector starts, correct episode retrieval, and canonical browser behavior. A successful command alone is not completion evidence.

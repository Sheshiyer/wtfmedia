# Direct Claude generation (local source)

Ask WTF, YouTube planning and social planning use the fetch-based
`cloudflare/src/chat/claude.ts` adapter and `claude-sonnet-5-5`.
`ANTHROPIC_API_KEY` is server-only on the executing edge Worker. See the blank
`cloudflare/config/claude.env.example`; never put this key in public variables,
client DTOs or logs. Existing credentials are not removed or rotated.

The local Next development fallback also uses this adapter for generation via
server-only `process.env.ANTHROPIC_API_KEY`. Its existing NVIDIA embeddings and
local catalogue stay unchanged. Cloudflare embeddings remain Workers AI BGE.
No new corpus, resource bindings, ingest or RBAC changes are included.

The adapter follows the [official Sonnet 5.5 migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide):
`between_tools` thinking with low effort, no temperature, forced tools or
assistant prefill. It reads only typed text blocks and rejects refusals,
truncation, unexpected models, missing output and malformed structured JSON.
Analytics uses JSON schema output plus existing semantic validation; Google and
Zernio remain metric authorities. Low effort and token budgets need a bounded
live calibration before release; no real key or model-access check was performed.

Each model operation has a 20-second total timeout and at most one retry for
network errors, 429 or 5xx. Retry delays honor Retry-After within that deadline;
400/401/403 and invalid outputs do not retry. Public Ask WTF shares a 70-second
generation deadline across repair, classification and enrichment, and the web
proxy retains its 75-second transport budget. Cancellation propagates to fetch.
Model errors contain fixed safe codes/status only, never provider bodies.

`/v1/health.localGeneration` describes this Worker's local adapter configuration,
not successful provider access or the provider behind the Alpha service binding.
Beta Ask WTF still delegates to shared Alpha; deploying only Beta does not migrate
that path. Configuring secrets, verifying access, live calibration and deploying
Alpha require separate owner authorization. That shared-service cutover can affect
production. No deployment, credential change or live acceptance is implied here.

Before acceptance: run a bounded direct model smoke on each executing service,
then authenticated Ask WTF citations/fallback and YouTube/social follow-ups,
comparison/date changes, missing metrics, cancellation and owner isolation.
Research Python/host and research DTO migration are separate integration tasks.

## Task 4 file manifest and verification

Added:
- `cloudflare/src/chat/claude.ts`
- `cloudflare/tests/claude.test.mjs`
- `cloudflare/config/claude.env.example`
- `web/tests/unit/chat-models.test.ts`
- `web/tests/unit/claude-privacy.test.ts`
- `docs/CLAUDE-GENERATION.md`

Modified:
- `cloudflare/src/chat/answer.ts`
- `cloudflare/src/chat/public-chat.ts`
- `cloudflare/src/chat/moment-pipeline.ts`
- `cloudflare/src/analytics-assistant.ts`
- `cloudflare/src/social-analytics-assistant.ts`
- `cloudflare/src/social-analytics.ts`
- `cloudflare/src/member-router.ts`
- `cloudflare/src/index.ts`
- `cloudflare/tests/analytics-assistant.test.mjs`
- `cloudflare/tests/social-analytics-assistant.test.mjs`
- `cloudflare/tests/chat-answer.test.mjs`
- `cloudflare/tests/public-chat-followup.test.mjs`
- `cloudflare/tests/health.test.mjs`
- `web/app/api/chat/route.ts`
- `web/lib/models.ts`
- `web/components/ModelPicker.tsx`
- `web/components/domain/public/ConversationThread.tsx`
- `web/tests/contracts/api-chat.contract.test.ts`
- `web/tests/contracts/phase1-baseline-approval.json` (route hash only, with scoped owner approval reference; overall approval status unchanged)
- `web/tests/privacy/scan.mjs`
- `docs/ANALYTICS-INTEGRATION.md`
- `docs/SOCIAL-ANALYTICS-LOCAL.md`
- `.project/HANDOFF.md` (bounded Task 4 checkpoint)

Removed obsolete transport and tests:
- `cloudflare/src/chat/openrouter.ts`
- `cloudflare/tests/openrouter-key-fallback.test.mjs`

VERIFIED-SOURCE, 2026-10-21: final owned edge set 508/508; earlier full edge
snapshot 563/563; web unit 415/415; web contracts 101/101; web typecheck/lint
pass; privacy 0 violations across 433 bounded files; scoped diff whitespace
check passes. The adapter contributes 19 transport/error tests. Credential
rejection previously caused five moment calls in the regression fixture; it now
causes one, while keeping the grounded answer. These are mock/local results.

SQLite child processes and local HTTP fixtures stalled in the restricted sandbox;
the same suites completed with normal subprocess/localhost permissions. Auditing
non-research source/tests found no old provider endpoint, key or helper dependency.
Old model IDs in new-turn tests are rejection cases; historical metadata parsers
are retained. Research-owned files/tests were not edited by this task.

Review: self-review of the scoped diff; independent integrated review, final
architecture/build checks and live behavior remain with the parent integration.
No secrets or dev.vars were read/changed; no commit, push or deployment occurred.

# Alpha Ask WTF Evidence Skills Implementation Plan

> **Owner directive:** execute inline without intermediate HITL stops. Repository-local implementation and verification are authorized; production deployment and live corpus mutation remain outside this task.

**Goal:** Make anonymous Alpha answers and suggested questions use coordinated, source-specific evidence skills, while explaining untimed published candidates without fabricating timestamps.

**Architecture:** Three focused runtime skill modules define the WTF OS conversation contract and the independent Published YouTube and Approved Uncut evidence policies. A coordinator embeds each query once and runs source-filtered Vectorize searches independently. Existing Worker and web contracts are extended additively.

**Tech stack:** Cloudflare Workers TypeScript, Workers AI, Vectorize, R2/KV/D1/Queues, Next.js, Vitest, Node test runner, Playwright.

---

### Task 1: Lock retrieval, citation, and timing behavior with failing tests

**Files:**
- Modify: `cloudflare/tests/source-mode.test.mjs`
- Create: `cloudflare/tests/chat-agent-skills.test.mjs`
- Create: `cloudflare/tests/evidence-coordinator.test.mjs`

1. Add a regression showing multi-entity anchoring must retain chunks matching either explicit entity, not only the strongest combined anchor.
2. Add query-option expectations for pre-top-K `source_mode` plus optional `video_id` filters.
3. Add coordinator tests proving `both` issues two filtered queries with one vector value and uncut mode preserves its separately filtered published fallback.
4. Add conversation tests rejecting `[N]` and validating grouped numeric citations.
5. Add published/uncut timing tests for native status, reason, and no cross-timeline inference.
6. Run the selected Cloudflare tests and preserve the expected RED output.

### Task 2: Implement the runtime skills and coordinator

**Files:**
- Create: `cloudflare/src/chat/skills/wtf-os-conversation.ts`
- Create: `cloudflare/src/chat/skills/published-youtube.ts`
- Create: `cloudflare/src/chat/skills/approved-uncut.ts`
- Create: `cloudflare/src/chat/evidence-coordinator.ts`
- Modify: `cloudflare/src/chat/source-mode.ts`

1. Define focused source-skill contracts with public timestamp status/reason projection.
2. Move the conversation system prompt and citation parser into the WTF OS skill.
3. Build filtered query options using implicit-AND metadata filters.
4. Query each selected source mode independently and combine its results.
5. Relax named-entity selection from strongest-all matching to any explicit anchor while retaining score ordering.
6. Run the selected tests until GREEN, then refactor without changing behavior.

### Task 3: Coordinate ingest, answers, and answerable follow-ups

**Files:**
- Modify: `cloudflare/src/index.ts`
- Modify: `cloudflare/tests/chat-agent-skills.test.mjs`
- Modify: `cloudflare/tests/evidence-coordinator.test.mjs`

1. Add source-native timestamp status and origin to vector metadata at ingest.
2. Replace the combined Vectorize query with the evidence coordinator.
3. Validate model citation tokens through the WTF OS citation parser.
4. Generate follow-up candidates from bounded evidence excerpts rather than titles alone.
5. Re-run every candidate through embedding and source-scoped retrieval; keep only evidence-qualified questions.
6. Return no suggestions on weak retrieval, abstention, or invalid synthesis.
7. Run the focused Worker suite.

### Task 4: Project and explain published timestamp absence

**Files:**
- Modify: `web/app/api/chat/route.ts`
- Modify: `web/lib/provenance/public-source-header.ts`
- Modify: `web/components/domain/public/SourcePanel.tsx`
- Modify: `web/tests/support/rag-stub.mjs`
- Modify: `web/tests/contracts/api-chat.contract.test.ts`
- Modify: `web/tests/unit/source-mode.test.ts`
- Modify: `web/tests/journeys/chat.spec.ts`
- Modify: `web/tests/contracts/phase1-baseline-approval.json`

1. Add RED route/parser/browser assertions for public timestamp status/reason fields.
2. Extend the safe `X-Sources` projection while continuing to drop private fields.
3. Render the published missing-time explanation and label the action as opening the full episode.
4. Keep timed published and native uncut presentation unchanged.
5. Refresh only the reviewed route hash in the compatibility approval after the route contract tests pass.

### Task 5: Make retry replace, not duplicate, the last exchange

**Files:**
- Modify: `web/components/domain/public/MigratedChatPage.tsx`
- Modify: `web/tests/journeys/chat.spec.ts`

1. Add a RED browser journey that submits once, retries, and observes two requests but one visible user turn.
2. Pass an explicit history snapshot into send so retry removes the assistant response and reuses the existing user turn.
3. Run the targeted journey to GREEN.

### Task 6: Verify and hand off

**Files:**
- Modify: `ISA.md`
- Modify: `.project/HANDOFF.md`

1. Run all Cloudflare tests.
2. Run web unit and API contract suites.
3. Run targeted `/chat` Playwright journeys at the configured local build.
4. Run web typecheck, lint, and production build.
5. Run bounded secret/private-path scans and inspect `git diff --check`.
6. Record exact verification evidence in the ISA and a bounded handoff checkpoint.
7. Report local implementation separately from the still-unperformed deploy/re-ingest work.

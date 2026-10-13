# Research Implementation Plan

Goal: Build the approved research workflow in the existing authenticated WTF OS shell.
Spec: WTF_OS_Research_Agent_Plan.md. Owner authorized implementation and a Research navigation button.
Architecture: D1 holds owner-scoped briefs/versions, the authenticated Edge proxies a private durable Python runner, GPT Researcher reuses Treg tools and OpenRouter. No deployment or shared migration in this task.

## Constraints
- Keep feature/pavun local; no push. Existing Ask WTF and YouTube behavior unchanged.
- Reuse current auth; all roles receive research read/write for their own drafts, explicit team sharing is read-only.
- Only public searches leave for Treg. Notes require explicit model consent and never enter search query construction.
- Missing credentials, partial evidence and failed tracks must be truthful; no fixtures in product flows.

## Tasks
- [x] Backend: migration 0023 for briefs, immutable versions, run references and erasure outbox; owner/shared checks; optimistic revisions; bounded payloads; runner submit/poll/cancel/chat; permanent erasure including runner copies. Files cloudflare/src/research.ts, research-contract.ts, research-runner.ts, migrations/0023_research.sql, tests/research.test.mjs. Integrate member-router.ts, auth/policy.ts, ops-router.ts, user-deletion.ts. Test cross-user IDs, read-only sharing, stale edits, notes consent, malformed runner results, restart submission replay and cancel/delete races.
- [x] Runner: private authenticated Python service under research/ using pinned GPT Researcher and a Treg adapter. Persistent queue/recovery, per-tier independent failures, bounded retries/budgets, source validation and honest numeric limitations. Synthetic adapter tests plus upstream API compatibility check. No paid trial without token.
- [x] Frontend: /beta/research, existing navbar link and principal checks, saved briefs, progress/cancel/retry, versions/edit/restore, note import, sources, sharing, Markdown export and grounded followups. Owner controls only; poll cleanup; stale-response guard; tests and typecheck.
- [x] Integrate and verify: backend and frontend suites, contracts, lint/typecheck, Python tests, privacy scan and architecture refresh. Read-only local check if runtime permits. Record exact missing activation requirements and handoff; never equate synthetic tests with editorial acceptance.

## Review focus
- Another user's private brief must return 404 including version/chat/run endpoints.
- Restart/retry must not duplicate a paid external research job.
- Cancelling or deleting while a runner response is in flight must not resurrect content.
- Sharing must not disclose private notes or chat history.
- Malformed/unsupported citations and missing cost receipts must not silently become verified facts or free work.

## Source verification receipt
473 backend tests, 272 frontend unit tests, 97 contracts, typecheck, lint, Worker dry-run bundle and privacy scan pass. Python: 39 tests including the real pinned engine with simulated providers. A Python-result-to-Edge contract smoke passes. No shared migration, browser acceptance, paid provider trial, Docker execution, push or deployment. Runtime activation and editorial acceptance remain separate.

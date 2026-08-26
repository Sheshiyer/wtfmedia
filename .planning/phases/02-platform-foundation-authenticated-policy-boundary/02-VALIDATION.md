---
phase: 02
slug: platform-foundation-authenticated-policy-boundary
status: active
schema_version: 1
---

# Phase 2 — Immutable Evidence Contract

Phase 2 security evidence is definition-bound and fail-closed. A result is valid only when its unique threat ID, owning plan/task, exact command digest, and bounded evidence schema match this ledger and the owning plan. Missing, unknown, duplicate, drifted, malformed, future-dated, failed, or high/critical-unproven evidence blocks aggregation and release.

## Aggregate sections

The aggregate requires all thirteen sections before a staging packet can be considered complete:

1. source coverage
2. build
3. D1
4. Access/D1 matrix
5. policy/DTO
6. lifecycle
7. audit
8. environment/cache
9. UI
10. rollback/runbook
11. privacy
12. staging approval
13. production smoke

## Result privacy contract

Fragments may contain only threat ownership, command identity, integer exit status, bounded byte counts, SHA-256 digests, UTC completion time, and a passed/failed result. They must not contain raw stdout/stderr, requests, responses, prompts, queries, payloads, tokens, secrets, environment values, account identifiers, unallowlisted hostnames, or machine-local paths.

## Threat definition ledger

| Threat ID | Plan | Task | Severity | Automated command |
|---|---|---|---|---|
| T-02-01 | 02-01 | Task 2 | high | cd web &amp;&amp; npm run test:unit -- phase2-threat-results |
| T-02-02 | 02-01 | Task 2 | high | cd web &amp;&amp; npm run test:privacy -- --check |
| T-02-03 | 02-01 | Task 1 | high | node web/scripts/lib/phase2-threat-results.mjs --check-definitions |
| T-02-04 | 02-02 | Task 2 | critical | cd cloudflare &amp;&amp; npm test -- d1-migrations --grep super_admin |
| T-02-05 | 02-02 | Task 1 | high | cd cloudflare &amp;&amp; npm test -- d1-migrations --grep audit |
| T-02-06 | 02-02 | Task 1 | high | node cloudflare/scripts/verify-ops-environments.mjs --static |
| T-02-07 | 02-03 | Task 1 | critical | cd cloudflare &amp;&amp; npm test -- access-auth --grep forged |
| T-02-08 | 02-03 | Task 1 | high | cd cloudflare &amp;&amp; npm test -- access-auth --grep header |
| T-02-09 | 02-03 | Task 2 | critical | cd cloudflare &amp;&amp; npm test -- access-auth --grep operator |
| T-02-10 | 02-04 | Task 1 | critical | cd cloudflare &amp;&amp; npm test -- operator-policy --grep unknown |
| T-02-11 | 02-04 | Task 2 | high | cd cloudflare &amp;&amp; npm test -- operator-policy --grep mutation |
| T-02-12 | 02-04 | Task 2 | critical | cd cloudflare &amp;&amp; npm test -- operator-policy --grep transfer |
| T-02-13 | 02-05 | Task 1 | critical | cd cloudflare &amp;&amp; npm test -- audit-ledger --grep prohibited |
| T-02-14 | 02-05 | Task 1 | high | cd cloudflare &amp;&amp; npm test -- audit-export --grep formula |
| T-02-15 | 02-05 | Task 2 | high | cd cloudflare &amp;&amp; npm test -- audit-ledger --grep purge |
| T-02-16 | 02-06 | Task 1 | critical | cd cloudflare &amp;&amp; npm test -- ops-router --grep direct |
| T-02-17 | 02-06 | Task 2 | critical | cd cloudflare &amp;&amp; npm test -- cache-isolation --grep dto |
| T-02-18 | 02-06 | Task 2 | critical | cd cloudflare &amp;&amp; npm test -- cache-isolation --grep concurrent |
| T-02-19 | 02-07 | Task 2 | high | cd web &amp;&amp; npm run test:unit -- operator-lifecycle --grep redirect |
| T-02-20 | 02-07 | Task 2 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/operator-lifecycle.spec.ts |
| T-02-21 | 02-07 | Task 2 | high | cd web &amp;&amp; npm run test:browser -- tests/phase2/operator-lifecycle.spec.ts --grep logout |
| T-02-22 | 02-08 | Task 2 | high | cd web &amp;&amp; npm run test:browser -- tests/phase2/control-room.spec.ts --grep truthful |
| T-02-23 | 02-08 | Task 1 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/control-room.spec.ts --grep role |
| T-02-24 | 02-08 | Task 1 | high | cd web &amp;&amp; npm run test:browser -- tests/phase2/control-room.spec.ts --grep responsive |
| T-02-25 | 02-09 | Task 1 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/operators.spec.ts --grep denied |
| T-02-26 | 02-09 | Task 2 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/operators.spec.ts --grep transfer |
| T-02-27 | 02-10 | Task 1 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/audit-ui.spec.ts --grep denied |
| T-02-28 | 02-10 | Task 2 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/audit-ui.spec.ts --grep export |
| T-02-29 | 02-10 | Task 1 | high | cd web &amp;&amp; npm run test:unit -- audit-filters |
| T-02-30 | 02-11 | Task 1 | critical | cd web &amp;&amp; npm run test:browser -- tests/phase2/authorization-matrix.spec.ts |
| T-02-31 | 02-11 | Task 1 | critical | cd web &amp;&amp; npm run test:privacy -- --check |
| T-02-32 | 02-11 | Task 2 | high | cd web &amp;&amp; npm run verify:phase2 -- --negative-fixtures |
| T-02-33 | 02-12 | Task 1 | critical | node cloudflare/scripts/phase2-preflight.mjs --receipt .runtime/preflight/phase2-staging.json |
| T-02-34 | 02-12 | Task 2 | critical | cd web &amp;&amp; npm run verify:phase2 -- --final |
| T-02-35 | 02-12 | Task 2 | critical | node web/scripts/phase2-production-smoke.mjs --receipt .runtime/preflight/phase2-production-smoke.json |

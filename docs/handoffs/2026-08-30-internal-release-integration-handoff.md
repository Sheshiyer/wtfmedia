# Internal release integration handoff — 2026-08-30

## What this review branch contains

`codex/wtfmedia-release-integration` is a clean, uncommitted worktree created from `568022a`. It applies:

1. the Cloudflare web migration delta ending at `4154a2a`; and
2. the local UI Wave 1 delta from `codex/wtfmedia-ui-wave1`.

This is an integration candidate only. It does **not** modify, merge, commit, deploy, or remove either source worktree. It does not configure Cloudflare, create D1/R2/Vectorize data, import media, attach a hostname, or change a provider connection.

## UI review result

- The full WTF OS Wave 1 shell is present in this candidate. Its desktop navigation is the bottom ReactBits-derived dock, not the former fixed left rail.
- The mobile drawer is deliberately the full structural dark surface. The reported invisible inactive navigation is fixed with token-backed inverse text and marker colors; production-rendered contrast measured 16.26:1 at 320px.
- `/ops/production` still states that calendar and board data are not activated. Its beta-review inputs persist only in the current browser and are explicitly not a Cloudflare/D1/shared-audit or release-approval record.

## Release inputs captured without fabricating evidence

The source-of-truth intake is [internal release evidence intake](../../.planning/inputs/client-questions/2026-08-30-internal-release-evidence-intake.md).

| Input | Current status |
| --- | --- |
| Three quarantined transcript rows | Listed with `needs_source_file` as the safe proposed default; owner outcome still required. |
| 20-query answer key | 20 synthetic evaluator prompts exist for harness/UI work only; no client-authored expected answers or source citations have been asserted. |
| Ten alignment cases | Ten blank, reviewable evidence-intake rows exist; no alignment has been claimed. |
| Internal visibility | Current-release product intent is shared internal visibility; RBAC remains next-release scope. It does not prove a deployed Access policy. |

## Verification receipt

From `web/` in this worktree:

```text
npm ci --ignore-scripts                                      passed
npm run typecheck                                            passed
npm run lint                                                 passed
npm run test:unit                                            56/56 passed
npm run test:contracts -- tests/contracts/api-chat.contract.test.ts 20/20 passed
npm run test:privacy -- --check                              0 violations across 268 files
npm run build                                                passed
npm run cf:build                                             passed locally
npx playwright test tests/phase2/production.spec.ts tests/journeys/shell-controls.spec.ts
  --project=phase1-chromium-320 --project=phase1-chromium-1440
                                                            14 passed, 2 intentional skips
```

The focused Vitest commands report a pre-existing Vite configuration/deprecation warning and a delayed process-close notice after successful completion. Concurrent Worker-aware runs contend for Miniflare's local SQLite state; serial runs passed. Neither condition is represented as live Cloudflare evidence.

## Still held before activation

- Owner-recorded outcomes for Q-01, Q-02, and Q-03.
- A genuine client-authored 20-query answer key with source/version citations.
- Ten owner-reviewed alignment-evidence cases.
- Resource names and owner-approved Phase 3 Cloudflare Access application, policy, and hostname implementation.
- A separate persistence/inference slice for published and uncut transcripts, embedding, and the production calendar.

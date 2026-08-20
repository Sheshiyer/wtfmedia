---
phase: 1
slug: compatibility-component-proof-harness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. This revision records all plan/task threat identifiers and their fail-closed ASVS 5.0 Level 1 evidence contract; implementation result fields remain pending until their owning tasks execute.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/API framework** | Vitest 4.1.11 node projects — proposed, package legitimacy human-gated |
| **Component framework** | Storybook 10.5.9 + Vitest addon + Chromium — proposed, package legitimacy human-gated |
| **Route/E2E/visual framework** | Playwright Test 1.62.1, blocking Chromium project — proposed, package legitimacy human-gated |
| **Accessibility** | Storybook a11y in error mode plus `@axe-core/playwright` and explicit keyboard/focus tests |
| **Performance** | Lighthouse CI 0.15.1 plus deterministic proxy/RAG timing fixture — proposed, package legitimacy human-gated |
| **Package legitimacy gate** | Plan `01-02`, Wave 2 — approved receipt `web/tests/package-legitimacy.json`; approval `owner-explicit-approval-2026-08-20-exact-twelve-package-version-set`; package-set SHA-256 `24f0eec8236fba7b0fae6cfb2090b67cb34cfb4d3e412590b72ce000068c513f`; `T-01-SC-APPROVAL` passed. Approval does not imply installation or harness readiness. |
| **Config files** | None — Wave 0 creates ESLint, Storybook, Vitest, Playwright, and Lighthouse configuration |
| **Quick run command** | `cd web && npm run test:contracts` — proposed after Wave 0 |
| **Full suite command** | `cd web && npm run verify:phase1` — locked aggregate command after Wave 0 |
| **Estimated runtime** | Unknown until Wave 0 records the accepted baseline |

---

## Sampling Rate

- **After every task commit:** Run the relevant targeted Vitest, Storybook, or Playwright file plus `npm run lint` and `npm run typecheck`.
- **After every route migration wave:** Run all contract/component tests plus that route's browser, accessibility, visual, and performance subset.
- **After every plan wave:** Run the migrated production build, all completed-route journeys, privacy scan, and rollback smoke.
- **Before `$gsd-verify-work`:** Run `cd web && npm run verify:phase1`; all owner-approved visual and performance manifests must be current.
- **Max feedback latency:** To be measured and locked during Wave 0; no unmeasured number is asserted here.

---

## Per-Task Verification Map

The Phase Threat Definition Ledger below assigns immutable plan/task ownership and exact threat identifiers/commands. Mutable pass/fail evidence is recorded first in one unique fragment per plan and only later in the deterministic Plan 01-20 aggregate; requirement-row implementation results and currently absent test files remain Wave 0 execution gaps.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1/T3 | 01-01 | 1 | COMP-01 | T-01-01, T-01-03 | Protected URLs resolve in both retained variants | contract + E2E | `npm run test:browser -- tests/journeys/public-routes.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01-T1/T3 | 01-01 | 1 | COMP-02 | T-01-01, T-01-03 | Supported bookmarks, queries, filters, and deep links retain meaning | contract + E2E | `npm run test:browser -- tests/journeys/url-state.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01-T1/T3 | 01-01 | 1 | COMP-03 | T-01-01, T-01-03, T-01-04 | Chat validation, streaming, headers, sources, status, and safe errors remain compatible | contract + E2E | `npm run test:contracts -- tests/contracts/api-chat.contract.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | COMP-04 | Private-field disclosure | Anonymous DTOs, DOM, payloads, and artifacts contain allowlisted fields only | unit + DOM + artifact | `npm run test:contracts -- tests/contracts/public-projection.contract.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | COMP-05 | Authorization-state disclosure | Connections remains a read-only public evidence projection | unit + E2E | `npm run test:browser -- tests/journeys/connections.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-01 | — | Migrated components consume repository-owned semantic tokens | schema/lint | `npm run test:unit -- tests/unit/tokens.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-02 | — | Brand-critical wordmark, palette, fonts, depth, and voice remain present | computed style + visual | `npm run test:visual -- --grep @brand` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-03 | Contrast failure | Orange remains one provisional, contrast-approved production token | schema + contrast + visual | `npm run test:unit -- tests/unit/tokens.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-04 | Accessibility denial | All shipped controls are keyboard operable | component + E2E | `npm run test:components && npm run test:browser -- --grep @keyboard` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-05 | — | State vocabulary is distinct without color-only meaning | component | `npm run test:components -- AvailabilityState` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-06 | Accessibility denial | Focus is visible and restored after overlays and navigation | component + E2E | `npm run test:browser -- tests/journeys/focus.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-07 | Accessibility denial | Reduced-motion alternatives apply immediately | E2E media emulation | `npm run test:browser -- tests/journeys/motion.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-08 | Accessibility denial | Workflows reflow at 320, 768, and 1440 without hidden actions or page overflow | parameterized E2E | `npm run test:browser -- tests/journeys/viewports.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-09 | Accessibility denial | Canvas and semantic list expose equivalent meaning | parity + E2E | `npm run test:contracts -- tests/contracts/connections-parity.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DSYS-10 | — | Tokens, primitives, patterns, fixtures, and workflows remain traceable | manifest + component | `npm run test:components && npm run test:unit -- tests/unit/component-trace.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | QUAL-01 | — | Aggregate verifier propagates every child failure | aggregate | `npm run verify:phase1` | ❌ W0 | ⬜ pending |
| 01-01-T1/T2/T3 | 01-01 | 1 | QUAL-02 | T-01-01, T-01-02, T-01-03, T-01-04 | Contract and browser matrices block incompatible changes | contract + E2E | `npm run test:contracts && npm run test:browser` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | QUAL-03 | Accessibility denial | Keyboard, focus, names, live regions, motion, and serious axe checks pass | component + E2E | `npm run test:components && npm run test:a11y` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | QUAL-04 | — | Three-viewport baselines change only with owner approval | visual regression | `npm run test:visual` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | QUAL-05 | Credential/private-data disclosure | Source, bundles, rendered payloads, fixtures, logs, snapshots, and plans pass bounded privacy scans | artifact scan | `npm run test:privacy` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | QUAL-06 | Availability/regression | Route, bundle, RAG, and interaction measurements stay inside owner-approved budgets | performance + contract | `npm run test:performance && npm run test:contracts -- tests/contracts/rag-latency.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---


## Phase Threat Definition Ledger

The plan-local threat registers are canonical. This ledger mirrors every threat for phase-wide enforcement. Exact ASVS references use OWASP ASVS 5.0.0 Level 1 identifiers in the form `v5.0.0-X.Y.Z`.

This table mirrors immutable design-time definitions from each PLAN `<threat_model>`. Definition status remains `defined`; execution never edits PLAN rows or changes this table to `passed`/`failed`. Candidate checks and the final aggregate validate unique IDs, exact ASVS identifier, owner, command, and definition parity here. Mutable execution evidence is written first only to the owning plan fragment under `web/tests/security/phase1-threat-results/`; Plan 01-20 alone materializes `web/tests/security/phase1-threat-results.json` after every fragment passes.

Readiness-token colons inside mirrored command cells are encoded as `&#58;`. Markdown/HTML decoding restores the canonical PLAN command, while raw-document uniqueness probes count only the frontmatter entries.

| Threat ID | Plan | Severity | Likelihood | Impact | ASVS 5.0 L1 | Owning Task | Automated Command | Definition Status |
|---|---|---|---|---|---|---|---|---|
| T-01-01 | 01-01 | high | medium | high | v5.0.0-2.2.1 | Task 1 | node web/scripts/capture-phase1-baseline.mjs --check &amp;&amp; node -e 'const m=require("./web/tests/contracts/phase1-compatibility-manifest.json"); const p=["/","/episodes","/connections","/chat","/api/chat"]; if(p.some(x=&gt;!m.protected_routes.includes(x))) process.exit(1); if(!m.chat_contract?.headers?.includes("X-Sources")) process.exit(1)' | defined |
| T-01-02 | 01-01 | high | medium | high | v5.0.0-15.3.1 | Task 2 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"); if(!s.includes("01-01")\|\|!s.includes("T-01-01")) process.exit(1); if((s.match(/wave_0_complete&#58; false/g)\|\|[]).length!==1\|\|(s.match(/nyquist_compliant&#58; false/g)\|\|[]).length!==1) process.exit(1)' | defined |
| T-01-03 | 01-01 | high | low | high | v5.0.0-2.1.1 | Task 3 | node -e 'const a=require("./web/tests/contracts/phase1-baseline-approval.json"); const m=require("./web/tests/contracts/phase1-compatibility-manifest.json"); if(a.status!=="approved"\|\|!a.manifest_sha256\|\|!a.streaming_contract\|\|a.base_sha!==m.base_sha) process.exit(1)' | defined |
| T-01-04 | 01-01 | high | medium | high | v5.0.0-2.2.1 | Task 3 | node -e 'const a=require("./web/tests/contracts/phase1-baseline-approval.json"); const m=require("./web/tests/contracts/phase1-compatibility-manifest.json"); if(a.status!=="approved"\|\|!a.manifest_sha256\|\|!a.streaming_contract\|\|a.base_sha!==m.base_sha) process.exit(1)' | defined |
| T-01-SC-APPROVAL | 01-02 | high | medium | high | v5.0.0-15.1.1 | Task 1 | node -e 'const a=require("./web/tests/package-legitimacy.json"); if(a.status!=="approved"\|\|a.packages.length!==12\|\|a.packages.some(p=&gt;p.slopcheck!=="unavailable"\|\|p.disposition!=="ASSUMED"\|\|!p.registry_url\|\|!p.source_url)) process.exit(1)' | defined |
| T-01-05 | 01-02 | high | medium | high | v5.0.0-15.1.1 | Task 2 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"); if(!s.includes("01-02")\|\|!s.includes("T-01-SC-APPROVAL")\|\|!s.includes("wave_0_complete&#58; false")\|\|!s.includes("nyquist_compliant&#58; false")) process.exit(1)' | defined |
| T-01-06 | 01-02 | high | low | high | v5.0.0-15.1.1 | Task 2 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"); if(!s.includes("01-02")\|\|!s.includes("T-01-SC-APPROVAL")\|\|!s.includes("wave_0_complete&#58; false")\|\|!s.includes("nyquist_compliant&#58; false")) process.exit(1)' | defined |
| T-01-SC-INSTALL | 01-03 | high | medium | high | v5.0.0-15.1.1 | Task 1 | cd web &amp;&amp; npm ls --depth=0 &amp;&amp; node -e 'const p=require("./package.json"),a=require("./tests/package-legitimacy.json"); for(const x of a.packages){const v=p.dependencies?.[x.name]\|\|p.devDependencies?.[x.name]; if(v!==x.version) process.exit(1)}; if(!p.scripts["verify:phase1"]\|\|Object.values(p.scripts).some(x=&gt;/\bwatch\b/.test(x))) process.exit(1)' | defined |
| T-01-07 | 01-03 | high | low | high | v5.0.0-15.1.1 | Task 2 | cd web &amp;&amp; npm exec playwright -- --version &amp;&amp; npm exec vitest -- --version &amp;&amp; npm exec storybook -- --version &amp;&amp; node -e 'require.resolve("@radix-ui/react-dialog"); require.resolve("@axe-core/playwright"); require.resolve("@lhci/cli");' | defined |
| T-01-08 | 01-03 | high | medium | high | v5.0.0-15.1.1 | Task 2 | cd web &amp;&amp; npm exec playwright -- --version &amp;&amp; npm exec vitest -- --version &amp;&amp; npm exec storybook -- --version &amp;&amp; node -e 'require.resolve("@radix-ui/react-dialog"); require.resolve("@axe-core/playwright"); require.resolve("@lhci/cli");' | defined |
| T-01-09 | 01-04 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:components -- HarnessSmoke &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-10 | 01-04 | high | medium | high | v5.0.0-2.1.1 | Task 3 | cd web &amp;&amp; npm exec playwright -- test --config=playwright.config.ts --list &amp;&amp; node -e 'const c=require("./lighthouserc.cjs"); if(c.ci.collect.numberOfRuns!==5\|\|c.ci.upload.target!=="filesystem") process.exit(1)' | defined |
| T-01-11 | 01-04 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:components -- HarnessSmoke | defined |
| T-01-12 | 01-04 | high | medium | high | v5.0.0-15.2.1 | Task 3 | cd web &amp;&amp; npm exec playwright -- test --config=playwright.config.ts --list &amp;&amp; node -e 'const c=require("./lighthouserc.cjs"); const u=c.ci.collect.url; if(c.ci.collect.numberOfRuns!==5\|\|u.length!==4\|\|c.ci.upload.target!=="filesystem") process.exit(1)' | defined |
| T-01-13 | 01-05 | high | medium | high | v5.0.0-1.2.2 | Task 1 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts | defined |
| T-01-14 | 01-05 | critical | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/public-projection.contract.test.ts tests/contracts/public-routes.contract.test.ts &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-15 | 01-05 | critical | medium | high | v5.0.0-15.3.1 | Task 1 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts | defined |
| T-01-16 | 01-05 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts | defined |
| T-01-17 | 01-05 | high | low | high | v5.0.0-2.1.1 | Task 3 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"); for(const id of ["COMP-01","COMP-02","COMP-03","COMP-04","QUAL-02","QUAL-05"]) {const l=s.split("\n").find(x=&gt;x.includes(`\| ${id} \|`)); if(!l\|\|l.includes("TBD")) process.exit(1)} if(!s.includes("wave_0_complete&#58; false")\|\|!s.includes("nyquist_compliant&#58; false")) process.exit(1)' | defined |
| T-01-18 | 01-06 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; node scripts/capture-phase1-performance.mjs --check &amp;&amp; node -e 'const b=require("./tests/performance/phase1-baseline.json"); for(const r of ["/","/episodes","/connections","/chat"]) if(b.routes[r].runs.length!==5) process.exit(1); if(!b.environment?.chromium\|\|!b.bundle) process.exit(1)' | defined |
| T-01-19 | 01-06 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/rag-latency.test.ts &amp;&amp; node -e 'const p=require("./tests/performance/phase1-budget-proposal.json"); if(p.status!=="pending-owner-approval") process.exit(1); for(const x of Object.values(p.budgets)) for(const k of ["source_samples","observed_max","observed_range","headroom","budget","unit","rationale"]) if(x[k]===undefined) process.exit(1)' | defined |
| T-01-20 | 01-06 | high | medium | high | v5.0.0-2.2.1 | Task 3 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"); if(!s.includes("01-06")\|\|!s.includes("phase1-budget-proposal.json")\|\|!s.includes("pending owner approval")\|\|!s.includes("wave_0_complete&#58; false")) process.exit(1)' | defined |
| T-01-21 | 01-07 | high | low | high | v5.0.0-2.1.1 | Task 1 | node -e 'const b=require("./web/tests/performance/phase1-budgets.json"); if(b.status!=="approved"\|\|!b.owner_approval_ref\|\|!b.baseline_sha256\|\|!b.proposal_sha256) process.exit(1); const required=["home","episodes","connections","chat","bundle","interactions","rag"]; if(required.some(k=&gt;!b.budgets[k])) process.exit(1)' | defined |
| T-01-22 | 01-07 | high | medium | high | v5.0.0-2.2.1 | Task 2 | node -e 'const s=require("fs").readFileSync(".planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md","utf8"),b=require("./web/tests/performance/phase1-budgets.json"); if(!s.includes("01-07")\|\|!s.includes(b.owner_approval_ref)\|\|!s.includes("T-01-21")\|\|!s.includes("nyquist_compliant&#58; false")) process.exit(1)' | defined |
| T-01-23 | 01-08 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; npm run test:unit -- tests/unit/tokens.test.ts | defined |
| T-01-24 | 01-08 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:unit -- tests/unit/tokens.test.ts &amp;&amp; npm run lint &amp;&amp; npm run typecheck &amp;&amp; node scripts/capture-legacy-presentation.mjs --check &amp;&amp; npm run test:browser -- tests/rollback/legacy-presentation.spec.ts | defined |
| T-01-25 | 01-08 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:unit -- tests/unit/tokens.test.ts &amp;&amp; npm run lint &amp;&amp; npm run typecheck &amp;&amp; node scripts/capture-legacy-presentation.mjs --check &amp;&amp; npm run test:browser -- tests/rollback/legacy-presentation.spec.ts | defined |
| T-01-26 | 01-09 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- Phase1Primitives &amp;&amp; npm run typecheck | defined |
| T-01-27 | 01-09 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:components -- Phase1Primitives --grep "availability\|live region" &amp;&amp; npm run typecheck &amp;&amp; npm run lint | defined |
| T-01-28 | 01-09 | high | medium | high | v5.0.0-1.2.2 | Task 1 | cd web &amp;&amp; npm run test:components -- Phase1Primitives --grep "actions\|links\|skip\|focus" &amp;&amp; npm run typecheck &amp;&amp; npm run lint | defined |
| T-01-29 | 01-10 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; npm run typecheck &amp;&amp; node scripts/capture-phase1-baseline.mjs --check | defined |
| T-01-30 | 01-10 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run build &amp;&amp; npm run typecheck | defined |
| T-01-31 | 01-10 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:browser -- tests/rollback/episodes-variant.spec.ts &amp;&amp; node -e 'const fs=require("fs"); if(fs.existsSync("app/episodes/[episodeId]")\|\|fs.existsSync("app/episodes/:id")) process.exit(1)' | defined |
| T-01-32 | 01-23 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; npm run build &amp;&amp; npm run test:browser -- tests/journeys/url-state.spec.ts &amp;&amp; node -e 'const fs=require("fs"); if(fs.existsSync("app/episodes/[episodeId]")\|\|fs.existsSync("app/episodes/:id")) process.exit(1)' | defined |
| T-01-33 | 01-11 | high | medium | high | v5.0.0-15.3.1 | Task 1 | cd web &amp;&amp; npm run test:components -- EpisodesBrowser --grep "drawer\|focus\|invalid\|transcript" &amp;&amp; npm run test:browser -- tests/journeys/url-state.spec.ts --grep "open\|close\|focus" &amp;&amp; npm run test:contracts -- tests/contracts/public-projection.contract.test.ts &amp;&amp; npm run typecheck | defined |
| T-01-34 | 01-11 | critical | medium | high | v5.0.0-1.2.2 | Task 2 | cd web &amp;&amp; npm run test:components -- EpisodesBrowser &amp;&amp; npm run test:browser -- tests/journeys/episodes.spec.ts tests/journeys/focus.spec.ts tests/journeys/motion.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/episodes | defined |
| T-01-35 | 01-11 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:components -- EpisodesBrowser &amp;&amp; npm run test:browser -- tests/journeys/episodes.spec.ts tests/journeys/focus.spec.ts tests/journeys/motion.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/episodes | defined |
| T-01-36 | 01-12 | high | medium | high | v5.0.0-15.3.1 | Task 1 | cd web &amp;&amp; npm run build &amp;&amp; npm run test:contracts -- tests/contracts/public-routes.contract.test.ts | defined |
| T-01-37 | 01-12 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:components -- PublicShell --grep "navigation\|focus\|responsive" &amp;&amp; npm run typecheck &amp;&amp; npm run lint &amp;&amp; node scripts/capture-legacy-presentation.mjs --check | defined |
| T-01-38 | 01-12 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- PublicShell &amp;&amp; npm run test:browser -- tests/journeys/public-shell.spec.ts tests/rollback/legacy-presentation.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/episodes | defined |
| T-01-39 | 01-13 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/connections-public-projection.test.ts &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-40 | 01-13 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/connections-public-projection.test.ts &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-41 | 01-13 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run build &amp;&amp; npm run test:contracts -- tests/contracts/connections-public-projection.test.ts tests/contracts/public-routes.contract.test.ts | defined |
| T-01-42 | 01-14 | high | medium | high | v5.0.0-15.3.1 | Task 1 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/connections-parity.test.ts tests/contracts/connections-public-projection.test.ts | defined |
| T-01-43 | 01-14 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:components -- GraphWithList --grep "selection\|settle\|reduced\|responsive" &amp;&amp; npm run test:contracts -- tests/contracts/connections-parity.test.ts &amp;&amp; npm run typecheck &amp;&amp; npm run lint | defined |
| T-01-44 | 01-14 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- GraphWithList &amp;&amp; npm run test:browser -- tests/journeys/connections.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/connections | defined |
| T-01-45 | 01-15 | critical | medium | high | v5.0.0-1.2.2 | Task 2 | cd web &amp;&amp; npm run test:components -- MigratedChatPage --grep "submit\|IME\|stream\|sources\|error\|focus" &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts tests/contracts/public-projection.contract.test.ts &amp;&amp; npm run typecheck &amp;&amp; npm run lint | defined |
| T-01-46 | 01-15 | critical | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:components -- MigratedChatPage --grep "submit\|IME\|stream\|sources\|error\|focus" &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts tests/contracts/public-projection.contract.test.ts &amp;&amp; npm run typecheck &amp;&amp; npm run lint | defined |
| T-01-47 | 01-15 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- MigratedChatPage &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts tests/contracts/rag-latency.test.ts &amp;&amp; npm run test:browser -- tests/journeys/chat.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/chat | defined |
| T-01-48 | 01-15 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- MigratedChatPage &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts tests/contracts/rag-latency.test.ts &amp;&amp; npm run test:browser -- tests/journeys/chat.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/chat | defined |
| T-01-49 | 01-16 | high | medium | high | v5.0.0-15.3.1 | Task 1 | cd web &amp;&amp; npm run build &amp;&amp; npm run test:contracts -- tests/contracts/public-routes.contract.test.ts tests/contracts/public-projection.contract.test.ts | defined |
| T-01-50 | 01-16 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:components -- MigratedHomePage --grep "CTA\|GuestStrip\|reduced motion\|320" &amp;&amp; npm run typecheck &amp;&amp; npm run lint &amp;&amp; node scripts/capture-legacy-presentation.mjs --check | defined |
| T-01-51 | 01-16 | high | medium | high | v5.0.0-2.2.1 | Task 3 | cd web &amp;&amp; npm run test:components -- MigratedHomePage &amp;&amp; npm run test:browser -- tests/journeys/home.spec.ts tests/journeys/episodes.spec.ts tests/journeys/connections.spec.ts tests/journeys/chat.spec.ts &amp;&amp; npm run test:privacy -- --check &amp;&amp; npm run test:rollback -- --route=/ | defined |
| T-01-52 | 01-17 | high | medium | high | v5.0.0-2.1.1 | Task 3 | cd web &amp;&amp; npm run test:browser -- tests/journeys/public-routes.spec.ts tests/journeys/viewports.spec.ts &amp;&amp; npm run test:unit -- tests/unit/component-trace.test.ts | defined |
| T-01-53 | 01-17 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:a11y &amp;&amp; npm run test:visual -- --candidate | defined |
| T-01-54 | 01-17 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:a11y &amp;&amp; npm run test:visual -- --candidate | defined |
| T-01-55 | 01-18 | high | low | high | v5.0.0-2.1.1 | Task 2 | cd web &amp;&amp; node scripts/verify-phase1.mjs --self-test &amp;&amp; node scripts/verify-phase1.mjs --self-test-threat-ledger | defined |
| T-01-56 | 01-18 | high | medium | high | v5.0.0-15.3.1 | Task 3 | cd web &amp;&amp; npm run verify:phase1 -- --candidate &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-57 | 01-18 | high | medium | high | v5.0.0-2.2.1 | Task 1 | cd web &amp;&amp; npm run test:rollback | defined |
| T-01-58 | 01-19 | high | medium | high | v5.0.0-2.1.1 | Task 1 | cd web &amp;&amp; npm run verify:phase1 -- --candidate &amp;&amp; npm run test:privacy -- --check &amp;&amp; node scripts/verify-phase1.mjs --check-validation-waves | defined |
| T-01-59 | 01-19 | high | low | high | v5.0.0-2.1.1 | Task 2 | node -e 'const a=require("./web/tests/visual/phase1-approval.json"),c=require("./web/tests/visual/phase1-candidate.json"); if(a.status!=="approved"\|\|a.candidate_sha256!==c.sha256\|\|!a.owner_approval_ref\|\|a.cutover_authorized!==true\|\|a.rollback_approved!==true) process.exit(1)' | defined |
| T-01-60 | 01-19 | high | medium | high | v5.0.0-15.3.1 | Task 2 | node -e 'const a=require("./web/tests/visual/phase1-approval.json"),c=require("./web/tests/visual/phase1-candidate.json"); if(a.status!=="approved"\|\|a.candidate_sha256!==c.sha256\|\|!a.owner_approval_ref\|\|a.cutover_authorized!==true\|\|a.rollback_approved!==true) process.exit(1)' | defined |
| T-01-61 | 01-20 | high | low | high | v5.0.0-2.1.1 | Task 1 | cd web &amp;&amp; npm run test:visual &amp;&amp; npm run test:rollback &amp;&amp; node -e 'const fs=require("fs"); if(fs.existsSync("app/episodes/[episodeId]")\|\|fs.existsSync("app/episodes/:id")) process.exit(1)' | defined |
| T-01-62 | 01-20 | critical | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:contracts -- tests/contracts/api-chat.contract.test.ts tests/contracts/public-projection.contract.test.ts &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-63 | 01-20 | high | medium | high | v5.0.0-2.2.1 | Task 2 | cd web &amp;&amp; npm run test:browser -- tests/journeys/public-routes.spec.ts tests/journeys/viewports.spec.ts &amp;&amp; npm run test:a11y &amp;&amp; npm run test:performance &amp;&amp; npm run test:rollback | defined |
| T-01-64 | 01-20 | high | medium | high | v5.0.0-2.1.1 | Task 2 | cd web &amp;&amp; node scripts/verify-phase1.mjs --self-test-threat-ledger --case=final-task-ordering | defined |
| T-01-65 | 01-21 | high | medium | high | v5.0.0-2.1.1 | Task 1 | cd web &amp;&amp; node scripts/capture-legacy-presentation.mjs --check | defined |
| T-01-66 | 01-21 | high | medium | high | v5.0.0-15.3.1 | Task 2 | cd web &amp;&amp; npm run test:browser -- tests/rollback/legacy-presentation.spec.ts &amp;&amp; npm run test:privacy -- --check | defined |
| T-01-67 | 01-21 | high | low | high | v5.0.0-2.1.1 | Task 3 | node -e 'const m=require("./web/tests/visual/legacy/phase1-legacy-baseline.manifest.json"); if(m.status!=="approved"\|\|!m.owner_approval_ref\|\|!m.dependency_graph_sha256\|\|!["320","768","1440"].every(x=&gt;m.coverage?.includes(x))) process.exit(1)' | defined |
| T-01-68 | 01-22 | high | medium | high | v5.0.0-2.1.1 | Task 3 | cd web &amp;&amp; node scripts/capture-legacy-presentation.mjs --check &amp;&amp; npm run test:browser -- tests/rollback/legacy-presentation.spec.ts | defined |
| T-01-69 | 01-22 | high | medium | high | v5.0.0-3.2.2 | Task 3 | cd web &amp;&amp; npm run test:browser -- tests/journeys/brand-motion.spec.ts | defined |
| T-01-70 | 01-22 | high | low | high | v5.0.0-15.3.1 | Task 3 | cd web &amp;&amp; npm run test:privacy -- --check | defined |

### Threat Execution Result Fragments and Final Ledger

Each threat-running plan owns exactly one fragment: `web/tests/security/phase1-threat-results/01-XX.json`. No two plans write the same fragment, and no implementation task directly edits the aggregate. Every fragment has top-level `{ schema_version, plan, results }`; `results` is keyed by threat ID and each value contains exactly `plan`, `task`, `command_id`, `command`, `exit_status`, bounded digest-based `evidence`, ISO-8601 `completed_at`, and `status` (`passed` or `failed`). The runner records a failed command before returning its nonzero code and atomically updates only the owning fragment through same-directory temporary-file rename.

Fragments and the aggregate must never contain credentials, secret values, raw stdout/stderr, environment values, request or prompt bodies, private fixtures/payloads, raw user/query/title/source content, machine-local paths, or any unrecognized payload field. The deterministic merger rejects schema mismatches, unknown plans, absent expected fragments/IDs, duplicate or extra IDs, owner/task/command drift, future timestamps, and every non-passing high/critical entry. Definition rows remain `defined` forever; no executor writes result state into PLAN files or this definition table.

Candidate aggregation is fail-closed but completion-aware:

- Plan 01-18 Task 3 check-merges in memory only the literal completed fragment set for Plans 01-01 through 01-17 and 01-21 through 01-23. It does not read the partial current 01-18 fragment; the exact current/future exemption list is T-01-55 through T-01-64. After candidate succeeds, the runner adds T-01-56 only to 01-18.json.
- Plan 01-19 Task 1 check-merges the literal completed set through Plan 01-18 plus completed dependency Plans 01-21 through 01-23. It exempts only current/future T-01-58 through T-01-64; after candidate and wave parity succeed, the runner adds T-01-58 only to 01-19.json.
- Candidate mode reads no nonexistent future fragment, writes no aggregate, rejects a missing/failed completed-plan entry, inferred/range exemption, exempt completed threat, future-plan requirement, or exemption outside the literal lists, and remains review evidence rather than a passing phase gate.

Final aggregation has no exemption and no circular precondition. Plan 01-20 Task 1 records T-01-61 in 01-20.json. Task 2 first executes focused T-01-62, T-01-63, and T-01-64 and atomically updates that same fragment. Only then does the single final owner merge the literal 23-fragment set in natural plan/threat-ID order into `web/tests/security/phase1-threat-results.json`, requiring exact parity and `passed` results for all 72 definitions. The unqualified `cd web && npm run verify:phase1` reads that finished aggregate, never invokes the runner or merger, and has no exemptions or self-reference. Final status, `wave_0_complete: true`, and `nyquist_compliant: true` are written only after that command exits zero.

### Requirement-to-Threat Planning Map

| Requirement | Planned Threat References |
|---|---|
| COMP-01 | T-01-01, T-01-29, T-01-31, T-01-41, T-01-57, T-01-64, T-01-65 |
| COMP-02 | T-01-01, T-01-32, T-01-37, T-01-50 |
| COMP-03 | T-01-13..T-01-17, T-01-20, T-01-45..T-01-48, T-01-62, T-01-63 |
| COMP-04 | T-01-14, T-01-27, T-01-33, T-01-39, T-01-42, T-01-46, T-01-49, T-01-62 |
| COMP-05 | T-01-39..T-01-44 |
| DSYS-01 | T-01-23, T-01-68 |
| DSYS-02 | T-01-23, T-01-25, T-01-68 |
| DSYS-03 | T-01-23, T-01-25 |
| DSYS-04 | T-01-24, T-01-26, T-01-35, T-01-38, T-01-44, T-01-48, T-01-51, T-01-54, T-01-69 |
| DSYS-05 | T-01-25, T-01-27 |
| DSYS-06 | T-01-24, T-01-26, T-01-35, T-01-38, T-01-48, T-01-51, T-01-54, T-01-69 |
| DSYS-07 | T-01-24, T-01-35, T-01-38, T-01-44, T-01-48, T-01-51, T-01-54, T-01-69 |
| DSYS-08 | T-01-24, T-01-35, T-01-38, T-01-44, T-01-48, T-01-51, T-01-54, T-01-69 |
| DSYS-09 | T-01-42..T-01-44 |
| DSYS-10 | T-01-52, T-01-68..T-01-70 |
| QUAL-01 | T-01-SC-APPROVAL, T-01-SC-INSTALL, T-01-05..T-01-12, T-01-55 |
| QUAL-02 | T-01-01..T-01-04, T-01-29..T-01-31, T-01-37, T-01-41, T-01-45..T-01-48, T-01-50, T-01-57, T-01-64..T-01-67 |
| QUAL-03 | T-01-24, T-01-26, T-01-35, T-01-38, T-01-44, T-01-48, T-01-51, T-01-54, T-01-69 |
| QUAL-04 | T-01-10, T-01-18, T-01-21, T-01-23, T-01-52, T-01-53, T-01-58, T-01-65..T-01-69 |
| QUAL-05 | T-01-02, T-01-08, T-01-09, T-01-14, T-01-15, T-01-19, T-01-27, T-01-30, T-01-33, T-01-36, T-01-39, T-01-42, T-01-46, T-01-49, T-01-53, T-01-56, T-01-60, T-01-62, T-01-66, T-01-70 |
| QUAL-06 | T-01-18..T-01-22, T-01-44, T-01-47, T-01-51, T-01-57, T-01-63 |

## Wave 0 Requirements

- [x] Add `web/tests/contracts/phase1-compatibility-manifest.json` from the bounded current dirty-worktree capture without reverting unrelated changes.
- [ ] Add owner-approved `web/tests/contracts/phase1-baseline-approval.json` bound to the manifest and protected-file hashes.
- [x] Record Plan `01-02`, Wave 2 package approval in `web/tests/package-legitimacy.json`, bound to approval `owner-explicit-approval-2026-08-20-exact-twelve-package-version-set`, package-set SHA-256 `24f0eec8236fba7b0fae6cfb2090b67cb34cfb4d3e412590b72ce000068c513f`, and passing `T-01-SC-APPROVAL`; installation and harness readiness remain pending.
- [ ] Pause at a human package-legitimacy checkpoint before installing the exact proposed packages and Chromium.
- [ ] Add `web/eslint.config.mjs` and direct ESLint 9 scripts.
- [ ] Add `web/.storybook/main.ts`, `web/.storybook/preview.ts`, deterministic fixture decorators, a11y error mode, and one smoke story.
- [ ] Add `web/vitest.config.ts` with separate unit, contracts, and Storybook projects.
- [ ] Add `web/playwright.config.ts` with a production-like server, pinned Chromium, stable snapshot paths, and 320/768/1440 coverage.
- [ ] Add `web/tests/support/rag-stub.mjs` and the complete `/api/chat` compatibility matrix.
- [ ] Add route/DTO compatibility manifests and public forbidden-field fixtures.
- [ ] Add `web/lighthouserc.cjs`, a baseline capture script, and a versioned baseline artifact; pause for owner approval before numeric budgets are written.
- [ ] Add a bounded privacy scanner for source and generated artifacts.
- [ ] Add `web/scripts/verify-phase1.mjs` and CI invoking `npm run verify:phase1`.
- [ ] Ignore generated Storybook, coverage, browser, and Lighthouse output while retaining approved screenshots and manifests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approve visual baseline replacements | DSYS-02, DSYS-03, QUAL-04 | Pixel diffs cannot approve WTF identity, editorial quality, or the provisional production token | Review deterministic 320/768/1440 captures and the approval manifest; record owner approval before replacement hashes become authoritative. |
| Approve numeric performance budgets | QUAL-06 | D-15 forbids invented thresholds before repository measurement | Review five-run legacy baseline, route/bundle/RAG/interaction measurements, and environment metadata; approve exact values before migration begins. |
| Confirm authoritative compatibility baseline | COMP-01, COMP-02, COMP-03 | The protected API/UI baseline includes existing uncommitted work and cannot be inferred safely | Review the captured contract manifest against the intended current behavior; approve the source authority without reverting or staging unrelated work. |
| Confirm rollback restores the prior public experience | COMP-01, D-12, D-16 | Automated dual-build smoke proves mechanics but final cutover authorization remains an owner decision | Run the documented rollback rehearsal, inspect all protected routes and `/api/chat`, and record approval without changing data or external services. |

---

## Validation Sign-Off

- [ ] Every planned task has an `<automated>` verification or an explicit Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive implementation tasks lack automated verification.
- [ ] Wave 0 covers every missing test/config reference above.
- [ ] No watch-mode flags appear in blocking commands.
- [ ] Feedback latency is measured and accepted after Wave 0.
- [ ] Security threat references are replaced with final plan threat identifiers.
- [ ] Task, plan, and wave identifiers are populated after planning.
- [ ] `wave_0_complete: true` is set only after the harness exists and passes.
- [ ] `nyquist_compliant: true` is set only after every sign-off item is satisfied.

**Approval:** pending

# Session note · git-state backlog after 2026-08-27 cleanup

**Written:** 2026-08-27
**For:** whoever picks up the working tree next (owner or future session)
**Purpose:** categorize the ~120 files that were dirty in the working tree
at the end of the 2026-08-27 cleanup session, so each cluster can be
turned into its own clean PR through `scripts/session-pr.sh` without
context-switching to figure out what belongs together.
**Status:** informational, not a decision

---

## What the 2026-08-27 session already shipped

- Pushed 61 previously-unpushed commits from local `main` to `origin/main`.
- `chore(gitignore)` commit adding `.wrangler/`, `.superset/`,
  `.planning/STATE.md.bak-*` to ignore rules.
- [PR #7 — planning inputs snapshot + draft owner questions](https://github.com/Sheshiyer/wtfmedia/pull/7)
  (`.planning/inputs/podcast-catalog/` + `.planning/inputs/client-questions/`).
- [PR #8 — reusable session-PR workflow scaffold](https://github.com/Sheshiyer/wtfmedia/pull/8)
  (`scripts/session-pr.sh`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `docs/session-pr-workflow.md`).
- [PR #9 — this backlog note].

Nothing else was committed. Every path listed below is still in the
working tree as of session end, untouched.

## Highest-value follow-up (do this first)

**`wtf/wtf-os-shell-materialize` — makes `main` buildable from a fresh clone.**

The commit at `5dc06fc` ("refactor: make WTF OS the default app version")
switches the default UI variant to `wtfos`, but the shell files it depends
on are still untracked. A fresh clone will not build `main`. That is the
single most important gap to close.

Files to include on this branch:

- `web/components/shells/` (entire directory)
- `web/components/patterns/StatusLedger.tsx`
- `web/components/patterns/WorkspaceHeader.tsx`
- `web/components/patterns/GraphWithList.tsx` and `.stories.tsx`
- `web/components/domain/public/MigratedHomePage.tsx`
- `web/components/domain/public/MigratedChatPage.tsx`
- `web/components/domain/public/MigratedGuestStrip.tsx`
- `web/components/domain/public/ConversationThread.tsx`
- `web/components/domain/public/SourcePanel.tsx`
- `web/components/domain/public/AskComposer.tsx`
- `web/components/legacy/public/LegacyHomePage.tsx` (rollback variant)
- `web/components/legacy/public/LegacyChatPage.tsx` (rollback variant)
- Stories: `AppShell.stories.tsx`, `StatusLedger.stories.tsx`,
  `WorkspaceHeader.stories.tsx`, `MigratedHomePage.stories.tsx`,
  `MigratedChatPage.stories.tsx`, `WorkspaceRoutes.stories.tsx`,
  `ControlRoomStatusLedger.stories.tsx`
- The `M` companions the shell requires:
  `web/app/page.tsx`, `web/app/chat/page.tsx`,
  `web/components/patterns/PublicShell.tsx`,
  `web/components/domain/public/{MigratedConnectionsPage,MigratedEpisodesPage,EpisodesContent,EpisodeDrawer}.tsx`,
  `web/components/legacy/public/LegacyEpisodesPage.tsx`
- Deletes made obsolete by the shell pivot:
  `web/components/PaintCanvas.tsx`, `web/components/Presence.tsx`

Verification once staged: `npm --prefix web run typecheck && npm --prefix web run build`.

## Suggested follow-up branches, ranked by isolation

Each row is a candidate `--slug` for `scripts/session-pr.sh`. Numbers are
approximate file counts observed at session end.

| Slug | Concern | Files | Notes |
|---|---|---:|---|
| `wtf-os-shell-materialize` | Shell code (see above) | ~28 | Blocks fresh-clone build. Highest priority. |
| `test-infrastructure-2026-08` | New test suites | ~14 | `web/tests/accessibility/`, `journeys/{chat,connections,home,viewports,debug-wordmark}.spec.ts`, `rollback/{chat,connections,home}-variant.spec.ts`, `visual/`, `contracts/{connections-parity,wtf-os-token-contract}.test.ts`. Some depend on shell branch. |
| `phase1-threat-evidence` | Threat harness output | ~19 | `web/tests/security/phase1-threat-{results,corrections}/*.json`, `web/scripts/{lib/,merge-,verify-}phase1-*`, `.planning/phases/01-*/*-SUMMARY.md` (11), modified `01-09-PLAN.md` + `01-VALIDATION.md`. Self-contained planning + evidence. |
| `cloudflare-infra-docs` | Infra reference | 4 | `cloudflare/wrangler.jsonc` (safe to commit — resource bindings only, no secrets), `docs/CLOUDFLARE-INFRASTRUCTURE.md`, `docs/CLOUDFLARE-MIGRATION-PLAN.md`, `wtfmedia-cloudflare-architecture.html`. |
| `catalogue-data-refresh` | Runtime data updates | 6 | Modified: `web/src/data/{episodes,connections,vectors}.json`, `web/public/transcripts/QdWHGjReLUo.json`. New: `web/src/data/corpus-manifest.json`, `web/public/transcripts/RSB58m7Xwhg.{json,txt}`, `WMRO9dvD5T0.txt`. **Diff first: `episodes.json` alone is ~233 lines changed.** Verify no protected-hash regression. |
| `ingestion-scripts` | Python + node ingestion | 5 | Modified: `scripts/build_{connections,timestamped}.py`. New: `scripts/{build_provenance_manifest,evaluate_production_rag,queue_cloudflare_ingest}.mjs`. |
| `repo-chrome-cleanup` | Small config/doc/plan tweaks | ~25 | The pile of small M files across `README.md`, `AGENTS.md`, `.planning/{REQUIREMENTS.md,config.json}`, `.project/HANDOFF.md`, `web/package.json`, storybook/tailwind/playwright/lighthouse configs, `.github/workflows/phase1.yml`, `CHANGELOG.md`, `video/.gitignore`, `web/.gitignore`, UI primitive tweaks (`Button.tsx`, `Drawer.tsx`, `IconButton.tsx`, `LinkButton.tsx`, `SkipLink.tsx`, `ScrollRail.tsx`), `web/lib/{models,nvidia,public/contracts,public/url-state}.ts`, `web/app/api/chat/route.ts`, deletes `web/app/api/crew/route.ts`, `web/components/{ConnectionGraph,EpisodesBrowser}.tsx`, ops workspaces `web/components/domain/ops/*.tsx`, `web/app/(operator)/ops/page.tsx`. **Consider splitting further — one branch per concern.** |

## Files that were flagged but should not ship

- `web/.lighthouseci/` — CI local artifacts. Should be gitignored, not
  committed. Add `web/.lighthouseci/` to `web/.gitignore` on the
  `repo-chrome-cleanup` branch.
- `tests/` (root) — an empty or stray directory. Inspect; likely delete.

## What the safety pattern already prevented

- No `.wrangler/`, `.superset/`, or `.planning/STATE.md.bak-*` ever hit
  the index (gitignore covered them mid-session).
- No `.env`, `.vercel/`, or `cloudflare/.wrangler/` was ever staged
  (existing gitignore).
- Every commit that landed today staged specific paths only. No `git add
  .` was used.

## Using the workflow going forward

Once [PR #8](https://github.com/Sheshiyer/wtfmedia/pull/8) merges,
`scripts/session-pr.sh` is available on `main`. To pick up a category
above, from a clean `main` checkout:

```bash
git switch main && git pull --ff-only
scripts/session-pr.sh \
  --slug wtf-os-shell-materialize \
  --title "feat(shell): materialize WTF OS shell code" \
  --paths \
    web/components/shells \
    web/components/patterns/StatusLedger.tsx \
    web/components/patterns/WorkspaceHeader.tsx \
    web/components/patterns/GraphWithList.tsx \
    web/components/patterns/GraphWithList.stories.tsx \
    web/components/domain/public/MigratedHomePage.tsx \
    web/components/domain/public/MigratedChatPage.tsx \
    ... (etc)
```

The script refuses to run if the tree also carries unrelated dirty files
unless you pass `--allow-dirty`. Since the tree is going to stay dirty
across multiple follow-ups, `--allow-dirty` is expected for each of
these branches — but pass it deliberately, not habitually.

## What still needs owner input

See the three drafts in this same folder — none of them have been
answered yet:

- `2026-08-27-plan-02-12-staging-authorization.md`
- `2026-08-27-ip-taxonomy-reconciliation.md`
- `2026-08-27-editorial-evaluation-set.md`

And the shell-refinement scope pick (A + B + D chosen 2026-08-27, no
code shipped for it yet):

- `2026-08-27-shell-refinement-scope.md`

---
*Informational only. This file does not authorize any of the follow-up
branches above; each one still requires the caller to inspect diffs and
verify.*

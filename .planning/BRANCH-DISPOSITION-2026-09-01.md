# Branch and worktree disposition — 2026-09-01

Status: local reconciliation record. This is additive to the existing GSD
roadmap and the `03-00` release-safe integration gate. It does not activate
`03-01`–`03-06`, merge feature code, push branches, or change production.

## Decision rules

- `keep` means retain the branch as an authority, release receipt, or
  host-managed reference. It is not permission to merge it.
- `selectively integrate` means inspect individual commits/files against
  `origin/main` and the `03-00` gate. Do not cherry-pick the branch wholesale.
- `retire` means remove it from the active worktree set. The branch ref stays
  recoverable until a separate branch-deletion decision is made.
- A clean worktree is removable only when its exact path is listed in the
  cleanup section below. Dirty state always wins over disposition.

## Branch map

| Branch | Disposition | Worktree status | Phase-aligned reason |
|---|---|---|---|
| `codex/docs-workflows` | keep | root checkout | Current planning authority and additive `03-00` record. |
| `main` | keep | no worktree | Local historical/default reference; preserve for comparison. |
| `Sheshiyer/wild-fukuiraptor` | keep | host-managed | Superset-managed worktree; untouched by this cleanup. |
| `codex/release-0.3.2-alpha.1` | keep | no worktree | Release-preparation evidence for the already deployed baseline. |
| `codex/v0.3.1-alpha` | keep | no worktree | Release-settings architecture receipt; evidence only. |
| `codex/release-episode-scope-receipt` | keep | `.worktrees/release-episode-scope-receipt` | Production receipt and rollback evidence; not a merge source. |
| `codex/handoff-v0.1.4` | keep | `.worktrees/handoff-0.1.4` | Historical handoff evidence retained for continuity. |
| `codex/receipt-v0.2.0` | keep | `.worktrees/receipt-v0.2.0` | Historical production receipt retained for comparison. |
| `codex/wtfmedia-backend-reconciliation` | selectively integrate | sibling worktree | Overlaps source-mode, ingest, and API contracts; inspect by file/commit. |
| `codex/wtfmedia-dual-source-chat` | selectively integrate | sibling worktree | Candidate dual-source behavior; must preserve published-only default. |
| `codex/wtfmedia-ui-wave1` | selectively integrate | sibling worktree | UI wave candidate; integrate only contract-preserving slices. |
| `codex/uncut-alignment-citations` | selectively integrate | sibling worktree | Alignment/citation candidate; blocked until authoritative mapping exists. |
| `codex/episode-retrieval-contracts` | selectively integrate | `.worktrees/episode-retrieval-contracts` | Focused proof fixture candidate for the low-risk Wave 1 gate. |
| `codex/ui-theme-fix` | selectively integrate | `.worktrees/ui-theme-fix` | Narrow semantic contrast candidate after baseline checks. |
| `codex/cloudflare-web-migration` | selectively integrate | sibling worktree | Deployment evidence only; no production action in this cleanup. |
| `codex/wtfmedia-release-integration` | selectively integrate | sibling worktree | Source-mode fallback candidate; reconcile with the single backend contract. |
| `codex/wtfos-bounded-flow-release` | selectively integrate | no worktree | Bounded UI flow candidate; compare against shipped public contracts. |
| `codex/wtfos-ui-copy-consolidation` | selectively integrate | sibling worktree | UI copy candidate; branch tracks a deleted remote and is not authoritative. |
| `codex/ask-wtf-edge-backend` | selectively integrate | `.worktrees/ask-wtf-edge-backend` | Episode-scoped retrieval candidate; preserve existing API shape. |
| `codex/ask-wtf-source-drawer-hotfix` | selectively integrate | `.worktrees/ask-wtf-source-drawer-hotfix` | Source drawer candidate; verify citation and navigation contracts. |
| `codex/both-source-balance` | selectively integrate | `.worktrees/both-source-balance` | Both-mode candidate; gated by provenance and evaluation evidence. |
| `codex/episode-vector-id-hotfix` | selectively integrate | `.worktrees/episode-vector-id-hotfix` | Narrow vector-ID repair candidate; no broad queue replay. |
| `codex/release-episode-scope` | selectively integrate | `.worktrees/release-episode-scope` | Provenance behavior candidate; compare with the recorded receipt. |
| `codex/ask-wtf-cloudflare-fallbacks` | selectively integrate | no worktree | Fallback candidate; reconcile with one governed source-mode contract. |
| `codex/uncut-source-asset-guard` | selectively integrate | no worktree | Ingest guard candidate; retain fail-closed `source_asset_unavailable`. |
| `codex/root-cleanup-uncut-ingest-receipts` | selectively integrate | no worktree | Parallel ingest-guard candidate; compare, do not merge both wholesale. |
| `codex/frameio-episode-fallback` | selectively integrate | no worktree | Episode-link fallback candidate; validate provenance before adoption. |
| `codex/v0.3.0-alpha.1` | retire | `.worktrees/wtfmedia-alpha` | Superseded alpha release worktree; branch ref retained. |
| `codex/v0.3.0-alpha.1-release-fix` | retire | nested alpha worktree | Duplicate historical release-fix worktree; branch ref retained. |
| `codex/release-0.1.4` | retire | `.worktrees/release-0.1.4` | Superseded release worktree; no current Phase 3 authority. |
| `codex/release-v0.2.0` | retire | `.worktrees/release-v0.2.0` | Duplicate historical release worktree; branch ref retained. |
| `pr-28` | retire | `.worktrees/pr-28` | Historical PR snapshot; no active roadmap dependency. |
| `pr-36` | retire | `.worktrees/pr-36` | Duplicate historical PR snapshot; no active roadmap dependency. |

## Exact cleanup set

The following paths were reviewed as clean repository-owned worktrees. Their
branch refs remain intact after removal:

- system-temporary worktree `wtfmedia-release-safe-fleet`
- system-temporary worktree `wtfmedia-release-safe-fleet-spark`
- `.worktrees/pr-28`
- `.worktrees/pr-36`
- `.worktrees/release-0.1.4`
- `.worktrees/release-v0.2.0`
- `.worktrees/wtfmedia-alpha/.worktrees/wtfmedia-alpha-release-fix`
- `.worktrees/wtfmedia-alpha`

No sibling WIP worktree, `.worktrees` feature worktree, host-managed
worktree, or user-owned source drop is in this removal set.

## Post-cleanup rule

The next implementation action remains the `03-00` compatibility gate. Only
after a candidate passes contract, privacy, test, release-channel, and
rollback checks may a small commit or file set advance into `03-01`–`03-06`.

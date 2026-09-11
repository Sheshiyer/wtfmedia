# Agent operating contract

This repository is `wtfmedia`.

1. Read `README.md`, `PROJECT.md`, `.project/HANDOFF.md`, and
   `docs/AGENT-ONBOARDING.md` before starting work.
2. Treat the Thoughtseed Labs vault as referenced knowledge, never as a
   runtime dependency or a place to copy private notes, transcripts, or
   seed corpora.
3. Preserve the existing tooling and deployment boundaries. Use the
   commands declared in `PROJECT.md` and keep generated output ignored.
4. Keep changes scoped to this repository. Do not edit vault registries,
   native client stores, Paseo, OmniRoute configuration, provider
   credentials, or external deployment state without a separate
   owner-approved task.
5. Never add secrets, `.env` material, native session identifiers, prompt
   or response bodies, or machine-local absolute checkout paths.
6. Record a bounded checkpoint in `.project/HANDOFF.md` when a reviewed
   change is ready for another client to pick up.

## Current project facts for agents

- WTF OS and Ask WTF are the product center. Ask WTF must answer from retrieved
  transcript evidence or fall back truthfully; never claim the model cannot
  hallucinate.
- Production domain: `https://wtfhq.in`.
- Production chat contract: browser/web calls `/api/chat` with
  `messages: [{ role, content }]` and `sourceMode` of `published`, `uncut`, or
  `both`. The response body is streamed/plain text; source metadata is exposed
  through `X-Sources` and fallback state through `X-Fallback`.
- Cloudflare target resources are `wtfmedia-edge`, `wtfmedia-web`,
  `wtfmedia-catalogue`, `WTFMEDIA_STATE`, `wtfmedia-catalogue-v1`,
  `wtfmedia-ops`, `wtfmedia-ingest`, and `wtfmedia-ingest-dlq`.
- Current approved corpus receipt: 55 published transcript assets, 49 approved
  mapped uncut text assets, 55/55 published plus 49/49 uncut KV receipts, and
  11,948 Vectorize records indexed by `source_mode` and `video_id`. D1 verifies
  all 49 mapped uncut assets; mapping is not trusted timeline alignment.
- Deferred sheet exceptions stay out of "fully ingested" claims:
  `WTF is a Battery?`, `WEF - Economics`, `The Foundery`, and the
  `Brain Armstrong` transcript-row mismatch.
- The latest ingest hardening requires a declared available D1 source asset and
  backing R2 object before vector staging. If that receipt is missing, fail
  closed as `source_asset_unavailable`.

## Beta single-shell contract

- `/beta` is the authenticated principal landing: members use `/beta/chat` and
  operators use `/beta/workspace` for the control room. Both admitted
  principal kinds may use `/beta/chat`; it renders their role-safe,
  owner-scoped history within the same Beta gate/AppShell, not a second chat
  shell. Canonical Beta Settings are nested below `/beta/settings/*`;
  administrator routes are `/beta/admin/*`.
- The edge principal and capability policy are the only authorization
  authority. Clerk establishes identity; D1 resolves member/operator lifecycle
  and authority. Any operator record takes precedence, an inactive operator
  denies, and profile mirrors, browser role arrays, or navigation visibility
  never grant access.
- `/beta/ops/*` is redirect compatibility only. Keep `/ops/*` and public
  `/chat` as legacy Alpha routes. Do not add a Beta `public_link` fallback or
  render protected content before edge principal admission.
- Member and operator stores remain separate and owner-scoped. Conversation
  routes may expose only the established prefixed UUID; never put Clerk
  subjects, user hashes, D1 owner identifiers, prompts, answers, or session
  identifiers into URLs, browser DTOs, logs, handoffs, or planning artifacts.
- Archive retains a private conversation. Permanent Delete is separately
  confirmed, owner-scoped, privacy-audited, and must not erase separately saved
  preferences or corpus data. Replayed idempotency keys must not resurrect it.
- Capability-projected nested Settings must be matched by server page/API
  enforcement. AI Route and YouTube Analytics are non-persisted local previews
  until separately approved provider integrations exist; do not imply writes,
  provider configuration, or inference effects.
- Local tests do not replace the real staging matrix. Before claiming Beta
  acceptance, use the Codex in-app browser against an owner-authorized staging
  build for signed-out, two-member, suspended/revoked, editor, admin, and
  super-admin personas at desktop and mobile viewports.
- Before staging or production work, use
  `docs/releases/beta-0.1-cloudflare-promotion-map.md` to distinguish web
  `ASSETS`, catalogue R2 objects, D1 authority, derived Vectorize/KV state,
  queues, outstanding migrations, deployed versions, and traffic evidence.

## Beta 0.1 release-evidence boundary

- The host-visible Beta integration is local merge `d3b4590` with parents
  `d4e45b4` and `7ec8298`. The user-reported `3eebf57` object is unavailable in
  this checkout. Neither identity is a deployment claim.
- Treat local test/build results as `VERIFIED-SOURCE` and unreceipted runtime or
  D1 statements as `REPORTED`. Neither can be upgraded into staging or
  production acceptance by narration, reachability, a branch name, or a moving
  worktree.
- Before requesting staging, commit the post-merge runtime and
  release/migration source fixes, select one exact candidate SHA, rerun its
  source checks, and follow
  `.planning/inputs/2026-09-11-beta-0.1-production-readiness-checklist.md` for
  backup/migration, paired bindings, real Clerk/D1 IAB personas, and viewports.
- Production is a distinct owner-authorized operation: it needs production
  Clerk configuration, D1 backup/migration, exact edge/web/domain/traffic,
  smoke, and rollback receipts for that same candidate. Do not reuse staging
  receipts or reported D1 activity.
- Provider/YouTube persistence, scheduled jobs, long-context compaction, and
  full Alpha alignment remain intentionally deferred from the Beta 0.1 exit
  decision. Keep their status honest and do not add implied persistence or
  automation while closing a release gate.

## Beta environment hostname contract

- `https://wtfhq.in` remains public Alpha/current production on
  `wtfmedia-web` → `wtfmedia-edge` until a separately authorized promotion.
- `https://beta-staging.wtfhq.in` is the assigned staging acceptance hostname.
  Attach it as a Custom Domain only to `wtfmedia-web-staging`, which must bind
  only to `wtfmedia-edge-staging` and the staging Clerk/data plane.
- `https://beta.wtfhq.in` is the assigned production-Beta/client-handoff
  hostname. It requires a dedicated `wtfmedia-web-beta` →
  `wtfmedia-edge-beta` compute pair, explicit production bindings, and no
  duplicate production ingest consumer.
- The web Worker is the public ingress; do not expose the edge Worker as the
  client URL. Environment-specific `workers.dev` URLs are diagnostics only and
  never prove Custom Domain, certificate, binding, revision, or auth identity.
- The root of each Beta hostname must resolve or redirect canonically to
  `/beta`. Keep authentication/session cookies host-only so Alpha, staging,
  and production-Beta sessions cannot mix across `*.wtfhq.in`.
- A hostname is not live because it is written here. Require DNS/Custom Domain
  activation, certificate, exact web/edge versions, service binding, Clerk
  authorized-party/redirect presence, real IAB personas, smoke, and rollback
  receipts before calling the environment ready for client handoff.
- Current staging runtime receipt: source `abb5413`, edge version
  `3b4aa27f-6c62-4077-a432-897f10002039`, web version
  `00cfe1b4-161e-4c86-addf-dd3894085d3d`. This closes deployment mapping only;
  authenticated IAB personas, host-only cookies, viewports, and rollback remain
  release gates. Production Beta remains untouched.

## Pavun/Beta integration precedence

- "Latest Beta" is a layered source description, never a branch alias. Read
  `.planning/inputs/2026-09-11-beta-0.3-lineage-and-surface-authority-audit.md`
  before changing Beta chat, routing, or release metadata. In particular,
  `v0.3.3-beta.2`, `release/beta`, `beta_0.1`, the Pavun57 RAG branch, and the
  staging candidate are distinct objects.

- The owner's shorthand `pavun` maps to repository submitter `Pavun57`, who
  authored PR #48 (`rag/alpha-answer-accuracy`) and PR #49
  (`feat/chat-ui-session-memory`). Treat those as priority inputs only on the
  surfaces named below; do not choose an entire branch wholesale.
- Current Beta convergence work wins for visual/UI composition, AppShell and
  AppRail, the hamburger/navigation pill, root and authenticated landing flow,
  canonical `/beta`/`/ops` routes, Clerk entry/return routing, principal
  admission, RBAC, admin, and scoped Settings. Never revert those surfaces to
  an older UI while integrating Pavun work.
- Pavun57's intent wins for chat orchestration, inference, retrieval, reranking,
  grounding/citations, answer accuracy and repair, request budgets, and backend
  chat/data behavior outside identity and RBAC.
- Resolve shared files symbol-by-symbol. Current UI/auth/RBAC symbols win;
  Pavun chat/inference/accuracy symbols win. Existing security, provenance,
  privacy, and data-integrity gates remain mandatory and may require a minimal,
  documented adaptation rather than a blind patch application.
- The accepted signed-in chat presentation already exists in the
  Member/Alpha-derived components contained by `beta_0.1`. Current
  `web/app/beta/chat/page.tsx` and `BetaConversationRoute` send operator
  principals to an older operator `ChatWorkspace`; treat that as an audited
  mapping gap, not permission to rebuild the UI. A future authorized fix must
  adapt the existing presentation to the distinct member/operator server
  contracts while preserving owner scoping and RBAC.
- A persisted `cnv_*` conversation with an ungrounded answer can mean the
  isolated staging evidence plane is empty. Verify R2/KV/Vectorize readiness
  separately from chat routing before changing inference code. Never copy
  production corpus data to staging without its own approved task.
- The canonical decision map is
  `.planning/inputs/2026-09-11-pavun-beta-integration-precedence.md`.

## Boundaries

Merging to `main` does not by itself prove Cloudflare production is running the
same source commit. Verify production separately with Wrangler deployment
receipts and live API probes. Do not deploy, rotate secrets, mutate DNS,
enqueue live ingest, or broaden the corpus unless the user explicitly asks for
that action in the current task.

This packet is active for repository work, but relocation, registry writes,
session migration, provider changes, and production cutovers remain
manifest-gated.

<!-- temperance:project-rail:start -->
## Temperance project rail

This repository is registered with **Temperance Engine** as a project rail.
Host runtime (models, OmniRoute, OpenCode plugins) lives under `~/.temperance_engine`
and `~/.config/opencode`; this repo owns planning and acceptance.

| Concern | Authority |
|---|---|
| Models / failover / budgets | Host OmniRoute + temperance combos |
| Planning spine | `.planning/` (GSD) + `temperance-next-wave` |
| Acceptance | `ISA.md` when present |
| Handoff (if present) | `.project/HANDOFF.md` |
| Parallel execute | `noesis-execute` / `temperance-batch` |

### Auto next-wave

When an agent session starts in this cwd, enrich injects `dispatch: NEXT-WAVE …`.
**Do not wait** for the user to say "temperance dispatch" or "proceed".

```bash
temperance-next-wave --cwd .
temperance-project-init --cwd . --check
temperance-batch --foreground --tasks .planning/next-wave-tasks.json --concurrency 4 --worktree
```

Manifest: `.temperance/project.json` (schema temperance.project.v1)
<!-- temperance:project-rail:end -->

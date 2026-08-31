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

# WTF Media Workspace

## Packet status

This is the canonical project entry point for the `wtfmedia`
repository. This packet is **active / evidence-led** for repository work.
No path move, registry write, session migration, provider change, DNS cutover,
secret rotation, or destructive Cloudflare action is implied by this packet.

## Registry evidence

- Portfolio: `thoughtseed`
- Repository: `wtfmedia`
- Registry WorkObject: `branch:wtfmedia` (`WTF Media Workspace`, kind: program)
- GitHub: `Sheshiyer/wtfmedia` (identity_status: pending-teamforge-verification)
- Knowledge authority: `00-meta/system-of-records.md` (placeholder — no vault: sourceRef found, needs review)
- Current packet checkpoint: `.project/HANDOFF.md`

## Authority and pickup

Codex is the default interactive governor for this repository. Claude,
OpenCode, and Kimi may pick up the bounded files listed in
`.project/project.yaml`. OmniRoute may route model calls beneath that
control rail; it does not own project identity, repository history, native
sessions, or vault knowledge.

Read `README.md`, `AGENTS.md`, `CLAUDE.md`, `.project/CONTEXT.md`,
`.project/HANDOFF.md`, and `docs/AGENT-ONBOARDING.md` before changing the
repository. Native client sessions, Paseo workspaces, provider stores, and
credentials are intentionally outside this packet.

## Current release shape

The public product is the WTF OS web app plus Ask WTF. Ask WTF is the live
evidence-backed chat path over the approved published YouTube corpus and the
approved uncut transcript corpus.

The authenticated Beta is an identity and persistence overlay on that Alpha
Ask WTF authority. Alpha continues to own corpus ingestion, retrieval,
inference, grounding, citations, timestamps, and enriched moments. Beta owns
Clerk/D1 admission, RBAC/admin, owner-scoped sessions, and history; it has no
separate corpus, Vectorize index, transcript bucket, state KV, or ingest queue.

- Public URL: `https://wtfhq.in`
- Chat API path: `https://wtfhq.in/api/chat`
- Web worker: `wtfmedia-web`
- Edge worker: `wtfmedia-edge`
- R2 bucket: `wtfmedia-catalogue`
- KV namespace title: `WTFMEDIA_STATE`
- Vectorize index: `wtfmedia-catalogue-v1`
- D1 database: `wtfmedia-ops`
- Ingest queue: `wtfmedia-ingest`
- Ingest DLQ: `wtfmedia-ingest-dlq`

Fresh release receipt recorded on 2026-09-01: R2/D1 verify all 49 approved
mapped uncut assets, KV receipts are 55/55 published plus 49/49 mapped uncut,
and Vectorize reports 11,948 records with `source_mode` and `video_id`
indexes. Queue backlog is 0 and the DLQ is at its preserved baseline of 18.
The mapping proves episode membership, not trusted cross-timeline alignment
or synchronized uncut playback. The deferred sheet exceptions are `WTF is a
Battery?`, `WEF - Economics`, `The Foundery`, and the `Brain Armstrong`
transcript-row mismatch.

## Local commands

```bash
npm run verify:phase1
npm run verify:phase2
npm run verify:phase3
npm run docs:architecture:check
npm --prefix cloudflare test
npm --prefix cloudflare test -- transcript-ingest
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test:unit
npm --prefix web run test:contracts
```

Use focused verification that matches the change. `npm run verify:phase3`
exercises the Cloudflare/D1/provenance path, but a stale generated `.next`
tree in a checkout can make the web TypeScript portion fail for generated
route references; report that as a checkout artifact unless a fresh clean web
build reproduces it.

## Staging frontend build identity

Do not copy `web/.env.local` into staging build directories: it may contain
production Clerk configuration. Supply the verified staging public key explicitly
through the build environment. Next.js embeds this key in browser assets.
Before deployment, decode the compiled key and compare its domain with
`cloudflare/wrangler.jsonc` → `env.staging.vars.CLERK_ISSUER`; reject a mismatch.
Repeat that comparison against the live sign-in page after deployment.
Use copied dependency files, not an external node_modules symlink, for isolated
OpenNext builds so framework manifest patches resolve inside the build directory.

For local Beta testing, start Next with `--hostname localhost` and set
`WTFMEDIA_EDGE_LOCAL_ORIGIN=http://localhost:8787`, matching the local Edge
`OPS_HOSTNAME=localhost`. Binding Next to `0.0.0.0` changes its internal request
hostname and skips the localhost forwarder; using `127.0.0.1` as the upstream
fails the backend hostname check. Verify an invalid bearer returns 401 through
`http://localhost:3000/beta/api/principal-context` before handing off testing.

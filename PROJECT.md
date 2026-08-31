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

Fresh release receipt recorded on 2026-08-31: D1 has 63 available
`source_assets`, 63 active transcript versions, 6,354 active transcript
chunks, and 63 completed ingestion jobs for the approved queryable corpus.
R2/KV/Vectorize are reconciled for 55 published transcript assets and 8
approved uncut text assets. The deferred sheet exceptions are `WTF is a
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

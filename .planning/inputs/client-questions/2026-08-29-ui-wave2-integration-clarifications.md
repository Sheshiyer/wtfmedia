# UI Wave 2 — Owner Clarifications

**Status:** draft-held. This document requests decisions; it does not authorize a provider, deployment, migration, or external write.

| Decision required | Owner | Blocks | Safe current state |
| --- | --- | --- | --- |
| Secure handoff route for `EDGE_SHARED_SECRET` and a read-only verification owner | WTF infrastructure owner | Cloudflare Ask WTF activation | chat remains intentionally unavailable on the preview |
| Final public and protected Cloudflare hostnames, plus Access routing acceptance | WTF owner | web-migration merge and `/ops` cutover | temporary Workers preview only |
| Episode-to-uncut asset mapping, editorial access boundary, and signed-media policy | editorial + legal owner | uncut playback and dual player | public UI exposes YouTube-only sources |
| 20-query editorial evaluation set, rubric dimensions, and pass threshold | editorial lead | reranking/factual-correctness tuning | current retrieval remains bounded but unevaluated |
| Canonical production schedule owner, timezone, conflict policy, retention, and calendar target | production owner | cross-device or external calendar synchronization | Wave 1 sketches stay browser-local |
| Provider/MCP/analytics OAuth ownership, scopes, revocation owner, and audit fields | operations + security owner | Settings connection activation | Settings says `not configured` |
| Authenticated global-command action policy, allowed verbs, audit owner, and explicit denial behavior | operations + security owner | privileged Ask WTF controls beyond safe local navigation | global controls remain declarative and non-mutating |
| Release authority, semantic version source, approver, and rollback record | release owner | release history or OTA activation | Settings says `local scaffold`; OTA is unsupported |

## Required approval package per integration

Every approved item must include a named owner, exact target, permitted scope, revocation path, privacy/data classification, safe failure state, test evidence, and explicit authorization for the required external mutation. Do not paste a secret, OAuth callback value, transcript, private share, or provider response into this file.

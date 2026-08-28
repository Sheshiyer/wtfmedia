# 01-13 SUMMARY — Connections Page Dual-Variant Seam

## Status: COMPLETE

## What shipped

- **Dual-variant seam** on `/connections`: `publicUiVariant()` selects legacy or migrated shell
- **LegacyConnectionsPage** — byte-preserving copy of original connections page, uses `connections.established` + `connections.emerging` merged, `connections.titles` for episode lookup
- **MigratedConnectionsPage** — consumes public projection via `normalizeConnectionsData()`, semantic token classes
- **LegacyConnectionGraph** / **MigratedConnectionGraph** — force-directed graph components (legacy uses raw Tailwind, migrated uses semantic tokens)
- **Public projection normalizer** (`web/lib/public/connections.ts`) — merges `established` + `emerging` into `nodes`, strips to allowlisted fields only
- **Contracts** (`web/lib/public/contracts.ts`) — field allowlists updated: `PUBLIC_CONNECTIONS_DATA_FIELDS = ["nodes", "edges", "overlaps"]`, node fields: `id, label, category, episodeCount, episodes`

## Threat results

| Threat | Task | Command | Status |
|--------|------|---------|--------|
| T-01-39 | 2 | `test:contracts connections-public-projection && test:privacy --check` | passed |
| T-01-40 | 2 | same | passed |
| T-01-41 | 3 | `build && test:contracts connections-public-projection + public-routes` | passed |

## Fixes applied during verification

1. **contracts.ts field arrays** — aligned from 01-05 shape to 01-13 spec (removed `mentions` from nodes, `episodes` from edges, changed `PUBLIC_CONNECTIONS_DATA_FIELDS` from 9 metadata fields to `["nodes", "edges", "overlaps"]`)
2. **connections.ts normalization** — `normalizeConnectionsData` now merges `raw.established` + `raw.emerging` into `nodes` (actual data shape has no `nodes` field)
3. **Test fixtures** — updated to use `{ established: [...], emerging: [...] }` instead of `{ nodes: [...] }`
4. **LegacyConnectionsPage.tsx** — removed broken `@/lib/episodes` import, uses `connections.titles` directly; replaced `connections.nodes` with merged `allNodes`

## Commit

`0515bce` — feat(01-13): connections page dual-variant seam with public projection

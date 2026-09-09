# Cloudflare Access target confirmation

**Recorded:** 2026-09-03
**Owner confirmation:** current task

## Confirmed values

| Field | Value |
|---|---|
| Cloudflare Zero Trust team name | `connect2nikhai` |
| Cloudflare Zero Trust team domain | `connect2nikhai.cloudflareaccess.com` |
| Protected application path | `wtfhq.in/ops/*` |
| Public Alpha boundary | `wtfhq.in` public routes remain outside Access |
| Beta return target | `/ops/settings?releaseTrack=beta` |

## Current evidence and boundary

The repository now provides a fixed same-origin Access login target for the
Beta action. After Access returns to Settings, the `releaseTrack=beta` query is
treated only as a one-time intent; the existing server release endpoint and
`super_admin` policy remain the only authority that can write the track.

Read-only live checks before this confirmation found no Access application in
the active Wrangler account, `wtfhq.in/ops/settings` was not Access-protected,
and the application login path returned 404. The account-scoped Access
application must therefore be created or confirmed separately before the
application login URL becomes live. No Access, DNS, Worker route, deployment,
secret, D1, or production-data mutation is recorded by this input.

The current Wrangler profile identity and the repository roster owner remain
separate facts and require reconciliation before live role acceptance: the
profile authenticated as `connect2nikhai` account access, while the roster
names `sheshnarayan.iyer@gmail.com` as the temporary `super_admin`.

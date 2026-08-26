# Phase 2 operations runbook

Local proof only: `cd web && node scripts/verify-phase2.mjs`.

Staging is blocked until the owner supplies the exact hostname, Access app/policy, D1 binding, cache namespace, secret names, and command list. Then run only the documented staging command with `--env staging --remote`; never copy production data downward.

Production is blocked until the hash-bound owner approval and sanitized staging receipt exist. The only permitted production probe is an exact-host, read-only smoke. No deployment, migration, role change, export, purge, secret change, policy change, or traffic cutover is included here.

If protected access fails, revoke Access, disable the protected route, retain the Phase 1 public baseline, and render recovery. Do not downcopy audit or operator records.

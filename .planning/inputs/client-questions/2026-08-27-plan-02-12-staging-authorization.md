# Owner authorization request · Plan 02-12 (Phase 2 close)

**Drafted:** 2026-08-27
**For:** Repository owner (9d9d / super_admin) — sheshnarayan.iyer@gmail.com
**Blocks:** Closure of repository Phase 2 (Platform Foundation + Authenticated
Policy Boundary), which in turn blocks all Phase 3+ implementation
authorization
**Plan under gate:** `.planning/phases/02-platform-foundation-authenticated-policy-boundary/02-12-PLAN.md`
**Related decisions:** D-03, D-04, D-18–D-20, D-23–D-26 (recorded in `.planning/STATE.md`)
**Status:** draft-held, awaiting owner reply

---

## Why this exists

Plan 02-12 is the single remaining plan in repository Phase 2 (34 of 35 done).
It runs the manifest-gated staging demonstration, collects owner approval
bound to hashes, and executes exactly one read-only production smoke.

The plan intentionally **refuses to invent** the staging target, Access
application, D1 database, Worker route, cache namespace, or secret set — and
it refuses to guess the production host. Every one must be named by the owner
before any remote command runs.

Committee decision D-23..D-26 in `.planning/STATE.md`:
> "Production remains blocked until deterministic staging checks prove the
> full authorization, lifecycle, isolation, audit, environment, accessibility,
> responsive, rollback, and runbook matrix; the owner approves the evidence
> packet; the production smoke test is read-only; and every failed or unknown
> gate blocks release."

## What we need from the owner

Please fill in the values below. Every field is required. Do not answer any
field with a guess — leave it blank if unknown and note who owns it.

### Task 1 — staging target (isolated from local and production)

| Field | Value |
|---|---|
| **Exact staging hostname** (a single FQDN we can parse and allowlist) | staging.wtfmedia.com |
| **Cloudflare Access application name** (the specific staging app, not shared with prod) | OPS_ACCESS_APPLICATION_STAGING |
| **Cloudflare Access policy name(s)** (which policies gate the staging app) | OPS_ACCESS_AUDIENCE_STAGING |
| **D1 database name** for staging (must be distinct from local and production) | OPS_DB_STAGING |
| **Worker route** the staging Worker binds to | OPS_WORKER_ROUTE_STAGING |
| **Cache namespace / KV binding name** for staging (must be distinct) | OPS_CACHE_STAGING |
| **Secret set** for staging (name every wrangler secret this environment reads) | OPS_ORIGIN_PROOF_STAGING |
| **Cloudflare account holder** that will run the staging commands (personal 9d9d, or a WTF-owned account) | personal 9d9d account (sheshnarayan.iyer@gmail.com) |
| **Approval scope** — one of `apply once`, `apply on every commit`, `apply only when I ping in Slack` | apply once |

The staging commands the plan will run against these targets are:

- `wrangler d1 migrations apply <staging-d1-name> --env staging --remote`
- `wrangler deploy --env staging`
- `npm run verify:phase2 -- --staging --receipt .runtime/preflight/phase2-staging.json`

Confirm each command is authorized for this exact staging target, or name a
substitute.

### Task 2 — production read-only smoke (no writes, no mutations)

The plan runs exactly one read-only probe against production after staging
approval. It cannot create operators, mutate roles, transfer ownership,
export audit data, purge, change settings/policies/secrets, run migrations,
deploy, or cut over traffic.

| Field | Value |
|---|---|
| **Exact production hostname** (a single FQDN) | wtfmedia.vercel.app |
| **Do you supply a safe authenticated Access session** for the Control Room GET/status GET probes? (`yes` / `no`) | no |
| **Redirect policy** — if the probe is redirected to a different host, treat as failure? (`yes` recommended) | yes |
| **Do you want the read-only smoke output attached to the VERIFICATION.md checkpoint?** (`yes` / `no`) | yes |

### Evidence approval binding

Owner approval is hash-bound to the specific commit and evidence packet, per
D-24. When you sign off:

| Field | Value |
|---|---|
| **Commit sha the approval binds to** (record after Task 1 receipt lands) | 74a37d5 |
| **Approver email** | sheshnarayan.iyer@gmail.com |
| **Approval scope** covers 320/768/1440 responsive, keyboard/focus/accessibility, rollback/runbook, and all staging gates? (`yes` / `no`) | yes |

## What happens after these values arrive

1. Task 1 runs against the exact staging target and produces a sanitized
   create-only receipt at `.runtime/preflight/phase2-staging.json`. No IDs,
   values, tokens, account numbers, or payloads land in the receipt.
2. `npm run verify:phase2 -- --staging` executes the full authorization,
   lifecycle, audit, isolation, UI, rollback, and runbook matrix. Any failed
   or unknown gate blocks.
3. Staging evidence packet is presented for your approval, hash-bound.
4. Only after approval, Task 2 runs the read-only production smoke against
   the exact production host you named.
5. `02-VERIFICATION.md` is written mapping every AUTH-* and QUAL-* requirement
   ID, every D-01..D-26 decision, every T-02-* task, and every plan summary
   to persistent evidence. If any single item cannot be traced, the phase
   does not close.

## What we will not do without these values

- Run any `wrangler` command targeting staging or production
- Deploy any Worker
- Apply any D1 migration remotely
- Touch any Access policy, application, or user record
- Rotate, create, or read any secret from a managed store
- Cut traffic over from the current empty-state Control Room

## What is not part of this authorization

- Ingesting the Excel podcast catalogue snapshots (Phase 3 work; separately
  gated)
- Fetching any Drive, Zset, Frame.io, or YouTube content (blocked on client
  Phase 1/2 spec open item #1 — deployment target: ZTV+NAS vs our cloud)
- Any change to the WTF client-facing surface or wordmark
- Creating a WTF-owned Cloudflare account (that migration is a separate,
  future owner-authorized step per D-04)

---
*Draft-held. Repository state remains unchanged until each value above is
filled in and the owner explicitly instructs execution.*

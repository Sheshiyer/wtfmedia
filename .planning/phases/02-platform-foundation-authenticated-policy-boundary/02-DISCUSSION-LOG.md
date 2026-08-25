# Phase 02: Platform Foundation + Authenticated Policy Boundary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md`; this log preserves alternatives considered.

**Date:** 2026-08-26
**Phase:** 02-platform-foundation-authenticated-policy-boundary
**Areas discussed:** Platform service ownership, protected operator delivery boundary, identity and session lifecycle, role and capability enforcement, audit and environment separation, operator shell and release verification

---

## Platform service ownership

| Option | Selected |
|---|---|
| Clerk authentication with Vercel-hosted persistence | |
| Cloudflare Access authentication with Cloudflare D1 persistence | ✓ |
| Provider-deferred ports | |

**User's choice:** Cloudflare owns authentication and operator/audit persistence.
**Notes:** This supersedes the Clerk decision that failed to persist in the prior session.

## Protected operator delivery boundary

| Option | Selected |
|---|---|
| Cloudflare-controlled operator endpoint routing to the existing Vercel application | ✓ |
| Separate Cloudflare-hosted operator application | |
| Defer the protected delivery boundary | |

**User's choice:** Use the existing Vercel application behind a Cloudflare-controlled operator boundary.
**Notes:** The personal `9d9d` Wrangler account may own resources temporarily; portability and later owner handoff remain mandatory.

## Identity and session lifecycle

| Decision | Selected choice | Rejected alternatives |
|---|---|---|
| Identity mapping | Active normalized-email D1 operator required | Auto-provision; Access admission alone |
| Expiry/revocation/deactivation | Clear protected state and revalidate Access plus D1 | Retain state; recheck Access only |
| Authentication session | Access token only, per-request D1 authorization | WTF cookie; cached role authorization |

**User's choice:** Fail closed at both identity and authorization boundaries.
**Notes:** Recovery preserves only a validated intended `/ops` destination; sign-out continues through Access logout.

## Role and capability enforcement

| Decision | Selected choice | Rejected alternatives |
|---|---|---|
| Enforcement | Shared deny-by-default server policy | Per-surface policy; UI-owned enforcement |
| Bootstrap roles | One temporary `super_admin`, Aditi as `admin`, five visible peers as `editor` | Multiple admins; all editors |

**User's choice:** One transferable `super_admin`; server policy owns every protected decision.
**Notes:** Job titles do not grant authority. Yash Majithia's title and screenshot completeness remain unknown.

## Audit policy and environment separation

| Decision | Selected choice | Rejected alternatives |
|---|---|---|
| Audit coverage | Append-only privacy-minimized D1 ledger | Broad JSON capture; authentication-only logging |
| Retention | 365-day production, 30-day staging, ephemeral local | One shared period; indefinite archival |
| Isolation | Separate D1, Access, secrets, and caches; forward-only migrations; fail-closed previews | Shared non-production resources; production-derived lower environments |

**User's choice:** Environment-specific, privacy-minimized, administratively visible audit evidence with strict resource isolation.
**Notes:** Exports and purges are audited; expired records are deleted without silent archival; production data never moves downward.

## Operator shell behavior and verification

| Decision | Selected choice | Rejected alternatives |
|---|---|---|
| Initial shell | Truthful empty Control Room with observed status and explicit absence states | Placeholder totals; context-free navigation shell |
| Release gate | Deterministic staging matrix, owner evidence approval, read-only production smoke | Advisory checks; production-first validation |

**User's choice:** A truthful initial shell and a fail-closed production release gate.
**Notes:** Any failed or unknown gate blocks release. CI checks are blocking, owner approval is mandatory, and production smoke testing is read-only.

## the agent's Discretion

- Exact code and test-file decomposition.
- Migration tooling that preserves repository ownership and forward promotion.
- Accessible primitives and status-refresh details within the locked shell contract.

## Deferred Ideas

- Transfer temporary Cloudflare resources from the personal `9d9d` account to the final owner account under a separate approved migration task.

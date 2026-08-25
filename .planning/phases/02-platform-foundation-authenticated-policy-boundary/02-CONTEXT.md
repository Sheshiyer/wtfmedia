# Phase 02: Platform Foundation + Authenticated Policy Boundary - Context

**Gathered:** 2026-08-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 establishes the protected `/ops` platform boundary: Cloudflare Access
authentication, D1-backed operator authorization and audit persistence,
deny-by-default server policy, strictly separated environments, a truthful
initial Control Room shell, and fail-closed release evidence. It does not add
Phase 3 episode-ingestion or provenance workflows.

</domain>

<decisions>
## Implementation Decisions

### Platform service ownership
- **D-01:** Cloudflare Zero Trust Access is the sole authentication authority; Cloudflare D1 stores operators and audit records.
- **D-02:** A Cloudflare-controlled operator endpoint enforces Access and routes authorized operator traffic to the existing Vercel application; public traffic remains unchanged.
- **D-03:** The personal `9d9d` Wrangler account may temporarily own Phase 2 Cloudflare resources. Repository-owned schema, migrations, binding names, policy, and verification remain portable; credentials and numeric account identifiers stay outside source control.
- **D-04:** Moving resources to the final owner account is a separate owner-approved migration task.

### Identity and session lifecycle
- **D-05:** Access-authenticated normalized email must match an active D1 operator with a recognized `super_admin`, `admin`, or `editor` role. Missing, inactive, and unknown-role records fail closed.
- **D-06:** The verified Cloudflare Access token is the only authentication session. WTF creates no authentication cookie, and every protected server request rechecks the active D1 role.
- **D-07:** Expiry, revocation, or operator deactivation immediately clears protected client state. Recovery reveals no protected data, retains only a validated intended `/ops` destination, and requires fresh Access plus D1 validation.
- **D-08:** Sign-out clears protected client state before proceeding through Cloudflare Access logout.

### Roles and server authorization
- **D-09:** One shared deny-by-default server policy governs pages, APIs, queries, exports, record and field projection, safe errors, and cache boundaries. UI visibility reflects policy but never grants authority.
- **D-10:** Unknown resource, action, record, field, or role combinations deny without revealing protected entity existence.
- **D-11:** Exactly one active transferable `super_admin` seat exists. Transfer is atomic and audited so the system never has zero or multiple active super administrators.
- **D-12:** Bootstrap roles are: `sheshnarayan.iyer@gmail.com` as `super_admin`; Aditi Raj (`aditi@allthingswtf.com`) as `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia as `editor`.
- **D-13:** Yash Majithia's supplied job title and the completeness of the cropped roster screenshot remain explicit unknown metadata; job titles never infer application authority.

### Audit policy
- **D-14:** D1 holds an append-only audit ledger covering authentication outcomes, expiry/logout, protected searches/views/exports, operator and role changes, settings changes, purges, and super-admin handoffs.
- **D-15:** Audit entries contain allowlisted metadata and correlation IDs only. Tokens, raw queries, prompts, responses, and private payloads are prohibited.
- **D-16:** Production retains audit records for 365 days, staging for 30 days, and local audit data is ephemeral. Only `super_admin` and `admin` may view or export audit records.
- **D-17:** Every audit export and automated purge is itself audited. Expired records are deleted without silent archival.

### Environment separation
- **D-18:** Local, staging, and production use separate D1 databases, Access applications and policies, secrets, and cache namespaces.
- **D-19:** Production data is never copied into a lower environment. Repository-owned migrations promote forward through environments.
- **D-20:** Preview deployments receive no protected backend unless explicitly bound.

### Truthful operator shell
- **D-21:** The first authenticated `/ops` release is a truthful empty Control Room showing current environment, workspace, effective role, authorized navigation, live-derived service status, and one dominant setup action.
- **D-22:** Missing systems display explicit unknown, offline, unavailable, or permission-denied states. Fabricated health and misleading zero values are prohibited.

### Production release gate
- **D-23:** Production remains blocked until staging proves the complete anonymous, expired, inactive, `editor`, `admin`, and `super_admin` authorization matrix.
- **D-24:** Staging also proves Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and 320/768/1440 responsive behavior; plus rollback and runbook rehearsal.
- **D-25:** Deterministic checks block CI. The owner must approve the staging evidence packet, and the production smoke test is read-only.
- **D-26:** Every failed or unknown release gate blocks production; no warning-only or discretionary bypass is approved.

### the agent's Discretion
The planner may choose exact module boundaries, migration tooling, test-file
decomposition, status refresh intervals, and accessible component primitives,
provided every locked decision above remains independently verifiable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning and acceptance authority
- `.planning/ROADMAP.md` — Phase boundary, requirements, success criteria, and resolved client inputs.
- `.planning/REQUIREMENTS.md` — AUTH and QUAL acceptance requirements, including the atomic Phase 2 release gate.
- `.planning/STATE.md` — Current planning status and accumulated owner decisions.
- `.project/HANDOFF.md` — Phase 1 evidence, Phase 2 decisions, roster evidence, and superseded-draft warnings.
- `ISA.md` — Project acceptance authority and chronological decision record.

### Phase 2 technical context
- `.planning/phases/02-platform-foundation-authenticated-policy-boundary/02-PLAN.md` — Superseded umbrella draft; use only to identify unsafe assumptions that executable numbered plans must replace.
- `docs/CLOUDFLARE-INFRASTRUCTURE.md` — Existing Cloudflare estate and Worker integration boundaries.
- `.planning/DEEP-PASS-REVIEW-2026-08-21.md` — Cross-phase risk and planning review.
- `.planning/tasks.md` — Existing task inventory and prerequisite context.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cloudflare/src/index.ts`: Existing Worker routing, binding, secret-check, D1 operator, settings, and audit endpoint seams can be hardened rather than duplicated.
- `cloudflare/src/db.ts`: Existing D1 access layer is the schema/migration integration point.
- `cloudflare/wrangler.jsonc`: Existing Cloudflare bindings establish the portable naming pattern; environment-specific resources must remain distinct.
- `web/lib/auth.ts`: Existing Access JWT and Worker operator lookup seam is the server authentication integration point.
- `web/lib/auth/capabilities.ts` and `web/lib/auth/policies.ts`: Existing draft policy modules provide a starting shape for one shared deny-by-default policy.
- `web/lib/public/public-ui-variant.ts`: Existing server-only legacy/migrated selector provides the tested rollback pattern.

### Established Patterns
- Public Vercel routes call the Cloudflare Worker server-to-server with a managed secret; no Cloudflare account credential reaches the browser.
- Public and operator surfaces are separate policy-bound projections over shared domain services.
- Missing evidence is represented as an explicit state rather than inferred truth.
- Existing Phase 1 aggregate, accessibility, visual, privacy, security, and rollback gates remain blocking for Phase 2.

### Integration Points and Landmines
- `web/lib/auth/session.ts` currently drafts an unsigned JSON `wtf_session` cookie and is superseded by D-06.
- The draft D1 role checks omit `super_admin`, audit metadata is unrestricted JSON, and retention is hard-coded to 90 days; these conflict with D-11 and D-14 through D-17.
- The umbrella `02-PLAN.md` predates the completed discussion. `$gsd-plan-phase 2` must replace it with executable `02-01-PLAN.md` onward plans rather than edit it in place.

</code_context>

<specifics>
## Specific Ideas

- The initial operator experience should feel operationally honest even before canonical workflow data exists: verified context, one clear setup action, and explicit absence states.
- Authorization is intentionally two-stage: Access proves identity; the current D1 operator record proves application authority on every protected request.
- The temporary personal Cloudflare account is an ownership bridge, not a source-code dependency.

</specifics>

<deferred>
## Deferred Ideas

- Port the Phase 2 Cloudflare resources from the personal `9d9d` account to the final owner account under a separate owner-approved migration task.

</deferred>

---

*Phase: 02-platform-foundation-authenticated-policy-boundary*
*Context gathered: 2026-08-26*

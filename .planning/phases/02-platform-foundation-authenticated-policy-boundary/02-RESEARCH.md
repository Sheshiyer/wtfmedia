# Phase 2: Platform Foundation + Authenticated Policy Boundary - Research

**Researched:** 2026-08-26
**Domain:** Cloudflare Access, Cloudflare Workers/D1, and Next.js 15 protected operator boundary
**Confidence:** HIGH for documented platform behavior; MEDIUM for final account-specific provisioning values

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Platform service ownership
- **D-01:** Cloudflare Zero Trust Access is the sole authentication authority; Cloudflare D1 stores operators and audit records.
- **D-02:** A Cloudflare-controlled operator endpoint enforces Access and routes authorized operator traffic to the existing Vercel application; public traffic remains unchanged.
- **D-03:** The personal `9d9d` Wrangler account may temporarily own Phase 2 Cloudflare resources. Repository-owned schema, migrations, binding names, policy, and verification remain portable; credentials and numeric account identifiers stay outside source control.
- **D-04:** Moving resources to the final owner account is a separate owner-approved migration task.

#### Identity and session lifecycle
- **D-05:** Access-authenticated normalized email must match an active D1 operator with a recognized `super_admin`, `admin`, or `editor` role. Missing, inactive, and unknown-role records fail closed.
- **D-06:** The verified Cloudflare Access token is the only authentication session. WTF creates no authentication cookie, and every protected server request rechecks the active D1 role.
- **D-07:** Expiry, revocation, or operator deactivation immediately clears protected client state. Recovery reveals no protected data, retains only a validated intended `/ops` destination, and requires fresh Access plus D1 validation.
- **D-08:** Sign-out clears protected client state before proceeding through Cloudflare Access logout.

#### Roles and server authorization
- **D-09:** One shared deny-by-default server policy governs pages, APIs, queries, exports, record and field projection, safe errors, and cache boundaries. UI visibility reflects policy but never grants authority.
- **D-10:** Unknown resource, action, record, field, or role combinations deny without revealing protected entity existence.
- **D-11:** Exactly one active transferable `super_admin` seat exists. Transfer is atomic and audited so the system never has zero or multiple active super administrators.
- **D-12:** Bootstrap roles are: `sheshnarayan.iyer@gmail.com` as `super_admin`; Aditi Raj (`aditi@allthingswtf.com`) as `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia as `editor`.
- **D-13:** Yash Majithia's supplied job title and the completeness of the cropped roster screenshot remain explicit unknown metadata; job titles never infer application authority.

#### Audit policy
- **D-14:** D1 holds an append-only audit ledger covering authentication outcomes, expiry/logout, protected searches/views/exports, operator and role changes, settings changes, purges, and super-admin handoffs.
- **D-15:** Audit entries contain allowlisted metadata and correlation IDs only. Tokens, raw queries, prompts, responses, and private payloads are prohibited.
- **D-16:** Production retains audit records for 365 days, staging for 30 days, and local audit data is ephemeral. Only `super_admin` and `admin` may view or export audit records.
- **D-17:** Every audit export and automated purge is itself audited. Expired records are deleted without silent archival.

#### Environment separation
- **D-18:** Local, staging, and production use separate D1 databases, Access applications and policies, secrets, and cache namespaces.
- **D-19:** Production data is never copied into a lower environment. Repository-owned migrations promote forward through environments.
- **D-20:** Preview deployments receive no protected backend unless explicitly bound.

#### Truthful operator shell
- **D-21:** The first authenticated `/ops` release is a truthful empty Control Room showing current environment, workspace, effective role, authorized navigation, live-derived service status, and one dominant setup action.
- **D-22:** Missing systems display explicit unknown, offline, unavailable, or permission-denied states. Fabricated health and misleading zero values are prohibited.

#### Production release gate
- **D-23:** Production remains blocked until staging proves the complete anonymous, expired, inactive, `editor`, `admin`, and `super_admin` authorization matrix.
- **D-24:** Staging also proves Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and 320/768/1440 responsive behavior; plus rollback and runbook rehearsal.
- **D-25:** Deterministic checks block CI. The owner must approve the staging evidence packet, and the production smoke test is read-only.
- **D-26:** Every failed or unknown release gate blocks production; no warning-only or discretionary bypass is approved.

### the agent's Discretion
- Exact module boundaries.
- Migration tooling within repository-owned Wrangler/D1 migrations.
- Test-file decomposition.
- Status refresh intervals.
- Accessible component primitives, subject to the Phase 2 UI design contract gate.

### Deferred Ideas (OUT OF SCOPE)
- Port the Phase 2 Cloudflare resources from the personal `9d9d` account to the final owner account under a separate owner-approved migration task.
- Phase 3 episode ingestion and provenance workflows.
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Access authentication | Cloudflare edge | Vercel origin | Access blocks unauthenticated traffic; the origin still verifies the forwarded application JWT. |
| Operator authorization | Cloudflare Worker/D1 | Next.js server DAL | D1 is rechecked on every protected request; Next.js applies the same capability decision to pages, handlers, actions, DTOs, and fields. |
| Protected client recovery | Browser/client | Cloudflare Access | The client discards protected memory before navigating through Access logout or reauthentication. |
| Capability policy | Shared server contract | UI projection | A single pure deny-by-default policy owns decisions; the UI only reflects its result. |
| Audit ledger and retention | D1/Worker | Scheduled Worker | Writes are append-only through a typed encoder; an audited scheduled transaction deletes only expired rows. |
| Environment isolation | Deployment configuration | CI/runbooks | Separate bindings, apps, policies, secrets, and caches are selected explicitly per environment and proven before release. |
| Control Room shell | Next.js server/UI | Worker health endpoints | The shell renders authorized, live-derived context and explicit unavailable states without invented data. |
| Release evidence | CI and staging | Read-only production probe | Deterministic gates and owner approval prevent a production write or cutover on failed or unknown evidence. |
</architectural_responsibility_map>

<research_summary>
## Summary

The locked architecture is compatible with current Cloudflare and Next.js behavior, provided the implementation treats the Cloudflare Access application token as an externally issued credential that must still be cryptographically verified at the origin. Cloudflare recommends using the `Cf-Access-Jwt-Assertion` header, checking the remote JWKS, issuer, and application audience. The current drafts do not meet this bar: they decode unsigned payloads, trust `Cf-Access-Authenticated-User-Email`, default roles to `editor`, and create a second unsigned `wtf_session` cookie. All of those paths must be removed or replaced, not incrementally legitimized.

D1's repository migrations, environment-specific bindings, transactional `batch()` API, indexes, and scheduled Worker handlers are sufficient for the operator store, atomic super-admin handoff, append-only audit writes, and audited retention purge. The database should enforce enum/check/unique invariants where possible, while the Worker owns the only mutation surface. A transaction must bind the ownership transfer and its audit record; another transaction must bind the purge summary event and deletion. Production, staging, preview, and local targets must be explicit because Wrangler's environment bindings and secrets are non-inheritable and remote D1 commands are easy to mis-target without named commands and receipts.

For Next.js 15, route middleware is an optimistic early filter rather than the authorization authority. Protected pages, route handlers, server functions, query adapters, DTO projectors, exports, and error paths need a server-only data-access layer that consumes only a verified per-request operator context. Protected rendering and fetches must be dynamic and `no-store`, and Cloudflare must bypass cache for the protected hostname/path. The first release can therefore be a truthful shell without Phase 3 data, but its UI contract must be created before executable planning continues.

**Primary recommendation:** Implement one request-scoped chain — Access JWT verification → normalized identity → active D1 operator lookup → shared capability decision → allowlisted DTO/audit projection — with no local auth cookie and no protected cache.
</research_summary>

<standard_stack>
## Standard Stack

### Core

| Library/tool | Repository/current version | Purpose | Why standard here |
|---|---:|---|---|
| Next.js App Router | `15.5.x` (repository line) | `/ops` pages, route handlers, server functions, and recovery UI | The existing application runtime; official v15 guidance supports server-only DAL and DTO boundaries. |
| Cloudflare Workers + Wrangler | `4.x` (`^4.95.0` declared) | Protected edge endpoint, D1 bindings, migrations, scheduled purge, environment deployment | Native runtime for the already deployed edge estate and D1. |
| Cloudflare Access | Managed service | Organization identity, policy gate, application JWT, revocation/logout | Sole authentication authority selected by the owner. |
| Cloudflare D1 | Managed SQLite | Operators, settings, and audit ledger | Selected persistence layer with repository migrations and transactional batch support. |
| `jose` | `6.2.10` researched | Remote JWKS and JWT signature/issuer/audience validation | Used by Cloudflare's official application-token validation example; avoids custom crypto/JWT parsing. |
| Vitest | `4.1.11` | Policy, DTO, migration, audit, and failure contract tests | Already present and separated into repository test projects. |
| Playwright | `1.62.1` | Authorization journeys, expiry/recovery, accessibility, responsiveness, and cache probes | Already powers deterministic browser evidence in Phase 1. |

### Supporting

| Tool/pattern | Purpose | When to use |
|---|---|---|
| D1 `batch()` | Atomic ordered statements with rollback | Super-admin handoff and audited purge/export bookkeeping. |
| Wrangler D1 migrations | Forward-only schema versioning | Local first, then staging, then owner-approved production promotion from the same files. |
| Worker Cron Trigger | Retention purge | Environment-specific scheduled purge; local trigger route for deterministic tests. |
| `server-only` module marker | Prevent client imports of policy/DAL/secrets | Every privileged Next.js auth, DTO, audit, and backend adapter module. |
| React `cache()` | Deduplicate one request/render's repeated authorization lookup | Request-scoped DAL use only; never persistent cross-request authorization caching. |

### Explicit non-selections

| Do not add/use | Reason |
|---|---|
| Clerk, Auth.js, or a local password/session system | Conflicts with Access as the sole authentication authority. |
| A custom JWT decoder/validator | Parsing a payload does not verify the signature, issuer, audience, or expiry. |
| Prisma/Drizzle for Phase 2 | The repository already has a small Worker SQL layer; Wrangler migrations are sufficient and reduce migration-path complexity. |
| Protected `unstable_cache`, Cache Components, or shared KV response caching | Authorization state is request-sensitive and must be rechecked against D1 every time. |

**Expected dependency change:** add `jose@6.2.10` to the runtime(s) that verify Access JWTs; do not upgrade Next.js or Wrangler as part of Phase 2 unless an implementation blocker is separately proven.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### System Architecture Diagram

```text
Browser requests protected operator hostname/path
  -> Cloudflare Access policy
       -> deny: Cloudflare 401/403, no origin request
       -> allow: Cf-Access-Jwt-Assertion
            -> operator Worker boundary
                 -> verify signature + iss + aud + exp via remote JWKS
                      -> invalid: safe denial + minimized auth audit
                      -> valid: normalize email
                           -> D1 active operator lookup on every request
                                -> absent/inactive/unknown role: safe denial + audit
                                -> recognized role: shared capability policy
                                     -> deny: uniform non-leaking response + audit
                                     -> allow: proxy to Vercel with trusted-origin proof
                                          -> Next.js server-only authorization/DAL
                                               -> allowlisted DTO/field projection
                                               -> dynamic no-store response
                                               -> protected client state

Scheduled UTC trigger
  -> environment retention constant (local ephemeral / staging 30 / production 365)
  -> D1 transaction: append purge event + delete expired audit rows
  -> structured receipt; failure leaves both operations rolled back
```

### Recommended responsibility layout

```text
cloudflare/
├── migrations/                 # forward-only D1 schema and bootstrap migrations
├── src/auth/access.ts          # application JWT verification and normalized identity
├── src/auth/policy.ts          # shared role/resource/action/record/field policy contract
├── src/operators.ts            # D1 operator lookup and atomic ownership transfer
├── src/audit.ts                # typed event encoder, query/export, retention purge
├── src/ops-router.ts           # protected request routing and safe responses
├── config/                     # symbolic environment manifest; no account/resource IDs
└── scripts/                    # generated ignored Wrangler config + migration/preflight receipts

web/
├── app/ops/                    # protected Control Room shell and recovery states
├── app/api/ops/                # protected route handlers where required
├── lib/ops/context.ts          # trusted request context and request-scoped recheck
├── lib/ops/policy.ts           # policy contract consumer; fail closed on unknowns
├── lib/ops/dto.ts              # allowlisted operator projections
├── lib/ops/cache.ts            # no-store and cache-isolation assertions
└── tests/phase2/               # matrix, lifecycle, DTO, cache, audit, UI, release evidence
```

Exact filenames remain planner discretion; responsibility separation is the important constraint.

### Pattern 1: Verify the application token, never a header hint

Use `Cf-Access-Jwt-Assertion` as the credential and verify it against the team JWKS with both issuer and application audience. Do not accept `Cf-Access-Authenticated-User-Email` by itself, do not use `atob()` as validation, and do not invent a fallback role.

```ts
// Pattern adapted from Cloudflare's official Access JWT validation guide.
const JWKS = createRemoteJWKSet(new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
const { payload } = await jwtVerify(token, JWKS, {
  issuer: env.ACCESS_TEAM_DOMAIN,
  audience: env.ACCESS_AUD,
});
```

### Pattern 2: One shared fail-closed policy vocabulary

Treat role, resource, action, record predicate, and field set as untrusted strings at the boundary. Parse each into a closed vocabulary. A missing/unknown value returns one uniform denial. The same pure policy function must be invoked by pages, handlers, mutations, queries, exports, DTO projection, audit visibility, and navigation projection.

The existing `checkPolicy()` behavior `no policy = allow` is unsafe for protected paths and must become `unknown protected combination = deny`. Public routing is a separate explicit classification, not the fallback branch of the protected policy.

### Pattern 3: Transaction-bound invariants and audit events

Use D1 constraints for recognized roles, normalized-email uniqueness, active flags, audit outcomes, and environment names. Use a unique partial index to prevent more than one active `super_admin`. Route every ownership mutation through one D1 `batch()` that demotes the current owner, promotes the target, and appends the handoff audit event. No generic role/deactivation mutation may target the current super-admin seat.

The transaction makes intermediate changes invisible outside the commit. A post-transaction invariant query must confirm exactly one active super-admin; a failure is fatal and non-leaking.

### Pattern 4: Typed append-only audit envelope

Prefer first-class columns for the required envelope: event ID, timestamp, actor/operator ID or pseudonymous subject digest, effective role, action, entity type, entity ID, outcome, environment, correlation ID, and schema version. Any action-specific metadata must pass an event-specific encoder that emits only known keys and scalar limits. There must be no generic endpoint that accepts arbitrary `metadata` JSON from the browser.

Application code never updates an audit row. Deletion exists only in the retention path and is constrained to `created_at < cutoff`. Export and purge append their own audit events, and a purge transaction records cutoff/count/outcome before deleting the expired rows.

### Pattern 5: Explicit environment promotion

Wrangler environment bindings, variables, and secrets are non-inheritable. Declare every required binding name for every environment, generate the concrete Wrangler file from out-of-repository identifiers, and fail preflight when a binding is absent or unexpectedly shared. Use explicit `--local`, `--env staging --remote`, and `--env production --remote` commands with exact database names. Never rely on the default target.

Preview Vercel deployments must lack the protected-origin proof and protected backend URL by default; `/ops` therefore renders only a non-leaking unavailable/denied boundary. Production data export/import is not part of local or staging setup.

### Pattern 6: Secure Next.js DAL and DTO projection

Next.js middleware/proxy can reject obviously untrusted requests early, but it cannot be the only authorization layer. Use `server-only` modules, verify trusted-origin input, call the request-scoped authorization path, and apply authorization again immediately before every privileged data read or mutation. Server functions and route handlers must verify independently.

Return minimal DTOs, not database models. Client Components receive only display fields they need. Protected pages and fetches use dynamic/no-store semantics; Cloudflare responses set `Cache-Control: private, no-store` and the protected edge route has an explicit cache bypass.

### Pattern 7: Non-leaking recovery and logout

On `401`, `403`, expiry, or deactivation, clear all protected client stores and pending response state before rendering a generic recovery surface. Preserve only a validated same-origin destination whose normalized path is `/ops` or beneath `/ops`; reject scheme-relative URLs, external origins, encoded path confusion, and public/private crossovers.

Sign-out clears client state first, then navigates to `<application-domain>/cdn-cgi/access/logout`. Cloudflare documents a 20-30 second token rejection window, so post-logout protected requests must still fail through fresh edge JWT and D1 checks rather than assuming immediate global invalidation.

### Anti-patterns to remove from the superseded draft

- Decoding a JWT payload without signature/issuer/audience verification.
- Trusting `Cf-Access-Authenticated-User-Email` or client-provided role headers.
- Defaulting authenticated identities to `editor`.
- Creating or reading `wtf_session`.
- Letting an unrecognized protected route pass because no rule matched.
- Accepting arbitrary audit metadata from a browser request.
- Using a generic role mutation for `super_admin` transfer.
- Sharing a D1 binding, KV/cache namespace, Access app, audience, or secret across environments.
- Caching a role or protected DTO across requests.
- Treating a middleware redirect, UI-hidden control, or successful build as authorization proof.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Access token verification | Base64 parsing, embedded PEMs, or homegrown JWT crypto | `jose` remote JWKS plus `jwtVerify` | Handles signing-key rotation and validates signature/issuer/audience/expiry. |
| Authentication session | `wtf_session` or another WTF cookie | Cloudflare Access application token only | Prevents split-brain expiry/revocation and unsigned local authority. |
| D1 migrations | Runtime create-table runner | Wrangler forward-only migration files | Produces ordered, reviewable, repeatable promotion evidence. |
| Ownership transfer | Separate update calls | D1 `batch()` plus database constraints | Prevents partial transfer and binds the audit event to the mutation. |
| Retention scheduler | Browser/admin-triggered cleanup | Worker Cron Trigger with deterministic local trigger tests | Keeps purge server-owned, environment-specific, and auditable. |
| Authorization spread across UI/routes | Per-page role checks | One shared pure server policy and request-scoped DAL | Avoids divergent semantics and unknown-combination allows. |
| Protected caching | User/role-derived ad hoc cache keys | No protected cache in Phase 2 | The requirement is reauthorization every request; no-store is safer and sufficient. |

**Key insight:** Phase 2 is primarily a trust-boundary phase. Convenience fallbacks create alternate authorities, which directly contradict the locked design.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Access at the edge but spoofable identity at the origin
**What goes wrong:** Direct Vercel or Worker requests supply an email/role header and bypass Access.
**Why it happens:** The origin trusts headers or decoded JWT claims without cryptographic verification and audience binding.
**How to avoid:** Require the protected Cloudflare path, verify the application JWT at the origin, require the per-environment trusted-origin proof, and deny the direct Vercel `/ops` path.
**Warning signs:** `atob()`, role headers, a default role, or a protected endpoint that works with only `Cf-Access-Authenticated-User-Email`.

### Pitfall 2: Authorization enforced only in middleware or navigation
**What goes wrong:** RSC requests, route handlers, server functions, prefetches, exports, or nested routes disclose data despite the page guard.
**Why it happens:** Next.js has multiple server entry points, and hidden UI is mistaken for enforcement.
**How to avoid:** Authorize inside every server-side data and mutation boundary through one DAL/policy contract; add direct-entry and RSC/prefetch tests.
**Warning signs:** `middleware.ts` is the only caller of the policy function.

### Pitfall 3: Cross-user or cross-environment cache leakage
**What goes wrong:** A response authorized for one operator/environment is served to another.
**Why it happens:** A cache key omits identity/role/environment or a framework/CDN default is assumed safe.
**How to avoid:** Do not cache protected Phase 2 responses or D1 authorization; add explicit edge and Next.js no-store controls and matrix probes.
**Warning signs:** `force-cache`, `unstable_cache`, ISR, public cache headers, or reused KV prefixes in `/ops` code.

### Pitfall 4: Super-admin invariant exists only in TypeScript
**What goes wrong:** Concurrent or partial mutations leave zero or multiple active owners.
**Why it happens:** Demotion and promotion are separate calls, and ordinary admin update functions can affect the owner seat.
**How to avoid:** Add database constraints/indexes, a single transaction-bound transfer function, and exhaustive zero/multiple/concurrent probes.
**Warning signs:** `updateOperatorRole()` accepts `super_admin`, or current-owner deactivation is a generic action.

### Pitfall 5: “Append-only” audit API accepts arbitrary or mutable data
**What goes wrong:** Sensitive prompts/tokens enter metadata, or events can be rewritten/deleted outside retention.
**Why it happens:** A generic JSON payload and CRUD repository are easier than a typed event contract.
**How to avoid:** Use action-specific server encoders, first-class envelope columns, no update endpoint, bounded scalar metadata, and a single audited expiry deletion path.
**Warning signs:** `Record<string, unknown>`, `JSON.stringify(payload.metadata)`, PUT/PATCH audit routes, raw queries in event records.

### Pitfall 6: Environment flags do not prove resource isolation
**What goes wrong:** Staging points at production D1, Access audience, secrets, or caches.
**Why it happens:** Top-level Wrangler bindings are assumed to inherit safely, or defaults select a remote target.
**How to avoid:** Declare non-inheritable bindings per environment; verify distinct resource identities from sanitized receipts; require exact commands with explicit local/remote/env flags.
**Warning signs:** one `database_id`, one Access audience, or one cache namespace used for all environments.

### Pitfall 7: Logout is treated as immediately final
**What goes wrong:** Protected client data remains visible or an issued token remains briefly accepted.
**Why it happens:** Logout redirects before client clearing, and the application assumes the cookie is globally invalid at once.
**How to avoid:** Clear first; route through Access logout; keep all protected requests guarded by fresh JWT verification and D1 role lookup; test the documented revocation lag.
**Warning signs:** sign-out only redirects, or recovery restores cached operator state.

### Pitfall 8: Audit CSV becomes an execution vector
**What goes wrong:** Spreadsheet software interprets exported cells beginning with formula characters.
**Why it happens:** CSV serialization escapes delimiters but not spreadsheet formulas.
**How to avoid:** Prefix dangerous cell starts, constrain columns to the allowlisted schema, use no-store/download headers, and audit the export.
**Warning signs:** direct concatenation of event fields into CSV.
</common_pitfalls>

<code_examples>
## Code Examples

### Verified Cloudflare Access application token

```ts
// Source: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
import { createRemoteJWKSet, jwtVerify } from "jose";

export async function verifyAccessToken(token: string, teamDomain: string, audience: string) {
  const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  return jwtVerify(token, jwks, { issuer: teamDomain, audience });
}
```

### Atomic D1 statement batch

```ts
// Source: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
await env.DB.batch([
  env.DB.prepare("UPDATE operators SET role = 'admin' WHERE id = ?").bind(fromId),
  env.DB.prepare("UPDATE operators SET role = 'super_admin' WHERE id = ? AND active = 1").bind(toId),
  env.DB.prepare("INSERT INTO audit_events (...) VALUES (...)").bind(/* allowlisted values */),
]);
```

### Environment-specific D1 binding shape

```jsonc
// Source: https://developers.cloudflare.com/d1/configuration/environments/
{
  "env": {
    "staging": {
      "d1_databases": [{ "binding": "OPS_DB", "database_name": "wtfmedia-ops-staging", "database_id": "<runtime value>" }]
    },
    "production": {
      "d1_databases": [{ "binding": "OPS_DB", "database_name": "wtfmedia-ops-production", "database_id": "<runtime value>" }]
    }
  }
}
```

### Scheduled retention handler

```ts
// Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/
export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(purgeExpiredAuditEvents(env, controller.scheduledTime));
  },
};
```

### Server-only authorization module

```ts
// Source: https://nextjs.org/docs/15/app/guides/data-security
import "server-only";

export async function readAuthorizedControlRoom(request: Request) {
  const operator = await requireCurrentOperator(request);
  authorize(operator, { resource: "control_room", action: "read" });
  return projectControlRoomDTO(await loadLiveStatus());
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Older/unsafe assumption | Current documented approach | Impact on Phase 2 |
|---|---|---|
| Access presence/header equals trusted identity | Validate `Cf-Access-Jwt-Assertion` against rotating JWKS, issuer, and audience | Replace header-only and decode-only draft logic. |
| Middleware is the authorization boundary | Middleware/proxy is optional optimistic checking; secure authorization belongs in the DAL and data/mutation boundary | Direct route, RSC, server function, and export tests are mandatory. |
| D1 commands implicitly target remote | Wrangler D1 commands default local unless `--remote`; environment flags select bindings | Promotion scripts must name local/staging/production explicitly and capture receipts. |
| Wrangler environment configuration inherits top-level resources | Bindings, vars, and secrets are non-inheritable | Each environment needs a complete explicit protected binding set. |
| `unstable_cache` is the current general cache primitive | Next.js 16 points toward Cache Components/`use cache`; repository remains Next.js 15 | Do not introduce either for protected Phase 2 data; keep no-store and defer upgrades. |

**New pattern to use:** Wrangler supports explicit `--env`, `--local`, `--remote`, and migration list/apply commands. Plans should make target selection machine-checkable rather than relying on operator memory.

**Deprecated for this phase:** The superseded `wtf_session`, header-only identity, role hints, hard-coded 90-day retention, unrestricted audit JSON, and shared environment bindings are invalid implementation authority.
</sota_updates>

<open_questions>
## Open Questions and Execution-Time Unknowns

No product-policy question remains open. These deployment values must remain explicit unknowns until the implementation/setup plan obtains them from the owner-controlled environment:

1. **Final protected operator hostname and Access application audience values**
   - Known: each environment requires a separate Access application/policy and audience.
   - Unknown: the concrete hostnames, application IDs, and audience tags in the temporary `9d9d` account.
   - Planning treatment: use symbolic environment contracts and a manual setup/preflight checkpoint; never commit the values.

2. **Concrete D1, cache, and Worker resource identifiers**
   - Known: local, staging, and production must be distinct, with stable repository binding names.
   - Unknown: provider-generated IDs until resources are provisioned.
   - Planning treatment: generate ignored runtime configuration from owner environment variables and validate sanitized identity-distinctness receipts.

3. **UI design contract**
   - Known: Phase 2 includes a persistent `/ops` shell, recovery screens, navigation, statuses, accessibility, and responsive acceptance.
   - Unknown: the required `02-UI-SPEC.md` has not yet been created.
   - Planning treatment: stop the plan-phase workflow at the UI safety gate and run `$gsd-ui-phase 2` before executable plan generation, unless the owner explicitly invokes `--skip-ui`.
</open_questions>

<validation_architecture>
## Validation Architecture

### Test layers

| Layer | Tool | Required proof |
|---|---|---|
| Pure policy and parsers | Vitest | Closed role/resource/action/record/field vocabulary; every unknown combination denies; role matrix matches AUTH-03/04/09. |
| D1 schema/migrations | Wrangler local D1 + Vitest/Node harness | Fresh migration, repeat listing, constraints, roster bootstrap, exactly one active super-admin, append-only writes, 365/30/ephemeral retention selection. |
| Worker auth boundary | Worker integration tests | Missing, malformed, wrong-issuer, wrong-audience, expired, and forged JWTs deny; valid JWT still denies absent/inactive/unknown D1 roles; every request performs a D1 lookup. |
| Next.js server boundary | Vitest contracts + production build | Direct Vercel `/ops`, RSC, route handler, server function, prefetch, DTO, export, and error paths cannot bypass the trusted edge/DAL. |
| Browser lifecycle/UI | Playwright | Anonymous/expired/inactive/editor/admin/super-admin journeys; state clearing; focus-safe recovery/logout; keyboard and 320/768/1440 behavior; explicit unavailable states. |
| Cache/DTO isolation | Sequential and concurrent HTTP probes | No protected response is public-cacheable; no identity, role, environment, field, RSC, error, or export mixing. |
| Audit behavior | D1 integration + export parser | Required events and envelope fields, prohibited-payload scan, administrative visibility, CSV formula defense, audited export, audited atomic purge. |
| Environment boundary | Static verifier + sanitized runtime preflight | Distinct D1, Access app/audience, secret names, cache namespaces; no protected preview binding; no committed credentials or numeric IDs. |
| Release gate | Aggregate Node runner + CI | Fail-fast deterministic sections, persistent evidence packet, owner approval marker, rollback/runbook rehearsal, read-only production smoke. Any failed/unknown section exits nonzero. |

### Minimum authorization matrix

Every protected page/API/query/export/field/cache test matrix must include:

- anonymous;
- forged/malformed/wrong-audience/expired Access token;
- valid Access identity missing from D1;
- inactive operator;
- unknown role record;
- `editor`;
- `admin`;
- `super_admin`;
- tampered record ID/field/action/environment;
- direct Vercel-origin request and preview deployment without protected bindings.

### Nyquist sampling rule

Every implementation plan must provide a fast task-level command that proves its new artifact immediately. The phase aggregate remains the final authority, but tasks may not defer all feedback to the final plan. Each plan must name the exact test file and command it adds or updates.

### Promotion and live-safety rule

- Local migration and tests run against an ephemeral, task-specific Wrangler persistence directory.
- Staging migration/setup requires explicit `--env staging --remote` and produces a sanitized receipt with names, migration versions, and distinctness hashes only.
- Production migration/deployment remains blocked until the staging evidence packet is complete and owner-approved.
- The production smoke test is read-only and exact-host allowlisted; it must not create operators, export data, purge data, mutate settings, register policies, rotate secrets, or deploy.
- No test may copy production D1 data downward.

### Expected aggregate sections

1. planning/source coverage and locked-decision checks;
2. package/type/lint/build checks;
3. D1 migration/schema/invariant checks;
4. Access JWT and D1 authorization matrix;
5. shared policy/DTO/field/error checks;
6. client state, expiry, recovery, and logout checks;
7. audit event, export, retention, and purge checks;
8. environment, secret, preview, and cache isolation checks;
9. Control Room truth/accessibility/responsive checks;
10. rollback and runbook rehearsal;
11. privacy/security scan and persistent threat ledger;
12. staging evidence packet and owner approval gate;
13. read-only exact-host production smoke gate.

### Blocking threat classes

Security enforcement is enabled at ASVS level 1 and blocks high-severity threats. Plans must include threat-model entries for authentication bypass, origin/header spoofing, privilege escalation, super-admin invariant failure, ID/field tampering, DTO/RSC/error leakage, cache confusion, audit injection/tampering, CSV injection, open redirect, cross-environment binding, secret exposure, and production-write probes.
</validation_architecture>

<sources>
## Sources

### Primary (HIGH confidence)
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ — application JWT header, remote JWKS, issuer, audience, and signature validation.
- https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/ — Access token lifetimes, revocation behavior, and application/team logout URLs.
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/ — default-deny Access policies, action precedence, Service Auth, and Bypass risks.
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/ — protected application path specificity and policy inheritance.
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/ — self-hosted public hostname protection in front of an Internet origin.
- https://developers.cloudflare.com/d1/reference/migrations/ — ordered repository migration files and binding/database targeting.
- https://developers.cloudflare.com/d1/wrangler-commands/ — explicit local/remote/environment migration commands and rollback behavior.
- https://developers.cloudflare.com/d1/configuration/environments/ — distinct D1 bindings per environment.
- https://developers.cloudflare.com/d1/best-practices/local-development/ — local-only D1 and isolated persistence behavior.
- https://developers.cloudflare.com/d1/worker-api/d1-database/#batch — ordered transactional batch and rollback semantics.
- https://developers.cloudflare.com/d1/best-practices/use-indexes/ — unique and partial index support and query-plan verification.
- https://developers.cloudflare.com/d1/sql-api/foreign-keys/ — D1 foreign-key enforcement.
- https://developers.cloudflare.com/workers/wrangler/environments/ — non-inheritable bindings, variables, and secrets; secret-file rules.
- https://developers.cloudflare.com/workers/configuration/cron-triggers/ — scheduled handler, UTC execution, local trigger test route, and Wrangler-owned schedules.
- https://nextjs.org/docs/app/guides/authentication — secure authorization in a DAL/DTO layer and independent server-function checks.
- https://nextjs.org/docs/15/app/guides/data-security — server-only modules, minimal data projection, and server/client trust boundaries for the repository's Next.js major.
- https://nextjs.org/docs/app/guides/caching-without-cache-components — Next.js 15-style dynamic rendering and no-store cache controls.

### Repository evidence (HIGH confidence)
- `.planning/phases/02-platform-foundation-authenticated-policy-boundary/02-CONTEXT.md` — locked owner decisions.
- `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` — Phase 2 requirement IDs and release criteria.
- `.project/HANDOFF.md` — roster, resolved prerequisites, and superseded-draft warnings.
- `cloudflare/src/index.ts`, `cloudflare/src/db.ts`, and `cloudflare/wrangler.jsonc` — current Worker/D1 seams and unsafe draft behavior.
- `web/lib/auth.ts`, `web/lib/auth/session.ts`, `web/lib/auth/capabilities.ts`, `web/lib/auth/policies.ts`, and `web/middleware.ts` — current decode-only, header-trusting, second-cookie, incomplete-role, and allow-fallback drafts to replace.

### Secondary/Tertiary
- None. Implementation recommendations were checked against official provider/framework documentation and current repository evidence.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Cloudflare Access, Workers, D1, Wrangler, Next.js 15 App Router.
- Ecosystem: `jose`, Vitest, Playwright, Worker Cron Triggers.
- Patterns: two-stage authentication/authorization, request-scoped policy, typed audit ledger, atomic transfer/purge, no-store protected boundary, explicit environment promotion.
- Pitfalls: JWT/header spoofing, middleware-only auth, privilege and field tampering, cache mixing, audit payload leakage, environment drift, logout lag.

**Confidence breakdown:**
- Standard stack: HIGH — provider/framework docs plus installed repository versions.
- Architecture: HIGH — directly follows locked decisions and official boundary guidance.
- D1 invariants: HIGH for transaction/index behavior; MEDIUM until migrations run against current Wrangler local D1.
- Account provisioning: MEDIUM — exact hostnames, IDs, and audiences intentionally remain outside source control.
- UI implementation: BLOCKED pending the required Phase 2 UI design contract.

**Research date:** 2026-08-26
**Valid until:** 2026-09-02 for provider/framework details; locked repository decisions do not expire.
</metadata>

---

*Phase: 02-platform-foundation-authenticated-policy-boundary*
*Research completed: 2026-08-26*
*Ready for planning: after UI-SPEC gate*

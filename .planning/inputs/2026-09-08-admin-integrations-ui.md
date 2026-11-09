# Admin integrations and analytics UI plan

Status: local implementation only; external provider and Cloudflare mutations
remain held.

## Goal

Give a verified operator a coherent settings surface for the future AI model
route and YouTube Analytics adapter without making browser state, a typed API
key, or a mock dashboard look like live provider authority.

## Boundaries

- Public Alpha remains unchanged and anonymous.
- The UI is rendered under the existing Clerk + D1 operator shell.
- `admin` and `super_admin` may edit the local policy draft; `editor` receives
  a read-only projection.
- Raw credentials are write-only in the form and are never placed in React
  state after the local staging action completes.
- KV is represented as a redacted configuration/health projection only. Raw
  credentials belong in Worker Secrets or approved OAuth custody; this pass
  does not write either.
- YouTube production connectivity remains OAuth-first per the existing adapter
  contract. The API-key path is a local preview state, not a live claim.

## UI slices

1. **AI provider policy** — global primary model, ordered fallback list, add,
   remove, reorder, write-only credential field, local test/save states, role
   gating, and storage/audit readback.
2. **YouTube Analytics connection** — read-only connection scope, write-only
   local preview key, not-configured/verifying/connected/revoked/error states,
   and a clearly labelled fixture dashboard that appears only after the local
   connection preview is enabled.
3. **Settings integration** — keep the existing session, memory, RAG, and
   operator panels; place provider and analytics controls in the same semantic
   WTF card system and link them from the readiness ledger.

## Rework: nested settings information architecture

The first implementation placed every panel on `/ops/settings`, which made the
route a long, undifferentiated control surface. The accepted shape is now a
Settings directory plus dedicated child workspaces:

| Route | Owner | Read boundary | Mutation boundary |
| --- | --- | --- | --- |
| `/ops/settings` | directory | verified operator | none |
| `/ops/settings/readiness` | Beta readiness ledger | verified operator | none |
| `/ops/settings/release` | release control | verified operator | super-admin server gate |
| `/ops/settings/ai` | global AI route | verified operator | admin or super-admin |
| `/ops/settings/analytics` | YouTube Analytics | verified operator | admin or super-admin |
| `/ops/settings/sessions` | session/history policy | verified operator | none |
| `/ops/settings/memory` | memory governance | verified operator | none until activation |
| `/ops/settings/sources` | RAG/source receipt | verified operator | none |
| `/ops/settings/access` | operator access | admin or super-admin | server-authorized admin action |

The operator account is a separate workspace rather than another settings
section:

| Route | Owner | Read boundary | Backend readback |
| --- | --- | --- | --- |
| `/ops/profile` | operator profile | verified operator | `GET /ops/api/profile` returns the safe Clerk-to-active-D1 projection |

The profile affordance opens `/ops/profile`; the settings affordance opens
`/ops/settings`. The profile page maps the verified role to the same nested
settings contract, while the edge policy remains authoritative for every
route. Identity fields are read-only, raw Clerk claims are not projected, and
logout remains only in the root Settings account section. If the local edge
binding is unavailable, the page stays useful but labels its contextual values
as local preview rather than presenting unverified account data.

Utility placement is deliberate: profile, display theme, and Settings are
disclosure-only shell actions. The fixed bottom pill is reserved for primary
workspace destinations; no account or settings action is duplicated there.

The nested layout owns the settings navigation and local route-denied state.
The Settings navigation is a directory only: it does not carry request-context
metadata or account actions. Verified environment, workspace, organization
scope, effective role, and last-verification evidence belong inside the
protected `/ops/settings/access` workspace alongside the roster boundary. The
edge policy remains the authority: settings children require
`control_room:read`, while the access child requires `operators:read`. The
page-level controls remain a projection and never replace server checks.

## Acceptance

- Every status is explicit: local fixture, not configured, pending, connected,
  revoked, or unavailable.
- No component renders a raw key, provider payload, or unverified live claim.
- Model fallback ordering is keyboard-operable and does not duplicate the
  primary route.
- YouTube metrics identify themselves as fixture data and retain window,
  source, and freshness labels.
- Editor controls are disabled without leaking write affordances.
- `/ops/settings` is a directory rather than a panel dump; each child route
  renders one focused workspace and the access child is absent from editor
  navigation.
- Unit/contract, typecheck, lint, build, privacy, and diff checks pass.

---
phase: 2
slug: platform-foundation-authenticated-policy-boundary
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-26
---

# Phase 2 — UI Design Contract

> Visual and interaction authority for the first authenticated WTF operator boundary. This contract is bounded to the Phase 2 Control Room, operator administration, audit review/export, sign-out, and non-leaking recovery experience. It does not activate Phase 3 workflow data or authorize implementation/deployment.

---

## Contract Authority

This specification resolves the UI safety gate using:

- `DESIGN.md` as the repository-wide experience and visual authority;
- `PRODUCT.md` as the fixed brand identity and voice authority;
- `02-CONTEXT.md` as the locked Phase 2 product-policy authority;
- `02-RESEARCH.md` as the current Access, D1, Next.js, cache, and lifecycle implementation guidance;
- the owner-approved Phase 1 token, primitive, accessibility, responsive, visual, and rollback evidence;
- owner approvals recorded in the Phase 2 discussion and this UI-phase conversation.

If this document conflicts with an authentication, authorization, audit, retention, environment, privacy, or production-gate decision in `02-CONTEXT.md`, the context decision wins and the UI must fail closed.

## Approved Design Decisions

1. The first `/ops` rail shows only destinations that are both role-authorized and actually activated.
2. Future modules appear in the Control Room as explicit `not activated` service states, never as disabled or misleading navigation.
3. The dominant action is role-specific: `super_admin` and `admin` receive **review operator access**; `editor` receives **open Ask WTF**. Status refresh is secondary for all roles.
4. The shell uses the editorial Control Room direction: persistent ink rail, warm cream paper workspace, restrained texture, strong Bricolage hierarchy, factual status ledger, and one yellow command.
5. Recovery clears protected client state before rendering and uses one non-leaking shell with only validated reauthentication/public escape routes.
6. Status is live-derived on page load and refreshed manually; it never fabricates health or updates distractingly in the background.
7. Desktop uses a persistent 240px rail. Below 1024px, navigation moves to an accessible drawer. At 320px, the interface is one column with full-width primary actions and no page overflow.

---

## Design System

| Property | Value |
|---|---|
| Tool | Repository-owned components; no shadcn initialization |
| Preset | Not applicable |
| Component library | Selective Radix primitives beneath WTF styling; existing native elements remain preferred where sufficient |
| Data table model | Existing semantic table/list patterns; TanStack Table only if a later plan proves sorting/filtering complexity needs it |
| Icon library | Phosphor at one normalized weight, plus repository-owned WTF wordmark/sparkle glyphs |
| Display font | Bricolage Grotesque 700–800 |
| Editorial font | Fraunces 400–600, quotations and short editorial emphasis only |
| Product UI font | Poppins 400–600 |
| Technical identifiers | System monospace stack, only for correlation IDs and bounded technical identifiers |

The default shadcn visual layer is prohibited. Radix may supply behavior, focus management, and ARIA semantics, but every visible surface consumes WTF semantic tokens and repository-owned composition.

---

## Spacing Scale

Declared values follow the existing 4px rhythm:

| Token | Value | Usage |
|---|---:|---|
| `space-1` | 4px | Icon/label separation and micro alignment |
| `space-2` | 8px | Compact row and inline control gaps |
| `space-3` | 12px | Compact control padding and dense status rows |
| `space-4` | 16px | Default control and mobile panel padding |
| `space-6` | 24px | Workspace section spacing and desktop panel padding |
| `space-8` | 32px | Major internal layout gaps |
| `space-12` | 48px | Page-section breaks and recovery composition |
| `space-16` | 64px | Large brand moment separation |
| `space-24` | 96px | Reserved for wide-screen empty composition only |

**Exceptions:** none. Hairlines and 2px ink borders are structural measurements, not spacing tokens.

### Shape and depth

| Token | Value | Contract |
|---|---:|---|
| `radius-control` | 8px | Buttons, inputs, filters, compact disclosures |
| `radius-panel` | 12px | Status ledger and bounded recovery panels |
| `radius-card` | 16px | Only when a real movable/media object warrants a card |
| `radius-pill` | 999px | Status chips and compact actions only |
| Operator shadow | none by default | Use ink borders/dividers and spacing for grouping |
| Brand offset | 4–6px ink | Reserved for the wordmark or one true brand/action object, never every panel |

---

## Typography

| Role | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| Metadata label | 11px | 600 | 1.35 | Environment, role, compact status metadata; uppercase with `0.08em` tracking |
| Dense row | 13px | 400–600 | 1.45 | Operator and audit rows; never long prose |
| Body | 16px | 400 | 1.5 | Default instructions, state explanations, controls |
| Lead | 19px | 400–500 | 1.45 | One short Control Room or recovery explanation |
| Panel title | 23px | 700 | 1.2 | Status and administration sections |
| Section title | 28px | 700 | 1.15 | Operators and Audit page titles |
| Page heading | 34px | 700–800 | 1.1 | Protected page heading on tablet/mobile |
| Control Room display | `clamp(40px, 6vw, 72px)` | 800 | 0.95 | Desktop Control Room brand moment only |

Rules:

- Bricolage owns display/headings; Poppins owns controls, tables, labels, and status; Fraunces is absent from tables/buttons/navigation.
- Numeric audit times and bounded counts use tabular numerals.
- Page headings use balanced wrapping; prose is limited to 65ch.
- The wordmark is the existing repository brand asset, not reconstructed through arbitrary shadows.

---

## Color

| Role | Semantic token/value | Usage |
|---|---|---|
| Dominant field (60%+) | `canvas` / `#FFF6EA` | Page background and paper field |
| Structural secondary (up to 30%) | `foreground` / `#1A1A1A` | Persistent rail, text, borders, dividers, drawer |
| Raised/subtle surfaces | `surface-raised`, `surface-subtle` | Status ledger rows, form grouping, filters, unavailable states |
| Primary accent (under 10%) | `attention` / `#F1B333` | One dominant action, active selection, due attention |
| Destructive/editorial | `editorial` / `#C53B3A` | Deactivation, destructive confirmation, critical failure only |
| Healthy indicator | `live` / `#0C9367` | Dot/border beside ink text; never a filled text background |
| Knowledge scope | `knowledge` / `#6758A5` | Ask WTF destination and evidence-related scope only |
| Information | `information` / `#2D6BE0` | Links, neutral information, environment detail |
| Production warning | `production` / `#F07633` | In-progress/warning only if the state actually exists |

Accent is reserved for the role-specific dominant action, active navigation, one bounded selection, and state semantics that are genuinely present. Red is never ordinary navigation. Purple never becomes an AI glow. Status meaning always includes visible text and structure.

---

## Information Architecture

### Activated Phase 2 destinations

| Destination | Route | `super_admin` | `admin` | `editor` | Navigation treatment |
|---|---|---:|---:|---:|---|
| Control Room | `/ops` | visible | visible | visible | Primary rail destination |
| Operators | `/ops/operators` | visible | visible | absent | Activated administration destination |
| Audit | `/ops/audit` | visible | visible | absent | Activated administrative evidence destination |

Sign out is a utility action at the bottom of the rail/drawer, not a destination. Public catalogue and Ask WTF are clearly labelled exits to the public surface, not operator navigation peers.

No standalone Settings destination is activated in Phase 2. Retention and environment separation are locked deployment policy, not editable form values. If a future phase activates settings, it must receive its own policy and UI contract.

### Future modules

Episodes, Knowledge, Production, Analytics, People, and Integrations may appear only inside the Control Room status ledger with the visible state **not activated**. They are not links, buttons, disabled rail items, or teaser cards. The row explains that the workflow is not active and offers no action unless a later approved phase activates one.

### Rail hierarchy

1. WTF wordmark and protected `operations` label.
2. Activated role-authorized navigation only.
3. Environment/workspace/role context summary.
4. Public-surface exit where useful.
5. Sign out utility.

`aria-current="page"`, a structural marker, and text weight communicate the active destination; color alone never does.

---

## Shell Layout Contract

### Wide desktop (1024px and above)

- 240px fixed/persistent ink rail.
- Cream workspace fills the remaining viewport with a maximum inner content width of 1400px.
- A top context strip exposes environment, workspace, organization scope, effective role, and last verified time using live request data.
- Control Room display title and one short lead appear before the primary action.
- Status is a single factual ledger, not a grid of equal feature cards.
- Main content has a persistent skip target and receives focus after route navigation.

### Tablet and mobile (below 1024px)

- Replace the persistent rail with a compact sticky ink header.
- The menu button has an explicit accessible name and 44px target.
- Open navigation uses one modal drawer with focus containment, Escape close, backdrop dismissal only when safe, and focus restoration to the menu button.
- The drawer shows the same authorized/activated destinations as desktop; it does not reveal hidden destinations.

### Narrow mobile (320px)

- Single-column layout.
- Context fields stack as labelled values; none truncate the environment, workspace, organization scope, or effective role.
- Primary action is full width; secondary refresh/public-exit actions follow in source order.
- Status ledger rows stack label, state, evidence time, explanation, and action without horizontal scrolling.
- Operator and audit tables transform into semantic record lists rather than clipped tables.

---

## Screen Contracts

### 1. Control Room — `/ops`

#### Required content

- Eyebrow: **run the show from the source**
- Heading: **control room**
- Verified context: environment, workspace, organization scope, effective role, and last verification time. Any unverified organization value renders as explicit **unknown**, never an inferred name.
- Authorized navigation derived from the shared server policy.
- One role-specific dominant action.
- Live-derived service-status ledger.
- Manual **refresh status** secondary action.
- Public-safe sign out and catalogue exit.

#### Role-specific dominant action

| Role | Label | Destination | Visual treatment |
|---|---|---|---|
| `super_admin` | **review operator access** | `/ops/operators` | Single yellow filled command with ink text |
| `admin` | **review operator access** | `/ops/operators` | Single yellow filled command with ink text |
| `editor` | **open Ask WTF** | `/chat` | Single yellow filled command with ink text; a bounded purple knowledge glyph may accompany the label, never replace it |

#### Truthful empty copy

- Heading: **the room is open**
- Body: **your access is verified. workflow systems will appear here when they are activated.**
- Never show `0 episodes`, `0 tasks`, `all systems operational`, simulated users, or decorative charts.

#### Status ledger rows

Phase 2 may expose only status it can observe now:

- **operator access** — verified, unavailable, or verification unavailable;
- **audit ledger** — available/permission-denied/unavailable, visible only when its existence is safe for the current role;
- **workflow systems** — named approved modules with `not activated` only;
- **public catalogue** — reachable/unavailable only if a live non-mutating check exists.

Every row includes a visible state label, a plain-language explanation, and an observed time or explicit **not observed** value. No provider/model/resource identifier reaches the browser.

### 2. Operators — `/ops/operators`

#### Access

- `super_admin` and `admin` only.
- Editors receive no navigation link, prefetch, RSC payload, page title, record count, or role-specific error detail.

#### List fields

- Name.
- Normalized email.
- Application role.
- Active/inactive status.
- Last role/status change time where recorded.

Job titles are not displayed as authority. Unknown roster metadata is not filled with guesses. The list uses semantic rows at desktop and labelled record groups at 320px.

#### Actions

- Invite an approved operator as `admin` or `editor`.
- Deactivate/reactivate an `admin` or `editor` where policy permits.
- Change `admin`/`editor` role where policy permits.
- Transfer the sole `super_admin` seat, visible only to the current `super_admin`.

The current super-admin cannot be deactivated or demoted through generic controls. Seat transfer is a separate, explicit flow that names the target active operator, states that ownership changes immediately, and records the handoff.

Invitation approval is a server policy result, not an email-suffix guess. The UI neither treats every `@allthingswtf.com` address as approved nor invalidates the owner-approved existing external roster entry. A denied invite receives safe account-policy copy without enumerating allowed accounts or domains.

#### Destructive confirmation copy

- Deactivation title: **deactivate operator?**
- Body: **they will lose operator access on their next protected request. this action is recorded.**
- Primary destructive action: **deactivate operator**
- Cancel: **keep active**

- Transfer title: **transfer the super admin seat?**
- Body: **this makes {target email} the single super admin and records the handoff.**
- Primary destructive action: **transfer seat**
- Cancel: **keep current owner**

No optimistic success is shown before the server returns the new effective invariant. After success, the UI refreshes the current operator context; if the initiating operator lost `super_admin`, their navigation updates immediately.

### 3. Audit — `/ops/audit`

#### Access

- `super_admin` and `admin` only.
- Editors receive no navigation, prefetch, aggregate count, filters, export affordance, or audit-specific denial copy.

#### Ledger fields

- Timestamp.
- Actor or approved pseudonymous subject label.
- Effective role.
- Action.
- Entity type and allowlisted identifier.
- Outcome.
- Environment.
- Correlation ID (monospace, copyable).

Raw prompts, queries, responses, tokens, private payloads, unrestricted metadata, secret fragments, and provider bodies are never rendered.

#### Filters and export

- Filters: bounded time range, action, outcome, effective role, and environment.
- Filters use closed select/date controls, not a raw query language.
- **export audit records** is a secondary administrative action, never the page's dominant command.
- Export confirmation states the active filters and that the export itself is audited.
- The success message confirms only that an allowlisted export was prepared; it does not echo row contents.

#### Empty and unavailable states

- Measured empty: **no audit records match these filters** only after a successful query returns zero.
- Unavailable: **audit records are unavailable right now** with retry.
- Permission denial uses the shared non-leaking recovery boundary rather than rendering partial ledger chrome.

### 4. Recovery and sign-out — outside the protected shell

Protected navigation, operator identity, role, prior content, cached rows, and pending responses are removed before this UI renders.

#### Reauthentication state

- Heading: **let’s verify your access**
- Body: **protected workspace data has been cleared. sign in again to continue.**
- Primary action: **sign in again**
- Secondary action: **return to the catalogue**
- Preserve only a validated same-origin path equal to `/ops` or beneath `/ops`.

#### Repeated D1 denial

- Heading: **operator access unavailable**
- Body: **we could not open the operator workspace. contact the owner if you believe you should have access.**
- Action: **return to the catalogue**

The screen does not distinguish missing, inactive, unknown-role, revoked, or policy-denied records.

#### Verification infrastructure unavailable

- Heading: **verification unavailable**
- Body: **we could not safely verify operator access. no protected workspace data was loaded.**
- Primary action: **try again**
- Secondary action: **return to the catalogue**

#### Sign out

- Client state clears before navigation to Cloudflare Access logout.
- The transitional UI says **signing out** and contains no protected context.
- If navigation fails, show the verification-unavailable recovery state; never restore protected client state.

---

## State Vocabulary

| State | Visible label | Meaning | Allowed action |
|---|---|---|---|
| `verified` | verified | A live request proved the current boundary | none or refresh status |
| `unknown` | unknown | No trustworthy observation exists | refresh status |
| `offline` | offline | The client has no network path | retry after connection returns |
| `unavailable` | unavailable | The service could not provide safe evidence | retry |
| `permission-denied` | access restricted | Policy does not allow this safe, known surface | catalogue exit/contact owner only |
| `not-activated` | not activated | An approved future module has no active Phase 2 workflow | no action |
| `measured-zero` | no matching records | A completed query returned zero | change filters |
| `error` | something went wrong | A safe operation failed without protected details | retry or cancel |

`measured-zero` is prohibited for service health and future modules. `not-activated` is not a disabled control. State changes announce through a polite live region only after an explicit user action such as refresh, filter, export, transfer, or retry.

---

## Interaction and Motion Contract

- Hover/focus/press feedback: 120ms.
- Disclosure/filter changes: 200ms.
- Drawer/dialog transitions: at most 320ms.
- Only transform and opacity animate unless a measured exception is approved.
- No `transition: all`.
- No marquee, pulsing/breathing status, auto-sorting list, animated metric, custom cursor, or perpetual background motion appears in `/ops`.
- Loading uses layout-matched rows/skeletons and preserves control width.
- Reduced motion removes all loops and shortens large transitions to immediate or brief fades.
- Refresh is manual; status does not reorder or change focus after completion.
- Success/error feedback is visible, text-based, and announced once.

---

## Accessibility Contract

- A skip link is the first focusable element and targets the protected main content.
- Route changes move focus to the page heading without scrolling content behind the fixed rail/header.
- Navigation exposes a visible text label in the rail/drawer; icon-only primary navigation is prohibited.
- Every control has a 44px minimum pointer target.
- Focus-visible uses the existing two-layer high-contrast treatment and is never removed.
- Drawer/dialog focus is contained while open; Escape closes; focus returns to the invoking control.
- Destructive dialogs place initial focus on the safe cancel action.
- Tables use semantic headers at desktop; responsive record groups preserve equivalent label/value relationships.
- Status, errors, and permissions use text plus structure, not color/icon alone.
- Live regions are polite for routine results and assertive only when immediate security recovery is required.
- Offline, unknown, unavailable, empty, and permission-denied states keep their actions keyboard reachable.
- Automated axe checks are necessary but not sufficient; keyboard order, focus restoration, zoom/reflow, and screen-reader announcements require explicit Playwright assertions.

---

## Responsive Evidence Matrix

| Viewport | Required capture/state |
|---:|---|
| 320px | Editor Control Room; admin Control Room; drawer open; recovery; operator record list; audit record list/export confirmation |
| 768px | Editor/admin Control Room; drawer open; Operators; Audit filtered empty; verification unavailable |
| 1440px | Editor/admin/super-admin Control Room; persistent rail; Operators transfer confirmation; Audit ledger/export confirmation; recovery |

Each candidate uses deterministic fixtures with synthetic identities and allowlisted audit values. No production operator data, Access tokens, account IDs, secret values, raw queries, prompts, responses, or private payloads enter snapshots.

The visual gate compares only fixtures whose authorization result is known. An unknown or failed authorization setup blocks capture rather than generating a misleading logged-out or empty baseline.

---

## Privacy, Authorization, and Cache Presentation Rules

- The UI consumes a server-projected operator context and never decodes Access tokens in client code.
- Hidden navigation is not enforcement; direct requests still pass through the shared server policy.
- Unauthorized pages do not render titles, counts, breadcrumbs, skeletons, RSC payloads, prefetches, or entity-specific errors.
- Client state stores only the minimal visible context and is cleared on expiry, revocation, deactivation, sign out, policy denial, and environment mismatch.
- Protected responses and fetches are `private, no-store`; the UI never presents stale protected content during re-verification.
- Public and operator components do not share client caches or query keys.
- Correlation IDs may be displayed only in bounded audit/error contexts; they are not user identifiers.
- Environment, workspace, organization scope, and role are visible because they are verified context; provider/resource/account identifiers remain server-side.

---

## Component Contracts

| Component responsibility | Required states | Existing seam |
|---|---|---|
| `OperatorShell` | desktop rail, compact header, drawer open/closed, role navigation, sign-out pending | Reuse skip/focus patterns from `PublicShell`; do not reuse public footer/marquee/pointer accent |
| `OperatorNav` | active, inactive-by-absence, desktop, drawer | Adapt `PublicNav` active semantics; protected destinations are a server projection |
| `OperatorContextStrip` | verified, verification unavailable | New; uses labelled values and tabular verification time |
| `ControlRoomStatusLedger` | verified, unknown, unavailable, permission-denied, not-activated, refreshing | Extend `AvailabilityState` vocabulary without fabricating zeroes |
| `OperatorRoster` | loading, populated, measured empty, filtered, error | New semantic table/record-list pair |
| `OperatorActionDialog` | invite, role change, deactivate, reactivate, transfer, submitting, safe failure | Build on accessible dialog primitives and native form controls |
| `AuditLedger` | loading, populated, filtered zero, unavailable | New semantic table/record-list pair |
| `AuditExportDialog` | filtered scope, preparing, success, safe failure | New; export action and outcome are audited |
| `AccessRecovery` | reauthenticate, operator unavailable, verification unavailable, sign-out pending | New public-safe component outside protected shell |

Every component has deterministic stories/fixtures for default, focus-visible, loading, empty/unknown, error/unavailable, disabled where legitimate, and permission-restricted states. A disabled state cannot substitute for absent unauthorized navigation.

---

## Copywriting Contract

| Element | Approved copy |
|---|---|
| Product eyebrow | **run the show from the source** |
| Page title | **control room** |
| Admin primary CTA | **review operator access** |
| Editor primary CTA | **open Ask WTF** |
| Secondary status action | **refresh status** |
| Truthful empty heading | **the room is open** |
| Truthful empty body | **your access is verified. workflow systems will appear here when they are activated.** |
| Future module state | **not activated** |
| Recovery heading | **let’s verify your access** |
| Recovery primary action | **sign in again** |
| Recovery secondary action | **return to the catalogue** |
| Repeated denial heading | **operator access unavailable** |
| Infrastructure failure | **verification unavailable** |
| Deactivation confirmation | **deactivate operator?** |
| Ownership confirmation | **transfer the super admin seat?** |
| Audit export action | **export audit records** |

Copy remains short, lower-case where brand-appropriate, exact about what was observed, and free from internal provider/model vocabulary. Vague actions such as `continue`, `submit`, `manage`, and `learn more` are prohibited where a concrete verb is available.

---

## Registry Safety

| Registry | Blocks used | Safety gate |
|---|---|---|
| shadcn official | none | Not applicable; do not initialize shadcn |
| Third-party registries | none | Prohibited without separate owner review and source diff |
| Radix packages | Existing dialog primitive; additional primitives only through reviewed package plan | Package/version legitimacy and repository styling review |
| Phosphor | One reviewed icon package if plans require it | Pin version; verify accessible names and avoid decorative dependency sprawl |

No remote registry block, generated theme, or copied dashboard template is authorized by this contract.

---

## Out of Scope

- Episode ingestion, transcript workspace, production board, internal Knowledge/Ask WTF workspace, analytics dashboard, people CRM, contracts, payments, publishing, clip library, budgets, large files, travel, credentials, and integrations workflows.
- Fake demonstrations of those modules.
- Editable audit-retention settings.
- Production deployment, Access application creation, D1 provisioning, secret rotation, account migration, or live policy mutation.
- Public catalogue redesign beyond the approved link/exit seams.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-26 after owner design-gate decisions and inline six-dimension checker verification

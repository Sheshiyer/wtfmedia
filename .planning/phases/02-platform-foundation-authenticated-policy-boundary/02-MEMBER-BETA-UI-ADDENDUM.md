---
phase: 2
scope: member-beta-workspace
status: approved-addendum
---

# Phase 2 Member Beta UI Addendum

This addendum applies to the authenticated member Ask WTF and Settings
workspace. It does not change the operator Control Room contract in
`02-UI-SPEC.md` and grants no administrative capability.

## Public Alpha visual baseline

Public Alpha is the visual authority for Member Beta. Beta extends the same
WTF OS shell, wordmark, warm cream/ink palette, semantic accent tokens,
editorial typography, bordered panels, focus language, and responsive product
navigation. Authentication, private conversation routing, history, memory, and
member Settings are additive capabilities inside that system; they do not
license an alternate dashboard aesthetic or a visual reset.

The retired `/beta/preview` fixture is not a design reference, route, fallback,
demo, or acceptance substitute. Visual acceptance uses the real authenticated
staging lane in the Codex in-app browser and compares it directly with Public
Alpha.

## Workspace information architecture

`/beta` is the new-chat entry and `/beta/chat/[conversationId]` is the
canonical selected-conversation route. Reload, back/forward navigation, and
internal links derive selection from the URL rather than component-only state.
The route is always nested beneath the existing operator-first Clerk-to-D1
member gate; children never mount while that admission is unresolved or after
the authenticated identity changes.

Desktop uses a persistent 240px conversation rail inside the Ask WTF
workspace. Below 1024px the rail becomes a labelled modal drawer. The trigger
has a 44px target, Escape/backdrop close the drawer, focus stays inside while
open, and close restores focus to the trigger. Conversation navigation and the
sticky composer must not overlap the bottom product pill at 320px width or a
710px-tall viewport.

The bottom pill contains only Ask WTF and Settings. The hamburger groups
active Beta destinations separately from explicit Public Alpha exits. It never
lists `/beta/ops`, operator Settings, disabled future modules, or individual
conversations.

## Ask WTF screen contract

The new-chat state shows a safe greeting using `firstName`, then the first
display segment of `fullName`, then `Welcome to your workspace`. Email,
provider subject, member ID, role, issuer, D1 state, and raw claims never become
the heading or member-facing copy.

The small `Your workspace` guide names three benefits: source-backed answers,
private history, and preferences the member deliberately saves. Conversation
threads reuse the established source panel and never present prior chat or
memory as transcript evidence.

Loading names the user action without naming infrastructure. Empty history
invites a first question. Access denial remains non-enumerating. Failed turns
stay attached to their canonical conversation with an explicit same-question
retry. A late request may update only the route that originated it; switching,
unmounting, or signing out invalidates stale responses and navigation.

Request state is separated by concern: conversation loading, answer generation,
archive, pagination, and memory operations do not share one global busy flag.
The session navigator exposes new chat, current selection, load more, empty,
loading, error, and retry states. A successful mutation refreshes list order;
pagination de-duplicates mutable cursor pages.

## Route and navigation contract

The Settings surface is route-local and must remain injectable beneath the
existing member access boundary:

| Destination | Route | Treatment |
|---|---|---|
| Account | `/beta/settings` | read-only account overview |
| Memory | `/beta/settings/memory` | explicit preferences and archive |
| Sessions | `/beta/settings/sessions` | history and privacy guidance |
| Appearance | `/beta/settings/appearance` | existing color-theme control |

`MemberSettingsNavigation` exposes only these four member destinations. It
uses `aria-current="page"`, visible text, and a structural border/background
marker for the active route. No Settings component renders a hidden admin link,
role control, infrastructure identifier, or third-party integration.

The route-local layout provides a labelled return to Ask WTF, a responsive
Settings navigation, and a single main landmark. It must remain usable at 320px
without horizontal overflow; at wider sizes the navigation may sit beside the
content. A future shared member shell may inject this layout without changing
the route contracts.

## Screen contracts

### Account

The account overview is read-only. It may show a safe display name and active
account status. The heading uses `Welcome back, {firstName}` when a first name
is available and a neutral fallback otherwise. It never uses an email address,
account identifier, role, or claim as the primary heading.

### Memory

The memory page clearly distinguishes saved preferences from session history.
It reads active preferences from the existing owner-scoped member endpoint,
limits display/save content to 2,000 characters, and provides archive-only
lifecycle control. Loading, unavailable, empty, and ready states are visible.

The optional import prompt is presentation-only and local:

1. Copy a short prompt for use elsewhere.
2. Paste the resulting text into the browser.
3. Parse bounded bullet/numbered lines locally.
4. Edit or review each candidate.
5. Save candidates one at a time with an explicit action.

Parsing, editing, and reviewing never write data. No automatic extraction,
background save, outbound assistant call, or bulk save is permitted. The save
callback is injected by `MemoryPreferencesPanel`, making the prompt testable
without a network or external integration.

### Sessions and privacy

This page explains that private sessions remain separate from public Alpha,
that archive removes a session from active history, and that no destructive
delete control is offered here. It contains guidance only; it does not expose
operator controls or internal storage details.

### Appearance

The page reuses the existing `ThemeToggle` and its device-local preference
mechanism. It does not introduce a second theme state, provider, integration,
or account-setting API.

## Accessibility and state gates

All interactive elements use native links, buttons, labels, and textareas with
visible focus rings and 44px minimum action targets. Each async state has a
visible status or safe recovery message. Candidate save buttons become
disabled only for the candidate that has completed its explicit save; editing
another candidate remains possible.

The deterministic web unit contract is:

- `npm --prefix web run test:unit -- member-settings member-memory-import`
- `npm --prefix web run typecheck`
- `npm --prefix web run lint`

These checks establish route registry, member-safe copy, bounded local parsing,
active-record projection, and per-candidate save wiring. They do not establish
authenticated staging access, cross-account denial, or browser visual
acceptance; those remain user/staging gates in the open-enrollment plan.

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

The source authority is not inferred from the current Beta copy of these
components. `origin/release/alpha` at `e86923b` owns the named Alpha release
line, and the later Ask WTF interaction work on
`origin/rag/alpha-answer-accuracy` — with commit `887699e` as the accepted
composer-placement reference — must be mapped before shared UI changes. The
Beta branch is not descended from that later Alpha line.

This is a composition and component contract, not a palette-only guideline.
The ordinary-member empty Ask surface reuses the Public Alpha
`ConversationEmptyState`, and its input reuses the live-production compact
`AskComposer` capsule: one line, one compact Ask WTF button, and no permanent
source-mode strip, type rail, tall panel, or full-width background band. The
Alpha source prompt, editorial question card, floating wordmark, hamburger, and
route-appropriate navigation remain recognizable before private history or
Settings is added. Live Alpha `/chat` has no bottom dock, so member Ask routes
inherit that exemption. A personalized greeting is subordinate account
context; it never replaces the Alpha Ask WTF hero.

The following regressions fail acceptance even when semantic tokens match:

- a welcome/dashboard hero replacing the Alpha Ask surface;
- a three-card feature-summary or infrastructure-status introduction;
- a dark operator gateway for ordinary-member sign-in or recovery;
- a second global header inside member Settings;
- Account, Appearance, or Theme utilities duplicated outside the hamburger;
- replacing Alpha's top-right disclosure with a Beta-only pair of
  icon-labelled Ask WTF and Settings buttons in a bottom dock;
- a member route accepted from source tests without authenticated staging IAB
  comparison against `https://wtfhq.in`.

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

Wide desktop uses a persistent 240px conversation rail inside the Ask WTF
workspace. Its grid and links use zero-min-width tracks, session titles clamp to
two lines with long-word wrapping, and long history scrolls inside a bounded
rail. It must never intrude into the Alpha evidence card or composer. Below the
wide-shell breakpoint the rail becomes a labelled modal drawer. The trigger
has a 44px target, Escape/backdrop close the drawer, focus stays inside while
open, and close restores focus to the trigger. Conversation navigation and the
sticky composer must clear the rail/drawer, viewport edge, and safe area at
320px width or a 710px-tall viewport; they do not reserve space for a bottom
dock that is absent on Ask routes.

Like live Alpha `/chat`, the member Ask routes render no bottom dock. The
floating wordmark and top-right hamburger are the navigation chrome. Its
disclosure preserves Alpha's Ask WTF, Episodes, Connections, and display/theme
grammar; member account/logout and one Settings gear are additive utilities in
that disclosure. Ask WTF and Settings are not rendered as a replacement
two-button bottom pill. Individual conversations stay in the desktop rail or
mobile drawer. The disclosure never lists `/beta/ops`, operator Settings,
disabled future modules, or individual conversations for an ordinary member.

## Ask WTF screen contract

The new-chat state reuses the Alpha evidence-first empty state and composer.
A compact account-context line may show a safe greeting using `firstName`, then
the first display segment of `fullName`, then `Welcome to your workspace`.
Email, provider subject, member ID, role, issuer, D1 state, and raw claims never
become the heading or member-facing copy. A separate `Your workspace` feature
grid is forbidden because it recreates the rejected dashboard composition.
Conversation threads reuse the established source panel and never present prior
chat or memory as transcript evidence.

Loading names the user action without naming infrastructure. Empty history
invites a first question. Access denial remains non-enumerating. Failed turns
stay attached to their canonical conversation with an explicit same-question
retry. A late request may update only the route that originated it; switching,
unmounting, or signing out invalidates stale responses and navigation.

The selected-conversation surface remains a bounded conversation viewport in
loading, unavailable, empty, answer, and long-history states. An unavailable
fetch displays a same-route retry inside that viewport; it never collapses into
a short banner above an otherwise empty page. Only session-card titles clamp to
two lines. The active conversation heading may wrap and must not be truncated.

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

The route-local layout provides responsive Settings navigation inside the
existing member shell and a single main landmark. It does not add a second
global header, Ask link, private-workspace strip, utility rail, or bottom pill.
It must remain usable at 320px without horizontal overflow; at wider sizes the
navigation may sit beside the content.

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

This page explains that private sessions remain separate from public Alpha and
distinguishes archive from deletion. Archive removes a session from active
history while retaining it. Permanent deletion removes the selected
conversation, its messages, and internal context checkpoints from private
storage after an explicit confirmation and cannot be undone. Explicit saved
preferences remain separate and are never silently deleted with a conversation.
This member surface exposes no operator controls or infrastructure identifiers.

### Selected-session lifecycle

The session rail/card and active conversation expose a contextual action for
that exact session; a global `archive` link to the Sessions settings page is not
an accepted substitute.

- `Archive conversation` uses the owner-scoped archive route and accurately
  states that storage is retained.
- `Delete conversation permanently` opens a labelled, focus-managed dialog.
- The destructive action is disabled while its request is in flight, returns
  focus on cancel, leaves content intact on failure, and navigates to `/beta`
  only after the server confirms deletion.
- Linked saved preferences, if any, require separate disclosure and explicit
  selection. Transcript corpus assets are never part of member deletion.

### Long conversations

Selected history loads the newest bounded message page and supports older-page
loading without moving a reader who has scrolled upward. Automatic context
checkpoints may preserve earlier conversational meaning for inference after a
declared threshold, but they are untrusted conversational context — not
transcript evidence and not member-saved preference. Compaction failure falls
back to bounded recent turns and never blocks storage or fabricates a success.

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

The source-level anti-drift contract already asserts direct reuse of
`ConversationEmptyState` and `AskComposer`, absence of the rejected feature
grid, the live-production compact composer variant, bounded two-line session
items, the Alpha-composed member entry frame, the chat-route bottom-dock
exemption, Alpha hamburger-menu continuity with one additive member Settings
gear, and no duplicate Appearance shortcut. The next implementation must add
assertions for distinct Archive/Delete contracts, a same-route unavailable
retry, and bounded long-history/context behavior.

These checks establish route registry, member-safe copy, bounded local parsing,
active-record projection, and per-candidate save wiring. They do not establish
authenticated staging access, cross-account denial, or browser visual
acceptance; those remain user/staging gates in the open-enrollment plan.

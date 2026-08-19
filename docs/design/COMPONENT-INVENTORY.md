# WTF Media — Component Inventory

**Authority:** `DESIGN.md` defines visual and interaction contracts.

**Execution authorization:** build only Phase 1 and Phase 2 components first.

**Moodboard:** [Visual system moodboard](./visuals/wtf-one-brain-moodboard-v1.png)

This inventory names the components required by the full v1.0 product while
preventing a speculative component-library build. A component is implemented
only when its owning vertical slice consumes it.

## Dependency Rule

```text
tokens -> primitives -> patterns -> domain components -> projection shells
```

Dependencies move in one direction. Public and operator shells may consume the
same accessible primitive, but they do not share policy, cache, DTO, or local
interaction state.

## Phase 1 — Build Now

### Foundations

| Component or contract | Responsibility |
|---|---|
| `WtfTokens` | Semantic color, type, spacing, radius, border, depth, and z-index variables |
| `WtfTheme` | Cream/ink default, committed accents, provisional production orange |
| `Typography` | Bricolage UI hierarchy, Fraunces editorial moments, Poppins body |
| `FocusPolicy` | Visible high-contrast focus rings and focus restoration |
| `MotionPolicy` | Duration/easing tokens, pause rules, and reduced-motion fallback |
| `AvailabilityState` | Typed unknown/unavailable/stale/partial/empty/error/offline/zero states |
| `SyntheticFixtures` | Privacy-safe, production-shaped component and journey data |

### Accessible primitives

| Family | Components |
|---|---|
| Actions | `Button`, `IconButton`, `LinkButton` |
| Inputs | `TextField`, `TextArea`, `Select`, `Checkbox`, `RadioGroup`, `Switch` |
| Selection | `Tabs`, `Combobox`, `Menu` |
| Overlays | `Dialog`, `AlertDialog`, `Drawer`, `Popover`, `Tooltip` |
| Feedback | `Toast`, `Alert`, `Progress`, `Skeleton`, `StatusChip` |
| State surfaces | `EmptyState`, `UnavailableState`, `PermissionState`, `ErrorState`, `OfflineState` |
| Semantics | `VisuallyHidden`, `SkipLink`, `LiveRegion` |

Only primitives consumed by the first real migrated component are installed or
implemented. Selective headless packages sit beneath repository-owned WTF
wrappers; package defaults never become the visual system.

### Proof patterns

| Pattern | Responsibility |
|---|---|
| `PublicShell` | Preserve current public navigation and presentation contracts |
| `WorkspaceHeader` | Context, status, scope, and dominant action hierarchy |
| `FilterBar` | Search, filter, sort, clear, and URL-state behavior |
| `ScrollRail` | Keyboard/touch/button horizontal discovery replacing pointer-only drag |
| `EvidenceCard` | Source, scope, state, owner, time, and next-action summary |
| `SourcePanel` | Citation metadata and safe source-open behavior |
| `TimelineRail` | Semantic sequence with non-color status and reduced motion |
| `DataTable` | Headless dense table state with accessible responsive alternative |
| `GraphWithList` | Visual relationship graph plus equivalent semantic list/table |

### Current-component migration targets

| Existing component | Phase 1 target |
|---|---|
| `Wordmark` | Preserve exact brand role; make tokens explicit |
| `Sparkle` | Decorative primitive governed by motion policy |
| `CustomCursor` | Public-only optional effect; native cursor for operations |
| `Marquee` | Pausable public effect with static reduced-motion fallback |
| `DragRow` | `ScrollRail` with keyboard, buttons, snap, and touch |
| `GuestStrip` | `PersonRail` built on `ScrollRail` |
| `EpisodesBrowser` | Contract baseline before later decomposition |
| `ConnectionGraph` | `GraphWithList` semantic parity contract |
| `ModelPicker` | Remove from public UI; retain only as internal feature-gated diagnostic |

Phase 1 proves the system through one real public vertical migration rather than
building every listed component.

## Phase 2 — Build Next

| Component | Responsibility |
|---|---|
| `NeutralRoot` | Fonts, metadata defaults, tokens; no public motion or protected session data |
| `OperatorShell` | Authenticated layout, scope, navigation, system state, and safe boundaries |
| `OperatorNav` | Control Room, Episodes, Knowledge, Production, Analytics, People |
| `OperatorIdentity` | Current operator and organization scope without credential exposure |
| `CapabilityGuard` | Server-backed allow/deny/disabled behavior for actions and fields |
| `PermissionBoundary` | Safe permission-denied and session-expired recovery |
| `CommandSearch` | Capability-scoped navigation/search with no public/internal index mixing |
| `SystemHealthBanner` | Last good observation, failed boundary, retry, and owner |
| `TruthfulControlRoom` | Empty/unavailable operator start state; no invented counts |
| `SessionBoundary` | Logout/expiry state clearing and focus-safe redirect |

## Later Domain Components — Contracts Only

| First phase | Components |
|---:|---|
| 3 | `EpisodeWorkspace`, `AssetRegistry`, `TranscriptReader`, `TranscriptVersionPicker`, `TimelineMap`, `Citation`, `ReconciliationPanel`, `ActivityFeed` |
| 4 | `AskComposer`, `ConversationThread`, `EvidenceSelection`, `SavedEvidence`, `ResearchDossier`, `GroundingState` |
| 5 | `ProductionBoard`, `ProductionCalendar`, `StageControl`, `OwnerPicker`, `BlockerPanel`, `ClipCandidate`, `BriefPanel`, `ControlRoomSummary` |
| 6 | `MetricCard`, `MetricChart`, `ReportingWindow`, `PeopleDirectory`, `PersonEvidence`, `LeadPipeline`, `FieldVisibility` |
| 7 | `IntegrationHealth`, `ObservationCoverage`, `RetryState`, `ReconciliationQueue`, `PermissionMode` |
| 8 | final public projections, remaining consumer migrations, legacy-removal inventory |

## Required Component States

Every interactive or data component declares applicable states before it ships:

- default, hover, active, focus-visible, disabled, selected;
- loading, skeleton, empty, measured zero;
- unknown, unavailable, stale, partial, conflicted;
- permission denied, error, offline, retrying, recovered;
- compact, comfortable, narrow viewport, wide viewport;
- motion allowed and reduced-motion fallback.

## Component Proof

Each shipped component must have:

1. A deterministic story or fixture.
2. Keyboard and focus behavior assertions.
3. Accessible names, roles, state, and live-region behavior.
4. Automated axe coverage without serious violations.
5. Narrow and wide viewport evidence.
6. Reduced-motion evidence when motion exists.
7. Visual regression evidence for brand-critical variants.
8. Privacy-safe fixtures and safe error output.
9. A named consuming workflow; speculative components do not ship.

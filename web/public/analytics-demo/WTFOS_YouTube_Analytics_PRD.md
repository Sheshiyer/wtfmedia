# WTFOS YouTube Analytics — Product Requirements

## 1. Purpose

Build a YouTube analytics and evidence workspace for the WTF podcast team. It is not a replacement for YouTube Studio and it does not force a weekly meeting workflow. The team can explore filters, open an episode, or ask a question to get grounded answers:

1. What happened?
2. Why did it happen?
3. What should we keep, change, or test next?
4. What is the evidence for that decision?

The home view starts with channel-period context and keeps episode analysis distinct. The WTF team can use either path independently, while the optional guidance layer helps turn findings into a next investigation.

## 2. Primary users

| User | Need |
| --- | --- |
| WTF founder / content lead | Quickly understand whether an episode or format worked and what to do next. |
| YouTube analyst | Inspect channel and video metrics, comparisons, and editorial moments from one live API-backed workspace. |
| Producer / editorial lead | Turn grounded performance signals into episode, format, and promotion decisions. |
| Developer / data team | Connect APIs and retain an auditable metric model without recreating YouTube Studio. |

## 3. Founder prototype

The interactive test build is the approval surface. The founder can:

- Set date range, episode, content type, weekly comparison and episode cohort.
- See the exact scope persist as visible chips and within Ask WTFOS.
- Read the channel sequence: distribution → attention → subscriber value.
- Open an episode review containing source-backed metrics and an explicit comparison boundary.
- Select an unsupported content type and see an honest API-required state rather than substituted data.
- Open the developer handoff inside the dashboard.

The prototype labels all values as **demo API responses · live connection not active**. It demonstrates the final interface, states, calculations, and evidence contract without implying that example values are live.

The previously approved frontend is preserved at `approved-versions/approved-v1-before-api-demo/` and can be restored if the founder asks to “go back.”

## 4. Core information architecture

### 4.1 Episode Review (default)

The review sequence is fixed in logic, though an admin may control presentation order:

1. **Impressions first** — Did the episode earn distribution?
2. **AVD + retention** — Did attention hold after the click?
3. **Subscriber value** — Did the episode create a meaningful outcome?
4. **Analysis summary** — What does the selected evidence suggest, and what is useful to investigate next?

This mirrors the analyst walkthrough:

- Use the same post-publish window for the target and its comparison group.
- Use impressions as the primary distribution signal.
- Use average view duration and the retention curve to explain the movement.
- Map exact chapters, founder cutaways, returns, or questions to the curve.
- Treat comments as qualitative context only when that Phase 2 source is connected.

### 4.2 Channel Health

Weekly view with selectable trend chart:

- Views
- Watch time
- Subscribers gained
- Impressions
- CTR
- Average view duration
- Retention / average percentage viewed
- Subscriber view yield

Every card and chart must show current value, comparator value, percentage/point change, metric definition, source, date range, and calculation time.

### 4.3 Attention Map

Episode-level retention chart with markers for:

- Chapter start/end
- Founder cutaway or insert
- Return to guest
- Question/topic shift
- Any manually annotated editorial moment

Selecting a marker shows exact timestamp and label, a defined before/after retention or AVD window, net change, cohort baseline, and an evidence link to video playback/timestamp once available.

### 4.4 Audience Voice (later phase)

Comments are classified as supportive, mixed, critical, or irrelevant/off-topic. The UI should explain the dominant themes and sample comments, but decision language must be qualified when behavioural data does not agree.

### 4.5 Ask WTFOS

Ask WTFOS is a grounded analytic assistant, not an open-ended chatbot. It inherits the active filters and must:

- Restate the analysis scope.
- Use the review order: distribution → attention → audience context → decision.
- Cite source, date window, cohort, metric definition, and episode/video identifiers.
- Link to video/timestamp, chart, or table row whenever evidence exists.
- State uncertainty and missing data rather than inventing an answer.

## 5. Filters and shared analysis scope

The filter drawer is the source of truth for the page and for AI queries.

| Filter | Options in Phase 1 | Behaviour |
| --- | --- | --- |
| Episode | Individual mapped episode, whole channel | Drives page context and video-level queries. |
| Measurement window | First 24h, first 7d, first 28d, lifetime, last 7d, last 28d, all time, custom range | Must be comparable across target/cohort. |
| Episode comparison | Another named full episode, average of selected reference episodes, similar episodes at the same post-publish age | Use plain language in the UI and persist the exact comparison in scope chips and AI citations. |
| Content type | Full episode, Shorts, clips/teasers, all formats | Never silently mix formats in an episode conclusion. |
| Topic / guest | Optional metadata filter | Use mapped taxonomy, not loose string matching where possible. |

The system must reject or clearly warn on invalid comparisons, for example a first-seven-day full episode compared with all-time Shorts.

## 6. Live data sources

| Source | Contribution | Product use |
| --- | --- | --- |
| YouTube Data API | Channel/video IDs, titles, descriptions, publish time, duration, thumbnails, and public metadata | Catalogue, mapping, content-type classification, and playback links. |
| YouTube Analytics API | Views, watch time, subscribers, impressions, CTR, AVD, retention, traffic source, geography, device, and supported dimensions | Channel health, episode review, cohorts, attention diagnostics, and grounded AI answers. |
| WTFOS metadata service | Episode mapping, series, guest, topic, format, editorial moments, experiments, and analyst notes | Curated business context that the YouTube APIs do not provide. |
| Stored daily snapshots | Immutable metric values plus query, scope, and sync timestamp | Reproducible comparisons, baselines, auditability, and historical trend analysis. |

No spreadsheet or worksheet is part of the production ingestion path.

## 7. Phase 1 technical scope

### Ingestion and storage

- YouTube Data API key for public channel and video metadata, stored only as a server secret.
- Google OAuth 2.0 for the correct YouTube channel owner and private YouTube Analytics access.
- Server-side access-token refresh and encrypted refresh-token storage.
- YouTube Analytics API for daily, channel-level, and video-level performance metrics.
- Normalized database with immutable daily snapshots.
- Episode ↔ video mapping, format, series, guest, topic and publish time.
- Sync monitoring with last-success timestamp, partial coverage, retries, and query-level provenance.

The frontend must never contain an API key, OAuth client secret, access token, or refresh token. The “Connect YouTube channel” action begins a backend OAuth flow and returns only non-sensitive connection status to the browser.

### Suggested normalized entities

- channels
- videos
- episodes
- video_episode_mappings
- daily_video_metrics
- daily_channel_metrics
- comparison_cohorts
- content_metadata
- editorial_moments
- metric_definitions
- api_connections
- api_sync_runs
- source_snapshots
- saved_investigations
- answer_feedback

### API / query contract

All analytic queries must accept episode or channel ID, date window, comparison cohort/definition, content type, optional guest/topic, timezone, and metric grain.

All responses must return value, cohort value, absolute and relative change, metric definition, date range, comparison definition, source snapshot time, evidence references, and data freshness.

## 8. Later phases

- Comment ingestion/classification and theme extraction.
- Transcript ingestion, chapter/topic segmentation, and editorial-moment annotations.
- Grounded RAG for Ask WTFOS using approved data, transcripts, research context, and citations.
- Cross-platform performance and clip promotion analysis.
- Role-based editing/approval workflows and experiment tracking.

## 9. Visual and interaction direction

Preserve WTFOS’s existing visual language:

- warm cream/paper background and subtle texture
- black structural outlines and compact cards
- yellow for active/decision actions
- blue for distribution/data signals
- purple for contextual/AI signals
- editorial typography, not generic SaaS chrome

The screen must lead with the active decision, filters, and evidence—not a decorative hero. Production editing must be role-gated and must never mutate raw analytics.

## 10. Acceptance criteria

1. A user can set episode, window, cohort, and content type and see that exact scope across the dashboard and Ask WTFOS.
2. An episode analysis always begins with a like-for-like distribution comparison.
3. Retention explanations can be anchored to exact timestamps and editorial events.
4. A missing API field or invalid comparison is shown as unavailable; the interface never substitutes another scope.
5. Comments are shown as qualitative context and can be traced to classification/evidence.
6. Every AI claim can be audited through source, date range, cohort, metric definition, and evidence link.
7. Demo API responses are visually distinct from a live connected state.
8. Analytics calculations are reproducible from stored snapshots.
9. The founder-approved layout/copy can be exported in Markdown for developer/AI-tool handoff.
10. A user can save an investigation containing its question, answer, scope, evidence, owner, and review date.
11. Every production response shows last sync time, coverage, source query, and whether its comparison is direct, average, or publish-age matched.
12. API credentials and OAuth tokens are handled server-side and never rendered into the frontend.

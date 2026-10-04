# YouTube analytics production mapping

Contract version: `wtfos-youtube-v1`
Implementation migration: `0019_youtube_decision_analytics.sql`

## Route map

| Method | Route | Authority | Purpose |
| --- | --- | --- | --- |
| POST | `/beta/api/analytics/oauth/start` | analytics manage | Start read-only Google OAuth. |
| GET | `/beta/api/analytics/oauth/callback` | analytics manage | Consume single-use OAuth state and store encrypted refresh credentials. |
| POST | `/beta/api/analytics/selection` | analytics manage | Verify and select an OAuth-authorized YouTube channel. |
| POST | `/beta/api/analytics/sync` | analytics manage | Synchronize a bounded date range into D1. |
| GET | `/beta/api/analytics/youtube` | analytics read | Return the complete decision-workspace contract from stored observations. |
| GET | `/beta/api/analytics/youtube/episodes/compare` | analytics read | Compare two episodes over equal first-1/7/28-day windows or explicitly requested lifetime data. |
| POST | `/beta/api/analytics/youtube/retention` | analytics manage | Synchronize a dedicated per-video retention curve. |
| GET | `/beta/api/analytics/youtube/retention` | analytics read | Read the stored per-video retention curve. |
| POST | `/beta/api/analytics/disconnect` | analytics manage | Revoke provider access and stop future synchronization. |

All dashboard GET requests read D1. They never call Google and never expose Google credentials.

The imported decision-workspace design is the primary YouTube analytics UI. Its production adapter calls the authenticated status, OAuth, selection, sync, report, equal-age comparison, and retention routes above. Static fixture values are removed before the first server read and are never used as a fallback when OAuth or provider observations are unavailable.

## Provider mappings

| WTFOS field | Google source | Storage |
| --- | --- | --- |
| Views, watch time, AVD, likes, comments, shares, subscribers | YouTube Analytics API targeted query | Channel/video daily metrics |
| Average view percentage | YouTube Analytics API `averageViewPercentage` | Channel/video daily metrics |
| Subscribed/unsubscribed activity | YouTube Analytics API `subscribedStatus` + `views` | Audience daily metrics |
| Thumbnail impressions and CTR | YouTube Reporting API `channel_reach_basic_a1` | Channel/video daily reach fields plus job/import receipts |
| Retention curve | Analytics API `elapsedVideoTimeRatio` with retention metrics and a required video filter | Per-video, per-range retention points |

The Reporting API is asynchronous. The first reach synchronization creates the managed job; later synchronizations import available daily CSV reports idempotently. Reach coverage reports the number of selected days with both impressions and CTR.

## Derived metrics

Derived values are calculated only when every required provider observation is present. Otherwise they are `null` and render as unavailable.

| Metric | Version 1 formula |
| --- | --- |
| Estimated impression clicks | `thumbnailImpressions × thumbnailImpressionsCtr` |
| STV rate | `subscribersGained ÷ views` |
| Conversion rate | `subscribersGained ÷ unsubscribedViews` |
| Subscribers per million impressions | `subscribersGained ÷ thumbnailImpressions × 1,000,000` |
| Expected CTR | Impression-weighted CTR across the previous 28 complete days |
| Expected retention | View-weighted average view percentage across the previous 28 complete days |
| Previous-period comparison | Selected range compared with the immediately preceding equal-length range |
| Four-week comparison | Selected range compared with the previous 28 complete days |
| Performance group | Above/below expected CTR crossed with above/below expected retention |
| Impression tier | Tier 1 ≥50M; Tier 2 ≥22M; Tier 3 ≥13M; Tier 4 ≥8M; Tier 5 below 8M |

## Written insights

Insights use deterministic evidence rules. Every item contains:

- a classification: observation, keep, change, or test;
- human-readable wording;
- the exact response fields used as evidence.

The implementation does not claim causation. Content-pattern groups are marked `hypothesisOnly`, and groups with fewer than three episodes are marked `insufficient_sample`.

## Production activation requirements

Code completeness does not make provider data available automatically. Before activation:

1. Apply migrations `0018` and `0019` to the approved environment.
2. Configure server-only OAuth credentials and an independent analytics token-encryption key.
3. Register the exact environment callback in Google Cloud.
4. Connect the channel owner account and select the authorized channel.
5. Run a bounded core sync; allow time for Reporting API reach jobs to generate daily files, then sync again.
6. Reconcile date ranges, timezone, CTR units, retention, and subscription activity against YouTube Studio.
7. Classify episode `content_type` values before relying on content-pattern output.
8. Record approval before enabling production scheduling; the existing production schedule hold remains unchanged.

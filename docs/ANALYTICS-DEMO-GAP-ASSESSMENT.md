# YouTube analytics demo gap assessment

> Historical assessment: the local implementation now supplies production mappings for these gaps. See `ANALYTICS-PRODUCTION-MAPPING.md` for the implemented routes, provider sources, derivation formulas, and activation requirements. Values still remain unavailable until migration, OAuth, channel selection, and synchronization are completed.

Date: 2026-09-29  
Source reviewed: `nikhaij12/WTFOS_Youtube_Analytics_demo` at `af50012`  
Scope: local evaluation only; no GitHub, deployment, Cloudflare, or production configuration changes.

## What was imported

The complete static prototype is available under `web/public/analytics-demo/` and is embedded in the analytics settings screen. It includes the filter bar, trust ledger, channel health cards, decision strip, guided analysis, attention inbox, trend chart, annotations, episode comparison, episode table, Ask WTFOS demonstration, metric guide, and developer handoff.

All prototype numbers remain fixtures. The existing live connection screen remains separate and continues to display only stored provider-backed values.

## Requirement-by-requirement status

| Requirement | Demo status | Live status / work required |
| --- | --- | --- |
| Impressions and CTR | Visible as fixtures | Not synchronized by the current backend. Add YouTube Reporting API ingestion (or validate an allowed targeted report) and persist source query, dimensions, and freshness. |
| Retention percentage | Visible as a fixture | `averageViewPercentage` can provide the headline. A retention curve is a separate per-video report using `elapsedVideoTimeRatio` with retention metrics. |
| Unsubscribed audience count and percentage | Visible as a fixture | `subscribedStatus` can segment views/watch activity into subscribed and unsubscribed groups. Do not label it a unique audience count without an approved definition and denominator. |
| STV and conversion rates | Visible as derived fixtures | No accepted product formula exists in the repo. Define numerator, denominator, attribution window, eligible content, and rounding before implementation. |
| Week-over-week and four-week trailing comparisons | Interactive in the demo | Derive from normalized daily snapshots with equal-length comparison windows, reporting timezone boundaries, and missing-day handling. |
| Episode comparisons and deviations | Matched-age comparison is present | Persist publish age and cohort rules. Add explicit deviation fields with baseline provenance. |
| Subscribers per million impressions | Described, not surfaced as a final metric | Derived metric: subscribers gained / impressions × 1,000,000. Requires reliable impression ingestion and a zero/low-volume guard. |
| Impression-click estimates | Described, not surfaced as a final metric | Derived estimate: impressions × CTR. Always label it as estimated, not observed clicks. |
| Impression tiers and content-pattern analysis | Static tiers are shown; pattern analysis is absent | Approve versioned thresholds, content taxonomy, minimum sample sizes, and hypothesis language before generating patterns. |
| Expected CTR, trendline deviations, performance groups | Documentation-only | Requires an approved cohort/model definition, lookback, minimum sample, model/version metadata, and confidence policy. |
| Written insights and recommendations | Fixture cards and demo answers | Production output needs cited stored evidence, scope/freshness, confidence, and an explicit separation between observation and keep/change/test recommendations. |

## Safe implementation order

1. Ingest and verify impression/CTR data with source-query provenance.
2. Add headline retention and the separate per-video retention curve.
3. Add subscribed-status activity segmentation with precise user-facing wording.
4. Implement equal-window week and trailing comparisons from daily snapshots.
5. Agree and version product formulas for STV, conversion, tiers, deviations, and expected CTR.
6. Generate written insights only from those versioned evidence contracts.

## Do not infer

- Missing provider observations are not zero.
- `subscribedStatus` activity is not automatically unique audience.
- Estimated clicks are not provider-observed clicks.
- A pattern or correlation is not a causal conclusion.
- Prototype values are not evidence of the connected channel's performance.

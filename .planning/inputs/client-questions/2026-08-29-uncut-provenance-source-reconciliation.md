# Uncut provenance source reconciliation

**Status:** supplied source package catalogued; owner confirmation is required before import or asset activation. The privacy-safe register is [`docs/handoffs/2026-08-29-uncut-provenance-source-register.md`](../../../docs/handoffs/2026-08-29-uncut-provenance-source-register.md).

## Evidence already received

- A 62-row transcript/date/final-frame workbook across five WTF content groups.
- A 64-row internal-links workbook across the matching five groups.
- A kickoff record and Phase 1–2 scope pack that establish uncut media as the primary transcript source and YouTube as its reconciled published-timeline counterpart. Phase 1 remains an ungated closed test; Phase 3 is the team-only authenticated workflow.

No source file, transcript, private URL, or asset path is stored here.

## Decisions to record

- [ ] Confirm `Internal` is the uncut-master field, or supply the correct field classification.
- [ ] Resolve the one extra `Special Episodes` row and one extra `WTF Online` row in the internal-links workbook.
- [ ] Confirm whether unmatched or missing assets remain `unavailable`, are backfilled, or are excluded from the first import.
- [x] Asset policy: use a two-axis source-role classifier; `Internal` stays a candidate pointer until owner-confirmed and verified, rather than becoming an asset type by spreadsheet field alone.
- [x] Reconciliation policy: map only confirmed rows locally and quarantine the two unmatched rows as `ambiguous`; title matching never creates an automatic asset activation.
- [x] Auth policy: Phase 3 team roles govern capabilities, not source type; YouTube and uncut remain source/timeline provenance within the same authorized workflow.
- [ ] Approve the per-episode manual alignment sample and the two-second bidirectional timestamp acceptance threshold from the scope pack.
- [x] Evaluation policy: use a hybrid rubric of human-owned expected answers plus repeatable checks for grounding, moment accuracy, calibrated uncertainty, and usefulness; any unsupported claim or unsafe source exposure fails.
- [ ] Author the 20-query evaluation set; it remains independent of workbook availability.

## Calendar decisions unaffected by the source handoff

Supplied posting dates are historical evidence only. Before calendar activation, provide the canonical owner, roles, timezone/daylight-saving policy, colour convention, conflict owner, retention/correction policy, and native-versus-provider projection decision.

## Phase boundary and access target

Phase 1 is an ungated release for closed testing only; it is neither a public product launch nor evidence that Access is configured. Before Phase 3 activates, Cloudflare Zero Trust must authenticate approved team members and application roles must govern functions such as ingestion, production changes, audit, and settings. YouTube and uncut remain separate source/timeline records for accuracy, but neither creates a different end-user access tier. Current preview and rollback hosts are not evidence that this Phase 3 boundary is live.

## Safe next step after review

Build a local-only reconciliation adapter with synthetic fixtures that emits status codes and hashed row identities. Test D1/R2-backed ingestion only after the separately approved Cloudflare resource gate.

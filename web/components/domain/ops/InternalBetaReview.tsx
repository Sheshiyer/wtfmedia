"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  betaReviewDispositions,
  betaReviewStorageKey,
  internalBetaDiscrepancies,
  readBetaReviewRecords,
  upsertBetaReviewRecord,
  type BetaReviewRecord,
} from "@/lib/ops/production";

function blankReviewRecords(): Record<string, BetaReviewRecord> {
  return Object.fromEntries(
    internalBetaDiscrepancies.map((item) => [
      item.id,
      { discrepancyId: item.id, disposition: item.status, note: "" },
    ]),
  );
}

function reviewRecordMap(records: readonly BetaReviewRecord[]) {
  const next = blankReviewRecords();
  for (const record of records) next[record.discrepancyId] = record;
  return next;
}

function dispositionLabel(value: string) {
  return value.replace(/-/g, " ");
}

export function InternalBetaReview() {
  const [reviews, setReviews] = useState<Record<string, BetaReviewRecord>>(blankReviewRecords);
  const [recordedId, setRecordedId] = useState<string | null>(null);
  const records = useMemo(() => Object.values(reviews), [reviews]);

  useEffect(() => {
    setReviews(reviewRecordMap(readBetaReviewRecords(window.localStorage.getItem(betaReviewStorageKey))));
  }, []);

  const update = (id: BetaReviewRecord["discrepancyId"], patch: Partial<BetaReviewRecord>) => {
    setReviews((current) => ({
      ...current,
      [id]: { ...current[id], ...patch, discrepancyId: id },
    }));
    setRecordedId(null);
  };

  const save = (id: BetaReviewRecord["discrepancyId"]) => {
    const review = reviews[id];
    if (!review) return;
    const next = upsertBetaReviewRecord(records, review);
    window.localStorage.setItem(betaReviewStorageKey, JSON.stringify(next));
    setReviews(reviewRecordMap(next));
    setRecordedId(id);
  };

  return (
    <section aria-labelledby="internal-beta-review-title" className="border-2 border-foreground bg-surface-raised p-4 sm:p-6">
      <div className="max-w-[70ch] border-b-2 border-foreground pb-4">
        <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">release readiness</p>
        <h2 id="internal-beta-review-title" className="mt-1 font-heading text-2xl lowercase">internal beta review</h2>
        <p className="mt-2 font-body text-body text-secondary">
          Known local gaps remain visible here so the team can decide, comment, and preserve a beta record without representing either gap as resolved.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {internalBetaDiscrepancies.map((item) => {
          const review = reviews[item.id] ?? { discrepancyId: item.id, disposition: item.status, note: "" };
          return (
            <article key={item.id} data-beta-discrepancy={item.id} className="border-2 border-foreground bg-canvas p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="max-w-[32ch] font-heading text-lg lowercase">{item.title}</h3>
                <span className="border border-foreground bg-attention px-2 py-1 font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-on-attention">
                  {dispositionLabel(review.disposition)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">source</dt>
                  <dd className="mt-1 font-body">{item.source}</dd>
                </div>
                <div>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">scope</dt>
                  <dd className="mt-1 font-body">{item.scope}</dd>
                </div>
                <div>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">field under review</dt>
                  <dd className="mt-1 font-body">{item.affectedField}</dd>
                </div>
                <div>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">observed locally</dt>
                  <dd className="mt-1 font-body text-secondary">{item.observation}</dd>
                </div>
                <div>
                  <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">recommended next action</dt>
                  <dd className="mt-1 font-body text-secondary">{item.recommendation}</dd>
                </div>
              </dl>

              <div className="mt-5 grid gap-3 border-t border-foreground/40 pt-4">
                <label className="grid gap-1" htmlFor={`${item.id}-disposition`}>
                  <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">disposition</span>
                  <select
                    id={`${item.id}-disposition`}
                    aria-label="disposition"
                    value={review.disposition}
                    onChange={(event) => update(item.id, { disposition: event.target.value as BetaReviewRecord["disposition"] })}
                    className="min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body"
                  >
                    {betaReviewDispositions.map((value) => <option key={value} value={value}>{dispositionLabel(value)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1" htmlFor={`${item.id}-note`}>
                  <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">review note</span>
                  <textarea
                    id={`${item.id}-note`}
                    aria-label="review note"
                    rows={3}
                    maxLength={500}
                    value={review.note}
                    onChange={(event) => update(item.id, { note: event.target.value })}
                    placeholder="add a beta review note"
                    className="min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-body text-body"
                  />
                </label>
                <Button type="button" variant="attention" onClick={() => save(item.id)}>record beta review</Button>
                <p className="font-body text-sm text-secondary">not a shared audit record · do not add credentials, tokens, private media, or raw transcripts.</p>
                {recordedId === item.id ? <p role="status" className="font-body text-sm text-foreground">recorded in this browser · not shared with D1, Cloudflare, or a release gate.</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

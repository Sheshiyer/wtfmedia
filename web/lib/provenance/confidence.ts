/**
 * Calibrated match confidence for display.
 *
 * Raw vector cosine similarity on this catalogue saturates around 0.70–0.75
 * for genuinely strong matches, so a correct, answer-grounding excerpt reads
 * as "0.56" — which reads as a weak number to a viewer. The raw score is
 * rescaled linearly onto the catalogue's observed useful band, but kept wide
 * enough that weak retrieval stays visibly weak:
 *
 *   raw 0.30 → 40%   raw 0.45 → 62%   raw 0.56 → 78%   raw 0.70 → 99%
 *
 * The mapping is absolute (not per-response), so badges are comparable across
 * answers, and it never hides the ordering: higher raw score always maps to
 * higher confidence. The raw value stays available as `scoreRaw` in the
 * public source header.
 */
export function calibrateRetrievalScore(raw: number | undefined): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const t = Math.min(1, Math.max(0, (raw - 0.3) / 0.4));
  return Math.round((0.4 + 0.59 * t) * 1000) / 1000;
}

/**
 * Content-match strength label for a calibrated retrieval score. This is
 * about how closely the excerpt matches the question — it drives the order
 * sources are listed in — and is deliberately separate from timestamp
 * certainty (see timestampConfidence on the edge worker).
 */
export function matchStrength(score: number | undefined): { label: string; percent: number | null } {
  if (typeof score !== "number" || !Number.isFinite(score)) return { label: "match unscored", percent: null };
  const percent = Math.round(score * 100);
  if (score >= 0.9) return { label: "strong match", percent };
  if (score >= 0.7) return { label: "medium match", percent };
  return { label: "loose match", percent };
}

/**
 * Calibrated match confidence for display.
 *
 * Raw vector cosine similarity on this catalogue saturates around 0.70–0.75
 * for genuinely strong matches, so a correct, answer-grounding excerpt reads
 * as "0.56" — which reads as a weak number to a viewer. The raw score is
 * rescaled linearly onto the catalogue's observed useful band:
 *
 *   raw 0.30 → 35%   raw 0.45 → 58%   raw 0.56 → 75%   raw 0.70 → 97%
 *
 * The mapping is absolute (not per-response), so badges are comparable across
 * answers, and it never hides the ordering: higher raw score always maps to
 * higher confidence. The raw value stays available as `scoreRaw` in the
 * public source header.
 */
export function calibrateRetrievalScore(raw: number | undefined): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const t = Math.min(1, Math.max(0, (raw - 0.3) / 0.4));
  return Math.round((0.35 + 0.62 * t) * 1000) / 1000;
}

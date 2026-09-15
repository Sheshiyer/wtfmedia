import {
  applyDurationBudget,
  buildMomentEnrichmentInput,
  buildMoments,
  MOMENT_ENRICHMENT_PROMPT,
  parseDurationBudget,
  parseMomentEnrichment,
  reelRelevant,
  resolveMomentEnds,
  type EnrichedMoment,
  type Moment,
  type MomentEnrichment,
  type MomentSource,
} from "./moments.ts";
import { openRouterChat, type OpenRouterEnv } from "./openrouter.ts";

const MAX_MOMENTS = 25;
const ENRICH_BATCH_SIZE = 10;

export type MomentPipelineEnvironment = OpenRouterEnv & {
  AI: { run(model: string, input: unknown): Promise<unknown> };
  VECTORIZE: Parameters<typeof resolveMomentEnds>[0];
};

export type MomentPayload = {
  moments: EnrichedMoment[];
  totalDurationSec: number;
  budgetSec: number | null;
};

async function enrichBatch(
  env: MomentPipelineEnvironment,
  question: string,
  batch: Moment[],
  strict = false,
): Promise<MomentEnrichment[]> {
  const suffix = strict
    ? "There is 1 MOMENT. Output exactly 1 JSON object labeling it. Every text field (guest, theme, topic, summary, whyRelevant) is REQUIRED — never output empty strings; infer conservatively from the excerpt and episode title."
    : `There are ${batch.length} MOMENTs. Output exactly ${batch.length} JSON objects, one per MOMENT, in order — use empty strings when a text field cannot be honest, but never skip a MOMENT and never default strength.`;
  try {
    const { answer } = await openRouterChat(env, [
      { role: "system", content: MOMENT_ENRICHMENT_PROMPT },
      { role: "user", content: `${buildMomentEnrichmentInput(question, batch)}\n\n${suffix}` },
    ], { maxTokens: 2000, temperature: 0.2 });
    if (!answer.trim()) throw new Error("empty moment enrichment");
    return parseMomentEnrichment(answer, batch.length);
  } catch (error) {
    console.warn("wtfmedia moment enrichment failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return batch.map(() => ({}));
  }
}

/**
 * Shared Alpha/Beta editor-sheet pipeline. Every failure is additive: the
 * answer remains valid and any unresolved labels stay absent rather than being
 * invented in the browser.
 */
export async function momentsForAnswer(
  env: MomentPipelineEnvironment,
  question: string,
  sources: readonly MomentSource[],
): Promise<MomentPayload> {
  let moments = buildMoments(sources).slice(0, MAX_MOMENTS);
  if (moments.length === 0) return { moments: [], totalDurationSec: 0, budgetSec: null };

  moments = await resolveMomentEnds(env.VECTORIZE, moments);
  const budgetSec = parseDurationBudget(question);
  const budgeted = applyDurationBudget(moments, budgetSec);
  const visible = budgeted.moments.filter((moment) => moment.withinBudget);
  if (visible.length === 0) return { moments: budgeted.moments, totalDurationSec: budgeted.totalDurationSec, budgetSec };

  const batches = Array.from(
    { length: Math.ceil(visible.length / ENRICH_BATCH_SIZE) },
    (_, index) => visible.slice(index * ENRICH_BATCH_SIZE, (index + 1) * ENRICH_BATCH_SIZE),
  );
  const settled = await Promise.all(batches.map((batch) => enrichBatch(env, question, batch)));
  const enrichments = visible.map((_, index) =>
    settled[Math.floor(index / ENRICH_BATCH_SIZE)]?.[index % ENRICH_BATCH_SIZE] ?? {});

  const incomplete = () => enrichments
    .map((enrichment, index) =>
      (!enrichment.guest || !enrichment.theme || !enrichment.topic || !enrichment.summary || !enrichment.whyRelevant)
        ? index
        : -1)
    .filter((index) => index !== -1);

  for (let round = 0; round < 2; round += 1) {
    const missingIndices = incomplete();
    if (missingIndices.length === 0) break;
    const retried = await Promise.all(missingIndices.map((index) => enrichBatch(env, question, [visible[index]], true)));
    missingIndices.forEach((visibleIndex, retryIndex) => {
      const retry = retried[retryIndex]?.[0];
      if (retry && Object.keys(retry).length > 0) enrichments[visibleIndex] = { ...retry, ...enrichments[visibleIndex] };
    });
  }

  visible.forEach((moment, index) => {
    if (enrichments[index].summary) return;
    const firstSentence = moment.excerpt.trim().split(/(?<=[.?!])\s+/)[0] ?? "";
    if (firstSentence) enrichments[index] = { ...enrichments[index], summary: firstSentence.slice(0, 200) };
  });

  const enriched = new Map(visible.map((moment, index) => [moment, enrichments[index]]));
  const reel = budgeted.moments
    .map((moment) => ({ ...moment, ...(enriched.get(moment) ?? {}) }))
    // Off-topic candidates (strength 1-2 by the model's own judgment) are
    // noise in the editor sheet, not a wider net.
    .filter(reelRelevant);
  return {
    moments: reel,
    totalDurationSec: reel.reduce((sum, moment) => sum + (moment.durationSec ?? 0), 0),
    budgetSec,
  };
}

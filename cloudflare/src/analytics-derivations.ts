export const YOUTUBE_FORMULA_VERSION = "wtfos-youtube-v1";

export type YouTubeDailyObservation = {
  date: string;
  views: number | null;
  watchMinutes: number | null;
  averageViewDurationSeconds: number | null;
  averageViewPercentage: number | null;
  impressions: number | null;
  impressionsCtr: number | null;
  subscribersGained: number | null;
  subscribersLost: number | null;
  subscribedViews: number | null;
  unsubscribedViews: number | null;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const sum = (rows: YouTubeDailyObservation[], key: keyof YouTubeDailyObservation): number | null => {
  const values = rows.map((row) => row[key]).filter(finite);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
};

function weighted(rows: YouTubeDailyObservation[], valueKey: keyof YouTubeDailyObservation, weightKey: keyof YouTubeDailyObservation): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    const value = row[valueKey];
    const weight = row[weightKey];
    if (!finite(value) || !finite(weight) || weight <= 0) continue;
    numerator += value * weight;
    denominator += weight;
  }
  return denominator > 0 ? numerator / denominator : null;
}

const rate = (numerator: number | null, denominator: number | null): number | null => finite(numerator) && finite(denominator) && denominator > 0 ? numerator / denominator : null;

export function aggregateYouTubePeriod(rows: YouTubeDailyObservation[]) {
  const views = sum(rows, "views");
  const impressions = sum(rows, "impressions");
  const subscribersGained = sum(rows, "subscribersGained");
  const subscribersLost = sum(rows, "subscribersLost");
  const subscribedViews = sum(rows, "subscribedViews");
  const unsubscribedViews = sum(rows, "unsubscribedViews");
  const impressionsCtr = weighted(rows, "impressionsCtr", "impressions");
  return {
    views,
    watchMinutes: sum(rows, "watchMinutes"),
    averageViewDurationSeconds: weighted(rows, "averageViewDurationSeconds", "views"),
    averageViewPercentage: weighted(rows, "averageViewPercentage", "views"),
    impressions,
    impressionsCtr,
    estimatedImpressionClicks: finite(impressions) && finite(impressionsCtr) ? impressions * impressionsCtr : null,
    subscribersGained,
    subscribersLost,
    netSubscribers: finite(subscribersGained) && finite(subscribersLost) ? subscribersGained - subscribersLost : null,
    subscribedViews,
    unsubscribedViews,
    unsubscribedViewPercentage: rate(unsubscribedViews, finite(subscribedViews) && finite(unsubscribedViews) ? subscribedViews + unsubscribedViews : null),
    stvRate: rate(subscribersGained, views),
    conversionRate: rate(subscribersGained, unsubscribedViews),
    subscribersPerMillionImpressions: finite(subscribersGained) && finite(impressions) && impressions > 0 ? subscribersGained * 1_000_000 / impressions : null,
  };
}

export function comparison(current: Record<string, number | null>, baseline: Record<string, number | null>) {
  return Object.fromEntries(Object.keys(current).map((key) => {
    const value = current[key];
    const reference = baseline[key];
    return [key, {
      absolute: finite(value) && finite(reference) ? value - reference : null,
      relative: finite(value) && finite(reference) && reference !== 0 ? (value - reference) / Math.abs(reference) : null,
    }];
  }));
}

export function impressionTier(impressions: number | null): { id: string; label: string } | null {
  if (!finite(impressions)) return null;
  if (impressions >= 50_000_000) return { id: "tier_1", label: "50M+" };
  if (impressions >= 22_000_000) return { id: "tier_2", label: "22M–50M" };
  if (impressions >= 13_000_000) return { id: "tier_3", label: "13M–22M" };
  if (impressions >= 8_000_000) return { id: "tier_4", label: "8M–13M" };
  return { id: "tier_5", label: "under 8M" };
}

export function performanceGroup(ctr: number | null, expectedCtr: number | null, retention: number | null, expectedRetention: number | null): string | null {
  if (![ctr, expectedCtr, retention, expectedRetention].every(finite)) return null;
  const reachAbove = ctr! >= expectedCtr!;
  const attentionAbove = retention! >= expectedRetention!;
  if (reachAbove && attentionAbove) return "reach_and_attention_leader";
  if (reachAbove) return "reach_leader_attention_opportunity";
  if (attentionAbove) return "attention_leader_reach_opportunity";
  return "reach_and_attention_opportunity";
}

export function writtenInsights(current: ReturnType<typeof aggregateYouTubePeriod>, previous: ReturnType<typeof aggregateYouTubePeriod>, trailing: ReturnType<typeof aggregateYouTubePeriod>) {
  const insights: Array<{ kind: "observation" | "keep" | "change" | "test"; message: string; evidence: string[] }> = [];
  if (finite(current.impressions) && finite(previous.impressions)) {
    const direction = current.impressions >= previous.impressions ? "increased" : "decreased";
    insights.push({ kind: "observation", message: `Distribution ${direction} versus the previous equal-length period.`, evidence: ["current.impressions", "previous.impressions"] });
  }
  if (finite(current.averageViewPercentage) && finite(trailing.averageViewPercentage)) {
    insights.push(current.averageViewPercentage >= trailing.averageViewPercentage
      ? { kind: "keep", message: "Retention is at or above the previous four-week baseline; preserve the strongest opening and pacing choices.", evidence: ["current.averageViewPercentage", "trailing28.averageViewPercentage"] }
      : { kind: "change", message: "Retention is below the previous four-week baseline; review early exits before changing distribution strategy.", evidence: ["current.averageViewPercentage", "trailing28.averageViewPercentage"] });
  }
  if (finite(current.impressionsCtr) && finite(trailing.impressionsCtr)) {
    insights.push(current.impressionsCtr >= trailing.impressionsCtr
      ? { kind: "keep", message: "Click efficiency is at or above its expected four-week baseline.", evidence: ["current.impressionsCtr", "expectedCtr"] }
      : { kind: "test", message: "Test one title or thumbnail variable; CTR is below its four-week weighted baseline.", evidence: ["current.impressionsCtr", "expectedCtr", "current.impressions"] });
  }
  return insights;
}

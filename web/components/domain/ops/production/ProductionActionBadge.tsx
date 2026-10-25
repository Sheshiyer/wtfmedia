import { eventKindLabel, productionActionMark } from "@/lib/ops/production-data";

export function ProductionActionBadge({ kind }: { kind: string }) {
  const mark = productionActionMark(kind);
  return <span className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-label font-bold text-foreground" style={mark ? { backgroundColor: mark.color } : undefined}>
    {mark && <span aria-hidden="true">{mark.icon}</span>}{eventKindLabel(kind)}
  </span>;
}

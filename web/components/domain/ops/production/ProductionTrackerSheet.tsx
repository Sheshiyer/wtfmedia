"use client";

import { dayLabel, type ProductionAction, type ProductionItem, type ProductionSnapshot, type ProductionSourceCheck } from "@/lib/ops/production-data";

type TrackerGroup = { item: ProductionItem; checks: ProductionSourceCheck[] };
type Action = (action: ProductionAction, data: Record<string, unknown>) => Promise<boolean>;

function sourceRow(item: ProductionItem): number {
  const match = /^Production Tracker Podcast!D(\d+)$/u.exec(item.sourceRef ?? "");
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function SourceBox({ check, field, state, canEdit, busy, onAction }: {
  check: ProductionSourceCheck;
  field: "guest_agreement" | "dubbing" | "hindi_live";
  state: "checked" | "unchecked" | "not_box";
  canEdit: boolean;
  busy: boolean;
  onAction: Action;
}) {
  if (state === "not_box") return check.agreementNote && field === "guest_agreement" ? <span className="whitespace-pre-wrap">{check.agreementNote}</span> : null;
  return <button type="button" disabled={!canEdit || busy} aria-label={`Row ${check.sourceRow} ${field.replaceAll("_", " ")}: ${state}`} aria-pressed={state === "checked"} onClick={() => void onAction("update_source_check", { itemId: check.itemId, sourceRow: check.sourceRow, field, state: state === "checked" ? "unchecked" : "checked" })} className="min-h-9 min-w-9 text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention disabled:cursor-default">{state === "checked" ? "☑" : "☐"}</button>;
}

export function ProductionTrackerSheet({ snapshot, itemIds, busy, onSelectItem, onAction }: {
  snapshot: ProductionSnapshot;
  itemIds: ReadonlySet<string>;
  busy: boolean;
  onSelectItem: (id: string) => void;
  onAction: Action;
}) {
  const groups: TrackerGroup[] = snapshot.items
    .filter((item) => itemIds.has(item.id) && Number.isFinite(sourceRow(item)))
    .map((item) => ({ item, checks: snapshot.sourceChecks.filter((check) => check.itemId === item.id && check.sourceRow < 17).sort((a, b) => a.sourceRow - b.sourceRow) }))
    .filter((group) => group.checks.length > 0)
    .sort((a, b) => sourceRow(a.item) - sourceRow(b.item));
  const stageSpans = new Map<number, number>();
  for (let index = 0; index < groups.length;) {
    const first = index;
    let count = 0;
    while (index < groups.length && groups[index].item.stage === groups[first].item.stage) {
      count += groups[index].checks.length;
      index += 1;
    }
    stageSpans.set(first, count);
  }
  const headers = ["Status", "Thought Leaders", "Role", "Ep Name", "Location of Shoot", "Date of Shoot/tentative", "Date of Release/tentative", "Guest Agreement", "Dubbing", "Hindi Episode Live?"];

  return <section aria-label="Production Tracker Podcast" className="border-2 border-foreground bg-canvas">
    <div className="border-b-2 border-foreground bg-surface-raised p-4">
      <h2 className="font-heading text-xl">Production Tracker · Podcast</h2>
      <p className="mt-1 font-body text-sm text-secondary">Workbook column order and source boxes are kept here. A checked box stays checked even when an adjacent note adds context. Unnamed rows 17–19 are omitted.</p>
    </div>
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[1420px] border-collapse text-left font-body text-xs">
        <thead><tr>{headers.map((header) => <th key={header} scope="col" className="border border-foreground/50 bg-[#D5A6BD] px-2 py-2 font-label font-bold text-foreground">{header}</th>)}</tr></thead>
        <tbody>{groups.flatMap((group, groupIndex) => {
          const shoot = snapshot.events.find((event) => event.itemId === group.item.id && event.kind === "shoot");
          const release = snapshot.events.find((event) => event.itemId === group.item.id && event.kind === "main_post");
          return group.checks.map((check, rowIndex) => {
            const nameSpan = check.guestName ? 1 + group.checks.slice(rowIndex + 1).findIndex((later) => later.guestName !== null) : 0;
            const resolvedNameSpan = check.guestName ? nameSpan === 0 ? group.checks.length - rowIndex : nameSpan : 0;
            const isGroupStart = rowIndex === 0;
            const stageSpan = isGroupStart ? stageSpans.get(groupIndex) : undefined;
            return <tr key={`${group.item.id}:${check.sourceRow}`} className="align-top">
              {stageSpan && <th rowSpan={stageSpan} scope="rowgroup" className="min-w-32 border border-foreground/50 px-2 py-3 text-center font-label text-sm font-bold" style={{ backgroundColor: group.item.stage === "published" ? "#93C47D" : "#FFE599" }}>{group.item.stage === "published" ? "Posted" : "Post Production"}</th>}
              {check.guestName ? <td rowSpan={resolvedNameSpan} className="min-w-40 border border-foreground/50 p-2">{check.guestName}</td> : rowIndex === 0 ? <td className="min-w-40 border border-foreground/50 p-2" /> : null}
              <td className="min-w-48 whitespace-pre-wrap border border-foreground/50 p-2">{check.guestRole ?? ""}</td>
              {isGroupStart && <td rowSpan={group.checks.length} className="min-w-64 border border-foreground/50 p-2"><button type="button" className="text-left font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention" onClick={() => onSelectItem(group.item.id)}>{group.item.title}</button></td>}
              {isGroupStart && <td rowSpan={group.checks.length} className="min-w-40 border border-foreground/50 p-2">{group.item.shootLocation ?? ""}</td>}
              {isGroupStart && <td rowSpan={group.checks.length} className="min-w-32 border border-foreground/50 p-2">{shoot ? dayLabel(shoot.day) : ""}</td>}
              {isGroupStart && <td rowSpan={group.checks.length} className="min-w-32 border border-foreground/50 p-2">{release ? dayLabel(release.day) : ""}</td>}
              <td className="min-w-32 whitespace-pre-wrap border border-foreground/50 p-2"><SourceBox check={check} field="guest_agreement" state={check.guestAgreement} canEdit={snapshot.canEdit} busy={busy} onAction={onAction} /></td>
              <td className="min-w-24 border border-foreground/50 p-2"><SourceBox check={check} field="dubbing" state={check.dubbing} canEdit={snapshot.canEdit} busy={busy} onAction={onAction} /></td>
              <td className="min-w-32 border border-foreground/50 p-2"><SourceBox check={check} field="hindi_live" state={check.hindiLive} canEdit={snapshot.canEdit} busy={busy} onAction={onAction} /></td>
            </tr>;
          });
        })}</tbody>
      </table>
    </div>
    {!groups.length && <p className="p-5 font-body text-sm text-secondary">No production-tracker episodes match these filters.</p>}
  </section>;
}

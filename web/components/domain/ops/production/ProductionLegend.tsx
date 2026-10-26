"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { productionActionMarks, safeIpColor, type ProductionAction, type ProductionIp, type ProductionItem } from "@/lib/ops/production-data";

const inputClass = "min-h-10 min-w-0 border-2 border-foreground bg-canvas px-2 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention";
type Action = (action: ProductionAction, data: Record<string, unknown>) => Promise<boolean>;

export function ProductionLegend({ ips, items, canManage, busy, onAction }: {
  ips: readonly ProductionIp[];
  items: readonly ProductionItem[];
  canManage: boolean;
  busy: boolean;
  onAction: Action;
}) {
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [newColor, setNewColor] = useState("");
  const validColor = /^#[0-9a-fA-F]{6}$/u.test(newColor);
  return (
    <div className="space-y-3">
      <section aria-label="Action legend" className="border border-foreground/40 bg-canvas">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
          <h2 className="font-label text-xs font-bold">Calendar marks</h2>
          {productionActionMarks.map((mark) => <span key={mark.icon} className="font-label text-xs"><span aria-hidden="true" className="mr-1 border border-foreground/20 px-1" style={{ backgroundColor: mark.color }}>{mark.icon}</span>{mark.label}</span>)}
        </div>
      </section>
      <section aria-label="IP legend" className="border border-foreground/40 bg-canvas">
        <div className="border-b border-foreground/25 px-4 py-3"><h2 className="font-heading text-lg">IP colours and targets</h2><p className="font-body text-xs text-secondary">The IP colour identifies the series; the icon identifies the calendar action. Select an IP below to edit its settings.</p></div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {ips.filter((ip) => ip.active || canManage).map((ip) => <IpRow key={ip.id} ip={ip} progress={items.filter((item) => item.ipId === ip.id).length} canManage={canManage} busy={busy} onAction={onAction} />)}
        </div>
        {canManage && <details className="border-t border-foreground/25 px-3 py-2"><summary className="cursor-pointer font-label text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">Add another IP</summary><form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto]" onSubmit={(event) => { event.preventDefault(); if (!newName.trim() || !validColor) return; void onAction("create_ip", { name: newName.trim(), parent: newParent.trim() || null, color: newColor, active: true }).then((ok) => { if (ok) { setNewName(""); setNewParent(""); setNewColor(""); } }); }}><input aria-label="New IP name" className={inputClass} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New IP name" maxLength={120} disabled={busy} /><input aria-label="Parent or brand" className={inputClass} value={newParent} onChange={(event) => setNewParent(event.target.value)} placeholder="Parent or brand (optional)" maxLength={120} disabled={busy} /><input aria-label="Color hexadecimal" className={inputClass} value={newColor} onChange={(event) => setNewColor(event.target.value)} placeholder="#RRGGBB" maxLength={7} disabled={busy} /><Button type="submit" variant="secondary" disabled={!newName.trim() || !validColor || busy}>Add IP</Button></form></details>}
      </section>
    </div>
  );
}

function IpRow({ ip, progress, canManage, busy, onAction }: {
  ip: ProductionIp;
  progress: number;
  canManage: boolean;
  busy: boolean;
  onAction: Action;
}) {
  const [name, setName] = useState(ip.name);
  const [parent, setParent] = useState(ip.parent ?? "");
  const [color, setColor] = useState(ip.color);
  const [active, setActive] = useState(ip.active);
  const [targetCount, setTargetCount] = useState(ip.targetCount == null ? "" : String(ip.targetCount));
  const [targetPlus, setTargetPlus] = useState(ip.targetPlus);
  useEffect(() => { setName(ip.name); setParent(ip.parent ?? ""); setColor(ip.color); setActive(ip.active); setTargetCount(ip.targetCount == null ? "" : String(ip.targetCount)); setTargetPlus(ip.targetPlus); }, [ip]);

  const label = <><span aria-hidden="true" className="h-3 w-3 shrink-0 border border-foreground/40" style={{ backgroundColor: safeIpColor(ip.color) }} /><span className="min-w-0 flex-1 font-label text-sm font-bold">{ip.name}</span>{ip.targetCount != null && <span className="font-label text-xs tabular-nums text-secondary">{progress} / {ip.targetCount}{ip.targetPlus ? "+" : ""}</span>}{!ip.active && <span className="font-label text-[11px] text-secondary">inactive</span>}</>;

  return <div className="border border-foreground/30 border-l-[5px] bg-surface-raised" style={{ borderLeftColor: safeIpColor(ip.color) }}>
    {canManage ? <details className="group"><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">{label}<span className="font-label text-[11px] text-secondary group-open:hidden">Edit</span></summary><form className="grid gap-2 border-t border-foreground/20 p-2.5" onSubmit={(event) => { event.preventDefault(); if (!name.trim() || !/^#[0-9a-fA-F]{6}$/u.test(color)) return; void onAction("update_ip", { id: ip.id, name: name.trim(), parent: parent.trim() || null, color, active }); }}><div className="grid grid-cols-[minmax(0,1fr)_4.25rem] gap-1"><input aria-label={`${ip.name} label`} className={inputClass} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} maxLength={120} /><input aria-label={`${ip.name} color`} type="color" className="h-10 w-full cursor-pointer border-2 border-foreground bg-canvas p-0.5" value={/^#[0-9a-fA-F]{6}$/u.test(color) ? color : safeIpColor(ip.color)} onChange={(event) => setColor(event.target.value)} disabled={busy} /></div><input aria-label={`${ip.name} parent`} className={inputClass} value={parent} onChange={(event) => setParent(event.target.value)} placeholder="Parent or brand" disabled={busy} maxLength={120} /><div className="flex items-center justify-between"><label className="flex items-center gap-2 font-label text-xs"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={busy} />Active</label><Button type="submit" variant="ghost" disabled={busy || !name.trim()}>Save IP</Button></div><div className="flex flex-wrap items-end gap-2 border-t border-foreground/20 pt-2"><label className="grid gap-1 font-label text-xs">Target<input aria-label={`${ip.name} target`} type="number" min="0" max="100000" className={`${inputClass} w-20`} value={targetCount} onChange={(event) => setTargetCount(event.target.value)} disabled={busy} placeholder="—" /></label><label className="flex items-center gap-1 pb-2 font-label text-xs"><input type="checkbox" checked={targetPlus} onChange={(event) => setTargetPlus(event.target.checked)} disabled={busy} />At least (+)</label><Button type="button" variant="ghost" disabled={busy || (targetCount !== "" && (!Number.isInteger(Number(targetCount)) || Number(targetCount) < 0))} onClick={() => void onAction("update_ip_target", { id: ip.id, targetCount: targetCount === "" ? null : Number(targetCount), targetPlus })}>Save target</Button></div></form></details> : <div className="flex min-h-11 items-center gap-2 px-2.5 py-2">{label}</div>}
  </div>;
}

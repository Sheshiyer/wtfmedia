"use client";

import { FormEvent, useEffect, useState } from "react";
import { OperatorActionDialog } from "./OperatorActionDialog";
import { OperatorRoster, type OperatorRosterRow } from "./OperatorRoster";

type Role = "super_admin" | "admin" | "editor";
type Dialog = { action: "deactivate" | "transfer"; email: string } | null;
const endpoint = "/api/ops/operators";

function validRoster(value: unknown): value is { operators: OperatorRosterRow[] } {
  return !!value && typeof value === "object" && Array.isArray((value as { operators?: unknown }).operators) && (value as { operators: unknown[] }).operators.every((row) => !!row && typeof row === "object" && typeof (row as OperatorRosterRow).name === "string" && typeof (row as OperatorRosterRow).email === "string" && ["super_admin", "admin", "editor"].includes((row as OperatorRosterRow).role) && typeof (row as OperatorRosterRow).active === "boolean");
}

export function OperatorsWorkspace({ role }: { role: Role }) {
  const [rows, setRows] = useState<OperatorRosterRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "measured-zero">("loading");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const refresh = async () => {
    setState("loading");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !validRoster(data)) throw new Error("operator_unavailable");
      setRows(data.operators); setState(data.operators.length ? "ready" : "measured-zero");
    } catch { setRows([]); setState("unavailable"); }
  };
  useEffect(() => { void refresh(); }, []);
  const mutate = async (body: Record<string, unknown>) => {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !validRoster(data)) throw new Error("operator_unavailable");
      setRows(data.operators); setState(data.operators.length ? "ready" : "measured-zero"); setNotice("operator access updated."); return true;
    } catch { setNotice("operator change is unavailable right now. retry or cancel."); return false; }
  };
  const submitInvite = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (await mutate({ action: "invite", email: form.get("email"), role: form.get("role") })) event.currentTarget.reset(); };
  const submitApproval = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (await mutate({ action: "approve_invitation", email: form.get("email"), name: form.get("name") })) event.currentTarget.reset(); };
  return <><div aria-live="polite" className="sr-only">{notice}</div><OperatorRoster rows={rows} state={state} />{state === "ready" && <section className="mt-8 space-y-6" aria-label="operator actions"><form onSubmit={submitInvite} className="grid gap-3 border-2 border-foreground p-4 sm:grid-cols-3"><label className="grid gap-1"><span className="text-label">approved email</span><input required name="email" type="email" className="min-h-11 border-2 border-foreground bg-canvas px-3" /></label><label className="grid gap-1"><span className="text-label">application role</span><select name="role" className="min-h-11 border-2 border-foreground bg-canvas px-3"><option value="editor">editor</option><option value="admin">admin</option></select></label><button className="min-h-11 self-end border-2 border-foreground bg-attention px-4 py-3 font-semibold">invite approved operator</button></form>{role === "super_admin" && <form onSubmit={submitApproval} className="grid gap-3 border-2 border-foreground p-4 sm:grid-cols-3"><label className="grid gap-1"><span className="text-label">email to approve</span><input required name="email" type="email" className="min-h-11 border-2 border-foreground bg-canvas px-3" /></label><label className="grid gap-1"><span className="text-label">approved name</span><input required name="name" className="min-h-11 border-2 border-foreground bg-canvas px-3" /></label><button className="min-h-11 self-end border-2 border-foreground px-4 py-3 font-semibold">approve invitation</button></form>}<ul className="grid gap-3">{rows.filter((row) => row.role !== "super_admin").map((row) => <li key={row.email} className="flex flex-wrap gap-2 border-2 border-foreground p-3"><strong className="mr-auto">{row.email}</strong><button type="button" onClick={() => void mutate({ action: "change_role", email: row.email, role: row.role === "admin" ? "editor" : "admin" })} className="min-h-11 border-2 border-foreground px-3">make {row.role === "admin" ? "editor" : "admin"}</button><button type="button" onClick={() => row.active ? setDialog({ action: "deactivate", email: row.email }) : void mutate({ action: "set_active", email: row.email, active: true })} className="min-h-11 border-2 border-foreground px-3">{row.active ? "deactivate" : "reactivate"}</button>{role === "super_admin" && row.active && <button type="button" onClick={() => setDialog({ action: "transfer", email: row.email })} className="min-h-11 border-2 border-foreground px-3">transfer seat</button>}</li>)}</ul></section>}{dialog && <OperatorActionDialog action={dialog.action} targetEmail={dialog.email} onClose={() => setDialog(null)} onConfirm={() => mutate(dialog.action === "transfer" ? { action: "transfer", email: dialog.email } : { action: "set_active", email: dialog.email, active: false })} />}</>;
}

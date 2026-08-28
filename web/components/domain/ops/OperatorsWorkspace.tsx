"use client";

import { FormEvent, useEffect, useState } from "react";
import { OperatorActionDialog } from "./OperatorActionDialog";
import { OperatorRoster, type OperatorRosterRow } from "./OperatorRoster";

type Role = "super_admin" | "admin" | "editor";
type Dialog = { action: "deactivate" | "transfer"; email: string } | null;
const endpoint = "/api/ops/operators";
const field =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body";
const ghost =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-label text-sm font-bold";
const command =
  "min-h-11 rounded-control border-2 border-foreground bg-attention px-4 py-3 font-label text-sm font-bold text-on-attention";

function validRoster(value: unknown): value is { operators: OperatorRosterRow[] } {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { operators?: unknown }).operators) &&
    (value as { operators: unknown[] }).operators.every(
      (row) =>
        !!row &&
        typeof row === "object" &&
        typeof (row as OperatorRosterRow).name === "string" &&
        typeof (row as OperatorRosterRow).email === "string" &&
        ["super_admin", "admin", "editor"].includes((row as OperatorRosterRow).role) &&
        typeof (row as OperatorRosterRow).active === "boolean",
    )
  );
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
      setRows(data.operators);
      setState(data.operators.length ? "ready" : "measured-zero");
    } catch {
      setRows([]);
      setState("unavailable");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const mutate = async (body: Record<string, unknown>) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data: unknown = await response.json();
      if (!response.ok || !validRoster(data)) throw new Error("operator_unavailable");
      setRows(data.operators);
      setState(data.operators.length ? "ready" : "measured-zero");
      setNotice("operator access updated.");
      return true;
    } catch {
      setNotice("operator change is unavailable right now. retry or cancel.");
      return false;
    }
  };

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await mutate({ action: "invite", email: form.get("email"), role: form.get("role") })) {
      event.currentTarget.reset();
    }
  };

  const submitApproval = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await mutate({ action: "approve_invitation", email: form.get("email"), name: form.get("name") })) {
      event.currentTarget.reset();
    }
  };

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {notice}
      </div>
      <OperatorRoster rows={rows} state={state} />
      {state === "ready" && (
        <section className="mt-8 space-y-6" aria-label="operator actions">
          <form
            onSubmit={submitInvite}
            className="grid gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:grid-cols-3"
          >
            <label className="grid gap-1">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                approved email
              </span>
              <input required name="email" type="email" className={field} />
            </label>
            <label className="grid gap-1">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                application role
              </span>
              <select name="role" className={field}>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button className={`${command} self-end`}>invite approved operator</button>
          </form>
          {role === "super_admin" && (
            <form
              onSubmit={submitApproval}
              className="grid gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:grid-cols-3"
            >
              <label className="grid gap-1">
                <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  email to approve
                </span>
                <input required name="email" type="email" className={field} />
              </label>
              <label className="grid gap-1">
                <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  approved name
                </span>
                <input required name="name" className={field} />
              </label>
              <button className={`${ghost} self-end`}>approve invitation</button>
            </form>
          )}
          <ul className="grid gap-3">
            {rows
              .filter((row) => row.role !== "super_admin")
              .map((row) => (
                <li
                  key={row.email}
                  className="flex flex-wrap items-center gap-2 rounded-panel border-2 border-foreground bg-canvas p-3"
                >
                  <strong className="mr-auto break-words font-body text-[13px]">{row.email}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      void mutate({
                        action: "change_role",
                        email: row.email,
                        role: row.role === "admin" ? "editor" : "admin",
                      })
                    }
                    className={ghost}
                  >
                    make {row.role === "admin" ? "editor" : "admin"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      row.active
                        ? setDialog({ action: "deactivate", email: row.email })
                        : void mutate({ action: "set_active", email: row.email, active: true })
                    }
                    className={ghost}
                  >
                    {row.active ? "deactivate" : "reactivate"}
                  </button>
                  {role === "super_admin" && row.active && (
                    <button
                      type="button"
                      onClick={() => setDialog({ action: "transfer", email: row.email })}
                      className={ghost}
                    >
                      transfer seat
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
      {dialog && (
        <OperatorActionDialog
          action={dialog.action}
          targetEmail={dialog.email}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            mutate(
              dialog.action === "transfer"
                ? { action: "transfer", email: dialog.email }
                : { action: "set_active", email: dialog.email, active: false },
            )
          }
        />
      )}
    </>
  );
}

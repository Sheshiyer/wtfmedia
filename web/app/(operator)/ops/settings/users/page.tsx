"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

type Member = {
  id: number;
  email: string;
  role: "member";
  lifecycleState: "invited" | "active" | "suspended" | "revoked";
  pilotCohort: "bangalore" | "company";
  office: string;
  invitationStatus: string | null;
  changedAt: string;
};

export default function CompanyUsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setState("loading");
    try {
      const response = await fetch("/api/ops/members", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.members)) throw new Error("members_unavailable");
      setMembers(body.members as Member[]);
      setState("ready");
    } catch {
      setState("unavailable");
    }
  };

  useEffect(() => { void refresh(); }, []);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      const response = await fetch("/api/ops/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "invite", email: form.get("email"), pilotCohort: form.get("pilotCohort"), office: form.get("office") }),
      });
      if (!response.ok) throw new Error("invite_unavailable");
      setNotice("Invitation recorded and sent through Clerk.");
      event.currentTarget.reset();
      await refresh();
    } catch {
      setNotice("Invitation could not be confirmed. No member should be treated as active until the roster updates.");
    }
  };

  const changeLifecycle = async (email: string, action: "revoke" | "suspend" | "reactivate") => {
    setNotice(null);
    try {
      const response = await fetch("/api/ops/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, email }) });
      if (!response.ok) throw new Error("member_lifecycle_unavailable");
      setNotice(`Member ${action === "suspend" ? "suspended" : action === "reactivate" ? "reactivated" : "revoked"}. Their Beta access is rechecked on the next request.`);
      await refresh();
    } catch {
      setNotice("The member lifecycle change could not be confirmed. Access remains governed by the current server roster.");
    }
  };

  return <div>
    <WorkspaceHeader size="page" eyebrow="settings / company users" title="company users" summary="Bangalore is the first invite-only cohort in one shared company workspace. Membership never grants operator access or visibility into another member’s private chat." accent="information" />
    <form onSubmit={invite} className="mt-6 grid gap-4 rounded-panel border-2 border-foreground bg-surface-raised p-5 md:grid-cols-4" aria-label="invite company user">
      <label className="grid gap-1 text-sm font-semibold">email<input required name="email" type="email" className="border-2 border-foreground bg-canvas px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-semibold">office<input required name="office" defaultValue="Bangalore" className="border-2 border-foreground bg-canvas px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-semibold">rollout cohort<select name="pilotCohort" defaultValue="bangalore" className="border-2 border-foreground bg-canvas px-3 py-2"><option value="bangalore">Bangalore pilot</option><option value="company">Company expansion</option></select></label>
      <button className="self-end border-2 border-foreground bg-attention px-4 py-2 font-label font-bold lowercase text-on-attention">send invite</button>
    </form>
    {notice && <p className="mt-4 rounded-control border-2 border-foreground bg-surface-subtle p-3 text-sm">{notice}</p>}
    <section className="mt-6" aria-label="company member roster">
      <h2 className="font-heading text-2xl font-bold lowercase">membership roster</h2>
      {state === "loading" && <p className="mt-3 text-secondary">Loading verified membership records…</p>}
      {state === "unavailable" && <p className="mt-3 text-secondary">Membership records are unavailable. This does not reveal or alter member content.</p>}
      {state === "ready" && <div className="mt-3 overflow-x-auto border-2 border-foreground"><table className="min-w-full text-left text-sm"><thead className="bg-surface-subtle"><tr><th className="p-3">email</th><th className="p-3">office</th><th className="p-3">lifecycle</th><th className="p-3">invitation</th><th className="p-3">actions</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} className="border-t border-foreground/30"><td className="p-3">{member.email}</td><td className="p-3">{member.office}</td><td className="p-3">{member.lifecycleState}</td><td className="p-3">{member.invitationStatus ?? "not sent"}</td><td className="p-3"><div className="flex gap-2">{member.lifecycleState === "active" && <button onClick={() => void changeLifecycle(member.email, "suspend")} className="underline">suspend</button>}{member.lifecycleState === "suspended" && <button onClick={() => void changeLifecycle(member.email, "reactivate")} className="underline">reactivate</button>}{member.lifecycleState !== "revoked" && <button onClick={() => void changeLifecycle(member.email, "revoke")} className="underline">revoke</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";

type User = { email: string; name: string; role: "member" | "editor" | "admin" | "super_admin"; status: "active" | "invited" | "suspended" | "revoked" | "deletion_pending"; changedAt: string };
const endpoint = "/beta/api/admin/users";
const control = "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 py-2 text-sm";
const messages: Record<string, string> = {
  deletion_pending: "History has been erased and access blocked, but account deletion could not finish. Retry Delete to complete it.",
  deletion_not_configured: "Account deletion is unavailable. Contact your administrator.",
  confirm_email_required: "Type the user's email to confirm deletion.",
  user_already_exists: "This user already has an account. Change their role in the list below.",
  invitation_not_sent: "The invitation could not be sent. Check the email and try again.",
  activate_user_before_changing_role: "Reactivate this user before changing their role.",
  cannot_change_your_own_access: "You cannot change your own access.",
  super_admin_is_protected: "The super admin must be managed through the ownership transfer process.",
};
export function UsersWorkspace() {
  const cancel = useRef<HTMLButtonElement>(null);
  const fetchUser = useMemberFetch();
  const principal = useBetaPrincipal();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [search, setSearch] = useState("");
  const [confirmation, setConfirmation] = useState<{ email: string; action: string } | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchUser(endpoint); const data = await r.json();
      if (!r.ok || !Array.isArray(data.users)) throw new Error();
      setUsers(data.users);
    } catch { setNotice("Users could not be loaded. Try refreshing."); }
    finally { setLoading(false); }
  }, [fetchUser]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function update(input: { action: string; email: string; role?: string; confirmEmail?: string }) {
    setBusy(true); setNotice("");
    try {
      const r = await fetchUser(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await r.json();
      if (!r.ok) { setNotice(messages[data.error] || "The update could not be completed. Try again."); if (data.error === "deletion_pending") await refresh(); return; }
      setUsers(data.users); setConfirmation(null);
      setNotice(input.action === "delete" ? "User account and history deleted." : input.action === "invite" ? "Invitation sent. The user can join as a member; change their role after they join." : "User access updated. Changes apply on their next request.");
      if (input.action === "invite") setEmail("");
    } catch { setNotice("The update could not be completed. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5" aria-label="User management">
    <form className="flex flex-wrap items-end gap-3 border-2 border-foreground p-4" onSubmit={e => { e.preventDefault(); void update({ action: "invite", email }); }}>
      <label className="grid flex-1 gap-1">Email address<input className={control} type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className={`${control} bg-attention font-bold`} disabled={busy}>Invite user</button>
    </form>
    <p role="status" className="text-sm">{notice}</p>
    <div className="flex flex-wrap gap-3"><label className="grid flex-1 gap-1">Search users<input className={control} type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><button className={`${control} self-end`} onClick={() => void refresh()} disabled={loading || busy}>Refresh users</button></div>
    {loading ? <p>Loading users…</p> : <ul className="grid gap-3">
      {users.filter(u => `${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())).map(user => {
        const protectedUser = user.role === "super_admin" || user.email === principal.email;
        return <li key={user.email} className="flex flex-wrap items-center gap-4 border-2 border-foreground bg-surface-raised p-4">
          <div className="min-w-0 flex-1"><p className="break-words font-bold">{user.name}</p><p className="break-all text-sm">{user.email}</p><p className="mt-1 text-sm">{user.status === "deletion_pending" ? "Deletion pending — access blocked" : user.status === "revoked" ? "Access removed" : user.status}</p></div>
          <label className="grid gap-1 text-sm">Role<select aria-label={`Role for ${user.email}`} className={control} value={user.role} disabled={busy || protectedUser || user.status !== "active"} onChange={e => void update({ action: "role", email: user.email, role: e.target.value })}>
            {user.role === "super_admin" && <option value="super_admin">Super admin</option>}
            <option value="member">Member</option><option value="editor">Editor</option><option value="admin">Admin</option>
          </select></label>
          {!protectedUser && user.status !== "revoked" && user.status !== "deletion_pending" && <div className="flex flex-wrap gap-2">
            {user.status === "active" && <button className={control} disabled={busy} onClick={() => setConfirmation({ email: user.email, action: "suspend" })}>Suspend</button>}
            {user.status === "suspended" && <button className={control} disabled={busy} onClick={() => void update({ action: "reactivate", email: user.email })}>Reactivate</button>}

            {principal.role === "super_admin" && user.role !== "member" && user.status === "active" && <button className={control} disabled={busy} onClick={() => setConfirmation({ email: user.email, action: "transfer" })}>Transfer ownership</button>}
          </div>}
          {!protectedUser && <button className={`${control} text-editorial`} disabled={busy} onClick={() => { setConfirmEmail(""); setConfirmation({ email: user.email, action: "delete" }); }}>Delete user</button>}
        </li>;
      })}
      {!users.length && <li>No users found.</li>}
    </ul>}
    {confirmation && <Dialog.Root open onOpenChange={open => { if (!open && !busy) setConfirmation(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus(); }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 border-2 border-foreground bg-canvas p-6">
      <Dialog.Title id="user-confirm-title" className="text-xl font-bold">{confirmation.action === "delete" ? "Delete user and all history?" : confirmation.action === "transfer" ? "Transfer ownership?" : confirmation.action === "suspend" ? "Suspend user?" : "Remove user access?"}</Dialog.Title>
      <Dialog.Description className="break-all">{confirmation.email}</Dialog.Description><p>{confirmation.action === "delete" ? "Permanently deletes this account, all active and archived chats, and saved preferences. This cannot be undone. Minimal security and deletion records are retained." : confirmation.action === "transfer" ? "This user becomes the sole super admin. Your role becomes admin." : confirmation.action === "suspend" ? "This blocks app access until you reactivate them." : "This revokes app access. Existing history is retained."}</p>
      {confirmation.action === "delete" && <label className="grid gap-1">Type the email to confirm<input className={control} type="email" autoComplete="off" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} /></label>}
      {notice && <p role="alert" className="text-sm">{notice}</p>}
      <button ref={cancel} className={control} disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button>{" "}<button className={`${control} bg-attention`} disabled={busy || (confirmation.action === "delete" && confirmEmail.trim().toLowerCase() !== confirmation.email)} onClick={() => void update({ ...confirmation, ...(confirmation.action === "delete" ? { confirmEmail: confirmEmail.trim().toLowerCase() } : {}) })}>Confirm</button>
    </Dialog.Content></Dialog.Portal></Dialog.Root>}
  </section>;
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { appendMemberHistoryPage, canConfirmMemberConversationDeletion, linkedSavedPreferenceDeletionNotice, type MemberConversation } from "@/lib/member/chat";
import { createMemberChatAdapter, createOperatorChatAdapter, type BetaChatAdapter, type BetaHistoryResponse } from "./BetaChatAdapter";
import { useBetaPrincipal, useMemberFetch } from "./BetaPrincipalGate";

type LoadState = "loading" | "ready" | "empty" | "error";
type DeleteTarget = Pick<MemberConversation, "id" | "title" | "linkedSavedPreferenceCount">;

function DeleteDialog({ target, pending, error, onClose, onConfirm }: { target: DeleteTarget; pending: boolean; error: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState("");
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70" />
      <Dialog.Content aria-labelledby="settings-delete-title" aria-describedby="settings-delete-description" onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }} className="fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none">
        <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.16)]">
          <Dialog.Title id="settings-delete-title" className="font-heading text-2xl font-bold lowercase">delete this conversation permanently?</Dialog.Title>
          <Dialog.Description id="settings-delete-description" className="mt-3 text-sm leading-relaxed text-secondary">“{target.title}” and its messages will be removed and cannot be restored. {linkedSavedPreferenceDeletionNotice(target.linkedSavedPreferenceCount)}</Dialog.Description>
          {error ? <p role="status" className="mt-3 border-l-4 border-attention px-3 text-sm text-secondary">The conversation was not deleted. Please try again.</p> : null}
          <label className="mt-5 grid gap-2 font-label text-xs font-bold lowercase">Type DELETE to confirm
            <input aria-label="Type DELETE to confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" className="min-h-11 border-2 border-foreground bg-canvas px-3 font-body text-sm normal-case focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information" />
          </label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>keep conversation</Button>
            <Button variant="secondary" className="border-editorial bg-editorial text-on-editorial hover:bg-editorial/90" onClick={() => void onConfirm()} loading={pending} disabled={pending || !canConfirmMemberConversationDeletion(confirmation)}>delete permanently</Button>
          </div>
        </section>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function BetaSessionsSettingsPanel() {
  const principal = useBetaPrincipal();
  const request = useMemberFetch();
  const adapter = useMemo<BetaChatAdapter>(() => principal.kind === "member" ? createMemberChatAdapter(request) : createOperatorChatAdapter(request), [principal.kind, request]);
  const [history, setHistory] = useState<BetaHistoryResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setState("loading");
    setMessage(null);
    try {
      const page = await adapter.list(undefined, { includeArchived: true });
      if (current !== generation.current) return;
      if (!page) throw new Error("session_history_unavailable");
      setHistory(page);
      setState(page.conversations.length ? "ready" : "empty");
    } catch {
      if (current === generation.current) setState("error");
    }
  }, [adapter]);

  useEffect(() => { void load(); return () => { generation.current += 1; }; }, [load]);

  const loadMore = useCallback(async () => {
    const cursor = history?.nextCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await adapter.list(cursor, { includeArchived: true });
      if (!page) throw new Error("session_history_page_unavailable");
      setHistory((current) => current ? appendMemberHistoryPage(current, page) : page);
    } catch {
      setMessage("Older sessions could not be loaded. Nothing changed.");
    } finally {
      setLoadingMore(false);
    }
  }, [adapter, history?.nextCursor, loadingMore]);

  const archive = useCallback(async (conversationId: string) => {
    if (action) return;
    setAction(`archive:${conversationId}`);
    setMessage(null);
    try {
      if (!await adapter.archive(conversationId)) throw new Error("archive_unavailable");
      await load();
      setMessage("Conversation archived. It remains available in this session history.");
    } catch {
      setMessage("Conversation could not be archived. Nothing changed.");
    } finally {
      setAction(null);
    }
  }, [action, adapter, load]);

  const remove = useCallback(async () => {
    if (!deleteTarget || !adapter.delete || action) return;
    setAction(`delete:${deleteTarget.id}`);
    setDeleteError(false);
    try {
      if (!await adapter.delete(deleteTarget.id)) throw new Error("delete_unavailable");
      setDeleteTarget(null);
      await load();
      setMessage("Conversation permanently deleted.");
    } catch {
      setDeleteError(true);
    } finally {
      setAction(null);
    }
  }, [action, adapter, deleteTarget, load]);

  const conversations = history?.conversations ?? [];
  const activeCount = conversations.filter((conversation) => conversation.state === "active").length;
  const archivedCount = conversations.length - activeCount;

  return <section className="mt-6 grid gap-4" aria-label="Session history and privacy" data-beta-session-settings>
    <article className="border-2 border-foreground bg-surface-raised p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-information">private history</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold lowercase">all your sessions</h2>
          <p className="mt-2 text-sm text-secondary">Active and archived conversations stay scoped to this signed-in account.</p>
        </div>
        {state === "ready" ? <p className="font-label text-[10px] font-bold uppercase tracking-wide text-muted">{activeCount} active · {archivedCount} archived</p> : null}
      </div>

      {state === "loading" ? <p role="status" className="mt-4 border-2 border-foreground/20 bg-surface-subtle p-4 text-sm text-secondary">loading sessions…</p> : null}
      {state === "empty" ? <div className="mt-4 border-2 border-foreground/20 bg-surface-subtle p-4"><p className="text-sm text-secondary">No saved conversations yet.</p><Link href="/beta/chat" className="mt-3 inline-flex min-h-11 items-center border-2 border-foreground bg-attention px-4 font-label text-sm font-bold lowercase text-on-attention">start a chat</Link></div> : null}
      {state === "error" ? <div role="status" className="mt-4 border-2 border-foreground/20 bg-surface-subtle p-4 text-sm text-secondary">The staging session service did not complete this signed-in request.<Button variant="secondary" onClick={() => void load()} className="mt-3">retry</Button></div> : null}
      {message ? <p role="status" className="mt-4 border-l-4 border-information px-3 text-sm text-secondary">{message}</p> : null}

      {state === "ready" ? <div className="mt-4 grid gap-3">{conversations.map((conversation) => {
        const href = adapter.href(conversation.id);
        return <article key={conversation.id} className="min-w-0 border-2 border-foreground/25 bg-canvas p-4" data-session-state={conversation.state}>
          <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              {href ? <Link href={href} className="line-clamp-2 block font-body text-sm font-semibold [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information">{conversation.title}</Link> : <p className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{conversation.title}</p>}
              <p className="mt-1 truncate font-label text-[10px] uppercase tracking-wide text-muted">{conversation.sourceMode} evidence · updated <time dateTime={conversation.updatedAt}>{conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString() : "not recorded"}</time></p>
            </div>
            <span className={`self-start border-2 px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wide ${conversation.state === "archived" ? "border-foreground/30 bg-surface-subtle text-muted" : "border-live bg-live/10 text-live"}`}>{conversation.state}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label={`${conversation.title} actions`}>
            {conversation.state === "active" ? <Button variant="ghost" onClick={() => void archive(conversation.id)} loading={action === `archive:${conversation.id}`} disabled={action !== null} className="min-h-9 px-3 py-1 text-xs">archive</Button> : null}
            {adapter.canDelete ? <Button variant="ghost" onClick={() => { setDeleteError(false); setDeleteTarget(conversation); }} disabled={action !== null} className="min-h-9 px-3 py-1 text-xs">delete</Button> : null}
          </div>
        </article>;
      })}{history?.nextCursor ? <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore}>load older sessions</Button> : null}</div> : null}
    </article>

    <article className="border-2 border-foreground bg-surface-subtle p-5 sm:p-7">
      <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-live">lifecycle controls</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold lowercase">archive or delete deliberately</h2>
      <p className="mt-3 text-sm leading-relaxed text-secondary">Archive keeps a conversation in your private history. {adapter.canDelete ? "Delete permanently removes a member conversation after typed confirmation; saved preferences remain separate." : "Operator history is currently audit-retained, so permanent delete is not available in this Beta."}</p>
    </article>

    {deleteTarget ? <DeleteDialog target={deleteTarget} pending={action === `delete:${deleteTarget.id}`} error={deleteError} onClose={() => { if (!action) setDeleteTarget(null); }} onConfirm={remove} /> : null}
  </section>;
}

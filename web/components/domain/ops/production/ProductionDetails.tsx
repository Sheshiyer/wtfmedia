"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ProductionActionBadge } from "./ProductionActionBadge";
import {
  dateStates,
  dayLabel,
  dubbingStatuses,
  isCalendarActionEvent,
  optionLabel,
  permissionStatuses,
  productionEventKinds,
  productionStages,
  type ProductionAction,
  type ProductionEvent,
  type ProductionSnapshot,
  type ProductionSourceCheck,
} from "@/lib/ops/production-data";

const fieldClass = "min-h-10 w-full rounded-control border-2 border-foreground bg-canvas px-2.5 py-1.5 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention disabled:opacity-50";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1"><span className="font-label text-[11px] font-bold uppercase tracking-[0.07em] text-secondary">{label}</span>{children}</label>;
}

type Action = (action: ProductionAction, data: Record<string, unknown>) => Promise<boolean>;

export function ProductionDetails({
  snapshot,
  selectedDay,
  selectedItemId,
  selectedEventId,
  showDayEvents,
  creating,
  busy,
  standalone = false,
  onSelectItem,
  onSelectEvent,
  onStartCreate,
  onCreated,
  onAction,
}: {
  snapshot: ProductionSnapshot;
  selectedDay: string;
  selectedItemId: string | null;
  selectedEventId: string | null;
  showDayEvents: boolean;
  creating: boolean;
  busy: boolean;
  standalone?: boolean;
  onSelectItem: (itemId: string | null) => void;
  onSelectEvent: (eventId: string | null) => void;
  onStartCreate: () => void;
  onCreated?: () => void;
  onAction: Action;
}) {
  const item = snapshot.items.find((record) => record.id === selectedItemId);
  const selectedEvent = snapshot.events.find((record) => record.id === selectedEventId);
  const dayEvents = snapshot.events.filter((event) => event.day === selectedDay && isCalendarActionEvent(event));
  const [dubbingOpen, setDubbingOpen] = useState(item?.sourceRef?.startsWith("Dubbing Tracker!") === true);
  const [blockersOpen, setBlockersOpen] = useState(snapshot.blockers.some((blocker) => blocker.itemId === selectedItemId && blocker.status !== "resolved"));
  const [title, setTitle] = useState("");
  const [ipId, setIpId] = useState("");
  const [format, setFormat] = useState("");
  const [stage, setStage] = useState("planned");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [shootLocation, setShootLocation] = useState("");
  const [eventKind, setEventKind] = useState("shoot");
  const [eventDay, setEventDay] = useState(selectedDay);
  const [eventState, setEventState] = useState("planned");
  const [eventOwner, setEventOwner] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [dubStatus, setDubStatus] = useState("unknown");
  const [dubLanguage, setDubLanguage] = useState("hi");
  const [dubOwner, setDubOwner] = useState("");
  const [dubNotes, setDubNotes] = useState("");
  const [newGuest, setNewGuest] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockOwner, setBlockOwner] = useState("");
  const [blockAction, setBlockAction] = useState("");

  useEffect(() => {
    setTitle(item?.title ?? "");
    setIpId(item?.ipId ?? "");
    setFormat(item?.format ?? "");
    setStage(item?.stage ?? "planned");
    setOwner(item?.owner ?? "");
    setNotes(item?.notes ?? "");
    setShootLocation(item?.shootLocation ?? "");
  }, [item, snapshot.ips]);

  useEffect(() => {
    setEventKind(selectedEvent?.kind ?? "shoot");
    setEventDay(selectedEvent?.day ?? selectedDay);
    setEventState(selectedEvent?.dateState ?? "planned");
    setEventOwner(selectedEvent?.owner ?? "");
    setEventNotes(selectedEvent?.notes ?? "");
  }, [selectedEvent?.id, selectedEvent?.kind, selectedEvent?.day, selectedEvent?.dateState, selectedEvent?.owner, selectedEvent?.notes, selectedDay]);

  const dub = snapshot.dubbing.find((entry) => entry.itemId === item?.id);
  useEffect(() => {
    setDubStatus(dub?.status ?? "unknown");
    setDubLanguage(dub?.targetLanguage ?? "hi");
    setDubOwner(dub?.owner ?? "");
    setDubNotes(dub?.notes ?? "");
  }, [dub?.itemId, dub?.status, dub?.targetLanguage, dub?.owner, dub?.notes]);

  const linkedGuests = item ? snapshot.itemGuests.filter((link) => link.itemId === item.id).map((link) => snapshot.guests.find((guest) => guest.id === link.guestId)).filter((guest): guest is NonNullable<typeof guest> => Boolean(guest)) : [];
  const itemBlockers = item ? snapshot.blockers.filter((blocker) => blocker.itemId === item.id) : [];
  const sourceChecks = item ? snapshot.sourceChecks.filter((check) => check.itemId === item.id) : [];
  const originalVideoDate = item ? snapshot.events.find((event) => event.itemId === item.id && event.kind === "original_video_date") : null;

  async function saveItem() {
    if (!title.trim() || (!item && !ipId)) return;
    const data = { title: title.trim(), ipId: ipId || null, format: format.trim(), stage, owner: owner.trim() || null, notes: notes.trim(), shootLocation: shootLocation.trim() || null };
    const saved = await onAction(item ? "update_item" : "create_item", item ? { id: item.id, ...data } : data);
    if (saved && !item) onCreated?.();
  }

  async function saveEvent() {
    if (!item || !eventDay) return;
    const data = { itemId: item.id, kind: eventKind, day: eventDay, dateState: eventState, owner: eventOwner.trim() || null, notes: eventNotes.trim() };
    if (await onAction(selectedEvent ? "update_event" : "create_event", selectedEvent ? { id: selectedEvent.id, ...data } : data)) {
      onSelectEvent(null);
    }
  }

  return (
    <aside aria-label="Production details" className="min-w-0 border-2 border-foreground bg-surface-raised">
      <div className="border-b-2 border-foreground bg-attention px-4 py-3 text-on-attention">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em]">{item ? "Episode details" : creating ? "New episode" : showDayEvents ? "Selected day" : "Episode details"}</p>
        <h2 className="font-heading text-xl leading-tight">{item?.title ?? (creating ? "Add an episode" : showDayEvents ? dayLabel(selectedDay, { weekday: "long" }) : "Select an episode")}</h2>
      </div>
      <div className={standalone ? "space-y-5 p-4 sm:p-6" : "max-h-[75vh] space-y-5 overflow-y-auto p-4"}>
        {showDayEvents && <section aria-label="Events on selected day">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg">On this day</h3>
            <span className="font-label text-xs text-secondary">{dayEvents.length} {dayEvents.length === 1 ? "mark" : "marks"}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {dayEvents.length ? dayEvents.map((event) => {
              const linked = snapshot.items.find((record) => record.id === event.itemId);
              return (
                <button key={event.id} type="button" onClick={() => { onSelectItem(event.itemId); onSelectEvent(event.id); }} className="w-full border border-foreground/30 bg-canvas px-2.5 py-2 text-left font-label text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention hover:bg-attention/20">
                  <ProductionActionBadge kind={event.kind} /> · {linked?.title ?? "Unlinked item"}
                  {event.dateState === "unverified" && <span className="block text-editorial">Needs source review</span>}
                </button>
              );
            }) : <p className="font-body text-sm text-secondary">No dated production entries here. Select an item to add a date.</p>}
          </div>
        </section>}

        <div className="border-t border-foreground/30 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg">{item ? "Episode" : creating ? "New episode" : "Details"}</h3>
            {item && <button type="button" onClick={() => { onSelectItem(null); onSelectEvent(null); onStartCreate(); }} className="font-label text-xs font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">Add episode</button>}
          </div>
          {!item && (!creating || !snapshot.canEdit) ? (
            <p className="mt-2 font-body text-sm text-secondary">Select a calendar mark or board card to view and update its episode. Use Add episode to create a new one.</p>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); void saveItem(); }}>
              <Field label="Title"><input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} disabled={!snapshot.canEdit || busy} autoFocus={creating && standalone} required /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="IP"><select className={fieldClass} value={ipId} onChange={(event) => setIpId(event.target.value)} disabled={!snapshot.canEdit || busy} required={!item}><option value="">{item ? "Needs IP review" : "Choose IP"}</option>{snapshot.ips.filter((ip) => ip.active || ip.id === ipId).map((ip) => <option key={ip.id} value={ip.id}>{ip.name}</option>)}</select></Field>
                <Field label="Format"><input className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value)} maxLength={80} disabled={!snapshot.canEdit || busy} placeholder="Panel, clip…" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Stage"><select className={fieldClass} value={stage} onChange={(event) => setStage(event.target.value)} disabled={!snapshot.canEdit || busy}>{productionStages.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></Field>
                <Field label="Owner"><input className={fieldClass} value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={120} disabled={!snapshot.canEdit || busy} placeholder="Unassigned" /></Field>
              </div>
              <Field label="Location of shoot"><input className={fieldClass} value={shootLocation} onChange={(event) => setShootLocation(event.target.value)} maxLength={300} disabled={!snapshot.canEdit || busy} placeholder="Not entered" /></Field>
              <Field label="Notes"><textarea className={`${fieldClass} min-h-20`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={!snapshot.canEdit || busy} /></Field>
              {item?.sourceMarker === "not-live" && <p className="font-label text-xs text-secondary">⭕️ Not Live in the source workbook; no release date was entered.</p>}
              {item?.sourceStatus && <p className="font-label text-xs text-secondary">Source state: {item.sourceStatus}</p>}
              {snapshot.canEdit && <Button type="submit" variant="attention" loading={busy} disabled={!title.trim() || (!item && !ipId)}>{item ? "Save episode" : "Create episode"}</Button>}
            </form>
          )}
        </div>

        {item && (
          <>
            {sourceChecks.length > 0 && <section className="border-t border-foreground/30 pt-4" aria-label="Production tracker checkboxes">
              <h3 className="font-heading text-lg">Production tracker rows</h3>
              <p className="mt-1 font-body text-xs text-secondary">Guest names, roles, boxes and notes follow the workbook rows. A tick is shown as a tick; it does not replace an adjacent written note. Changes here stay local and leave the imported workbook unchanged.</p>
              <div className="mt-2 space-y-2">{sourceChecks.map((check) => <SourceCheckRow key={check.sourceRow} check={check} canEdit={snapshot.canEdit} busy={busy} onAction={onAction} />)}</div>
            </section>}
            <section className="border-t border-foreground/30 pt-4" aria-label="Dates for selected item">
              <div className="flex items-center justify-between gap-2"><h3 className="font-heading text-lg">Dates</h3>{selectedEvent && <button type="button" onClick={() => onSelectEvent(null)} className="font-label text-xs font-bold underline underline-offset-2">New date</button>}</div>
              {originalVideoDate && <div className="mt-2 border border-foreground/25 bg-canvas p-2.5"><p className="font-label text-[11px] font-bold uppercase tracking-[0.05em] text-secondary">Original video date · workbook column B</p><p className="font-body text-sm">{dayLabel(originalVideoDate.day)}</p><p className="font-body text-xs text-secondary">Source history only. This is not a calendar action or a dubbing schedule.</p></div>}
              <div className="mt-2 space-y-1">
                {snapshot.events.filter((event) => event.itemId === item.id && isCalendarActionEvent(event)).sort((a, b) => a.day.localeCompare(b.day)).map((event) => (
                  <button key={event.id} type="button" onClick={() => onSelectEvent(event.id)} className="block w-full border-b border-foreground/20 py-1 text-left font-label text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">
                    {dayLabel(event.day)} · <ProductionActionBadge kind={event.kind} /> · {optionLabel(dateStates, event.dateState)}
                  </button>
                ))}
              </div>
              <form className="mt-3 space-y-2 border border-foreground/30 bg-canvas p-3" onSubmit={(event) => { event.preventDefault(); void saveEvent(); }}>
                <h4 className="font-label text-sm font-bold">{selectedEvent ? "Edit date" : "Add date"}</h4>
                <div className="grid grid-cols-2 gap-2"><Field label="Type"><select className={fieldClass} value={eventKind} onChange={(event) => setEventKind(event.target.value)} disabled={!snapshot.canEdit || busy}>{productionEventKinds.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></Field><Field label="Day"><input type="date" className={fieldClass} value={eventDay} onChange={(event) => setEventDay(event.target.value)} disabled={!snapshot.canEdit || busy} required /></Field></div>
                <div className="grid grid-cols-2 gap-2"><Field label="Date state"><select className={fieldClass} value={eventState} onChange={(event) => setEventState(event.target.value)} disabled={!snapshot.canEdit || busy}>{dateStates.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></Field><Field label="Owner"><input className={fieldClass} value={eventOwner} onChange={(event) => setEventOwner(event.target.value)} disabled={!snapshot.canEdit || busy} /></Field></div>
                <Field label="Context"><textarea className={`${fieldClass} min-h-16`} value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} disabled={!snapshot.canEdit || busy} maxLength={1000} /></Field>
                {selectedEvent?.sourceRef && <p className="font-label text-xs text-secondary">Workbook source: {selectedEvent.sourceRef}</p>}
                {snapshot.canEdit && <Button type="submit" variant="secondary" loading={busy} disabled={!eventDay}>{selectedEvent ? "Save date" : "Add date"}</Button>}
              </form>
            </section>

            <details className="border-t border-foreground/30 pt-4" aria-label="Dubbing progress" open={dubbingOpen} onToggle={(event) => setDubbingOpen(event.currentTarget.open)}>
              <summary className="cursor-pointer font-heading text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">Dubbing{dub?.publicationStatus === "published" ? " · 🎙️ Live" : dub?.publicationStatus === "not-published" ? " · Not published" : ""}</summary>
              <p className="mt-1 font-label text-xs text-secondary">Dubbed publication: {dub?.publicationStatus === "published" ? `🎙️ Published ${dub.publishedOn ? dayLabel(dub.publishedOn) : ""}` : dub?.publicationStatus === "not-published" ? "Not published (no dubbed go-live date)" : "Not tracked"}. This is separate from dubbing work status.</p>
              {dub?.sourceRow && <p className="mt-1 font-label text-xs text-secondary">Dubbing Tracker row {dub.sourceRow} · {dub.sourceSection === "solo" ? "Solo" : "Panel"} · source “Posted?” {dub.sourcePostedCheck === "checked" ? "☑ ticked" : dub.sourcePostedCheck === "unchecked" ? "☐ unticked" : "not recorded"}. {dub.sourcePostedCheck === "checked" && dub.publicationStatus === "not-published" ? "The client confirmed this is not published without a column-C date." : ""}</p>}
              {dub?.sourceNotes.length ? <div className="mt-2 space-y-2 border border-foreground/30 bg-canvas p-2.5"><p className="font-label text-xs font-bold">Workbook follow-up notes</p>{dub.sourceNotes.map((sourceNote) => <p key={sourceNote.row} className="whitespace-pre-wrap break-words font-body text-xs text-secondary"><span className="font-label font-bold">Row {sourceNote.row}: </span>{sourceNote.text}</p>)}</div> : null}
              <form className="mt-2 space-y-2" onSubmit={(event) => { event.preventDefault(); void onAction("update_dubbing", { itemId: item.id, targetLanguage: dubLanguage.trim(), status: dubStatus, owner: dubOwner.trim() || null, notes: dubNotes.trim() }); }}>
                <div className="grid grid-cols-2 gap-2"><Field label="Status"><select className={fieldClass} value={dubStatus} onChange={(event) => setDubStatus(event.target.value)} disabled={!snapshot.canEdit || busy}>{dubbingStatuses.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></Field><Field label="Language"><input className={fieldClass} value={dubLanguage} onChange={(event) => setDubLanguage(event.target.value)} disabled={!snapshot.canEdit || busy} maxLength={32} /></Field></div>
                <Field label="Owner"><input className={fieldClass} value={dubOwner} onChange={(event) => setDubOwner(event.target.value)} disabled={!snapshot.canEdit || busy} maxLength={120} /></Field>
                <Field label="Notes"><textarea className={`${fieldClass} min-h-16`} value={dubNotes} onChange={(event) => setDubNotes(event.target.value)} disabled={!snapshot.canEdit || busy} maxLength={1000} /></Field>
                {snapshot.canEdit && <Button type="submit" variant="secondary" loading={busy}>Save dubbing</Button>}
              </form>
              <h4 className="mt-4 font-label text-sm font-bold">Guest permissions</h4>
              {item.sourceRef?.startsWith("Production Tracker Podcast!") && <p className="mt-1 font-body text-xs text-secondary">Dubbing permission is a separate workflow. It does not change the Production Tracker Guest Agreement boxes above.</p>}
              {linkedGuests.length ? <div className="mt-2 space-y-2">{linkedGuests.map((guest) => <PermissionRow key={guest.id} itemId={item.id} guestId={guest.id} name={guest.name} sourceNameNeedsReview={guest.sourceNameNeedsReview === true} permission={snapshot.permissions.find((entry) => entry.itemId === item.id && entry.guestId === guest.id)} canEdit={snapshot.canEdit} busy={busy} onAction={onAction} />)}</div> : <p className="mt-1 font-body text-sm text-secondary">No guest linked. {dub?.sourcePermissionStatus ? `Workbook status: ${dub.sourcePermissionStatus}. ` : ""}The guest and permission need review before this can be treated as approved.</p>}
              {snapshot.canEdit && <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (newGuest.trim()) void onAction("add_guest_to_item", { itemId: item.id, name: newGuest.trim() }).then((ok) => { if (ok) setNewGuest(""); }); }}><input aria-label="Guest name" className={fieldClass} value={newGuest} onChange={(event) => setNewGuest(event.target.value)} placeholder="Add guest name" maxLength={180} disabled={busy} /><Button type="submit" variant="ghost" disabled={!newGuest.trim() || busy}>Add guest</Button></form>}
            </details>

            <details className="border-t border-foreground/30 pt-4" aria-label="Production blockers" open={blockersOpen} onToggle={(event) => setBlockersOpen(event.currentTarget.open)}>
              <summary className="cursor-pointer font-heading text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">Blockers{itemBlockers.length ? ` · ${itemBlockers.length}` : ""}</summary>
              <div className="mt-2 space-y-2">{itemBlockers.length ? itemBlockers.map((blocker) => <div key={blocker.id} className="border border-foreground/30 bg-canvas p-2.5"><p className="font-body text-sm font-semibold">{blocker.reason}</p><p className="mt-1 font-label text-xs text-secondary">{blocker.status} · {blocker.owner || "Unassigned"}{blocker.nextAction ? ` · Next: ${blocker.nextAction}` : ""}</p>{snapshot.canEdit && <button type="button" className="mt-2 font-label text-xs font-bold underline underline-offset-2" disabled={busy} onClick={() => void onAction("update_blocker", { id: blocker.id, itemId: item.id, reason: blocker.reason, owner: blocker.owner, nextAction: blocker.nextAction, status: blocker.status === "resolved" ? "open" : "resolved" })}>{blocker.status === "resolved" ? "Reopen blocker" : "Resolve blocker"}</button>}</div>) : <p className="font-body text-sm text-secondary">No blockers recorded.</p>}</div>
              {snapshot.canEdit && <form className="mt-3 space-y-2 border border-foreground/30 bg-canvas p-3" onSubmit={(event) => { event.preventDefault(); if (blockReason.trim()) void onAction("create_blocker", { itemId: item.id, reason: blockReason.trim(), owner: blockOwner.trim() || null, status: "open", nextAction: blockAction.trim() }).then((ok) => { if (ok) { setBlockReason(""); setBlockOwner(""); setBlockAction(""); } }); }}><Field label="Reason"><input className={fieldClass} value={blockReason} onChange={(event) => setBlockReason(event.target.value)} maxLength={500} disabled={busy} required /></Field><div className="grid grid-cols-2 gap-2"><Field label="Owner"><input className={fieldClass} value={blockOwner} onChange={(event) => setBlockOwner(event.target.value)} disabled={busy} /></Field><Field label="Next action"><input className={fieldClass} value={blockAction} onChange={(event) => setBlockAction(event.target.value)} disabled={busy} /></Field></div><Button type="submit" variant="ghost" disabled={!blockReason.trim() || busy}>Add blocker</Button></form>}
            </details>
          </>
        )}
      </div>
    </aside>
  );
}

function SourceCheckRow({ check, canEdit, busy, onAction }: { check: ProductionSourceCheck; canEdit: boolean; busy: boolean; onAction: Action }) {
  const [role, setRole] = useState(check.guestRole ?? "");
  useEffect(() => setRole(check.guestRole ?? ""), [check.guestRole]);
  const fields = [
    { key: "guest_agreement", label: "Guest Agreement", column: "H", state: check.guestAgreement },
    { key: "dubbing", label: "Dubbing", column: "I", state: check.dubbing },
    { key: "hindi_live", label: "Hindi Episode Live?", column: "J", state: check.hindiLive },
  ] as const;
  return <div className="border border-foreground/30 bg-canvas p-2.5">
    <p className="font-label text-xs font-bold">Row {check.sourceRow} · {check.guestName || "Name cell blank"}</p>
    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void onAction("update_source_role", { itemId: check.itemId, sourceRow: check.sourceRow, guestRole: role.trim() || null }); }}>
      <label className="grid min-w-0 flex-1 gap-1 font-label text-xs"><span>Role · C{check.sourceRow}</span><input className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)} maxLength={500} disabled={!canEdit || busy} placeholder="Blank in workbook" /></label>
      {canEdit && <Button type="submit" variant="ghost" disabled={busy || role.trim() === (check.guestRole ?? "")}>Save role</Button>}
    </form>
    <div className="mt-2 grid grid-cols-3 gap-1.5">{fields.map((field) => <div key={field.key} className="min-w-0 border border-foreground/30 px-2 py-1 font-label text-xs"><span className="block text-secondary">{field.label} · {field.column}{check.sourceRow}</span>{field.state === "not_box" ? <span className="block pt-1">Text cell</span> : <button type="button" disabled={!canEdit || busy} aria-label={`${field.label} row ${check.sourceRow}: ${field.state === "checked" ? "checked" : "unchecked"}`} aria-pressed={field.state === "checked"} onClick={() => void onAction("update_source_check", { itemId: check.itemId, sourceRow: check.sourceRow, field: field.key, state: field.state === "checked" ? "unchecked" : "checked" })} className="mt-1 block text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention disabled:cursor-default">{field.state === "checked" ? "☑" : "☐"}</button>}</div>)}</div>
    {check.agreementNote && <p className="mt-2 whitespace-pre-wrap font-body text-xs">H{check.sourceRow} · {check.agreementNote}</p>}
  </div>;
}

function PermissionRow({ itemId, guestId, name, sourceNameNeedsReview, permission, canEdit, busy, onAction }: {
  itemId: string;
  guestId: string;
  name: string;
  sourceNameNeedsReview: boolean;
  permission: ProductionSnapshot["permissions"][number] | undefined;
  canEdit: boolean;
  busy: boolean;
  onAction: Action;
}) {
  const [status, setStatus] = useState(permission?.status ?? "unknown");
  const [notes, setNotes] = useState(permission?.notes ?? "");
  useEffect(() => { setStatus(permission?.status ?? "unknown"); setNotes(permission?.notes ?? ""); }, [permission?.status, permission?.notes]);
  return <form className="border border-foreground/30 bg-canvas p-2" onSubmit={(event) => { event.preventDefault(); void onAction("update_permission", { itemId, guestId, status, notes: notes.trim() }); }}><p className="font-body text-sm font-semibold">{name}</p>{sourceNameNeedsReview && <p className="font-label text-xs text-editorial">Guest field contains contact details. Confirm the name before client release.</p>}{permission?.sourceRow && <p className="font-label text-[11px] text-secondary">Dubbing Tracker row {permission.sourceRow}</p>}<div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><select aria-label={`${name} dubbing permission`} className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)} disabled={!canEdit || busy}>{permissionStatuses.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>{canEdit && <Button type="submit" variant="ghost" disabled={busy}>Save</Button>}</div><input aria-label={`${name} permission note`} className={`${fieldClass} mt-2`} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canEdit || busy} placeholder="Team permission note" maxLength={1000} />{permission?.sourceContact && <p className="mt-2 whitespace-pre-wrap break-all font-label text-xs text-secondary">Workbook contact: {permission.sourceContact}</p>}</form>;
}

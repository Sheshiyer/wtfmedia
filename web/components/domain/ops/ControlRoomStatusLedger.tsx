type Status = "verified" | "unavailable" | "not activated" | "access restricted";
const statusRows: Array<{ label: string; state: Status; detail: string; observed: string }> = [
  { label: "operator access", state: "verified", detail: "your protected request was verified.", observed: "observed now" },
  { label: "audit ledger", state: "verified", detail: "administrative evidence is available to your role.", observed: "observed now" },
  { label: "workflow systems", state: "not activated", detail: "approved workflows will appear when activated.", observed: "not observed" },
  { label: "public catalogue", state: "not activated", detail: "catalogue status is not observed from this workspace.", observed: "not observed" },
];

export function ControlRoomStatusLedger() {
  return <section aria-labelledby="status-ledger-title" className="mt-10 border-2 border-foreground bg-surface-raised"><div className="border-b-2 border-foreground px-4 py-3"><h2 id="status-ledger-title" className="font-heading text-2xl">status ledger</h2></div><ul className="divide-y-2 divide-foreground">{statusRows.map((row) => <li key={row.label} className="grid gap-2 p-4 sm:grid-cols-[minmax(10rem,1fr)_10rem_1.5fr_8rem]"><strong>{row.label}</strong><span className="font-semibold">{row.state}</span><span>{row.detail}</span><span className="text-sm">{row.observed}</span></li>)}</ul></section>;
}

import { StatusLedger, type StatusLedgerItem } from "@/components/patterns/StatusLedger";

type ControlRoomRole = "super_admin" | "admin" | "editor" | "public_link";

export function ControlRoomStatusLedger(_props: { role: ControlRoomRole }) {
  const items: StatusLedgerItem[] = [
    {
      label: "production",
      state: "active",
      detail: "list, create, and update records. delete is unavailable.",
      href: "/ops/production",
      promoted: true,
    },
    {
      label: "episode map",
      state: "active",
      detail: "title map from the catalogue snapshot. not a live source.",
      href: "/ops/episodes",
    },
    {
      label: "public rooms",
      state: "active",
      detail: "episodes, connections, and ask wtf.",
      href: "/",
      observed: "routes active",
    },
    {
      label: "ask wtf",
      state: "active",
      detail: "ask the catalogue and keep quoted evidence beside the answer.",
      href: "/chat",
    },
    {
      label: "settings",
      state: "active",
      detail: "release context and roadmap for held operators, audit, ingest, and integrations.",
      href: "/ops/settings",
      observed: "roadmap lives here",
    },
  ];

  if (process.env.NODE_ENV !== "production") {
    const promoted = items.filter((item) => item.promoted);
    if (promoted.length !== 1) {
      throw new Error("Control Room must promote exactly one next action");
    }
  }

  return (
    <StatusLedger
      title="the room is open"
      eyebrow="active build"
      items={items}
      className="overflow-hidden rounded-panel"
    />
  );
}

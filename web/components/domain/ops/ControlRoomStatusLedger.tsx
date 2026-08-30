import { StatusLedger, type StatusLedgerItem } from "@/components/patterns/StatusLedger";

type ControlRoomRole = "super_admin" | "admin" | "editor";

export function ControlRoomStatusLedger({ role }: { role: ControlRoomRole }) {
  const canAdminister = role !== "editor";
  const items: StatusLedgerItem[] = [
    {
      label: "production",
      state: "active",
      detail: "list, create, and update records. delete is unavailable.",
      href: "/ops/production",
      promoted: true,
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
    ...(canAdminister
      ? [
          {
            label: "operators",
            state: "unavailable" as const,
            detail: "seats and access gates are not in this release. this roster is not a live gate.",
            href: "/ops/operators",
          },
          {
            label: "audit",
            state: "unavailable" as const,
            detail: "allowlisted admin events only. empty means empty.",
            href: "/ops/audit",
          },
        ]
      : [
          {
            label: "operators",
            state: "unavailable" as const,
            detail: "seats and access gates arrive next.",
          },
          {
            label: "audit",
            state: "unavailable" as const,
            detail: "no audit records in this release.",
          },
        ]),
    {
      label: "ingest",
      state: "unavailable",
      detail: "ingest admin is not in this release.",
    },
    {
      label: "analytics",
      state: "not-activated",
      detail: "platform reporting is not activated; no performance state is inferred.",
    },
    {
      label: "people",
      state: "not-activated",
      detail: "guest and relationship operations are not activated in this release.",
    },
    {
      label: "integrations",
      state: "not-activated",
      detail: "integration health is not observed from this workspace.",
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
      eyebrow="open / not in this release"
      items={items}
      className="overflow-hidden rounded-panel"
    />
  );
}

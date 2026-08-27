import { StatusLedger, type StatusLedgerItem } from "@/components/patterns/StatusLedger";

type ControlRoomRole = "super_admin" | "admin" | "editor";

export function ControlRoomStatusLedger({ role }: { role: ControlRoomRole }) {
  const canAdminister = role !== "editor";
  const items: StatusLedgerItem[] = [
    ...(canAdminister
      ? [
          {
            label: "operator access",
            state: "verified" as const,
            detail: "the current protected request and active operator role were verified.",
            href: "/ops/operators",
            observed: "observed now",
            promoted: true,
          },
          {
            label: "audit ledger",
            state: "verified" as const,
            detail: "administrative evidence is activated and authorized for this role.",
            href: "/ops/audit",
            observed: "authorized",
          },
        ]
      : [
          {
            label: "operator access",
            state: "verified" as const,
            detail: "the current protected request and active operator role were verified.",
            observed: "observed now",
          },
          {
            label: "ask wtf",
            state: "active" as const,
            detail: "ask the catalogue and keep quoted evidence beside the answer.",
            href: "/chat",
            promoted: true,
          },
        ]),
    {
      label: "public workspaces",
      state: "active",
      detail: "episodes, connections, and Ask WTF are available in the public-safe application projection.",
      href: "/",
      observed: "routes active",
    },
    {
      label: "production",
      state: "not-activated",
      detail: "the production board and calendar are not activated in this release.",
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
      eyebrow="verified / inactive"
      items={items}
    />
  );
}

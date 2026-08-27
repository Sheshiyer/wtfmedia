"use client";

import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { LinkButton } from "@/components/ui/LinkButton";

export default function ControlRoomPage() {
  const context = useOperatorContext();
  const primary =
    context.role === "editor"
      ? { href: "/chat", label: "open Ask WTF" }
      : { href: "/ops/operators", label: "review operator access" };

  return (
    <div id="ops-main">
      <WorkspaceHeader
        eyebrow="run the show from the source"
        title="control room"
        summary="your access is verified. workflow systems will appear here when they are activated."
        accent="attention"
        primaryAction={
          <LinkButton
            href={primary.href}
            variant="secondary"
            className="border-foreground bg-attention text-foreground shadow-[4px_4px_0_var(--wtf-foreground)] hover:bg-attention"
          >
            {primary.label} ↗
          </LinkButton>
        }
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        <ControlRoomStatusLedger role={context.role} />
      </div>
    </div>
  );
}

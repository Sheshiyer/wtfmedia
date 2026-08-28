"use client";

import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { Button } from "@/components/ui/Button";
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
        size="control-room"
        eyebrow="run the show from the source"
        title="control room"
        summary="your access is verified. workflow systems will appear here when they are activated."
        accent="attention"
        primaryAction={
          <LinkButton
            href={primary.href}
            variant="attention"
            className="border-foreground shadow-[6px_6px_0_var(--wtf-foreground)] hover:shadow-[6px_6px_0_var(--wtf-foreground)]"
          >
            {primary.label}
          </LinkButton>
        }
        tools={
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-control border-foreground"
            onClick={() => window.location.reload()}
          >
            refresh status
          </Button>
        }
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        <ControlRoomStatusLedger role={context.role} />
      </div>
    </div>
  );
}

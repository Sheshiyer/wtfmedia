"use client";

import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

export default function ControlRoomPage() {
  const context = useOperatorContext();

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="control-room"
        eyebrow="run the show from the source"
        title="control room"
        summary="production records are live. ingest, seats, and access gates are not. missing evidence stays unnamed."
        accent="attention"
        primaryAction={
          <LinkButton
            href="/ops/production"
            variant="attention"
            className="border-foreground shadow-[6px_6px_0_var(--wtf-foreground)] hover:shadow-[6px_6px_0_var(--wtf-foreground)]"
          >
            open production
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

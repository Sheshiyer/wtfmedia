import { ProductionCalendarShowcase } from "@/components/domain/public/ProductionCalendarShowcase";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

/** Public UI showcase only; persistence and provider wiring remain deferred. */
export default function ProductionCalendarPage() {
  return (
    <div>
      <WorkspaceHeader
        size="page"
        eyebrow="planning surface"
        title="production calendar"
        summary="a visual planning surface for the production calendar and board. Build, move, and review local sketches here before any records are wired."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <ProductionCalendarShowcase />
      </div>
    </div>
  );
}

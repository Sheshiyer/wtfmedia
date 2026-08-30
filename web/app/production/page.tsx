import { ProductionCalendarShowcase } from "@/components/domain/public/ProductionCalendarShowcase";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

/** Public D1-backed planner; provider sync, delete, and verified identity remain deferred. */
export default function ProductionCalendarPage() {
  return (
    <div>
      <WorkspaceHeader
        size="page"
        eyebrow="planning surface"
        title="production calendar"
        summary="a visual planning surface for shared target D1 records across the calendar and board. List, create, move, and update release records here; delete and verified identity attribution remain unavailable."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <ProductionCalendarShowcase />
      </div>
    </div>
  );
}

import { ProductionWorkspace } from "@/components/domain/ops/ProductionWorkspace";

/**
 * Public projection of the target D1 production planner. Provider sync,
 * deletion, and verified identity attribution remain outside this release.
 */
export function ProductionCalendarShowcase() {
  return <ProductionWorkspace />;
}

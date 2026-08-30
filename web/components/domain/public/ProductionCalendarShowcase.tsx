import { ProductionWorkspace } from "@/components/domain/ops/ProductionWorkspace";

/**
 * UI-only public projection of the production planner. It deliberately
 * reuses the local calendar and board interactions without importing any
 * schedule, owner, asset, or provider state.
 */
export function ProductionCalendarShowcase() {
  return <ProductionWorkspace showcase />;
}

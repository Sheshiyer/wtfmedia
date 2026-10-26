"use client";

import { useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";
import { ProductionWorkspaceView } from "./ProductionWorkspaceView";

export function ProductionWorkspace() {
  const fetcher = useMemberFetch();
  return <ProductionWorkspaceView fetcher={fetcher} />;
}

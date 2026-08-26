"use client";

import { createContext, useContext } from "react";
import type { OperatorContextDto } from "@/lib/ops/dto";

const Context = createContext<OperatorContextDto | null>(null);
export function OperatorContextProvider({ value, children }: { value: OperatorContextDto; children: React.ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useOperatorContext(): OperatorContextDto {
  const value = useContext(Context);
  if (!value) throw new Error("ops_context_required");
  return value;
}

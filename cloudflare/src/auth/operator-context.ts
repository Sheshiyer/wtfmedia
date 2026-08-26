import { getOperatorByEmail, type DB, type OperatorRole } from "../db.ts";
import type { AccessVerification } from "./access.ts";

export type OperatorContext = {
  operatorId: number;
  email: string;
  role: OperatorRole;
  environment: "local" | "staging" | "production";
  correlationId: string;
};

const roles = new Set<OperatorRole>(["super_admin", "admin", "editor"]);

export async function resolveOperatorContext(
  db: DB,
  identity: AccessVerification,
  environment: OperatorContext["environment"],
  correlationId: string,
): Promise<OperatorContext | null> {
  if (!identity.ok || !correlationId || correlationId.length > 128) return null;
  try {
    const operator = await getOperatorByEmail(db, identity.email);
    if (!operator || operator.active !== 1 || !roles.has(operator.role)) return null;
    return { operatorId: operator.id, email: operator.email, role: operator.role, environment, correlationId };
  } catch {
    return null;
  }
}

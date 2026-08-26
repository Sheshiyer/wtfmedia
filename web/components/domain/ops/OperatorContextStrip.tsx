import type { OperatorContextDto } from "@/lib/ops/dto";

export function OperatorContextStrip({ context }: { context: OperatorContextDto }) {
  return <dl className="grid gap-3 border-y-2 border-foreground bg-surface-subtle px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
    <div><dt className="text-label">environment</dt><dd>{context.environment}</dd></div>
    <div><dt className="text-label">workspace</dt><dd>{context.workspace}</dd></div>
    <div><dt className="text-label">organization scope</dt><dd>{context.organizationScope}</dd></div>
    <div><dt className="text-label">effective role</dt><dd>{context.role}</dd></div>
    <div><dt className="text-label">last verified</dt><dd>{new Date(context.lastVerifiedAt).toLocaleTimeString()}</dd></div>
  </dl>;
}

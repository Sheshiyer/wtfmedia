import type { OperatorContextDto } from "@/lib/ops/dto";

function verifiedTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "not observed";
  return new Date(parsed).toLocaleTimeString();
}

export function OperatorContextStrip({ context }: { context: OperatorContextDto }) {
  const fields = [
    ["environment", context.environment],
    ["workspace", context.workspace],
    ["organization scope", context.organizationScope],
    ["effective role", context.role],
    ["last verified", verifiedTime(context.lastVerifiedAt)],
  ] as const;

  return (
    <dl
      data-ops-context-strip
      className="grid gap-3 border-b-2 border-foreground bg-surface-subtle px-4 py-3 sm:grid-cols-2 sm:px-8 lg:grid-cols-5 xl:px-12"
    >
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/65">
            {label}
          </dt>
          <dd
            className={[
              "mt-1 break-words font-body text-[13px] font-medium leading-[1.45] text-foreground",
              label === "last verified" ? "tabular-nums" : "",
            ].join(" ")}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

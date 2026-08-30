import Link from "next/link";

export type ReleaseStatusTone = "active" | "coming-soon" | "held";

export type ReleaseStatusWidgetProps = {
  title: string;
  eyebrow?: string;
  status: string;
  detail: string;
  next?: string;
  href?: string;
  tone?: ReleaseStatusTone;
  titleAs?: "heading" | "label";
};

const toneClass: Record<ReleaseStatusTone, string> = {
  active: "border-attention bg-attention text-on-attention",
  "coming-soon": "border-information bg-information text-on-information",
  held: "border-foreground/40 bg-surface-subtle text-foreground",
};

export function ReleaseStatusWidget({
  title,
  eyebrow = "current release",
  status,
  detail,
  next,
  href,
  tone = "held",
  titleAs = "heading",
}: ReleaseStatusWidgetProps) {
  return (
    <section className="grid min-h-full gap-4 rounded-panel border-2 border-foreground bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
          {titleAs === "heading" ? (
            <h2 className="mt-1 font-heading text-2xl font-bold lowercase leading-tight">
              {title}
            </h2>
          ) : (
            <p className="mt-1 font-heading text-2xl font-bold lowercase leading-tight">
              {title}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-control border-2 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${toneClass[tone]}`}
        >
          {status}
        </span>
      </div>
      <p className="font-body text-sm leading-relaxed text-secondary">{detail}</p>
      {next ? (
        <p className="border-l-4 border-information bg-canvas px-3 py-2 font-body text-xs leading-relaxed text-secondary">
          {next}
        </p>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="mt-auto inline-flex min-h-11 w-fit items-center border-b-2 border-attention font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
        >
          open workspace
        </Link>
      ) : null}
    </section>
  );
}

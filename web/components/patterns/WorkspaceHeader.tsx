import type { ReactNode } from "react";

export type WorkspaceAccent =
  | "attention"
  | "knowledge"
  | "information"
  | "live"
  | "editorial";

export type WorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  summary?: string;
  accent?: WorkspaceAccent;
  context?: ReactNode;
  primaryAction?: ReactNode;
  tools?: ReactNode;
};

const accentClass: Record<WorkspaceAccent, string> = {
  attention: "bg-attention",
  knowledge: "bg-knowledge",
  information: "bg-information",
  live: "bg-live",
  editorial: "bg-editorial",
};

export function WorkspaceHeader({
  eyebrow,
  title,
  summary,
  accent = "attention",
  context,
  primaryAction,
  tools,
}: WorkspaceHeaderProps) {
  return (
    <header
      data-workspace-header
      className="border-b-2 border-foreground bg-canvas px-4 py-8 sm:px-8 sm:py-10 xl:px-12"
    >
      <div className="mx-auto max-w-[var(--wtf-content-max)]">
        {context && (
          <div className="mb-6 border-b border-foreground/20 pb-4">{context}</div>
        )}
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-4xl">
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`h-3 w-8 border border-foreground ${accentClass[accent]}`}
              />
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/65">
                {eyebrow}
              </p>
            </div>
            <h1 className="font-display text-[clamp(2.75rem,7vw,6.5rem)] font-extrabold lowercase leading-[0.84] tracking-[-0.045em] text-foreground text-balance">
              {title}
            </h1>
            {summary && (
              <p className="mt-5 max-w-[65ch] font-body text-base leading-relaxed text-foreground/70 sm:text-lg">
                {summary}
              </p>
            )}
          </div>

          {(primaryAction || tools) && (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              {primaryAction && (
                <div data-primary-action className="[&>*]:w-full">
                  {primaryAction}
                </div>
              )}
              {tools && <div className="flex items-center gap-2">{tools}</div>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import type { ReactNode } from "react";

export type WorkspaceAccent =
  | "attention"
  | "knowledge"
  | "information"
  | "live"
  | "editorial";

export type WorkspaceHeaderSize = "workspace" | "control-room" | "page";

export type WorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  summary?: string;
  accent?: WorkspaceAccent;
  size?: WorkspaceHeaderSize;
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

const titleClass: Record<WorkspaceHeaderSize, string> = {
  workspace:
    "font-display text-[clamp(2.75rem,7vw,6.5rem)] font-extrabold lowercase leading-[0.84] tracking-[-0.045em] text-foreground text-balance",
  "control-room":
    "font-display text-display font-extrabold lowercase tracking-[-0.045em] text-foreground text-balance",
  page: "font-display text-heading font-bold lowercase tracking-[-0.03em] text-foreground text-balance lg:text-[28px] lg:leading-[1.15]",
};

const summaryClass: Record<WorkspaceHeaderSize, string> = {
  workspace:
    "mt-5 max-w-[65ch] font-body text-base leading-relaxed text-secondary sm:text-lg",
  "control-room":
    "mt-5 max-w-[65ch] font-body text-[19px] leading-[1.45] text-pretty text-secondary",
  page: "mt-4 max-w-[65ch] font-body text-body text-pretty text-secondary",
};

const frameClass: Record<WorkspaceHeaderSize, string> = {
  workspace: "border-b-2 border-foreground bg-canvas px-4 py-8 sm:px-8 sm:py-10 xl:px-12",
  "control-room":
    "border-b-2 border-foreground bg-canvas px-4 py-8 sm:px-8 sm:py-10 xl:px-12",
  page: "border-b-2 border-foreground bg-canvas px-4 py-6 sm:px-8 sm:py-8 xl:px-12",
};

export function WorkspaceHeader({
  eyebrow,
  title,
  summary,
  accent = "attention",
  size = "workspace",
  context,
  primaryAction,
  tools,
}: WorkspaceHeaderProps) {
  return (
    <header
      data-workspace-header
      data-size={size}
      className={frameClass[size]}
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
                className={`h-1 w-8 border border-foreground ${accentClass[accent]}`}
              />
              <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {eyebrow}
              </p>
            </div>
            <h1 className={titleClass[size]}>{title}</h1>
            {summary && <p className={summaryClass[size]}>{summary}</p>}
          </div>

          {(primaryAction || tools) && (
            <div className="flex w-full flex-col items-stretch gap-3 sm:max-w-xs sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              {primaryAction && (
                <div data-primary-action className="[&>*]:w-full">
                  {primaryAction}
                </div>
              )}
              {tools && (
                <div data-header-tools className="flex w-full flex-col items-stretch gap-2 sm:flex-1">
                  {tools}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

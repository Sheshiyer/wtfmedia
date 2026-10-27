import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";

/** Public page chrome only: never render account navigation or private children here. */
export function BetaWorkspaceLoading() {
  return <div data-workspace-loading className="min-h-screen bg-canvas text-foreground">
    <header className="fixed inset-x-0 top-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <div className="mx-auto flex max-w-[92rem] items-start justify-between gap-3">
        <span className="rounded-xl border-2 border-foreground bg-surface-raised px-2 py-1 shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)]">
          <MigratedWordmarkMini plate />
        </span>
        <span aria-hidden="true" className="h-11 w-11 rounded-full bg-foreground/5" />
      </div>
    </header>
    <main aria-busy="true" className="mx-auto max-w-[92rem] px-4 pb-10 pt-28 sm:px-8">
      <p role="status" className="sr-only">Loading page</p>
      <div aria-hidden="true" className="space-y-8 motion-safe:animate-pulse">
        <div className="space-y-4">
          <div className="h-3 w-28 rounded bg-foreground/5" />
          <div className="h-10 w-2/3 max-w-xl rounded bg-foreground/5" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(item => <div key={item} className="h-40 rounded bg-foreground/5" />)}
        </div>
      </div>
    </main>
  </div>;
}

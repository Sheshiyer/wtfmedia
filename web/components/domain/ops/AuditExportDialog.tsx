"use client";

import { useEffect, useRef, useState } from "react";

export function AuditExportDialog({
  filters,
  onClose,
  onConfirm,
}: {
  filters: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    cancel.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-export-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-overlay/70 p-4"
    >
      <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6">
        <h2
          id="audit-export-title"
          className="font-heading text-[23px] font-bold lowercase leading-[1.2]"
        >
          export audit records?
        </h2>
        <p className="mt-3 font-body text-body">
          this export is recorded. active filters: {filters}.
        </p>
        <p className="mt-3 font-body text-body">
          the export contains only allowlisted audit fields.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={cancel}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="min-h-11 rounded-control border-2 border-foreground px-4 py-3 font-label text-sm font-bold"
          >
            cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              if (await onConfirm()) onClose();
              else setPending(false);
            }}
            className="min-h-11 rounded-control border-2 border-foreground px-4 py-3 font-label text-sm font-bold"
          >
            {pending ? "preparing…" : "export audit records"}
          </button>
        </div>
      </section>
    </div>
  );
}

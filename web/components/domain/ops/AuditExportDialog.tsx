"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";

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

  return (
    <Dialog.Root open={true} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70" />
        <Dialog.Content
          aria-labelledby="audit-export-title"
          aria-describedby="audit-export-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          className="fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none"
        >
          <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6">
            <Dialog.Title
              id="audit-export-title"
              className="font-heading text-[23px] font-bold lowercase leading-[1.2]"
            >
              export audit records?
            </Dialog.Title>
            <Dialog.Description id="audit-export-description" className="sr-only">
              export audit records confirmation dialog
            </Dialog.Description>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

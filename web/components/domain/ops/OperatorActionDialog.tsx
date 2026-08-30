"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";

export function OperatorActionDialog({
  action,
  targetEmail,
  onClose,
  onConfirm,
}: {
  action: "deactivate" | "transfer";
  targetEmail: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const transfer = action === "transfer";

  return (
    <Dialog.Root open={true} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70" />
        <Dialog.Content
          aria-labelledby="operator-action-title"
          aria-describedby="operator-action-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          className="fixed inset-0 z-50 grid place-items-center p-4 focus:outline-none"
        >
          <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6">
            <Dialog.Title
              id="operator-action-title"
              className="font-heading text-[23px] font-bold lowercase leading-[1.2]"
            >
              {transfer ? "transfer the super admin seat?" : "deactivate operator?"}
            </Dialog.Title>
            <Dialog.Description id="operator-action-description" className="sr-only">
              {transfer ? "transfer super admin seat confirmation" : "deactivate operator confirmation"}
            </Dialog.Description>
            <p className="mt-3 max-w-[65ch] font-body text-body">
              {transfer
                ? `this makes ${targetEmail} the single super admin and records the handoff.`
                : "they will lose operator access on their next protected request. this action is recorded."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                ref={cancel}
                type="button"
                disabled={pending}
                onClick={onClose}
                className="min-h-11 rounded-control border-2 border-foreground px-4 py-3 font-label text-sm font-bold"
              >
                {transfer ? "keep current owner" : "keep active"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  if (await onConfirm()) onClose();
                  else setPending(false);
                }}
                className="min-h-11 rounded-control border-2 border-editorial bg-editorial px-4 py-3 font-label text-sm font-bold text-on-editorial"
              >
                {pending ? "saving…" : transfer ? "transfer seat" : "deactivate operator"}
              </button>
            </div>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

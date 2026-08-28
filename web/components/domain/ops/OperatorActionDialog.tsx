"use client";

import { useEffect, useRef, useState } from "react";

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
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  const transfer = action === "transfer";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-action-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-overlay/70 p-4"
    >
      <section className="w-full max-w-lg rounded-panel border-2 border-foreground bg-surface-raised p-6">
        <h2
          id="operator-action-title"
          className="font-heading text-[23px] font-bold lowercase leading-[1.2]"
        >
          {transfer ? "transfer the super admin seat?" : "deactivate operator?"}
        </h2>
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
    </div>
  );
}

import Link from "next/link";

export type ChatUnavailableReason = "feature-off" | "unauthorized" | "unavailable";

const copy: Record<ChatUnavailableReason, { eyebrow: string; heading: string; body: string }> = {
  "feature-off": {
    eyebrow: "authenticated ask wtf",
    heading: "authenticated chat is not activated",
    body: "this release is held behind the server release gate.",
  },
  unauthorized: {
    eyebrow: "operator access",
    heading: "operator chat unavailable",
    body: "sign in through the approved operator access path to continue.",
  },
  unavailable: {
    eyebrow: "authenticated ask wtf",
    heading: "operator chat unavailable",
    body: "the authenticated history service did not provide a verified conversation.",
  },
};

export function ChatUnavailableState({ reason }: { reason: ChatUnavailableReason }) {
  const state = copy[reason];
  return (
    <section
      aria-labelledby="authenticated-chat-unavailable"
      className="rounded-panel border-2 border-foreground bg-surface-raised p-6 sm:p-8"
      data-chat-unavailable={reason}
    >
      <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{state.eyebrow}</p>
      <h2 id="authenticated-chat-unavailable" className="mt-3 font-heading text-2xl font-bold lowercase text-foreground">
        {state.heading}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">{state.body}</p>
      <Link
        href="/chat"
        className="mt-6 inline-flex min-h-11 items-center border-2 border-foreground bg-attention px-4 py-3 font-label text-sm font-bold text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2"
      >
        open public ask wtf
      </Link>
    </section>
  );
}

import Link from "next/link";
import { CustomCursor } from "@/components/CustomCursor";
import { WordmarkMini } from "@/components/Wordmark";

/**
 * Legacy public shell — byte-preserving extraction from layout.tsx.
 *
 * This shell preserves the exact original header/main/footer/custom-cursor
 * presentation for rollback. No behavioral cleanup or effect changes.
 */

const nav = [
  { href: "/", label: "Control Room" },
  { href: "/episodes", label: "Episodes" },
  { href: "/connections", label: "Connections" },
  { href: "/chat", label: "Ask WTF" },
];

export function LegacyPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomCursor />

      <header className="sticky top-0 z-50 border-b-2 border-ink bg-cream/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link href="/" data-cursor="home" className="shrink-0">
            <WordmarkMini />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-cursor="go"
                className="px-3 py-2 rounded-full eyebrow text-ink/80 hover:bg-ink hover:text-cream transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-ink bg-ink text-cream">
        <div className="max-w-7xl mx-auto px-5 py-8 grid gap-6 sm:grid-cols-3">
          <div>
            <span className="extrude extrude-sm text-2xl">
              <span style={{ color: "#C53B3A" }}>w</span>
              <span style={{ color: "#FFF6EA" }}>t</span>
              <span style={{ color: "#0C9367" }}>f</span>
              <span style={{ color: "#FFF6EA" }}>media</span>
            </span>
            <p className="text-cream/60 text-sm mt-3 max-w-xs">
              The WTF catalogue, made askable. Every conversation, cited to
              the second.
            </p>
            <a
              href="https://spaceblanket.ai"
              target="_blank"
              rel="noreferrer"
              data-cursor="↗"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-cream/70 hover:text-wtf-yellow transition-colors"
            >
              built by <span className="font-semibold text-cream">spaceblanket.ai</span> ↗
            </a>
          </div>
          <div className="text-sm">
            <p className="eyebrow text-cream/50 mb-2">System</p>
            <ul className="space-y-1 text-cream/80">
              <li>Ask WTF engine · NVIDIA NIM · llama-3.3-70b</li>
              <li>Retrieval · nv-embedqa-e5-v5</li>
              <li>55 episodes · 1,933 chunks indexed</li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="eyebrow text-cream/50 mb-2">Proof of concept</p>
            <p className="text-cream/70">
              Internal build · v0 · brand cues from{" "}
              <a
                href="https://allthingswtf.com/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-wtf-yellow"
                data-cursor="↗"
              >
                allthingswtf.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

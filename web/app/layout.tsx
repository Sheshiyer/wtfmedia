import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { CustomCursor } from "@/components/CustomCursor";
import { Presence } from "@/components/Presence";
import { WordmarkMini } from "@/components/Wordmark";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: "wtfmedia — control room for the cultural engine",
  description:
    "The internal operating system for a podcast-first company built to reach a billion Indians. Research, production, publishing — one control room.",
  openGraph: {
    title: "wtfmedia — control room for the cultural engine",
    description:
      "Ask the WTF catalogue anything — cited, timestamped answers across 53 episodes. Powered by NVIDIA NIM.",
    images: ["/brand/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "wtfmedia",
    description:
      "Ask the WTF catalogue anything — cited, timestamped, NVIDIA NIM.",
    images: ["/brand/og-image.png"],
  },
};

const nav = [
  { href: "/", label: "Control Room" },
  { href: "/episodes", label: "Episodes" },
  { href: "/chat", label: "Ask WTF" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <CustomCursor />

        <header className="sticky top-0 z-50 border-b-2 border-ink bg-cream/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
            <Link href="/" data-cursor="home" className="shrink-0">
              <WordmarkMini />
            </Link>
            <div className="hidden md:flex">
              <Presence />
            </div>
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
                The control room for a podcast-first company built to reach a
                billion Indians.
              </p>
            </div>
            <div className="text-sm">
              <p className="eyebrow text-cream/50 mb-2">System</p>
              <ul className="space-y-1 text-cream/80">
                <li>Ask WTF engine · NVIDIA NIM · llama-3.3-70b</li>
                <li>Retrieval · nv-embedqa-e5-v5</li>
                <li>53 episodes · 1,422 chunks indexed</li>
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
      </body>
    </html>
  );
}

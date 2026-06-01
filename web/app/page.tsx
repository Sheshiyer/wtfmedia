import Link from "next/link";
import Image from "next/image";
import { data, thumbnailUrl } from "@/lib/episodes";
import { GUESTS } from "@/lib/guests";
import { Wordmark } from "@/components/Wordmark";
import { Sparkle } from "@/components/Sparkle";
import { Marquee } from "@/components/Marquee";
import { PaintCanvas } from "@/components/PaintCanvas";
import { GuestStrip } from "@/components/GuestStrip";

const tickerNames = [
  "Elon Musk", "Bill Gates", "Sam Altman", "Narendra Modi", "A.R. Rahman",
  "Yuval Noah Harari", "Dario Amodei", "Rishi Sunak", "Chamath", "Ajay Banga",
];

export default function Home() {
  const tiles = GUESTS.slice(0, 4);
  return (
    <div className="relative grain">
      {/* HERO — left-aligned, asymmetric */}
      <section className="halftone relative overflow-hidden">
        <Sparkle className="absolute left-[7%] top-24 animate-floaty hidden md:block" size={32} />
        <Sparkle className="absolute right-[14%] top-32 animate-twinkle hidden md:block" size={20} color="#C53B3A" />
        <Sparkle className="absolute right-[30%] bottom-12 animate-floaty hidden lg:block" size={24} color="#0C9367" />

        <div className="max-w-7xl mx-auto px-5 pt-20 pb-14">
          <p className="eyebrow text-ink/45 mb-6">wtf media · internal workspace</p>

          <Wordmark size="text-7xl sm:text-8xl lg:text-9xl" className="mb-8" />

          <h1 className="serif text-3xl sm:text-5xl max-w-[18ch] leading-[1.04] mb-5">
            The catalogue, now with a memory.
          </h1>
          <p className="text-lg text-ink/70 max-w-[58ch] mb-9">
            Fifty-three long-form conversations, turned into something you can
            talk to. Ask anything; get it back in the guest's own words, cited
            and dropped at the exact second they said it.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/chat" data-cursor="ask!" className="pill pill-solid px-7 py-3 text-base inline-flex items-center gap-2">
              <Sparkle size={16} color="#F1B333" /> Ask the catalogue
            </Link>
            <Link href="/episodes" data-cursor="browse" className="pill px-7 py-3 text-base bg-cream hover:bg-ink hover:text-cream">
              Browse episodes
            </Link>
            <span className="ml-1"><PaintCanvas /></span>
          </div>

          <a
            href="https://spaceblanket.ai"
            target="_blank"
            rel="noreferrer"
            data-cursor="↗"
            className="inline-flex items-center gap-1.5 mt-6 text-sm text-ink/55 hover:text-wtf-purple transition-colors"
          >
            built by <span className="font-semibold text-ink/80">spaceblanket.ai</span>
            <span aria-hidden>↗</span>
          </a>

          <div className="mt-12">
            <GuestStrip />
          </div>
        </div>

        <div className="border-y-2 border-ink bg-wtf-yellow py-3">
          <Marquee items={["ask wtf anything", ...tickerNames, "cited to the second"]} />
        </div>
      </section>

      {/* LIVE NOW — two asymmetric product blocks, real imagery, no roadmap */}
      <section className="max-w-7xl mx-auto px-5 py-16 space-y-20">
        {/* Ask WTF */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-wtf-green" />
              <span className="eyebrow text-wtf-green">live</span>
            </div>
            <h2 className="display text-4xl sm:text-5xl mb-4">ask wtf anything</h2>
            <p className="text-ink/70 max-w-[52ch] mb-5">
              Type a question. It reads across every transcript, answers in
              plain language, and shows its work: each claim links back to the
              moment in the episode it came from. Switch the answer model and
              retry to compare. No scrubbing, no guessing.
            </p>
            <Link href="/chat" data-cursor="ask!" className="pill px-6 py-2.5 bg-wtf-yellow text-ink border-ink inline-flex items-center gap-2">
              <Sparkle size={15} color="#fff" /> Open Ask WTF
            </Link>
          </div>
          <Link href="/chat" data-cursor="open" className="order-1 lg:order-2 card overflow-hidden">
            <Image
              src="/brand/ask-wtf.png"
              alt="Ask WTF: a question with cited, timestamped answers"
              width={1200}
              height={1000}
              className="w-full h-auto"
            />
          </Link>
        </div>

        {/* Episodes */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Link href="/episodes" data-cursor="browse" className="grid grid-cols-2 gap-3">
            {tiles.map((g, i) => (
              <div
                key={g.video_id}
                className={`relative aspect-video rounded-2xl overflow-hidden border-2 border-ink shadow-[5px_5px_0_#1A1A1A] ${
                  i % 2 ? "translate-y-4" : ""
                }`}
              >
                <Image src={thumbnailUrl(g.video_id)} alt={g.name} fill sizes="300px" className="object-cover" />
              </div>
            ))}
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-wtf-green" />
              <span className="eyebrow text-wtf-green">live</span>
            </div>
            <h2 className="display text-4xl sm:text-5xl mb-4">the library</h2>
            <p className="text-ink/70 max-w-[52ch] mb-5">
              Every episode across {new Set(data.entries.map((e) => e.playlist_title)).size}{" "}
              shows, in drag-through rows. Open any one to read its transcript
              with click-to-jump timestamps, or hand it straight to Ask WTF.
            </p>
            <Link href="/episodes" data-cursor="browse" className="pill px-6 py-2.5 bg-cream text-ink hover:bg-ink hover:text-cream inline-flex items-center gap-2">
              Browse {data.entry_count} episodes
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t-2 border-ink bg-ink text-cream">
        <div className="max-w-7xl mx-auto px-5 py-16 text-center relative">
          <Sparkle className="absolute left-[16%] top-10 animate-twinkle" size={20} />
          <Sparkle className="absolute right-[18%] bottom-10 animate-floaty" size={24} color="#0C9367" />
          <h2 className="serif text-3xl sm:text-4xl max-w-[24ch] mx-auto mb-7">
            Stop scrubbing. Start asking.
          </h2>
          <Link href="/chat" data-cursor="ask!" className="pill px-8 py-3 bg-wtf-yellow text-ink border-wtf-yellow inline-flex items-center gap-2">
            <Sparkle size={16} color="#fff" /> Ask the catalogue
          </Link>
        </div>
      </section>
    </div>
  );
}

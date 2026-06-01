import Link from "next/link";
import Image from "next/image";
import { data, fmtViews } from "@/lib/episodes";
import { MODULES, STATUS_LABEL, STATUS_CHIP } from "@/lib/modules";
import { Wordmark, WordmarkMini } from "@/components/Wordmark";
import { Sparkle } from "@/components/Sparkle";
import { Marquee } from "@/components/Marquee";
import { PaintCanvas } from "@/components/PaintCanvas";
import { GuestStrip } from "@/components/GuestStrip";

const shows = Array.from(new Set(data.entries.map((e) => e.playlist_title)));
const totalViews = data.entries.reduce((s, e) => s + (e.view_count || 0), 0);

const tickerNames = [
  "Elon Musk","Bill Gates","Sam Altman","Narendra Modi","Yuval Noah Harari",
  "Dario Amodei","A.R. Rahman","Rishi Sunak","Chamath","Ajay Banga",
  "Vinod Khosla","Ted Sarandos","Neal Mohan","Yann LeCun",
];

const stats = [
  { n: "1B", l: "viewers in reach" },
  { n: fmtViews(totalViews) + "+", l: "catalogue views" },
  { n: String(data.entry_count), l: "episodes indexed" },
  { n: String(shows.length), l: "shows in rotation" },
];

export default function Home() {
  return (
    <div className="relative grain">
      {/* HERO */}
      <section className="halftone relative overflow-hidden">
        <Sparkle className="absolute left-[8%] top-24 animate-floaty hidden sm:block" size={34} />
        <Sparkle className="absolute right-[12%] top-40 animate-twinkle hidden sm:block" size={22} color="#C53B3A" />
        <Sparkle className="absolute right-[28%] bottom-16 animate-floaty hidden lg:block" size={26} color="#0C9367" />

        <div className="max-w-7xl mx-auto px-5 pt-20 pb-16">
          <div className="flex items-center gap-2 mb-7">
            <span className="chip bg-ink text-cream">operating system</span>
            <span className="eyebrow text-ink/55">for the cultural engine</span>
          </div>

          <Wordmark size="text-7xl sm:text-8xl lg:text-9xl" className="mb-8" />

          <h1 className="serif text-3xl sm:text-5xl max-w-3xl leading-[1.05] mb-5">
            Run a podcast-first company built to reach{" "}
            <span className="text-wtf-red">a billion Indians</span>.
          </h1>
          <p className="text-lg text-ink/70 max-w-xl mb-9">
            One control room for the whole machine — research, production,
            payments, publishing. The catalogue answers questions itself, cited
            from {data.entry_count} episodes, powered by NVIDIA NIM.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/chat" data-cursor="ask!" className="pill pill-solid px-7 py-3 text-base inline-flex items-center gap-2">
              <Sparkle size={16} color="#F1B333" /> Ask the catalogue
            </Link>
            <Link href="/episodes" data-cursor="browse" className="pill px-7 py-3 text-base bg-cream hover:bg-ink hover:text-cream">
              Episode library
            </Link>
            <span className="ml-1"><PaintCanvas /></span>
          </div>

          <div className="mt-12">
            <GuestStrip />
          </div>
        </div>

        {/* ticker */}
        <div className="border-y-2 border-ink bg-wtf-yellow py-3">
          <Marquee
            items={[
              `${data.entry_count} EPISODES`,
              "CULTURAL ENGINE FOR YOUNG INDIA",
              `${fmtViews(totalViews)}+ VIEWS`,
              ...tickerNames.slice(0, 8),
              "ASK WTF ANYTHING",
            ]}
          />
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-7xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card-flat p-6 text-center bg-cream">
              <div className="display text-5xl sm:text-6xl text-wtf-red">{s.n}</div>
              <div className="eyebrow text-ink/60 mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FLOW */}
      <section className="max-w-7xl mx-auto px-5 pb-14">
        <div className="card overflow-hidden">
          <Image
            src="/brand/flow-diagram.png"
            alt="wtfmedia flow: Home → Episodes → Transcript → Ask WTF → Brief"
            width={1693}
            height={929}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* MODULES */}
      <section className="max-w-7xl mx-auto px-5 pb-20">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-7">
          <div>
            <div className="eyebrow text-ink/55 mb-1">the machine</div>
            <h2 className="display text-4xl sm:text-5xl">14 modules. one room.</h2>
          </div>
          <p className="text-sm text-ink/60 max-w-xs">
            Two are live today. The rest are the roadmap to running the whole
            operation in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const inner = (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-2xl text-ink/30">{m.code}</span>
                  <span className={`chip ${STATUS_CHIP[m.status]}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
                <h3 className="serif text-xl font-semibold mb-1.5">{m.name}</h3>
                <p className="text-sm text-ink/65 flex-1">{m.blurb}</p>
                {m.href && (
                  <span className="eyebrow text-wtf-purple mt-4 inline-flex items-center gap-1">
                    open <span aria-hidden>→</span>
                  </span>
                )}
              </>
            );
            const cls = `card p-5 flex flex-col ${m.accent} ${
              m.accent.includes("purple") ? "text-cream" : ""
            }`;
            return m.href ? (
              <Link key={m.id} href={m.href} data-cursor="open" className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={m.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t-2 border-ink bg-ink text-cream">
        <div className="max-w-7xl mx-auto px-5 py-16 text-center relative">
          <Sparkle className="absolute left-[14%] top-10 animate-twinkle" size={22} />
          <Sparkle className="absolute right-[16%] bottom-10 animate-floaty" size={26} color="#0C9367" />
          <WordmarkMini className="mb-4 inline-block" />
          <h2 className="serif text-3xl sm:text-4xl max-w-2xl mx-auto mb-6">
            Good content. Clearer insights. Better decisions.
          </h2>
          <Link href="/chat" data-cursor="ask!" className="pill px-8 py-3 bg-wtf-yellow text-ink border-wtf-yellow inline-flex items-center gap-2">
            <Sparkle size={16} color="#fff" /> Start asking
          </Link>
        </div>
      </section>
    </div>
  );
}

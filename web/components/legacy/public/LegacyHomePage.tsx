import Link from "next/link";
import Image from "next/image";
import { data, thumbnailUrl } from "@/lib/episodes";
import { GUESTS } from "@/lib/guests";
import { Wordmark } from "@/components/Wordmark";
import { Sparkle } from "@/components/Sparkle";
import { Marquee } from "@/components/Marquee";
import { GuestStrip } from "@/components/GuestStrip";

/**
 * Legacy Home — exact reproduction of the pre-migration `/` route.
 *
 * This component is the compatibility baseline.  Do not add semantic
 * tokens, accessibility improvements, or design-system changes here;
 * those belong in MigratedHomePage.
 */
export function LegacyHomePage() {
  const episodeCount = data.entry_count;
  const showCount = new Set(data.entries.map((e) => e.playlist_title)).size;

  return (
    <div className="min-h-screen bg-[#FFF6EA]">
      {/* Hero */}
      <section className="relative px-4 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 max-w-4xl mx-auto text-center">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none select-none">
          <Sparkle size={120} />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/50 mb-4">
          wtf media · internal workspace
        </p>

        <div className="flex justify-center mb-6">
          <Wordmark />
        </div>

        <h1 className="font-bricolage text-3xl sm:text-5xl font-bold text-[#1A1A1A] leading-[1.1] mb-4">
          The catalogue, now with a memory.
        </h1>

        <p className="font-poppins text-base sm:text-lg text-[#1A1A1A]/70 max-w-xl mx-auto mb-8 leading-relaxed">
          Every conversation, searchable and cited to the source moment.
          {episodeCount > 0 && (
            <>
              {" "}
              <span className="font-semibold text-[#1A1A1A]">
                {episodeCount} episodes
              </span>{" "}
              across{" "}
              <span className="font-semibold text-[#1A1A1A]">
                {showCount} shows
              </span>
              .
            </>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F1B333] text-[#1A1A1A] font-bold text-sm rounded-lg border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#1A1A1A] transition-all"
          >
            Ask the catalogue
          </Link>
          <Link
            href="/episodes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-[#1A1A1A] font-bold text-sm rounded-lg border-2 border-[#1A1A1A]/30 hover:border-[#1A1A1A] transition-all"
          >
            Browse episodes
          </Link>
        </div>
      </section>

      {/* Product blocks */}
      <section className="px-4 sm:px-8 pb-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ask WTF */}
        <div className="border-2 border-[#1A1A1A]/10 rounded-2xl p-6 sm:p-8 bg-[#FFFCF7]">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#6758A5]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/50">
              Ask WTF
            </span>
          </div>
          <h2 className="font-bricolage text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
            Ask anything
          </h2>
          <p className="font-poppins text-sm text-[#1A1A1A]/70 leading-relaxed mb-4">
            Query the entire catalogue in natural language. Every answer is
            grounded in real episodes with source citations and timestamps.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#1A1A1A] border-b-2 border-[#F1B333] hover:gap-2 transition-all"
          >
            Try it
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Episodes */}
        <div className="border-2 border-[#1A1A1A]/10 rounded-2xl p-6 sm:p-8 bg-[#FFFCF7]">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0C9367]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/50">
              Episodes
            </span>
          </div>
          <h2 className="font-bricolage text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
            Browse the archive
          </h2>
          <p className="font-poppins text-sm text-[#1A1A1A]/70 leading-relaxed mb-4">
            {episodeCount} episodes across {showCount} shows. Filter by show,
            search by topic, or explore connections between episodes.
          </p>

          {/* Mini grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {data.entries.slice(0, 3).map((ep) => (
              <div
                key={ep.video_id}
                className="aspect-video rounded-lg overflow-hidden border border-[#1A1A1A]/10"
              >
                <Image
                  src={thumbnailUrl(ep.video_id)}
                  alt={ep.title}
                  width={160}
                  height={90}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>

          <Link
            href="/episodes"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#1A1A1A] border-b-2 border-[#F1B333] hover:gap-2 transition-all"
          >
            Browse all
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto text-center">
        <div className="border-t-2 border-[#1A1A1A]/10 pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/40 mb-3">
            Guest index
          </p>
          <h2 className="font-bricolage text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-6">
            Featured guests
          </h2>
          <GuestStrip />
        </div>
      </section>

      {/* Marquee */}
      <section className="py-8 border-t-2 border-[#1A1A1A]/10">
        <Marquee items={["ask wtf anything", "cited to the second"]} />
      </section>
    </div>
  );
}

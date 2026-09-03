import Image from "next/image";
import { GUESTS } from "@/lib/guests";
import { thumbnailUrl } from "@/lib/episodes";
import { ScrollRail } from "@/components/patterns/ScrollRail";

/**
 * Migrated Guest Strip — accessible horizontal rail of featured guests.
 *
 * Uses ScrollRail (keyboard, wheel, reduced-motion) instead of DragRow.
 * Semantic tokens from WtfTokens.  Replaces GuestStrip in MigratedHomePage.
 */
export function MigratedGuestStrip() {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-label text-foreground/50">featured guests</span>
        <span className="h-[2px] flex-1 bg-foreground/15" />
      </div>
      <ScrollRail
        prevLabel="Previous guest"
        nextLabel="Next guest"
        step={200}
      >
        {GUESTS.map((g) => (
          <a
            key={g.video_id}
            href={`https://www.youtube.com/watch?v=${g.video_id}`}
            target="_blank"
            rel="noreferrer"
            className="group shrink-0 w-[150px]"
          >
            <div className="relative h-[150px] w-[150px] overflow-hidden rounded-panel border-2 border-foreground shadow-[4px_4px_0_0_var(--wtf-foreground)] transition-[transform,box-shadow] duration-fast group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[7px_7px_0_0_var(--wtf-foreground)]">
              <Image
                src={thumbnailUrl(g.video_id)}
                alt={g.name}
                fill
                sizes="150px"
                className="object-cover scale-[1.35] group-hover:scale-150 transition-transform"
              />
            </div>
            <div className="mt-2 px-0.5">
              <div className="font-display text-sm leading-tight text-foreground">
                {g.name}
              </div>
              <div className="text-[11px] text-foreground/50">{g.tag}</div>
            </div>
          </a>
        ))}
      </ScrollRail>
    </div>
  );
}

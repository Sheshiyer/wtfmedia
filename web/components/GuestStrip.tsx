import Image from "next/image";
import { GUESTS } from "@/lib/guests";
import { thumbnailUrl } from "@/lib/episodes";
import { DragRow } from "./DragRow";

export function GuestStrip() {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="eyebrow text-ink/55">featured guests</span>
        <span className="h-[2px] flex-1 bg-ink/15" />
        <span className="eyebrow text-ink/35 hidden sm:block">drag →</span>
      </div>
      <DragRow>
        {GUESTS.map((g) => (
          <a
            key={g.video_id}
            href={`https://www.youtube.com/watch?v=${g.video_id}`}
            target="_blank"
            rel="noreferrer"
            data-cursor="watch"
            className="group shrink-0 w-[150px]"
          >
            <div className="relative w-[150px] h-[150px] rounded-2xl overflow-hidden border-2 border-ink shadow-[4px_4px_0_#1A1A1A] group-hover:shadow-[7px_7px_0_#1A1A1A] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
              <Image
                src={thumbnailUrl(g.video_id)}
                alt={g.name}
                fill
                sizes="150px"
                className="object-cover scale-[1.35] group-hover:scale-150 transition-transform"
              />
            </div>
            <div className="mt-2 px-0.5">
              <div className="display text-sm leading-tight">{g.name}</div>
              <div className="text-[11px] text-ink/55">{g.tag}</div>
            </div>
          </a>
        ))}
      </DragRow>
    </div>
  );
}

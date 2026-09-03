import { GUESTS } from "@/lib/guests";

/**
 * Existing explicit guest-to-public-video mappings. Title-map rows without an
 * entry here stay unlinked until a canonical public identity is supplied.
 */
const publicEpisodeByCatalogueTitle = new Map(
  [
    ...GUESTS.map((guest) => [guest.name, guest.video_id] as const),
    ["AR Rahman", "ohjXRswUYqM"],
    ["Rishi Sunak x Akshata Murthy", "spdUv7OFOu4"],
    ["Yann LeCunn", "JAgHUDhaTU0"],
  ],
);

export function publicEpisodeIdForCatalogueTitle(title: string): string | null {
  return publicEpisodeByCatalogueTitle.get(title.trim()) ?? null;
}

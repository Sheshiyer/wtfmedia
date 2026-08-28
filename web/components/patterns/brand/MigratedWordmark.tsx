"use client";

/**
 * Official WTF OS lockup. Source file lives at
 * `web/public/brand/wtfos-wordmark.source.png`; the UI uses the
 * cropped transparent derivative `wtfos-wordmark.png`.
 *
 * Letter fills are in the raster asset and must not be recolored in CSS.
 */

const WORDMARK_SRC = "/brand/wtfos-wordmark.png";
const WORDMARK_ALT = "WTF OS";

type WordmarkSize = "mini" | "md" | "lg" | "xl";

const sizeClass: Record<WordmarkSize, string> = {
  mini: "h-9 w-auto sm:h-10",
  md: "h-12 w-auto sm:h-14",
  lg: "h-16 w-auto sm:h-20",
  xl: "h-24 w-auto sm:h-28",
};

export function MigratedWordmark({
  className = "",
  size = "xl",
  withSparkles = true,
  plate = false,
}: {
  className?: string;
  /** Kept for callers; the asset includes sparkles. */
  withSparkles?: boolean;
  /** Adds a dark-theme backing so the raster's black letter stays visible. */
  plate?: boolean;
  size?: WordmarkSize | string;
}) {
  const height = sizeClass[size as WordmarkSize] ?? sizeClass.xl;
  void withSparkles;
  const image = (
    // The authored public URL is a Storybook contract for this brand raster.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-wtfos-wordmark
      src={WORDMARK_SRC}
      alt={WORDMARK_ALT}
      className={`select-none ${height} ${className}`}
    />
  );

  return plate ? <span className="wtf-wordmark-plate">{image}</span> : image;
}

export function MigratedWordmarkMini({
  className = "",
  plate = false,
}: {
  className?: string;
  plate?: boolean;
}) {
  const image = (
    // The authored public URL is a Storybook contract for this brand raster.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-wtfos-wordmark
      data-wtfos-wordmark-mini
      src={WORDMARK_SRC}
      alt={WORDMARK_ALT}
      className={`h-9 w-auto select-none sm:h-10 ${className}`}
    />
  );

  return plate ? <span className="wtf-wordmark-plate">{image}</span> : image;
}

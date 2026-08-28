export type GraphThemeTokens = {
  foreground: string;
  structure: string;
  attention: string;
  editorial: string;
  live: string;
  knowledge: string;
  information: string;
};

export type GraphThemePalette = {
  edgeActive: string;
  edgeInactive: string;
  label: string;
  nodeStroke: string;
  selectedStroke: string;
  category: (category: string) => string;
};

function normalizeRgbChannel(value: string): string {
  const channels = value.trim().split(/\s+/).map(Number);
  if (
    channels.length !== 3 ||
    channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)
  ) {
    return "0, 0, 0";
  }

  return channels.join(", ");
}

function rgb(value: string): string {
  return `rgb(${normalizeRgbChannel(value)})`;
}

function rgba(value: string, alpha: number): string {
  return `rgba(${normalizeRgbChannel(value)}, ${alpha})`;
}

/**
 * Converts the active semantic theme channels into canvas colors. Canvas does
 * not inherit CSS variables, so this is deliberately the sole color boundary
 * for the interactive connections graph.
 */
export function graphPaletteForTheme(tokens: GraphThemeTokens): GraphThemePalette {
  const category = (value: string): string => {
    const key = value.toLowerCase();

    if (key.includes("ai") || key.includes("tech")) return rgb(tokens.knowledge);
    if (key.includes("start") || key.includes("business")) return rgb(tokens.information);
    if (key.includes("money") || key.includes("finance") || key.includes("market")) {
      return rgb(tokens.live);
    }
    if (key.includes("geo") || key.includes("society")) return rgb(tokens.editorial);
    if (key.includes("health")) return rgb(tokens.live);
    if (key.includes("media") || key.includes("culture")) return rgb(tokens.information);
    if (key.includes("india")) return rgb(tokens.attention);
    if (key.includes("mind") || key.includes("philos")) return rgb(tokens.foreground);
    if (key.includes("science")) return rgb(tokens.information);

    return rgb(tokens.foreground);
  };

  return {
    edgeActive: rgba(tokens.foreground, 0.55),
    edgeInactive: rgba(tokens.foreground, 0.14),
    label: rgb(tokens.foreground),
    // A structural outline stays at least visually distinct from every
    // bright category fill in both themes. Selection is communicated by the
    // thicker ring in ConnectionGraph, not by a same-hue accent stroke.
    nodeStroke: rgb(tokens.structure),
    selectedStroke: rgb(tokens.structure),
    category,
  };
}

type CssVariableReader = Pick<CSSStyleDeclaration, "getPropertyValue">;

export function graphPaletteFromCssVariables(
  reader: CssVariableReader,
): GraphThemePalette {
  return graphPaletteForTheme({
    foreground: reader.getPropertyValue("--wtf-foreground-rgb"),
    structure: reader.getPropertyValue("--wtf-surface-structure-rgb"),
    attention: reader.getPropertyValue("--wtf-attention-rgb"),
    editorial: reader.getPropertyValue("--wtf-editorial-rgb"),
    live: reader.getPropertyValue("--wtf-live-rgb"),
    knowledge: reader.getPropertyValue("--wtf-knowledge-rgb"),
    information: reader.getPropertyValue("--wtf-information-rgb"),
  });
}

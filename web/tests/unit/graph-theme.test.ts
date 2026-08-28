import { describe, expect, it } from "vitest";
import {
  graphPaletteFromCssVariables,
  graphPaletteForTheme,
} from "@/lib/public/theme-colors";

describe("connection graph theme palette", () => {
  it("creates a canvas-safe dark palette from the active semantic RGB tokens", () => {
    const palette = graphPaletteForTheme({
      foreground: "255 246 234",
      structure: "14 12 11",
      attention: "247 200 74",
      editorial: "242 118 110",
      live: "86 201 154",
      knowledge: "169 155 224",
      information: "121 168 255",
    });

    expect(palette.edgeActive).toBe("rgba(255, 246, 234, 0.55)");
    expect(palette.edgeInactive).toBe("rgba(255, 246, 234, 0.14)");
    expect(palette.label).toBe("rgb(255, 246, 234)");
    expect(palette.nodeStroke).toBe("rgb(14, 12, 11)");
    expect(palette.selectedStroke).toBe("rgb(14, 12, 11)");
    expect(palette.category("ai systems")).toBe("rgb(169, 155, 224)");
    expect(palette.category("startup business")).toBe("rgb(121, 168, 255)");
    expect(palette.category("finance")).toBe("rgb(86, 201, 154)");
    expect(palette.category("philosophy")).toBe("rgb(255, 246, 234)");
  });

  it("reads only the active token channels rather than component hex literals", () => {
    const values: Record<string, string> = {
      "--wtf-foreground-rgb": "255 246 234",
      "--wtf-surface-structure-rgb": "14 12 11",
      "--wtf-attention-rgb": "247 200 74",
      "--wtf-editorial-rgb": "242 118 110",
      "--wtf-live-rgb": "86 201 154",
      "--wtf-knowledge-rgb": "169 155 224",
      "--wtf-information-rgb": "121 168 255",
    };

    const palette = graphPaletteFromCssVariables({
      getPropertyValue: (name) => values[name] ?? "",
    });

    expect(palette.edgeActive).toBe("rgba(255, 246, 234, 0.55)");
    expect(palette.category("science")).toBe("rgb(121, 168, 255)");
  });
});

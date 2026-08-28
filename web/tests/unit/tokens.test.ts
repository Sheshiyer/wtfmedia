/**
 * Plan 01-08 Task 1 — executable design authority (T-01-23).
 *
 * Parses tokens.css/themes.css and enforces:
 *   - every approved semantic role defined exactly once
 *   - palette closure: no raw hex outside the approved set anywhere in
 *     the token/theme layer
 *   - typography exposes exactly four sizes and weights 400/700
 *   - spacing limited to the permitted 4..64 set
 *   - WCAG AA contrast for declared fill pairs and the focus ring
 *   - production: one definition, approved pair, zero migrated-public
 *     consumers until owner visual approval
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(import.meta.dirname, "../..");
const TOKENS = fs.readFileSync(path.join(WEB_ROOT, "styles/tokens.css"), "utf8");
const THEMES = fs.readFileSync(path.join(WEB_ROOT, "styles/themes.css"), "utf8");

/** Approved palette — the only raw hex values allowed in the layer. */
const APPROVED_PALETTE: Record<string, string> = {
  "#fff6ea": "canvas",
  "#f0eadf": "surface-subtle",
  "#fffcf7": "surface-raised",
  "#1a1a1a": "foreground",
  "#5a5148": "light-text-secondary",
  "#72685d": "light-text-muted",
  "#c53b3a": "editorial",
  "#0c9367": "live",
  "#f1b333": "attention",
  "#f07633": "production",
  "#6758a5": "knowledge",
  "#2d6be0": "information",
  "#171513": "dark-canvas",
  "#26231f": "dark-surface-subtle",
  "#312d28": "dark-surface-raised",
  "#0e0c0b": "dark-structure",
  "#ddd2c3": "dark-text-secondary",
  "#aaa093": "dark-text-muted",
  "#f2766e": "dark-editorial",
  "#56c99a": "dark-live",
  "#f7c84a": "dark-attention",
  "#ff9a57": "dark-production",
  "#a99be0": "dark-knowledge",
  "#79a8ff": "dark-information",
};

function declarations(css: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const list = map.get(m[1]) ?? [];
    list.push(m[2].trim());
    map.set(m[1], list);
  }
  return map;
}

function hexesIn(css: string): string[] {
  return [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
}

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(hexToRgb(a));
  const l2 = relativeLuminance(hexToRgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Resolve a declaration value to a raw hex by following var() chains. */
function resolve(value: string, decls: Map<string, string[]>): string {
  let current = value.trim();
  for (let depth = 0; depth < 10; depth += 1) {
    const ref = current.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!ref) break;
    const next = decls.get(ref[1]);
    if (!next || next.length === 0) throw new Error(`unresolved reference ${ref[1]}`);
    current = next[0];
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(current)) {
    throw new Error(`value does not resolve to hex: ${value} -> ${current}`);
  }
  return current.toLowerCase();
}

describe("token uniqueness and palette closure", () => {
  it("defines each approved semantic role exactly once", () => {
    const roles = [
      "--wtf-canvas",
      "--wtf-surface-subtle",
      "--wtf-surface-raised",
      "--wtf-foreground",
      "--wtf-editorial",
      "--wtf-live",
      "--wtf-attention",
      "--wtf-production",
      "--wtf-knowledge",
      "--wtf-information",
    ];
    const all = declarations(TOKENS);
    for (const role of roles) {
      const defs = all.get(role);
      expect(defs, `${role} definitions`).toHaveLength(1);
    }
  });

  it("keeps raw hex values inside the approved palette only", () => {
    for (const [source, css] of [["tokens.css", TOKENS], ["themes.css", THEMES]] as const) {
      for (const hex of hexesIn(css)) {
        expect(
          APPROVED_PALETTE[hex],
          `${source}: unexpected raw color ${hex}`
        ).toBeDefined();
      }
    }
  });

  it("defines production exactly once with its approved pair", () => {
    const all = declarations(TOKENS);
    // The canonical semantic role is defined once in token authority. Theme
    // contexts may override it through aliases, but never add raw hex values.
    expect(all.get("--wtf-production")).toHaveLength(1);
    const prodNamed = [...all.keys()].filter((n) => n.includes("production")).sort();
    expect(prodNamed).toContain("--wtf-fill-production-background");
    expect(prodNamed).toContain("--wtf-fill-production-foreground");
    expect(prodNamed).toContain("--wtf-production");
    expect(prodNamed).toContain("--wtf-on-production");
    expect(prodNamed).toContain("--wtf-production-rgb");
    expect(resolve(all.get("--wtf-fill-production-background")![0], all)).toBe("#f07633");
    expect(resolve(all.get("--wtf-fill-production-foreground")![0], all)).toBe("#1a1a1a");
  });

  it("themes adds no new raw colors or competing aliases", () => {
    // Every themes.css declaration must be a pure var() alias.
    const re = /(--wtf-[\w-]+)\s*:\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(THEMES)) !== null) {
      expect(m[2].trim(), `themes alias ${m[1]}`).toMatch(/^var\(--wtf-[\w-]+\)$/);
    }
  });
});

describe("typography contract", () => {
  it("exposes exactly four interface sizes", () => {
    const sizes = [...TOKENS.matchAll(/--wtf-type-(label|body|heading|display)-size\s*:/g)];
    expect(sizes).toHaveLength(4);
    expect(TOKENS).toContain("--wtf-type-label-size: 13px");
    expect(TOKENS).toContain("--wtf-type-body-size: 16px");
    expect(TOKENS).toContain("--wtf-type-heading-size: 34px");
    expect(TOKENS).toContain("--wtf-type-display-size: clamp(40px, 6vw, 72px)");
  });

  it("exposes only weights 400 and 700", () => {
    const weights = [...TOKENS.matchAll(/--wtf-weight-(\w+):\s*(\d+)/g)].map(
      ([, , v]) => Number(v)
    );
    expect(weights.sort()).toEqual([400, 700]);
  });

  it("keeps Fraunces out of control/display font stacks", () => {
    expect(TOKENS).not.toMatch(/--wtf-font-display:[^;]*Fraunces/);
    expect(TOKENS).not.toMatch(/--wtf-font-body:[^;]*Fraunces/);
    expect(TOKENS).toMatch(/--wtf-font-editorial:[^;]*Fraunces/);
  });

  it("rejects deprecated type-scale values from DESIGN.md v1", () => {
    // label-xs 11px / body-sm 13px-as-body / lead 19px / title-sm 23px /
    // title 28px are not interface size tokens in this contract.
    expect(TOKENS).not.toContain("11px");
    expect(TOKENS).not.toContain("19px");
    expect(TOKENS).not.toContain("23px");
    expect(TOKENS).not.toContain("28px");
  });
});

describe("spacing contract", () => {
  it("limits spacing tokens to the permitted set", () => {
    const allowed: Record<string, number> = {
      "--wtf-space-1": 4,
      "--wtf-space-2": 8,
      "--wtf-space-4": 16,
      "--wtf-space-6": 24,
      "--wtf-space-8": 32,
      "--wtf-space-12": 48,
      "--wtf-space-16": 64,
    };
    const found = [...TOKENS.matchAll(/--wtf-space-\d+\s*:/g)].map((m) => m[0].replace(/\s*:$/, "").trim());
    expect(found.sort()).toEqual(Object.keys(allowed).sort());
    const decls = declarations(TOKENS);
    for (const [name, px] of Object.entries(allowed)) {
      expect(decls.get(name)?.[0]).toBe(`${px}px`);
    }
  });

  it("contains no deprecated spacing values (12/96 from DESIGN.md v1)", () => {
    expect(TOKENS).not.toMatch(/--wtf-space-3\s*:/);
    expect(TOKENS).not.toMatch(/--wtf-space-24\s*:/);
    expect(TOKENS).not.toMatch(/--wtf-space-\d+:\s*96px/);
  });
});

describe("contrast authority (WCAG AA)", () => {
  const decls = declarations(TOKENS);

  it("meets AA for every declared semantic fill pair (>= 4.5)", () => {
    const pairs: Array<[string, string]> = [
      ["--wtf-fill-canvas-foreground", "--wtf-canvas"],
      ["--wtf-fill-subtle-foreground", "--wtf-surface-subtle"],
      ["--wtf-fill-raised-foreground", "--wtf-surface-raised"],
      ["--wtf-fill-attention-foreground", "--wtf-fill-attention-background"],
      ["--wtf-fill-editorial-foreground", "--wtf-fill-editorial-background"],
      ["--wtf-fill-knowledge-foreground", "--wtf-fill-knowledge-background"],
      ["--wtf-fill-information-foreground", "--wtf-fill-information-background"],
      ["--wtf-fill-production-foreground", "--wtf-fill-production-background"],
    ];
    for (const [fgName, bgName] of pairs) {
      const fg = resolve(decls.get(fgName)![0], decls);
      const bg =
        bgName.startsWith("--") && decls.has(bgName)
          ? resolve(decls.get(bgName)![0], decls)
          : bgName;
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `${fgName} on ${bgName}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("declares no text-bearing fill pair for live (indicator-only role)", () => {
    expect([...decls.keys()]).not.toContain("--wtf-fill-live-background");
    expect([...decls.keys()]).not.toContain("--wtf-fill-live-foreground");
    // Documented rationale holds: live fails AA against both candidates.
    const live = resolve(decls.get("--wtf-live")![0], decls);
    expect(contrastRatio(live, "#fff6ea")).toBeLessThan(4.5);
    expect(contrastRatio(live, "#1a1a1a")).toBeLessThan(4.5);
  });

  it("keeps the two-layer focus ring distinguishable on every surface", () => {
    const inner = resolve(decls.get("--wtf-focus-inner-color")![0], decls);
    const outer = resolve(decls.get("--wtf-focus-outer-color")![0], decls);
    // Ring adjacency geometry: [fill] -> inner cream -> outer ink -> page.
    // Each boundary needs one side to clear WCAG non-text contrast (3:1).
    expect(contrastRatio(inner, outer), "inner vs outer").toBeGreaterThanOrEqual(3);
    expect(contrastRatio(inner, "#1a1a1a"), "cream separates ink fills")
      .toBeGreaterThanOrEqual(3);
    expect(contrastRatio(outer, "#fff6ea"), "ink outline on canvas")
      .toBeGreaterThanOrEqual(3);
    expect(contrastRatio(outer, "#f0eadf"), "ink outline on subtle surface")
      .toBeGreaterThanOrEqual(3);
    // Every surface must separate from at least one adjacent ring layer:
    // light fills clear 3:1 against the outer ink outline; dark fills
    // (e.g. knowledge #6758a5, 2.91:1 vs ink) are separated by the inner
    // cream layer instead. This is why the contract is two-layer.
    for (const [hex, role] of Object.entries(APPROVED_PALETTE)) {
      const best = Math.max(contrastRatio(outer, hex), contrastRatio(inner, hex));
      expect(best, `ring separation vs ${role} ${hex}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("WTF OS consumer policy", () => {
  /** Active application sources excluding the isolated legacy rollback. */
  function migratedPublicSources(): string[] {
    const files: string[] = [];
    const roots = [
      path.join(WEB_ROOT, "app"),
      path.join(WEB_ROOT, "components"),
      path.join(WEB_ROOT, "lib"),
    ];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs);
        else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(abs);
      }
    };
    for (const root of roots) walk(root);
    return files.filter((f) => {
      return !f.includes(`${path.sep}components${path.sep}legacy${path.sep}`);
    });
  }

  it("keeps the provisional production color out of active WTF OS surfaces", () => {
    const consumers = migratedPublicSources().filter((f) => {
      const text = fs.readFileSync(f, "utf8");
      return /var\(--wtf-state-production-provisional\)|var\(--wtf-production\)|--wtf-production-rgb|(?:bg|text|border)-production\b|text-on-production\b/.test(text);
    });
    expect(consumers).toEqual([]);
  });
});

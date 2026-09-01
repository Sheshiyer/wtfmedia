import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(import.meta.dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), "utf8");
}

const TOKENS = read("styles/tokens.css");
const THEMES = read("styles/themes.css");
const TAILWIND = read("tailwind.config.ts");
const LAYOUT = read("app/layout.tsx");
const MOTION = read("styles/motion.css");
const GRAINIENT = read("components/patterns/brand/Grainient.tsx");
const APP_SHELL = read("components/shells/AppShell.tsx");
const BOOT = read("components/patterns/brand/WtfOsBoot.tsx");
const WORDMARK = read("components/patterns/brand/MigratedWordmark.tsx");
const APP_RAIL = read("components/shells/AppRail.tsx");
const ACCESS_RECOVERY = read("components/domain/ops/AccessRecovery.tsx");
const GLOBALS = read("app/globals.css");

type Rgb = { r: number; g: number; b: number };

function declarations(css: string): Map<string, string> {
  return new Map(
    [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing CSS block for ${selector}`);

  const open = start + `${selector} `.length;
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`unterminated CSS block for ${selector}`);
}

function resolve(value: string, vars: Map<string, string>): string {
  let current = value.trim();
  for (let depth = 0; depth < 20; depth += 1) {
    const reference = current.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!reference) return current;
    const next = vars.get(reference[1]);
    if (!next) throw new Error(`unresolved token ${reference[1]}`);
    current = next;
  }
  throw new Error(`token resolution exceeded depth for ${value}`);
}

function hexToRgb(hex: string): Rgb {
  const value = hex.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function luminance({ r, g, b }: Rgb): number {
  const linear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function themeVars(theme: "light" | "dark"): Map<string, string> {
  const vars = declarations(TOKENS);
  if (theme === "dark") {
    for (const [name, value] of declarations(block(THEMES, 'html[data-wtf-theme="dark"]')).entries()) {
      vars.set(name, value);
    }
  }
  return vars;
}

function token(vars: Map<string, string>, name: string): string {
  const value = vars.get(name);
  if (!value) throw new Error(`missing ${name}`);
  const resolved = resolve(value, vars);
  expect(resolved, `${name} should resolve to a CSS hex color`).toMatch(/^#[0-9a-f]{6}$/i);
  return resolved;
}

describe("adaptive WTF OS theme contract", () => {
  it("keeps every text and accent-fill pairing AA-safe in light and dark", () => {
    for (const theme of ["light", "dark"] as const) {
      const vars = themeVars(theme);
      const surfaces = [
        "--wtf-canvas",
        "--wtf-surface-subtle",
        "--wtf-surface-raised",
      ];

      for (const text of [
        "--wtf-text-primary",
        "--wtf-text-secondary",
        "--wtf-text-muted",
      ]) {
        for (const surface of surfaces) {
          expect(
            contrast(token(vars, text), token(vars, surface)),
            `${theme}: ${text} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }

      expect(
        contrast(token(vars, "--wtf-text-on-structure"), token(vars, "--wtf-surface-structure")),
        `${theme}: inverse text on the structural surface`,
      ).toBeGreaterThanOrEqual(4.5);

      for (const accent of ["attention", "editorial", "knowledge", "information", "production"]) {
        expect(
          contrast(token(vars, `--wtf-on-${accent}`), token(vars, `--wtf-${accent}`)),
          `${theme}: on-${accent} on ${accent}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("provides matching RGB channels for alpha-capable semantic utilities", () => {
    for (const theme of ["light", "dark"] as const) {
      const vars = themeVars(theme);
      for (const role of [
        "canvas",
        "surface-subtle",
        "surface-raised",
        "surface-structure",
        "foreground",
        "attention",
        "editorial",
        "knowledge",
        "information",
        "production",
      ]) {
        const hex = token(vars, `--wtf-${role}`);
        const rgb = resolve(vars.get(`--wtf-${role}-rgb`) ?? "", vars);
        const expected = Object.values(hexToRgb(hex)).join(" ");
        expect(rgb, `${theme}: ${role} RGB channel`).toBe(expected);
      }
      expect(resolve(vars.get("--wtf-overlay-rgb") ?? "", vars)).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
  });

  it("defaults the WTF OS marker to light mode and keeps dark tokens available", () => {
    expect(THEMES).toContain('html[data-wtf-theme="light"]');
    expect(THEMES).toContain('html[data-wtf-theme="dark"]');
    expect(LAYOUT).toContain('data-wtf-ui={variant === "wtfos" ? "wtfos" : undefined}');
    expect(LAYOUT).toContain('data-wtf-theme={themeForAppUiVariant(variant)}');
    expect(LAYOUT).toContain('{variant === "wtfos" && <WtfOsBoot />}');
    expect(MOTION).toContain('html[data-wtf-ui="wtfos"]');
    expect(MOTION).not.toContain("data-public-ui-variant");
  });

  it("maps semantic Tailwind colors through RGB channels so alpha utilities compile", () => {
    for (const [utility, variable] of [
      ["canvas", "canvas"],
      ["foreground", "foreground"],
      ["surface-subtle", "surface-subtle"],
      ["surface-raised", "surface-raised"],
      ["surface-structure", "surface-structure"],
      ["overlay", "overlay"],
      ["attention", "attention"],
      ["editorial", "editorial"],
      ["knowledge", "knowledge"],
      ["information", "information"],
      ["production", "production"],
      ["on-attention", "on-attention"],
      ["on-editorial", "on-editorial"],
      ["on-knowledge", "on-knowledge"],
      ["on-information", "on-information"],
      ["on-production", "on-production"],
      ["on-structure", "text-on-structure"],
    ] as const) {
      expect(TAILWIND).toContain(`rgb(var(--wtf-${variable}-rgb) / <alpha-value>)`);
    }
  });

  it("keeps the active background texture calm and theme-derived", () => {
    expect(GRAINIENT).toContain("timeSpeed = 0.025");
    expect(GRAINIENT).toContain("warpSpeed = 0.18");
    expect(GRAINIENT).toContain("grainAmount = 0.035");
    expect(GRAINIENT).toContain("grainScale = 2.4");
    expect(GRAINIENT).toContain("grainAnimated = false");
    expect(GRAINIENT).toContain('color1 = "var(--wtf-canvas)"');
    expect(GRAINIENT).toContain("getComputedStyle(container)");
    expect(GRAINIENT).toContain("const syncThemeColors");
    expect(GRAINIENT).toContain('window.matchMedia("(prefers-color-scheme: dark)")');
    expect(GRAINIENT).toContain("new MutationObserver(syncThemeColors)");
    expect(APP_SHELL).toContain("var(--wtf-texture-dot-opacity)");
    expect(APP_SHELL).toContain("var(--wtf-texture-dot-size)");
    expect(APP_SHELL).toContain("var(--wtf-texture-dot-spacing)");
  });

  it("uses the approved transparent wordmark rather than an opaque splash video", () => {
    expect(BOOT).toContain('<MigratedWordmark size="xl" plate />');
    expect(BOOT).toContain("skip");
    expect(BOOT).toContain("BOOT_STORAGE_KEY");
    expect(BOOT).toContain("wtfos-bg-still.jpg");
    expect(BOOT).not.toContain("<video");
    expect(BOOT).not.toContain("wtfos-logo-alpha.webm");
    expect(BOOT).not.toContain("wtfos-logo-chroma");
  });

  it("gives the opaque wordmark letters a contrasting plate on every structural surface", () => {
    expect(WORDMARK).toContain("wtf-wordmark-plate");
    expect(APP_RAIL).toContain("<MigratedWordmarkMini plate />");
    expect(ACCESS_RECOVERY).toContain('<MigratedWordmark size="lg" plate />');
    expect(block(GLOBALS, ".wtf-wordmark-plate")).toContain(
      "background: var(--wtf-surface-raised);",
    );
    expect(GLOBALS).toContain('html[data-wtf-theme="dark"] .wtf-wordmark-plate');
    expect(GLOBALS).toContain(".wtf-wordmark-plate");
  });
});

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--wtf-canvas-rgb) / <alpha-value>)",
        dot: "rgb(var(--wtf-surface-subtle-rgb) / <alpha-value>)",
        surface: "rgb(var(--wtf-surface-subtle-rgb) / <alpha-value>)",
        ink: "rgb(var(--wtf-foreground-rgb) / <alpha-value>)",
        canvas: "rgb(var(--wtf-canvas-rgb) / <alpha-value>)",
        foreground: "rgb(var(--wtf-foreground-rgb) / <alpha-value>)",
        "surface-subtle": "rgb(var(--wtf-surface-subtle-rgb) / <alpha-value>)",
        "surface-raised": "rgb(var(--wtf-surface-raised-rgb) / <alpha-value>)",
        "surface-structure": "rgb(var(--wtf-surface-structure-rgb) / <alpha-value>)",
        "text-primary": "rgb(var(--wtf-text-primary-rgb) / <alpha-value>)",
        "text-secondary": "rgb(var(--wtf-text-secondary-rgb) / <alpha-value>)",
        "text-muted": "rgb(var(--wtf-text-muted-rgb) / <alpha-value>)",
        "on-structure": "rgb(var(--wtf-text-on-structure-rgb) / <alpha-value>)",
        overlay: "rgb(var(--wtf-overlay-rgb) / <alpha-value>)",
        editorial: "rgb(var(--wtf-editorial-rgb) / <alpha-value>)",
        live: "rgb(var(--wtf-live-rgb) / <alpha-value>)",
        attention: "rgb(var(--wtf-attention-rgb) / <alpha-value>)",
        production: "rgb(var(--wtf-production-rgb) / <alpha-value>)",
        knowledge: "rgb(var(--wtf-knowledge-rgb) / <alpha-value>)",
        information: "rgb(var(--wtf-information-rgb) / <alpha-value>)",
        "on-attention": "rgb(var(--wtf-on-attention-rgb) / <alpha-value>)",
        "on-editorial": "rgb(var(--wtf-on-editorial-rgb) / <alpha-value>)",
        "on-knowledge": "rgb(var(--wtf-on-knowledge-rgb) / <alpha-value>)",
        "on-information": "rgb(var(--wtf-on-information-rgb) / <alpha-value>)",
        "on-production": "rgb(var(--wtf-on-production-rgb) / <alpha-value>)",
        wtf: {
          red: "#C53B3A",
          green: "#0C8167",
          yellow: "#F1B333",
          orange: "#F07633",
          purple: "#6758A5",
          blue: "#2D6BE0",
          // Plan 01-08 (D-05): semantic aliases resolve through the
          // canonical CSS custom properties in web/styles/tokens.css —
          // no duplicate hex values. Legacy keys above are preserved.
          canvas: "rgb(var(--wtf-canvas-rgb) / <alpha-value>)",
          foreground: "rgb(var(--wtf-foreground-rgb) / <alpha-value>)",
          subtle: "rgb(var(--wtf-surface-subtle-rgb) / <alpha-value>)",
          raised: "rgb(var(--wtf-surface-raised-rgb) / <alpha-value>)",
          editorial: "rgb(var(--wtf-editorial-rgb) / <alpha-value>)",
          live: "rgb(var(--wtf-live-rgb) / <alpha-value>)",
          attention: "rgb(var(--wtf-attention-rgb) / <alpha-value>)",
          knowledge: "rgb(var(--wtf-knowledge-rgb) / <alpha-value>)",
          information: "rgb(var(--wtf-information-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Impact", "sans-serif"],
        heading: ["var(--wtf-font-display)"],
        body: ["var(--wtf-font-body)"],
        label: ["var(--wtf-font-body)"],
        serif: ["var(--wtf-font-editorial)"],
        sans: ["var(--wtf-font-body)"],
      },
      fontSize: {
        label: [
          "var(--wtf-type-label-size)",
          { lineHeight: "var(--wtf-type-label-line-height)" },
        ],
        body: [
          "var(--wtf-type-body-size)",
          { lineHeight: "var(--wtf-type-body-line-height)" },
        ],
        heading: [
          "var(--wtf-type-heading-size)",
          { lineHeight: "var(--wtf-type-heading-line-height)" },
        ],
        display: [
          "var(--wtf-type-display-size)",
          { lineHeight: "var(--wtf-type-display-line-height)" },
        ],
      },
      lineHeight: {
        display: "var(--wtf-type-display-line-height)",
      },
      borderRadius: {
        control: "var(--wtf-radius-control)",
        panel: "var(--wtf-radius-panel)",
        card: "var(--wtf-radius-card)",
        pill: "var(--wtf-radius-pill)",
      },
      transitionDuration: {
        fast: "var(--wtf-duration-fast)",
        default: "var(--wtf-duration-default)",
        slow: "var(--wtf-duration-slow)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%,100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
          "50%": { transform: "scale(0.7) rotate(20deg)", opacity: "0.6" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        popin: {
          "0%": { transform: "translateY(16px) scale(0.98)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "wtf-os-boot": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "marquee-fast": "marquee 18s linear infinite",
        twinkle: "twinkle 2.5s ease-in-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
        popin: "popin 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "wtf-os-boot": "wtf-os-boot 800ms var(--wtf-ease-out) forwards",
      },
    },
  },
  plugins: [],
};
export default config;

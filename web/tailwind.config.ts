import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF6EA",
        dot: "#F0EADF",
        surface: "#F0EADF",
        ink: "#1A1A1A",
        wtf: {
          red: "#C53B3A",
          green: "#0C9367",
          yellow: "#F1B333",
          orange: "#F07633",
          purple: "#6758A5",
          blue: "#2D6BE0",
          // Plan 01-08 (D-05): semantic aliases resolve through the
          // canonical CSS custom properties in web/styles/tokens.css —
          // no duplicate hex values. Legacy keys above are preserved.
          canvas: "var(--wtf-canvas)",
          foreground: "var(--wtf-foreground)",
          subtle: "var(--wtf-surface-subtle)",
          raised: "var(--wtf-surface-raised)",
          editorial: "var(--wtf-editorial)",
          live: "var(--wtf-live)",
          attention: "var(--wtf-attention)",
          knowledge: "var(--wtf-knowledge)",
          information: "var(--wtf-information)",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Impact", "sans-serif"],
        serif: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Poppins"', "system-ui", "sans-serif"],
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
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "marquee-fast": "marquee 18s linear infinite",
        twinkle: "twinkle 2.5s ease-in-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
        popin: "popin 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;

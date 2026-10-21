import path from "node:path";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../..") }, dedupe: ["react", "react-dom"] },
  oxc: { jsx: { runtime: "automatic" } },
  optimizeDeps: { exclude: ["@clerk/nextjs", "next/link", "next/navigation"], include: ["react", "react-dom/client", "react/jsx-dev-runtime"] },
  test: {
    include: ["tests/beta-principal-browser/*.test.tsx"],
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [
        { browser: "chromium", name: "desktop", viewport: { width: 1382, height: 887 } },
        { browser: "chromium", name: "mobile", viewport: { width: 320, height: 710 } },
      ],
    },
  },
});

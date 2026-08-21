import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vitest/config";

const root = path.resolve(import.meta.dirname);
const alias = { "@": root };

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          exclude: ["stories/**", "tests/contracts/**", "tests/journeys/**"],
          passWithNoTests: true,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "contracts",
          environment: "node",
          include: ["tests/contracts/**/*.test.ts"],
          exclude: ["stories/**", "tests/unit/**", "tests/journeys/**"],
          passWithNoTests: true,
        },
      },
      {
        extends: true,
        resolve: { alias },
        plugins: [storybookTest({ configDir: path.join(root, ".storybook") })],
        test: {
          name: "storybook",
          exclude: ["tests/**"],
          passWithNoTests: true,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

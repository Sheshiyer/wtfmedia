import { defineConfig, devices } from "@playwright/test";

const PORT = 4173; // use preview port for production-like build
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  metadata: {
    phase1VisualCandidate: process.env.PHASE1_VISUAL_CANDIDATE === "1",
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "dot" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phase1-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "phase1-chromium-320",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 640 },
      },
    },
    {
      name: "phase1-chromium-768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "phase1-chromium-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key npm run build && WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key PORT=4173 npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120 * 1000,
  },
});

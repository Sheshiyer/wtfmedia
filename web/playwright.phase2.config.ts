import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: /phase2\/.*\.spec\.ts$/,
  use: { ...base.use, baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "node scripts/phase2-test-server.mjs",
    url: "http://127.0.0.1:4174/sign-in",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

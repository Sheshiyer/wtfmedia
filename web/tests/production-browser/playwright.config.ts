import path from "node:path";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "production.spec.ts", workers: 2, reporter: "list",
  outputDir: "../../../.local/production-ui/results",
  use: { baseURL: "http://127.0.0.1:4190", channel: "chrome" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 320, height: 640 } } },
  ],
  webServer: { cwd: path.resolve(__dirname, "../.."), command: "node_modules/.bin/vite --config tests/production-browser/vite.config.ts", url: "http://127.0.0.1:4190", reuseExistingServer: false },
});

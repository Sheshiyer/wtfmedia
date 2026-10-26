import path from "node:path";
import base from "../../playwright.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  ...base, testDir: ".", testMatch: "research.spec.ts", workers: 2, reporter: "list",
  outputDir: "/tmp/wtfmedia-research-browser-results",
  use: { ...base.use, baseURL: "http://127.0.0.1:4189" },
  projects: [base.projects![0], base.projects![1],
    { name: "research-firefox", use: { browserName: "firefox", viewport: { width: 1440, height: 900 } } },
    { name: "research-webkit", use: { browserName: "webkit", viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { cwd: path.resolve(__dirname, "../.."), command: "node_modules/.bin/vite --config tests/research-browser/vite.config.ts", url: "http://127.0.0.1:4189", reuseExistingServer: false, timeout: 30000 },
});

import { defineConfig } from "vite";
import path from "node:path";
const web = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: { "@": web } },
  oxc: { jsx: { runtime: "automatic" } },
  css: { postcss: web },
  server: { host: "127.0.0.1", port: 4190, strictPort: true, fs: { allow: [web] } },
});

import { defineConfig } from "vite";
import path from "node:path";
const web = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  resolve: { alias: [
    { find: "./BetaPrincipalGate", replacement: path.join(import.meta.dirname, "principal.ts") },
    { find: "@", replacement: web },
  ] },
  oxc: { jsx: { runtime: "automatic" } },
  css: { postcss: web },
  server: { host: "127.0.0.1", port: 4189, strictPort: true, fs: { allow: [web] } },
});

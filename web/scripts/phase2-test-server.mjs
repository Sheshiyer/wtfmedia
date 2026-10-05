// Build a disposable app with provider adapters; never alter the production config.
import { cpSync, mkdtempSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = mkdtempSync(path.join(tmpdir(), "wtf-phase2-"));
const excluded = new Set(["node_modules", ".next", ".open-next", ".wrangler", "test-results", "playwright-report", "storybook-static"]);
cpSync(source, target, { recursive: true, filter: (file) => {
  const name = path.basename(file);
  return !excluded.has(name) && !name.startsWith(".env") && !name.startsWith(".dev.vars");
} });
symlinkSync(path.join(source, "node_modules"), path.join(target, "node_modules"), "dir");
renameSync(path.join(target, "next.config.mjs"), path.join(target, "next.base.mjs"));
writeFileSync(path.join(target, "next.config.mjs"), `import base from './next.base.mjs';
import path from 'node:path';
export default { ...base, webpack(config) {
 config.resolve.alias['@clerk/nextjs$'] = path.resolve('tests/support/phase2/clerk-client.tsx');
 config.resolve.alias['@clerk/nextjs/server$'] = path.resolve('tests/support/phase2/clerk-server.ts');
 return config;
} };
`);
const env = { ...process.env, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Zml4dHVyZS5leGFtcGxlLnRlc3Qk", CLERK_SECRET_KEY: "", WTF_PUBLIC_UI_VARIANT: "migrated", NEXT_TELEMETRY_DISABLED: "1" };
let child;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child?.kill(signal); process.exit(0); });
function run(args) {
 return new Promise((resolve, reject) => {
  child = spawn(process.execPath, [path.join(source, "node_modules/next/dist/bin/next"), ...args], { cwd: target, env, stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Phase 2 server exited: ${code}`)));
 });
}
await run(["build"]);
await run(["start", "--hostname", "127.0.0.1", "--port", "4174"]);
